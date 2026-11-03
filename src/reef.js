// Atmosphere & set dressing for the reef — same toon look as Cubi.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { plastic as toon, paintGradient, fanPath, outline, outlineMat, OUTLINE } from './materials.js';
import { rng, makeEye, COR, basic, smooth, colorize, branchGeo, placeEye, cached, makePearl } from './models.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
function xf(geo, x, y, z, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(sx, sy, sz));
  const g = (geo.index ? geo.toNonIndexed() : geo.clone()); g.applyMatrix4(m); return g;
}
function strip(g) { ['uv', 'uv1'].forEach(a => g.attributes[a] && g.deleteAttribute(a)); return g; }
function lumpGeo(seed, detail = 3) {
  const R = rng(seed);
  let g = new THREE.IcosahedronGeometry(1, detail); g.deleteAttribute('uv'); g.deleteAttribute('normal'); g = mergeVertices(g);
  const p = g.attributes.position; const a = R() * 6, b = R() * 6;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = 1 + Math.sin(x * 2.3 + a) * 0.08 + Math.cos(z * 2.1 + b) * 0.08 + Math.sin(y * 3 + a) * 0.05; p.setXYZ(i, x * k, y * k, z * k); }
  g.computeVertexNormals(); return g;
}

function cheapBranch(R) {
  const parts = []; const up = V(0, 1, 0);
  const seg = (a, b, r) => { const d = b.clone().sub(a); const c = new THREE.CylinderGeometry(r * 0.75, r, d.length(), 7, 1, true); c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, d.normalize())); const m = a.clone().add(b).multiplyScalar(0.5); c.translate(m.x, m.y, m.z); parts.push(strip(c.toNonIndexed())); const s = new THREE.SphereGeometry(r * 0.8, 7, 5); s.translate(b.x, b.y, b.z); parts.push(strip(s.toNonIndexed())); };
  const base = V(0, 0, 0), mid = V((R() - 0.5) * 0.1, 0.4, 0); seg(base, mid, 0.09);
  const n = 2 + Math.floor(R() * 2);
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + R(); const tip = mid.clone().add(V(Math.cos(a) * 0.25, 0.3 + R() * 0.15, Math.sin(a) * 0.25)); seg(mid, tip, 0.07); const tip2 = tip.clone().add(V(Math.cos(a) * 0.1, 0.18, Math.sin(a) * 0.1)); seg(tip, tip2, 0.05); }
  return mergeGeometries(parts);
}

// ------------------------------------------------------------------
// REEF WALL — one merged mesh (rocks + corals, vertex coloured) + outline
// ------------------------------------------------------------------
const ROCK_TINTS = [['#8A7FD0', '#4A3C8A'], ['#B07AB8', '#5E3A78'], ['#5FA0C8', '#2E5A8A'], ['#C88A9A', '#6A3A5A'], ['#7AB0A0', '#2E6A62']];
export function makeReefWall(seed = 1, big = false) {
  const R = rng(seed * 7 + 3);
  const tint = ROCK_TINTS[Math.floor(R() * ROCK_TINTS.length)]; const ROCK_TOP = new THREE.Color(tint[0]), ROCK_LOW = new THREE.Color(tint[1]);
  const parts = [];
  const nRocks = 3 + Math.floor(R() * 2);
  let maxH = 0;
  const tops = [];
  for (let i = 0; i < nRocks; i++) {
    const h = (big ? 4 : 2.2) + R() * (big ? 4 : 2.6), w = 1.4 + R() * 1.4, d = 1.3 + R() * 1.2;
    const x = (R() - 0.5) * 1.6, z = (i - nRocks / 2) * 2.1 + (R() - 0.5) * 0.6;
    let g = lumpGeo(seed * 13 + i, 2); g = xf(g, x, h * 0.42, z, w, h * 0.55, d);
    paintGradient(g, '#ffffff', '#ffffff', 'y', 0, 1, (c, k, pos) => { const y = pos.getY(k); c.copy(ROCK_LOW).lerp(ROCK_TOP, THREE.MathUtils.clamp(y / (h * 0.9), 0, 1)); });
    parts.push(g); maxH = Math.max(maxH, h);
    tops.push([x, h * 0.9, z, w]);
  }
  // lush corals growing on the rocks
  const wallPlates = [], wallSolid = [], wallSoft = [];
  tops.forEach(([x, y, z, w]) => {
    const n = big ? 1 + Math.floor(R() * 2) : 2 + Math.floor(R() * 2);
    for (let k = 0; k < n; k++) { const side = k >= 3; addCoral(R, x + (R() - 0.5) * w * (side ? 1.4 : 0.9), side ? y * (0.35 + R() * 0.4) : y - R() * 0.3, z + (R() - 0.5) * 1.4, wallSolid, wallPlates, big ? 1.3 : 1, wallSoft); }
  });
  const geo = mergeGeometries(parts.map(g => { g = g.index ? g.toNonIndexed() : g; strip(g); if (!g.attributes.normal) g.computeVertexNormals(); return g; }));
  const m = new THREE.Mesh(geo, toon('#ffffff', { vertexColors: true }));
  outline(m, big ? 0.06 : 0.045, '#3E4A5A');
  const cm = coralMeshes(wallSolid, wallPlates, '#3A2440', wallSoft);
  m.castShadow = false;
  const g = new THREE.Group(); g.add(m, cm); g.userData.h = maxH; return g;
}

// ------------------------------------------------------------------
// GROUND SCATTER — instanced pebbles, shells, grass, tiny corals that
// stream past with the current (handful of draw calls for hundreds of bits)
// ------------------------------------------------------------------
export function makeGroundScatter() {
  const group = new THREE.Group();
  const sets = [];
  const add = (geo, mat, n, colors, xr, scale, yOff = 0, outlineT = 0) => {
    const im = new THREE.InstancedMesh(geo, mat, n);
    const items = [];
    for (let i = 0; i < n; i++) { items.push({ x: 0, z: 0, s: 1, r: 0 }); im.setColorAt(i, new THREE.Color(colors[i % colors.length])); }
    im.instanceColor.needsUpdate = true; im.frustumCulled = false; im.receiveShadow = true;
    group.add(im);
    let hull = null;
    if (outlineT) { hull = new THREE.InstancedMesh(geo, outlineMat(outlineT, '#5A4630'), n); hull.frustumCulled = false; group.add(hull); }
    sets.push({ im, hull, items, xr, scale, yOff });
  };
  const pebble = lumpGeo(4, 1); pebble.scale(1, 0.55, 1);
  add(pebble, toon('#ffffff'), 140, ['#C9B7A0', '#A8B4C4', '#D8C6A8', '#B7A28A', '#E6D7BC'], 13, [0.06, 0.16], 0.02, 0.012);
  // scallop shells
  const shellG = (() => { const s = new THREE.SphereGeometry(1, 18, 6, 0, Math.PI, 0, Math.PI / 2); const p = s.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x); const k = 1 + 0.08 * Math.cos(a * 9); p.setXYZ(i, x * k, p.getY(i) * 0.35, z * k); } s.computeVertexNormals(); return s; })();
  add(shellG, toon('#ffffff', { side: THREE.DoubleSide }), 40, ['#FFB3C8', '#FFE0A8', '#FFC7A0', '#E9D8FF', '#FFFFFF'], 12, [0.1, 0.18], 0, 0.01);
  // grass tufts (3 blades merged)
  const grassG = (() => { const parts = []; for (let b = 0; b < 4; b++) { const c = new THREE.ConeGeometry(0.035, 0.5 + b * 0.1, 5); c.translate(0, 0.25 + b * 0.05, 0); c.rotateZ((b - 1.5) * 0.25); c.rotateY(b * 1.3); parts.push(strip(c.toNonIndexed())); } return mergeGeometries(parts); })();
  add(grassG, toon('#ffffff'), 90, ['#4FCB7A', '#7FDB6A', '#3FBF9A', '#9BE070'], 14, [0.7, 1.3], 0);
  // tiny round corals
  const blob = new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  add(blob, toon('#ffffff'), 60, [COR.pink[0], COR.purple[0], COR.yellow[0], COR.orange[0], COR.teal[0]], 13, [0.12, 0.26], 0, 0.012);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const place = (set, it, z) => { it.x = (Math.random() * 2 - 1) * set.xr; it.z = z; it.s = set.scale[0] + Math.random() * (set.scale[1] - set.scale[0]); it.r = Math.random() * 6.28; };
  sets.forEach(set => set.items.forEach(it => place(set, it, -60 + Math.random() * 66)));
  group.userData.update = (move, hfn, xfn) => {
    sets.forEach(set => {
      set.items.forEach((it, i) => {
        it.z += move; if (it.z > 6) place(set, it, it.z - 66);
        m.compose(p.set(it.x + (xfn ? xfn(it.z) : 0), set.yOff + (hfn ? hfn(it.x, it.z) : 0), it.z), q.setFromEuler(e.set(0, it.r, 0)), s.setScalar(it.s));
        set.im.setMatrixAt(i, m); if (set.hull) set.hull.setMatrixAt(i, m);
      });
      set.im.instanceMatrix.needsUpdate = true; if (set.hull) set.hull.instanceMatrix.needsUpdate = true;
    });
  };
  group.userData.update(0);
  return group;
}

// ------------------------------------------------------------------
// GLITTER (sparkly plankton) and soft foreground BOKEH bubbles
// ------------------------------------------------------------------
function dotTexture(ring) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  if (ring) { gr.addColorStop(0, 'rgba(255,255,255,0.05)'); gr.addColorStop(0.72, 'rgba(255,255,255,0.18)'); gr.addColorStop(0.86, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); }
  else { gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,240,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); }
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function makeGlitter(n = 260) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 26; pos[i * 3 + 1] = 0.5 + Math.random() * 9; pos[i * 3 + 2] = -55 + Math.random() * 61; }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ map: dotTexture(false), color: '#FFF6C8', size: 0.16, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
  pts.userData.update = (move, t) => {
    const a = geo.attributes.position.array;
    for (let i = 0; i < n; i++) { a[i * 3 + 2] += move * 0.98; a[i * 3] += Math.sin(t * 0.7 + i) * 0.002; if (a[i * 3 + 2] > 6) { a[i * 3 + 2] -= 61; a[i * 3] = (Math.random() - 0.5) * 26; a[i * 3 + 1] = 0.5 + Math.random() * 9; } }
    geo.attributes.position.needsUpdate = true;
    mat.opacity = 0.75 + Math.sin(t * 3.1) * 0.15; mat.size = 0.15 + Math.sin(t * 2.3) * 0.03;
  };
  return pts;
}
export function makeBokeh(n = 10) {
  const g = new THREE.Group(); const tex = dotTexture(true);
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.6, fog: false }));
    s.userData = { ph: Math.random() * 6, sp: 0.3 + Math.random() * 0.5 }; reset(s, true); g.add(s);
  }
  function reset(s, any) { s.position.set((Math.random() - 0.5) * 7, any ? Math.random() * 6 : -0.5, 1 + Math.random() * 1.6); const k = 0.25 + Math.random() * 0.45; s.scale.set(k, k, 1); }
  g.userData.update = (dt, t, cam) => {
    g.position.set(cam.position.x, cam.position.y - 3, cam.position.z - 3.8);
    g.children.forEach(s => { s.position.y += s.userData.sp * dt; s.position.x += Math.sin(t + s.userData.ph) * dt * 0.1; if (s.position.y > 6.5) reset(s, false); });
  };
  return g;
}

// ------------------------------------------------------------------
// CREATURES
// ------------------------------------------------------------------
// Crab — scuttles sideways (merged into a few meshes)
const crabCache = {};
export function makeCrab(color = '#FF6B4A') {
  const g = new THREE.Group(); const rig = new THREE.Group(); g.add(rig);
  const edge = '#6A1A10';
  const geo = (crabCache[color] ||= (() => {
    const parts = [];
    const add = (geo0, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => parts.push(strip(xf(geo0, x, y, z, sx, sy, sz, rx, ry, rz)));
    add(new THREE.SphereGeometry(0.3, 20, 12), 0, 0.22, 0, 1.25, 0.6, 0.9);
    for (const sx of [-1, 1]) {
      add(new THREE.CylinderGeometry(0.025, 0.03, 0.16, 6), sx * 0.1, 0.42, -0.12, 1, 1, 1);
      add(new THREE.CapsuleGeometry(0.05, 0.16, 3, 6), sx * 0.42, 0.24, -0.22, 1, 1, 1, 0, 0, sx * 1.0);
      add(new THREE.SphereGeometry(0.11, 12, 8), sx * 0.52, 0.32, -0.27, 1, 0.7, 1.4);
      add(new THREE.ConeGeometry(0.05, 0.16, 6), sx * 0.52, 0.4, -0.34, 1, 1, 1, -Math.PI / 2);
      for (let l = 0; l < 3; l++) add(new THREE.CapsuleGeometry(0.025, 0.2, 2, 5), sx * 0.33, 0.12, -0.05 + l * 0.12, 1, 1, 1, 0, 0, sx * 0.9);
    }
    const m = mergeGeometries(parts.map(p => p.index ? p.toNonIndexed() : p)); return colorize(m, color);
  })());
  rig.add(outline(new THREE.Mesh(geo, toon('#ffffff', { vertexColors: true })), 0.022, edge));
  for (const sx of [-1, 1]) { const e = makeEye(0.075, edge); e.position.set(sx * 0.1, 0.52, -0.13); e.lookAt(sx * 0.1, 0.52, -2); rig.add(e); }
  g.userData = { rig, t: Math.random() * 10 };
  return g;
}
export function animateCrab(c, dt) {
  const u = c.userData; u.t += dt;
  u.rig.position.x = Math.sin(u.t * 0.8) * 0.5;
  u.rig.position.y = Math.abs(Math.sin(u.t * 10)) * 0.025;
  u.rig.rotation.z = Math.sin(u.t * 10) * 0.04;
}

// Seahorse — curly tail, little snout, bobbing
export function makeSeahorse(color = '#FFB13D', light = '#FFE08A') {
  const g = new THREE.Group(); const rig = new THREE.Group(); g.add(rig);
  const edge = '#6A3A10';
  const parts = [];
  // body = a chain of spheres along a curve, thick at the belly, curling at the tail
  const pts = [];
  for (let i = 0; i <= 26; i++) {
    const t = i / 26;
    let x, y;
    if (t < 0.6) { const a = t / 0.6; x = Math.sin(a * 1.4) * 0.12; y = 1.0 - a * 0.85; }
    else { const a = (t - 0.6) / 0.4 * Math.PI * 1.5; const r = 0.16 * (1 - (t - 0.6) / 0.6); x = 0.12 + Math.sin(a) * r; y = 0.15 - (1 - Math.cos(a)) * r; }
    const rad = t < 0.15 ? 0.13 + t * 0.4 : t < 0.5 ? 0.19 - (t - 0.15) * 0.15 : 0.14 - (t - 0.5) * 0.25;
    parts.push(strip(xf(new THREE.SphereGeometry(Math.max(0.03, rad), 10, 6), x, y, 0)));
    pts.push([x, y]);
  }
  let bodyG = mergeGeometries(parts.map(p => p.index ? p.toNonIndexed() : p));
  paintGradient(bodyG, color, color, 'y', 0, 1, (c, i, pos) => { if (pos.getZ(i) < -0.06) c.lerp(new THREE.Color(light), 0.6); });
  const body = outline(new THREE.Mesh(bodyG, toon('#ffffff', { vertexColors: true })), 0.02, edge); rig.add(body);
  const head = outline(new THREE.Mesh(smooth(new THREE.SphereGeometry(0.16, 20, 14)), toon(color)), 0.02, edge); head.position.set(-0.02, 1.12, 0); rig.add(head);
  const snout = outline(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 0.22, 10), toon(color)), 0.015, edge); snout.rotation.z = Math.PI / 2 - 0.25; snout.position.set(-0.2, 1.08, 0); rig.add(snout);
  for (const sz of [-1, 1]) { const e = makeEye(0.065, edge); e.position.set(-0.05, 1.16, sz * 0.12); e.lookAt(-0.05, 1.16, sz * 2); rig.add(e); }
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 6), toon(light)); crown.position.set(0.02, 1.3, 0); rig.add(crown);
  const finS = fanPath(0.18, 0.7); const dfin = new THREE.Mesh(new THREE.ShapeGeometry(finS, 10), toon(light, { side: THREE.DoubleSide })); dfin.position.set(0.17, 0.62, 0); dfin.rotation.z = -0.3; rig.add(dfin);
  g.userData = { rig, dfin, t: Math.random() * 10 };
  return g;
}
export function animateSeahorse(s, dt) { const u = s.userData; u.t += dt; u.rig.position.y = Math.sin(u.t * 1.3) * 0.12; u.rig.rotation.z = Math.sin(u.t * 0.9) * 0.08; u.dfin.scale.x = 1 + Math.sin(u.t * 18) * 0.25; }

// Manta ray — glides overhead, wings flap slowly. Faces -Z.
export function makeManta() {
  const g = new THREE.Group(); const rig = new THREE.Group(); g.add(rig);
  const edge = '#1E2F45';
  const top = new THREE.Color('#3E6FB0'), belly = new THREE.Color('#F2F6FA');
  const wing = (sx) => {
    const s = new THREE.Shape(); s.moveTo(0, -0.7); s.quadraticCurveTo(sx * 0.9, -0.5, sx * 1.9, 0.15); s.quadraticCurveTo(sx * 0.9, 0.2, 0, 0.6); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3, curveSegments: 16 });
    geo.rotateX(Math.PI / 2); geo.deleteAttribute('uv');
    paintGradient(geo, '#ffffff', '#ffffff', 'y', 0, 1, (c, i, pos) => c.copy(pos.getY(i) > 0 ? belly : top));
    const m = outline(new THREE.Mesh(smooth(geo), toon('#ffffff', { vertexColors: true })), 0.03, edge);
    const piv = new THREE.Group(); piv.add(m); rig.add(piv); return piv;
  };
  const L = wing(-1), Rw = wing(1);
  const body = outline(new THREE.Mesh(smooth(new THREE.SphereGeometry(0.5, 24, 14)), toon('#3E6FB0')), 0.03, edge); body.scale.set(0.9, 0.35, 1.3); rig.add(body);
  for (const sx of [-1, 1]) { const horn = outline(new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.28, 4, 8), toon('#3E6FB0')), 0.02, edge); horn.rotation.x = Math.PI / 2; horn.position.set(sx * 0.32, 0.02, -0.75); rig.add(horn);
    const e = makeEye(0.08, edge); e.position.set(sx * 0.38, 0.1, -0.5); e.lookAt(sx * 2, 0.3, -1.5); rig.add(e); }
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.05, 1.6, 6), basic('#2E4F80')); tail.rotation.x = Math.PI / 2; tail.position.z = 1.4; rig.add(tail);
  g.userData = { L, R: Rw, rig, t: Math.random() * 10 };
  return g;
}
export function animateManta(m, dt) { const u = m.userData; u.t += dt * 1.4; const f = Math.sin(u.t) * 0.35; u.L.rotation.z = f; u.R.rotation.z = -f; u.rig.position.y = -Math.sin(u.t) * 0.12; }

// Moray eel peeking out of a rock hole
export function makeEelRock() {
  const g = new THREE.Group();
  const rockG = lumpGeo(11, 3); const rock = outline(new THREE.Mesh(xf(rockG, 0, 0.55, 0, 1.0, 0.75, 0.9), toon('#8A9BB0')), 0.035, '#3E4A5A'); g.add(rock);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.26, 24), basic('#1E2430')); hole.position.set(0, 0.6, 0.86); g.add(hole);
  const eel = new THREE.Group(); eel.position.set(0, 0.6, 0.75); g.add(eel);
  const bodyMat = toon('#7FCF5A');
  const neck = outline(new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.45, 6, 12), bodyMat), 0.022, '#22522A'); neck.rotation.x = Math.PI / 2; neck.position.z = 0.15; eel.add(neck);
  const head = outline(new THREE.Mesh(smooth(new THREE.SphereGeometry(0.2, 20, 14)), bodyMat), 0.022, '#22522A'); head.scale.set(1, 0.9, 1.25); head.position.z = 0.45; eel.add(head);
  for (const sx of [-1, 1]) { const e = placeEye(makeEye(0.075, '#22522A'), V(sx * 0.11, 0.1, 0.55), V(sx * 0.4, 0.2, 1).normalize()); eel.add(e); }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 16, Math.PI), basic('#22522A')); mouth.position.set(0, -0.05, 0.69); mouth.rotation.z = Math.PI; eel.add(mouth);
  g.userData = { eel, t: Math.random() * 10 };
  return g;
}
export function animateEel(r, dt) { const u = r.userData; u.t += dt; const out = THREE.MathUtils.smoothstep(Math.sin(u.t * 0.7), -0.2, 0.6); u.eel.position.z = 0.35 + out * 0.5; u.eel.rotation.y = Math.sin(u.t * 1.6) * 0.3 * out; u.eel.scale.setScalar(0.4 + out * 0.6); }

// Whale far away (mostly a soft silhouette in the haze)
export function makeWhale() {
  const g = new THREE.Group(); const rig = new THREE.Group(); g.add(rig);
  const prof = []; for (let i = 0; i <= 20; i++) { const t = i / 20; prof.push(new THREE.Vector2(Math.max(0.05, Math.sin(Math.PI * Math.pow(t, 0.6)) * (1.6 - t * 0.9)), -4 + t * 8)); }
  let geo = new THREE.LatheGeometry(prof, 28); geo.rotateX(-Math.PI / 2); geo = smooth(geo);
  paintGradient(geo, '#ffffff', '#ffffff', 'y', 0, 1, (c, i, pos) => c.set(pos.getY(i) < -0.4 ? '#CFE4F2' : '#4F7FB8'));
  rig.add(outline(new THREE.Mesh(geo, toon('#ffffff', { vertexColors: true })), 0.08, '#1E2F45'));
  const tail = new THREE.Group(); tail.position.z = 4; rig.add(tail);
  const ts = new THREE.Shape(); ts.moveTo(0, -0.3); ts.quadraticCurveTo(-1.2, 0.4, -2.2, 1.2); ts.quadraticCurveTo(-0.8, 0.9, 0, 0.6); ts.quadraticCurveTo(0.8, 0.9, 2.2, 1.2); ts.quadraticCurveTo(1.2, 0.4, 0, -0.3);
  const tm = new THREE.Mesh(new THREE.ShapeGeometry(ts, 16), toon('#4F7FB8', { side: THREE.DoubleSide })); tm.rotation.x = -Math.PI / 2; tail.add(tm);
  for (const sx of [-1, 1]) { const f = new THREE.Mesh(new THREE.ShapeGeometry(fanPath(1.6, 0.4), 10), toon('#4F7FB8', { side: THREE.DoubleSide })); f.position.set(sx * 1.2, -0.6, -1.2); f.rotation.set(Math.PI / 2, 0, sx > 0 ? 0.6 : Math.PI - 0.6); rig.add(f); }
  const e = makeEye(0.22, '#1E2F45'); e.position.set(1.18, 0, -2.3); e.lookAt(5, 0, -2.6); rig.add(e);
  const e2 = makeEye(0.22, '#1E2F45'); e2.position.set(-1.18, 0, -2.3); e2.lookAt(-5, 0, -2.6); rig.add(e2);
  g.userData = { rig, tail, t: 0 };
  return g;
}
export function animateWhale(w, dt) { const u = w.userData; u.t += dt * 0.7; u.tail.rotation.x = Math.sin(u.t) * 0.3; u.rig.position.y = Math.sin(u.t) * 0.3; u.rig.rotation.x = Math.sin(u.t + 1) * 0.04; }

// ------------------------------------------------------------------
// SHIPWRECK with a treasure chest
// ------------------------------------------------------------------
// ---- pirate ship building blocks (cute cartoon galleon) ----
const PW = { wood: '#B8743E', woodD: '#8A5228', woodL: '#D99A5A', band: '#3A2A3A', gold: '#FFC93C', edge: '#3A2414' };
function flagTexture() {
  return cached('flagTex', () => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 180; const x = c.getContext('2d');
    x.fillStyle = '#1E1A2A'; x.fillRect(0, 0, 256, 180);
    x.fillStyle = '#FFFFFF'; x.strokeStyle = '#FFFFFF'; x.lineCap = 'round';
    x.lineWidth = 16; x.beginPath(); x.moveTo(80, 120); x.lineTo(176, 160); x.moveTo(176, 120); x.lineTo(80, 160); x.stroke();          // crossbones
    for (const [bx, by] of [[76, 118], [180, 118], [76, 162], [180, 162]]) { x.beginPath(); x.arc(bx, by, 11, 0, 7); x.fill(); }
    x.beginPath(); x.ellipse(128, 76, 46, 42, 0, 0, 7); x.fill(); x.fillRect(102, 96, 52, 30);                                          // round cute skull
    x.fillStyle = '#1E1A2A'; x.beginPath(); x.ellipse(110, 74, 13, 15, 0, 0, 7); x.ellipse(146, 74, 13, 15, 0, 0, 7); x.fill();
    x.fillStyle = '#FFFFFF'; x.beginPath(); x.arc(114, 69, 4, 0, 7); x.arc(150, 69, 4, 0, 7); x.fill();                                // sparkly eyes
    x.fillStyle = '#1E1A2A'; x.beginPath(); x.moveTo(128, 88); x.lineTo(122, 98); x.lineTo(134, 98); x.fill();
    for (let i = 0; i < 4; i++) x.fillRect(108 + i * 11, 112, 4, 12);
    x.fillStyle = '#FF8FB0'; x.beginPath(); x.ellipse(96, 96, 8, 5, 0, 0, 7); x.ellipse(160, 96, 8, 5, 0, 0, 7); x.fill();              // blush
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  });
}
function tatteredFlag(w = 1.6, h = 1.1) {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(w, 0);
  for (let i = 1; i <= 6; i++) s.lineTo(w - (i % 2) * 0.18, -h * i / 6);
  for (let i = 5; i >= 0; i--) s.lineTo(w * i / 6, -h + (i % 2 ? 0.14 : 0));
  s.closePath();
  const g = new THREE.ShapeGeometry(s); const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w, 1 + p.getY(i) / h);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: flagTexture(), side: THREE.DoubleSide }));
  return m;
}
function tatteredSail(w, h, col = '#F2E3C0') {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2 - 0.1, -h * 0.7);
  const n = 7; for (let i = 0; i <= n; i++) { const x = w / 2 - 0.1 - (w - 0.2) * i / n; s.lineTo(x, -h * (i % 2 ? 1 : 0.72) + (i % 3) * 0.08); }
  s.lineTo(-w / 2, -h * 0.6); s.closePath();
  s.holes.push(Object.assign(new THREE.Path(), {}).absarc(w * 0.18, -h * 0.4, h * 0.09, 0, Math.PI * 2, true));
  return new THREE.Mesh(new THREE.ShapeGeometry(s), toon(col, { side: THREE.DoubleSide }));
}
function cannon() {
  const g = new THREE.Group();
  const barrel = outline(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.8, 14), toon('#3A3A4A')), 0.02, '#14141E');
  barrel.rotation.x = Math.PI / 2; barrel.position.z = 0.4; g.add(barrel);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 6, 14), toon('#5A5A6A')); rim.position.z = 0.8; g.add(rim);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.09, 12), basic('#0A0A10')); hole.position.z = 0.83; g.add(hole);
  return g;
}
function barrel() {
  const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector2(0.28 + Math.sin(t * Math.PI) * 0.06, t * 0.7)); }
  const b = outline(new THREE.Mesh(new THREE.LatheGeometry(pts, 16), toon('#B87A44')), 0.025, PW.edge);
  for (const y of [0.15, 0.55]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.315, 0.025, 6, 18), toon('#5A5A6A')); h.rotation.x = Math.PI / 2; h.position.y = y; b.add(h); }
  const lid = new THREE.Mesh(new THREE.CircleGeometry(0.28, 16), toon('#8A5228')); lid.rotation.x = -Math.PI / 2; lid.position.y = 0.7; b.add(lid);
  return b;
}
function anchor() {
  const g = new THREE.Group(); const m = toon('#5A6070'); const e = '#20242E';
  const shank = outline(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.4, 8), m), 0.02, e); shank.position.y = 0.7; g.add(shank);
  const ring = outline(new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 8, 16), m), 0.015, e); ring.position.y = 1.5; g.add(ring);
  const stock = outline(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8), m), 0.015, e); stock.rotation.z = Math.PI / 2; stock.position.y = 1.2; g.add(stock);
  const arm = outline(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 8, 20, Math.PI), m), 0.02, e); arm.rotation.z = Math.PI; arm.position.y = 0.5; g.add(arm);
  for (const sx of [-1, 1]) { const f = outline(new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.28, 3), m), 0.015, e); f.position.set(sx * 0.5, 0.55, 0); g.add(f); }
  return g;
}
function wheel() {
  const g = new THREE.Group(); const m = toon(PW.woodL);
  g.add(outline(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 24), m), 0.015, PW.edge));
  for (let i = 0; i < 8; i++) { const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6), m); sp.rotation.z = i * Math.PI / 8 * 2 / 2 * 2 / 2 + i * Math.PI / 8; g.add(sp); }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 12), toon(PW.gold)); hub.rotation.x = Math.PI / 2; g.add(hub);
  return g;
}
// side profile of a galleon hull: low bow (−x), high stern castle (+x). Optional burst hole.
function hullShape(L, H, hole) {
  const s = new THREE.Shape();
  s.moveTo(-L / 2, H * 0.55);                                    // bow tip
  s.quadraticCurveTo(-L / 2 + 0.6, H * 0.15, -L / 2 + 2.0, 0.0);
  s.lineTo(L / 2 - 2.2, 0.0);
  s.quadraticCurveTo(L / 2 - 0.4, 0.15, L / 2, H * 0.55);         // stern bottom curve
  s.lineTo(L / 2 + 0.2, H * 1.05); s.lineTo(L / 2 - 2.8, H * 1.05); // stern castle top
  s.lineTo(L / 2 - 2.8, H * 0.82); s.lineTo(-L / 2 + 1.6, H * 0.82); // main deck rail
  s.lineTo(-L / 2 + 1.6, H * 0.92); s.lineTo(-L / 2 + 0.2, H * 0.92);
  s.closePath();
  if (hole) {
    const [cx, cy, rx, ry] = hole; const p = new THREE.Path(); const n = 22;
    for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2; const j = i % 2 ? 1.0 : 1.22 + ((i * 37) % 7) * 0.03; const x = cx + Math.cos(a) * rx * j, y = cy + Math.sin(a) * ry * j; if (i === 0) p.moveTo(x, y); else p.lineTo(x, y); }
    s.holes.push(p);
  }
  return s;
}
function hullTexture() {
  return cached('hullTex', () => {
    const W = 1024, Ht = 512, c = document.createElement('canvas'); c.width = W; c.height = Ht; const x = c.getContext('2d');
    // v=0 bottom … v=1 top of the stern castle
    const yv = (v) => Ht - v * Ht;
    const grd = x.createLinearGradient(0, Ht, 0, 0); grd.addColorStop(0, '#6A3A1E'); grd.addColorStop(0.5, '#A8622E'); grd.addColorStop(1, '#C47A3A');
    x.fillStyle = grd; x.fillRect(0, 0, W, Ht);
    // planks with staggered joints and nail dots
    const ph = Ht * 0.07;
    for (let k = 0, y = Ht; y > 0; k++, y -= ph) {
      x.fillStyle = k % 2 ? 'rgba(255,220,170,0.10)' : 'rgba(60,30,10,0.10)'; x.fillRect(0, y - ph, W, ph);
      x.fillStyle = '#4A2410'; x.fillRect(0, y - 3, W, 4);
      for (let j = (k % 2) * 60; j < W; j += 120) { x.fillRect(j, y - ph, 3, ph); x.fillStyle = '#3A1A08'; x.beginPath(); x.arc(j + 10, y - ph / 2, 3, 0, 7); x.fill(); x.fillStyle = '#4A2410'; }
    }
    // weathering: mossy green near the keel, barnacle dots
    const mg = x.createLinearGradient(0, Ht, 0, Ht * 0.7); mg.addColorStop(0, 'rgba(70,140,90,0.55)'); mg.addColorStop(1, 'rgba(70,140,90,0)'); x.fillStyle = mg; x.fillRect(0, Ht * 0.7, W, Ht * 0.3);
    for (let i = 0; i < 120; i++) { x.fillStyle = i % 3 ? 'rgba(235,230,215,0.9)' : 'rgba(255,170,200,0.9)'; x.beginPath(); x.arc(Math.random() * W, Ht - Math.random() * Ht * 0.28, 2 + Math.random() * 4, 0, 7); x.fill(); }
    // black gunport band with a red stripe, gold trim along the rail
    x.fillStyle = '#231824'; x.fillRect(0, yv(0.58), W, Ht * 0.11);
    x.fillStyle = '#D8323A'; x.fillRect(0, yv(0.62), W, Ht * 0.035);
    x.fillStyle = '#FFC93C'; x.fillRect(0, yv(0.765), W, Ht * 0.03); x.fillRect(0, yv(0.47), W, Ht * 0.018);
    x.fillStyle = '#8A1E2A'; x.fillRect(0, yv(0.86), W, Ht * 0.06);  // red castle band
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  });
}
function hullMesh(L, H, D, hole) {
  const geo = new THREE.ExtrudeGeometry(hullShape(L, H, hole), { depth: D, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.18, bevelSegments: 3, curveSegments: 10 });
  geo.translate(0, 0, -D / 2);
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) / L + 0.5) * (L / 9), p.getY(i) / (H * 1.08));
  const tex = hullTexture(); tex.wrapS = THREE.RepeatWrapping;
  const mat = toon('#ffffff'); mat.map = tex;
  return outline(new THREE.Mesh(geo, mat), 0.05, PW.edge);
}
function decorateHull(g, L, H, D, holeX, skipR) {
  // gunports with cannons poking out
  for (let x = -L / 2 + 2.4; x < L / 2 - 3; x += 1.7) {
    if (skipR && Math.abs(x - holeX) < skipR) continue;
    const port = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.42), basic('#1A1020')); port.position.set(x, H * 0.56, D / 2 + 0.26); g.add(port);
    const c = cannon(); c.position.set(x, H * 0.56, D / 2 + 0.1); c.scale.setScalar(0.8); g.add(c);
  }
  // stern windows glowing a little
  for (let k = 0; k < 3; k++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.4), basic('#FFD86B')); w.position.set(L / 2 - 2.3 + k * 0.7, H * 0.93, D / 2 + 0.26); g.add(w); const f = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.4), basic(PW.edge)); f.position.copy(w.position).add(V(0, 0, 0.005)); g.add(f); }
  // bowsprit
  const bs = outline(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 3, 8), toon(PW.woodD)), 0.025, PW.edge); bs.rotation.z = Math.PI / 2 - 0.35; bs.position.set(-L / 2 - 0.9, H * 1.1, 0); g.add(bs);
  // ship wheel on the stern castle
  const wh = wheel(); wh.position.set(L / 2 - 1.6, H * 1.05 + 0.55, 0); wh.rotation.y = Math.PI / 2; g.add(wh);
  // barnacles + coral + seaweed reclaiming the wreck
  const R = rng(Math.floor((holeX + 5) * 13));
  const solid = [], plates = [], soft = [];
  for (let i = 0; i < 9; i++) { const x = -L / 2 + 1 + R() * (L - 2); if (skipR && Math.abs(x - holeX) < skipR + 0.3) continue; addCoral(R, x, (x > L / 2 - 2.8 ? H * 1.05 : H * 0.82) + 0.15, (R() - 0.5) * D * 0.7, solid, plates, 1.1, soft); }
  g.add(coralMeshes(solid, plates, '#3A2440', soft));
  const weed = new THREE.MeshBasicMaterial({ color: '#3FBF7F', side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.9 + R() * 0.8), weed); const x = -L / 2 + 1.5 + R() * (L - 3); b.position.set(x, H * 0.82 - 0.5, D / 2 + 0.3); g.add(b); }
}
function brokenMast(h, g, x, z, lean, withFlag, base = 0) {
  const mast = new THREE.Group(); mast.position.set(x, base, z); mast.rotation.z = lean; g.add(mast);
  const m = outline(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, h, 10), toon(PW.woodD)), 0.035, PW.edge); m.position.y = h / 2; mast.add(m);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 5), toon(PW.woodL)); tip.position.y = h + 0.1; tip.rotation.z = 0.4; mast.add(tip); // splintered top
  const yard = outline(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3, 8), toon(PW.woodD)), 0.025, PW.edge); yard.rotation.z = Math.PI / 2 + 0.25; yard.position.y = h * 0.78; mast.add(yard);
  const sail = tatteredSail(2.8, Math.min(2.6, h * 0.5)); sail.position.set(0, h * 0.77, 0.12); sail.rotation.z = 0.25; mast.add(sail);
  const crow = outline(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.3, 12, 1, true), toon(PW.woodL, { side: THREE.DoubleSide })), 0.02, PW.edge); crow.position.y = h * 0.9; mast.add(crow);
  if (withFlag) { const f = tatteredFlag(1.5, 1.0); f.position.set(0.1, h + 0.0, 0); f.userData.flag = true; mast.add(f); }
  // a few dangling ropes
  const rope = basic('#C8A878');
  for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, h * 0.6, 4), rope); r.position.set(-0.6 + i * 0.6, h * 0.45, 0.05); r.rotation.z = 0.25 + i * 0.1; mast.add(r); }
  return mast;
}

// ------------------------------------------------------------------
// PIRATE SHIPWRECK (decor beside the lane): burst in two, half sunk, treasure spilling
// ------------------------------------------------------------------
export function makeShipwreck() {
  const g = new THREE.Group();
  const L = 9, H = 2.6, D = 2.2;
  // stern half (big, tilted) and bow half, split by a jagged break
  const stern = new THREE.Group(); stern.position.set(2.2, -0.3, 0); stern.rotation.set(0, 0, 0.12); g.add(stern);
  const sHull = hullMesh(L, H, D, [-L / 2 + 0.6, H * 0.45, 0.9, 0.7]); stern.add(sHull);
  decorateHull(stern, L, H, D, -L / 2 + 0.6, 1.2);
  brokenMast(4.2, stern, 0.6, 0, -0.18, true, H * 0.8);
  const bow = new THREE.Group(); bow.position.set(-4.6, -0.6, 0.8); bow.rotation.set(0.1, 0.5, -0.32); g.add(bow);
  const bHull = hullMesh(5, H, D, null); bHull.scale.x = 1; bow.add(bHull);
  brokenMast(2.4, bow, 0.2, 0, 0.5, false, H * 0.8);
  // splinters around the break
  const R = rng(4);
  for (let i = 0; i < 10; i++) { const sp = outline(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8 + R() * 1.2, 0.1), toon(PW.woodL)), 0.02, PW.edge); sp.position.set(-2.3 + R() * 1.2, R() * 1.5, (R() - 0.5) * 2); sp.rotation.set(R() - 0.5, R() * 3, R() * 1.6 - 0.8); g.add(sp); }
  // loot on the sand: chest, barrels, anchor, cannonballs
  const chest = makeChest(); chest.position.set(-1.6, 0, 2.4); chest.rotation.y = 0.4; g.add(chest);
  for (const [x, z, ry, lie] of [[1.2, 2.6, 0.3, 0], [2.0, 2.3, 1.2, 1], [-3.2, 2.2, 0.8, 1]]) { const b = barrel(); b.position.set(x, lie ? 0.3 : 0, z); b.rotation.set(lie ? Math.PI / 2 : 0, ry, 0); g.add(b); }
  const an = anchor(); an.position.set(5.4, 0.1, 2.0); an.rotation.set(0, 0.6, 1.2); g.add(an);
  const ballM = toon('#2E2E3A');
  for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), ballM); b.position.set(0.2 + i * 0.3, 0.14, 2.9 + (i % 2) * 0.2); g.add(b); }
  g.userData = { chest };
  return g;
}

export function makeChest() {
  const g = new THREE.Group(); const edge = '#3A2414';
  const box = outline(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.6, 0.7), toon('#B5703A')), 0.035, edge); box.position.y = 0.3; g.add(box);
  const lid = new THREE.Group(); lid.position.set(0, 0.6, -0.35); g.add(lid);
  const lidM = outline(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.1, 16, 1, false, 0, Math.PI), toon('#C98A50')), 0.035, edge); lidM.rotation.z = Math.PI / 2; lidM.position.z = 0.35; lid.add(lidM);
  lid.rotation.x = -0.9;
  const band = toon('#FFD23F');
  for (const x of [-0.42, 0.42]) { const b = outline(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 0.72), band), 0.02, edge); b.position.set(x, 0.3, 0); g.add(b); }
  const lock = outline(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.06), band), 0.015, edge); lock.position.set(0, 0.45, 0.37); g.add(lock);
  // gold coins + pearls spilling out
  const coin = new THREE.CylinderGeometry(0.09, 0.09, 0.025, 14); const coinM = toon('#FFD23F', { emissive: '#6A4A00' });
  const R = rng(5);
  for (let i = 0; i < 14; i++) { const c = new THREE.Mesh(coin, coinM); const inside = i < 8; c.position.set((R() - 0.5) * (inside ? 0.8 : 1.6), inside ? 0.62 + R() * 0.08 : 0.02, inside ? (R() - 0.5) * 0.4 : 0.5 + R() * 0.6); c.rotation.set(R() * 0.6, R() * 3, R() * 0.6); g.add(c); }
  for (let i = 0; i < 3; i++) { const p = makePearl(); p.scale.setScalar(0.6); p.position.set(-0.25 + i * 0.25, 0.72, 0); g.add(p); }
  return g;
}

// ------------------------------------------------------------------
// SWIM-THROUGH PIRATE SHIP lying across the lane — burst open, swim through the hole
// ------------------------------------------------------------------
export const GATE = { halfW: 1.35, y0: 1.2, y1: 3.6, len: 18, height: 5.2, depth: 1.6 };
export function makeWreckGate(holeX = 0) {
  const g = new THREE.Group();
  const L = GATE.len, H = GATE.height, D = GATE.depth;
  const hcx = holeX, hcy = (GATE.y0 + GATE.y1) / 2;
  const hull = hullMesh(L, H, D, [hcx, hcy, GATE.halfW + 0.35, (GATE.y1 - GATE.y0) / 2 + 0.3]);
  hull.position.y = 0; g.add(hull);
  decorateHull(g, L, H, D, holeX, GATE.halfW + 1.0);
  // splintered planks bent outward around the burst hole
  const R = rng(Math.floor(holeX * 10) + 77);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, rx = GATE.halfW + 0.45, ry = (GATE.y1 - GATE.y0) / 2 + 0.4;
    const sp = outline(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5 + R() * 0.6, 0.1), toon(i % 2 ? PW.woodL : PW.wood)), 0.02, PW.edge);
    sp.position.set(hcx + Math.cos(a) * rx, hcy + Math.sin(a) * ry, D / 2 + 0.15 + R() * 0.2);
    sp.rotation.set(-0.5 - R() * 0.4, 0, a + Math.PI / 2 + (R() - 0.5) * 0.6); g.add(sp);
  }
  // the inside of the hull is dark, with a glimpse of treasure through the hole
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(L - 1, H * 0.8), basic('#2A1A20')); inner.position.set(0, H * 0.4, -D / 2 + 0.05); g.add(inner);
  // lanterns either side of the hole so it reads as "swim here"
  for (const sx of [-1, 1]) {
    const lp = V(hcx + sx * (GATE.halfW + 0.75), GATE.y1 + 0.2, D / 2 + 0.35);
    const cage = outline(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.36, 6), toon('#3A3A4A')), 0.015, '#14141E'); cage.position.copy(lp); g.add(cage);
    const lan = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), new THREE.MeshBasicMaterial({ color: '#FFE48A' })); lan.position.copy(lp); g.add(lan);
    const gs = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(false), color: '#FFD86B', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); gs.scale.setScalar(1.4); gs.position.copy(lp); g.add(gs);
  }
  // broken mast flying the jolly roger, leaning away from the hole
  brokenMast(5.0, g, holeX > 0 ? holeX - 4.5 : holeX + 4.5, 0, holeX > 0 ? 0.22 : -0.22, true, H * 0.8);
  brokenMast(3.2, g, holeX > 0 ? holeX - 8 : holeX + 8 > L / 2 - 3 ? L / 2 - 3.5 : holeX + 8, 0, 0.4, false, H * 0.8);
  const an = anchor(); an.position.set(holeX > 0 ? -L / 2 + 2 : L / 2 - 2, 0.2, D / 2 + 0.7); an.rotation.set(0.2, 0.4, 0.9); g.add(an);
  for (let i = 0; i < 3; i++) { const b = barrel(); b.position.set(holeX + (i - 1) * 1.2 + (holeX > 0 ? -4 : 4), 0.3, D / 2 + 1.1); b.rotation.set(Math.PI / 2, R() * 3, 0); g.add(b); }
  return g;
}

// ------------------------------------------------------------------
// CHRISTMAS TREE WORMS on a rock — they zip back in when Cubi comes close
// ------------------------------------------------------------------
// palettes: [filament colour, band colour] — banded like the real worms
const XMAS = [['#2F6BFF', '#9EC2FF'], ['#FFB000', '#FF8A00'], ['#FFFFFF', '#FF3A4A'], ['#3FBF5A', '#1F7A3A'], ['#9B4DFF', '#FF7FD0'], ['#FF6A1A', '#FFD000'], ['#1FC8E8', '#2F6BFF'], ['#FF3D8B', '#FFD0E4']];
// one fluffy "fir tree": fine filaments radiating from a spiral, in stacked whorls
function xmasTreeGeo(pal) {
  return cached('xmasF2' + pal, () => {
    const [C1, C2] = XMAS[pal].map(c => new THREE.Color(c));
    const white = new THREE.Color('#ffffff');
    const parts = [];
    const H = 0.42, R0 = 0.2;
    // solid soft core so the cone reads full and fluffy
    const core = new THREE.ConeGeometry(R0 * 0.62, H * 0.98, 16, 6); core.translate(0, H * 0.49 + 0.02, 0); core.deleteAttribute('uv');
    paintGradient(core, '#ffffff', '#ffffff', 'y', 0, 1, (c, i, pos) => { const w = Math.floor((pos.getY(i) - 0.02) / H * 7); c.copy(w % 2 ? C2 : C1).multiplyScalar(0.92); });
    parts.push(core.toNonIndexed());
    // feathery filaments in stacked spiral whorls
    const fil = new THREE.ConeGeometry(0.018, 1, 4, 1, true); fil.translate(0, 0.5, 0); fil.deleteAttribute('uv');
    const up = V(0, 1, 0); const q = new THREE.Quaternion(); const m = new THREE.Matrix4();
    const whorls = 6, perTurn = 26;
    for (let w = 0; w < whorls; w++) {
      const col = w % 2 ? C2 : C1;
      for (let k = 0; k < perTurn; k++) {
        const t = (w + k / perTurn) / whorls;                 // spiral climb
        const a = (k / perTurn) * Math.PI * 2 + w * 0.5;
        const y = 0.02 + t * H;
        const rad = R0 * (1 - t) * 0.55;
        const len = R0 * (1 - t) * 0.75 + 0.03;
        const dir = V(Math.cos(a), -0.45, Math.sin(a)).normalize();
        q.setFromUnitVectors(up, dir);
        m.compose(V(Math.cos(a) * rad, y, Math.sin(a) * rad), q, V(1, len, 1));
        const g = fil.clone().applyMatrix4(m);
        const n = g.attributes.position.count, ca = new Float32Array(n * 3);
        const base = col.clone(), tipC = col.clone().lerp(white, 0.18);
        const p = g.attributes.position;
        for (let i = 0; i < n; i++) { const d = Math.hypot(p.getX(i) - Math.cos(a) * rad, p.getZ(i) - Math.sin(a) * rad); const c = base.clone().lerp(tipC, Math.min(1, d / len)); ca[i * 3] = c.r; ca[i * 3 + 1] = c.g; ca[i * 3 + 2] = c.b; }
        g.setAttribute('color', new THREE.BufferAttribute(ca, 3));
        parts.push(g.toNonIndexed());
      }
    }
    return mergeGeometries(parts.map(p => { if (!p.attributes.normal) p.computeVertexNormals(); return p; }));
  });
}
let _xmasMat = null;
function xmasMat() { return (_xmasMat ||= new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toon('#fff').gradientMap, side: THREE.DoubleSide })); }
export function makeXmasRock(seed = 1) {
  const g = new THREE.Group(); const R = rng(seed * 11 + 5);
  const rock = outline(new THREE.Mesh(xf(lumpGeo(seed, 2), 0, 0.35, 0, 0.9, 0.55, 0.8), toon('#C8BC92')), 0.03, '#5A5034'); g.add(rock);
  const worms = [];
  const n = 5 + Math.floor(R() * 3);
  for (let i = 0; i < n; i++) {
    const pal = (seed * 5 + i * 3) % XMAS.length;
    const w = new THREE.Group();
    const a = (i / n) * Math.PI * 2 + R() * 0.5, rr = 0.18 + R() * 0.42;
    const wx = Math.cos(a) * rr, wz = Math.sin(a) * rr * 0.9; const inside = Math.max(0, 1 - (wx / 0.85) ** 2 - (wz / 0.75) ** 2);
    w.position.set(wx, 0.35 + 0.52 * Math.sqrt(inside) - 0.02, wz);
    w.rotation.set((R() - 0.5) * 0.4, R() * 6, (R() - 0.5) * 0.4);
    for (const sx of [-1, 1]) { const t = new THREE.Mesh(xmasTreeGeo(pal), xmasMat()); t.position.x = sx * 0.17; t.rotation.z = -sx * 0.14; w.add(t); }
    const ws = 0.85 + R() * 0.35; w.scale.setScalar(ws); w.userData.s = ws; g.add(w); worms.push(w);
  }
  g.userData = { worms, hide: 0 };
  return g;
}
export function animateXmas(r, dt, near) {
  const u = r.userData;
  u.hide = near ? Math.min(1, u.hide + dt * 2.2) : Math.max(0, u.hide - dt * 0.45);   // shrink back over ~half a second, unfurl slowly
  u.worms.forEach((w, i) => { const k = 1 - 0.68 * THREE.MathUtils.smoothstep(u.hide, i * 0.06, 0.6 + i * 0.06); /* never fully gone: tucks down to about a third */ const s0 = w.userData.s || 1; w.scale.set(s0 * (0.55 + k * 0.45), s0 * k, s0 * (0.55 + k * 0.45)); w.children.forEach((c, j) => { c.rotation.y = Math.sin(performance.now() * 0.0012 + i + j) * 0.15 * k; }); });
}

// ------------------------------------------------------------------
// NUDIBRANCH — tiny, colourful sea slug that crawls along
// ------------------------------------------------------------------
const NUDI = [['#9B3DFF', '#FFB000', '#FFFFFF'], ['#1E90FF', '#FFE600', '#FF7A00'], ['#FF2E88', '#FFFFFF', '#FFE600'], ['#FF7A00', '#FFFFFF', '#9B3DFF'], ['#00E0C8', '#FF2E88', '#1E90FF']];
export function makeNudibranch(pal = 0) {
  const [B, E, S] = NUDI[pal % NUDI.length];
  const g = new THREE.Group(); const rig = new THREE.Group(); g.add(rig);
  const edge = '#2A1A3A';
  let body = new THREE.CapsuleGeometry(0.11, 0.45, 6, 14); body.rotateX(Math.PI / 2); body.scale(1, 0.7, 1); body.translate(0, 0.08, 0);
  body = smooth(body);
  paintGradient(body, B, B, 'y', 0, 1, (c, i, pos) => { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); if (Math.abs(x) > 0.085 && y < 0.1) c.set(E); if (y > 0.13 && Math.abs(Math.sin(z * 26)) > 0.92 && Math.abs(x) < 0.05) c.set(S); });
  rig.add(outline(new THREE.Mesh(body, toon('#ffffff', { vertexColors: true })), 0.012, edge));
  // skirt (frilly edge)
  const sk = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 6, 24), toon(E)); sk.rotation.x = Math.PI / 2; sk.scale.set(1, 2.6, 1); sk.position.y = 0.03; rig.add(sk);
  // rhinophores (horns) and gill tuft
  const hornM = toon(E);
  for (const sx of [-1, 1]) { const h = outline(new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.1, 3, 6), hornM), 0.008, edge); h.position.set(sx * 0.05, 0.2, -0.2); h.rotation.set(-0.4, 0, sx * 0.3); rig.add(h); }
  const gill = new THREE.Group(); gill.position.set(0, 0.16, 0.2); rig.add(gill);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const b = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.14, 5), toon(S)); b.position.set(Math.cos(a) * 0.04, 0.06, Math.sin(a) * 0.04); b.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); gill.add(b); }
  for (const sx of [-1, 1]) { const e = makeEye(0.03, edge); e.position.set(sx * 0.05, 0.13, -0.27); e.lookAt(sx * 0.2, 0.13, -1); rig.add(e); }
  g.userData = { rig, gill, t: Math.random() * 10 };
  return g;
}
export function animateNudi(n, dt) { const u = n.userData; u.t += dt; u.rig.scale.z = 1 + Math.sin(u.t * 3) * 0.06; u.rig.position.z = -((u.t * 0.08) % 0.6) + 0.3; u.gill.rotation.y = u.t * 0.6; }

// ------------------------------------------------------------------
// MORAY EEL — hides in a rock at the lane edge and lunges at Cubi
// ------------------------------------------------------------------
export function makeMoray(home = 'rock') {
  const g = new THREE.Group(); const edge = '#22522A';
  const eel = new THREE.Group(); g.add(eel);
  if (home === 'tube') {
    // a big pipe coral; the eel hides inside and shoots out of the opening
    const col = COR.orange;
    const pipe = new THREE.Group(); pipe.position.set(0, 0, 0); pipe.rotation.x = 0.75; g.add(pipe);
    const tubeM = outline(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.42, 2.4, 24, 1, true), toon(col[0], { side: THREE.DoubleSide })), 0.04, col[1]); tubeM.position.y = 1.2; pipe.add(tubeM);
    const rim = outline(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 10, 28), toon('#FFD0B8')), 0.025, col[1]); rim.rotation.x = Math.PI / 2; rim.position.y = 2.4; pipe.add(rim);
    const dark = new THREE.Mesh(new THREE.CircleGeometry(0.47, 24), basic('#3A1408')); dark.rotation.x = -Math.PI / 2; dark.position.y = 2.2; pipe.add(dark);
    for (const [x, h, r] of [[-0.7, 1.2, 0.22], [0.65, 0.9, 0.2], [0.2, 0.7, 0.18]]) { const t = outline(new THREE.Mesh(new THREE.CylinderGeometry(r * 1.1, r, h, 16), toon(col[0])), 0.025, col[1]); t.position.set(x, h / 2, -0.4); g.add(t); const hd = new THREE.Mesh(new THREE.CircleGeometry(r * 0.8, 14), basic(col[1])); hd.rotation.x = -Math.PI / 2; hd.position.set(x, h + 0.01, -0.4); g.add(hd); }
    // opening sits at the top of the tilted pipe, pointing toward local +z and up
    const top = V(0, 2.3, 0).applyEuler(pipe.rotation); eel.position.copy(top); eel.rotation.x = -0.75 + Math.PI / 2 - 0.35;
  } else {
    const rock = outline(new THREE.Mesh(xf(lumpGeo(23, 2), 0, 0.9, 0, 1.3, 1.1, 1.2), toon('#9AA6C4')), 0.04, '#3E4A5A'); g.add(rock);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), basic('#1E2430')); hole.position.set(0, 1.05, 1.22); g.add(hole);
    eel.position.set(0, 1.05, 0.9);
  }
  // eel body: a chain of segments that slides out of the hole
  const skin = toon('#8FD46A'); const spotM = basic('#4E8A30');
  const segs = [];
  for (let i = 0; i < 9; i++) { const r = 0.26 - i * 0.012; const s = outline(new THREE.Mesh(smooth(new THREE.SphereGeometry(r, 16, 10)), skin), 0.025, edge); s.scale.z = 1.4; const sp = new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), spotM); sp.position.set(0, r * 0.98, 0); sp.rotation.x = -Math.PI / 2; s.add(sp); eel.add(s); segs.push(s); }
  const head = segs[0];
  // jaw + teeth, eyes
  const jaw = outline(new THREE.Mesh(smooth(new THREE.SphereGeometry(0.2, 14, 10)), skin), 0.022, edge); jaw.scale.set(1, 0.45, 1.6); jaw.position.set(0, -0.14, 0.12); head.add(jaw);
  const mouthIn = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), basic('#7A2B3A')); mouthIn.position.set(0, -0.07, 0.36); mouthIn.scale.y = 0.4; head.add(mouthIn);
  for (let i = 0; i < 5; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.06, 5), basic('#FFFFFF')); t.rotation.z = Math.PI; t.position.set(-0.1 + i * 0.05, -0.03, 0.36); head.add(t); }
  for (const sx of [-1, 1]) { const e = placeEye(makeEye(0.085, edge), V(sx * 0.15, 0.13, 0.18), V(sx * 0.5, 0.2, 1).normalize()); head.add(e);
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.1, 3, 6), basic(edge)); brow.position.set(sx * 0.14, 0.25, 0.2); brow.rotation.z = Math.PI / 2 - sx * 0.4; head.add(brow); }
  g.userData = { eel, segs, jaw, out: 0.15, t: Math.random() * 10 };
  setMoray(g, 0.15, 0);
  return g;
}
// out: 0 hidden .. 1 fully lunged. aim: -1..1 sideways toward the lane
export function setMoray(m, out, open) {
  const u = m.userData; u.out = out;
  u.segs.forEach((s, i) => { const k = Math.max(0, out * 9 - i) / 9; s.visible = out * 9 > i - 0.8; s.position.set(Math.sin(i * 0.9 + u.t * 6) * 0.06 * out, Math.sin(i * 0.7) * 0.05, out * 3.4 - i * 0.38); });
  u.jaw.rotation.x = open * 0.6;
}

// ------------------------------------------------------------------
// KRAKEN — big cute octopus that squirts black ink
// ------------------------------------------------------------------
export function makeKraken() {
  const g = new THREE.Group(); const rig = new THREE.Group(); g.add(rig);
  const edge = '#2A1040'; const skin = toon('#B054E8'); const light = '#E6B8FF';
  let head = new THREE.SphereGeometry(1.1, 36, 24); head.scale(1, 1.25, 1); head.translate(0, 1.0, 0); head = smooth(head);
  paintGradient(head, '#ffffff', '#ffffff', 'y', 0, 1, () => {});
  const headM = outline(new THREE.Mesh(head, skin), 0.06, edge); rig.add(headM);
  // spots
  const R = rng(9);
  for (let i = 0; i < 10; i++) { const a = R() * Math.PI * 2, b = 0.3 + R() * 0.9; const d = new THREE.Mesh(new THREE.CircleGeometry(0.08 + R() * 0.08, 14), basic('#8A2FC4')); const p = V(Math.cos(a) * Math.sin(b), Math.cos(b), Math.sin(a) * Math.sin(b)); d.position.set(p.x * 1.11, 1.0 + p.y * 1.38, p.z * 1.11); d.lookAt(d.position.clone().add(V(p.x, p.y * 0.8, p.z))); if (p.z > -0.2) rig.add(d); }
  for (const sx of [-1, 1]) { const e = placeEye(makeEye(0.32, edge), V(sx * 0.45, 0.8, 0.82), V(sx * 0.3, 0, 1).normalize()); rig.add(e);
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.36, 4, 8), basic(edge)); brow.position.set(sx * 0.45, 1.25, 0.95); brow.rotation.z = Math.PI / 2 - sx * 0.35; rig.add(brow);
    const b = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), basic('#FF6FB0')); b.scale.y = 0.55; b.position.set(sx * 0.68, 0.45, 0.86); b.rotation.y = sx * 0.6; rig.add(b); }
  const siphon = outline(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.3, 12), toon('#9B3DD8')), 0.025, edge); siphon.rotation.x = Math.PI / 2; siphon.position.set(0, 0.3, 1.05); rig.add(siphon);
  // tentacles: chains of shrinking spheres with suckers
  const tents = [];
  const suck = toon(light);
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2;
    const t = new THREE.Group(); t.position.set(Math.cos(a) * 0.65, 0.0, Math.sin(a) * 0.65); rig.add(t);
    const segs = [];
    for (let i = 0; i < 9; i++) { const r = 0.28 * (1 - i / 11); const s = outline(new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), skin), 0.03, edge); if (i % 2 === 0) { const sc = new THREE.Mesh(new THREE.SphereGeometry(r * 0.35, 8, 6), suck); sc.position.set(0, -r * 0.8, 0); s.add(sc); } t.add(s); segs.push(s); }
    tents.push({ t, segs, a });
  }
  g.userData = { rig, tents, t: Math.random() * 10, squirt: 0 };
  animateKraken(g, 0);
  return g;
}
export function animateKraken(k, dt) {
  const u = k.userData; u.t += dt;
  u.tents.forEach(({ segs, a }, ti) => {
    let x = 0, y = 0, z = 0;
    segs.forEach((s, i) => {
      const w = Math.sin(u.t * 2.2 - i * 0.55 + ti) * 0.35;
      x += Math.cos(a) * 0.22 + Math.cos(a + Math.PI / 2) * w * 0.12; z += Math.sin(a) * 0.22 + Math.sin(a + Math.PI / 2) * w * 0.12; y -= 0.2 - Math.sin(u.t * 1.5 + ti) * 0.05;
      s.position.set(x * 0.9, y, z * 0.9);
    });
  });
  u.rig.position.y = Math.sin(u.t * 1.2) * 0.25;
  const sq = u.squirt; u.rig.scale.set(1 + sq * 0.12, 1 - sq * 0.1, 1 + sq * 0.12);
}

// =====================================================================
// LUSH REEF (inspired by the reference photos)
// =====================================================================
export const reefClock = { value: 0 };
export const RCOL = {
  orange: ['#FF7A00', '#FFD24A'], yellow: ['#FFD000', '#FFFF7A'], magenta: ['#FF1F9A', '#FF9AE0'], purple: ['#7A2FFF', '#C890FF'],
  green: ['#5FE02A', '#E8FF70'], teal: ['#00D8C0', '#A0FFF0'], blue: ['#2F6BFF', '#9AC0FF'], coral: ['#FF3A2A', '#FFB09A'], peach: ['#FF8A3A', '#FFE0A0'],
};
const cg = (g, c) => colorize(strip(g.index ? g.toNonIndexed() : g), c);

// ruffled lettuce / plate coral with a glowing rim (no hull outline: has its own dark rim line)
function gLettuce(R, c, r = 0.6) {
  const seg = 36, rings = 4, parts = [];
  const g = new THREE.PlaneGeometry(1, 1, seg, rings); const p = g.attributes.position;
  const k = 4 + Math.floor(R() * 4), ph = R() * 6, amp = (0.05 + R() * 0.05) * r / 0.6;
  const rim = [];
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) + 0.5, v = p.getY(i) + 0.5, a = u * Math.PI * 2;
    const rr = (0.06 + v * 0.94) * r * (1 + 0.12 * Math.sin(a * 3 + ph));
    const y = 0.05 + v * v * 0.32 * r + amp * v * v * Math.sin(a * k + ph);
    p.setXYZ(i, Math.cos(a) * rr, y, Math.sin(a) * rr);
  }
  g.deleteAttribute('uv'); g.computeVertexNormals();
  const ng = g.toNonIndexed(); const c1 = new THREE.Color(c[0]), c2 = new THREE.Color(c[1]);
  paintGradient(ng, '#fff', '#fff', 'y', 0, 1, (cc, i, pos) => { const d = Math.hypot(pos.getX(i), pos.getZ(i)) / r; cc.copy(c1).lerp(c2, THREE.MathUtils.smoothstep(d, 0.72, 0.98)); });
  parts.push(ng);
  // rim line traced along the outer edge
  for (let j = 0; j <= seg; j++) { const idx = rings * (seg + 1) + j; rim.push(V(p.getX(idx), p.getY(idx) + 0.005, p.getZ(idx))); }
  const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rim, true), 54, 0.014 * r / 0.6 + 0.006, 4, true);
  parts.push(cg(tube, new THREE.Color(c[0]).multiplyScalar(0.45)));
  const stem = new THREE.CylinderGeometry(0.06, 0.1, 0.12, 8); stem.translate(0, 0.02, 0); parts.push(cg(stem, new THREE.Color(c[0]).multiplyScalar(0.7)));
  return mergeGeometries(parts.map(q => { if (!q.attributes.normal) q.computeVertexNormals(); return q; }));
}
// bushy branching coral (tree-like or cushion-like), lighter knobbly tips
function gBush(R, c, tree = false) {
  const branch = [], tips = []; const up = V(0, 1, 0);
  const seg = (a, b, r) => { const d = b.clone().sub(a); const cy = new THREE.CylinderGeometry(r * 0.78, r, d.length(), 5, 1, true); cy.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize())); const m = a.clone().add(b).multiplyScalar(0.5); cy.translate(m.x, m.y, m.z); branch.push(cy); };
  const rec = (s, dir, len, r, d) => {
    const e = s.clone().addScaledVector(dir, len); seg(s, e, r);
    if (d === 0) { const t = new THREE.SphereGeometry(r * 1.5, 5, 3); t.translate(e.x, e.y, e.z); tips.push(t); return; }
    const n = 2 + (R() < 0.55 ? 1 : 0);
    for (let i = 0; i < n; i++) { const nd = dir.clone().add(V((R() - 0.5) * (tree ? 1.6 : 1.2), (R() - 0.3) * 0.4, (R() - 0.5) * (tree ? 1.6 : 1.2))).normalize(); if (nd.y < 0.3) { nd.y = 0.3; nd.normalize(); } rec(e, nd, len * 0.72, r * 0.74, d - 1); }
  };
  if (tree) rec(V(0, 0, 0), up.clone(), 0.42, 0.11, 4);
  else for (let k = 0; k < 3; k++) { const a = k * 2.1 + R(); rec(V(Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12), V(Math.cos(a) * 0.5, 1, Math.sin(a) * 0.5).normalize(), 0.18, 0.06, 2); }
  return mergeGeometries([...branch.map(b => cg(b, c[0])), ...tips.map(t => cg(t, c[1]))]);
}
// knobbly "cauliflower" coral
function gCauli(R, c) {
  const parts = [cg(xf(new THREE.SphereGeometry(0.32, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0, 0, 1, 0.9, 1), c[0])];
  for (let i = 0; i < 20; i++) { const a = R() * Math.PI * 2, b = R() * 1.35; const r = 0.07 + R() * 0.05; const p = V(Math.cos(a) * Math.sin(b), Math.cos(b) * 0.9, Math.sin(a) * Math.sin(b)).multiplyScalar(0.32); parts.push(cg(xf(new THREE.SphereGeometry(r, 6, 4), p.x, p.y, p.z), R() < 0.35 ? c[1] : c[0])); }
  return mergeGeometries(parts);
}
// honeycomb / zoanthid dome: bright dome dotted with polyp rings
function gHoney(R, c) {
  let g = new THREE.SphereGeometry(0.4, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, 0.75, 1); g.deleteAttribute('uv');
  const ng = g.toNonIndexed(); ng.computeVertexNormals();
  const c1 = new THREE.Color(c[0]), c2 = new THREE.Color(c[1]);
  paintGradient(ng, '#fff', '#fff', 'y', 0, 1, (cc, i, p) => { const a = Math.atan2(p.getZ(i), p.getX(i)), b = p.getY(i) / 0.3; const d = Math.sin(a * 14) * Math.sin(b * 16); cc.copy(d > 0.4 ? c2 : c1); });
  return ng;
}
// mushroom-shaped leather coral with a wavy rim
function gToadstool(R, c) {
  const prof = [V(0.12, 0.27, 0), V(0.48, 0.25, 0), V(0.5, 0.29, 0), V(0.4, 0.35, 0), V(0.22, 0.38, 0), V(0.001, 0.39, 0)].map(v => new THREE.Vector2(v.x, v.y));
  const cap = new THREE.LatheGeometry(prof, 28); const p = cap.attributes.position; const ph = R() * 6;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z); const a = Math.atan2(z, x); p.setY(i, p.getY(i) + Math.sin(a * 6 + ph) * 0.05 * (r / 0.5) ** 2); }
  cap.deleteAttribute('uv'); cap.computeVertexNormals();
  const ng = cap.toNonIndexed(); const c1 = new THREE.Color(c[0]), c2 = new THREE.Color(c[1]);
  paintGradient(ng, '#fff', '#fff', 'y', 0, 1, (cc, i, pos) => cc.copy(c1).lerp(c2, THREE.MathUtils.smoothstep(Math.hypot(pos.getX(i), pos.getZ(i)), 0.3, 0.5)));
  const stem = new THREE.CylinderGeometry(0.12, 0.16, 0.3, 12); stem.translate(0, 0.14, 0);
  return mergeGeometries([ng, cg(stem, c2)]);
}
// feathery soft coral (thin branches covered in tiny polyps)
function gSoftFan(R, c) {
  const branch = [], polyps = []; const up = V(0, 1, 0);
  const rec = (s, dir, len, r, d) => {
    const e = s.clone().addScaledVector(dir, len);
    const dd = e.clone().sub(s); const cy = new THREE.CylinderGeometry(r * 0.8, r, dd.length(), 5, 1, true); cy.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dd.normalize())); const m = s.clone().add(e).multiplyScalar(0.5); cy.translate(m.x, m.y, m.z); branch.push(cy);
    for (let k = 0; k < 2; k++) { const q = s.clone().lerp(e, R()).add(V((R() - 0.5) * 0.05, (R() - 0.5) * 0.05, (R() - 0.5) * 0.05)); const sp = new THREE.SphereGeometry(0.032 + R() * 0.015, 4, 3); sp.translate(q.x, q.y, q.z); polyps.push(sp); }
    if (d === 0) return;
    for (let i = 0; i < 2; i++) { const nd = dir.clone().add(V((R() - 0.5) * 1.2, R() * 0.2, (R() - 0.5) * 0.35)).normalize(); if (nd.y < 0.35) { nd.y = 0.35; nd.normalize(); } rec(e, nd, len * 0.78, r * 0.75, d - 1); }
  };
  rec(V(0, 0, 0), up.clone(), 0.32, 0.05, 3);
  return mergeGeometries([...branch.map(b => cg(b, c[0])), ...polyps.map(p => cg(p, c[1]))]);
}

// ---- fluffy anemone: instanced tentacles that sway in the shader ----
let _anemGeo = null, _anemMat = null, _anemHull = null;
function swayShader(mat, push) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uT = reefClock;
    sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      ${push ? 'transformed += normalize(normal) * ' + push.toFixed(3) + ';' : ''}
      float id = float(gl_InstanceID); float h = max(0.0, transformed.y);
      transformed.x += sin(uT * 0.7 + id * 0.7) * h * h * 0.32;
      transformed.z += cos(uT * 0.55 + id * 1.13) * h * h * 0.26;`);
  };
  mat.customProgramCacheKey = () => 'sway' + (push || 0);
  return mat;
}
function anemoneParts() {
  if (_anemGeo) return;
  const stem = new THREE.CapsuleGeometry(0.024, 0.62, 1, 5); stem.translate(0, 0.33, 0);
  const tip = new THREE.SphereGeometry(0.038, 6, 4); tip.translate(0, 0.66, 0);
  _anemGeo = mergeGeometries([cg(stem, new THREE.Color(0.86, 0.86, 0.86)), cg(tip, '#ffffff')]); _anemGeo.computeVertexNormals();
  _anemMat = swayShader(new THREE.MeshToonMaterial({ color: '#ffffff', vertexColors: true, gradientMap: toon('#fff').gradientMap }), 0);
  _anemHull = swayShader(new THREE.MeshBasicMaterial({ color: '#7A3A10', side: THREE.BackSide }), 0.008);
}
const ANEM = [['#FF8A2A', '#FFC070', '#C84A8A'], ['#FFA040', '#FFE0A0', '#9A4AC8'], ['#FF6FA8', '#FFC0DA', '#8A3AA8'], ['#FF7A3A', '#FFB070', '#B03A8A'], ['#FFB850', '#FFF0C0', '#C8507A']];
export function makeFluffyAnemone(seed = 1, scale = 1) {
  anemoneParts();
  const R = rng(seed * 31 + 7); const pal = ANEM[seed % ANEM.length];
  const g = new THREE.Group();
  const base = outline(new THREE.Mesh(xf(new THREE.SphereGeometry(0.42, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0, 0, 1, 0.5, 1), toon(pal[2])), 0.025, '#3A1A3A'); g.add(base);
  const N = 64;
  const body = new THREE.InstancedMesh(_anemGeo, _anemMat, N), hull = new THREE.InstancedMesh(_anemGeo, _anemHull, N);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const a = i * 2.399963, rr = Math.sqrt((i + 0.5) / N) * 0.4;
    const tilt = rr * 1.5 + R() * 0.25;
    q.setFromEuler(e.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt));
    const s = 0.65 + R() * 0.35 - rr * 0.3;
    m.compose(V(Math.cos(a) * rr, 0.15 - rr * 0.15, Math.sin(a) * rr), q, V(1, s, 1));
    body.setMatrixAt(i, m); hull.setMatrixAt(i, m);
    body.setColorAt(i, c.set(pal[0]).lerp(new THREE.Color(pal[1]), R() * 0.6));
  }
  body.instanceColor.needsUpdate = true;
  body.frustumCulled = hull.frustumCulled = false;
  g.add(body); g.scale.setScalar(scale);
  return g;
}

// soft corals sway with the water (hard corals stay still)
const _softMats = {};
function softMat(push, color) {
  const key = push ? 'h' + color : 'b';
  if (_softMats[key]) return _softMats[key];
  const m = push ? new THREE.MeshBasicMaterial({ color, side: THREE.BackSide }) : new THREE.MeshToonMaterial({ color: '#ffffff', vertexColors: true, gradientMap: toon('#fff').gradientMap });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = reefClock;
    sh.vertexShader = 'uniform float uT;\nattribute float aH;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      ${push ? 'transformed += normalize(normal) * ' + push.toFixed(3) + ';' : ''}
      vec4 wp0 = modelMatrix * vec4(transformed, 1.0);
      float ph = wp0.x * 0.9 + wp0.z * 0.7;
      transformed.x += sin(uT * 0.6 + ph) * aH * aH * 0.22;
      transformed.z += cos(uT * 0.5 + ph) * aH * aH * 0.16;`);
  };
  m.customProgramCacheKey = () => 'softsway' + key;
  return (_softMats[key] = m);
}

// ---- coral placement shared by mounds and walls ----
const CORAL_SET = [
  { w: 3, f: (R) => gBush(R, [RCOL.orange, RCOL.yellow, RCOL.magenta, RCOL.purple, RCOL.coral][Math.floor(R() * 5)], false), plate: false, s: [0.9, 1.4] },
  { w: 1.2, f: (R) => gBush(R, [RCOL.orange, RCOL.yellow][Math.floor(R() * 2)], true), plate: false, s: [0.8, 1.2] },
  { w: 2.2, f: (R) => gCauli(R, [RCOL.magenta, RCOL.purple, RCOL.yellow, RCOL.coral][Math.floor(R() * 4)]), plate: false, s: [0.7, 1.2] },
  { w: 2.2, f: (R) => gLettuce(R, [RCOL.orange, RCOL.green, RCOL.teal, RCOL.yellow, RCOL.peach][Math.floor(R() * 5)], 0.45 + R() * 0.35), plate: true, s: [0.9, 1.4] },
  { w: 1.3, f: (R) => gToadstool(R, [RCOL.peach, RCOL.yellow, RCOL.green, RCOL.teal][Math.floor(R() * 4)]), plate: false, s: [0.7, 1.1] },
  { w: 1.8, f: (R) => gSoftFan(R, [RCOL.magenta, RCOL.purple, RCOL.coral, RCOL.orange][Math.floor(R() * 4)]), soft: true, s: [1.0, 1.6] },
  { w: 1.2, f: (R) => gHoney(R, [[ '#FF4FA8', '#3DFFB0'], ['#2FD0A0', '#FFE04A'], ['#9A5CFF', '#FF8AD0']][Math.floor(R() * 3)]), plate: false, s: [0.8, 1.3] },
];
const CORAL_TOT = CORAL_SET.reduce((a, b) => a + b.w, 0);
function addCoral(R, x, y, z, solid, plates, sc = 1, soft = null) {
  let r = R() * CORAL_TOT; const c = CORAL_SET.find(k => (r -= k.w) < 0) || CORAL_SET[0];
  const key = 'cor' + CORAL_SET.indexOf(c) + '_' + Math.floor(R() * 4);
  const geo = cached(key, () => c.f(rng(key.length * 97 + key.charCodeAt(key.length - 1))));
  const s = (c.s[0] + R() * (c.s[1] - c.s[0])) * sc;
  const g = xf(geo, x, y, z, s, s, s, (R() - 0.5) * 0.25, R() * 6, (R() - 0.5) * 0.25);
  if (c.soft && soft) { const p = g.attributes.position, h = new Float32Array(p.count); for (let i = 0; i < p.count; i++) h[i] = Math.max(0, p.getY(i) - y); g.setAttribute('aH', new THREE.BufferAttribute(h, 1)); soft.push(g); return; }
  (c.plate ? plates : solid).push(g);
}
function coralMeshes(solid, plates, edge, soft = []) {
  const g = new THREE.Group();
  if (soft.length) { const geo = mergeGeometries(soft.map(q => { if (!q.attributes.normal) q.computeVertexNormals(); return q; })); g.add(new THREE.Mesh(geo, softMat(0)), new THREE.Mesh(geo, softMat(0.014, edge))); }
  if (solid.length) { const m = new THREE.Mesh(mergeGeometries(solid.map(q => { if (!q.attributes.normal) q.computeVertexNormals(); return q; })), toon('#ffffff', { vertexColors: true })); outline(m, 0.022, edge); g.add(m); }
  if (plates.length) g.add(new THREE.Mesh(mergeGeometries(plates), toon('#ffffff', { vertexColors: true, side: THREE.DoubleSide })));
  return g;
}

// ---- reef mound: rock with purple coralline crust, densely covered in coral ----
export function makeReefMound(seed = 1, big = 1) {
  const R = rng(seed * 13 + 1);
  const w = (1.2 + R() * 0.7) * big, h = (0.5 + R() * 0.4) * big, d = (1.0 + R() * 0.6) * big;
  const rockC = new THREE.Color('#5E4E80'), crust = [new THREE.Color('#C83AD8'), new THREE.Color('#FF3A9A'), new THREE.Color('#2FC8A8')][Math.floor(R() * 3)];
  let rock = xf(lumpGeo(seed, 2), 0, h * 0.35, 0, w, h * 0.7, d);
  const ph = R() * 6;
  paintGradient(rock, '#fff', '#fff', 'y', 0, 1, (c, i, p) => { const n = Math.sin(p.getX(i) * 3.1 + ph) * Math.sin(p.getZ(i) * 2.7 + p.getY(i) * 2 + ph); c.copy(n > 0.15 ? crust : rockC); c.multiplyScalar(0.62 + 0.38 * THREE.MathUtils.smoothstep(p.getY(i), 0, h * 0.6)); });
  const solid = [rock], plates = [], soft = [];
  const n = Math.round((7 + R() * 3) * big);
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, f = Math.sqrt(R()) * 0.72;
    const px = Math.cos(a) * w * f, pz = Math.sin(a) * d * f, py = h * 0.35 + h * 0.66 * Math.sqrt(Math.max(0, 1 - f * f)) - 0.02;
    addCoral(R, px, py, pz, solid, plates, 1.35 + big * 0.2, soft);
  }
  // tall tree coral breaking the skyline (photo 4)
  if (R() < 0.45) { const tree = cached('treeHero' + (seed % 3), () => gBush(rng(seed % 3 + 50), [RCOL.orange, RCOL.yellow, RCOL.coral][seed % 3], true)); const s = (2.2 + R() * 0.8) * big; solid.push(xf(tree, (R() - 0.5) * w * 0.6, h * 0.9, (R() - 0.5) * d * 0.5, s, s, s, 0, R() * 6, 0)); }
  const g = coralMeshes(solid, plates, '#3A2440', soft);
  // one or two big fluffy anemones nestled in
  const na = R() < 0.55 ? 1 : R() < 0.3 ? 2 : 0;
  for (let i = 0; i < na; i++) { const a = R() * 6.28, f = R() * 0.5; const an = makeFluffyAnemone(Math.floor(R() * 99), (1.2 + R() * 0.6) * big); an.position.set(Math.cos(a) * w * f, h * 0.35 + h * 0.62 * Math.sqrt(1 - f * f) - 0.06, Math.sin(a) * d * f); g.add(an); }
  return g;
}
export { addCoral, coralMeshes };

// ---- U-valley bank: sand floor that curves up into a reef slope (one side; mirror for the other) ----
export function makeBank(seed = 1, len = 6, height = 4.2, width = 7.5) {
  const R = rng(seed * 17 + 3);
  const nx = 18, nz = 6;
  const g = new THREE.PlaneGeometry(width, len, nx, nz); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position; const ph = R() * 6;
  const prof = (u) => height * Math.pow(u, 2.2);               // U-shaped cross-section
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + width / 2, z = p.getZ(i), u = x / width;
    const edge = Math.sin(Math.PI * (z / len + 0.5));            // 0 at the segment ends → seamless
    const bump = (Math.sin(x * 1.7 + ph) * 0.25 + Math.sin(z * 2.1 + x + ph) * 0.18) * u * edge;
    p.setXYZ(i, x, prof(u) + bump, z);
  }
  g.deleteAttribute('uv'); g.computeVertexNormals();
  const ng = g.toNonIndexed();
  const sand = new THREE.Color('#E8CF98'), rock = new THREE.Color('#5E4E80'), crust = new THREE.Color(['#B05CC8', '#E06AA8', '#5FB8A0'][Math.floor(R() * 3)]);
  paintGradient(ng, '#fff', '#fff', 'y', 0, 1, (c, i, q) => { const y = q.getY(i); const k = THREE.MathUtils.smoothstep(y, 0.25, 1.4); c.copy(sand).lerp(rock, k); if (k > 0.6 && Math.sin(q.getX(i) * 3 + ph) * Math.sin(q.getZ(i) * 2.5) > 0.3) c.copy(crust); });
  const ground = new THREE.Mesh(ng, toon('#ffffff', { vertexColors: true }));
  ground.receiveShadow = true;
  // corals scattered over the slope
  const solid = [], plates = [], soft = [];
  const n = 12 + Math.floor(R() * 5);
  for (let i = 0; i < n; i++) { const u = 0.15 + R() * 0.8, x = u * width, z = (R() - 0.5) * len * 0.8; addCoral(R, x, prof(u) - 0.05, z, solid, plates, 1.3, soft); }
  const g2 = new THREE.Group(); g2.add(ground, coralMeshes(solid, plates, '#3A2440', soft));
  return g2;
}
