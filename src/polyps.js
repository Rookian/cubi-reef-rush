// Fine living detail shared by all corals: tiny polyp stars, tentacle hairs and corallite tubes, sprinkled over a surface and gently pulsing.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';

const UP = new THREE.Vector3(0, 1, 0);
// game quality: fewer segments and polyps (the review page keeps full detail)
export const LITE = { on: false, mini: false };   // mini: far copies baked into reef outcrops
export const setLite = (v) => { LITE.on = !!v; };
export const Q = (full, lite, mini = lite) => LITE.mini ? mini : LITE.on ? lite : full;
function paintY(g, len, A, B, y0 = 0) { const p = g.attributes.position, a = new Float32Array(p.count * 3), c = new THREE.Color(); for (let i = 0; i < p.count; i++) { c.copy(A).lerp(B, Math.max(0, Math.min(1, (p.getY(i) - y0) / len))); a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
const fin = g => { g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; };

// a polyp: ring of tapered arms around a little mouth, optionally raised on a stem. Arm length 1 = the polyp's radius.
export function starGeo(o = {}) {
  const { arms = 8, w = 0.11, tilt = 1.05, curl = 0.3, cIn = '#fff', cOut = '#fff', mouth = null, stem = 0, stemW = 0.1, cStem = null, seg = 3 } = o;
  const parts = [], A = new THREE.Color(cIn), B = new THREE.Color(cOut);
  for (let k = 0; k < arms; k++) { const c = new THREE.ConeGeometry(w * 2.6, 1, Q(6, 3), Q(seg, 1)); c.scale(1, 1, 0.45); c.translate(0, 0.5, 0); const p = c.attributes.position;
    for (let i = 0; i < p.count; i++) { const t = p.getY(i); p.setZ(i, p.getZ(i) - curl * t * t); }
    paintY(c, 1, A, B); c.rotateX(tilt); c.rotateY(k / arms * Math.PI * 2); c.translate(0, stem, 0); parts.push(fin(c)); }
  const m = new THREE.SphereGeometry(w * 1.7, Q(6, 4), Q(4, 2)); m.scale(1, 0.6, 1); m.translate(0, stem, 0); const mc = new THREE.Color(mouth || cIn); parts.push(fin(paintY(m, 1, mc, mc)));
  if (stem) { const s = new THREE.CylinderGeometry(stemW * 0.7, stemW, stem, 5, 1, true); s.translate(0, stem / 2, 0); const sc = new THREE.Color(cStem || cIn); parts.push(fin(paintY(s, stem, sc, A))); }
  const g = mergeGeometries(parts); g.computeVertexNormals(); return g;
}
// a single tapered tentacle with a little knob tip, length 1
export function hairGeo(o = {}) { const { w = 0.12, cA = '#fff', cB = '#fff', knob = 1.3 } = o;
  const W = w * 2.4, pts = [[W, 0], [W * 0.8, 0.5], [W * 0.6, 0.8], [W * 0.6 * knob, 0.9], [W * 0.35, 0.98], [0.0001, 1]].map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(pts, Q(7, 4)); paintY(g, 1, new THREE.Color(cA), new THREE.Color(cB)); return fin(g); }
// a corallite: tiny open tube, length 1
export function tubeGeo(o = {}) { const { w = 0.4, cA = '#fff', cB = '#fff' } = o; const g = new THREE.CylinderGeometry(w * 0.8, w, 1, 6, 1, true); g.translate(0, 0.4, 0); paintY(g, 1, new THREE.Color(cA), new THREE.Color(cB), -0.1); return fin(g); }

// scatter n points over a geometry. keep(p, n, colour) filters; up flips normals to face upward (for thin double-sided sheets)
export function sprinkle(geo, n, rnd, keep, up = false) {
  n = Math.round(n * Q(1, 0.45, 0.2));
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const s = new MeshSurfaceSampler(new THREE.Mesh(geo)).setRandomGenerator(rnd).build(), out = [], p = new THREE.Vector3(), nr = new THREE.Vector3(), c = new THREE.Color(), hasC = !!geo.attributes.color;
  for (let tries = 0; out.length < n && tries < n * 10; tries++) { if (hasC) s.sample(p, nr, c); else s.sample(p, nr); if (up && nr.y < 0) nr.negate(); if (!keep || keep(p, nr, c)) out.push({ p: p.clone(), n: nr.clone() }); }
  return out;
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _s = new THREE.Vector3(), _v = new THREE.Vector3();
export function polypField(geo, mat, pts, o = {}) {
  const { size = [0.012, 0.018], rnd = Math.random, lean = 0, sink = 0, opt = {} } = o, im = new THREE.InstancedMesh(geo, mat, pts.length), items = [];
  pts.forEach((pt) => { const d = _v.copy(pt.n).lerp(UP, lean).normalize(), s = size[0] + rnd() * (size[1] - size[0]);
    const q = new THREE.Quaternion().setFromUnitVectors(UP, d).multiply(_q2.setFromAxisAngle(UP, rnd() * 6.28));
    items.push({ p: pt.p.clone().addScaledVector(pt.n, -sink * s), q, s, ph: rnd() * 6.28 }); });
  im.userData.pf = { items, opt }; im.raycast = () => {}; animatePolyps(im, 0); return im;
}
// pulse: polyps close (narrower, taller) and open again, optionally as a wave travelling across the colony
export function animatePolyps(im, t) { const { items, opt } = im.userData.pf, { speed = 2, wave = 0, lo = 0.45, stretch = 0.5 } = opt;
  for (let i = 0; i < items.length; i++) { const it = items[i], k = 0.5 + 0.5 * Math.sin(t * speed + (wave ? (it.p.x + it.p.z) * wave + it.ph * 0.15 : it.ph)), open = lo + (1 - lo) * k;
    _m.compose(it.p, it.q, _s.set(it.s * open, it.s * (1 + stretch * (1 - open)), it.s * open)); im.setMatrixAt(i, _m); }
  im.instanceMatrix.needsUpdate = true; }
// generic animator for corals that only carry polyp fields: g.userData.pfs = [fields]
export function animatePF(g, dt) { const u = g.userData; u.t = (u.t || 0) + dt; (u.pfs || []).forEach(f => animatePolyps(f, u.t)); }
