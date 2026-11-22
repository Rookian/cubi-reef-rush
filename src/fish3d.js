// Builds a 3D fish straight from its 2D design: the silhouette is inflated into a smooth body, the design's
// pattern becomes the body texture (crisp, exactly as drawn), fins are outlined cut-outs, eyes are Cubi-style 3D eyes.
import * as THREE from 'three';
import { makeEye, placeEye } from './models.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DESIGNS } from './fishdesigns.js';

const OUT = '#3B2614', S = 0.006;                       // world units per design unit (body ≈ 1.2 long)
const THICK = { 'Blackspotted puffer (yellow)': 0.92, 'Blackspotted puffer, puffed up': 1.0, 'Giant puffer': 0.92, 'Blacktip reef shark': 0.9, 'Whitetip reef shark': 0.9, 'Needlefish': 0.9, 'Trumpetfish': 0.9,
  'Coral grouper': 0.62, 'Parrotfish': 0.52, 'Lunar fusilier': 0.7, 'Silversides': 0.6, 'Anthias': 0.52, 'Clownfish': 0.5, 'Pink skunk clownfish': 0.5, 'Blue-green chromis': 0.48, 'Yellowtail damselfish': 0.48 };
export const FISH3D = DESIGNS.filter(d => d.en !== 'Blue-spotted stingray');   // (the old side-view ray sketch; the flat 3D one is 'Bluespotted stingray')

function svgTexture(inner, bg, w = 768, h = 512) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const ctx = cv.getContext('2d');
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const img = new Image();
  img.onload = () => { ctx.drawImage(img, 0, 0, w, h); tex.needsUpdate = true; };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="${w}" height="${h}">${inner}</svg>`);
  return tex;
}
let _scan = null;
function silhouette(d) {
  _scan ||= document.createElement('canvas').getContext('2d');
  const p = new Path2D(d), cols = [];
  for (let x = 0; x <= 300; x++) { let t = -1, b = -1; for (let y = 0; y <= 200; y += 0.2) if (_scan.isPointInPath(p, x + 0.5, y)) { if (t < 0) t = y; b = y; } cols.push(t < 0 ? null : [t, b]); }
  let x0 = cols.findIndex(c => c), x1 = 300; while (!cols[x1]) x1--;
  return { cols, x0, x1 };
}
// shared swimming wave: head stays calm, amplitude grows toward the tail
const GLOW = { 'Palette surgeonfish': [0.6, '#1670FF'], 'Emperor angelfish': [0.6, '#1E4FD8'], 'Clown surgeonfish': [0.65, '#2E9BFF'], 'Orange-lined triggerfish': [0.6, '#FF9A2A'], 'Anthias': [0.5, '#FF8A3A'], 'Parrotfish': [0.7, '#FF7AB8'], 'Coral grouper': [0.9, '#5FD0FF'], 'Lunar fusilier': [0.3, '#3FA8F0'] };
const METAL = { 'Lunar fusilier': 0.6, 'Silversides': 1.2 };
function swim(mat, U, len, push = 0, fx = null, inst = false, mv = { wave: 1, flap: 0, scull: 0 }) {
  mat.onBeforeCompile = (sh) => {
    if (inst) { sh.uniforms.uT = { value: 0 }; mat.userData.sh = sh; } else sh.uniforms.uT = U;
    sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      ${push ? `transformed += normalize(normal) * ${push.toFixed(4)};` : ''}
      float zn = position.z / ${len.toFixed(4)};
      float env = pow(max(0.0, zn + 0.22), 2.0) * ${(len * 0.2 * mv.wave).toFixed(4)};
      ${mv.flap ? `transformed.x += sin(${inst ? 'uT * 6.5' : 'uT'} * 0.55 - abs(position.y) * 5.0) * abs(position.y) * ${mv.flap.toFixed(2)} * 0.45;` : ''}
      transformed.x += sin(${inst ? 'uT * 6.5 + float(gl_InstanceID) * 1.37' : 'uT'} - zn * 3.0) * env;
      ${mv.scull ? `transformed.x += sin(uT) * max(0.0, abs(position.y) - ${(len * 0.27).toFixed(4)}) * ${(mv.scull * 0.75).toFixed(2)};   // ocean sunfish: dorsal + anal fin stroke together to the same side, like a pair of vertical wings` : ''}`);
    if (mat.isMeshToonMaterial) sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
      { vec3 nn = normalize(vNormal); vec3 vv = normalize(vViewPosition);
        float fr = pow(1.0 - clamp(abs(dot(nn, vv)), 0.0, 1.0), 2.4);
        float hs = pow(max(dot(nn, normalize(vec3(-0.3, 0.85, 0.45))), 0.0), 40.0);
        outgoingLight += fr * 0.28 * vec3(0.8, 0.95, 1.0) + hs * 0.45;
        ${fx && fx.glow ? `{ float gw = 1.0 - smoothstep(0.22, 0.55, distance(diffuseColor.rgb, vec3(${fx.gc.r.toFixed(3)}, ${fx.gc.g.toFixed(3)}, ${fx.gc.b.toFixed(3)})));
          outgoingLight += diffuseColor.rgb * gw * ${fx.glow.toFixed(2)} * (1.0 + 0.25 * sin(uT * 0.45)); }` : ''}
        ${fx && fx.metal ? `{ vec3 rr = reflect(-vv, nn); float sp2 = pow(max(dot(rr, normalize(vec3(-0.2, 0.9, 0.4))), 0.0), 9.0);
          float band = smoothstep(0.55, 1.0, sin(vMapUv.x * 26.0 - uT * 0.5 + vMapUv.y * 8.0));
          outgoingLight = mix(outgoingLight, outgoingLight * 1.15 + vec3(0.75, 0.9, 1.0) * (sp2 * 0.6 + band * 0.16 + fr * 0.3), ${Math.min(1, fx.metal * 0.75).toFixed(2)}); }` : ''} }
      #include <opaque_fragment>`).replace('void main() {', 'uniform float uT;\nvoid main() {');
  };
  mat.customProgramCacheKey = () => 'f3d' + len.toFixed(4) + push + mat.type + (fx ? fx.key : '') + inst + mv.wave + '_' + mv.flap + '_' + (mv.scull || 0);
  return mat;
}
let _grad = null;
const softGrad = () => { if (_grad) return _grad; const d = new Uint8Array([150, 150, 150, 255, 205, 205, 205, 255, 236, 236, 236, 255, 255, 255, 255, 255]); _grad = new THREE.DataTexture(d, 4, 1, THREE.RGBAFormat); _grad.minFilter = _grad.magFilter = THREE.NearestFilter; _grad.needsUpdate = true; return _grad; };
const firstPt = (svg) => { const m = /d="M\s*([\d.]+)[ ,]([\d.]+)/.exec(svg); return m ? [+m[1], +m[2]] : null; };
const bbox = (svg) => { const d = /\sd="([^"]+)"/.exec(svg)[1], n = d.match(/-?[\d.]+/g).map(Number); let a = 1e9, b = 1e9, c = -1e9, e = -1e9; for (let i = 0; i + 1 < n.length; i += 2) { a = Math.min(a, n[i]); c = Math.max(c, n[i]); b = Math.min(b, n[i + 1]); e = Math.max(e, n[i + 1]); } return [a - 4, b - 4, c + 4, e + 4]; };

const cache = {};
function parts(d) {
  if (cache[d.en]) return cache[d.en];
  const { cols, x0, x1 } = silhouette(d.body), xm = (x0 + x1) / 2, len = (x1 - x0) * S;
  let Hmax = 0; for (let x = x0; x <= x1; x++) Hmax = Math.max(Hmax, (cols[x][1] - cols[x][0]) / 2);
  const thick = d.thick || THICK[d.en] || 0.36;
  const N = 64, rings = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, xs = x0 + 0.5 + t * (x1 - x0 - 1), c = cols[Math.round(xs)] || cols[Math.floor(xs)];
    const cy = (c[0] + c[1]) / 2, h = Math.max(0.6, (c[1] - c[0]) / 2);
    const w = Math.max(0.5, Math.min(thick * Hmax * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.55), h * (d.wide || (thick > 0.8 ? 1.0 : 0.9))));
    rings.push({ xs, cy, h, w, t });
  }
  for (let pass = 0; pass < 3; pass++) { const c = rings.map(r => ({ ...r })); for (let i = 1; i < N; i++) for (const k of ['cy', 'h', 'w']) rings[i][k] = (c[i - 1][k] + 2 * c[i][k] + c[i + 1][k]) / 4; }
  const build = (step, M) => { const pos = [], uv = [], idx = [], n = N / step;
    for (let i = 0; i <= n; i++) { const { xs, cy, h, w } = rings[i * step];
      for (let j = 0; j <= M; j++) { const a = j / M * Math.PI * 2, ys = cy - h * Math.cos(a), xl = w * Math.sin(a); pos.push(xl * S, (100 - ys) * S, (xs - xm) * S); uv.push(xs / 300, 1 - ys / 200); } }
    for (let i = 0; i < n; i++) for (let j = 0; j < M; j++) { const a = i * (M + 1) + j, b = a + M + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; };
  const body = build(1, 24), bodyLo = build(2, 12);
  const latAt = (xs, ys) => { const r = rings[Math.max(0, Math.min(N, Math.round((xs - x0) / (x1 - x0) * N)))]; return r.w * Math.sqrt(Math.max(0.05, 1 - ((ys - r.cy) / r.h) ** 2)); };
  // textures
  const bodyTex = svgTexture((d.pattern || '') + (d.shine ? `<ellipse cx="${d.shine[0]}" cy="${d.shine[1]}" rx="${d.shine[2] || 20}" ry="5" fill="#fff" opacity=".7" transform="rotate(${d.shine[3] || -8} ${d.shine[0]} ${d.shine[1]})"/>` : '') + (d.over || '') +
    (d.blush ? `<ellipse cx="${d.blush[0]}" cy="${d.blush[1]}" rx="${(d.blushR || 7) * 1.25}" ry="${(d.blushR || 7) * 0.75}" fill="#FF8FA3" opacity=".8"/>` : '') +
    (d.mouth ? `<path d="M${d.mouth[0]},${d.mouth[1]} q${5 * (d.mouthS || 1)},${6 * (d.mouthS || 1)} ${11 * (d.mouthS || 1)},${d.mouthS || 1}" fill="none" stroke="${OUT}" stroke-width="3.5" stroke-linecap="round"/>` : ''), d.fill);
  const finTex = svgTexture((d.fins || []).join('') + (d.pec || ''));
  // median fins: one cut-out sheet in the centre plane
  const fins = new THREE.PlaneGeometry(300 * S, 200 * S, 60, d.flap || d.scull ? 40 : 1); fins.rotateY(-Math.PI / 2); fins.translate(0, 0, (150 - xm) * S);
  let pec = null;
  if (d.pec) { const [a, b, c, e] = bbox(d.pec), base = firstPt(d.pec);
    const g = new THREE.PlaneGeometry((c - a) * S, (e - b) * S); const u = g.attributes.uv; for (let i = 0; i < u.count; i++) u.setXY(i, (a + u.getX(i) * (c - a)) / 300, 1 - (b + (1 - u.getY(i)) * (e - b)) / 200);
    g.translate(((a + c) / 2 - base[0]) * S, (base[1] - (b + e) / 2) * S, 0); g.rotateY(-Math.PI / 2);
    pec = { g, y: (100 - base[1]) * S, z: (base[0] - xm) * S, x: latAt(base[0], base[1]) * S }; }
  return (cache[d.en] = { body, bodyLo, fins, pec, bodyTex, finTex, len, xm, latAt });
}

export function makeFish3D(d, size = 1) {
  const P = parts(d), U = { value: Math.random() * 6 };
  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig);
  const gl = GLOW[d.en], fx = (gl || METAL[d.en]) ? { glow: gl ? gl[0] : 0, gc: new THREE.Color(gl ? gl[1] : '#fff'), metal: METAL[d.en] || 0, key: d.en } : null;
  const mv = { wave: d.wave || 1, flap: d.flap || 0, scull: d.scull || 0 };
  const bodyM = swim(new THREE.MeshToonMaterial({ map: P.bodyTex, gradientMap: softGrad() }), U, P.len, 0, fx, false, mv);
  rig.add(new THREE.Mesh(P.body, bodyM));
  rig.add(new THREE.Mesh(P.body, swim(new THREE.MeshBasicMaterial({ color: OUT, side: THREE.BackSide }), U, P.len, 0.014, null, false, mv)));
  const finM = swim(new THREE.MeshBasicMaterial({ map: P.finTex, alphaTest: 0.45, side: THREE.DoubleSide }), U, P.len, 0, null, false, mv);
  rig.add(new THREE.Mesh(P.fins, finM));
  const pecs = [];
  if (P.pec) for (const sx of [-1, 1]) { const m = new THREE.Mesh(P.pec.g, new THREE.MeshBasicMaterial({ map: P.finTex, alphaTest: 0.45, side: THREE.DoubleSide })); const piv = new THREE.Group(); piv.position.set(sx * (P.pec.x + 0.004), P.pec.y, P.pec.z); piv.add(m); rig.add(piv); pecs.push({ piv, sx }); }
  const eyes = [];
  for (const [ex, ey, er] of (d.eyes || (d.eye ? [d.eye] : []))) { const lat = P.latAt(ex, ey) * S, r3 = d.flat ? er * S * 1.3 : Math.min(er * S * 1.3, Math.max(lat * 1.25, er * S * 0.85));
    for (const sx of (d.flat ? [1] : [-1, 1])) {
      const e = placeEye(makeEye(r3, OUT), new THREE.Vector3(sx * Math.max(lat - r3 * 0.35, r3 * 0.25), (100 - ey) * S, (ex - P.xm) * S), new THREE.Vector3(sx, d.flat ? 0 : 0.12, d.flat ? -0.55 : -0.38).normalize());
      rig.add(e); eyes.push(e);
      if (d.grumpy) { const br = new THREE.Mesh(new THREE.CapsuleGeometry(r3 * 0.15, r3 * 1.3, 4, 8), new THREE.MeshBasicMaterial({ color: OUT })); br.position.set(0, r3 * 1.0, r3 * 0.55); br.rotation.z = Math.PI / 2 + sx * 0.45; e.add(br); }
    } }
  // breathing mouth (+ gill holes): a round lip that opens and closes; dark inside
  let mouth = null;
  if (d.mouthO) { const [mx, my, mr] = d.mouthO, r = mr * S;
    mouth = new THREE.Group(); mouth.position.set(0, (100 - my) * S, (mx - P.xm) * S - r * 0.35);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.42, 10, 20), new THREE.MeshToonMaterial({ color: d.lipC || d.fill, gradientMap: softGrad() }));
    const lipO = new THREE.Mesh(lip.geometry, new THREE.MeshBasicMaterial({ color: OUT, side: THREE.BackSide })); lipO.scale.setScalar(1.12);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(r * 0.9, 18), new THREE.MeshBasicMaterial({ color: '#2A1E24' })); hole.rotation.y = Math.PI; hole.position.z = 0.0005;
    mouth.add(lip, lipO, hole); rig.add(mouth);
    mouth.userData.gills = [];
    if (P.pec) for (const sx of [-1, 1]) { const gh = new THREE.Mesh(new THREE.CircleGeometry(r * 0.75, 14), new THREE.MeshBasicMaterial({ color: '#3A2A2C' })); gh.position.set(sx * (P.pec.x + 0.002), P.pec.y + r * 0.2, P.pec.z - r * 2.2); gh.rotation.y = sx * Math.PI / 2; gh.scale.set(0.55, 1, 1); rig.add(gh); mouth.userData.gills.push(gh); } }
  if (d.flat) { const tilt = new THREE.Group(); tilt.rotation.z = Math.PI / 2; root.remove(rig); tilt.add(rig); root.add(tilt); }
  root.scale.setScalar(size);
  root.userData = { flat: !!d.flat, U, rig, pecs, eyes, t: Math.random() * 10, blink: 2 + Math.random() * 3, speed: d.scull ? 3.0 : d.en.includes('shark') ? 3.2 : 6.5, scull: !!d.scull, mouth, bodyM, breath: Math.random() * 6, mood: 0, moodV: 0, stiff: d.en.includes('shark') && !d.flat };   // sharks: slow tail sweep, stiff wing-like pectorals
  return root;
}
export function animateFish3D(f, dt) {
  const u = f.userData; u.t += dt; u.U.value += dt * u.speed;
  if (!u.flat) { u.rig.rotation.y = -Math.sin(u.U.value) * (u.scull ? 0.03 : 0.05); u.rig.rotation.z = Math.sin(u.t * 0.9) * 0.03; } u.rig.position.y = Math.sin(u.t * 1.3) * 0.02;
  u.pecs.forEach(p => { p.piv.rotation.y = p.sx * (u.stiff ? 0.62 + Math.sin(u.t * 0.7 + p.sx) * 0.04 : 0.55 + Math.sin(u.t * 5 + p.sx) * 0.3); });
  u.blink -= dt; const k = u.blink < 0.12 ? Math.max(0.1, Math.abs(u.blink - 0.06) / 0.06) : 1; if (u.blink < 0) u.blink = 2.5 + Math.random() * 3.5;
  u.eyes.forEach(e => { e.scale.y = k; });
  if (u.mouth) {   // calm: slow deep breaths, pale skin; startled (mood -> 1): fast breathing, dark bold skin
    u.moodV += (u.mood - u.moodV) * Math.min(1, dt * 2.5);
    u.breath += dt * (3.4 + u.moodV * 5.5); const o = 0.5 + 0.5 * Math.sin(u.breath), m = u.mouth.children;
    m[2].scale.setScalar(0.15 + 0.85 * o); m[0].scale.set(1, 0.72 + 0.28 * o, 1 + 0.25 * (1 - o)); m[1].scale.set(1.12, 1.12 * (0.72 + 0.28 * o), 1.12 * (1 + 0.25 * (1 - o)));
    u.mouth.userData.gills.forEach(g => { g.scale.y = 0.35 + 0.65 * (1 - o); });
    const c = u.bodyM.color, v = u.moodV; c.setRGB(1.12 - 0.6 * v, 1.1 - 0.62 * v, 1.08 - 0.62 * v);
  }
}

// ---------------------------------------------------------------------------------------------
// Schools for the game: the same fish, instanced (4 draw calls per school). Works with animateSchool().
// name: [weight, min count, max count, min size, max size]
const SCHOOLS = { 'Palette surgeonfish': [2, 1, 4, 0.7, 0.95], 'Moorish idol': [1.5, 1, 3, 0.75, 1], 'Foxface rabbitfish': [1.5, 1, 2, 0.75, 0.95], 'Emperor angelfish': [1.2, 1, 1, 0.9, 1.1],
  'Needlefish': [1.2, 4, 9, 0.8, 1], 'Trumpetfish': [0.9, 1, 1, 1, 1.3], 'Blue-green chromis': [3, 10, 22, 0.3, 0.4], 'Yellowtail damselfish': [2, 6, 14, 0.3, 0.4], 'Pink skunk clownfish': [1, 2, 3, 0.4, 0.5],
  'Clownfish': [0.8, 2, 2, 0.4, 0.5], 'Giant puffer': [0.5, 1, 1, 1.2, 1.5], 'Clown triggerfish': [1, 1, 1, 0.9, 1.1], 'Titan triggerfish': [0.7, 1, 1, 1.1, 1.3], 'Clown surgeonfish': [1.5, 1, 4, 0.7, 0.9],
  'Brown sailfin tang': [1.2, 1, 3, 0.7, 0.9], 'Threadfin butterflyfish': [2, 2, 2, 0.6, 0.8], 'Orange-lined triggerfish': [1, 1, 1, 0.8, 1], 'Lunar fusilier': [2.5, 8, 18, 0.5, 0.65], 'Silversides': [2, 20, 36, 0.22, 0.3],
  'Anthias': [3, 10, 20, 0.3, 0.4], 'Parrotfish': [1.5, 1, 3, 1.0, 1.4], 'Coral grouper': [1, 1, 1, 1.3, 1.7], 'Schooling bannerfish': [1.2, 5, 12, 0.5, 0.65] };
const byName = Object.fromEntries(DESIGNS.map(d => [d.en, d]));
export const design = (name) => byName[name];
function eyeGeo(d, P, lo = false) {   // lo: tiny school fish, where eye detail can't be seen anyway
  const [ex, ey, er] = d.eye, lat = P.latAt(ex, ey) * S, r = Math.min(er * S * 1.3, Math.max(lat * 1.25, er * S * 0.85)), out = [];
  const col = (g, c) => { const k = new THREE.Color(c), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([k.r, k.g, k.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); return g; };
  const q = new THREE.Quaternion(), m = new THREE.Matrix4();
  for (const sx of [-1, 1]) {
    const nrm = new THREE.Vector3(sx, 0.12, -0.38).normalize(); q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm);
    m.compose(new THREE.Vector3(sx * Math.max(lat - r * 0.35, r * 0.25), (100 - ey) * S, (ex - P.xm) * S), q, new THREE.Vector3(1, 1, 1));
    const rim = new THREE.SphereGeometry(r * 1.12, lo ? 6 : 10, lo ? 4 : 7); rim.translate(0, 0, -r * 0.28);
    const pup = new THREE.SphereGeometry(r * 0.62, lo ? 5 : 8, lo ? 3 : 6); pup.scale(1, 1, 0.45); pup.translate(0, 0, r * 0.8);
    const h1 = new THREE.SphereGeometry(r * 0.22, 6, 4); h1.translate(r * 0.24, r * 0.26, r * 1.04);
    (lo ? [col(rim, OUT), col(new THREE.SphereGeometry(r, 6, 4), '#ffffff'), col(pup, '#1F1A2E')] : [col(rim, OUT), col(new THREE.SphereGeometry(r, 10, 7), '#ffffff'), col(pup, '#1F1A2E'), col(h1, '#ffffff')]).forEach(g => out.push(g.applyMatrix4(m)));
  }
  return mergeGeometries(out);
}
export function makeSchool3D(name, n, size) {
  const Rn = Math.random;
  if (!name) { const keys = Object.keys(SCHOOLS), tot = keys.reduce((a, k) => a + SCHOOLS[k][0], 0); let r = Rn() * tot; name = keys.find(k => (r -= SCHOOLS[k][0]) < 0) || keys[0]; }
  const d = byName[name], sp = SCHOOLS[name] || [1, 1, 1, 1, 1];
  n ??= sp[1] + Math.floor(Rn() * (sp[2] - sp[1] + 1)); size ??= sp[3] + Rn() * (sp[4] - sp[3]);
  const P = parts(d), tiny = sp[4] < 0.5;   // tiny species: light eyes, no outline
  if (!P.inst) {
    const fg = [P.fins.clone()];
    if (P.pec) for (const sx of [-1, 1]) { const g = P.pec.g.clone(); g.rotateY(sx * 0.6); g.translate(sx * (P.pec.x + 0.004), P.pec.y, P.pec.z); fg.push(g); }
    P.inst = { fins: mergeGeometries(fg), eyes: d.eye ? eyeGeo(d, P, tiny) : null };
  }
  const gl = GLOW[d.en], fx = (gl || METAL[d.en]) ? { glow: gl ? gl[0] : 0, gc: new THREE.Color(gl ? gl[1] : '#fff'), metal: METAL[d.en] || 0, key: d.en } : null;
  const mats = [swim(new THREE.MeshBasicMaterial({ color: OUT, side: THREE.BackSide }), null, P.len, 0.014, null, true),
    swim(new THREE.MeshToonMaterial({ map: P.bodyTex, gradientMap: softGrad() }), null, P.len, 0, fx, true),
    swim(new THREE.MeshBasicMaterial({ map: P.finTex, alphaTest: 0.45, side: THREE.DoubleSide }), null, P.len, 0, null, true)];
  const meshes = [new THREE.InstancedMesh(P.bodyLo, mats[0], tiny ? 0 : n), new THREE.InstancedMesh(P.bodyLo, mats[1], n), new THREE.InstancedMesh(P.inst.fins, mats[2], n)];
  if (tiny) meshes[0].visible = false;
  if (P.inst.eyes) { const em = swim(new THREE.MeshBasicMaterial({ vertexColors: true }), null, P.len, 0, null, true); mats.push(em); meshes.push(new THREE.InstancedMesh(P.inst.eyes, em, n)); }
  const g = new THREE.Group(); meshes.forEach(m => { m.frustumCulled = false; g.add(m); });
  const spread = 0.55 + Math.sqrt(n) * 0.5 * Math.max(size, 0.5), fish = [];
  for (let i = 0; i < n; i++) fish.push({
    o: new THREE.Vector3((Rn() - 0.5) * spread * 1.4, (Rn() - 0.5) * spread * 0.7, (Rn() - 0.5) * spread * 1.4),
    f: [0.25 + Rn() * 0.9, 0.3 + Rn() * 1.1, 0.2 + Rn() * 0.8, 0.5 + Rn() * 1.5], ph: [Rn() * 6, Rn() * 6, Rn() * 6, Rn() * 6],
    a: (0.25 + Rn() * 0.5) * Math.max(0.6, size), s: size * (0.85 + Rn() * 0.3), dart: new THREE.Vector3(), nextDart: Rn() * 4, prev: new THREE.Vector3(), yaw: 0, pitch: 0 });
  g.userData = { meshes, fish, mats, t: Rn() * 10, n, size, species: name, small: size < 0.6 };
  return g;
}
