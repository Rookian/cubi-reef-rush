// Batch 3 review models: turtles, octopus, banded coral shrimp, feather star, blood star, long-spined sea urchin.
// Same look as the fish: toon shading, dark outline, painted textures, big Cubi-style eyes.
import * as THREE from 'three';
import { toonGradient, outline } from './materials.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeEye, placeEye } from './models.js';

const OUT = '#3B2614';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const mat = (o = {}) => new THREE.MeshToonMaterial({ color: o.color || '#ffffff', map: o.map || null, gradientMap: toonGradient(), side: o.side || THREE.FrontSide, emissive: new THREE.Color(o.emissive || '#000'), emissiveMap: o.emissiveMap || null });
function tex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
let seed = 1; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const lined = (m, t = 0.018) => outline(m, t, OUT);
function eye(r, pos, dir, brow) { const e = placeEye(makeEye(r, OUT), pos, dir.normalize()); if (brow) { const b = new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.15, r * 1.3, 4, 8), new THREE.MeshBasicMaterial({ color: OUT })); b.position.set(0, r * 1.05, r * 0.5); b.rotation.z = Math.PI / 2 + brow; e.add(b); } return e; }
function blink(u, dt) { u.blink = (u.blink ?? 2) - dt; const k = u.blink < 0.12 ? Math.max(0.1, Math.abs(u.blink - 0.06) / 0.06) : 1; if (u.blink < 0) u.blink = 2.5 + Math.random() * 3; (u.eyes || []).forEach(e => { e.scale.y = k; }); }
function planarUV(g, ax = 'x', ay = 'z', flip = false) { g.computeBoundingBox(); const b = g.boundingBox, p = g.attributes.position, uv = []; for (let i = 0; i < p.count; i++) { const u = (p['get' + ax.toUpperCase()](i) - b.min[ax]) / (b.max[ax] - b.min[ax]), v = (p['get' + ay.toUpperCase()](i) - b.min[ay]) / (b.max[ay] - b.min[ay]); uv.push(u, flip ? 1 - v : v); } g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return g; }
function mirrored(g) { const m = (g.index ? g.toNonIndexed() : g.clone()); m.scale(-1, 1, 1);
  for (const name of Object.keys(m.attributes)) { const at = m.attributes[name], n = at.itemSize, arr = at.array; for (let t = 0; t < at.count; t += 3) for (let c = 0; c < n; c++) { const i1 = (t + 1) * n + c, i2 = (t + 2) * n + c, tmp = arr[i1]; arr[i1] = arr[i2]; arr[i2] = tmp; } }
  m.computeVertexNormals(); return m; }

// tapered tube that can be re-shaped every frame (arms, antennae, spines of a feather star)
function taperTube(n, radial = 10) {
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * (radial + 1) * 3), uv = [], idx = [];
  for (let i = 0; i < n; i++) for (let j = 0; j <= radial; j++) uv.push(i / (n - 1), j / radial);
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
  const T = new THREE.Vector3(), N = new THREE.Vector3(), Bn = new THREE.Vector3(), tmp = new THREE.Vector3();
  geo.userData.update = (pts, radii) => {
    N.set(0, 1, 0);
    for (let i = 0; i < n; i++) {
      T.subVectors(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
      N.sub(tmp.copy(T).multiplyScalar(N.dot(T))); if (N.lengthSq() < 1e-6) N.set(1, 0, 0).sub(tmp.copy(T).multiplyScalar(T.x)); N.normalize();
      Bn.crossVectors(T, N);
      for (let j = 0; j <= radial; j++) { const a = j / radial * Math.PI * 2, c = Math.cos(a) * radii[i], s = Math.sin(a) * radii[i], k = (i * (radial + 1) + j) * 3;
        pos[k] = pts[i].x + N.x * c + Bn.x * s; pos[k + 1] = pts[i].y + N.y * c + Bn.y * s; pos[k + 2] = pts[i].z + N.z * c + Bn.z * s; }
    }
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
  };
  return geo;
}

// =====================================================================================
// SEA TURTLES — green and hawksbill: painted scute shell, scaly head and flippers
// =====================================================================================
const TURTLE = {
  green: { shell: ['#6E7A3A', '#A8A050', '#E8D890', '#3E4620'], skin: '#7E8C4A', plate: '#C8C890', plastron: '#F2E8C0', beak: 0.0 },
  hawksbill: { shell: ['#6A3A1A', '#C07A2A', '#F2C060', '#2A140A'], skin: '#7A5430', plate: '#E8C080', plastron: '#F4E2B0', beak: 1.0 },
};
function shellTexture(c) {
  return tex(512, 512, (g, W, H) => {
    const P = (x, z) => [(x / 2 + 0.5) * W, (0.5 - z / 2) * H];
    g.fillStyle = c.shell[3]; g.fillRect(0, 0, W, H);
    const plate = (pts, light) => {
      g.beginPath(); pts.forEach(([x, z], i) => { const [a, b] = P(x, z); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath();
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cz = pts.reduce((s, p) => s + p[1], 0) / pts.length, [gx, gy] = P(cx, cz);
      const gr = g.createRadialGradient(gx, gy, 4, gx, gy, W * 0.2); gr.addColorStop(0, light ? c.shell[2] : c.shell[1]); gr.addColorStop(0.55, c.shell[1]); gr.addColorStop(1, c.shell[0]);
      g.fillStyle = gr; g.fill();
      g.save(); g.clip(); g.strokeStyle = c.shell[2]; g.globalAlpha = 0.45; g.lineWidth = 3;      // radiating streaks
      for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2 + rnd(); g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + Math.cos(a) * W * 0.25, gy + Math.sin(a) * W * 0.25); g.stroke(); }
      g.restore(); g.strokeStyle = c.shell[3]; g.lineWidth = 7; g.lineJoin = 'round'; g.stroke();
    };
    // marginal ring
    for (let k = 0; k < 26; k++) { const a0 = k / 26 * Math.PI * 2, a1 = (k + 1) / 26 * Math.PI * 2; plate([[Math.cos(a0) * 0.84, Math.sin(a0) * 0.84], [Math.cos(a0) * 1.02, Math.sin(a0) * 1.02], [Math.cos(a1) * 1.02, Math.sin(a1) * 1.02], [Math.cos(a1) * 0.84, Math.sin(a1) * 0.84]]); }
    const zs = [-0.68, -0.32, 0.02, 0.36, 0.7], ox = (z) => Math.sqrt(Math.max(0.02, 0.84 * 0.84 - z * z));
    for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) plate([[sx * 0.2, zs[i]], [sx * ox(zs[i]), zs[i]], [sx * ox(zs[i + 1]), zs[i + 1]], [sx * 0.2, zs[i + 1]]]);
    const zv = [-0.86, -0.5, -0.16, 0.18, 0.52, 0.86];
    for (let i = 0; i < 5; i++) { const m = (zv[i] + zv[i + 1]) / 2; plate([[-0.14, zv[i]], [0.14, zv[i]], [0.25, m], [0.14, zv[i + 1]], [-0.14, zv[i + 1]], [-0.25, m]], true); }
  });
}
function scaleTexture(base, plate, edge) {
  return tex(256, 256, (g, W, H) => { g.fillStyle = base; g.fillRect(0, 0, W, H);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const cx = (x + (y % 2) * 0.5) * W / 8, cy = (y + 0.5) * H / 8, r = W / 18 * (0.8 + rnd() * 0.5);
      g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.3; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9); } g.closePath(); g.fillStyle = plate; g.fill(); g.strokeStyle = edge; g.lineWidth = 2.5; g.stroke(); } });
}
function flipperGeo(len, wid) {
  const s = new THREE.Shape(); s.moveTo(0, -wid * 0.5); s.bezierCurveTo(len * 0.35, -wid * 0.9, len * 0.8, -wid * 0.45, len, -wid * 0.05); s.bezierCurveTo(len * 0.8, wid * 0.25, len * 0.35, wid * 0.55, 0, wid * 0.5); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.03, bevelSegments: 3, curveSegments: 20 });
  g.translate(0, 0, -0.015); g.rotateX(Math.PI / 2); planarUV(g, 'x', 'z'); g.computeVertexNormals(); return g;
}
export function makeSeaTurtle(kind = 'green') {
  seed = kind === 'green' ? 11 : 23; const c = TURTLE[kind];
  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig);
  const top = new THREE.SphereGeometry(1, 56, 24, 0, Math.PI * 2, 0, Math.PI / 2); top.scale(0.78, 0.36, 1.0);
  const p = top.attributes.position, uv = []; for (let i = 0; i < p.count; i++) uv.push(p.getX(i) / 1.56 + 0.5, p.getZ(i) / 2 + 0.5); top.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (kind === 'hawksbill') for (let i = 0; i < p.count; i++) { const z = p.getZ(i), y = p.getY(i); if (z > 0.55 && y < 0.06) { const a = Math.atan2(p.getX(i), z); p.setZ(i, z + Math.max(0, Math.sin(a * 18)) * 0.05); } }
  top.computeVertexNormals();
  rig.add(lined(new THREE.Mesh(top, mat({ map: shellTexture(c) })), 0.022));
  const bot = new THREE.SphereGeometry(1, 40, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); bot.scale(0.74, 0.13, 0.95);
  rig.add(lined(new THREE.Mesh(bot, mat({ color: c.plastron })), 0.018));
  const skinTex = scaleTexture(c.skin, c.plate, c.shell[3]); skinTex.repeat.set(2, 2);
  const skin = mat({ map: skinTex });
  // neck + head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.3, 16), mat({ color: c.skin })); neck.rotation.x = Math.PI / 2 - 0.15; neck.position.set(0, 0.0, -0.98); rig.add(neck);
  const head = new THREE.Group(); head.position.set(0, 0.04, -1.18); rig.add(head);
  const hg = new THREE.SphereGeometry(0.24, 32, 22); hg.scale(0.88, 0.8, 1.2);
  if (c.beak) { const hp = hg.attributes.position; for (let i = 0; i < hp.count; i++) { const z = hp.getZ(i); if (z < -0.1) { const k = (-z - 0.1) / 0.19; hp.setX(i, hp.getX(i) * (1 - k * 0.45)); hp.setY(i, hp.getY(i) - k * k * 0.05); hp.setZ(i, z - k * k * 0.05); } } hg.computeVertexNormals(); }
  head.add(lined(new THREE.Mesh(hg, skin), 0.016));
  const beakM = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 10), mat({ color: c.beak ? '#5A3A1A' : '#4A5226' })); beakM.scale.set(0.9, 0.55, 0.7); beakM.position.set(0, -0.06, -0.24 - c.beak * 0.04); head.add(beakM);
  const eyes = [];
  for (const sx of [-1, 1]) { const e = eye(0.085, V(sx * 0.16, 0.06, -0.12), V(sx, 0.25, -0.65)); head.add(e); eyes.push(e);
    const bl = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: '#FF8FA3', transparent: true, opacity: 0.75 })); bl.scale.set(0.4, 0.6, 1); bl.position.set(sx * 0.19, -0.04, -0.17); head.add(bl); }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.011, 6, 16, Math.PI), new THREE.MeshBasicMaterial({ color: OUT })); smile.position.set(0, -0.1, -0.27 - c.beak * 0.03); smile.rotation.set(0.3, 0, Math.PI); head.add(smile);
  // flippers
  const fT = scaleTexture(c.skin, c.plate, c.shell[3]); fT.repeat.set(3, 1.5);
  const fm = mat({ map: fT }), front = flipperGeo(0.95, 0.32), rear = flipperGeo(0.42, 0.26), flips = [];
  for (const sx of [-1, 1]) {
    const fp = new THREE.Group(); fp.position.set(sx * 0.6, -0.04, -0.52); rig.add(fp);
    const fmesh = lined(new THREE.Mesh(sx > 0 ? front : mirrored(front), fm), 0.016); fmesh.rotation.y = sx * 0.55; fp.add(fmesh);
    const rp = new THREE.Group(); rp.position.set(sx * 0.42, -0.05, 0.72); rig.add(rp);
    const rmesh = lined(new THREE.Mesh(sx > 0 ? rear : mirrored(rear), fm), 0.014); rmesh.rotation.y = -sx * 0.7; rp.add(rmesh);
    flips.push({ fp, rp, sx });
  }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 10), mat({ color: c.skin })); tail.rotation.x = Math.PI / 2; tail.position.set(0, -0.03, 1.02); rig.add(tail);
  root.userData = { rig, head, flips, eyes, t: Math.random() * 6 };
  return root;
}
export function animateSeaTurtle(o, dt) {
  // Unhurried 'underwater flight': the big front flippers sweep down and back, then feather and lift on the recovery;
  // the hind feet paddle gently and steer like rudders. u.stroke (0 resting .. 1 swimming) sets tempo and reach,
  // so a gliding turtle still sculls its flippers softly instead of freezing.
  const u = o.userData; u.t += dt; const t = u.t;
  const st = u.stroke ?? 0.7; u.sv = (u.sv ?? st) + (st - (u.sv ?? st)) * Math.min(1, dt * 1.5); const k = u.sv;
  u.ph = (u.ph || 0) + dt * (0.9 + 1.3 * k);                         // stroke phase: ~0.15 Hz resting .. ~0.35 Hz swimming
  const ph = u.ph, a = 0.12 + 0.6 * k, down = Math.sin(ph), back = Math.cos(ph);
  const ease = (x) => Math.sign(x) * Math.pow(Math.abs(x), 0.8);     // a little hang at the top and bottom of each stroke
  u.flips.forEach(({ fp, rp, sx }) => {
    fp.rotation.z = sx * ease(down) * a * 0.85;                       // flap up / down
    fp.rotation.y = sx * (back * a * 0.55 + 0.08);                    // sweep back on the downstroke, forward on recovery
    fp.rotation.x = -Math.sin(ph + 1.2) * a * 0.45;                   // feathering twist
    rp.rotation.y = sx * (Math.sin(ph * 0.5 + sx) * (0.12 + 0.22 * k) - 0.05);   // hind feet: slow alternate paddling
    rp.rotation.z = sx * Math.sin(ph * 0.5 + 0.8 + sx) * (0.08 + 0.1 * k);
    rp.rotation.x = Math.sin(ph * 0.5 + 1.6 + sx) * 0.1;
  });
  u.rig.position.y = Math.sin(ph - 0.6) * 0.035 * (0.3 + k); u.rig.rotation.x = Math.sin(ph - 0.9) * 0.03 * (0.3 + k);
  u.head.rotation.y = Math.sin(t * 0.45) * 0.22; u.head.rotation.x = Math.sin(t * 0.6) * 0.08 + (u.headUp || 0);
  blink(u, dt);
}

// =====================================================================================
// OCTOPUS — day octopus: spotted mantle, eight curling arms with suckers, big curious eyes
// =====================================================================================
export function makeOctopus() {
  seed = 41;
  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig);
  const skinTex = tex(512, 256, (g, W, H) => { g.fillStyle = '#5E4E72'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) { g.beginPath(); g.arc(rnd() * W, rnd() * H, 4 + rnd() * 9, 0, 7); g.fillStyle = rnd() < 0.7 ? '#9C86BC' : '#2E2A36'; g.globalAlpha = 0.85; g.fill(); } g.globalAlpha = 1; });
  const mg = new THREE.SphereGeometry(0.42, 44, 30); mg.scale(1.0, 1.28, 1.08);
  const mp = mg.attributes.position; for (let i = 0; i < mp.count; i++) { const y = mp.getY(i); if (y < -0.1) { const k = (-y - 0.1) / 0.44; mp.setX(i, mp.getX(i) * (1 + k * 0.15)); mp.setZ(i, mp.getZ(i) * (1 + k * 0.15)); } } mg.computeVertexNormals();
  const mantle = new THREE.Group(); mantle.position.set(0, 0.72, 0.18); mantle.rotation.x = 0.4; rig.add(mantle);
  mantle.add(lined(new THREE.Mesh(mg, mat({ map: skinTex })), 0.02));
  for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.03 + rnd() * 0.025, 10, 8), mat({ color: '#7A6A92' })); const a = rnd() * Math.PI * 2, h = rnd() * 0.4; b.position.set(Math.cos(a) * 0.36, h, Math.sin(a) * 0.38); mantle.add(b); }
  const eyes = [], head = new THREE.Group(); head.position.set(0, 0.38, -0.12); rig.add(head);
  const hd = new THREE.SphereGeometry(0.3, 32, 22); hd.scale(1.15, 0.85, 0.95); head.add(lined(new THREE.Mesh(hd, mat({ map: skinTex })), 0.018));
  for (const sx of [-1, 1]) { const e = eye(0.12, V(sx * 0.22, 0.08, -0.17), V(sx * 0.7, 0.25, -0.8)); head.add(e); eyes.push(e);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), mat({ color: '#7A6A92' })); lid.scale.set(1.2, 0.7, 1); lid.position.set(sx * 0.25, 0.22, -0.12); head.add(lid);
    const bl = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshBasicMaterial({ color: '#FF8FA3', transparent: true, opacity: 0.7 })); bl.scale.set(0.5, 0.6, 1); bl.position.set(sx * 0.27, -0.06, -0.2); head.add(bl); }
  const siph = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.12, 10), mat({ color: '#4A3E5C' })); siph.position.set(0.24, 0.24, 0.02); siph.rotation.z = -1.1; rig.add(siph);
  // arms
  const armTex = skinTex.clone(); armTex.repeat.set(3, 1); armTex.needsUpdate = true;
  const am = mat({ map: armTex }), hull = new THREE.MeshBasicMaterial({ color: OUT, side: THREE.BackSide }), arms = [];
  const sucker = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), mat({ color: '#E6DCF0' }), 8 * 14); sucker.frustumCulled = false; rig.add(sucker);
  const NS = 26;
  for (let i = 0; i < 8; i++) {
    const g = taperTube(NS, 10), hg = taperTube(NS, 10), m = new THREE.Mesh(g, am), h = new THREE.Mesh(hg, hull);
    m.frustumCulled = h.frustumCulled = false; rig.add(m, h);
    arms.push({ g, hg, phi: (i + 0.5) / 8 * Math.PI * 2, ph: rnd() * 6, len: 1.0 + rnd() * 0.25, pts: [...Array(NS)].map(() => new THREE.Vector3()) });
  }
  root.userData = { rig, head, mantle, arms, sucker, eyes, t: rnd() * 6, NS };
  animateOctopus(root, 0);
  return root;
}
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
export function animateOctopus(o, dt) {
  const u = o.userData; u.t += dt; const t = u.t, NS = u.NS;
  let si = 0;
  u.arms.forEach((a, i) => {
    const curl = 2.2 + Math.sin(t * 0.9 + a.ph) * 1.4, sway = Math.sin(t * 0.7 + a.ph) * 0.25, step = a.len / (NS - 1);
    let r = 0.2, y = 0.22, th = -0.95, rad = [];
    for (let k = 0; k < NS; k++) {
      const s = k / (NS - 1), phi = a.phi + sway * s;
      a.pts[k].set(Math.cos(phi) * r, y, Math.sin(phi) * r);
      rad.push(0.075 * Math.pow(1 - s, 0.85) + 0.009);
      th += step * (0.35 + s * s * curl * 2.2); r += Math.cos(th) * step; y += Math.sin(th) * step; if (y < 0.02) y = 0.02 + (y - 0.02) * 0.2;
      if (k % 2 === 0 && k > 1 && k < NS - 2 && si < u.sucker.count) { const rr = rad[k] * 0.45; _m4.compose(_s.set(a.pts[k].x, a.pts[k].y - rad[k] * 0.75, a.pts[k].z), _q.identity(), _s.clone().setScalar(rr).setY(rr * 0.6)); _m4.setPosition(a.pts[k].x, a.pts[k].y - rad[k] * 0.78, a.pts[k].z); u.sucker.setMatrixAt(si++, _m4); }
    }
    a.g.userData.update(a.pts, rad); a.hg.userData.update(a.pts, rad.map(x => x + 0.012));
  });
  u.sucker.count = si; u.sucker.instanceMatrix.needsUpdate = true;
  const br = 1 + Math.sin(t * 1.4) * 0.04; u.mantle.scale.set(br, 1 / br, br);
  u.rig.position.y = Math.sin(t * 0.9) * 0.03; u.head.rotation.y = Math.sin(t * 0.4) * 0.2;
  blink(u, dt);
}

// =====================================================================================
// BANDED CORAL SHRIMP — white with red bands, huge banded claws, very long white antennae
// =====================================================================================
const bandTex = (a, b, n) => tex(256, 32, (g, W, H) => { for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * W / n, 0, W / n + 1, H); } });
export function makeCoralShrimp() {
  seed = 57;
  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig);
  const RED = '#D8262E', WHITE = '#FFF8F2';
  const segs = [];
  const carap = new THREE.SphereGeometry(0.17, 28, 18); carap.scale(0.85, 0.8, 1.9);
  const cm = lined(new THREE.Mesh(carap, mat({ map: bandTex(WHITE, RED, 3) })), 0.012); cm.material.map.rotation = 0; cm.position.set(0, 0.32, -0.12); rig.add(cm);
  planarUV(carap, 'z', 'y');
  const spikes = []; for (let k = 0; k < 7; k++) { const sp = new THREE.ConeGeometry(0.012, 0.06, 6); sp.rotateX(-0.4); sp.translate(0, 0.45, -0.38 + k * 0.08); spikes.push(sp); } rig.add(new THREE.Mesh(mergeGeometries(spikes), mat({ color: WHITE })));
  // arched abdomen: 6 segments, red / white
  for (let k = 0; k < 6; k++) {
    const a = 0.25 + k * 0.22, r = 0.13 * (1 - k * 0.09);
    const g = new THREE.SphereGeometry(r, 20, 14); g.scale(1, 0.9, 1.25);
    const m = lined(new THREE.Mesh(g, mat({ color: k % 2 ? WHITE : RED })), 0.011);
    m.position.set(0, 0.32 - (1 - Math.cos(a)) * 0.42 + 0.02, 0.18 + Math.sin(a) * 0.42); m.rotation.x = a * 0.9; rig.add(m); segs.push(m);
  }
  const fan = new THREE.Group(); const last = segs[segs.length - 1]; fan.position.copy(last.position).add(V(0, -0.06, 0.02)); fan.rotation.x = 1.9; rig.add(fan);
  const fanM = mat({ map: bandTex(WHITE, RED, 3), side: THREE.DoubleSide });
  for (const a of [-0.6, -0.2, 0.2, 0.6]) { const f = new THREE.Mesh(new THREE.CircleGeometry(0.08, 14), fanM); f.scale.set(0.5, 1, 1); f.position.set(Math.sin(a) * 0.07, -Math.cos(a) * 0.07 - 0.03, 0); f.rotation.z = a; fan.add(f); }
  const eyes = [];
  for (const sx of [-1, 1]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.08, 8), mat({ color: WHITE })); st.position.set(sx * 0.07, 0.42, -0.42); st.rotation.set(-0.5, 0, -sx * 0.5); rig.add(st);
    const e = eye(0.055, V(sx * 0.1, 0.46, -0.45), V(sx * 0.6, 0.3, -0.8)); rig.add(e); eyes.push(e); }
  // walking legs
  const legs = [], lo = new THREE.Object3D();
  for (let k = 0; k < 4; k++) for (const sx of [-1, 1]) { lo.position.set(sx * 0.14, 0.14, -0.2 + k * 0.1); lo.rotation.set(0.1, 0, sx * 0.6); lo.updateMatrix(); legs.push(new THREE.CapsuleGeometry(0.011, 0.26, 3, 6).applyMatrix4(lo.matrix)); }
  rig.add(new THREE.Mesh(mergeGeometries(legs), mat({ color: WHITE })));
  // big banded claws
  const clawTex = bandTex(WHITE, RED, 7), claws = [];
  for (const sx of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(sx * 0.1, 0.26, -0.32); rig.add(arm);
    const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.42, 10), mat({ map: clawTex })); seg1.rotation.x = Math.PI / 2; seg1.position.z = -0.2; arm.add(seg1);
    const fore = new THREE.Group(); fore.position.set(0, 0, -0.4); arm.add(fore);
    const seg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.022, 0.4, 10), mat({ map: clawTex })); seg2.rotation.x = Math.PI / 2; seg2.position.z = -0.2; fore.add(seg2);
    const palm = lined(new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), mat({ map: clawTex })), 0.01); palm.scale.set(0.8, 0.7, 1.8); palm.position.z = -0.46; fore.add(palm);
    const fixed = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.16, 4, 8), mat({ color: WHITE })); fixed.rotation.x = Math.PI / 2; fixed.position.set(0, -0.02, -0.62); fore.add(fixed);
    const moving = new THREE.Group(); moving.position.set(0, 0.03, -0.54); fore.add(moving);
    const mf = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.16, 4, 8), mat({ color: RED })); mf.rotation.x = Math.PI / 2; mf.position.z = -0.08; moving.add(mf);
    arm.rotation.set(-0.15, -sx * 0.45, 0); fore.rotation.y = sx * 0.55;
    claws.push({ arm, fore, moving, sx });
  }
  // antennae
  const ant = [], am = mat({ color: WHITE });
  for (const [sx, len, up] of [[-1, 2.0, 0.55], [1, 2.0, 0.55], [-1, 1.2, 0.3], [1, 1.2, 0.3]]) { const g = taperTube(24, 5), m = new THREE.Mesh(g, am); m.frustumCulled = false; rig.add(m); ant.push({ g, sx, len, up, ph: rnd() * 6, pts: [...Array(24)].map(() => new THREE.Vector3()) }); }
  root.userData = { rig, claws, ant, fan, eyes, t: rnd() * 6 };
  animateCoralShrimp(root, 0);
  return root;
}
export function animateCoralShrimp(o, dt) {
  const u = o.userData; u.t += dt; const t = u.t;
  u.ant.forEach(a => { for (let k = 0; k < 24; k++) { const s = k / 23, w = Math.sin(t * 1.8 + a.ph + s * 3) * 0.12 * s;
    a.pts[k].set(a.sx * (0.05 + s * a.len * 0.32) + w, 0.44 + Math.sin(s * Math.PI * 0.7) * a.up - s * s * 0.25, -0.5 - s * a.len * 0.55 + s * s * a.len * 0.75); }
    a.g.userData.update(a.pts, a.pts.map((_, k) => 0.009 * (1 - k / 24) + 0.003)); });
  u.claws.forEach(c => { c.moving.rotation.x = -0.05 - Math.max(0, Math.sin(t * 1.3 + c.sx)) * 0.4; c.arm.rotation.x = -0.15 + Math.sin(t * 0.8 + c.sx) * 0.08; });
  u.fan.rotation.x = 1.9 + Math.sin(t * 2.2) * 0.12; u.rig.position.y = Math.sin(t * 1.1) * 0.015;
  blink(u, dt);
}

// =====================================================================================
// FEATHER STAR — yellow crinoid: many feathery arms that wave and curl
// =====================================================================================
export function makeFeatherStar(pal = 0) {
  seed = 71 + pal;
  const P = [['#FFD21F', '#16161C'], ['#FF7A2A', '#FFF0D0'], ['#F4F4F4', '#16161C']][pal % 3];
  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig);
  const cal = lined(new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 14), mat({ color: P[1] })), 0.012); cal.scale.y = 0.7; cal.position.y = 0.32; rig.add(cal);
  const cm = mat({ color: '#4A3A2A' });
  for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2, c = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 12, Math.PI * 0.8), cm); c.position.set(Math.cos(a) * 0.07, 0.2, Math.sin(a) * 0.07); c.rotation.set(Math.PI / 2, 0, a); rig.add(c); }
  const armTex = tex(256, 32, (g, W, H) => { g.fillStyle = P[0]; g.fillRect(0, 0, W, H); g.fillStyle = P[1]; g.fillRect(0, 0, W, H * 0.25); g.fillRect(0, H * 0.75, W, H * 0.25); });
  const am = mat({ map: armTex }), arms = [], NA = 16, NS = 22;
  const pin = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.006, 0.075, 2, 4), mat({ color: P[0] }), NA * NS * 2); pin.frustumCulled = false;
  const pinTip = new THREE.InstancedMesh(new THREE.SphereGeometry(0.009, 5, 4), mat({ color: P[1] }), NA * NS * 2); pinTip.frustumCulled = false;
  rig.add(pin, pinTip);
  for (let i = 0; i < NA; i++) { const g = taperTube(NS, 6), m = new THREE.Mesh(g, am); m.frustumCulled = false; rig.add(m); arms.push({ g, phi: i / NA * Math.PI * 2 + (i % 2) * 0.1, up: 0.5 + (i % 3) * 0.25, len: 0.8 + rnd() * 0.3, ph: rnd() * 6, pts: [...Array(NS)].map(() => new THREE.Vector3()) }); }
  root.userData = { rig, arms, pin, pinTip, t: rnd() * 6, NS };
  animateFeatherStar(root, 0);
  return root;
}
const _t = new THREE.Vector3(), _side = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _pd = new THREE.Vector3(), _qq = new THREE.Quaternion();
export function animateFeatherStar(o, dt) {
  const u = o.userData; u.t += dt; const t = u.t, NS = u.NS; let pi = 0;
  u.arms.forEach(a => {
    const wave = Math.sin(t * 0.9 + a.ph) * 0.35, step = a.len / (NS - 1); let r = 0.08, y = 0.34, th = a.up + wave * 0.3;
    for (let k = 0; k < NS; k++) { const s = k / (NS - 1); a.pts[k].set(Math.cos(a.phi) * r, y, Math.sin(a.phi) * r); th -= step * (0.3 + s * s * (3.2 + wave * 2)); r += Math.cos(th) * step; y += Math.sin(th) * step; }
    a.g.userData.update(a.pts, a.pts.map((_, k) => 0.022 * (1 - k / NS) + 0.006));
    for (let k = 1; k < NS - 1; k++) { _t.subVectors(a.pts[k + 1], a.pts[k - 1]).normalize(); _side.crossVectors(_t, _up).normalize(); const len = 1 - k / NS * 0.6;
      for (const sd of [-1, 1]) { _pd.copy(_side).multiplyScalar(sd).addScaledVector(_t, 0.5).normalize(); _qq.setFromUnitVectors(_up, _pd);
        _m4.compose(_s.copy(a.pts[k]).addScaledVector(_pd, 0.04 * len), _qq, new THREE.Vector3(1, len, 1)); u.pin.setMatrixAt(pi, _m4);
        _m4.makeTranslation(a.pts[k].x + _pd.x * 0.085 * len, a.pts[k].y + _pd.y * 0.085 * len, a.pts[k].z + _pd.z * 0.085 * len); u.pinTip.setMatrixAt(pi, _m4); pi++; } }
  });
  u.pin.count = u.pinTip.count = pi; u.pin.instanceMatrix.needsUpdate = u.pinTip.instanceMatrix.needsUpdate = true;
}

// =====================================================================================
// BLOOD STAR — slender deep-red sea star with a tiny smiley face
// =====================================================================================
export function makeBloodStar() {
  seed = 83;
  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig);
  const sk = tex(256, 64, (g, W, H) => { g.fillStyle = '#C8162A'; g.fillRect(0, 0, W, H); for (let i = 0; i < 260; i++) { g.beginPath(); g.arc(rnd() * W, rnd() * H, 1 + rnd() * 2.2, 0, 7); g.fillStyle = rnd() < 0.6 ? '#8A0E1C' : '#FF5A6A'; g.fill(); } });
  const m = mat({ map: sk }), arms = [];
  const disc = lined(new THREE.Mesh(new THREE.SphereGeometry(0.2, 28, 16), m), 0.014); disc.scale.y = 0.42; disc.position.y = 0.08; rig.add(disc);
  for (let i = 0; i < 5; i++) { const g = taperTube(20, 12), mesh = lined(new THREE.Mesh(g, m), 0.012); mesh.frustumCulled = false; mesh.children.forEach(c => { c.frustumCulled = false; }); rig.add(mesh);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), mat({ color: '#E83040' })); rig.add(tip);
    arms.push({ g, tip, phi: i / 5 * Math.PI * 2 - Math.PI / 2, ph: rnd() * 6, pts: [...Array(20)].map(() => new THREE.Vector3()) }); }
  const eyes = [];
  for (const sx of [-1, 1]) { const e = eye(0.045, V(sx * 0.06, 0.15, -0.04), V(sx * 0.25, 1, -0.35)); rig.add(e); eyes.push(e); }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 14, Math.PI), new THREE.MeshBasicMaterial({ color: OUT })); smile.position.set(0, 0.16, 0.06); smile.rotation.set(-Math.PI / 2 + 0.3, 0, Math.PI); rig.add(smile);
  root.userData = { rig, arms, eyes, t: rnd() * 6 };
  animateBloodStar(root, 0);
  return root;
}
export function animateBloodStar(o, dt) {
  const u = o.userData; u.t += dt; const t = u.t;
  u.arms.forEach(a => { const lift = 0.12 + Math.sin(t * 0.6 + a.ph) * 0.1;
    for (let k = 0; k < 20; k++) { const s = k / 19, r = 0.1 + s * 0.78; a.pts[k].set(Math.cos(a.phi + Math.sin(t * 0.4 + a.ph) * 0.06 * s) * r, 0.07 + Math.pow(s, 3) * lift, Math.sin(a.phi + Math.sin(t * 0.4 + a.ph) * 0.06 * s) * r); }
    const rad = a.pts.map((_, k) => 0.085 * (1 - k / 20 * 0.72)); a.g.userData.update(a.pts, rad); a.tip.position.copy(a.pts[19]); });
  blink(u, dt);
}

// =====================================================================================
// LONG-SPINED SEA URCHIN — black, very long spines, glowing blue spots, orange ring, grumpy eyes
// =====================================================================================
export function makeLongSpineUrchin() {
  seed = 97;
  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig);
  const glowT = tex(256, 128, (g, W, H) => { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); for (let k = 0; k < 5; k++) for (let j = 0; j < 9; j++) { g.beginPath(); g.arc((k + 0.5) * W / 5 + Math.sin(j) * 3, H * 0.15 + j * H * 0.07, 3.2, 0, 7); g.fillStyle = '#4FD8FF'; g.fill(); } });
  const test = lined(new THREE.Mesh(new THREE.SphereGeometry(0.3, 36, 24), mat({ color: '#1C1C26', emissive: '#ffffff', emissiveMap: glowT })), 0.016); test.scale.y = 0.78; test.position.y = 0.24; rig.add(test);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.028, 10, 20), mat({ color: '#FF8A2A', emissive: '#7A3000' })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.48; rig.add(ring);
  for (let k = 0; k < 5; k++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), mat({ color: '#FFFFFF' })); const a = k / 5 * Math.PI * 2; d.position.set(Math.cos(a) * 0.17, 0.42, Math.sin(a) * 0.17); rig.add(d); }
  const N = 170, sp = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0025, 0.014, 1, 6).translate(0, 0.5, 0), mat({ color: '#2A2A36' }), N); sp.frustumCulled = false; rig.add(sp);
  const dirs = [];
  for (let i = 0; i < N; i++) { const yy = 1 - (i + 0.5) / N * 1.55, r = Math.sqrt(Math.max(0, 1 - yy * yy)), a = i * 2.399963; const d = V(Math.cos(a) * r, yy, Math.sin(a) * r); if (d.y < -0.35 || (d.z < -0.5 && d.y < 0.5 && Math.abs(d.x) < 0.75)) continue; dirs.push({ d, len: 0.75 + rnd() * 0.45, ph: rnd() * 6 }); }
  sp.count = dirs.length;
  const eyes = [];
  for (const sx of [-1, 1]) { const e = eye(0.065, V(sx * 0.1, 0.24, -0.27), V(sx * 0.35, 0.1, -1), sx * 0.45); rig.add(e); eyes.push(e); }
  root.userData = { rig, sp, dirs, eyes, t: rnd() * 6 };
  animateLongSpineUrchin(root, 0);
  return root;
}
export function animateLongSpineUrchin(o, dt) {
  const u = o.userData; u.t += dt; const t = u.t;
  u.dirs.forEach((s, i) => { _pd.copy(s.d); _pd.x += Math.sin(t * 0.8 + s.ph) * 0.06; _pd.z += Math.cos(t * 0.7 + s.ph) * 0.06; _pd.normalize(); _qq.setFromUnitVectors(_up, _pd);
    _m4.compose(_s.set(s.d.x * 0.27, 0.24 + s.d.y * 0.21, s.d.z * 0.27), _qq, new THREE.Vector3(1, s.len, 1)); u.sp.setMatrixAt(i, _m4); });
  u.sp.instanceMatrix.needsUpdate = true;
  blink(u, dt);
}

// review entries (numbers continue after the fish)
export const CRITTERS3D = [
  { en: 'Green sea turtle', de: 'Suppenschildkröte', make: () => makeSeaTurtle('green'), anim: animateSeaTurtle, cam: [-4.20, 2.10, -4.55], target: [0, 0, 0] },
  { en: 'Hawksbill turtle', de: 'Echte Karettschildkröte', make: () => makeSeaTurtle('hawksbill'), anim: animateSeaTurtle, cam: [-4.20, 2.10, -4.55], target: [0, 0, 0] },
  { en: 'Octopus', de: 'Krake (Oktopus)', make: makeOctopus, anim: animateOctopus, cam: [-3.15, 2.45, -4.55], target: [0, 0.45, 0] },
  { en: 'Banded coral shrimp', de: 'Gebänderte Scherengarnele', make: makeCoralShrimp, anim: animateCoralShrimp, cam: [-2.80, 1.75, -3.15], target: [0, 0.3, -0.2] },
  { en: 'Feather star', de: 'Haarstern', make: () => makeFeatherStar(0), anim: animateFeatherStar, cam: [-2.80, 2.80, -3.50], target: [0, 0.35, 0] },
  { en: 'Blood star', de: 'Blutstern', make: makeBloodStar, anim: animateBloodStar, cam: [-1.57, 2.98, -2.45], target: [0, 0.05, 0] },
  { en: 'Long-spined sea urchin', de: 'Diadem-Seeigel', make: makeLongSpineUrchin, anim: animateLongSpineUrchin, cam: [-2.80, 2.10, -3.85], target: [0, 0.45, 0] },
];
