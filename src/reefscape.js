// REEFSCAPE — reef outcrops and walls built from the reviewed Komodo corals.
// Each coral is "baked" once into a single static vertex-coloured mesh (its fine animated polyps dropped), optionally
// re-tinted, and then many baked corals share one merged mesh per outcrop: 2 draw calls for a whole coral head.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { plastic as toon, outline, glowify } from './materials.js';
import { rng } from './models.js';
import { reefClock, makeXmasWorm } from './reef.js';
import { LITE } from './polyps.js';
import { MeshoptSimplifier } from 'meshoptimizer';
let simpReady = false; MeshoptSimplifier.ready.then(() => { simpReady = true; });
import * as K from './corals3d.js';
import * as SK from './softcorals3d.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z), UP = V(0, 1, 0);
// sway: 0 = rigid hard coral, 1 = soft coral that bends with the surge (scaled by height inside the coral)
const KINDS = {
  stag: [K.makeStaghorn, 0], table: [K.makeTable, 0], cauli: [K.makeCauliflower, 0], brain: [K.makeBrain, 0], scroll: [K.makeScroll, 0], bubble: [K.makeBubble, 0],
  mush: [K.makeMushroom, 0], purple: [K.makePurplePore, 0], cup: [K.makeCupCoral, 0], fire: [K.makeFireCoral, 0], finger: [K.makeFinger, 0],
  leather: [SK.makeLeather, 0.4], tree: [SK.makeTreeCoral, 1], xenia: [SK.makeXenia, 0.6], whips: [SK.makeWhips, 1], anem: [SK.makeBubbleTip, 0.5],
};
const _m = new THREE.Matrix4(), _c = new THREE.Color(), _c2 = new THREE.Color();
// which instanced details survive baking: the structure of a coral (bubble vesicles, table sprigs, tentacles, xenia hands), not tiny polyps
const KEEP_MIN = 0.035;

function bakeRaw(kind) {
  const [make, sway] = KINDS[kind];
  const was = [LITE.on, LITE.mini]; LITE.on = true; LITE.mini = true; let g; try { g = make(); } finally { [LITE.on, LITE.mini] = was; }
  g.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(g), h = Math.max(0.01, box.max.y - Math.max(0, box.min.y));
  const parts = [];
  const push = (geo, mw, mat, col) => {
    let q = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(q.attributes)) if (!['position', 'normal', 'color'].includes(k)) q.deleteAttribute(k);
    q.applyMatrix4(mw); if (!q.attributes.normal) q.computeVertexNormals();
    const n = q.attributes.position.count, cols = new Float32Array(n * 3), src = q.attributes.color, base = _c2.copy(mat.color || _c.set('#fff'));
    if (mat.emissive) base.add(_c.copy(mat.emissive).multiplyScalar(0.6));
    if (col) base.multiply(col);
    for (let i = 0; i < n; i++) { _c.copy(base); if (src && mat.vertexColors) _c.multiply(new THREE.Color(src.getX(i), src.getY(i), src.getZ(i))); cols[i * 3] = _c.r; cols[i * 3 + 1] = _c.g; cols[i * 3 + 2] = _c.b; }
    q.setAttribute('color', new THREE.BufferAttribute(cols, 3)); parts.push(q);
  };
  g.traverse(o => {
    if (!o.isMesh || !o.visible) return; const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    if (mat.isMeshBasicMaterial || mat.side === THREE.BackSide) return;
    for (let a = o; a; a = a.parent) if (a.userData && a.userData.noBake) return;   // e.g. the anemone's clownfish stay in the animated version only   // outlines and shine dots: the outcrop gets its own outline
    if (o.isInstancedMesh) {
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      const r0 = o.geometry.boundingSphere.radius, ic = o.instanceColor, col = new THREE.Color(), s = new THREE.Vector3(), mi = new THREE.Matrix4();
      for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, mi); s.setFromMatrixScale(mi); if (r0 * Math.max(s.x, s.y, s.z) < KEEP_MIN) continue;
        if (ic) col.fromArray(ic.array, i * 3); push(o.geometry, _m.multiplyMatrices(o.matrixWorld, mi), mat, ic ? col : null); }
    } else push(o.geometry, o.matrixWorld, mat, null);
  });
  const geo = mergeGeometries(parts); geo.translate(0, -Math.max(0, box.min.y) * 0, 0);
  const p = geo.attributes.position, sw = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) sw[i] = sway * Math.pow(Math.max(0, p.getY(i)) / h, 1.5);
  geo.setAttribute('sway', new THREE.BufferAttribute(sw, 1));
  geo.computeBoundingBox(); geo.userData = { h, w: Math.max(box.max.x - box.min.x, box.max.z - box.min.z) };
  return geo;
}
// tinted variants: real reefs show the same species in many colours (tree corals red/orange/yellow/purple, staghorn blue/purple/brown, …)
const TINTS = {
  tree: [0, 0.08, 0.14, -0.12, 0.75], stag: [0, -0.12, 0.45, 0.08], table: [0, -0.1, 0.12], cauli: [0, 0.1, -0.08], leather: [0, 0.12], xenia: [0, -0.1, 0.4],
  whips: [0, 0.06, 0.12], cup: [0, 0.06], finger: [0, 0.35, -0.08], scroll: [0, -0.12], purple: [0, -0.06, 0.1], brain: [0, 0.6, -0.15], mush: [0], bubble: [0], fire: [0], anem: [0, 0.06],
};
const cache = {};
export function baked(kind, v = 0) {
  const key = kind + v; if (cache[key]) return cache[key];
  const raw = cache[kind + 'raw'] ||= bakeRaw(kind), hue = (TINTS[kind] || [0])[v % (TINTS[kind] || [0]).length];
  if (!hue) return (cache[key] = raw);
  const g = raw.clone(), c = g.attributes.color, hsl = {};
  for (let i = 0; i < c.count; i++) { _c.setRGB(c.getX(i), c.getY(i), c.getZ(i)); _c.getHSL(hsl); if (hsl.s > 0.18) { _c.setHSL((hsl.h + hue + 1) % 1, hsl.s, hsl.l); c.setXYZ(i, _c.r, _c.g, _c.b); } }
  g.userData = raw.userData; return (cache[key] = g);
}
export const variants = (kind) => (TINTS[kind] || [0]).length;

// ---- the coral field: every baked coral (kind + colour) is ONE instanced mesh for the whole reef.
// Outcrops and walls only carry a list of { key, local matrix }; syncField() gathers them each frame.
let _mat = null, _hull = null;
function surge(m, push) {
  m.onBeforeCompile = (sh) => { sh.uniforms.uT = reefClock;
    sh.vertexShader = 'uniform float uT; attribute float sway;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      ${push ? 'transformed += normalize(normal) * ' + push.toFixed(3) + ';' : ''}
      vec4 wp = vec4(position, 1.0);
      #ifdef USE_INSTANCING
        wp = instanceMatrix * wp;
      #endif
      wp = modelMatrix * wp;
      transformed.x += sin(uT * 0.9 + wp.x * 0.8 + wp.z * 0.6) * sway * 0.09;
      transformed.z += cos(uT * 0.7 + wp.z * 0.9) * sway * 0.06;`); };
  m.customProgramCacheKey = () => 'surge' + push; return m;
}
function mats() {
  if (!_mat) { _mat = surge(toon('#ffffff', { vertexColors: true, side: THREE.DoubleSide }), 0); _hull = surge(new THREE.MeshBasicMaterial({ color: '#2E2238', side: THREE.BackSide }), 0.02); glowify(_mat); }
  return [_mat, _hull];
}
export const fieldGroup = new THREE.Group(); fieldGroup.name = 'coralField';
// far copies: the baked coral welded and simplified to about a quarter (colours kept), drawn without outline beyond NEAR_Z
const NEAR_D2 = 11 * 11, FAR_Z = -50;   // full coral + outline only within 11 m of the camera
function simplified(geo, ratio = 0.25) {
  const P = geo.attributes.position, C = geo.attributes.color, SW = geo.attributes.sway, map = new Map(), pos = [], col = [], sw = [], idx = new Uint32Array(P.count);
  for (let i = 0; i < P.count; i++) { const k = Math.round(P.getX(i) * 2000) + ',' + Math.round(P.getY(i) * 2000) + ',' + Math.round(P.getZ(i) * 2000); let j = map.get(k);
    if (j === undefined) { j = pos.length / 3; map.set(k, j); pos.push(P.getX(i), P.getY(i), P.getZ(i)); col.push(C.getX(i), C.getY(i), C.getZ(i)); sw.push(SW ? SW.getX(i) : 0); } idx[i] = j; }
  const fp = new Float32Array(pos), fc = new Float32Array(col);
  const [out] = MeshoptSimplifier.simplifyWithAttributes(idx, fp, 3, fc, 3, [0.6, 0.6, 0.6], null, Math.max(30, Math.floor(idx.length * ratio / 3) * 3), 0.03);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(fp, 3)); g.setAttribute('color', new THREE.BufferAttribute(fc, 3)); g.setAttribute('sway', new THREE.BufferAttribute(new Float32Array(sw), 1));
  g.setIndex(new THREE.BufferAttribute(out, 1)); g.computeVertexNormals(); return g;
}
const slots = {};
function geoFor(key) { const [kind, v] = key.split(':'); return kind.startsWith('worm') ? bakedWorm(+kind.slice(4)) : baked(kind, +v); }
function mkIM(geo, mat, cap) { const q = new THREE.InstancedMesh(geo, mat, cap); q.frustumCulled = false; q.count = 0; q.raycast = () => {}; q.castShadow = false; fieldGroup.add(q); return q; }
function slot(key, need) {
  let s = slots[key];
  if (s && !s.farGeo && simpReady) { s.farGeo = simplified(s.geo); s.far.geometry = s.farGeo; }
  if (s && s.cap >= need) return s;
  const cap = Math.max(16, 1 << Math.ceil(Math.log2(Math.max(need, 1)))), [m, h] = mats(), geo = s ? s.geo : geoFor(key), farGeo = s ? s.farGeo : simpReady ? simplified(geo) : null;
  if (s) fieldGroup.remove(s.im, s.hull, s.far);
  return (slots[key] = { geo, farGeo, cap, im: mkIM(geo, m, cap), hull: mkIM(geo, h, cap), far: mkIM(farGeo || geo, m, cap), n: 0, nf: 0 });
}
const _w = new THREE.Matrix4(), _count = {};
export function syncField(roots, cam) {
  const cx = cam ? cam.x : 0, cz = cam ? cam.z : 6;
  for (const k in _count) _count[k] = 0;
  for (const r of roots) { if (!r.parent || !r.visible || r.position.z < FAR_Z || r.position.z > cz + 2) continue; for (const c of r.userData.corals) _count[c.key] = (_count[c.key] || 0) + 1; }
  for (const k in _count) { const s = slot(k, _count[k]); s.n = s.nf = 0; }
  for (const r of roots) { if (!r.parent || !r.visible || r.position.z < FAR_Z || r.position.z > cz + 2) continue; r.updateMatrixWorld();
    for (const c of r.userData.corals) { const s = slots[c.key]; _w.multiplyMatrices(r.matrixWorld, c.m);
      const dx = _w.elements[12] - cx, dz = _w.elements[14] - cz;
      if (!c.far && dx * dx + dz * dz < NEAR_D2) { s.im.setMatrixAt(s.n, _w); s.hull.setMatrixAt(s.n, _w); s.n++; } else { s.far.setMatrixAt(s.nf, _w); s.nf++; } } }
  for (const k in slots) { const s = slots[k]; s.im.count = s.hull.count = s.n; s.far.count = s.nf; s.im.visible = s.hull.visible = s.n > 0; s.far.visible = s.nf > 0; s.im.instanceMatrix.needsUpdate = s.hull.instanceMatrix.needsUpdate = s.far.instanceMatrix.needsUpdate = true; }
}
// Christmas tree worms as a bakeable "coral" too
const wormCache = {};
function bakedWorm(pal) {
  if (wormCache[pal]) return wormCache[pal];
  const w = makeXmasWorm(pal); w.updateMatrixWorld(true); const parts = [];
  w.traverse(o => { if (!o.isMesh) return; let q = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); for (const k of Object.keys(q.attributes)) if (!['position', 'normal', 'color'].includes(k)) q.deleteAttribute(k); q.applyMatrix4(o.matrixWorld); parts.push(q); });
  const g = mergeGeometries(parts), p = g.attributes.position, sw = new Float32Array(p.count); for (let i = 0; i < p.count; i++) sw[i] = 0.25 * Math.max(0, p.getY(i)) / 0.45;
  g.setAttribute('sway', new THREE.BufferAttribute(sw, 1)); return (wormCache[pal] = g);
}
// rock + its own outline (each rock has a unique shape, so it stays a normal mesh)
function rockMesh(geo, thick) { const m = new THREE.Mesh(geo, toon('#ffffff', { vertexColors: true })); outline(m, thick, '#2E2238'); m.castShadow = false; return m; }
const local = (x, y, z, s, ry, tilt = null) => { const q = new THREE.Quaternion().setFromAxisAngle(UP, ry); if (tilt) q.premultiply(new THREE.Quaternion().setFromUnitVectors(UP, tilt)); return new THREE.Matrix4().compose(V(x, y, z), q, V(s, s, s)); };
// ---- rocks: lumpy limestone with pink coralline crust and dark crevices
function rockGeo(R, w, h, d, pal) {
  let g = new THREE.IcosahedronGeometry(1, 3); g.deleteAttribute('uv'); g.deleteAttribute('normal'); g = mergeVertices(g);
  const p = g.attributes.position, a = R() * 6, b = R() * 6, c = R() * 6;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.12 * Math.sin(x * 2.1 + a) * Math.cos(z * 1.9 + b) + 0.07 * Math.sin(y * 3.3 + c) + 0.04 * Math.sin(x * 7 + z * 6 + a);
    p.setXYZ(i, x * k * w, Math.max(-0.15, y * k) * h + h * 0.12, z * k * d); }
  g.computeVertexNormals(); g = g.toNonIndexed();
  const P = g.attributes.position, N = g.attributes.normal, col = new Float32Array(P.count * 3), lo = new THREE.Color(pal[0]), hi = new THREE.Color(pal[1]), cr = new THREE.Color(pal[2]);
  for (let i = 0; i < P.count; i++) { const y = P.getY(i), x = P.getX(i), z = P.getZ(i), up = N.getY(i);
    _c.copy(lo).lerp(hi, THREE.MathUtils.clamp(y / (h * 1.1), 0, 1) * 0.8 + up * 0.2);
    const n = Math.sin(x * 4.1 + a) * Math.sin(z * 3.7 + y * 2 + b); if (n > 0.35) _c.lerp(cr, 0.75);
    if (up < -0.2) _c.multiplyScalar(0.55);
    col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
const ROCKS = [['#2E2A44', '#5E5A7E', '#8E5A86'], ['#263646', '#506A80', '#82608A'], ['#3A3046', '#6A5A78', '#9A6080'], ['#2A3040', '#56607A', '#7A6A96']];

// spots on the rock's upper surface, well spread, with their surface normal
function spots(geo, n, R, minY, gap) {
  const s = new MeshSurfaceSampler(new THREE.Mesh(geo)).setRandomGenerator(R).build(), p = V(0, 0, 0), nr = V(0, 0, 0), out = [];
  for (let t = 0; t < n * 60 && out.length < n; t++) { s.sample(p, nr); if (p.y < minY || nr.y < 0.25) continue; if (out.some(q => q.p.distanceTo(p) < gap)) continue; out.push({ p: p.clone(), n: nr.clone() }); }
  return out;
}

// ---- themed outcrops: each tells a little story so the reef never repeats itself
const THEMES = {
  // a thicket of staghorn rising over finger coral, purple plates at the foot
  thicket: { hero: ['stag', 'stag', 'stag'], mid: ['finger', 'stag', 'purple', 'cauli'], small: ['cup', 'purple', 'mush', 'finger'] },
  // stacked table corals like terraces, cauliflower heads underneath
  terrace: { hero: ['table', 'table'], mid: ['cauli', 'cauli', 'scroll', 'brain'], small: ['cup', 'mush', 'finger', 'purple'] },
  // a colourful soft-coral garden on the current-swept side
  garden: { hero: ['tree', 'tree', 'whips'], mid: ['xenia', 'leather', 'tree', 'whips'], small: ['xenia', 'leather', 'cup'] },
  // a big boulder head: brain corals, mushrooms and Christmas tree worms
  boulder: { hero: ['brain', 'brain'], mid: ['brain', 'bubble', 'scroll', 'finger'], small: ['mush', 'mush', 'cup', 'purple'], worms: 7 },
  // an anemone bommie: bubble-tip anemones with clownfish on top
  bommie: { hero: ['anem'], mid: ['bubble', 'leather', 'scroll', 'xenia'], small: ['cup', 'mush', 'xenia'] },
  // mixed reef
  // a low flat patch the lane can pass over
  carpet: { hero: ['mush'], mid: ['leather', 'purple', 'cup', 'finger', 'xenia', 'mush'], small: ['cup', 'mush', 'purple', 'finger'] },
  mixed: { hero: ['table', 'tree', 'stag', 'whips'], mid: ['cauli', 'brain', 'scroll', 'leather', 'finger', 'bubble', 'fire', 'xenia'], small: ['cup', 'mush', 'purple', 'finger', 'xenia'] },
};
export const THEME_NAMES = Object.keys(THEMES).filter(t => t !== 'carpet');
const pickR = (R, a) => a[Math.floor(R() * a.length)];
// size of each coral kind in metres when it sits on an outcrop (hero / mid / small)
const SIZE = { stag: 1.7, table: 1.9, cauli: 1.4, brain: 1.3, scroll: 1.5, bubble: 1.3, mush: 1.1, purple: 1.3, cup: 1.2, fire: 1.5, finger: 1.4, leather: 1.4, tree: 1.7, xenia: 1.7, whips: 1.6, anem: 1.5 };

export function makeOutcrop(seed = 1, big = 1, theme = null) {
  const R = rng(seed * 29 + 11); theme ||= pickR(R, THEME_NAMES); const T = THEMES[theme];
  const flat = theme === 'carpet', w = (0.85 + R() * 0.4) * big, h = (flat ? 0.18 : (0.45 + R() * 0.35) * (theme === 'boulder' ? 1.5 : 1)) * big, d = (0.8 + R() * 0.35) * big;
  const pal = theme === 'boulder' ? ['#6A5A42', '#B09A72', '#9A7E5A'] : pickR(R, ROCKS);
  const rock = rockGeo(R, w, h, d, pal), corals = [];
  const add = (kind, q, s) => { const v = Math.floor(R() * variants(kind)), g = baked(kind, v), k = s * SIZE[kind] / Math.max(0.6, g.userData.w);
    corals.push({ key: kind + ':' + v, m: local(q.p.x, q.p.y - 0.04 * k, q.p.z, k, R() * 6.28, q.n.clone().lerp(UP, 0.65).normalize()) }); };
  const sp = spots(rock, flat ? 5 : 8, R, h * 0.2, 0.32 * big);
  sp.sort((a, b) => b.p.y - a.p.y);   // the highest spots get the hero corals
  const nHero = flat ? 0 : theme === 'terrace' ? 2 : 1, nMid = Math.min(sp.length - nHero, flat ? 2 : 3 + Math.floor(R() * 2) + (big > 1.2 ? 1 : 0));
  sp.forEach((q, i) => { if (i < nHero) add(pickR(R, T.hero), q, (1.15 + R() * 0.3) * big); else if (i < nHero + nMid) add(pickR(R, T.mid), q, (0.8 + R() * 0.25) * big); else add(pickR(R, T.small), q, (0.55 + R() * 0.2) * big); });
  // a few small corals at the foot where rock meets sand
  const nf = flat ? 1 : 2 + Math.floor(R() * 2);
  for (let i = 0; i < nf; i++) { const a = R() * 6.28; add(pickR(R, T.small), { p: V(Math.cos(a) * w * 1.0, 0.02, Math.sin(a) * d * 1.0), n: UP.clone() }, (0.5 + R() * 0.2) * big); }
  // terraces: a second table higher up, overlapping the first like a staircase
  if (theme === 'terrace') { const v = Math.floor(R() * 3), g = baked('table', v); corals.push({ key: 'table:' + v, m: local((R() - 0.5) * w * 0.6, h * 1.2 + 0.45 * big, (R() - 0.5) * d * 0.6, 0.62 * big * SIZE.table / g.userData.w, R() * 6) }); }
  // Christmas tree worms on boulder heads (as on real Porites boulders), now and then elsewhere
  const nw = T.worms || (R() < 0.3 ? 2 : 0);
  if (nw) spots(rock, nw, R, h * 0.4, 0.22).forEach(q => corals.push({ key: 'worm' + Math.floor(R() * 14) + ':0', m: local(q.p.x, q.p.y - 0.01, q.p.z, (0.3 + R() * 0.14) * big, R() * 6.28, q.n.clone().lerp(UP, 0.4).normalize()) }));
  const g = new THREE.Group(); g.add(rockMesh(rock, 0.03 * Math.max(0.6, big))); g.userData.corals = corals; g.userData.theme = theme; return g;
}

// ---- reef wall: tall stacked rocks crowned with corals; sea whips, tree corals and plates reach out from the face
export function makeCoralWall(seed = 1, big = false) {
  const R = rng(seed * 17 + 5), pal = pickR(R, ROCKS), parts = [], corals = [], nR = 3 + Math.floor(R() * 2), S = big ? 1.6 : 1.1;
  for (let i = 0; i < nR; i++) {
    const hh = (big ? 4 : 2.2) + R() * (big ? 4 : 2.6), ww = 1.3 + R() * 1.3, dd = 1.2 + R() * 1.1, x = (R() - 0.5) * 1.4, z = (i - nR / 2) * 2.0 + (R() - 0.5) * 0.6;
    const rk = rockGeo(R, ww, hh * 0.5, dd, pal); rk.translate(x, 0, z); parts.push(rk);
    spots(rk, big ? 3 : 4, R, hh * 0.2, 0.6).forEach(q => { const top = q.n.y > 0.6, kind = top ? pickR(R, ['table', 'stag', 'tree', 'cauli', 'brain', 'scroll', 'leather', 'xenia', 'finger', 'whips']) : pickR(R, ['whips', 'tree', 'purple', 'scroll', 'xenia']);
      const v = Math.floor(R() * variants(kind)), g = baked(kind, v), k = (top ? 1.0 + R() * 0.4 : 0.7 + R() * 0.3) * S * SIZE[kind] / Math.max(0.6, g.userData.w);
      corals.push({ key: kind + ':' + v, m: local(q.p.x, q.p.y - 0.05, q.p.z, k, R() * 6.28, q.n.clone().lerp(UP, top ? 0.7 : 0.35).normalize()) }); });
  }
  const g = new THREE.Group(); g.add(rockMesh(mergeGeometries(parts), big ? 0.06 : 0.045)); g.userData.corals = corals; return g;
}

// ---- PINNACLE: a coral tower rising from the sand — tiers of rock, table corals jutting out like balconies,
// soft corals and whips streaming from the top. A landmark you see coming from far away.
export function makePinnacle(seed = 1) {
  const R = rng(seed * 41 + 3), pal = pickR(R, ROCKS), parts = [], corals = [];
  const tiers = 3 + Math.floor(R() * 2); let y = 0, rad = 1.9 + R() * 0.4, ox = 0, oz = 0;
  for (let i = 0; i < tiers; i++) {
    const hh = 1.1 + R() * 0.7, rk = rockGeo(R, rad, hh * 0.55, rad * (0.8 + R() * 0.3), pal); rk.translate(ox, y, oz); parts.push(rk);
    const top = y + hh * 0.62;
    // a table coral juts out of every tier like a balcony
    const a = R() * 6.28, tv = Math.floor(R() * 3), tg = baked('table', tv), ts = (1.3 + R() * 0.5) * SIZE.table / tg.userData.w;
    corals.push({ key: 'table:' + tv, m: local(ox + Math.cos(a) * rad * 0.75, top - 0.25, oz + Math.sin(a) * rad * 0.75, ts, R() * 6.28) });
    spots(rk, i === tiers - 1 ? 7 : 5, R, y + hh * 0.15, 0.42).forEach(q => { const kind = i === tiers - 1 ? pickR(R, ['tree', 'whips', 'xenia', 'stag', 'leather', 'tree']) : pickR(R, ['scroll', 'purple', 'cauli', 'brain', 'finger', 'cup', 'whips']);
      const v = Math.floor(R() * variants(kind)), g = baked(kind, v), k = (1.1 + R() * 0.5) * SIZE[kind] / Math.max(0.6, g.userData.w);
      corals.push({ key: kind + ':' + v, m: local(q.p.x, q.p.y - 0.05, q.p.z, k, R() * 6.28, q.n.clone().lerp(UP, 0.5).normalize()) }); });
    y += hh * 0.8; rad *= 0.78 + R() * 0.1; ox += (R() - 0.5) * 0.4; oz += (R() - 0.5) * 0.4;
  }
  // a ring of sand-dwellers at the foot
  for (let i = 0; i < 4; i++) { const a = R() * 6.28, kind = pickR(R, ['mush', 'cup', 'anem', 'leather', 'bubble']), v = Math.floor(R() * variants(kind)), g = baked(kind, v);
    corals.push({ key: kind + ':' + v, m: local(Math.cos(a) * 1.9, 0.02, Math.sin(a) * 1.7, (0.8 + R() * 0.3) * SIZE[kind] / Math.max(0.6, g.userData.w), R() * 6.28) }); }
  const g = new THREE.Group(); g.add(rockMesh(mergeGeometries(parts), 0.05)); g.userData.corals = corals; g.userData.h = y; return g;
}

// ================= SET PIECES: segments (≈3 m long, overlapping) so long features follow the bending path =================
function lumpC(R, sx, sy, sz, pal, detail = 3) {   // a lumpy rock without the flat base of rockGeo
  let g = new THREE.IcosahedronGeometry(1, detail); g.deleteAttribute('uv'); g.deleteAttribute('normal'); g = mergeVertices(g);
  const p = g.attributes.position, a = R() * 6, b = R() * 6;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.13 * Math.sin(x * 2.3 + a) * Math.cos(z * 2.1 + b) + 0.06 * Math.sin(y * 4 + a) + 0.04 * Math.sin(x * 7 + z * 6 + b); p.setXYZ(i, x * k * sx, y * k * sy, z * k * sz); }
  g.computeVertexNormals(); g = g.toNonIndexed();
  const P = g.attributes.position, N = g.attributes.normal, col = new Float32Array(P.count * 3), lo = new THREE.Color(pal[0]), hi = new THREE.Color(pal[1]), cr = new THREE.Color(pal[2]);
  for (let i = 0; i < P.count; i++) { const up = N.getY(i); _c.copy(lo).lerp(hi, 0.5 + up * 0.5); if (Math.sin(P.getX(i) * 4.1 + a) * Math.sin(P.getZ(i) * 3.7 + P.getY(i) * 2 + b) > 0.4) _c.lerp(cr, 0.7); if (up < -0.3) _c.multiplyScalar(0.6);
    col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
// spots on any face; dir: 'up' (n.y > .3), 'side' (|n.y| < .5), 'down' (n.y < -.4)
function spotsAny(geo, n, R, dir, gap) {
  const s = new MeshSurfaceSampler(new THREE.Mesh(geo)).setRandomGenerator(R).build(), p = V(0, 0, 0), nr = V(0, 0, 0), out = [];
  for (let t = 0; t < n * 80 && out.length < n; t++) { s.sample(p, nr); const ok = dir === 'up' ? nr.y > 0.3 : dir === 'down' ? nr.y < -0.4 : Math.abs(nr.y) < 0.5; if (!ok || out.some(q => q.p.distanceTo(p) < gap)) continue; out.push({ p: p.clone(), n: nr.clone() }); }
  return out;
}
function dress(R, geo, corals, list, n, dir, scale, lean = 0.5, keep = null) {
  spotsAny(geo, keep ? n * 4 : n, R, dir, 0.55).filter(q => !keep || keep(q.p)).slice(0, n).forEach(q => { const kind = pickR(R, list), v = Math.floor(R() * variants(kind)), g = baked(kind, v), k = scale * (0.8 + R() * 0.4) * SIZE[kind] / Math.max(0.6, g.userData.w);
    const nd = dir === 'down' ? q.n.clone() : q.n.clone().lerp(UP, lean).normalize();
    corals.push({ key: kind + ':' + v, m: local(q.p.x, q.p.y, q.p.z, k, R() * 6.28, nd) }); });
}
export const SEG = 2.2;   // segment spacing along the path; each piece is a bit longer so neighbours overlap
// a tall reef fin down the middle of the lane: the path forks left / right around it
export function makeRidgeSeg(seed = 1, first = false, last = false) {
  const R = rng(seed * 53 + 7), pal = pickR(R, ROCKS), taper = first || last ? 0.75 : 1;
  const geo = lumpC(R, 0.85, 3.0 * taper, 1.75, pal, 3); geo.translate(0, 2.4 * taper, -SEG / 2);
  const corals = []; dress(R, geo, corals, ['tree', 'whips', 'purple', 'scroll', 'xenia', 'cup', 'tree'], 6, 'side', 0.75, 0.2); dress(R, geo, corals, ['table', 'stag', 'tree', 'leather', 'whips'], 3, 'up', 1.0);
  const g = new THREE.Group(); g.add(rockMesh(geo, 0.035)); g.userData.corals = corals; return g;
}
// a rock shelf across the lane at height y0..y1: dive under or rise over; x0..x1 limits it for side overhangs
export function makeSlabSeg(seed = 1, y0 = 2.0, y1 = 3.0, x0 = -3.6, x1 = 3.6) {
  const R = rng(seed * 61 + 3), pal = pickR(R, ROCKS), cx = (x0 + x1) / 2, hw = (x1 - x0) / 2 + 0.3, ht = (y1 - y0) / 2;
  const slab = lumpC(R, hw, ht * 1.1, 1.6, pal, 3); slab.translate(cx, (y0 + y1) / 2, -SEG / 2);
  // the shelf grows out of the reef wall: rock buttresses carry it on the side(s) where it meets the wall
  const legs = [slab]; for (const ex of [x0, x1]) if (Math.abs(ex) > 3) { const lg = lumpC(R, 0.9, (y0 + 0.3) / 2 + 0.4, 1.4, pal, 2); lg.translate(Math.sign(ex) * 3.25, (y0 + 0.3) / 2, -SEG / 2); legs.push(lg); }
  const geo = mergeGeometries(legs);
  const corals = []; dress(R, slab, corals, ['table', 'cauli', 'brain', 'leather', 'finger', 'scroll', 'stag', 'xenia'], 5, 'up', 0.85);
  dress(R, slab, corals, ['tree', 'tree', 'purple'], 3, 'down', 0.4, 0.5, (p) => Math.abs(p.x) > 2.3);   // only at the sides: the swim path under the ledge stays clear   // tree corals hang from ceilings, as they do in real reef caves
  const g = new THREE.Group(); g.add(rockMesh(geo, 0.035)); g.userData.corals = corals; return g;
}
// a rock tunnel over the lane: open space inside up to ~4 m, corals outside and hanging from the roof
export function makeTunnelSeg(seed = 1, mouth = false) {
  const R = rng(seed * 71 + 9), pal = pickR(R, ROCKS);
  let shell = new THREE.CylinderGeometry(3.6, 3.6, SEG + 0.6, 18, 2, true, -Math.PI / 2, Math.PI); shell.rotateX(-Math.PI / 2); shell.deleteAttribute('uv');
  shell = mergeVertices(shell); const p = shell.attributes.position, a = R() * 6;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.1 * Math.sin(x * 1.9 + a + z * 1.3) + 0.06 * Math.sin(y * 2.7 + z * 2 + a); p.setXYZ(i, x * k * 1.05, y * k + 0.5, z); }
  shell.computeVertexNormals(); shell = shell.toNonIndexed(); shell.translate(0, 0, -SEG / 2);
  const P = shell.attributes.position, col = new Float32Array(P.count * 3), lo = new THREE.Color(pal[0]), hi = new THREE.Color(pal[1]), cr = new THREE.Color(pal[2]);
  for (let i = 0; i < P.count; i++) { _c.copy(lo).lerp(hi, THREE.MathUtils.clamp(P.getY(i) / 4.2, 0, 1)); if (Math.sin(P.getX(i) * 2.1 + a) * Math.sin(P.getZ(i) * 3 + P.getY(i)) > 0.5) _c.lerp(cr, 0.6); col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
  shell.setAttribute('color', new THREE.BufferAttribute(col, 3));
  // thickness: an outer skin a little larger so the roof reads as solid rock from outside
  const outer = shell.clone(); outer.scale(1.12, 1.1, 1); outer.translate(0, 0.05, 0);
  const corals = []; dress(R, outer, corals, ['table', 'stag', 'tree', 'cauli', 'brain', 'whips', 'leather', 'xenia'], mouth ? 6 : 4, 'up', 0.9);
  dress(R, shell, corals, ['tree', 'purple', 'tree'], 2, 'down', 0.4, 0.5, (p) => Math.abs(p.x) > 2.4);
  const m = new THREE.Mesh(mergeGeometries([shell, outer]), toon('#ffffff', { vertexColors: true, side: THREE.DoubleSide })); outline(m, 0.04, '#2E2238'); m.castShadow = false;
  const g = new THREE.Group(); g.add(m); g.userData.corals = corals; return g;
}
