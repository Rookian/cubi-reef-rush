// Hard corals for the review page (Komodo reef): crisp toon look, painted detail, a few with living polyps.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toonGradient, outline } from './materials.js';
import { starGeo, hairGeo, tubeGeo, sprinkle, polypField, animatePolyps, animatePF } from './polyps.js';
const pmat = (o = {}) => new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGradient(), emissive: new THREE.Color(o.emissive || '#000') });

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
  seed = 3; const parts = [], tips = [], tipPts = [];
  const br = (p, d, len, r, depth) => {
    const g = new THREE.CylinderGeometry(r * 0.8, r, len, 8, 2, true); g.translate(0, len / 2, 0); parts.push(place(g, p, d));
    const e = p.clone().addScaledVector(d, len);
    if (depth === 0) { tips.push(place(new THREE.SphereGeometry(r * 0.95, 8, 6), e, d)); tipPts.push({ p: e.clone().addScaledVector(d, r * 0.8), n: d.clone() }); return; }
    parts.push(place(new THREE.SphereGeometry(r * 0.8, 8, 6), e, d));
    const n = rnd() < 0.55 ? 2 : 3; for (let k = 0; k < n; k++) br(e, bend(d, 0.45 + rnd() * 0.35, 0.3), len * (0.78 + rnd() * 0.12), r * 0.8, depth - 1);
  };
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + rnd() * 0.4; br(V(Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12), V(Math.cos(a) * 0.55, 1, Math.sin(a) * 0.55).normalize(), 0.28, 0.06, 4); }
  const body = mergeGeometries(parts.map(g => g.toNonIndexed())); body.computeBoundingBox(); const top = body.boundingBox.max.y;
  const a0 = new THREE.Color('#6A5878'), a = new THREE.Color('#5A4AB8'), b = new THREE.Color('#9AB0F6'); paint(body, (c, x, y) => { const t = Math.min(1, y / top); c.copy(a0).lerp(a, Math.min(1, t * 3)).lerp(b, Math.max(0, (t - 0.3) / 0.7)); });
  const g = new THREE.Group(); g.add(lined(new THREE.Mesh(body, vmat()), 0.012));
  g.add(new THREE.Mesh(mergeGeometries(tips), cmat('#E6F4FF', { emissive: '#3A5A8A' })));
  const cups = polypField(tubeGeo({ cA: '#6E62C8', cB: '#C6D2FF' }), pmat(), sprinkle(body, 900, rnd, (p) => p.y > 0.06), { size: [0.02, 0.03], rnd, lean: 0.4, sink: 0.25, opt: { lo: 1 } });
  const stars = polypField(starGeo({ arms: 8, cIn: '#BFD4FF', cOut: '#FFFFFF', mouth: '#7A6AE0', tilt: 1.15 }), pmat({ emissive: '#20305A' }), tipPts, { size: [0.022, 0.03], rnd, opt: { speed: 1.6 } });
  g.add(cups, stars); g.userData.pfs = [stars];
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
  const sprig = (() => { const ps = [], cap = (r, l, rx, rz, y) => { const k = new THREE.CapsuleGeometry(r, l, 2, 6); k.translate(0, l / 2 + r, 0); k.rotateX(rx); k.rotateZ(rz); k.translate(0, y, 0); k.deleteAttribute('uv'); ps.push(k.toNonIndexed()); };
    cap(0.014, 0.06, 0, 0, 0); cap(0.011, 0.03, 0.75, 0, 0.022); cap(0.011, 0.03, -0.4, 0.7, 0.03); cap(0.011, 0.028, -0.4, -0.7, 0.016);
    return paint(mergeGeometries(ps), (cc, x, y) => cc.setScalar(0.62 + 0.38 * Math.min(1, y / 0.07)).lerp(new THREE.Color('#FFFFFF'), y > 0.075 ? 0.6 : 0)); })();
  const N = 420, bl = new THREE.InstancedMesh(sprig, vmat(), N), m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), q2 = new THREE.Quaternion(), tops = [];
  for (let i = 0; i < N; i++) { const a = i * 2.39996, r = Math.sqrt((i + 0.5) / N) * 0.78, out = Math.max(0, (r - 0.55) / 0.25); const d = V(Math.cos(a) * out * 1.4, 1, Math.sin(a) * out * 1.4).normalize();
    const sy = 1 + rnd() * 0.4, bp = V(Math.cos(a) * r, 0.49 + r * r * 0.12, Math.sin(a) * r); m.compose(bp, q.setFromUnitVectors(UP, d).multiply(q2.setFromAxisAngle(UP, rnd() * 6.28)), V(1, sy, 1)); bl.setMatrixAt(i, m); bl.setColorAt(i, c.set('#A8BC6E').lerp(new THREE.Color('#7FE0D2'), r / 0.8));
    tops.push({ p: bp.clone().addScaledVector(d, 0.09 * sy), n: d.clone() }); }
  bl.instanceColor.needsUpdate = true; g.add(bl);
  const stars = polypField(starGeo({ arms: 8, cIn: '#BFF2E6', cOut: '#FFFFFF', mouth: '#4AA890', tilt: 1.2 }), pmat({ emissive: '#103A34' }), tops, { size: [0.013, 0.018], rnd, opt: { speed: 1.8, wave: 5 } });
  g.add(stars); g.userData.pfs = [stars];
  return g;
}

// 3 CAULIFLOWER CORAL (Pocillopora): tight dome of stout, flattened pink branches that fork into warty, club-shaped lobes with pale tips
function cauliLobe(len, R, flare, ph) {
  const pts = [], n = 12; for (let k = 0; k <= n; k++) { const t = k / n; pts.push(new THREE.Vector2(R * (0.8 + flare * t * t), len * t)); }
  const rt = pts[n].x; for (let k = 1; k <= 6; k++) { const a = k / 6 * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(0.0001, rt * Math.cos(a)), len + rt * 0.75 * Math.sin(a))); }
  const g = new THREE.LatheGeometry(pts, 20), p = g.attributes.position, top = len + rt * 0.75, wart = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z), an = Math.atan2(z, x);
    const w = Math.max(0, Math.sin(y * 62 + ph) * Math.sin(an * 5 + y * 20 + ph)) * Math.min(1, y / (len * 0.25)), k = 1 + 0.2 * w * THREE.MathUtils.smoothstep(r, 0, R * 0.7); wart[i] = w;
    p.setXYZ(i, x * k, y, z * k * 0.62); }
  g.computeVertexNormals(); g.deleteAttribute('uv');
  const c0 = new THREE.Color('#A8405E'), c1 = new THREE.Color('#EE7FA0'), c2 = new THREE.Color('#FFDCE6'); let i = 0;
  paint(g, (c, x, y) => { const t = Math.max(0, Math.min(1, y / top)), w = wart[i++]; c.copy(c0).lerp(c1, Math.min(1, t * 2)).lerp(c2, Math.max(0, (t - 0.72) / 0.28) * 0.9).lerp(c2, w * 0.45); });
  return g.toNonIndexed();
}
function makeCauliflower() {
  seed = 11; const parts = [], o = V(0, 0.02, 0), N = 17;
  for (let k = 0; k < N; k++) { const y = 1 - (k + 0.5) / N * 0.86, r = Math.sqrt(1 - y * y), a = k * 2.39996, d = V(Math.cos(a) * r, y * 0.9 + 0.12, Math.sin(a) * r).normalize(), len = 0.24 + rnd() * 0.08;
    const stem = cauliLobe(len, 0.055, 0.25, rnd() * 6); stem.rotateY(rnd() * 3.14); parts.push(place(stem, o, d));
    const e = o.clone().addScaledVector(d, len * 0.85), nl = 2 + (rnd() < 0.5 ? 1 : 0);
    for (let j = 0; j < nl; j++) { const dd = bend(d, 0.38 + rnd() * 0.2, 0.05), lobe = cauliLobe(0.11 + rnd() * 0.05, 0.045, 0.55, rnd() * 6); lobe.rotateY(rnd() * 3.14); parts.push(place(lobe, e, dd)); } }
  const base = new THREE.SphereGeometry(0.16, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); base.scale(1.2, 0.5, 1.2); base.deleteAttribute('uv'); parts.push(solid(base.toNonIndexed(), '#A8405E'));
  const body = mergeGeometries(parts), g = new THREE.Group(); g.add(lined(new THREE.Mesh(body, vmat()), 0.009)); g.scale.setScalar(1.3);
  const stars = polypField(starGeo({ arms: 8, cIn: '#FFE4EC', cOut: '#FFFFFF', mouth: '#A8204A', tilt: 1.2, w: 0.13 }), pmat({ emissive: '#3A0A1A' }), sprinkle(body, 380, rnd, (p) => p.y > 0.08), { size: [0.015, 0.021], rnd, sink: 0.2, opt: { speed: 1.5, wave: 6, lo: 0.3 } });
  g.add(stars); g.userData.pfs = [stars];
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
  seed = 5; const stars = polypField(starGeo({ arms: 8, cIn: '#3EDC8E', cOut: '#D6FFE6', mouth: '#F2E2A8', tilt: 1.3, w: 0.14 }), pmat({ emissive: '#0A3A22' }), sprinkle(geo, 460, rnd, (p, n, c) => c.g > c.r * 1.5 && p.y > 0.0), { size: [0.02, 0.028], rnd, sink: 0.3, opt: { speed: 1.4, wave: 5, lo: 0.25 } });
  g.add(stars); g.userData.pfs = [stars];
  return g;
}

// 5 SCROLL / PLATE CORAL (Turbinaria): yellow-green whorl of wavy cups
function makeScroll() {
  seed = 19; const g = new THREE.Group(), pfs = []; g.userData.pfs = pfs;
  [[0, 0.05, 0, 1.0], [0.18, 0.2, -0.1, 0.7], [-0.14, 0.3, 0.12, 0.5]].forEach(([x, y, z, s], t) => {
    const pts = []; for (let k = 0; k <= 10; k++) { const u = k / 10; pts.push(new THREE.Vector2(0.08 + u * 0.62, Math.pow(u, 1.4) * 0.19)); }
    const geo = new THREE.LatheGeometry(pts, 72); const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const px = p.getX(i), pz = p.getZ(i), r = Math.hypot(px, pz), a = Math.atan2(pz, px), w = (r / 0.7); p.setY(i, p.getY(i) + Math.sin(a * 5 + t) * 0.07 * w * w); const k = 1 + Math.sin(a * 3 + t * 2) * 0.06 * w; p.setX(i, px * k); p.setZ(i, pz * k); }
    geo.computeVertexNormals();
    const cA = new THREE.Color('#9AA83A'), cB = new THREE.Color('#E8F08A'); paint(geo, (c, px, py, pz) => c.copy(cA).lerp(cB, Math.min(1, Math.hypot(px, pz) / 0.72)));
    const m = new THREE.Mesh(geo, vmat({ side: THREE.DoubleSide })); m.position.set(x, y, z); m.scale.setScalar(s); m.rotation.y = t * 1.3; g.add(m);
    const fl = polypField(starGeo({ arms: 10, cIn: '#FFD83A', cOut: '#FFFBD0', mouth: '#B8860A', stem: 0.35, stemW: 0.3, cStem: '#B8C050', tilt: 1.35, w: 0.13 }), pmat({ emissive: '#3A2A00' }), sprinkle(geo, Math.round(260 * s), rnd, (pp, n) => n.y > 0.25 && Math.hypot(pp.x, pp.z) > 0.14, true), { size: [0.034, 0.046], rnd, opt: { speed: 1.3, wave: 4, lo: 0.35, stretch: 0.3 } });
    m.add(fl); pfs.push(fl);
    const rim = []; for (let k = 0; k <= 72; k++) { const j = (k % 72) * 11 + 10; rim.push(V(p.getX(j), p.getY(j), p.getZ(j))); }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rim, true), 140, 0.012, 5, true), new THREE.MeshBasicMaterial({ color: OUT })); tube.position.copy(m.position); tube.scale.copy(m.scale); tube.rotation.copy(m.rotation); g.add(tube);
  });
  const base = new THREE.CylinderGeometry(0.07, 0.12, 0.12, 10); base.translate(0, 0.04, 0); g.add(lined(new THREE.Mesh(base, cmat('#7A8A3A'))));
  return g;
}

// 6 BUBBLE CORAL (Plerogyra sinuosa): plump pearly vesicles like a bunch of grapes on a pale ridged skeleton, slowly breathing
function makeBubble() {
  seed = 23; const g = new THREE.Group(), N = 44;
  const base = new THREE.SphereGeometry(0.4, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2), bp = base.attributes.position;
  for (let i = 0; i < bp.count; i++) { const x = bp.getX(i), z = bp.getZ(i), an = Math.atan2(z, x), k = 1 + 0.06 * Math.abs(Math.sin(an * 16)); bp.setXYZ(i, x * k * 1.08, bp.getY(i) * 0.42, z * k * 0.95); }
  base.computeVertexNormals(); paint(base, (c, x, y) => c.set('#8E8468').lerp(new THREE.Color('#C8BFA2'), Math.min(1, y / 0.12))); g.add(lined(new THREE.Mesh(base, vmat()), 0.008));
  const sg = new THREE.SphereGeometry(1, 28, 18), sp = sg.attributes.position;
  for (let i = 0; i < sp.count; i++) { const y = sp.getY(i), k = y < 0 ? 1 + 0.4 * y : 1; sp.setXYZ(i, sp.getX(i) * k, y * 1.18, sp.getZ(i) * k); }
  sg.computeVertexNormals();
  const lo = new THREE.Color('#6FB08E'), mid = new THREE.Color('#D2E6C6'), hi = new THREE.Color('#F2F6E6'), vein = new THREE.Color('#FFFFFF');
  paint(sg, (c, x, y, z) => { const t = (y / 1.18 + 1) / 2; c.copy(lo).lerp(mid, Math.min(1, t * 1.7)).lerp(hi, Math.max(0, (t - 0.55) / 0.45)); c.lerp(vein, 0.35 * Math.pow(Math.max(0, Math.cos(Math.atan2(z, x) * 12)), 10) * (1 - Math.abs(t - 0.5) * 1.6)); });
  const bm = new THREE.InstancedMesh(sg, new THREE.MeshLambertMaterial({ vertexColors: true, emissive: new THREE.Color('#2E3E34') }), N), hm = new THREE.InstancedMesh(sg, new THREE.MeshBasicMaterial({ color: OUT, side: THREE.BackSide }), N);
  const gl = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: '#F2F6EA' }), N);
  const items = [];
  for (let i = 0; i < N; i++) { const y = 1 - (i + 0.5) / N * 0.9, r = Math.sqrt(1 - y * y), a = i * 2.39996, n = V(Math.cos(a) * r, y * 1.4, Math.sin(a) * r).normalize();
    items.push({ p: V(Math.cos(a) * r * 0.4, 0.1 + y * 0.2, Math.sin(a) * r * 0.36), q: new THREE.Quaternion().setFromUnitVectors(UP, n.clone().lerp(UP, 0.35).normalize()), s: (0.085 + rnd() * 0.05) * (0.85 + y * 0.3), ph: rnd() * 6 }); }
  const ring = []; for (let k = 0; k < 64; k++) { const a = k / 64 * Math.PI * 2 + rnd() * 0.08, o = V(Math.cos(a), 0, Math.sin(a)); ring.push({ p: V(o.x * 0.44, 0.035 + rnd() * 0.02, o.z * 0.39), n: o.clone().multiplyScalar(1).add(V(0, 0.45 + rnd() * 0.5, 0)).normalize() }); }
  const tent = polypField(hairGeo({ w: 0.11, cA: '#7FB494', cB: '#FFFFFF', knob: 1.6 }), pmat(), ring, { size: [0.07, 0.11], rnd, opt: { speed: 1.2, lo: 0.75, stretch: 0.6 } });
  g.add(hm, bm, gl, tent); g.userData = { bm, hm, gl, items, t: 0, tent };
  animateBubble(g, 0); return g;
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _gl = new THREE.Vector3(-0.42, 0.62, -0.66).normalize(), _v = new THREE.Vector3();
function animateBubble(g, dt) { const u = g.userData; u.t += dt; u.items.forEach((it, i) => { const s = it.s * (1 + Math.sin(u.t * 1.1 + it.ph) * 0.09);
  _m.compose(it.p, it.q, _s.set(s, s, s)); u.bm.setMatrixAt(i, _m); _m.compose(it.p, it.q, _s.set(s + 0.007, s + 0.007, s + 0.007)); u.hm.setMatrixAt(i, _m);
  _m.compose(_v.copy(it.p).addScaledVector(_gl, s * 1.0), _q.identity(), _s.set(s * 0.24, s * 0.15, s * 0.24)); u.gl.setMatrixAt(i, _m); });
  u.bm.instanceMatrix.needsUpdate = u.hm.instanceMatrix.needsUpdate = u.gl.instanceMatrix.needsUpdate = true; if (u.tent) animatePolyps(u.tent, u.t); }

// 7 MUSHROOM CORAL (Fungia): thick, free-living oval discs lying on the sand; fine radial septa run from a central mouth slit to the rim
function mushroomDisc(a, b, cIn, cOut, cRidge, ph, hull) {
  const seg = 432, N = 36, H = 0.11, S = THREE.MathUtils.smoothstep;
  const prof = []; for (let k = 0; k <= 18; k++) { const v = k / 18; prof.push([v, H * (1 - 0.8 * Math.pow(v, 2.4)), 1]); }
  const yR = H * 0.2; prof.push([1.035, yR - 0.022, 0.5], [1.02, yR - 0.045, 0], [0.9, yR - 0.06, 0], [0.5, yR - 0.062, 0], [0, yR - 0.062, 0]);
  const rings = prof.length - 1, geo = new THREE.PlaneGeometry(1, 1, seg, rings), p = geo.attributes.position, ridge = new Float32Array(p.count), vv = new Float32Array(p.count), top = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) { const u = p.getX(i) + 0.5, j = Math.round((0.5 - p.getY(i)) * rings), [v, y0, tp] = prof[j], ang = u * Math.PI * 2;
    const wob = 1 + 0.045 * Math.sin(ang * 2 + ph) + 0.03 * Math.sin(ang * 3 + ph * 2), x = Math.cos(ang) * v * a * wob, z = Math.sin(ang) * v * b * wob;
    const prim = Math.pow(0.5 + 0.5 * Math.cos(ang * N), 3), sec = Math.pow(0.5 + 0.5 * Math.cos(ang * N + Math.PI), 3) * S(v, 0.4, 0.6) * 0.75;
    const r = Math.max(prim, sec) * S(v, 0.06, 0.25) * tp, slit = Math.exp(-Math.pow(z / 0.022, 2)) * (1 - S(Math.abs(x) / a, 0.2, 0.34)) * tp;
    ridge[i] = r; vv[i] = v; top[i] = tp + slit * 10;
    if (hull) p.setXYZ(i, x * 1.035, y0 + (tp ? 0.012 : -0.008), z * 1.035); else p.setXYZ(i, x, y0 + 0.02 * r * (1 + 0.25 * Math.sin(v * 40 + ang * 7)) - 0.035 * slit, z); }
  geo.deleteAttribute('uv'); geo.computeVertexNormals(); if (hull) return geo;
  const c0 = new THREE.Color(cIn), c1 = new THREE.Color(cOut), cr = new THREE.Color(cRidge), under = new THREE.Color('#E8DCC0'), mouth = new THREE.Color('#3A2440'); let n = 0;
  paint(geo, (c) => { const i = n++; c.copy(c0).lerp(c1, S(vv[i], 0.35, 0.95)).lerp(cr, ridge[i] * 0.75); if (top[i] < 0.5) c.lerp(under, 0.8); if (top[i] > 1.5) c.lerp(mouth, Math.min(1, (top[i] - 1) / 6)); });
  return geo;
}
function makeMushroom() {
  seed = 29; const g = new THREE.Group(), pfs = []; g.userData.pfs = pfs;
  [[0, 0.01, 0, 0.4, 0.33, '#5E8A4A', '#B86AA8', '#F2E8C8', 0.3, 0.2, 0.05],
   [0.58, 0, 0.22, 0.27, 0.24, '#A8643A', '#E0A060', '#FFF0D0', 1.7, 1.4, -0.08],
   [-0.5, 0.02, 0.3, 0.46, 0.17, '#7A6AB8', '#C8B0F0', '#F6F0FF', 2.9, 2.5, 0.1],
   [0.12, 0.0, 0.52, 0.2, 0.18, '#3E8A7A', '#A8E0C0', '#F0FFF0', 4.4, 0.9, -0.06]].forEach(([x, y, z, a, b, cI, cO, cR, ph, r, tilt]) => {
    const m = new THREE.Mesh(mushroomDisc(a, b, cI, cO, cR, ph), vmat({ side: THREE.DoubleSide })); m.add(new THREE.Mesh(mushroomDisc(a, b, cI, cO, cR, ph, true), new THREE.MeshBasicMaterial({ color: OUT, side: THREE.FrontSide })));
    m.position.set(x, y + 0.05, z); m.rotation.set(tilt, r, tilt * 0.6); g.add(m);
    const tn = polypField(hairGeo({ w: 0.13, cA: cR, cB: '#FFFFFF', knob: 1.7 }), pmat(), sprinkle(m.geometry, Math.round(420 * a * b * 4), rnd, (pp) => pp.y > 0.035 && Math.hypot(pp.x / a, pp.z / b) > 0.2, true), { size: [0.02, 0.03], rnd, lean: 0.3, opt: { speed: 1.3, wave: 7, lo: 0.7, stretch: 0.5 } });
    m.add(tn); pfs.push(tn); });
  return g;
}

// 8 PURPLE PORE CORAL (Montipora): deep-purple plates spiralling up like a rose, thin lavender growing edge, tiny pores
function makePurplePore() {
  seed = 31; const g = new THREE.Group(), S = THREE.MathUtils.smoothstep, pfs = [], star = starGeo({ arms: 8, cIn: '#A88AF0', cOut: '#F0E6FF', mouth: '#1E0A40', tilt: 1.25, w: 0.14 }); g.userData.pfs = pfs;
  const c0 = new THREE.Color('#34145E'), c1 = new THREE.Color('#5A26A0'), c2 = new THREE.Color('#A07ADC');
  const rimMat = new THREE.MeshBasicMaterial({ color: OUT }), mat = vmat({ map: poreTex(), side: THREE.DoubleSide });
  for (let k = 0; k < 8; k++) { const a0 = k * 2.25, arc = 3.5 - k * 0.12, r0 = 0.04, r1 = 0.66 - k * 0.065, y0 = 0.04 + k * 0.05, rise = 0.14 + k * 0.035, ph = rnd() * 6;
    const geo = new THREE.PlaneGeometry(1, 1, 64, 12), p = geo.attributes.position, uv = geo.attributes.uv, vs = new Float32Array(p.count), rim = [];
    for (let i = 0; i < p.count; i++) { const u = p.getX(i) + 0.5, v = p.getY(i) + 0.5, ang = a0 + u * arc, taper = 0.12 + 0.88 * Math.pow(Math.sin(Math.PI * u), 0.55);
      const R = (r0 + (r1 - r0) * v * taper) * (1 + 0.07 * Math.sin(ang * 5 + ph) * v), y = y0 + rise * Math.pow(v, 1.6) * taper + 0.035 * Math.sin(ang * 4 + ph) * v * v;
      p.setXYZ(i, Math.cos(ang) * R, y, Math.sin(ang) * R); uv.setXY(i, u * arc * 2.2, v * 2.4); vs[i] = v; if (v > 0.999) rim.push(V(Math.cos(ang) * R, y, Math.sin(ang) * R)); }
    geo.computeVertexNormals(); let n = 0; paint(geo, (c) => { const v = vs[n++]; c.copy(c0).lerp(c1, S(v, 0.15, 0.8)).lerp(c2, S(v, 0.86, 1)); });
    const pf = polypField(star, pmat({ emissive: '#1A0A3A' }), sprinkle(geo, 150 - k * 10, rnd, (pp, nn) => nn.y > 0.2, true), { size: [0.013, 0.018], rnd, opt: { speed: 1.4, wave: 6, lo: 0.3 } }); g.add(pf); pfs.push(pf);
    g.add(new THREE.Mesh(geo, mat)); rim.sort((A, B) => Math.atan2(A.z, A.x) - Math.atan2(B.z, B.x));
    const ordered = []; for (let i = 0; i < p.count; i++) if (vs[i] > 0.999) ordered.push(V(p.getX(i), p.getY(i), p.getZ(i)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ordered), 90, 0.0065, 5, false), rimMat)); }
  const lump = new THREE.SphereGeometry(0.3, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2); lump.scale(1, 0.4, 1); g.add(lined(new THREE.Mesh(solid(lump, '#34145E'), vmat({ map: poreTex() })), 0.01));
  return g;
}

// 9 ORANGE CUP CORAL (Tubastraea): squat, ribbed orange cups packed on a rock; at night-like moments they bloom into fluffy yellow polyp flowers
function cupGeo(R, h, seedA) {   // short barrel with fine ribs, flared lip and a hollow mouth
  const pr = [[R * 0.85, 0], [R * 0.95, h * 0.3], [R, h * 0.7], [R * 1.12, h * 0.95], [R * 1.08, h * 1.02], [R * 0.86, h * 1.0], [R * 0.6, h * 0.86], [0.0001, h * 0.8]].map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(new THREE.SplineCurve(pr).getPoints(22), 40), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z), an = Math.atan2(z, x), y = p.getY(i), outer = y < h * 0.97 && r > R * 0.8 ? 1 : 0;
    const k = 1 + outer * 0.045 * Math.max(0, Math.cos(an * 18)) + (y > h * 0.9 && r < R * 0.95 ? 0.05 * Math.cos(an * 18) : 0); p.setX(i, x * k); p.setZ(i, z * k); }
  g.computeVertexNormals();
  const dark = new THREE.Color('#B8360E'), mid = new THREE.Color('#F2601A'), lip = new THREE.Color('#FF9A3A'), mouth = new THREE.Color('#E8A020');
  paint(g, (c, x, y, z) => { const r = Math.hypot(x, z); c.copy(dark).lerp(mid, Math.min(1, y / (h * 0.6))); if (y > h * 0.88) c.lerp(lip, 0.7); if (r < R * 0.7 && y > h * 0.75) c.copy(mouth); });
  g.deleteAttribute('uv'); return g.toNonIndexed();
}
function makeCupCoral() {
  seed = 37; const g = new THREE.Group();
  const rock = new THREE.IcosahedronGeometry(0.4, 3), rp = rock.attributes.position;
  for (let i = 0; i < rp.count; i++) { const k = 0.85 + vnoise(rp.getX(i) * 5, rp.getY(i) * 5, rp.getZ(i) * 5) * 0.3; rp.setXYZ(i, rp.getX(i) * k * 1.1, rp.getY(i) * k * 0.5, rp.getZ(i) * k * 0.9); }
  rock.computeVertexNormals(); g.add(lined(new THREE.Mesh(rock, cmat('#5E5260'))));
  const cups = [], parts = [];
  for (let k = 0; k < 22; k++) { const a = k * 2.39996, r = Math.sqrt((k + 0.5) / 22) * 0.34, R = 0.05 + rnd() * 0.025, h = 0.06 + rnd() * 0.06;
    const base = V(Math.cos(a) * r, 0.18 * Math.sqrt(Math.max(0, 1 - (r / 0.42) ** 2)) - 0.01, Math.sin(a) * r), d = V(Math.cos(a) * r * 1.6, 1, Math.sin(a) * r * 1.6).normalize();
    parts.push(place(cupGeo(R, h), base, d)); cups.push({ top: base.clone().addScaledVector(d, h * 0.86), d, R, ph: rnd() * 6.28 }); }
  g.add(lined(new THREE.Mesh(mergeGeometries(parts), vmat({ emissive: '#3A0E00' })), 0.008));
  // polyp crown: 20 tapered tentacles with pale knobby tips around a little orange mouth disc
  const tg = new THREE.LatheGeometry([[0.008, 0], [0.007, 0.03], [0.005, 0.06], [0.008, 0.07], [0.006, 0.078], [0.0001, 0.082]].map(([x, y]) => new THREE.Vector2(x, y)), 6);
  paint(tg, (c, x, y) => c.set('#FFC22E').lerp(new THREE.Color('#FFF2B0'), Math.max(0, (y - 0.055) / 0.025)));
  const T = 20, tm = new THREE.InstancedMesh(tg, vmat({ emissive: '#5A3000' }), cups.length * T);
  g.add(tm); g.userData = { cups, tm, T, t: 0 }; animateCup(g, 0);
  return g;
}
function animateCup(g, dt) { const u = g.userData; u.t += dt; let i = 0;
  u.cups.forEach((c) => { const open = THREE.MathUtils.smoothstep(Math.sin(u.t * 0.5 + c.ph), -0.6, 0.6); const q0 = new THREE.Quaternion().setFromUnitVectors(UP, c.d);
    for (let j = 0; j < u.T; j++) { const a = j / u.T * Math.PI * 2 + (j % 2) * 0.15, tilt = 0.25 + open * (j % 2 ? 1.0 : 1.35) + Math.sin(u.t * 2 + j + c.ph) * 0.08;
      const dir = V(Math.cos(a) * Math.sin(tilt), Math.cos(tilt), Math.sin(a) * Math.sin(tilt)).applyQuaternion(q0), sc = (c.R / 0.06) * (0.25 + open * 0.95) * (j % 2 ? 0.8 : 1);
      _m.compose(c.top.clone().addScaledVector(V(Math.cos(a), 0, Math.sin(a)).applyQuaternion(q0), c.R * 0.55), _q.setFromUnitVectors(UP, dir), _s.set(c.R / 0.06, sc, c.R / 0.06)); u.tm.setMatrixAt(i++, _m); } });
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
  const body = mergeGeometries(parts), g = new THREE.Group(); g.add(lined(new THREE.Mesh(body, vmat()), 0.006));
    g.userData.pfs = [];
  return g;
}

// 11 FINGER CORAL (Porites cylindrica): dense clump of knobby, gently bent fingers that fork near the top, olive base fading to creamy tips
function fingerGeo(len, R, bendAmt, ph) {
  const pts = [], n = 16; for (let k = 0; k <= n; k++) { const t = k / n; pts.push(new THREE.Vector2(R * (1 - 0.22 * t) * (1 + 0.09 * Math.sin(t * 8 + ph) + 0.05 * Math.sin(t * 17 + ph * 2)), len * t)); }
  const rt = pts[n].x; for (let k = 1; k <= 6; k++) { const a = k / 6 * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(0.0001, rt * Math.cos(a)), len + rt * 0.9 * Math.sin(a))); }
  const g = new THREE.LatheGeometry(pts, 14), p = g.attributes.position, top = len + rt;
  for (let i = 0; i < p.count; i++) { const t = p.getY(i) / top; p.setX(i, p.getX(i) + bendAmt * t * t * len); }
  g.computeVertexNormals();
  const c0 = new THREE.Color('#7E7434'), c1 = new THREE.Color('#C9C25A'), c2 = new THREE.Color('#F6F2BE');
  paint(g, (c, x, y) => { const t = Math.max(0, Math.min(1, y / top)); c.copy(c0).lerp(c1, Math.min(1, t * 1.8)).lerp(c2, Math.max(0, (t - 0.6) / 0.4)); });
  return g.toNonIndexed();
}
function makeFinger() {
  seed = 47; const parts = [];
  const finger = (p, d, len, R, depth) => { const bendAmt = (rnd() - 0.5) * 0.35, g = fingerGeo(len, R, bendAmt, rnd() * 6); g.rotateY(rnd() * 6.28); parts.push(place(g, p, d));
    if (depth > 0 && rnd() < 0.7) { const n = rnd() < 0.35 ? 2 : 1; for (let k = 0; k < n; k++) finger(p.clone().addScaledVector(d, len * (0.45 + rnd() * 0.2)), bend(d, 0.45 + rnd() * 0.3, 0.35), len * (0.5 + rnd() * 0.2), R * 0.85, depth - 1); } };
  for (let k = 0; k < 24; k++) { const a = k * 2.39996, r = Math.sqrt((k + 0.5) / 24) * 0.36, lean = r * 1.5;
    finger(V(Math.cos(a) * r, 0.03, Math.sin(a) * r), V(Math.cos(a) * lean + (rnd() - 0.5) * 0.2, 1, Math.sin(a) * lean + (rnd() - 0.5) * 0.2), (0.62 - r * 0.9) * (0.8 + rnd() * 0.4), 0.05 + rnd() * 0.018, 1); }
  const mound = new THREE.SphereGeometry(0.44, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2); mound.scale(1, 0.3, 1); parts.push(solid(mound.toNonIndexed(), '#7E7434'));
  const geo = mergeGeometries(parts);
  const g = new THREE.Group(); g.add(lined(new THREE.Mesh(geo, vmat()), 0.01));
  const fuzz = polypField(starGeo({ arms: 8, cIn: '#A8B848', cOut: '#FFFFFF', mouth: '#4E5A1E', tilt: 1.2, w: 0.15, seg: 2 }), pmat(), sprinkle(geo, 700, rnd, (p) => p.y > 0.07), { size: [0.016, 0.022], rnd, sink: 0.2, opt: { speed: 1.5, wave: 6, lo: 0.3 } });
  g.add(fuzz); g.userData.pfs = [fuzz]; return g;
}

const still = () => {};
export const CORALS3D = [
  { en: 'Staghorn coral', de: 'Geweihkoralle', make: makeStaghorn, anim: animatePF },
  { en: 'Table coral', de: 'Tischkoralle', make: makeTable, anim: animatePF },
  { en: 'Cauliflower coral', de: 'Blumenkohlkoralle', make: makeCauliflower, anim: animatePF },
  { en: 'Brain coral', de: 'Hirnkoralle', make: makeBrain, anim: animatePF },
  { en: 'Scroll coral', de: 'Kelchkoralle (Turbinaria)', make: makeScroll, anim: animatePF },
  { en: 'Bubble coral', de: 'Blasenkoralle', make: makeBubble, anim: animateBubble },
  { en: 'Mushroom coral', de: 'Pilzkoralle', make: makeMushroom, anim: animatePF },
  { en: 'Purple pore coral', de: 'Violette Porenkoralle', make: makePurplePore, anim: animatePF },
  { en: 'Orange cup coral', de: 'Orange Kelchkoralle (Tubastraea)', make: makeCupCoral, anim: animateCup },
  { en: 'Fire coral', de: 'Feuerkoralle', make: makeFireCoral, anim: animatePF },
  { en: 'Finger coral', de: 'Fingerkoralle', make: makeFinger, anim: animatePF },
].map(c => ({ ...c, cam: [-1.9, 1.6, -2.4], target: [0, 0.3, 0] }));
export { makeStaghorn, makeTable, makeCauliflower, makeBrain, makeScroll, makeBubble, animateBubble, makeMushroom, makePurplePore, makeCupCoral, animateCup, makeFireCoral, makeFinger };
