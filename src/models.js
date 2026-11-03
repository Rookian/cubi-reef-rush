import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { plastic as toon, fin, eyeWhite, pupil, highlight, paintGradient, fanShape, fanPath, finMesh, outline, outlineMat, OUTLINE } from './materials.js';
const outlineInst = (t, c) => outlineMat(t, c);

// Toon versions of the 2D designs. Same palette, same outlines.
export function rng(seed = 1) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const basic = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, transparent: o.opacity != null, opacity: o.opacity ?? 1, depthWrite: o.opacity == null, side: o.side ?? THREE.FrontSide });
function smooth(geo) { geo.deleteAttribute('uv'); geo.deleteAttribute('normal'); const g = mergeVertices(geo, 1e-4); g.computeVertexNormals(); return g; }

function bake(parts) { // parts: [geometry with transform applied]
  return mergeGeometries(parts.map(g => { const h = g.index ? g.toNonIndexed() : g; ['uv', 'uv1', 'uv2'].forEach(a => h.deleteAttribute(a)); return h; }));
}
function placed(geo, x, y, z, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  return geo.clone().applyMatrix4(m);
}

// ---------- eye in the 2D style: white ball, big dark pupil, two sparkles ----------
const eyeInkCache = {};
export function makeEye(r, edge = OUTLINE) {
  const g = new THREE.Group();
  const white = outline(new THREE.Mesh(eyeWhiteGeo(r), eyeWhite()), r * 0.12, edge);
  // pupil + both sparkles merged into one mesh (fewer draw calls)
  const ink = (eyeInkCache[r] ||= (() => {
    const pup = new THREE.SphereGeometry(r * 0.62, 20, 14); pup.scale(1, 1, 0.45); pup.translate(0, 0, r * 0.8);
    const h1 = new THREE.SphereGeometry(r * 0.22, 10, 8); h1.translate(r * 0.24, r * 0.26, r * 1.04);
    const h2 = new THREE.SphereGeometry(r * 0.11, 8, 6); h2.translate(-r * 0.2, -r * 0.24, r * 1.04);
    return mergeGeometries([colorize(pup, '#1F1A2E'), colorize(h1, '#ffffff'), colorize(h2, '#ffffff')].map(q => { q.deleteAttribute('normal'); return q; }));
  })());
  const look = new THREE.Mesh(ink, eyeInkMat());
  g.add(white, look);
  g.userData.look = look;
  return g;
}
const eyeWhiteCache = {};
function eyeWhiteGeo(r) { return (eyeWhiteCache[r] ||= new THREE.SphereGeometry(r, 28, 20)); }
let _eyeInk = null; function eyeInkMat() { return (_eyeInk ||= new THREE.MeshBasicMaterial({ vertexColors: true })); }
function placeEye(eye, pos, dir) { eye.position.copy(pos); eye.lookAt(pos.clone().add(dir)); return eye; }
function decal(w, h, color, opacity) { const mat = basic(color, { opacity }); mat.polygonOffset = true; mat.polygonOffsetFactor = -4; mat.polygonOffsetUnits = -4; const m = new THREE.Mesh(new THREE.CircleGeometry(1, 32), mat); m.scale.set(w, h, 1); m.renderOrder = 2; return m; }
function stickFrom(body, origin, dir, obj, lift = 0.004) {
  body.updateMatrixWorld(true);
  _ray.set(origin, dir.clone().normalize());
  const hit = _ray.intersectObject(body, false)[0];
  if (!hit) return null;
  obj.position.copy(hit.point).add(hit.face.normal.clone().multiplyScalar(lift));
  obj.lookAt(hit.point.clone().add(hit.face.normal));
  return obj;
}
// put a flat decal on a body surface using a ray from outside
const _ray = new THREE.Raycaster();
function stick(body, dir, obj, lift = 0.004) {
  body.updateMatrixWorld(true);
  const d = dir.clone().normalize();
  _ray.set(d.clone().multiplyScalar(4), d.clone().negate());
  const hit = _ray.intersectObject(body, false)[0];
  if (!hit) return null;
  obj.position.copy(hit.point).add(hit.face.normal.clone().multiplyScalar(lift));
  obj.lookAt(hit.point.clone().add(hit.face.normal));
  return obj;
}

// =====================================================================
// CUBI — young yellow boxfish. Faces -Z, tail toward +Z.
// =====================================================================
export const CUBI = { body: '#FFD23F', shade: '#F0AE17', light: '#FFF3B0', spot: '#2E2318', fin: '#FFB23A', finRay: '#FFE08A', tail: '#FFBF2E', lips: '#FF9A5C', blush: '#FF8FA3' };
export function makeCubi(opts = {}) {
  const P = { ...CUBI, ...opts };
  const root = new THREE.Group();
  const rig = new THREE.Group(); root.add(rig);
  const geo = smooth(new RoundedBoxGeometry(1.0, 0.9, 1.1, 10, 0.34));
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const z = p.getZ(i);
    if (z < 0) { const k = -z / 0.55; p.setX(i, p.getX(i) * (1 - 0.1 * k)); p.setY(i, p.getY(i) * (1 - 0.05 * k)); }
  }
  geo.computeVertexNormals();
  const shade = new THREE.Color(P.shade);
  paintGradient(geo, P.body, P.body, 'y', 0, 1, (c, i, pos) => { const y = pos.getY(i); c.lerp(shade, THREE.MathUtils.smoothstep(-y, 0.2, 0.28)); });
  const bodyMat = toon('#ffffff', { vertexColors: true });
  const body = outline(new THREE.Mesh(geo, bodyMat), 0.028);
  body.castShadow = true;
  rig.add(body);

  // 2D-style sticker shine on top
  const shine = decal(0.2, 0.075, P.light, 0.95); stick(body, new THREE.Vector3(-0.35, 1, -0.15), shine); rig.add(shine);
  const dot = decal(0.035, 0.035, '#ffffff'); stick(body, new THREE.Vector3(0.2, 1, -0.45), dot); rig.add(dot);

  // spots: the 2D layout, mirrored on both sides, plus a tidy pattern on top and back
  const spotMat = basic(P.spot); spotMat.polygonOffset = true; spotMat.polygonOffsetFactor = -4; spotMat.polygonOffsetUnits = -4;
  const spotParts = [];
  const addSpot = (origin, dir, r) => { const d = decal(r, r, P.spot); if (stickFrom(body, origin, dir, d, 0.006)) { d.updateMatrix(); spotParts.push(d.geometry.clone().applyMatrix4(d.matrix)); } };
  const side2D = [[68, 74, 4.2], [88, 65, 3.2], [60, 103, 4.2], [81, 92, 3.2], [101, 72, 3.0], [73, 123, 3.6], [57, 82, 2.8]];
  for (const sx of [-1, 1]) for (const [x, y, r] of side2D) {
    const z = 0.55 - (x - 48) / 99 * 1.1, yy = 0.45 - (y - 56) / 88 * 0.9;
    addSpot(new THREE.Vector3(sx * 3, yy, z), new THREE.Vector3(-sx, 0, 0), r * 0.0115);
  }
  for (const [x, z, r] of [[-0.2, 0.28, 0.04], [0.2, 0.28, 0.04], [0, 0.06, 0.034], [-0.24, -0.02, 0.03], [0.24, -0.02, 0.03], [0, 0.38, 0.03]])
    addSpot(new THREE.Vector3(x, 3, z), new THREE.Vector3(0, -1, 0), r);
  for (const [x, y, r] of [[-0.26, 0.2, 0.038], [0.26, 0.2, 0.038], [-0.28, -0.14, 0.032], [0.28, -0.14, 0.032], [0, 0.3, 0.03]])
    addSpot(new THREE.Vector3(x, y, 3), new THREE.Vector3(0, 0, -1), r);
  const spots = new THREE.Mesh(bake(spotParts), spotMat); spots.renderOrder = 2; rig.add(spots);

  // eyes + blush
  const eyes = [];
  for (const sx of [-1, 1]) {
    const e = placeEye(makeEye(0.21), new THREE.Vector3(sx * 0.39, 0.13, -0.22), new THREE.Vector3(sx, 0.08, -0.45).normalize());
    rig.add(e); eyes.push(e);
    const b = decal(0.085, 0.048, P.blush, 0.65);
    if (stick(body, new THREE.Vector3(sx, -0.25, -0.5), b)) rig.add(b);
  }
  // pursed lips on the snout
  const lips = outline(new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.038, 14, 28), toon(P.lips)), 0.012);
  lips.position.set(0, -0.12, -0.565);
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.03, 20), basic('#4A1414'));
  mouth.position.set(0, -0.12, -0.57); mouth.rotation.y = Math.PI; mouth.scale.y = 1.4;
  rig.add(lips, mouth);

  // fins
  const pecs = [];
  for (const sx of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(sx * 0.48, -0.14, 0.02);
    const m = finMesh(0.3, 0.55, 0, P.fin, P.finRay);
    m.rotation.y = sx > 0 ? -Math.PI / 4 : -3 * Math.PI / 4;
    piv.add(m); rig.add(piv); pecs.push(piv);
  }
  const vert = (y, z, ang, len) => { const g = new THREE.Group(); g.position.set(0, y, z); g.rotation.x = ang; const m = finMesh(len, 0.5, 0, P.fin); m.rotation.y = -Math.PI / 2; g.add(m); rig.add(g); return g; };
  const dorsal = vert(0.42, 0.34, -1.0, 0.2);
  const anal = vert(-0.41, 0.34, 1.0, 0.16);
  const ped = outline(new THREE.Mesh(smooth(new THREE.CylinderGeometry(0.15, 0.2, 0.28, 24, 2)), toon(P.body)), 0.022);
  ped.rotation.x = Math.PI / 2; ped.position.z = 0.62; rig.add(ped);
  const tail = new THREE.Group(); tail.position.z = 0.74; rig.add(tail);
  const tf = finMesh(0.44, 0.85, 1, P.tail, P.finRay, OUTLINE, 0.016); tf.rotation.y = -Math.PI / 2; tail.add(tf);

  root.userData = { rig, eyes, pecs, tail, dorsal, anal, bodyMat, lips, mouth, t: Math.random() * 10, blink: 0, mt: Math.random() * 6, kiss: 3, chomp: 0, blub: 0 };
  return root;
}
export function animateFish(f, dt, effort = 0.5) {
  const u = f.userData;
  u.t += dt * (3 + effort * 9);
  u.tail.rotation.y = Math.sin(u.t) * (0.35 + effort * 0.35);
  u.pecs.forEach((p, i) => { p.rotation.y = (i ? -1 : 1) * Math.sin(u.t * 1.3 + i) * 0.45; p.rotation.z = Math.sin(u.t * 1.3) * 0.2; });
  if (u.dorsal) u.dorsal.rotation.z = Math.sin(u.t * 0.7) * 0.15;
  u.rig.position.y = Math.sin(u.t * 0.35) * 0.03;
  u.blink -= dt;
  if (u.blink < -2.5 - Math.random() * 3) u.blink = 0.14;
  const s = u.blink > 0 ? Math.max(0.1, Math.min(1, Math.abs(u.blink - 0.07) / 0.07)) : 1;
  u.eyes.forEach(e => e.scale.y = s);
  // cute mouth: soft "blub blub" breathing, a pucker now and then, a snap when eating
  if (u.lips) {
    u.mt += dt;
    const prevOpen = u.open || 0;
    let open = Math.pow(0.5 + 0.5 * Math.sin(u.mt * 3.4), 2);   // 0..1
    let sx = 1 + open * 0.22, sy = 1 + open * 0.5;
    u.kiss -= dt;
    if (u.kiss < 0) { const k = -u.kiss; if (k < 0.45) { const q = Math.sin(k / 0.45 * Math.PI); sx = 1 - q * 0.3; sy = 1 - q * 0.3; open = 0; } else u.kiss = 3 + Math.random() * 4; }
    if (u.chomp > 0) { u.chomp -= dt; const c = u.chomp / 0.3; const w = c > 0.5 ? (1 - c) * 2 : c * 2; open = w; sx = 1 + w * 0.6; sy = 1 + w * 1.4; }
    u.lips.scale.set(sx, sy, 1);
    u.mouth.scale.set(0.7 + open * 0.6, 0.5 + open * 2.0, 1);
    u.blub = open > 0.9 && prevOpen <= 0.9 ? 1 : 0;   // the game puffs a bubble on each "blub"
    u.open = open;
  }
}

// =====================================================================
// CLOWNFISH — the 2D design in 3D
// =====================================================================
const clownTexCache = {};
function clownTexture(P) {
  const key = P.body + P.shade;
  if (clownTexCache[key]) return clownTexCache[key];
  const W = 1024, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = P.body; g.fillRect(0, 0, W, H);
  g.fillStyle = P.shade; g.fillRect(0, H * 0.74, W, H * 0.26);
  const band = (u, w, curve) => {
    const x = u * W, hw = w * W;
    g.beginPath();
    g.moveTo(x - hw, -10); g.bezierCurveTo(x - hw - curve, H * 0.35, x - hw - curve, H * 0.65, x - hw, H + 10);
    g.lineTo(x + hw, H + 10); g.bezierCurveTo(x + hw - curve, H * 0.65, x + hw - curve, H * 0.35, x + hw, -10); g.closePath();
    g.fillStyle = '#FFFFFF'; g.fill(); g.lineWidth = W * 0.014; g.strokeStyle = '#2B1A12'; g.stroke();
  };
  band(0.32, 0.055, 60); band(0.57, 0.068, -50); band(0.86, 0.03, -20);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (clownTexCache[key] = t);
}
export const CLOWN = { body: '#FF8A2A', shade: '#F07A20', fin: '#FF9A3D', blush: '#FF5C7A' };
export function makeClown(opts = {}) {
  const P = { ...CLOWN, ...opts };
  const root = new THREE.Group();
  const rig = new THREE.Group(); root.add(rig);
  const geo = new THREE.SphereGeometry(0.5, 64, 40);
  geo.scale(0.56, 0.68, 1.0);
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) { const z = p.getZ(i); if (z > 0) { const k = z / 0.5; p.setY(i, p.getY(i) * (1 - 0.35 * k * k)); p.setX(i, p.getX(i) * (1 - 0.3 * k * k)); } }
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getZ(i) + 0.5) / 1.0, (p.getY(i) + 0.34) / 0.68);
  geo.computeVertexNormals();
  const bmat = toon('#ffffff'); bmat.map = clownTexture(P);
  const body = outline(new THREE.Mesh(geo, bmat), 0.022, '#2B1A12');
  body.castShadow = true; rig.add(body);
  const sh = decal(0.13, 0.04, '#FFC08A', 0.9); if (stick(body, new THREE.Vector3(-0.1, 1, -0.1), sh)) rig.add(sh);
  const eyes = [];
  for (const sx of [-1, 1]) {
    const e = placeEye(makeEye(0.125, '#2B1A12'), new THREE.Vector3(sx * 0.2, 0.09, -0.29), new THREE.Vector3(sx, 0.1, -0.7).normalize());
    rig.add(e); eyes.push(e);
    const b = decal(0.055, 0.03, P.blush, 0.6); if (stick(body, new THREE.Vector3(sx, -0.3, -0.8), b)) rig.add(b);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 8, 20, Math.PI), basic('#2B1A12'));
  smile.position.set(0, -0.07, -0.485); smile.rotation.set(0, 0, Math.PI); rig.add(smile);
  const pecs = [];
  for (const sx of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(sx * 0.26, -0.1, -0.06);
    const m = finMesh(0.22, 0.55, 0, P.fin, null, '#2B1A12', 0.012);
    m.rotation.y = sx > 0 ? -Math.PI / 4 : -3 * Math.PI / 4;
    piv.add(m); rig.add(piv); pecs.push(piv);
  }
  const vert = (y, z, ang, len, spread) => { const g = new THREE.Group(); g.position.set(0, y, z); g.rotation.x = ang; const m = finMesh(len, spread, 0, P.fin, null, '#2B1A12', 0.012); m.rotation.y = -Math.PI / 2; g.add(m); rig.add(g); return g; };
  const dorsal = vert(0.31, -0.03, -1.25, 0.19, 0.7);
  vert(0.25, 0.19, -1.05, 0.2, 0.6);
  vert(-0.27, 0.2, 1.1, 0.17, 0.6);
  const tail = new THREE.Group(); tail.position.z = 0.45; rig.add(tail);
  const tf = finMesh(0.28, 0.75, 0, P.fin, null, '#2B1A12', 0.014); tf.rotation.y = -Math.PI / 2; tail.add(tf);
  root.userData = { rig, eyes, pecs, tail, dorsal, t: Math.random() * 10, blink: 0 };
  return root;
}

// =====================================================================
// JELLYFISH — pink dome, > < eyes, dark curly tentacles (as in 2D)
// =====================================================================
export function makeJelly(color = '#FF9BD2', edge = '#4A1832', light = '#FFD3EC') {
  const root = new THREE.Group();
  const bell = new THREE.Group(); root.add(bell);
  const dome = outline(new THREE.Mesh(smooth(new THREE.SphereGeometry(0.6, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2)), toon(color, { side: THREE.DoubleSide })), 0.03, edge);
  dome.scale.y = 0.9;
  const rim = outline(new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.07, 12, 48), toon(color)), 0.02, edge); rim.rotation.x = Math.PI / 2;
  bell.add(dome, rim);
  const shine = decal(0.14, 0.07, light, 0.95); if (stick(dome, new THREE.Vector3(-0.5, 0.8, 0.5), shine)) bell.add(shine);
  const faceMat = basic('#2A1426');
  const cap = new THREE.CapsuleGeometry(0.022, 0.08, 4, 8);
  for (const sx of [-1, 1]) for (const s2 of [-1, 1]) {
    const m = new THREE.Mesh(cap, faceMat);
    m.position.set(sx * 0.18, 0.25 + s2 * 0.028, 0.46);
    m.rotation.z = sx * s2 * 0.75 + Math.PI / 2; bell.add(m);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.014, 8, 16, Math.PI), faceMat);
  mouth.position.set(0, 0.13, 0.52); bell.add(mouth);
  for (const sx of [-1, 1]) { const b = decal(0.065, 0.038, '#FF5C9A', 0.6); b.position.set(sx * 0.3, 0.13, 0.5); b.rotation.y = sx * 0.55; bell.add(b); }
  const tentMat = basic(edge);
  const tents = [];
  for (let k = 0; k < 5; k++) {
    const x0 = -0.32 + k * 0.16;
    const pts = []; for (let s = 0; s <= 8; s++) pts.push(new THREE.Vector3(x0 + Math.sin(s * 1.2 + k) * 0.06, -0.02 - s * 0.15, 0.12 + Math.cos(s * 0.9 + k) * 0.05));
    const g = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.028, 6), tentMat);
    const piv = new THREE.Group(); piv.add(g); root.add(piv); tents.push(piv);
  }
  root.userData = { bell, tents, t: Math.random() * 10 };
  return root;
}
export function animateJelly(j, dt) {
  const u = j.userData; u.t += dt * 2.6;
  const s = Math.sin(u.t);
  u.bell.scale.set(1 + s * 0.07, 1 - s * 0.1, 1 + s * 0.07);
  u.tents.forEach((t, i) => { t.rotation.x = Math.sin(u.t + i) * 0.12; t.rotation.z = Math.cos(u.t * 0.8 + i) * 0.12; t.scale.y = 1 + s * 0.08; });
}

// =====================================================================
// PUFFERFISH — swims at the player and puffs up. Faces +Z.
// =====================================================================
export function makePuffer() {
  const root = new THREE.Group();
  const rig = new THREE.Group(); root.add(rig);
  const geo = smooth(new THREE.SphereGeometry(0.42, 48, 32));
  const belly = new THREE.Color('#FFF6D6');
  paintGradient(geo, '#B9E06A', '#B9E06A', 'y', 0, 1, (c, i, pos) => c.lerp(belly, THREE.MathUtils.smoothstep(-pos.getY(i), 0.08, 0.16)));
  const body = outline(new THREE.Mesh(geo, toon('#ffffff', { vertexColors: true })), 0.024, '#2E3A12');
  body.castShadow = true; rig.add(body);
  const R = rng(3);
  const spotMat = basic('#6E9A2A');
  for (let k = 0; k < 10; k++) { const d = decal(0.03, 0.03, '#6E9A2A'); d.material = spotMat; if (stick(body, new THREE.Vector3(R() * 2 - 1, R() * 0.6 + 0.4, R() * 1.2 - 0.9), d)) { body.worldToLocal(d.position); d.quaternion.premultiply(body.getWorldQuaternion(new THREE.Quaternion()).invert()); body.add(d); } }
  const N = 70;
  const spikes = new THREE.InstancedMesh(new THREE.ConeGeometry(0.04, 0.16, 8).translate(0, 0.08, 0), toon('#F4F0C8'), N);
  const dirs = [];
  for (let i = 0; i < N; i++) { const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.399963; dirs.push(new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r)); }
  rig.add(spikes);
  const face = new THREE.Group(); rig.add(face);
  for (const sx of [-1, 1]) {
    const e = placeEye(makeEye(0.12, '#2E3A12'), new THREE.Vector3(sx * 0.17, 0.12, 0.34), new THREE.Vector3(sx * 0.35, 0.1, 1).normalize());
    face.add(e);
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.12, 4, 8), basic('#2E3A12'));
    brow.position.set(sx * 0.17, 0.29, 0.37); brow.rotation.z = Math.PI / 2 - sx * 0.45; face.add(brow);
  }
  const mouth = outline(new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.02, 10, 20), toon('#FF7A8A')), 0.01, '#2E3A12');
  mouth.position.set(0, -0.08, 0.41); face.add(mouth);
  const tail = new THREE.Group(); tail.position.z = -0.42; rig.add(tail);
  const tf = finMesh(0.2, 0.7, 1, '#C8E66A', null, '#2E3A12', 0.012); tf.rotation.y = Math.PI / 2; tail.add(tf);
  root.userData = { rig, body, spikes, dirs, tail, face, t: Math.random() * 10, puff: 0 };
  setPuff(root, 0);
  return root;
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0), _s = new THREE.Vector3(), _p = new THREE.Vector3();
export function setPuff(pf, puff) {
  const u = pf.userData; u.puff = puff;
  const k = 1 + puff * 0.6;
  u.body.scale.setScalar(k);
  u.face.children.forEach(c => { c.userData.p0 ||= c.position.clone(); c.position.copy(c.userData.p0).multiplyScalar(k); });
  u.dirs.forEach((d, i) => {
    _q.setFromUnitVectors(_up, d); _p.copy(d).multiplyScalar(0.4 * k);
    const s = 0.12 + puff * 0.88; _s.set(s, s, s);
    _m.compose(_p, _q, _s); u.spikes.setMatrixAt(i, _m);
  });
  u.spikes.instanceMatrix.needsUpdate = true;
}

// =====================================================================
// SEA URCHIN
// =====================================================================
export function makeUrchin() {
  const root = new THREE.Group();
  const body = outline(new THREE.Mesh(smooth(new THREE.SphereGeometry(0.34, 32, 20)), toon('#8A5BC4')), 0.025, '#1C1030');
  body.scale.y = 0.75; body.position.y = 0.2; root.add(body);
  const N = 70;
  const sp = new THREE.InstancedMesh(new THREE.ConeGeometry(0.03, 0.6, 6).translate(0, 0.3, 0), toon('#6B3FA0'), N);
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 1.3, r = Math.sqrt(Math.max(0, 1 - y * y)), th = i * 2.399963;
    const d = new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r).normalize();
    _q.setFromUnitVectors(_up, d); _p.set(d.x * 0.3, 0.2 + d.y * 0.22, d.z * 0.3);
    _m.compose(_p, _q, _s.set(1, 0.8 + (i % 3) * 0.15, 1)); sp.setMatrixAt(i, _m);
  }
  root.add(sp);
  for (const sx of [-1, 1]) { const e = makeEye(0.075, '#1C1030'); e.position.set(sx * 0.12, 0.27, 0.26); root.add(e); }
  return root;
}

// =====================================================================
// PEARL
// =====================================================================
let glowTex = null;
export function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,0.8)'); gr.addColorStop(0.4, 'rgba(255,240,250,0.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c); glowTex.colorSpace = THREE.SRGBColorSpace; return glowTex;
}
const pearlGeo = new THREE.SphereGeometry(0.2, 18, 12);
export function makePearl() {
  const g = new THREE.Group();
  const m = outline(new THREE.Mesh(pearlGeo, toon('#F4EEFF', { emissive: '#4a3a60' })), 0.022);
  const sh = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), highlight()); sh.position.set(-0.07, 0.08, 0.15); m.add(sh);
  g.add(m);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#fff3c4', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.setScalar(0.75); g.add(glow);
  return g;
}

// =====================================================================
// CORALS & SCENERY — 2D palette, outlined, all sit on y=0
// =====================================================================
export const COR = {
  pink: ['#FF7FA8', '#7A1F3D'], orange: ['#FF9A6B', '#7A2E14'], purple: ['#B48CFF', '#3E2370'], green: ['#8EDB7A', '#22522A'],
  teal: ['#5FD3C8', '#13504B'], yellow: ['#FFD86B', '#6A4A10'], red: ['#FF6B6B', '#6A1A1A'],
};
const cache = {};
const cached = (k, f) => (cache[k] ||= f());
function branchGeo(seed, baseR, len, depth, spreadA) {
  const R = rng(seed); const geos = []; const up = new THREE.Vector3(0, 1, 0);
  function br(start, dir, l, r, d) {
    const end = start.clone().add(dir.clone().multiplyScalar(l));
    const g = new THREE.CylinderGeometry(r * 0.8, r, l, 8, 1, true);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir));
    g.translate((start.x + end.x) / 2, (start.y + end.y) / 2, (start.z + end.z) / 2); geos.push(g);
    const j = new THREE.SphereGeometry(r * 0.82, 8, 5); j.translate(end.x, end.y, end.z); geos.push(j);
    if (d <= 0) return;
    const n = 2 + (R() < 0.35 ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const nd = dir.clone().add(new THREE.Vector3((R() - 0.5) * spreadA, (R() - 0.2) * 0.3, (R() - 0.5) * spreadA * 0.6)).normalize();
      if (nd.y < 0.3) nd.y = 0.3;
      br(end, nd.normalize(), l * (0.7 + R() * 0.1), r * 0.76, d - 1);
    }
  }
  br(new THREE.Vector3(0, -0.05, 0), up.clone(), len, baseR, depth);
  let m = mergeGeometries(geos.map(g => { g.deleteAttribute('uv'); g.deleteAttribute('normal'); return g.toNonIndexed(); }));
  m = mergeVertices(m, 1e-3); m.computeVertexNormals(); return m;
}
const coralMesh = (geo, c, th = 0.03) => { const m = outline(new THREE.Mesh(geo, toon(c[0])), th, c[1]); return m; };
export function makeBranchCoral(color = COR.pink, seed = 5, scale = 1) {
  const g = new THREE.Group(); g.add(coralMesh(cached('br' + seed, () => branchGeo(seed, 0.12, 0.62, 3, 2.1)), color)); g.scale.setScalar(scale); return g;
}
export function makeStaghorn(color = COR.red, seed = 9, scale = 1) {
  const g = new THREE.Group(); g.add(coralMesh(cached('st' + seed, () => branchGeo(seed, 0.09, 0.66, 3, 2.3)), color, 0.022)); g.scale.setScalar(scale); return g;
}
export function makeBrainCoral(color = COR.green, scale = 1) {
  const geo = cached('brain', () => {
    const g = new THREE.SphereGeometry(0.8, 56, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    const p = g.attributes.position; const v = new THREE.Vector3(); const groove = [];
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const th = Math.atan2(v.z, v.x), ph = Math.acos(THREE.MathUtils.clamp(v.y / 0.8, -1, 1));
      const w = Math.sin(th * 8 + Math.sin(ph * 12) * 2.0) * Math.sin(ph * 10 + Math.cos(th * 4) * 1.4);
      const gr = Math.pow(1 - Math.abs(w), 8); groove.push(gr);
      v.multiplyScalar(1 - gr * 0.03); p.setXYZ(i, v.x, v.y * 0.72, v.z);
    }
    g.computeVertexNormals();
    const dark = new THREE.Color(0.62, 0.62, 0.62);
    paintGradient(g, '#ffffff', '#ffffff', 'y', 0, 1, (c, i) => { if (groove[i] > 0.35) c.copy(dark); });
    return g;
  });
  const m = outline(new THREE.Mesh(geo, toon(color[0], { vertexColors: true })), 0.03, color[1]);
  const g = new THREE.Group(); g.add(m); g.scale.setScalar(scale); return g;
}
export function makeTubeCoral(color = COR.orange, scale = 1, seed = 4) {
  const key = 'tube' + seed;
  const geos = cached(key, () => {
    const R = rng(seed); const tubes = [], holes = [];
    for (let k = 0; k < 6; k++) {
      const h = 0.4 + R() * 0.9, r = 0.12 + R() * 0.04, x = (R() - 0.5) * 0.7, z = (R() - 0.5) * 0.7;
      tubes.push(placed(new THREE.CylinderGeometry(r * 1.12, r, h, 14, 1, false), x, h / 2, z));
      holes.push(placed(new THREE.CircleGeometry(r * 0.8, 12), x, h + 0.003, z, 1, 1, 1, -Math.PI / 2));
    }
    const t = bake(tubes); const tm = mergeVertices(t, 1e-4); tm.computeVertexNormals();
    return { tubes: tm, holes: bake(holes) };
  });
  const g = new THREE.Group();
  const m = outline(new THREE.Mesh(geos.tubes, toon(color[0])), 0.025, color[1]);
  g.add(m, new THREE.Mesh(geos.holes, basic(color[1])));
  g.scale.setScalar(scale); return g;
}
export function makeTableCoral(color = COR.teal, scale = 1) {
  const g = new THREE.Group(); const mat = toon(color[0]);
  const stem = outline(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 1.3, 16), mat), 0.025, color[1]); stem.position.y = 0.65; g.add(stem);
  [[0.4, 0.92], [0.82, 0.7], [1.22, 0.48]].forEach(([y, r]) => {
    const t = outline(new THREE.Mesh(smooth(new THREE.CylinderGeometry(r, r * 0.8, 0.12, 48, 1)), mat), 0.028, color[1]);
    t.position.y = y; t.castShadow = true; g.add(t);
  });
  g.scale.setScalar(scale); return g;
}
export function makeSeaFan(color = COR.purple, scale = 1) {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.bezierCurveTo(-0.3, 0.4, -1.0, 0.8, -0.95, 1.4); s.bezierCurveTo(-0.9, 1.95, -0.35, 2.15, 0, 2.0);
  s.bezierCurveTo(0.35, 2.15, 0.9, 1.95, 0.95, 1.4); s.bezierCurveTo(1.0, 0.8, 0.3, 0.4, 0, 0);
  g.add(new THREE.Mesh(new THREE.ShapeGeometry(s, 32), toon(color[0], { side: THREE.DoubleSide })));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(s.getPoints(60).map(p => new THREE.Vector3(p.x, p.y, 0)), true), 160, 0.03, 6, true), basic(color[1])));
  const ribs = cached('fanribs', () => { const parts = []; for (let a = -0.9; a <= 0.91; a += 0.3) for (const zz of [0.014, -0.014]) { const pts = [new THREE.Vector3(0, 0, zz), new THREE.Vector3(Math.sin(a) * 0.5, 0.9, zz), new THREE.Vector3(Math.sin(a) * 0.85, 1.8 - Math.abs(a) * 0.35, zz)]; parts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.022, 4)); } return bake(parts); });
  g.add(new THREE.Mesh(ribs, basic(new THREE.Color(color[0]).multiplyScalar(0.75))));
  g.scale.setScalar(scale); return g;
}
export function makeBubbleCoral(scale = 1, seed = 2, color = COR.yellow) {
  const geos = cached('bub' + seed, () => {
    const R = rng(seed); const balls = [], hls = [];
    for (let k = 0; k < 11; k++) {
      const r = 0.15 + R() * 0.11, x = (R() - 0.5) * 0.85, y = r + R() * 0.45, z = (R() - 0.5) * 0.85;
      balls.push(placed(new THREE.SphereGeometry(r, 14, 10), x, y, z));
      hls.push(placed(new THREE.SphereGeometry(r * 0.28, 8, 6), x - r * 0.4, y + r * 0.45, z + r * 0.6));
    }
    return { balls: bake(balls), hls: bake(hls) };
  });
  const g = new THREE.Group();
  const m = outline(new THREE.Mesh(geos.balls, toon(color[0])), 0.022, color[1]);
  g.add(m, new THREE.Mesh(geos.hls, basic('#FFF0B8')));
  g.scale.setScalar(scale); return g;
}
export function makeRock(scale = 1, seed = 1) {
  const R = rng(seed);
  const geo = smooth(new THREE.IcosahedronGeometry(0.8, 2));
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = 0.9 + Math.sin(x * 3 + seed) * 0.06 + Math.cos(z * 3 + seed) * 0.06; p.setXYZ(i, x * k * 1.1, Math.max(-0.15, y * k * 0.6), z * k); }
  geo.computeVertexNormals();
  const m = outline(new THREE.Mesh(geo, toon('#8A9BB0')), 0.03, '#3E4A5A');
  const g = new THREE.Group(); g.add(m); g.scale.setScalar(scale * (0.9 + R() * 0.2)); return g;
}
export function makeAnemone(stem = '#9B6BE8', tip = '#D9B8FF', edge = '#3E2370') {
  const g = new THREE.Group();
  const base = outline(new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon('#FF8FA3')), 0.03, edge);
  base.scale.y = 0.55; g.add(base);
  const tg = cached('tentAll', () => {
    const c = new THREE.CapsuleGeometry(0.06, 0.6, 2, 7); c.translate(0, 0.36, 0);
    const t = new THREE.SphereGeometry(0.095, 9, 6); t.translate(0, 0.72, 0);
    const cols = (geo, col) => { const n = geo.attributes.position.count; const a = new Float32Array(n * 3); const c3 = new THREE.Color(col); for (let i = 0; i < n; i++) { a[i * 3] = c3.r; a[i * 3 + 1] = c3.g; a[i * 3 + 2] = c3.b; } geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); return geo; };
    // white/grey vertex colours: stem = 1, tip marked by 0.5 in red channel trick is overkill; keep two parts and tint per material
    return { stem: c, tip: t };
  });
  const N = 22;
  const stems = new THREE.InstancedMesh(tg.stem, toon(stem), N);
  const tips = new THREE.InstancedMesh(tg.tip, toon(tip), N);
  const stemsO = new THREE.InstancedMesh(tg.stem, outlineInst(0.018, edge), N);
  const tipsO = new THREE.InstancedMesh(tg.tip, outlineInst(0.018, edge), N);
  const data = [];
  for (let i = 0; i < N; i++) {
    const a = i * 2.399963, rr = 0.1 + Math.sqrt(i / N) * 0.46;
    data.push({ pos: new THREE.Vector3(Math.cos(a) * rr, 0.25 - rr * 0.3, Math.sin(a) * rr), bx: Math.sin(a) * rr * 0.9, bz: -Math.cos(a) * rr * 0.9, ph: a, sc: 0.85 + ((i * 37) % 10) / 30 });
  }
  g.add(stemsO, tipsO, stems, tips);
  g.userData = { inst: [stems, tips, stemsO, tipsO], data, t: Math.random() * 10 };
  animateAnemone(g, 0);
  return g;
}
const _e = new THREE.Euler(), _aq = new THREE.Quaternion(), _am = new THREE.Matrix4(), _as = new THREE.Vector3();
export function animateAnemone(a, dt) {
  const u = a.userData; u.t += dt * 0.7;
  u.data.forEach((d, i) => {
    _e.set(d.bx + Math.sin(u.t + d.ph) * 0.18, 0, d.bz + Math.cos(u.t * 0.8 + d.ph) * 0.18);
    _aq.setFromEuler(_e); _as.setScalar(d.sc); _am.compose(d.pos, _aq, _as);
    u.inst.forEach(m => m.setMatrixAt(i, _am));
  });
  u.inst.forEach(m => { m.instanceMatrix.needsUpdate = true; });
}
let weedGeo = null, weedBase = null;
export function seaweedGeometry() {
  if (weedGeo) return weedGeo;
  weedGeo = new THREE.PlaneGeometry(0.3, 3, 1, 20); weedGeo.translate(0, 1.5, 0);
  const p = weedGeo.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 - y / 3.6)); }
  weedBase = p.array.slice();
  return weedGeo;
}
export function animateSeaweed(t) {
  if (!weedGeo) return;
  const p = weedGeo.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = weedBase[i * 3 + 1]; const k = Math.pow(y / 3, 1.4); p.setX(i, weedBase[i * 3] + Math.sin(t * 0.7 + y * 1.1) * 0.28 * k); p.setZ(i, Math.cos(t * 0.55 + y) * 0.13 * k); }
  p.needsUpdate = true; weedGeo.computeVertexNormals();
}
export function makeSeaweed(color = '#3FBF7F', scale = 1) {
  const g = new THREE.Group(); const mat = toon(color, { side: THREE.DoubleSide });
  for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(seaweedGeometry(), mat); m.position.x = (k - 1) * 0.22; m.rotation.y = k * 1.1; m.scale.set(1, 0.7 + k * 0.2, 1); g.add(m); }
  g.scale.setScalar(scale); return g;
}

// Starfish lying on the sand
// Sea star: chunky, puffy arms with rounded tips that curl up a little, a lighter centre and bumpy dots
export const STAR_PALS = [
  ['#FF7A1A', '#FFD24A', '#FFF0B0', '#7A2E14'],   // orange with yellow centre
  ['#2F6BFF', '#7FB0FF', '#E0ECFF', '#14286A'],   // blue linckia
  ['#FF3A4A', '#FF9AA0', '#FFFFFF', '#6A1420'],   // red with white bumps
  ['#9B4DFF', '#E0A8FF', '#FFE0FF', '#3E1A70'],   // purple
  ['#FF4FB8', '#FFD0EA', '#FFF5A0', '#6A1A4A'],   // pink with yellow bumps
  ['#FFD000', '#FF8A00', '#7A4A00', '#6A4A10'],   // yellow with orange centre, brown bumps
];
function starGeo() {
  return cached('star2', () => {
    const sh = new THREE.Shape(); const n = 5, R = 0.36, r = 0.11;
    for (let i = 0; i < n; i++) {
      const a = Math.PI / 2 + i * Math.PI * 2 / n, a2 = a + Math.PI / n, a0 = a - Math.PI / n;
      const tip = [Math.cos(a) * R, Math.sin(a) * R];
      if (i === 0) sh.moveTo(Math.cos(a0) * r, Math.sin(a0) * r);
      // rounded arm: curve out to the tip and back
      sh.quadraticCurveTo(Math.cos(a - 0.17) * R * 0.7, Math.sin(a - 0.17) * R * 0.7, Math.cos(a - 0.09) * R, Math.sin(a - 0.09) * R);
      sh.quadraticCurveTo(tip[0] * 1.06, tip[1] * 1.06, Math.cos(a + 0.09) * R, Math.sin(a + 0.09) * R);
      sh.quadraticCurveTo(Math.cos(a + 0.17) * R * 0.7, Math.sin(a + 0.17) * R * 0.7, Math.cos(a2) * r, Math.sin(a2) * r);
    }
    let g = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.05, bevelSegments: 4, curveSegments: 6 });
    g.rotateX(-Math.PI / 2); g.translate(0, 0.07, 0); g.deleteAttribute('uv');
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z); p.setY(i, p.getY(i) * (1.25 - d * 1.2) + Math.pow(Math.max(0, d - 0.22), 2) * 1.6); } // puffy middle, curled tips
    g = smooth(g);
    return g;
  });
}
export function makeStarfish(pal = null) {
  const P = Array.isArray(pal) ? pal : STAR_PALS[(pal ?? Math.floor(Math.random() * STAR_PALS.length)) % STAR_PALS.length];
  const [C, M, D, E] = P;
  const geo = starGeo().clone();
  const cc = new THREE.Color(C), cm = new THREE.Color(M);
  paintGradient(geo, '#fff', '#fff', 'y', 0, 1, (c, i, p) => { const d = Math.hypot(p.getX(i), p.getZ(i)); c.copy(cm).lerp(cc, THREE.MathUtils.smoothstep(d, 0.05, 0.16)); });
  const m = outline(new THREE.Mesh(geo, toon('#ffffff', { vertexColors: true })), 0.016, E);
  const g = new THREE.Group(); g.add(m);
  // rows of little bumps along each arm
  const bumps = cached('starbumps', () => {
    const parts = []; const pos = starGeo().attributes.position;
    for (let i = 0; i < 5; i++) { const a = Math.PI / 2 + i * Math.PI * 2 / 5;
      for (const [r, off] of [[0.1, 0], [0.17, 0.035], [0.17, -0.035], [0.24, 0], [0.3, 0]]) {
        const x = Math.cos(a) * r + Math.cos(a + Math.PI / 2) * off, z = -(Math.sin(a) * r + Math.sin(a + Math.PI / 2) * off);
        const d = Math.hypot(x, z); const y = 0.07 + 0.1 * (1.25 - d * 1.2) + Math.pow(Math.max(0, d - 0.22), 2) * 1.6 + 0.02;
        const sp = new THREE.SphereGeometry(0.022 - r * 0.03, 6, 4); sp.translate(x, y, z); sp.deleteAttribute('uv'); parts.push(sp.toNonIndexed()); }
    }
    return mergeGeometries(parts);
  });
  g.add(new THREE.Mesh(bumps, toon(D)));
  g.rotation.y = Math.random() * 6;
  return g;
}
// Sea grass tuft
export function makeGrass(color = '#4FCB7A', edge = '#1F6A3A') {
  const geo = cached('grass' + Math.floor(Math.random() * 4), () => {
    const R = rng(Math.floor(Math.random() * 1000)); const parts = [];
    for (let i = 0; i < 7; i++) {
      const h = 0.35 + R() * 0.35, lean = (R() - 0.5) * 0.6;
      const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(lean * 0.3, h * 0.5, 0), new THREE.Vector3(lean, h, 0)];
      parts.push(placed(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 6, 0.035, 5), (R() - 0.5) * 0.3, 0, (R() - 0.5) * 0.3, 1, 1, 1, 0, R() * 6, 0));
    }
    const m = bake(parts); m.computeVertexNormals(); return m;
  });
  const g = new THREE.Group(); g.add(outline(new THREE.Mesh(geo, toon(color)), 0.012, edge)); return g;
}

// =====================================================================
// SHARK — cartoon predator, faces +Z (toward the player). mouth 0..1
// =====================================================================
export function makeShark() {
  const root = new THREE.Group();
  const rig = new THREE.Group(); root.add(rig);
  const edge = '#1E2F45';
  const prof = [];
  for (let i = 0; i <= 20; i++) { const t = i / 20; const r = Math.sin(Math.PI * Math.pow(t, 0.75)) * (0.62 - 0.12 * t) + 0.02; prof.push(new THREE.Vector2(Math.max(0.02, r), -1.4 + t * 2.6)); }
  let geo = new THREE.LatheGeometry(prof, 28);
  geo.rotateX(Math.PI / 2);
  geo = smooth(geo);
  const belly = new THREE.Color('#F2F6FA');
  paintGradient(geo, '#7FA6C9', '#7FA6C9', 'y', 0, 1, (c, i, pos) => c.lerp(belly, THREE.MathUtils.smoothstep(-pos.getY(i), 0.05, 0.15)));
  const body = outline(new THREE.Mesh(geo, toon('#ffffff', { vertexColors: true })), 0.04, edge);
  body.scale.set(1.05, 0.95, 1); body.castShadow = true;
  rig.add(body);
  const finM = toon('#6E95BA', { side: THREE.DoubleSide });
  const mkFin = (shape, th = 0.03) => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.ShapeGeometry(shape, 12), finM)); g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(shape.getPoints(30).map(p => new THREE.Vector3(p.x, p.y, 0)), true), 60, th * 0.6, 5, true), basic(edge))); return g; };
  const dS = new THREE.Shape(); dS.moveTo(-0.35, 0); dS.quadraticCurveTo(-0.1, 0.25, 0.15, 0.75); dS.quadraticCurveTo(0.2, 0.3, 0.4, 0); dS.closePath();
  const dorsal = mkFin(dS); dorsal.rotation.y = Math.PI / 2; dorsal.position.set(0, 0.5, -0.1); rig.add(dorsal);
  for (const sx of [-1, 1]) { const pS = new THREE.Shape(); pS.moveTo(0, -0.18); pS.quadraticCurveTo(0.5, -0.3, 0.75, -0.55); pS.quadraticCurveTo(0.4, 0.05, 0, 0.18); pS.closePath(); const f = mkFin(pS); f.scale.setScalar(0.65); f.position.set(sx * 0.5, -0.25, 0.25); f.rotation.set(-0.3, sx > 0 ? 0.4 : Math.PI - 0.4, sx * -0.4); rig.add(f); }
  const tail = new THREE.Group(); tail.position.z = -1.3; rig.add(tail);
  const tS = new THREE.Shape(); tS.moveTo(0, -0.08); tS.quadraticCurveTo(-0.35, -0.35, -0.55, -0.6); tS.quadraticCurveTo(-0.32, 0, -0.7, 0.75); tS.quadraticCurveTo(-0.3, 0.35, 0, 0.08); tS.closePath();
  const tf = mkFin(tS); tf.rotation.y = -Math.PI / 2; tail.add(tf);
  const face = new THREE.Group(); rig.add(face);
  for (const sx of [-1, 1]) {
    const e = placeEye(makeEye(0.15, edge), new THREE.Vector3(sx * 0.3, 0.2, 0.92), new THREE.Vector3(sx * 0.5, 0.1, 1).normalize());
    face.add(e);
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.18, 4, 8), basic(edge));
    brow.position.set(sx * 0.29, 0.4, 0.97); brow.rotation.z = Math.PI / 2 - sx * 0.35; face.add(brow);
  }
  const mouth = new THREE.Group(); mouth.position.set(0, -0.12, 1.04); face.add(mouth);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(1, 24, Math.PI, Math.PI), basic('#5A1E2A')); hole.scale.set(0.34, 0.3, 1); mouth.add(hole);
  const tongue = new THREE.Mesh(new THREE.CircleGeometry(1, 16, Math.PI, Math.PI), basic('#FF7A8A')); tongue.scale.set(0.18, 0.1, 1); tongue.position.set(0, -0.2, 0.002); mouth.add(tongue);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 24, Math.PI), basic(edge)); lip.rotation.z = Math.PI; lip.scale.set(0.34, 0.3, 0.3); mouth.add(lip);
  const topLine = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.66, 4, 8), basic(edge)); topLine.rotation.z = Math.PI / 2; mouth.add(topLine);
  const teeth = cached('teeth', () => { const parts = []; for (let i = 0; i < 6; i++) parts.push(placed(new THREE.ConeGeometry(0.035, 0.08, 6), -0.25 + i * 0.1, -0.04, 0.01, 1, 1, 1, 0, 0, Math.PI)); return bake(parts); });
  mouth.add(new THREE.Mesh(teeth, basic('#FFFFFF')));
  root.userData = { rig, tail, mouth, body, t: 0, open: 0, sick: 0 };
  setSharkMouth(root, 0);
  return root;
}
export function setSharkMouth(s, open) { const u = s.userData; u.open = open; u.mouth.scale.set(1 + open * 0.5, 0.25 + open * 1.9, 1); }
export function animateShark(s, dt, speed = 1) {
  const u = s.userData; u.t += dt * (4 + speed * 4);
  u.tail.rotation.y = Math.sin(u.t) * 0.45;
  u.rig.rotation.y = Math.sin(u.t) * 0.06;
  u.body.material.emissive.setRGB(0.05 * u.sick, 0.25 * u.sick, 0.02 * u.sick);
}

// =====================================================================
// AMBIENT REEF LIFE — same toon look as Cubi
// =====================================================================
// Small reef fish built as 3 merged meshes so whole schools can be instanced:
// body (toon, vertex colours), outline hull, and "ink" (eyes, fin edges)
function colorize(geo, col) {
  geo = geo.index ? geo.toNonIndexed() : geo;
  if (geo.attributes.uv) geo.deleteAttribute('uv');
  const n = geo.attributes.position.count, a = new Float32Array(n * 3), c = new THREE.Color(col);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}
// shapes: radii [x, y, z]
export const REEF_SHAPES = { tang: [0.17, 0.3, 0.42], chromis: [0.17, 0.25, 0.29], butterfly: [0.11, 0.36, 0.36], wrasse: [0.12, 0.19, 0.5], dot: [0.14, 0.17, 0.22], rainbow: [0.12, 0.22, 0.4], parrot: [0.2, 0.28, 0.58], grouper: [0.3, 0.34, 0.68], regal: [0.14, 0.28, 0.46], idol: [0.08, 0.36, 0.3] };
// bright, saturated palettes (body, top, fin, tail, accent)
export const REEF_PALETTES = [
  ['#1E90FF', '#0A5BD8', '#FFE600', '#FFE600', '#0A2A6A'],
  ['#FF2E88', '#D0105E', '#FFB0D8', '#FF7AB8', '#FFFFFF'],
  ['#FFE600', '#FFB800', '#FF7A00', '#FF7A00', '#2E2318'],
  ['#00E0C8', '#00A8B0', '#FF5CB8', '#FF5CB8', '#FF2E88'],
  ['#9B3DFF', '#6A1FD8', '#FFE600', '#FFE600', '#FFE600'],
  ['#FF7A00', '#FF4A00', '#FFFFFF', '#FFD000', '#FFFFFF'],
  ['#7CFF3E', '#2FD04A', '#00C8FF', '#00C8FF', '#0A5BD8'],
  ['#FF3B3B', '#D01818', '#FFD000', '#FFD000', '#FFE600'],
  ['#00C8FF', '#0090E0', '#FF8A00', '#FF8A00', '#FFFFFF'],
  ['#FF5CB8', '#FF2E88', '#7CFF3E', '#7CFF3E', '#9B3DFF'],
  ['#FFB000', '#FF7A00', '#9B3DFF', '#9B3DFF', '#9B3DFF'],
  ['#3DFFB0', '#00C890', '#FF3B8B', '#FFE600', '#1E90FF'],
  // 12-14: parrotfish (turquoise / green / blue with pink face stripes)
  ['#2FE0C0', '#18B0A0', '#FF6FB8', '#FF6FB8', '#FF6FB8'],
  ['#5FE070', '#2FB050', '#FF9AD0', '#9B6BFF', '#FF7FC0'],
  ['#4FA8FF', '#2E70E0', '#FFB0E0', '#00E0C8', '#FF8FD0'],
  // 15-17: groupers (warm, spotty)
  ['#FF9A5C', '#E86A3A', '#FFB87A', '#FFB87A', '#8A3A20'],
  ['#C9A06A', '#9A7040', '#E0C090', '#E0C090', '#5A3A20'],
  ['#FF6B6B', '#D84040', '#FFA0A0', '#FFA0A0', '#FFFFFF'],
  // 18-19: anthias (tiny orange / pink swarm fish)
  ['#FF7A1A', '#FF5A00', '#FFB060', '#FFB060', '#FFD0A0'],
  ['#FF5CA8', '#E83A8A', '#FFB0D8', '#FFA040', '#FFD0E8'],
  // 20: palette surgeonfish (royal blue, black "palette", yellow tail)
  ['#1E5BFF', '#1E5BFF', '#14204A', '#FFD000', '#14204A'],
  // 21: moorish idol (white/yellow, black bands, orange snout)
  ['#FFFDF0', '#FFFDF0', '#FFFFFF', '#1A1A1A', '#1A1A1A'],
  // 22-24: damselfish: blue-green chromis, yellowtail damsel, humbug
  ['#5FE0FF', '#3FB8F0', '#9AF0FF', '#9AF0FF', '#2A6A9A'],
  ['#1E5BFF', '#0A3AC8', '#3E8BFF', '#FFE600', '#FFE600'],
  ['#FFFFFF', '#F4F4F4', '#1A1A1A', '#FFFFFF', '#1A1A1A'],
];
const SPECIES = [
  { w: 4, gen: () => ({ shape: 'chromis', pattern: 'plain', pal: 18 + (Math.random() < 0.35 ? 1 : 0), n: 18 + Math.floor(Math.random() * 14), size: 0.32 + Math.random() * 0.12 }) },
  { w: 5, gen: () => ({}) },                                                                      // random reef fish
  { w: 2, gen: () => ({ shape: 'rainbow', pattern: 'rainbow', pal: 0, n: 6 + Math.floor(Math.random() * 8) }) },
  { w: 1.5, gen: () => ({ shape: 'parrot', pattern: 'face', pal: 12 + Math.floor(Math.random() * 3), n: 1 + Math.floor(Math.random() * 3), size: 1.3 + Math.random() * 0.5 }) },
  { w: 2, gen: () => ({ shape: 'regal', pattern: 'regal', pal: 20, n: 1 + Math.floor(Math.random() * 4), size: 1.0 + Math.random() * 0.4 }) },
  { w: 1.5, gen: () => ({ shape: 'idol', pattern: 'idol', pal: 21, n: 1 + Math.floor(Math.random() * 3), size: 1.1 + Math.random() * 0.4 }) },
  { w: 3, gen: () => { const k = Math.floor(Math.random() * 3); return { shape: 'chromis', pattern: k === 1 ? 'ytail' : k === 2 ? 'humbug' : 'plain', pal: 22 + k, n: 8 + Math.floor(Math.random() * 12), size: 0.4 + Math.random() * 0.15 }; } },
  { w: 1, gen: () => ({ shape: 'grouper', pattern: 'dots', pal: 15 + Math.floor(Math.random() * 3), n: 1 + (Math.random() < 0.3 ? 1 : 0), size: 1.7 + Math.random() * 0.6 }) },
];
const PATTERNS = ['plain', 'plain', 'band', 'line', 'bars', 'nose'];
const fishGeoCache = {};
export function reefFishGeometries(shape, pal, pattern) {
  const key = shape + pal + pattern;
  if (fishGeoCache[key]) return fishGeoCache[key];
  const [B, T, F, TL, A] = REEF_PALETTES[pal];
  const [rx, ry, rz] = REEF_SHAPES[shape];
  const big = shape === 'grouper' || shape === 'parrot';
  const fine = ['regal', 'idol', 'humbug', 'ytail'].includes(pattern);
  let body = new THREE.SphereGeometry(1, big ? 36 : fine ? 28 : 12, big ? 26 : fine ? 20 : 9); body.scale(rx, ry, rz);
  const p = body.attributes.position;
  if (shape === 'idol') for (let i = 0; i < p.count; i++) { const z = p.getZ(i); if (z < -rz * 0.4) { const k = (-z / rz - 0.4) / 0.6; p.setY(i, p.getY(i) * (1 - 0.65 * k)); p.setZ(i, z - k * k * rz * 0.45); } }
  for (let i = 0; i < p.count; i++) { const z = p.getZ(i); if (z > 0) { const k = z / rz; p.setY(i, p.getY(i) * (1 - 0.4 * k * k)); p.setX(i, p.getX(i) * (1 - 0.3 * k * k)); } }
  body.deleteAttribute('uv'); body.deleteAttribute('normal'); body = mergeVertices(body); body.computeVertexNormals();
  const cb = new THREE.Color(B), ct = new THREE.Color(T), ca = new THREE.Color(A), cw = new THREE.Color('#FFFFFF');
  paintGradient(body, B, B, 'y', 0, 1, (c, i, pos) => {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), zn = z / rz, yn = y / ry;
    c.copy(cb).lerp(ct, THREE.MathUtils.smoothstep(yn, 0.3, 0.5));
    if (yn < -0.45) c.lerp(cw, 0.35);                                                   // light belly
    if (pattern === 'band' && Math.abs(zn + 0.42) < 0.09) c.copy(ca);
    if (pattern === 'line' && Math.abs(yn + 0.05) < 0.14 && zn > -0.6) c.copy(ca);
    if (pattern === 'bars' && zn > -0.2 && Math.abs(((zn + 1) * 4) % 1 - 0.5) < 0.12) c.copy(ca);
    if (pattern === 'spots' && yn > 0 && Math.abs(Math.sin(zn * 14) * Math.sin(Math.atan2(x, y) * 6)) > 0.85) c.copy(ca);
    if (pattern === 'nose' && zn < -0.62) c.copy(ca);
    if (pattern === 'rainbow') { const h = ((zn + 1) * 0.42 + yn * 0.08) % 1; c.setHSL(h, 1, 0.58 + Math.max(0, yn) * 0.12); }
    if (pattern === 'face') { if (zn < -0.8) c.set('#F2FFFA'); else if (Math.abs(zn + 0.42 + yn * 0.15) < 0.05 || Math.abs(zn + 0.6 - yn * 0.1) < 0.035) c.copy(ca); }
    if (pattern === 'regal') {
      const inSpot = ((zn - 0.02) / 0.3) ** 2 + ((yn - 0.38) / 0.2) ** 2 < 1;
      if (yn > 0.0 && zn > -0.55 && zn < 0.62 && !inSpot) c.copy(ca);                          // the black "palette"
      if (zn > 0.5 && Math.abs(yn - (0.2 - (zn - 0.5) * 0.9)) < 0.17) c.copy(ca);               // sweeps down to the tail
      if (zn > 0.86) c.set('#FFD000');                                                           // yellow tail base
    }
    if (pattern === 'idol') {
      c.set(zn > 0.3 ? '#FFE600' : '#FFFDF0');
      if (Math.abs(zn + 0.28) < 0.17 || Math.abs(zn - 0.4) < 0.12) c.copy(ca);
      if (zn < -0.7 && yn > -0.1) c.set('#FF8A00');
    }
    if (pattern === 'ytail' && zn > 0.55) c.set('#FFE600');
    if (pattern === 'humbug' && (Math.abs(zn + 0.45) < 0.13 || Math.abs(zn - 0.2) < 0.14 || zn > 0.8)) c.copy(ca);
    if (pattern === 'dots') { const a = Math.atan2(x, y); if (Math.sin(zn * 16) > 0.75 && Math.sin(a * 9) > 0.7 && zn > -0.75) c.copy(ca); if (zn < -0.88 && Math.abs(yn) < 0.3) c.copy(ct); }
  });
  const hull = body.clone();
  const parts = [];
  const add = (g, m, col) => { g.applyMatrix4(m); parts.push(colorize(g, col)); };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
  const tailM = m4.clone().compose(new THREE.Vector3(0, 0, rz * 0.9), q.clone().setFromEuler(e.set(0, -Math.PI / 2, 0)), one);
  const dorsM = m4.clone().compose(new THREE.Vector3(0, ry * 0.85, rz * 0.1), q.clone().setFromEuler(e.set(-1.1, -Math.PI / 2, 0, 'XYZ')), one);
  add(new THREE.ShapeGeometry(fanPath(rz * 0.75, 0.9, 1), 12), tailM, TL);
  add(new THREE.ShapeGeometry(fanPath(ry * 0.8, 0.6), 10), dorsM, F);
  for (const sx of [-1, 1]) add(new THREE.ShapeGeometry(fanPath(rx * 1.4, 0.55), 10), m4.clone().compose(new THREE.Vector3(sx * rx * 0.9, -ry * 0.2, -rz * 0.1), q.clone().setFromEuler(e.set(0, sx > 0 ? -Math.PI / 4 : -3 * Math.PI / 4, 0)), one), F);
  let streamer = null;
  if (shape === 'idol') { streamer = new THREE.Shape(); streamer.moveTo(-0.1, 0); streamer.quadraticCurveTo(0.0, 0.55, 0.62, 0.78); streamer.quadraticCurveTo(0.05, 0.42, 0.1, 0); streamer.closePath(); add(new THREE.ShapeGeometry(streamer, 16), m4.clone().compose(new THREE.Vector3(0, ry * 0.75, -rz * 0.15), q.clone().setFromEuler(e.set(0, -Math.PI / 2, 0)), one), '#FFFFFF'); }
  const bodyAll = mergeGeometries([body.toNonIndexed(), ...parts]);
  const ink = [];
  const inkAdd = (g, m, col) => { g.applyMatrix4(m); g.deleteAttribute('normal'); ink.push(colorize(g, col)); };
  const er = Math.min(rx, ry) * 0.62;
  for (const sx of [-1, 1]) {
    const ep = new THREE.Vector3(sx * rx * 0.72, ry * 0.18, -rz * 0.55);
    inkAdd(new THREE.SphereGeometry(er, big ? 20 : 10, big ? 14 : 7), m4.clone().compose(ep, q.identity(), one), '#ffffff');
    inkAdd(new THREE.SphereGeometry(er * 0.62, big ? 16 : 8, big ? 12 : 6), m4.clone().compose(ep.clone().add(new THREE.Vector3(sx * er * 0.78, 0, -er * 0.12)), q.identity(), new THREE.Vector3(0.55, 1, 1)), '#1F1A2E');
    inkAdd(new THREE.SphereGeometry(er * 0.2, 6, 4), m4.clone().compose(ep.clone().add(new THREE.Vector3(sx * er * 1.08, er * 0.3, -er * 0.22)), q.identity(), one), '#ffffff');
  }
  const tube = (shapeP, m) => { const pts = shapeP.getPoints(30).map(v => new THREE.Vector3(v.x, v.y, 0)); inkAdd(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 32, 0.008, 4, true), m, OUTLINE); };
  tube(fanPath(rz * 0.75, 0.9, 1), tailM); tube(fanPath(ry * 0.8, 0.6), dorsM);
  if (streamer) tube(streamer, m4.clone().compose(new THREE.Vector3(0, ry * 0.75, -rz * 0.15), q.clone().setFromEuler(e.set(0, -Math.PI / 2, 0)), one));
  const res = { body: bodyAll, hull, ink: mergeGeometries(ink), len: rz };
  return (fishGeoCache[key] = res);
}
// tail wag in the vertex shader, phase per instance
function bendMaterial(mat, amp = 0.35) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uT = { value: 0 }; mat.userData.sh = sh;
    sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float ph = float(gl_InstanceID) * 1.37; float sp = 7.0 + mod(float(gl_InstanceID), 4.0) * 1.6;
      float bz = max(0.0, transformed.z);
      transformed.x += sin(uT * sp + ph) * bz * bz * ${amp.toFixed(2)} * 4.0;`);
    if (mat.userData.hull) sh.vertexShader = sh.vertexShader.replace('transformed += normalize(normal) * uThick;', '');
  };
  return mat;
}
export function makeSchool(shape, n, pal, pattern, size) {
  const R = Math.random;
  if (shape == null) { const tot = SPECIES.reduce((a, b) => a + b.w, 0); let r = R() * tot; const sp = SPECIES.find(x => (r -= x.w) < 0) || SPECIES[0]; const o = sp.gen(); shape = o.shape; pattern = o.pattern; pal = o.pal; n = o.n; size = o.size; }
  shape ??= ['tang', 'chromis', 'butterfly', 'wrasse', 'dot'][Math.floor(R() * 5)];
  pal ??= Math.floor(R() * 12);
  pattern ??= PATTERNS[Math.floor(R() * PATTERNS.length)];
  if (n == null) { const r = R(); n = r < 0.12 ? 1 : r < 0.4 ? 2 + Math.floor(R() * 3) : r < 0.8 ? 5 + Math.floor(R() * 5) : 10 + Math.floor(R() * 6); }
  size ??= n === 1 ? 1.7 + R() * 0.7 : n < 5 ? 0.9 + R() * 0.7 : n < 10 ? 0.6 + R() * 0.6 : 0.45 + R() * 0.35;
  const G = reefFishGeometries(shape, pal, pattern);
  const g = new THREE.Group();
  const bodyMat = bendMaterial(new THREE.MeshToonMaterial({ color: '#ffffff', vertexColors: true, gradientMap: fishGradient(), side: THREE.DoubleSide }));
  const hullMat = new THREE.MeshBasicMaterial({ color: OUTLINE, side: THREE.BackSide });
  hullMat.onBeforeCompile = (sh) => { sh.uniforms.uT = { value: 0 }; hullMat.userData.sh = sh; sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      transformed += normalize(normal) * 0.012;
      float ph = float(gl_InstanceID) * 1.37; float sp = 7.0 + mod(float(gl_InstanceID), 4.0) * 1.6; float bz = max(0.0, transformed.z);
      transformed.x += sin(uT * sp + ph) * bz * bz * 1.4;`); };
  hullMat.customProgramCacheKey = () => 'schoolhull';
  const inkMat = bendMaterial(new THREE.MeshBasicMaterial({ vertexColors: true }));
  const meshes = [new THREE.InstancedMesh(G.hull, hullMat, n), new THREE.InstancedMesh(G.body, bodyMat, n), new THREE.InstancedMesh(G.ink, inkMat, n)];
  meshes.forEach(m => { m.frustumCulled = false; g.add(m); });
  const spread = 0.55 + Math.sqrt(n) * 0.45 * size;
  const fish = [];
  for (let i = 0; i < n; i++) fish.push({
    o: new THREE.Vector3((R() - 0.5) * spread * 1.4, (R() - 0.5) * spread * 0.7, (R() - 0.5) * spread * 1.4),
    f: [0.25 + R() * 0.9, 0.3 + R() * 1.1, 0.2 + R() * 0.8, 0.5 + R() * 1.5], ph: [R() * 6, R() * 6, R() * 6, R() * 6],
    a: (0.25 + R() * 0.5) * Math.max(0.6, size), s: size * (0.8 + R() * 0.4), dart: new THREE.Vector3(), nextDart: R() * 4, prev: new THREE.Vector3(), yaw: 0, pitch: 0,
  });
  g.userData = { meshes, fish, mats: [bodyMat, hullMat, inkMat], t: R() * 10, n, size };
  animateSchool(g, 0.016);
  return g;
}
let _fishGrad = null;
function fishGradient() { if (_fishGrad) return _fishGrad; const d = new Uint8Array([190, 190, 190, 255, 238, 238, 238, 255, 255, 255, 255, 255]); _fishGrad = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); _fishGrad.minFilter = _fishGrad.magFilter = THREE.NearestFilter; _fishGrad.generateMipmaps = false; _fishGrad.needsUpdate = true; return _fishGrad; }
let _toonRef = null; function toonGradientRef() { if (!_toonRef) _toonRef = toon('#fff').gradientMap; return _toonRef; }
const _sm = new THREE.Matrix4(), _sq = new THREE.Quaternion(), _sv = new THREE.Vector3(), _ss = new THREE.Vector3(), _se = new THREE.Euler();
export function animateSchool(g, dt) {
  const u = g.userData; u.t += dt;
  u.mats.forEach(m => { if (m.userData.sh) m.userData.sh.uniforms.uT.value = u.t; });
  const t = u.t;
  u.fish.forEach((f, i) => {
    // each fish wanders on its own little path, and now and then darts off
    f.nextDart -= dt;
    if (f.nextDart < 0) { f.nextDart = 1.5 + Math.random() * 4; f.dart.set((Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 2.4).multiplyScalar(u.size); }
    f.dart.multiplyScalar(Math.pow(0.35, dt));
    _sv.set(
      f.o.x + Math.sin(t * f.f[0] + f.ph[0]) * f.a + Math.sin(t * f.f[3] * 1.7 + f.ph[3]) * f.a * 0.35,
      f.o.y + Math.sin(t * f.f[1] + f.ph[1]) * f.a * 0.5,
      f.o.z + Math.cos(t * f.f[2] + f.ph[2]) * f.a + Math.sin(t * f.f[3] + f.ph[1]) * f.a * 0.3,
    ).addScaledVector(f.dart, -0.6);
    if (dt > 0) {
      const vx = (_sv.x - f.prev.x) / dt, vy = (_sv.y - f.prev.y) / dt;
      f.yaw += (THREE.MathUtils.clamp(-vx * 0.35, -0.9, 0.9) - f.yaw) * Math.min(1, dt * 4);
      f.pitch += (THREE.MathUtils.clamp(vy * 0.3, -0.5, 0.5) - f.pitch) * Math.min(1, dt * 4);
    }
    f.prev.copy(_sv);
    _sq.setFromEuler(_se.set(f.pitch, f.yaw, -f.yaw * 0.3)); _ss.setScalar(f.s);
    _sm.compose(_sv, _sq, _ss); u.meshes.forEach(m => m.setMatrixAt(i, _sm));
  });
  u.meshes.forEach(m => m.instanceMatrix.needsUpdate = true);
}

// Sea turtle — big, slow and friendly. Faces -Z.
export function makeTurtle(baby = false) {
  const root = new THREE.Group(); const rig = new THREE.Group(); root.add(rig);
  const edge = '#1F4A3A';
  const HS = baby ? 1.45 : 1, ES = baby ? 1.6 : 1;
  let shell = new THREE.SphereGeometry(1, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2); shell.scale(0.85, 0.58, 1.05);
  shell = smooth(shell);
  const shellM = outline(new THREE.Mesh(shell, toon(baby ? '#6FD08A' : '#5FB86A')), 0.035, edge); rig.add(shellM);
  const under = outline(new THREE.Mesh(smooth(new THREE.CylinderGeometry(0.86, 0.8, 0.12, 40)), toon('#F2E3A8')), 0.03, edge);
  under.scale.set(1, 1, 1.22); under.position.y = -0.02; rig.add(under);
  // shell patches
  const patch = toon(baby ? '#4FB878' : '#3F9A55');
  const R = rng(4);
  for (const [x, z, r] of [[0, 0, 0.26], [0, 0.48, 0.2], [0, -0.48, 0.2], [0.42, 0.22, 0.18], [-0.42, 0.22, 0.18], [0.42, -0.25, 0.18], [-0.42, -0.25, 0.18]]) {
    const d = new THREE.Mesh(new THREE.CircleGeometry(r, 6), patch);
    if (stickFrom(shellM, new THREE.Vector3(x, 3, z), new THREE.Vector3(0, -1, 0), d, 0.01)) { d.rotateZ(R() * 3); rig.add(d); }
  }
  const skin = toon(baby ? '#B4E89A' : '#9ED48A');
  const headG = new THREE.Group(); headG.position.set(0, 0.12, -1.15); headG.scale.setScalar(HS); if (baby) headG.position.z = -1.25; rig.add(headG);
  const head = outline(new THREE.Mesh(smooth(new THREE.SphereGeometry(0.3, 28, 20)), skin), 0.03, edge);
  head.scale.set(1, 0.85, 1.15); headG.add(head);
  for (const sx of [-1, 1]) {
    const e = placeEye(makeEye(0.09 * ES / HS * (baby ? 0.95 : 1), edge), new THREE.Vector3(sx * 0.17, 0.1, -0.15), new THREE.Vector3(sx * 0.6, 0.2, -1).normalize()); headG.add(e);
    const b = decal(0.05, 0.03, '#FF8FA3', 0.6); b.position.set(sx * 0.2, -0.06, -0.21); b.rotation.y = Math.PI + sx * 0.5; headG.add(b);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.014, 8, 20, Math.PI), basic(edge)); smile.position.set(0, -0.07, -0.33); smile.rotation.set(0, Math.PI, Math.PI); headG.add(smile);
  const flip = (len, w) => { const s = new THREE.Shape(); s.moveTo(0, -w * 0.5); s.quadraticCurveTo(len * 0.6, -w * 0.9, len, -w * 0.15); s.quadraticCurveTo(len * 0.7, w * 0.6, 0, w * 0.5); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 }); g.rotateX(Math.PI / 2); return outline(new THREE.Mesh(smooth(g), skin), 0.022, edge); };
  const flippers = [];
  for (const [sx, z, len, w] of [[-1, -0.55, 0.85, 0.4], [1, -0.55, 0.85, 0.4], [-1, 0.6, 0.45, 0.28], [1, 0.6, 0.45, 0.28]]) {
    const piv = new THREE.Group(); piv.position.set(sx * 0.7, 0.02, z); const f = flip(len, w); if (sx < 0) f.scale.x = -1; f.rotation.y = sx * 0.4 * (z < 0 ? 1 : -1.5); piv.add(f); rig.add(piv); flippers.push({ piv, sx, front: z < 0 });
  }
  root.userData = { rig, flippers, t: Math.random() * 10 };
  return root;
}
export function animateTurtle(tu, dt) {
  const u = tu.userData; u.t += dt * 1.6;
  u.flippers.forEach(f => { f.piv.rotation.z = f.sx * Math.sin(u.t + (f.front ? 0 : 1)) * (f.front ? 0.5 : 0.25); f.piv.rotation.y = f.sx * Math.cos(u.t) * 0.15; });
  u.rig.position.y = Math.sin(u.t) * 0.06; u.rig.rotation.x = Math.sin(u.t + 0.5) * 0.04;
}

// Giant clam that opens and closes, with a shiny pearl
export function makeClam(color = '#B48CFF', inner = '#FFD0EA', edge = '#3E2370') {
  const g = new THREE.Group();
  const halfGeo = cached('clam', () => {
    let s = new THREE.SphereGeometry(0.6, 48, 16, 0, Math.PI, 0, Math.PI / 2);
    const p = s.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const a = Math.atan2(z, x); const k = 1 + 0.06 * Math.cos(a * 9); p.setXYZ(i, x * k, y * 0.55 * k, z * k); }
    s.computeVertexNormals(); return s;
  });
  const mat = toon(color, { side: THREE.DoubleSide });
  const bottom = outline(new THREE.Mesh(halfGeo, mat), 0.025, edge); bottom.rotation.x = Math.PI; bottom.position.y = 0.33;
  const lid = new THREE.Group(); lid.position.set(0, 0.33, 0);
  const top = outline(new THREE.Mesh(halfGeo, mat), 0.025, edge); lid.add(top);
  const flesh = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32, 0, Math.PI), toon(inner, { side: THREE.DoubleSide })); flesh.rotation.x = -Math.PI / 2; flesh.position.y = 0.335;
  const pearl = makePearl(); pearl.scale.setScalar(0.9); pearl.position.set(0, 0.48, 0.2);
  g.add(bottom, lid, flesh, pearl);
  g.userData = { lid, t: Math.random() * 10 };
  return g;
}
export function animateClam(c, dt) { const u = c.userData; u.t += dt; const o = Math.max(0, Math.sin(u.t * 0.8)); u.lid.rotation.x = -0.15 - o * 0.85; }

// Barrel sponge
export function makeSponge(color = COR.orange, scale = 1) {
  const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(0.28 + Math.pow(t, 1.6) * 0.32 + Math.sin(t * 9) * 0.015, t * 1.0)); }
  const geo = new THREE.LatheGeometry(pts, 36);
  const m = outline(new THREE.Mesh(geo, toon(color[0], { side: THREE.DoubleSide })), 0.028, color[1]); m.castShadow = true;
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.56, 32), basic(color[1])); hole.rotation.x = -Math.PI / 2; hole.position.y = 0.75;
  const rim = outline(new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.045, 10, 40), toon(color[0])), 0.02, color[1]); rim.rotation.x = Math.PI / 2; rim.position.y = 1.0;
  const g = new THREE.Group(); g.add(m, hole, rim); g.scale.setScalar(scale); return g;
}
// Mushroom coral — low, round, with soft radial ridges
export function makeMushroom(color = COR.teal, scale = 1) {
  const geo = cached('mush', () => {
    const g = new THREE.SphereGeometry(0.6, 44, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const p = g.attributes.position; const ridge = [];
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const a = Math.atan2(z, x); const r = 0.5 + 0.5 * Math.cos(a * 22); ridge.push(r); p.setXYZ(i, x, y * 0.32 + r * 0.012, z); }
    g.computeVertexNormals();
    paintGradient(g, '#ffffff', '#ffffff', 'y', 0, 1, (c, i, pos) => { if (ridge[i] > 0.8 && pos.getY(i) < 0.17) c.setRGB(0.78, 0.78, 0.78); });
    return g;
  });
  const m = outline(new THREE.Mesh(geo, toon(color[0], { vertexColors: true })), 0.025, color[1]);
  const c = new THREE.Mesh(new THREE.CircleGeometry(0.08, 16), basic('#FFF3B0')); c.rotation.x = -Math.PI / 2; c.position.y = 0.205;
  const g = new THREE.Group(); g.add(m, c); g.scale.setScalar(scale); return g;
}
// Rock arch for the far background
export function makeArch(scale = 1, seed = 3) {
  let geo = new THREE.TorusGeometry(2.2, 0.75, 16, 40, Math.PI);
  const p = geo.attributes.position; const R = rng(seed);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = 1 + Math.sin(x * 2.1 + seed) * 0.05 + Math.cos(y * 1.7 + z * 2) * 0.05; p.setXYZ(i, x * k, y * k, z * k * 1.1); }
  geo = smooth(geo);
  const m = outline(new THREE.Mesh(geo, toon('#6A5A9A')), 0.05, '#2A2050'); m.castShadow = true;
  const g = new THREE.Group(); g.add(m);
  // corals growing on top
  const tops = [[-1.6, 2.0, makeBranchCoral(COR.pink, 5, 0.6)], [0.2, 2.9, makeBubbleCoral(0.5, 3)], [1.5, 2.1, makeStaghorn(COR.red, 9, 0.55)], [-0.6, 2.85, makeMushroom(COR.green, 0.6)]];
  tops.forEach(([x, y, c]) => { c.position.set(x, y, 0); g.add(c); });
  g.scale.setScalar(scale); return g;
}

// Bubble vent: a little rock that keeps puffing bubbles
export function makeVent() {
  const g = new THREE.Group();
  const r = makeRock(0.45, 7); g.add(r);
  const geo = new THREE.SphereGeometry(1, 10, 7);
  const n = 9;
  const bub = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: '#E8FBFF', transparent: true, opacity: 0.85 }), n);
  const ring = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: '#5FB8D8', side: THREE.BackSide }), n);
  bub.frustumCulled = ring.frustumCulled = false;
  g.add(ring, bub);
  g.userData = { bub, ring, n, t: Math.random() * 10 };
  return g;
}
const _vm = new THREE.Matrix4(), _vq = new THREE.Quaternion(), _vp = new THREE.Vector3(), _vs = new THREE.Vector3();
export function animateVent(v, dt) {
  const u = v.userData; u.t += dt;
  for (let i = 0; i < u.n; i++) {
    const off = i / u.n, ph = i * 1.7, sz = 0.05 + (i % 3) * 0.025;
    const k = (u.t * 0.35 + off) % 1;
    _vp.set(Math.sin(k * 9 + ph) * 0.12, 0.3 + k * 6, Math.cos(k * 7 + ph) * 0.1);
    const s = sz * (1 + k * 0.8);
    _vm.compose(_vp, _vq, _vs.setScalar(s)); u.bub.setMatrixAt(i, _vm);
    _vm.compose(_vp, _vq, _vs.setScalar(s * 1.15)); u.ring.setMatrixAt(i, _vm);
  }
  u.bub.instanceMatrix.needsUpdate = true; u.ring.instanceMatrix.needsUpdate = true;
}
export { basic, smooth, bake, placed, colorize, branchGeo, decal, placeEye, stickFrom, cached };
