// Soft corals & anemones for the review page (Komodo reef): toon look, everything gently alive.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toonGradient, outline } from './materials.js';
import { makeFish3D, animateFish3D, design } from './fish3d.js';

const OUT = '#3B2614';
const V = (x, y, z) => new THREE.Vector3(x, y, z), UP = V(0, 1, 0);
let seed = 1; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const vmat = (o = {}) => new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGradient(), side: o.side || THREE.FrontSide, transparent: !!o.opacity, opacity: o.opacity ?? 1, emissive: new THREE.Color(o.emissive || '#000') });
const cmat = (color, o = {}) => new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), side: o.side || THREE.FrontSide, transparent: !!o.opacity, opacity: o.opacity ?? 1, emissive: new THREE.Color(o.emissive || '#000') });
const lined = (m, t = 0.012) => outline(m, t, OUT);
function paint(g, fn) { const p = g.attributes.position, a = new Float32Array(p.count * 3), c = new THREE.Color(); for (let i = 0; i < p.count; i++) { fn(c, p.getX(i), p.getY(i), p.getZ(i), i); a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
const ni = g => { g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; };
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3();

// instanced "tentacle field": every item has a base position, a rest direction and its own sway phase
function field(geo, mat, items, hullScale = 0) {
  const g = new THREE.Group(), im = new THREE.InstancedMesh(geo, mat, items.length); g.add(im);
  let hm = null; if (hullScale) { hm = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: OUT, side: THREE.BackSide }), items.length); g.add(hm); }
  g.userData.f = { im, hm, items, hullScale }; return g;
}
function updField(g, t, fn) { const { im, hm, items, hullScale } = g.userData.f;
  items.forEach((it, i) => { const [sw, sy] = fn(it, t); _q.setFromUnitVectors(UP, it.d); _e.set(sw * Math.cos(it.ph), 0, sw * Math.sin(it.ph)); _q2.setFromEuler(_e); _q.premultiply(_q2);
    _s.set(it.s, it.s * sy, it.s); _m.compose(it.p, _q, _s); im.setMatrixAt(i, _m);
    if (hm) { _s.multiplyScalar(hullScale); _m.compose(it.p, _q, _s); hm.setMatrixAt(i, _m); } });
  im.instanceMatrix.needsUpdate = true; if (hm) hm.instanceMatrix.needsUpdate = true; }

// 1 TOADSTOOL LEATHER CORAL (Sarcophyton): fat stalk, wavy folded cap carpeted with tiny polyps that slowly extend and retract
function makeLeather() {
  seed = 61; const g = new THREE.Group();
  const prof = []; for (let k = 0; k <= 24; k++) { const u = k / 24; prof.push(new THREE.Vector2(u < 0.55 ? 0.16 + 0.03 * Math.sin(u * 6) : 0.16 + Math.pow((u - 0.55) / 0.45, 1.6) * 0.48, u < 0.55 ? u * 0.62 : 0.34 + (u - 0.55) / 0.45 * 0.12)); }
  for (let k = 1; k <= 10; k++) { const u = k / 10; prof.push(new THREE.Vector2(0.64 * (1 - u * u), 0.46 + 0.05 * Math.sin(u * Math.PI))); }
  const geo = new THREE.LatheGeometry(prof, 96), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z), a = Math.atan2(z, x), w = Math.max(0, (r - 0.18) / 0.46) * (p.getY(i) > 0.3 ? 1 : 0);
    p.setY(i, p.getY(i) + Math.sin(a * 6 + 0.7) * 0.075 * w * w + Math.sin(a * 11) * 0.02 * w * w * w); const k = 1 + Math.sin(a * 6 + 0.7) * 0.05 * w; p.setX(i, x * k); p.setZ(i, z * k); }
  geo.computeVertexNormals();
  const stalk = new THREE.Color('#EDE2BE'), capU = new THREE.Color('#C9B25E'), capT = new THREE.Color('#D7C66E');
  paint(geo, (c, x, y) => { c.copy(stalk).lerp(y > 0.3 ? capT : capU, THREE.MathUtils.smoothstep(y, 0.28, 0.42)); });
  const cap = lined(new THREE.Mesh(ni(geo), vmat({ side: THREE.DoubleSide })), 0.012); g.add(cap);
  // polyps on the cap top
  const pg = mergeGeometries([ni(new THREE.CylinderGeometry(0.004, 0.006, 0.05, 5).translate(0, 0.025, 0)), ni(new THREE.SphereGeometry(0.011, 6, 4).translate(0, 0.05, 0))]);
  paint(pg, (c, x, y) => c.set(y > 0.042 ? '#F4FFE8' : '#E8E0B0'));
  const ray = new THREE.Raycaster(), items = [];
  for (let k = 0; k < 900; k++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.6; ray.set(V(Math.cos(a) * r, 2, Math.sin(a) * r), V(0, -1, 0)); const hit = ray.intersectObject(cap, true).find(h => h.object.isMesh && h.face && h.object.material.type !== 'MeshBasicMaterial');
    if (!hit || hit.point.y < 0.3) continue; const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld); if (n.y < 0) n.negate();
    items.push({ p: hit.point.clone(), d: n.lerp(UP, 0.3).normalize(), s: 0.8 + rnd() * 0.5, ph: rnd() * 6.28, r }); }
  const f = field(pg, vmat(), items); g.add(f); g.userData = { t: 0, f };
  animateLeather(g, 0); return g;
}
function animateLeather(g, dt) { const u = g.userData; u.t += dt;
  updField(u.f, u.t, (it, t) => [Math.sin(t * 1.6 + it.ph) * 0.18, 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 0.45 - it.r * 4))]);
}

// 2 CARNATION TREE CORAL (Dendronephthya): see-through pink trunk, branches ending in bright magenta polyp bunches
function makeTreeCoral() {
  seed = 67; const g = new THREE.Group(), swayers = [], tips = [];
  const trunkMat = cmat('#F6D2E0', { opacity: 0.82 }), spic = new THREE.Color('#FFFFFF');
  const branch = (parent, len, r, depth, rot) => {
    const b = new THREE.Group(); b.rotation.set(rot[0], rot[1], rot[2]); parent.add(b);
    const geo = new THREE.CylinderGeometry(r * 0.7, r, len, 10, 4); geo.translate(0, len / 2, 0);
    const m = lined(new THREE.Mesh(geo, trunkMat), 0.008); b.add(m); swayers.push({ o: b, rest: rot.slice(), ph: rnd() * 6.28, amp: 0.05 + depth * 0.025 });
    if (depth >= 3) { const c = new THREE.Group(); c.position.y = len; b.add(c); tips.push(c); return; }
    const n = depth === 0 ? 4 : 3;
    for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + rnd(), t = 0.55 + rnd() * 0.25; const at = new THREE.Group(); at.position.y = len * (depth === 0 ? 0.55 + k * 0.13 : 0.75 + rnd() * 0.25); b.add(at);
      branch(at, len * (0.62 + rnd() * 0.15), r * 0.62, depth + 1, [Math.cos(a) * t, 0, Math.sin(a) * t]); }
    if (depth === 0) { const c = new THREE.Group(); c.position.y = len; b.add(c); tips.push(c); }
  };
  branch(g, 0.55, 0.07, 0, [0, 0, 0]);
  // polyp bunches: instanced balls arranged as little cauliflowers
  const ball = new THREE.SphereGeometry(1, 10, 8), mat = cmat('#F0306E', { emissive: '#4A0018' }), dot = cmat('#FFD6E6');
  tips.forEach(c => { const n = 9; const im = new THREE.InstancedMesh(ball, mat, n), dm = new THREE.InstancedMesh(ball, dot, n), hm = new THREE.InstancedMesh(ball, new THREE.MeshBasicMaterial({ color: OUT, side: THREE.BackSide }), n);
    for (let i = 0; i < n; i++) { const y = 1 - (i + 0.5) / n * 1.4, rr = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.4, p = V(Math.cos(a) * rr * 0.05, 0.035 + y * 0.03, Math.sin(a) * rr * 0.05), s = 0.026 + rnd() * 0.008;
      _m.compose(p, _q.identity(), _s.set(s, s, s)); im.setMatrixAt(i, _m); _m.compose(p, _q, _s.multiplyScalar(1.18)); hm.setMatrixAt(i, _m);
      _m.compose(p.clone().multiplyScalar(1.0).add(V(0, s * 0.7, 0)), _q, _s.set(s * 0.35, s * 0.35, s * 0.35)); dm.setMatrixAt(i, _m); }
    c.add(hm, im, dm); });
  const foot = new THREE.SphereGeometry(0.12, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2); foot.scale(1.3, 0.4, 1.3); g.add(lined(new THREE.Mesh(foot, trunkMat), 0.008));
  g.userData = { t: 0, swayers }; return g;
}
function animateTree(g, dt) { const u = g.userData; u.t += dt; u.swayers.forEach(s => { s.o.rotation.x = s.rest[0] + Math.sin(u.t * 0.9 + s.ph) * s.amp; s.o.rotation.z = s.rest[2] + Math.cos(u.t * 0.7 + s.ph) * s.amp; }); }

// 3 PULSING XENIA: soft lavender stalks, each crowned with feathery 8-armed polyps that open and close like hands
function makeXenia() {
  seed = 71; const g = new THREE.Group(), heads = [];
  const arm = (() => { const parts = [ni(new THREE.CapsuleGeometry(0.008, 0.07, 3, 6).translate(0, 0.043, 0))];
    for (let k = 0; k < 6; k++) { const y = 0.02 + k * 0.011; [-1, 1].forEach(sd => { const f = new THREE.CylinderGeometry(0.0025, 0.0035, 0.022, 4); f.rotateZ(sd * 1.1); f.translate(sd * 0.011, y + 0.004, 0); parts.push(ni(f)); }); }
    const a = mergeGeometries(parts); paint(a, (c, x, y) => c.set('#F4EEFF').lerp(new THREE.Color('#8466C4'), Math.max(0, 1 - y * 14) * 0.9).lerp(new THREE.Color('#C9B4F0'), Math.abs(x) > 0.008 ? 0.35 : 0)); return a; })();
  const items = [];
  for (let s = 0; s < 7; s++) { const a = s / 7 * Math.PI * 2 + rnd() * 0.5, r = s ? 0.16 + rnd() * 0.08 : 0, h = 0.24 + rnd() * 0.14, tilt = r * 2.2;
    const dir = V(Math.cos(a) * tilt, 1, Math.sin(a) * tilt).normalize(), base = V(Math.cos(a) * r * 0.6, 0, Math.sin(a) * r * 0.6), top = base.clone().addScaledVector(dir, h);
    const st = new THREE.CylinderGeometry(0.036, 0.03, h, 12, 4); st.translate(0, h / 2, 0); paint(st, (c, x, y) => c.set('#9C86CC').lerp(new THREE.Color('#E2D6F6'), y / h)); st.applyMatrix4(new THREE.Matrix4().compose(base, new THREE.Quaternion().setFromUnitVectors(UP, dir), V(1, 1, 1)));
    g.add(lined(new THREE.Mesh(st, vmat()), 0.008));
    for (let k = 0; k < 4; k++) { const pa = k / 4 * Math.PI * 2 + rnd(), pd = dir.clone().add(V(Math.cos(pa) * 0.7, 0.25, Math.sin(pa) * 0.7)).normalize(), pc = top.clone().addScaledVector(pd, 0.06);
      const ph = rnd() * 6.28, sc = 0.95 + rnd() * 0.25; heads.push({ c: pc, d: pd, ph });
      for (let j = 0; j < 8; j++) items.push({ p: pc, d: pd, j, ph, s: sc, side: V(), q: new THREE.Quaternion().setFromUnitVectors(UP, pd) }); } }
  const im = new THREE.InstancedMesh(arm, vmat(), items.length); g.add(im);
  const knob = new THREE.SphereGeometry(0.018, 8, 6), km = new THREE.InstancedMesh(knob, cmat('#D8C6F2'), heads.length);
  heads.forEach((h, i) => { _m.compose(h.c, _q.identity(), _s.set(1, 1, 1)); km.setMatrixAt(i, _m); }); g.add(km);
  g.userData = { t: 0, im, items }; animateXenia(g, 0); return g;
}
const _ea = new THREE.Euler();
function animateXenia(g, dt) { const u = g.userData; u.t += dt;
  u.items.forEach((it, i) => { const pulse = Math.pow(0.5 + 0.5 * Math.sin(u.t * 2.6 + it.ph), 1.5), open = 0.25 + pulse * 1.15;   // open angle from the polyp axis
    _ea.set(open, it.j / 8 * Math.PI * 2, 0, 'YXZ'); _q2.setFromEuler(_ea); _q.copy(it.q).multiply(_q2); _m.compose(it.p, _q, _s.set(it.s, it.s, it.s)); u.im.setMatrixAt(i, _m); });
  u.im.instanceMatrix.needsUpdate = true; }

// 4 SEA WHIPS (Junceella / Ellisella): long, thin red-orange whips with pale polyp dots, swaying in the current
function makeWhips() {
  seed = 73; const g = new THREE.Group(), whips = [];
  for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2 + rnd() * 0.5, h = 0.7 + rnd() * 0.6, tilt = 0.18 + rnd() * 0.25, col = k % 3 === 2 ? ['#F2E2C8', '#FFF6E8'] : ['#D8401E', '#FF7A3A'];
    const geo = new THREE.CylinderGeometry(0.007, 0.016, h, 8, 48, false); geo.translate(0, h / 2, 0); const base = geo.attributes.position.array.slice();
    const A = new THREE.Color(col[0]), B = new THREE.Color(col[1]), W = new THREE.Color('#FFF8F0');
    paint(geo, (c, x, y, z, i) => { c.copy(A).lerp(B, y / h); if (((i * 7919) % 23) === 0 && y > 0.05) c.lerp(W, 0.8); });
    const m = lined(new THREE.Mesh(geo, vmat()), 0.006); m.position.set(Math.cos(a) * 0.08, 0, Math.sin(a) * 0.08); m.rotation.set(Math.cos(a) * tilt, 0, -Math.sin(a) * tilt); g.add(m);
    whips.push({ geo, base, h, ph: rnd() * 6.28, f: 0.7 + rnd() * 0.4, hull: m.children.find(c => c.geometry !== geo && c.isMesh) }); }
  const foot = new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2); foot.scale(1.4, 0.5, 1.4); g.add(lined(new THREE.Mesh(foot, cmat('#8A3A22')), 0.008));
  g.userData = { t: 0, whips }; animateWhips(g, 0); return g;
}
function animateWhips(g, dt) { const u = g.userData; u.t += dt;
  u.whips.forEach(w => { const p = w.geo.attributes.position, b = w.base;
    for (let i = 0; i < p.count; i++) { const y = b[i * 3 + 1], k = Math.pow(y / w.h, 2); p.setXYZ(i, b[i * 3] + Math.sin(u.t * w.f + w.ph - y * 2.5) * 0.12 * k, y - 0.02 * k, b[i * 3 + 2] + Math.cos(u.t * w.f * 0.8 + w.ph - y * 2) * 0.07 * k); }
    p.needsUpdate = true; w.geo.computeVertexNormals(); });
}

// 5 BUBBLE-TIP ANEMONE (Entacmaea quadricolor): frilly column, striped oral disc, a crowd of curved tentacles each with a banded bulb and
//   a pointed magenta tip, and a pair of clownfish nestling inside
function makeBubbleTip() {
  seed = 79; const g = new THREE.Group(), S = THREE.MathUtils.smoothstep, C = (h) => new THREE.Color(h);
  // column: flares from a narrow foot into a wavy collar
  const cp = []; for (let k = 0; k <= 14; k++) { const t = k / 14; cp.push(new THREE.Vector2(0.15 + 0.03 * Math.sin(t * 5) + Math.pow(t, 2.2) * 0.2, t * 0.2)); }
  const col = new THREE.LatheGeometry(cp, 64), p = col.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i), an = Math.atan2(z, x), w = Math.pow(y / 0.2, 2), k = 1 + 0.07 * Math.sin(an * 9) * w; p.setXYZ(i, x * k, y + 0.02 * Math.sin(an * 9 + 1) * w, z * k); }
  col.computeVertexNormals(); const cA = C('#7A1626'), cB = C('#C8303E'), cS = C('#F2A0A0');
  paint(col, (c, x, y, z) => { const an = Math.atan2(z, x); c.copy(cA).lerp(cB, y / 0.2); c.lerp(cS, 0.5 * Math.pow(Math.max(0, Math.sin(an * 14) * Math.sin(y * 90)), 6)); });
  g.add(lined(new THREE.Mesh(ni(col), vmat({ side: THREE.DoubleSide })), 0.009));
  // oral disc with radial stripes and a raised mouth
  const disc = new THREE.CircleGeometry(0.33, 64, 0, Math.PI * 2); disc.rotateX(-Math.PI / 2); const dp = disc.attributes.position;
  for (let i = 0; i < dp.count; i++) { const r = Math.hypot(dp.getX(i), dp.getZ(i)); dp.setY(i, 0.185 + 0.03 * Math.exp(-r * r / 0.004)); }
  disc.computeVertexNormals(); paint(disc, (c, x, y, z) => { const r = Math.hypot(x, z), an = Math.atan2(z, x); c.set('#8A4A3E').lerp(C('#E8B8A0'), 0.5 * Math.pow(Math.abs(Math.sin(an * 12)), 4)); if (r < 0.05) c.lerp(C('#FFD0C8'), 1 - r / 0.05); });
  g.add(new THREE.Mesh(ni(disc), vmat()));
  // tentacle: slim striped stalk curving outward, swollen bulb with a pale band, pointed tip
  const L = 0.3, prof = [[0.011, 0], [0.011, 0.25], [0.0095, 0.5], [0.0095, 0.6], [0.014, 0.66], [0.024, 0.73], [0.029, 0.8], [0.027, 0.86], [0.019, 0.91], [0.011, 0.95], [0.006, 0.985], [0.0001, 1]];
  const mk = (grow) => { const t = new THREE.LatheGeometry(new THREE.SplineCurve(prof.map(([r, y]) => new THREE.Vector2(r + grow, y * L))).getPoints(34), 12), q = t.attributes.position;
    for (let i = 0; i < q.count; i++) { const y = q.getY(i) / L; q.setX(i, q.getX(i) + 0.3 * y * y * L); q.setY(i, q.getY(i) - 0.1 * y * y * y * L); } t.computeVertexNormals(); return t; };
  const tg = mk(0), st0 = C('#8E3A4E'), st1 = C('#D0607A'), bulb = C('#FF86A0'), band = C('#FFE6EA'), tipc = C('#E0207A');
  { const q = tg.attributes.position; let i = 0; paint(tg, (c, x, y0, z) => { const row = i % 35, colm = Math.floor(i / 35); i++; const y = row / 34;
      c.copy(st0).lerp(st1, y * 1.4); if (colm % 2) c.lerp(band, 0.22 * (1 - S(y, 0.5, 0.66))); c.lerp(bulb, S(y, 0.6, 0.72)); c.lerp(band, 0.85 * S(y, 0.76, 0.79) * (1 - S(y, 0.82, 0.85))); c.lerp(tipc, S(y, 0.9, 0.97)); }); }
  const items = [], N = 150;
  for (let i = 0; i < N; i++) { const f = (i + 0.5) / N, r = 0.05 + Math.sqrt(f) * 0.27, a = i * 2.39996, out = V(Math.cos(a), 0, Math.sin(a)), tilt = 0.1 + f * 0.8;
    items.push({ p: V(out.x * r, 0.185, out.z * r), out, tilt, s: (0.6 + f * 0.55) * (0.85 + rnd() * 0.3), w: 0.9 + rnd() * 0.35, ph: rnd() * 6.28, r, a }); }
  const im = new THREE.InstancedMesh(tg, vmat({ emissive: '#30000C' }), N), hm = new THREE.InstancedMesh(mk(0.0035), new THREE.MeshBasicMaterial({ color: OUT, side: THREE.BackSide }), N); g.add(hm, im);
  // clownfish pair
  const fish = []; const d = design('Clownfish');
  if (d) [[0.3, 0.1], [0.2, 2.4]].forEach(([size, ph]) => { const f = makeFish3D(d, size); g.add(f); fish.push({ f, ph, size }); });
  g.userData = { t: 0, im, hm, items, fish }; animateBubbleTip(g, 0); return g;
}
const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _b = new THREE.Matrix4();
function animateBubbleTip(g, dt) { const u = g.userData; u.t += dt; const t = u.t;
  u.items.forEach((it, i) => { const tilt = it.tilt + Math.sin(t * 1.1 - it.r * 7 + it.a) * 0.16, sw = Math.sin(t * 0.8 + it.ph) * 0.14;
    _y.set(it.out.x * Math.sin(tilt), Math.cos(tilt), it.out.z * Math.sin(tilt)); _z.set(-it.out.z, 0, it.out.x); _y.addScaledVector(_z, sw).normalize(); _x.crossVectors(_y, _z).normalize(); _z.crossVectors(_x, _y);
    _b.makeBasis(_x, _y, _z); _q.setFromRotationMatrix(_b); const len = it.s * (1 + 0.05 * Math.sin(t * 0.9 + it.ph));
    _m.compose(it.p, _q, _s.set(it.w, len, it.w)); u.im.setMatrixAt(i, _m); u.hm.setMatrixAt(i, _m); });
  u.im.instanceMatrix.needsUpdate = u.hm.instanceMatrix.needsUpdate = true;
  u.fish.forEach((o, k) => { const a = t * 0.5 * (k ? -1 : 1) + o.ph, R = 0.12 + 0.05 * Math.sin(t * 0.7 + o.ph); o.f.position.set(Math.cos(a) * R, 0.42 + k * 0.06 + Math.sin(t * 1.3 + o.ph) * 0.03, Math.sin(a) * R);
    o.f.rotation.y = -a + (k ? Math.PI / 2 : -Math.PI / 2) + Math.PI / 2; animateFish3D(o.f, dt); });
}

export const SOFT3D = [
  { en: 'Toadstool leather coral', de: 'Lederkoralle (Sarcophyton)', make: makeLeather, anim: animateLeather, cam: [-2.2, 1.9, -2.8], target: [0, 0.25, 0] },
  { en: 'Carnation tree coral', de: 'Bäumchenweichkoralle (Dendronephthya)', make: makeTreeCoral, anim: animateTree, cam: [-2.7, 1.6, -3.4], target: [0, 0.7, 0] },
  { en: 'Pulsing Xenia', de: 'Pumpende Xenia', make: makeXenia, anim: animateXenia, cam: [-1.2, 1.0, -1.5], target: [0, 0.2, 0] },
  { en: 'Sea whips', de: 'Peitschenkorallen', make: makeWhips, anim: animateWhips, cam: [-2.6, 1.4, -3.2], target: [0, 0.65, 0] },
  { en: 'Bubble-tip anemone', de: 'Blasenanemone', make: makeBubbleTip, anim: animateBubbleTip, cam: [-1.25, 1.15, -1.6], target: [0, 0.28, 0] },
];
export { makeLeather, animateLeather, makeTreeCoral, animateTree, makeXenia, animateXenia, makeWhips, animateWhips, makeBubbleTip, animateBubbleTip };
