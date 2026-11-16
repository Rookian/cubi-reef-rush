// Soft corals & anemones for the review page (Komodo reef): toon look, everything gently alive.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toonGradient, outline } from './materials.js';
import { makeFish3D, animateFish3D, design } from './fish3d.js';
import { starGeo } from './polyps.js';

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

// 1 TOADSTOOL LEATHER CORAL (Sarcophyton): wrinkled cream stalk flaring into a thick, deeply folded cap with a curled pale margin;
//   the top is carpeted with slender golden polyps that retract and re-emerge in a slow wave
function makeLeather() {
  seed = 61; const g = new THREE.Group(), S = THREE.MathUtils.smoothstep, C = (h) => new THREE.Color(h);
  const ctrl = [[0.25, 0], [0.19, 0.04], [0.155, 0.12], [0.15, 0.22], [0.17, 0.3], [0.3, 0.37], [0.5, 0.41], [0.63, 0.43], [0.665, 0.455], [0.64, 0.485], [0.5, 0.49], [0.3, 0.475], [0.12, 0.455], [0.0001, 0.45]];
  const NP = 56, prof = new THREE.SplineCurve(ctrl.map(([x, y]) => new THREE.Vector2(x, y))).getPoints(NP - 1), jTop = Math.round(NP * 0.66);
  const geo = new THREE.LatheGeometry(prof, 128), p = geo.attributes.position, fold = (a) => 0.1 * Math.sin(a * 5 + 0.7) + 0.045 * Math.sin(a * 9 + 2.1) + 0.02 * Math.sin(a * 17);
  const bend = (x, y, z) => { const r = Math.hypot(x, z), a = Math.atan2(z, x), w = y > 0.3 ? Math.pow(S(r, 0.2, 0.66), 1.4) : 0, k = 1 + 0.09 * Math.sin(a * 5 + 1.9) * w, wr = y < 0.3 ? 1 + 0.035 * Math.sin(y * 80) * S(y, 0.03, 0.1) : 1;
    return V(x * k * wr, y + fold(a) * w, z * k * wr); };
  for (let i = 0; i < p.count; i++) { const q = bend(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, q.x, q.y, q.z); }
  geo.computeVertexNormals();
  const st0 = C('#C9B48C'), st1 = C('#F0E2C2'), un = C('#D9CFA0'), t0 = C('#8E9A46'), t1 = C('#C4C46A'), mar = C('#F4EEC0'), groove = C('#A8906A'); let n = 0;
  paint(geo, (c, x, y, z) => { const j = n++ % NP, r = Math.hypot(x, z);
    if (j < NP * 0.36) { c.copy(st0).lerp(st1, S(y, 0, 0.3)).lerp(groove, 0.35 * Math.max(0, -Math.sin(y * 80))); }
    else if (j < jTop - 4) c.copy(st1).lerp(un, S(r, 0.2, 0.6)).lerp(groove, 0.18 * Math.pow(Math.abs(Math.sin(Math.atan2(z, x) * 30)), 6));
    else if (j <= jTop + 3) c.copy(mar);
    else c.copy(t0).lerp(t1, S(r, 0.1, 0.55)).lerp(mar, S(r, 0.56, 0.66) * 0.8); });
  const cap = lined(new THREE.Mesh(ni(geo), vmat({ side: THREE.DoubleSide })), 0.011); g.add(cap);
  const pg = starGeo({ arms: 8, cIn: '#F2E27A', cOut: '#FFFFFF', mouth: '#6E9A22', stem: 1.9, stemW: 0.16, cStem: '#CFC47A', tilt: 1.15, w: 0.105, curl: 0.35 }); pg.scale(0.027, 0.027, 0.027);
  const items = [], N = 560;
  for (let k = 0; k < N; k++) { const a = k * 2.39996, r = 0.06 + Math.sqrt((k + 0.5) / N) * 0.56, x = Math.cos(a) * r, z = Math.sin(a) * r, e = 0.01;
    const q = bend(x, topY(r), z), nx = bend(x + e, topY(Math.hypot(x + e, z)), z).sub(q), nz = bend(x, topY(Math.hypot(x, z + e)), z + e).sub(q), nn = new THREE.Vector3().crossVectors(nz, nx).normalize(); if (nn.y < 0) nn.negate();
    items.push({ p: q, d: nn.lerp(UP, 0.25).normalize(), s: 0.85 + rnd() * 0.4, ph: rnd() * 6.28, r }); }
  function topY(r) { return r < 0.12 ? 0.45 + (r / 0.12) * 0.005 : r < 0.3 ? 0.455 + (r - 0.12) / 0.18 * 0.02 : r < 0.5 ? 0.475 + (r - 0.3) / 0.2 * 0.015 : 0.49 - (r - 0.5) / 0.14 * 0.005; }
  const f = field(pg, vmat({ emissive: '#2A2400' }), items); g.add(f); g.userData = { t: 0, f };
  animateLeather(g, 0); return g;
}
function animateLeather(g, dt) { const u = g.userData; u.t += dt;
  updField(u.f, u.t, (it, t) => [Math.sin(t * 1.4 + it.ph) * 0.16, 0.35 + 0.65 * THREE.MathUtils.smoothstep(Math.sin(t * 0.5 - it.r * 5), -1.0, -0.3)]);
}

// 2 CARNATION TREE CORAL (Dendronephthya): see-through pink trunk, branches ending in bright magenta polyp bunches
function makeTreeCoral() {
  seed = 67; const g = new THREE.Group(), swayers = [], tips = [];
  const trunkMat = vmat({ opacity: 0.86 });
  const branch = (parent, len, r, depth, rot) => {
    const b = new THREE.Group(); b.rotation.set(rot[0], rot[1], rot[2]); parent.add(b);
    const geo = new THREE.CylinderGeometry(r * 0.7, r, len, 12, 10); geo.translate(0, len / 2, 0); paint(geo, (c, x, y, z, i) => { c.set('#F2B8CE').lerp(new THREE.Color('#FBE2EC'), y / len); if ((i * 7919) % 5 === 0) c.set('#FFFFFF'); if ((i * 104729) % 11 === 0) c.set('#E0709A'); });
    const m = lined(new THREE.Mesh(geo, trunkMat), 0.008); b.add(m); swayers.push({ o: b, rest: rot.slice(), ph: rnd() * 6.28, amp: 0.05 + depth * 0.025 });
    if (depth >= 3) { const c = new THREE.Group(); c.position.y = len; b.add(c); tips.push(c); return; }
    const n = depth === 0 ? 4 : 3;
    for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + rnd(), t = 0.55 + rnd() * 0.25; const at = new THREE.Group(); at.position.y = len * (depth === 0 ? 0.55 + k * 0.13 : 0.75 + rnd() * 0.25); b.add(at);
      branch(at, len * (0.62 + rnd() * 0.15), r * 0.62, depth + 1, [Math.cos(a) * t, 0, Math.sin(a) * t]); }
    if (depth === 0) { const c = new THREE.Group(); c.position.y = len; b.add(c); tips.push(c); }
  };
  branch(g, 0.55, 0.07, 0, [0, 0, 0]);
  // polyp bunches: instanced balls arranged as little cauliflowers
  const bunch = (() => { const ps = [], st = starGeo({ arms: 8, cIn: '#FF4E86', cOut: '#FFE6EE', mouth: '#FFE27A', tilt: 0.95, w: 0.13 }), core = new THREE.Color('#C8124E');
    for (let i = 0; i < 11; i++) { const y = 1 - (i + 0.5) / 11 * 1.5, rr = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.4, d = V(Math.cos(a) * rr, y, Math.sin(a) * rr).normalize(), p = V(d.x * 0.05, 0.035 + d.y * 0.034, d.z * 0.05), sz = 0.022 + rnd() * 0.007;
      const b = new THREE.SphereGeometry(sz, 8, 6); b.translate(p.x, p.y, p.z); ps.push(paint(ni(b), c => c.copy(core)));
      const k = st.clone(); k.scale(sz * 1.25, sz * 1.25, sz * 1.25); k.applyMatrix4(new THREE.Matrix4().compose(p.clone().addScaledVector(d, sz * 0.75), new THREE.Quaternion().setFromUnitVectors(UP, d), V(1, 1, 1))); ps.push(k); }
    const g2 = mergeGeometries(ps); g2.computeVertexNormals(); return g2; })();
  const bmat = vmat({ emissive: '#3A0014' }); tips.forEach(c => { const m = lined(new THREE.Mesh(bunch, bmat), 0.0035); m.rotation.y = rnd() * 6.28; c.add(m); });
  const foot = new THREE.SphereGeometry(0.12, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2); foot.scale(1.3, 0.4, 1.3); g.add(lined(new THREE.Mesh(foot, cmat('#F2B8CE')), 0.008));
  g.userData = { t: 0, swayers }; return g;
}
function animateTree(g, dt) { const u = g.userData; u.t += dt; u.swayers.forEach(s => { s.o.rotation.x = s.rest[0] + Math.sin(u.t * 0.9 + s.ph) * s.amp; s.o.rotation.z = s.rest[2] + Math.cos(u.t * 0.7 + s.ph) * s.amp; }); }

// 3 PULSING XENIA: wrinkled mauve trunks crowned with long-stemmed polyps; each polyp is a hand of 8 feathery arms that opens and closes
function makeXenia() {
  seed = 71; const g = new THREE.Group(), heads = [], C = (h) => new THREE.Color(h), parts = [];
  const AL = 0.085, arm = (() => { const ps = []; const rach = new THREE.CylinderGeometry(0.0028, 0.0062, AL, 6, 8); rach.translate(0, AL / 2, 0); rach.scale(1, 1, 0.6); ps.push(ni(rach));
    for (let k = 0; k < 11; k++) { const t = (k + 1) / 12, y = AL * (0.1 + t * 0.86), len = 0.02 * (1 - t * 0.55) * (k < 2 ? 0.6 + k * 0.2 : 1); [-1, 1].forEach(sd => { const f = new THREE.ConeGeometry(0.0022, len, 4); f.translate(0, len / 2, 0); f.rotateZ(-sd * 0.95); f.translate(sd * 0.003, y, 0); ps.push(ni(f)); }); }
    const tip = new THREE.SphereGeometry(0.0034, 6, 4); tip.translate(0, AL, 0); ps.push(ni(tip));
    const a = mergeGeometries(ps), q = a.attributes.position; for (let i = 0; i < q.count; i++) { const t = q.getY(i) / AL; q.setZ(i, q.getZ(i) - 0.22 * t * t * AL + Math.abs(q.getX(i)) * 0.25); }
    a.computeVertexNormals(); const c0 = C('#C8508E'), c1 = C('#F6B8D6'), c2 = C('#FFF6FB'), pin = C('#FFE9F4');
    paint(a, (c, x, y) => { const t = Math.max(0, Math.min(1, y / AL)); c.copy(c0).lerp(c1, Math.min(1, t * 2.2)).lerp(c2, Math.max(0, (t - 0.55) / 0.45)); if (Math.abs(x) > 0.004) c.lerp(pin, 0.7); }); return a; })();
  const items = [], stemC0 = C('#B078A8'), stemC1 = C('#F0CFE4');
  for (let s = 0; s < 6; s++) { const a = s / 5 * Math.PI * 2 + rnd() * 0.5, r = s ? 0.15 + rnd() * 0.05 : 0, h = 0.2 + rnd() * 0.1 + (s ? 0 : 0.08), tilt = r * 2.4;
    const dir = V(Math.cos(a) * tilt, 1, Math.sin(a) * tilt).normalize(), base = V(Math.cos(a) * r * 0.55, 0, Math.sin(a) * r * 0.55), top = base.clone().addScaledVector(dir, h), q0 = new THREE.Quaternion().setFromUnitVectors(UP, dir);
    // wrinkled trunk
    const tp = []; for (let k = 0; k <= 20; k++) { const t = k / 20; tp.push(new THREE.Vector2(0.04 * (1.15 - 0.3 * t + 0.25 * t * t * t) * (1 + 0.07 * Math.sin(t * 34)), h * t)); }
    for (let k = 1; k <= 4; k++) { const an = k / 4 * Math.PI / 2; tp.push(new THREE.Vector2(Math.max(0.0001, 0.044 * Math.cos(an)), h + 0.02 * Math.sin(an))); }
    const tr = new THREE.LatheGeometry(tp, 16); paint(tr, (c, x, y) => c.set('#7A4A7E').lerp(C('#D8A6CC'), Math.min(1, y / h)).lerp(C('#5A2E62'), 0.35 * Math.max(0, Math.sin(y / h * 34 + 3.6))));
    parts.push(ni(tr).applyMatrix4(new THREE.Matrix4().compose(base, q0, V(1, 1, 1))));
    // polyps on slender stems fanning out of the crown
    const n = 9; for (let k = 0; k < n; k++) { const f = (k + 0.5) / n, pa = k * 2.39996 + s, sp = 0.15 + Math.sqrt(f) * 1.0, pd = V(Math.cos(pa) * Math.sin(sp), Math.cos(sp), Math.sin(pa) * Math.sin(sp)).applyQuaternion(q0), sl = 0.07 + rnd() * 0.07;
      const sb = top.clone().addScaledVector(V(Math.cos(pa), 0, Math.sin(pa)).applyQuaternion(q0), 0.022 * Math.sqrt(f)), pc = sb.clone().addScaledVector(pd, sl);
      const st = new THREE.CylinderGeometry(0.0055, 0.008, sl, 6); st.translate(0, sl / 2, 0); paint(st, (c, x, y) => c.copy(stemC0).lerp(stemC1, y / sl)); parts.push(ni(st).applyMatrix4(new THREE.Matrix4().compose(sb, new THREE.Quaternion().setFromUnitVectors(UP, pd), V(1, 1, 1))));
      const ph = rnd() * 6.28, sc = 0.8 + rnd() * 0.3; heads.push({ c: pc, d: pd });
      for (let j = 0; j < 8; j++) items.push({ p: pc, d: pd, j, ph, s: sc, q: new THREE.Quaternion().setFromUnitVectors(UP, pd) }); } }
  const foot = new THREE.SphereGeometry(0.17, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2); foot.scale(1.2, 0.3, 1.2); parts.push(solid2(ni(foot), '#7A4A7E'));
  g.add(lined(new THREE.Mesh(mergeGeometries(parts), vmat()), 0.003));
  const im = new THREE.InstancedMesh(arm, vmat({ side: THREE.DoubleSide, emissive: '#2A0A20' }), items.length); g.add(im);
  const km = new THREE.InstancedMesh(new THREE.SphereGeometry(0.011, 8, 6), cmat('#FFD25A', { emissive: '#4A3000' }), heads.length);
  heads.forEach((h, i) => { _m.compose(h.c, _q.identity(), _s.set(1, 1, 1)); km.setMatrixAt(i, _m); }); g.add(km);
  g.userData = { t: 0, im, items }; animateXenia(g, 0); return g;
}
const solid2 = (g, col) => { const k = new THREE.Color(col); return paint(g, c => c.copy(k)); };
const _ea = new THREE.Euler();
function animateXenia(g, dt) { const u = g.userData; u.t += dt;
  u.items.forEach((it, i) => { const pulse = Math.pow(0.5 + 0.5 * Math.sin(u.t * 2.4 + it.ph), 1.3), open = 0.32 + pulse * 1.0;   // open angle from the polyp axis
    _ea.set(open, it.j / 8 * Math.PI * 2, 0, 'YXZ'); _q2.setFromEuler(_ea); _q.copy(it.q).multiply(_q2); _m.compose(it.p, _q, _s.set(it.s, it.s, it.s)); u.im.setMatrixAt(i, _m); });
  u.im.instanceMatrix.needsUpdate = true; }

// 4 SEA WHIPS (Junceella / Ellisella): long, thin red-orange whips with pale polyp dots, swaying in the current
function makeWhips() {
  seed = 73; const g = new THREE.Group(), whips = [], wst = starGeo({ arms: 8, cIn: '#FFD8C0', cOut: '#FFFFFF', mouth: '#B8301A', tilt: 1.05, w: 0.13, seg: 1 });
  for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2 + rnd() * 0.5, h = 0.7 + rnd() * 0.6, tilt = 0.18 + rnd() * 0.25, col = k % 3 === 2 ? ['#F2E2C8', '#FFF6E8'] : ['#D8401E', '#FF7A3A'];
    let geo = new THREE.CylinderGeometry(0.007, 0.016, h, 8, 48, false); geo.translate(0, h / 2, 0);
    const A = new THREE.Color(col[0]), B = new THREE.Color(col[1]), W = new THREE.Color('#FFF8F0');
    paint(geo, (c, x, y) => { c.copy(A).lerp(B, y / h); });
    const ps = [ni(geo)], np = Math.round(h * 95); for (let j = 0; j < np; j++) { const y = 0.06 + (j + rnd()) / np * (h - 0.07), an = j * 2.39996, rr = 0.016 - 0.009 * y / h, d = V(Math.cos(an), 0.35, Math.sin(an)).normalize(), k = wst.clone(), sz = 0.011 + rnd() * 0.005;
      k.scale(sz, sz, sz); k.applyMatrix4(new THREE.Matrix4().compose(V(Math.cos(an) * rr, y, Math.sin(an) * rr), new THREE.Quaternion().setFromUnitVectors(UP, d), V(1, 1, 1))); ps.push(k); }
    geo = mergeGeometries(ps); geo.computeVertexNormals(); const base = geo.attributes.position.array.slice();
    const m = lined(new THREE.Mesh(geo, vmat()), 0.003); m.position.set(Math.cos(a) * 0.08, 0, Math.sin(a) * 0.08); m.rotation.set(Math.cos(a) * tilt, 0, -Math.sin(a) * tilt); g.add(m);
    whips.push({ geo, base, h, ph: rnd() * 6.28, f: 0.7 + rnd() * 0.4, hull: m.children.find(c => c.geometry !== geo && c.isMesh) }); }
  const foot = new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2); foot.scale(1.4, 0.5, 1.4); g.add(lined(new THREE.Mesh(foot, cmat('#8A3A22')), 0.008));
  g.userData = { t: 0, whips }; animateWhips(g, 0); return g;
}
function animateWhips(g, dt) { const u = g.userData; u.t += dt;
  u.whips.forEach(w => { const p = w.geo.attributes.position, b = w.base;
    for (let i = 0; i < p.count; i++) { const y = b[i * 3 + 1], k = Math.pow(y / w.h, 2); p.setXYZ(i, b[i * 3] + Math.sin(u.t * w.f + w.ph - y * 2.5) * 0.12 * k, y - 0.02 * k, b[i * 3 + 2] + Math.cos(u.t * w.f * 0.8 + w.ph - y * 2) * 0.07 * k); }
    p.needsUpdate = true; });
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
  { en: 'Toadstool leather coral', de: 'Lederkoralle (Sarcophyton)', make: makeLeather, anim: animateLeather, cam: [-1.9, 1.7, -2.4], target: [0, 0.3, 0] },
  { en: 'Carnation tree coral', de: 'Bäumchenweichkoralle (Dendronephthya)', make: makeTreeCoral, anim: animateTree, cam: [-2.7, 1.6, -3.4], target: [0, 0.7, 0] },
  { en: 'Pulsing Xenia', de: 'Pumpende Xenia', make: makeXenia, anim: animateXenia, cam: [-1.05, 0.95, -1.35], target: [0, 0.24, 0] },
  { en: 'Sea whips', de: 'Peitschenkorallen', make: makeWhips, anim: animateWhips, cam: [-2.6, 1.4, -3.2], target: [0, 0.65, 0] },
  { en: 'Bubble-tip anemone', de: 'Blasenanemone', make: makeBubbleTip, anim: animateBubbleTip, cam: [-1.25, 1.15, -1.6], target: [0, 0.28, 0] },
];
export { makeLeather, animateLeather, makeTreeCoral, animateTree, makeXenia, animateXenia, makeWhips, animateWhips, makeBubbleTip, animateBubbleTip };
