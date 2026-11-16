// Hard corals for the review page (Komodo reef): crisp toon look, painted detail, a few with living polyps.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toonGradient, outline } from './materials.js';

const OUT = '#3B2614';
const V = (x, y, z) => new THREE.Vector3(x, y, z), UP = V(0, 1, 0);
let seed = 1; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const vmat = (o = {}) => new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGradient(), map: o.map || null, side: o.side || THREE.FrontSide, emissive: new THREE.Color(o.emissive || '#000') });
const cmat = (color, o = {}) => new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), side: o.side || THREE.FrontSide, emissive: new THREE.Color(o.emissive || '#000'), transparent: !!o.opacity, opacity: o.opacity ?? 1 });
const lined = (m, t = 0.014) => outline(m, t, OUT);
function paint(g, fn) { const p = g.attributes.position, a = new Float32Array(p.count * 3), c = new THREE.Color(); for (let i = 0; i < p.count; i++) { fn(c, p.getX(i), p.getY(i), p.getZ(i)); a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
const solid = (g, col) => { const k = new THREE.Color(col); return paint(g, c => c.copy(k)); };
let _pore = null;
function poreTex() {   // tiny corallite pores, multiplies the vertex colours
  if (_pore) return _pore;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.beginPath(); g.arc((x + (y % 2) * 0.5) * 16 + 4, y * 16 + 8, 3.2, 0, 7); g.fillStyle = '#B8B0B8'; g.fill(); }
  _pore = new THREE.CanvasTexture(cv); _pore.wrapS = _pore.wrapT = THREE.RepeatWrapping; _pore.colorSpace = THREE.SRGBColorSpace; return _pore;
}
const place = (g, p, d, s = 1) => g.applyMatrix4(new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize()), V(s, s, s)));
function bend(d, ang, upPull = 0.25) { let ax = new THREE.Vector3().crossVectors(d, V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5)).normalize(); if (!ax.lengthSq()) ax = V(1, 0, 0); return d.clone().applyAxisAngle(ax, ang).lerp(UP, upPull).normalize(); }

// 1 STAGHORN (Acropora): forest of branching antlers, pale glowing tips
function makeStaghorn() {
  seed = 3; const parts = [], tips = [];
  const br = (p, d, len, r, depth) => {
    const g = new THREE.CylinderGeometry(r * 0.8, r, len, 8, 2, true); g.translate(0, len / 2, 0); parts.push(place(g, p, d));
    const e = p.clone().addScaledVector(d, len);
    if (depth === 0) { tips.push(place(new THREE.SphereGeometry(r * 0.95, 8, 6), e, d)); return; }
    parts.push(place(new THREE.SphereGeometry(r * 0.8, 8, 6), e, d));
    const n = rnd() < 0.55 ? 2 : 3; for (let k = 0; k < n; k++) br(e, bend(d, 0.45 + rnd() * 0.35, 0.3), len * (0.78 + rnd() * 0.12), r * 0.8, depth - 1);
  };
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + rnd() * 0.4; br(V(Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12), V(Math.cos(a) * 0.55, 1, Math.sin(a) * 0.55).normalize(), 0.28, 0.06, 4); }
  const body = mergeGeometries(parts.map(g => g.toNonIndexed())); body.computeBoundingBox(); const top = body.boundingBox.max.y;
  const a = new THREE.Color('#5A4AA8'), b = new THREE.Color('#9AA8F0'); paint(body, (c, x, y) => c.copy(a).lerp(b, Math.min(1, y / top)));
  const g = new THREE.Group(); g.add(lined(new THREE.Mesh(body, vmat({ map: poreTex() })), 0.012));
  g.add(new THREE.Mesh(mergeGeometries(tips), cmat('#E6F4FF', { emissive: '#3A5A8A' })));
  return g;
}

// 2 TABLE CORAL (Acropora table): stalk + wide flat plate covered in tiny upright branchlets
function makeTable() {
  seed = 7; const g = new THREE.Group();
  const stalk = new THREE.CylinderGeometry(0.08, 0.14, 0.42, 12); stalk.translate(0, 0.21, 0); g.add(lined(new THREE.Mesh(stalk, cmat('#8A7A5A'))));
  const plate = new THREE.CylinderGeometry(0.8, 0.72, 0.06, 64, 1); const p = plate.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z), a = Math.atan2(z, x), k = 1 + 0.07 * Math.sin(a * 7) + 0.04 * Math.sin(a * 13 + 1); if (r > 0.1) { p.setX(i, x * k); p.setZ(i, z * k); } p.setY(i, p.getY(i) + r * r * 0.12); }
  plate.computeVertexNormals(); plate.translate(0, 0.44, 0);
  paint(plate, (c, x, y) => c.set(y < 0.44 ? '#6A5A3A' : '#A8B878'));
  g.add(lined(new THREE.Mesh(plate, vmat()), 0.012));
  const N = 320, bl = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.018, 0.06, 2, 6), cmat('#ffffff'), N), m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  for (let i = 0; i < N; i++) { const a = i * 2.39996, r = Math.sqrt((i + 0.5) / N) * 0.78, out = Math.max(0, (r - 0.55) / 0.25); const d = V(Math.cos(a) * out * 1.4, 1, Math.sin(a) * out * 1.4).normalize();
    m.compose(V(Math.cos(a) * r, 0.5 + r * r * 0.12, Math.sin(a) * r), q.setFromUnitVectors(UP, d), V(1, 1 + rnd() * 0.4, 1)); bl.setMatrixAt(i, m); bl.setColorAt(i, c.set('#B8C878').lerp(new THREE.Color('#8AE0D8'), r / 0.8)); }
  bl.instanceColor.needsUpdate = true; g.add(bl);
  return g;
}

// 3 CAULIFLOWER CORAL (Pocillopora): round clump of short knobby pink branches
function makeCauliflower() {
  seed = 11; const parts = [], col = new THREE.Color('#F27AA0'), tip = new THREE.Color('#FFD2E0');
  for (let k = 0; k < 34; k++) {
    const y = rnd(), a = rnd() * Math.PI * 2, d = V(Math.cos(a) * (1 - y * 0.7), 0.5 + y, Math.sin(a) * (1 - y * 0.7)).normalize(), len = 0.3 + rnd() * 0.18;
    const cyl = new THREE.CylinderGeometry(0.05, 0.07, len, 8); cyl.translate(0, len / 2, 0); parts.push(solid(place(cyl, V(0, 0.05, 0), d), '#E06890'));
    const e = d.clone().multiplyScalar(len).add(V(0, 0.05, 0));
    for (let j = 0; j < 5; j++) { const s = new THREE.SphereGeometry(0.045 + rnd() * 0.03, 8, 6); s.translate(e.x + (rnd() - 0.5) * 0.09, e.y + (rnd() - 0.2) * 0.07, e.z + (rnd() - 0.5) * 0.09); parts.push(solid(s, j ? col : tip)); }
  }
  const g = new THREE.Group(); g.add(lined(new THREE.Mesh(mergeGeometries(parts.map(p => p.toNonIndexed())), vmat({ map: poreTex() })), 0.012)); g.scale.setScalar(1.25);
  return g;
}

// 4 BRAIN CORAL (Platygyra): lumpy dome covered in long meandering ridges, tan crests over bright green valleys
function vnoise(x, y, z) { const h = (i, j, k) => { let n = (i * 374761393 + j * 668265263 + k * 1274126177) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967295; };
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), f = (t) => t * t * (3 - 2 * t), u = f(x - xi), v = f(y - yi), w = f(z - zi), L = THREE.MathUtils.lerp;
  return L(L(L(h(xi, yi, zi), h(xi + 1, yi, zi), u), L(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v), L(L(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), L(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v), w); }
let _maze = null;
function brainMaze() {   // Gray-Scott reaction-diffusion in the labyrinth regime: real brain-coral meanders
  if (_maze) return _maze; const N = 160, A = new Float32Array(N * N).fill(1), B = new Float32Array(N * N), A2 = new Float32Array(N * N), B2 = new Float32Array(N * N);
  seed = 77; for (let i = 0; i < 60; i++) { const cx = (rnd() * N) | 0, cy = (rnd() * N) | 0; for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) { const j = ((cy + y + N) % N) * N + (cx + x + N) % N; A[j] = 0.5; B[j] = 0.25; } }
  const F = 0.029, K = 0.057; let a = A, bb = B, a2 = A2, b2 = B2;
  for (let it = 0; it < 4200; it++) { for (let y = 0; y < N; y++) { const yu = ((y + N - 1) % N) * N, yd = ((y + 1) % N) * N, yc = y * N;
      for (let x = 0; x < N; x++) { const xl = (x + N - 1) % N, xr = (x + 1) % N, i = yc + x, A0 = a[i], B0 = bb[i];
        const la = a[yc + xl] + a[yc + xr] + a[yu + x] + a[yd + x] - 4 * A0, lb = bb[yc + xl] + bb[yc + xr] + bb[yu + x] + bb[yd + x] - 4 * B0, r = A0 * B0 * B0;
        a2[i] = A0 + 0.2 * la - r + F * (1 - A0); b2[i] = B0 + 0.1 * lb + r - (K + F) * B0; } }
    [a, a2] = [a2, a]; [bb, b2] = [b2, bb]; }
  let mn = 1, mx = 0; for (const v of bb) { mn = Math.min(mn, v); mx = Math.max(mx, v); }
  _maze = { N, f: Float32Array.from(bb, v => (v - mn) / (mx - mn)) }; return _maze;
}
function mazeAt(u, v) { const { N, f } = brainMaze(); u = ((u % 1) + 1) % 1 * N; v = ((v % 1) + 1) % 1 * N; const x0 = Math.floor(u), y0 = Math.floor(v), fx = u - x0, fy = v - y0, g = (x, y) => f[(y % N) * N + (x % N)];
  return (g(x0, y0) * (1 - fx) + g(x0 + 1, y0) * fx) * (1 - fy) + (g(x0, y0 + 1) * (1 - fx) + g(x0 + 1, y0 + 1) * fx) * fy; }
function makeBrain() {
  const geo = new THREE.SphereGeometry(0.62, 240, 120, 0, Math.PI * 2, 0, Math.PI * 0.6), p = geo.attributes.position, hull = geo.clone();
  const ridge = new Float32Array(p.count), lo = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)).normalize(), ph = Math.acos(Math.min(1, v.y)), th = Math.atan2(v.z, v.x);
    const m = mazeAt(0.5 + ph * Math.cos(th) * 0.33, 0.5 + ph * Math.sin(th) * 0.33), r = THREE.MathUtils.smoothstep(m, 0.22, 0.7);
    lo[i] = THREE.MathUtils.smoothstep(ph, 1.4, 1.85); ridge[i] = r;
    const lump = 1 + 0.06 * (vnoise(v.x * 1.4 + 2, v.y * 1.4, v.z * 1.4) - 0.5) * 2, k = 0.62 * lump * (1 + 0.05 * r * (1 - lo[i] * 0.6));
    p.setXYZ(i, v.x * k, v.y * k * 0.8, v.z * k); hull.attributes.position.setXYZ(i, v.x * 0.62 * lump * 1.05, v.y * 0.62 * lump * 0.8 * 1.05, v.z * 0.62 * lump * 1.05); }
  geo.computeVertexNormals(); geo.translate(0, -0.1, 0); hull.translate(0, -0.1, 0);
  const valD = new THREE.Color('#1F5A38'), val = new THREE.Color('#3E9A55'), rid = new THREE.Color('#B8955A'), cr = new THREE.Color('#EEDCA0'), base = new THREE.Color('#5E5236'); let i = 0;
  paint(geo, c => { const r = ridge[i]; c.copy(valD).lerp(val, Math.min(1, r * 2.2)).lerp(rid, THREE.MathUtils.smoothstep(r, 0.35, 0.75)).lerp(cr, THREE.MathUtils.smoothstep(r, 0.82, 1) * 0.8).lerp(base, lo[i] * 0.55); i++; });
  const g = new THREE.Group(); g.add(new THREE.Mesh(geo, vmat()), new THREE.Mesh(hull, new THREE.MeshBasicMaterial({ color: OUT, side: THREE.BackSide })));
  return g;
}

// 5 SCROLL / PLATE CORAL (Turbinaria): yellow-green whorl of wavy cups
function makeScroll() {
  seed = 19; const g = new THREE.Group();
  [[0, 0.05, 0, 1.0], [0.18, 0.28, -0.1, 0.7], [-0.14, 0.42, 0.12, 0.5]].forEach(([x, y, z, s], t) => {
    const pts = []; for (let k = 0; k <= 10; k++) { const u = k / 10; pts.push(new THREE.Vector2(0.08 + u * 0.62, Math.pow(u, 1.4) * 0.32)); }
    const geo = new THREE.LatheGeometry(pts, 72); const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const px = p.getX(i), pz = p.getZ(i), r = Math.hypot(px, pz), a = Math.atan2(pz, px), w = (r / 0.7); p.setY(i, p.getY(i) + Math.sin(a * 5 + t) * 0.07 * w * w); const k = 1 + Math.sin(a * 3 + t * 2) * 0.06 * w; p.setX(i, px * k); p.setZ(i, pz * k); }
    geo.computeVertexNormals();
    const cA = new THREE.Color('#9AA83A'), cB = new THREE.Color('#E8F08A'); paint(geo, (c, px, py, pz) => c.copy(cA).lerp(cB, Math.min(1, Math.hypot(px, pz) / 0.72)));
    const m = new THREE.Mesh(geo, vmat({ map: poreTex(), side: THREE.DoubleSide })); m.position.set(x, y, z); m.scale.setScalar(s); m.rotation.y = t * 1.3; g.add(m);
    const rim = []; for (let k = 0; k <= 72; k++) { const j = (k % 72) * 11 + 10; rim.push(V(p.getX(j), p.getY(j), p.getZ(j))); }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rim, true), 140, 0.012, 5, true), new THREE.MeshBasicMaterial({ color: OUT })); tube.position.copy(m.position); tube.scale.copy(m.scale); tube.rotation.copy(m.rotation); g.add(tube);
  });
  const base = new THREE.CylinderGeometry(0.07, 0.12, 0.12, 10); base.translate(0, 0.04, 0); g.add(lined(new THREE.Mesh(base, cmat('#7A8A3A'))));
  return g;
}

// 6 BUBBLE CORAL (Plerogyra): cluster of pearly grape-like bubbles that slowly breathe
function makeBubble() {
  seed = 23; const g = new THREE.Group(), N = 64;
  const base = new THREE.SphereGeometry(0.42, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2); base.scale(1, 0.55, 1); g.add(new THREE.Mesh(base, cmat('#6A6A50')));
  const sg = new THREE.SphereGeometry(1, 16, 12), bm = new THREE.InstancedMesh(sg, cmat('#D8E4B0'), N), hm = new THREE.InstancedMesh(sg, new THREE.MeshBasicMaterial({ color: OUT, side: THREE.BackSide }), N);
  const items = [];
  for (let i = 0; i < N; i++) { const y = 1 - (i + 0.5) / N * 0.95, r = Math.sqrt(1 - y * y), a = i * 2.39996; items.push({ p: V(Math.cos(a) * r * 0.46, 0.06 + y * 0.32, Math.sin(a) * r * 0.46), s: 0.075 + rnd() * 0.05, ph: rnd() * 6 }); }
  g.add(hm, bm); g.userData = { bm, hm, items, t: 0 };
  animateBubble(g, 0); return g;
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
function animateBubble(g, dt) { const u = g.userData; u.t += dt; u.items.forEach((it, i) => { const s = it.s * (1 + Math.sin(u.t * 1.2 + it.ph) * 0.08);
  _m.compose(it.p, _q, _s.set(s, s * 0.92, s)); u.bm.setMatrixAt(i, _m); _m.compose(it.p, _q, _s.set(s + 0.012, s * 0.92 + 0.012, s + 0.012)); u.hm.setMatrixAt(i, _m); });
  u.bm.instanceMatrix.needsUpdate = u.hm.instanceMatrix.needsUpdate = true; }

// 7 MUSHROOM CORAL (Fungia): free-living oval discs with fine radial ridges
function mushroomDisc(a, b, cA, cB) {
  const seg = 180, rings = 14, geo = new THREE.PlaneGeometry(1, 1, seg, rings), p = geo.attributes.position;
  const ridge = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) { const u = p.getX(i) + 0.5, v = p.getY(i) + 0.5, ang = u * Math.PI * 2, x = Math.cos(ang) * v * a, z = Math.sin(ang) * v * b;
    const rr = Math.max(0, Math.abs(Math.sin(ang * 34))); ridge[i] = rr * Math.min(1, v * 3); const y = 0.14 * (1 - v * v) + 0.025 * ridge[i] - (Math.abs(z) < 0.03 && v < 0.35 ? 0.03 : 0);
    p.setXYZ(i, x, y, z); }
  geo.computeVertexNormals(); const c0 = new THREE.Color(cA), c1 = new THREE.Color(cB); let i = 0;
  paint(geo, (c, x, y, z) => { const v = Math.hypot(x / a, z / b); c.copy(c0).lerp(c1, ridge[i++] * 0.8); if (v > 0.85) c.lerp(new THREE.Color('#E8F0B0'), 0.5); if (v < 0.3 && Math.abs(z) < 0.035) c.set('#3A2A3A'); });
  return geo;
}
function makeMushroom() {
  const g = new THREE.Group();
  [[0, 0, 0, 0.42, 0.3, '#8A5AA8', '#D8B8F0', 0.2], [0.55, 0, 0.3, 0.3, 0.22, '#7A8A4A', '#D8F0A0', 1.4], [-0.5, 0, 0.35, 0.26, 0.2, '#A86A4A', '#F4C8A0', 2.6]].forEach(([x, y, z, a, b, cA, cB, r]) => {
    const m = lined(new THREE.Mesh(mushroomDisc(a, b, cA, cB), vmat({ side: THREE.DoubleSide })), 0.01); m.position.set(x, y, z); m.rotation.y = r; g.add(m); });
  return g;
}

// 8 PURPLE PORE CORAL (Montipora): tiers of purple shelves with pale rims and tiny pores
function makePurplePore() {
  seed = 31; const g = new THREE.Group();
  const lump = new THREE.SphereGeometry(0.4, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2); lump.scale(1, 0.5, 0.9); g.add(lined(new THREE.Mesh(solid(lump, '#6A3A9A'), vmat({ map: poreTex() }))));
  [[0, 0.14, 0, 0.62, 0], [0.18, 0.3, -0.1, 0.46, 1.2], [-0.16, 0.42, 0.12, 0.36, 2.3], [0.06, 0.54, 0.02, 0.26, 3.1]].forEach(([x, y, z, r, rot]) => {
    const sh = new THREE.CylinderGeometry(r, r * 0.9, 0.045, 48); const p = sh.attributes.position;
    for (let i = 0; i < p.count; i++) { const px = p.getX(i), pz = p.getZ(i), a = Math.atan2(pz, px), k = 1 + 0.12 * Math.sin(a * 4 + rot) + 0.05 * Math.sin(a * 11); if (Math.hypot(px, pz) > r * 0.3) { p.setX(i, px * k); p.setZ(i, pz * k); } p.setY(i, p.getY(i) + Math.hypot(px, pz) * 0.12 * Math.sin(a * 2 + rot)); }
    sh.computeVertexNormals();
    paint(sh, (c, px, py, pz) => c.set('#7A3AC0').lerp(new THREE.Color('#E8C8FF'), Math.max(0, Math.hypot(px, pz) / r - 0.7) * 2.5));
    const m = lined(new THREE.Mesh(sh, vmat({ map: poreTex() })), 0.012); m.position.set(x, y, z); m.rotation.y = rot; g.add(m); });
  return g;
}

// 9 ORANGE CUP CORAL (Tubastraea): bright orange cups with yellow polyp crowns that open and close
function makeCupCoral() {
  seed = 37; const g = new THREE.Group();
  const rock = new THREE.SphereGeometry(0.4, 20, 12); rock.scale(1, 0.45, 0.85); g.add(lined(new THREE.Mesh(rock, cmat('#6A5A5A'))));
  const cups = [], parts = [];
  for (let k = 0; k < 14; k++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.3, h = 0.1 + rnd() * 0.16, d = V(Math.cos(a) * r * 1.2, 1, Math.sin(a) * r * 1.2).normalize(), base = V(Math.cos(a) * r, 0.12 - r * 0.2, Math.sin(a) * r);
    const c = new THREE.CylinderGeometry(0.065, 0.07, h, 14, 1, true); c.translate(0, h / 2, 0); parts.push(place(c, base, d)); const top = base.clone().addScaledVector(d, h);
    const disc = new THREE.CircleGeometry(0.06, 14); disc.rotateX(-Math.PI / 2); parts.push(place(disc, top, d)); cups.push({ top, d }); }
  g.add(lined(new THREE.Mesh(mergeGeometries(parts.map(p => { p.deleteAttribute('uv'); return p.toNonIndexed(); })), cmat('#FF6A12', { emissive: '#5A1A00', side: THREE.DoubleSide })), 0.01));
  const T = 12, tm = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.012, 0.07, 2, 5).translate(0, 0.045, 0), cmat('#FFC23A', { emissive: '#6A3A00' }), cups.length * T);
  g.add(tm); g.userData = { cups, tm, T, t: 0 }; animateCup(g, 0);
  return g;
}
function animateCup(g, dt) { const u = g.userData; u.t += dt; let i = 0;
  u.cups.forEach((c, k) => { const open = 0.55 + 0.45 * Math.sin(u.t * 0.8 + k); const q0 = new THREE.Quaternion().setFromUnitVectors(UP, c.d);
    for (let j = 0; j < u.T; j++) { const a = j / u.T * Math.PI * 2, tilt = 0.3 + open * 0.9; const dir = V(Math.cos(a) * Math.sin(tilt), Math.cos(tilt), Math.sin(a) * Math.sin(tilt)).applyQuaternion(q0);
      _m.compose(c.top.clone().addScaledVector(V(Math.cos(a), 0, Math.sin(a)).applyQuaternion(q0), 0.045), _q.setFromUnitVectors(UP, dir), _s.set(1, 0.4 + open * 0.8, 1)); u.tm.setMatrixAt(i++, _m); } });
  u.tm.instanceMatrix.needsUpdate = true; }

// 10 FIRE CORAL (Millepora dichotoma): upright fans of thin, flattened, forking branches fused into a net, mustard with white tips
function fireFan(w, h, R) {
  const parts = [], tips = [], a = new THREE.Color('#B9831C'), b = new THREE.Color('#F2C230'), wt = new THREE.Color('#FFF4D2');
  const seg = (x0, y0, x1, y1, r0, r1) => { const L = Math.hypot(x1 - x0, y1 - y0); if (L < 0.004) return; const g = new THREE.CylinderGeometry(r1, r0, L, 7, 1, true); g.scale(1, 1, 0.5);
    g.applyMatrix4(new THREE.Matrix4().compose(V((x0 + x1) / 2, (y0 + y1) / 2, 0), new THREE.Quaternion().setFromUnitVectors(UP, V(x1 - x0, y1 - y0, 0).normalize()), V(1, 1, 1))); parts.push(g);
    const j = new THREE.SphereGeometry(r1, 7, 5); j.scale(1, 1, 0.5); j.translate(x1, y1, 0); parts.push(j); };
  const nodes = [];
  const near = (x, y, skip) => nodes.find((n, k) => k < skip && Math.hypot(n[0] - x, n[1] - y) < 0.032);
  const grow = (x, y, ang, r, depth) => { const L = 0.045 + rnd() * 0.025, a2 = ang + (rnd() - 0.5) * 0.22, env = w * Math.min(1, 0.2 + y / (h * 0.5));
    const nx = x + Math.sin(a2) * L, ny = y + Math.cos(a2) * L, r1 = Math.max(0.009, r * 0.92);
    if (Math.abs(nx) > env) { tips.push([x, y, r]); return; }
    const hit = depth > 3 && near(nx, ny, nodes.length - 3);
    if (hit) { seg(x, y, hit[0], hit[1], r, r1); return; }                                  // branches fuse into the net
    seg(x, y, nx, ny, r, r1); nodes.push([nx, ny]);
    if (ny > h - 0.04 - rnd() * 0.06 || depth > 26) { tips.push([nx, ny, r1]); return; }
    if (rnd() < (depth < 2 ? 0.9 : 0.42)) { const sp = 0.26 + rnd() * 0.14; grow(nx, ny, a2 - sp, r1, depth + 1); grow(nx, ny, a2 + sp, r1, depth + 1); }
    else grow(nx, ny, a2 * 0.85, r1, depth + 1); };
  grow(0, 0, 0, 0.032, 0);
  tips.forEach(([x, y, r]) => { const t = new THREE.SphereGeometry(r * 1.25, 8, 6); t.scale(1, 1.3, 0.6); t.translate(x, y + 0.008, 0); parts.push(t); });
  const g = mergeGeometries(parts.map(q => { q.deleteAttribute('uv'); return q.index ? q.toNonIndexed() : q; }));
  const P = g.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i), an = x / R; P.setX(i, Math.sin(an) * (R + z)); P.setZ(i, Math.cos(an) * (R + z) - R); }
  g.computeVertexNormals();
  paint(g, (c, x, y) => { const t = Math.max(0, Math.min(1, y / h)); c.copy(a).lerp(b, Math.min(1, t * 1.5)); if (t > 0.84) c.lerp(wt, Math.min(1, (t - 0.84) / 0.12)); });
  return g;
}
function makeFireCoral() {
  seed = 41; const parts = [];
  [[0, 0, 0, 0.36, 0.78, 0.3], [0.26, 0, 0.16, 0.28, 0.6, -0.9], [-0.28, 0, 0.12, 0.27, 0.56, 1.0], [0.06, 0, -0.22, 0.25, 0.5, 2.5]].forEach(([x, y, z, w, h, rot]) => {
    const f = fireFan(w, h, 0.8); f.applyMatrix4(new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(UP, rot), V(1, 1, 1))); parts.push(f); });
  const base = new THREE.IcosahedronGeometry(0.16, 2), bp = base.attributes.position; for (let i = 0; i < bp.count; i++) { const k = 0.85 + vnoise(bp.getX(i) * 9, bp.getY(i) * 9, bp.getZ(i) * 9) * 0.35; bp.setXYZ(i, bp.getX(i) * k * 1.5, Math.max(-0.02, bp.getY(i) * k * 0.55), bp.getZ(i) * k * 1.2); } base.deleteAttribute('uv'); base.computeVertexNormals(); parts.push(solid(base.toNonIndexed(), '#A8781C'));
  const g = new THREE.Group(); g.add(lined(new THREE.Mesh(mergeGeometries(parts), vmat()), 0.006));
  return g;
}

// 11 FINGER CORAL (Porites cylindrica): cluster of blunt cream fingers with pastel tips
function makeFinger() {
  seed = 47; const parts = [];
  const finger = (p, d, len, r, depth) => { const c = new THREE.CapsuleGeometry(r, len, 4, 10); c.translate(0, len / 2, 0); parts.push(place(c, p, d)); if (depth > 0 && rnd() < 0.6) { const e = p.clone().addScaledVector(d, len * 0.6); finger(e, bend(d, 0.5 + rnd() * 0.3, 0.4), len * 0.7, r * 0.9, depth - 1); } };
  for (let k = 0; k < 15; k++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.35; finger(V(Math.cos(a) * r, 0, Math.sin(a) * r), V(Math.cos(a) * r * 1.3 + (rnd() - 0.5) * 0.3, 1, Math.sin(a) * r * 1.3 + (rnd() - 0.5) * 0.3), 0.3 + rnd() * 0.35, 0.06 + rnd() * 0.02, 1); }
  const geo = mergeGeometries(parts.map(p => p.toNonIndexed())); geo.computeBoundingBox(); const top = geo.boundingBox.max.y;
  const a = new THREE.Color('#D8C08A'), b = new THREE.Color('#B8D8F4'); paint(geo, (c, x, y) => c.copy(a).lerp(b, Math.pow(Math.max(0, Math.min(1, y / top)), 1.8)));
  const g = new THREE.Group(); g.add(lined(new THREE.Mesh(geo, vmat({ map: poreTex() })), 0.012)); return g;
}

const still = () => {};
export const CORALS3D = [
  { en: 'Staghorn coral', de: 'Geweihkoralle', make: makeStaghorn, anim: still },
  { en: 'Table coral', de: 'Tischkoralle', make: makeTable, anim: still },
  { en: 'Cauliflower coral', de: 'Blumenkohlkoralle', make: makeCauliflower, anim: still },
  { en: 'Brain coral', de: 'Hirnkoralle', make: makeBrain, anim: still },
  { en: 'Scroll coral', de: 'Kelchkoralle (Turbinaria)', make: makeScroll, anim: still },
  { en: 'Bubble coral', de: 'Blasenkoralle', make: makeBubble, anim: animateBubble },
  { en: 'Mushroom coral', de: 'Pilzkoralle', make: makeMushroom, anim: still },
  { en: 'Purple pore coral', de: 'Violette Porenkoralle', make: makePurplePore, anim: still },
  { en: 'Orange cup coral', de: 'Orange Kelchkoralle (Tubastraea)', make: makeCupCoral, anim: animateCup },
  { en: 'Fire coral', de: 'Feuerkoralle', make: makeFireCoral, anim: still },
  { en: 'Finger coral', de: 'Fingerkoralle', make: makeFinger, anim: still },
].map(c => ({ ...c, cam: [-1.9, 1.6, -2.4], target: [0, 0.3, 0] }));
export { makeStaghorn, makeTable, makeCauliflower, makeBrain, makeScroll, makeBubble, animateBubble, makeMushroom, makePurplePore, makeCupCoral, animateCup, makeFireCoral, makeFinger };
