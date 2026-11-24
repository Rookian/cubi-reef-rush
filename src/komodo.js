// Komodo critters, modelled after the real animals divers meet in Komodo National Park:
// moon jellyfish, common & thorny seahorses, orangutan crab and red-spotted guard crab, six Komodo nudibranchs,
// a juvenile green sea turtle and a whale shark. Same toon look as the rest of the game, but with real shapes,
// textures and colours. Every model faces -Z (head first) unless noted.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { plastic as toon, outline } from './materials.js';
import { rng, makeEye } from './models.js';
import * as C3 from './critters3d.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
const texCache = {};
function canvasTex(key, w, h, draw) {
  if (texCache[key]) return texCache[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.wrapS = THREE.RepeatWrapping;
  return (texCache[key] = t);
}
// A tube along a curve with a radius that may depend on the angle around it (u = along, v = around).
function sweep(pts, radius, radial = 16, opts = {}) {
  const curve = new THREE.CatmullRomCurve3(pts), n = opts.segs || pts.length * 6;
  const frames = curve.computeFrenetFrames(n, false), pos = [], uv = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, P = curve.getPointAt(t), N = opts.up ? opts.up(t, frames.tangents[i]) : frames.normals[i], B = new THREE.Vector3().crossVectors(frames.tangents[i], N).normalize();
    const N2 = new THREE.Vector3().crossVectors(B, frames.tangents[i]).normalize();
    for (let j = 0; j <= radial; j++) {
      const a = j / radial * TAU, r = radius(t, a), rx = Array.isArray(r) ? r[0] : r, ry = Array.isArray(r) ? r[1] : r;
      pos.push(P.x + N2.x * Math.cos(a) * ry + B.x * Math.sin(a) * rx, P.y + N2.y * Math.cos(a) * ry + B.y * Math.sin(a) * rx, P.z + N2.z * Math.cos(a) * ry + B.z * Math.sin(a) * rx);
      uv.push(t, j / radial);
    }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const capsuleAt = (a, b, r, mat) => { const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, d.length() - 2 * r), 3, 7), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return m; };

// =====================================================================
// MOON JELLYFISH (Aurelia) — a glassy, almost invisible bell; only the four horseshoe gonads glow in vivid colour,
// the rim catches rainbow glints, fine tentacles fringe the margin and frilly oral arms trail below.
// =====================================================================
const JELLY_TINTS = [['#C043FF', '#FF5FD2'], ['#FF5A8A', '#FFB03A'], ['#3AD6FF', '#8A6BFF']];
export function makeMoonJelly(v = 0) {
  const [g1, g2] = JELLY_TINTS[v % JELLY_TINTS.length], root = new THREE.Group(), bell = new THREE.Group(); root.add(bell);
  const U = { uT: { value: Math.random() * 10 } };
  // bell: shallow dome with 8 scalloped lappets at the margin
  const dome = new THREE.SphereGeometry(0.62, 64, 20, 0, TAU, 0, Math.PI * 0.5);
  { const p = dome.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), rim = 1 - y / 0.62;
    const k = 1 + 0.035 * Math.cos(a * 8) * rim ** 3; p.setXYZ(i, x * k, y * 0.5 - rim ** 4 * 0.03, z * k); } dome.computeVertexNormals(); }
  const glass = new THREE.MeshBasicMaterial({ color: '#DDF4FF', transparent: true, depthWrite: false, side: THREE.DoubleSide });
  glass.onBeforeCompile = (sh) => { sh.uniforms.uT = U.uT;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vN; varying vec3 vV; varying vec3 vP;').replace('#include <project_vertex>', '#include <project_vertex>\nvN = normalize(normalMatrix * normal); vV = normalize(-mvPosition.xyz); vP = position;');
    sh.fragmentShader = 'uniform float uT;\n' + sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vN; varying vec3 vV; varying vec3 vP;').replace('#include <opaque_fragment>', `
      float fr = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
      float h = fract(atan(vP.z, vP.x) / 6.2831 * 2.0 + fr * 0.8 + uT * 0.05);
      vec3 rainbow = 0.5 + 0.5 * cos(6.2831 * (h + vec3(0.0, 0.33, 0.67)));
      outgoingLight = mix(vec3(0.85, 0.95, 1.0), rainbow, 0.35 * fr) * (0.6 + fr);
      diffuseColor.a = 0.07 + 0.5 * fr;
      #include <opaque_fragment>`); };
  glass.customProgramCacheKey = () => 'moonjelly';
  const bellM = new THREE.Mesh(dome, glass); bellM.renderOrder = 3; bell.add(bellM);
  // four glowing horseshoe gonads seen through the bell
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + Math.PI / 4, gm = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.02, 8, 24, Math.PI * 1.55), new THREE.MeshBasicMaterial({ color: i % 2 ? g1 : g2, transparent: true, opacity: 0.9 }));
    gm.rotation.set(-Math.PI / 2 + 0.35, 0, a + Math.PI * 0.27); gm.position.set(Math.cos(a) * 0.11, 0.13, Math.sin(a) * 0.11); gm.renderOrder = 2; bell.add(gm); }
  // radial canals
  const canal = []; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; for (let k = 0; k < 6; k++) { const r0 = 0.08 + k * 0.09, r1 = r0 + 0.09, y = (r) => 0.31 * Math.sqrt(Math.max(0, 1 - (r / 0.62) ** 2));
    canal.push(Math.cos(a) * r0, y(r0) - 0.01, Math.sin(a) * r0, Math.cos(a) * r1, y(r1) - 0.01, Math.sin(a) * r1); } }
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(canal, 3));
  bell.add(new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ color: '#F0FAFF', transparent: true, opacity: 0.35, depthWrite: false })));
  // rainbow glints along the margin (they shift colour as the bell pulses)
  const NG = 48, gp = new Float32Array(NG * 3), gc = new Float32Array(NG * 3);
  for (let i = 0; i < NG; i++) { const a = i / NG * TAU; gp.set([Math.cos(a) * 0.6, 0.02, Math.sin(a) * 0.6], i * 3); }
  const glG = new THREE.BufferGeometry(); glG.setAttribute('position', new THREE.BufferAttribute(gp, 3)); glG.setAttribute('color', new THREE.BufferAttribute(gc, 3));
  const glints = new THREE.Points(glG, new THREE.PointsMaterial({ size: 0.045, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); bell.add(glints);
  // fine marginal tentacles (a fringe of short threads that trail and sway)
  const NT = 96, tp = [];
  for (let i = 0; i < NT; i++) { const a = i / NT * TAU, L = 0.25 + (i % 3) * 0.08; for (let k = 0; k < 6; k++) { const t0 = k / 6, t1 = (k + 1) / 6;
    tp.push(Math.cos(a) * 0.6 * (1 - t0 * 0.12), -L * t0, Math.sin(a) * 0.6 * (1 - t0 * 0.12), Math.cos(a) * 0.6 * (1 - t1 * 0.12), -L * t1, Math.sin(a) * 0.6 * (1 - t1 * 0.12)); } }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
  const fringe = new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ color: '#E9F6FF', transparent: true, opacity: 0.45, depthWrite: false })); root.add(fringe);
  // four frilly oral arms
  const arms = [], armM = new THREE.MeshBasicMaterial({ color: '#F4E6FF', transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU, pts = []; for (let k = 0; k <= 8; k++) pts.push(V(Math.cos(a) * (0.05 + k * 0.012) + Math.sin(k * 0.9 + i) * 0.03, -k * 0.13, Math.sin(a) * (0.05 + k * 0.012)));
    const geo = sweep(pts, (t, an) => { const w = 0.05 * (1 - t * 0.7); return [w * (1 + 0.45 * Math.sin(t * 46 + an * 3)), w * 0.2]; }, 10);
    const arm = new THREE.Mesh(geo, armM); arm.renderOrder = 1; const piv = new THREE.Group(); piv.add(arm); root.add(piv); arms.push(piv); }
  root.userData = { bell, arms, fringe, glints, U, t: Math.random() * 10 };
  return root;
}
const _hc = new THREE.Color();
export function animateMoonJelly(j, dt) {
  const u = j.userData; u.t += dt; u.U.uT.value += dt;
  const ph = u.t * 2.1, s = Math.sin(ph), pull = Math.max(0, -Math.cos(ph));
  u.bell.scale.set(1 + s * 0.07, 1 - s * 0.12, 1 + s * 0.07);
  u.fringe.scale.set(1 + s * 0.06, 1 + pull * 0.25, 1 + s * 0.06);
  u.arms.forEach((a, i) => { a.rotation.x = Math.sin(u.t * 0.9 + i) * 0.14; a.rotation.z = Math.cos(u.t * 0.7 + i * 1.7) * 0.14; a.scale.y = 1 + pull * 0.1; });
  const c = u.glints.geometry.attributes.color;
  for (let i = 0; i < c.count; i++) { const k = 0.5 + 0.5 * Math.sin(u.t * 3 + i * 1.3); _hc.setHSL((i / c.count * 2 + u.t * 0.15) % 1, 1, 0.55 * k * k); c.setXYZ(i, _hc.r, _hc.g, _hc.b); }
  c.needsUpdate = true;
}

// =====================================================================
// SEAHORSES — common/yellow seahorse (Hippocampus kuda) in yellow or dusky brown, and the thorny seahorse
// (H. histrix) with spines on every ring. Bony ringed trunk, coronet, long tube snout, prehensile curled tail,
// fluttering translucent dorsal fin. Faces -X (snout), body in the XY plane, upright.
// =====================================================================
const HORSES = { kuda: { base: '#E8B83A', dark: '#9A6A14', light: '#FFE58A', spines: 0 }, dusky: { base: '#6B5444', dark: '#3A2A20', light: '#B89A7A', spines: 0 },
  thorny: { base: '#E0703A', dark: '#8A3A1A', light: '#FFC08A', spines: 1 } };
export function makeSeahorse3D(kind = 'kuda') {
  const c = HORSES[kind] || HORSES.kuda, root = new THREE.Group(), rig = new THREE.Group(); root.add(rig);
  const tex = canvasTex('horse' + kind, 256, 128, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, c.dark); grd.addColorStop(0.35, c.base); grd.addColorStop(0.5, c.light); grd.addColorStop(0.65, c.base); grd.addColorStop(1, c.dark);
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) { const x = (i + 0.5) / 46 * w; g.fillStyle = c.dark; g.globalAlpha = 0.55; g.fillRect(x - 1.2, 0, 2.4, h); }   // bony ring grooves
    g.globalAlpha = 1; const R = rng(kind.length * 7);
    for (let i = 0; i < 260; i++) { g.fillStyle = R() < 0.5 ? c.light : c.dark; g.globalAlpha = 0.5; g.beginPath(); g.arc(R() * w, R() * h, 0.8 + R() * 1.6, 0, TAU); g.fill(); }   // speckles
    g.globalAlpha = 0.35; g.strokeStyle = c.light; g.lineWidth = 1.2; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(R() * w, 0); g.lineTo(R() * w, h); g.stroke(); }   // fine pale lines
  });
  const skin = toon('#ffffff'); skin.map = tex;
  // trunk + tail: a ringed tube from the neck down, belly bulging forward, tail curling forward into a spiral
  const pts = [];
  for (let i = 0; i <= 30; i++) { const t = i / 30; let x, y;
    if (t < 0.45) { const a = t / 0.45; x = -Math.sin(a * Math.PI) * 0.16 + a * 0.06; y = 1.0 - a * 0.72; }
    else { const a = (t - 0.45) / 0.55, ang = a * Math.PI * 1.7, r = 0.2 * (1 - a * 0.65); x = 0.06 - Math.sin(ang) * r * 0.9 - a * 0.06; y = 0.28 - (1 - Math.cos(ang)) * r - a * 0.1 * (1 - a); }
    pts.push(V(x, y, 0)); }
  const ringR = (t, a) => { const base = t < 0.1 ? 0.1 + t * 0.6 : t < 0.42 ? 0.16 - (t - 0.1) * 0.12 : Math.max(0.025, 0.12 - (t - 0.42) * 0.17);
    const rings = 1 + 0.07 * Math.pow(Math.abs(Math.sin(t * Math.PI * 23)), 6) + 0.05 * Math.cos(a * 4);   // bony ridges + squarish cross-section
    return [base * rings * 0.9, base * rings]; };
  const trunk = sweep(pts, ringR, 14, { segs: 140 });
  rig.add(outline(new THREE.Mesh(trunk, skin), 0.012, c.dark));
  // head: skull, tube snout, cheek, coronet
  const head = new THREE.Group(); head.position.set(-0.05, 1.04, 0); head.rotation.z = 0.35; rig.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), skin); skull.scale.set(1.05, 1, 0.82); head.add(outline(skull, 0.012, c.dark));
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.06, 0.3, 14), skin); snout.rotation.z = Math.PI / 2; snout.position.set(-0.24, -0.04, 0); head.add(outline(snout, 0.01, c.dark));
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 6, 14), toon(c.dark)); lip.rotation.y = Math.PI / 2; lip.position.set(-0.39, -0.04, 0); head.add(lip);
  const coronet = new THREE.Group(); coronet.position.set(0.04, 0.13, 0); head.add(coronet);
  for (let k = 0; k < 5; k++) { const a = k / 5 * TAU, sp = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.07, 5), toon(c.light)); sp.position.set(Math.cos(a) * 0.03, 0.03, Math.sin(a) * 0.03); sp.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4); coronet.add(sp); }
  for (const sz of [-1, 1]) { const e = makeEye(0.04, c.dark); e.position.set(-0.03, 0.02, sz * 0.1); e.lookAt(-0.03, 0.02, sz * 2); head.add(e);
    const brow = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.05, 5), toon(c.light)); brow.position.set(-0.03, 0.08, sz * 0.08); head.add(brow);
    const pec = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12, -0.8, 1.6), new THREE.MeshBasicMaterial({ color: c.light, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
    pec.position.set(0.1, -0.06, sz * 0.09); pec.rotation.y = sz * 0.5; head.add(pec); }
  // thorny seahorse: a spine on each ring at the shoulders and along the back
  if (c.spines) { const sm = toon(c.light), curve = new THREE.CatmullRomCurve3(pts);
    for (let k = 0; k < 26; k++) { const t = 0.03 + k * 0.022; if (t > 0.6) break; const p = curve.getPointAt(t), tg = curve.getTangentAt(t);
      for (const side of [-1, 1, 0]) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.11, 5), sm), nrm = V(tg.y, -tg.x, 0).multiplyScalar(-1);
        const dir = side ? V(nrm.x * 0.5, nrm.y * 0.5, side * 0.85).normalize() : nrm.clone().normalize(); sp.position.copy(p).addScaledVector(dir, 0.16 * (1 - t * 0.9));
        sp.quaternion.setFromUnitVectors(V(0, 1, 0), dir); rig.add(sp); } } }
  // translucent dorsal fin with rays on the back of the trunk
  const fs = new THREE.Shape(); fs.moveTo(0, 0); fs.quadraticCurveTo(0.14, 0.02, 0.16, 0.2); fs.quadraticCurveTo(0.12, 0.33, 0, 0.36); fs.lineTo(0, 0);
  const dfin = new THREE.Mesh(new THREE.ShapeGeometry(fs, 12), new THREE.MeshBasicMaterial({ color: c.light, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
  dfin.position.set(0.07, 0.44, 0); dfin.rotation.z = -0.15; rig.add(dfin);
  for (let k = 0; k < 7; k++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.16, 3), toon(c.base)); r.position.set(0.07 + 0.08, 0.46 + k * 0.045, 0.002); r.rotation.z = -1.35; rig.add(r); }
  root.userData = { rig, dfin, head, t: Math.random() * 10 };
  return root;
}
export function animateSeahorse3D(s, dt) {
  const u = s.userData; u.t += dt;
  u.rig.position.y = Math.sin(u.t * 1.1) * 0.08; u.rig.rotation.z = Math.sin(u.t * 0.7) * 0.06;
  u.dfin.scale.x = 0.75 + 0.25 * Math.sin(u.t * 22); u.head.rotation.z = 0.35 + Math.sin(u.t * 0.6) * 0.06;
}

// =====================================================================
// CRABS — the orangutan crab (Achaeus japonicus): tiny body, long spindly legs, all covered in fine
// orange-red hair (lives in bubble coral); and the red-spotted guard crab (Trapezia rufopunctata):
// smooth glossy cream shell and claws with orange-red spots (lives in branching coral). Face -Z.
// =====================================================================
export function makeKomodoCrab(kind = 'orangutan') {
  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig);
  const legs = [], R = rng(kind === 'orangutan' ? 5 : 9);
  if (kind === 'orangutan') {
    const fur = toon('#D9561E'), dark = toon('#8A2A10'), edge = '#5A1A08';
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), fur); body.scale.set(1, 0.75, 1.15); body.position.y = 0.32; rig.add(outline(body, 0.012, edge));
    const hairs = [];
    const addHair = (p, n, len) => { for (let i = 0; i < n; i++) { const d = V(R() - 0.5, R() * 0.8 + 0.2, R() - 0.5).normalize(); const h = new THREE.ConeGeometry(0.006, len * (0.6 + R() * 0.8), 3);
      h.translate(0, len * 0.4, 0); h.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d)); h.translate(p.x + d.x * 0.02, p.y + d.y * 0.02, p.z + d.z * 0.02); hairs.push(h); } };
    for (let i = 0; i < 70; i++) { const a = R() * TAU, b = R() * Math.PI * 0.6; addHair(V(Math.cos(a) * Math.sin(b) * 0.16, 0.32 + Math.cos(b) * 0.12, Math.sin(a) * Math.sin(b) * 0.18), 1, 0.08); }
    for (const sx of [-1, 1]) for (let l = 0; l < 4; l++) {   // long spindly walking legs with hair tufts
      const piv = new THREE.Group(); piv.position.set(sx * 0.13, 0.3, -0.08 + l * 0.07); rig.add(piv); legs.push({ piv, sx, l });
      const a = V(0, 0, 0), k = V(sx * 0.32, 0.18, (l - 1.5) * 0.14), f = V(sx * 0.62, -0.3, (l - 1.5) * 0.26);
      piv.add(capsuleAt(a, k, 0.014, fur), capsuleAt(k, f, 0.011, fur));
      for (let s2 = 0; s2 < 7; s2++) { const p = a.clone().lerp(k, s2 / 7); addHair(p.clone().add(piv.position), 3, 0.06); const q = k.clone().lerp(f, s2 / 7); addHair(q.clone().add(piv.position), 3, 0.05); }
    }
    for (const sx of [-1, 1]) { const a = V(sx * 0.1, 0.32, -0.15), b = V(sx * 0.18, 0.4, -0.3); rig.add(capsuleAt(a, b, 0.02, fur)); const claw = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), dark); claw.scale.set(1, 0.7, 1.6); claw.position.set(sx * 0.19, 0.41, -0.34); rig.add(claw); addHair(b, 6, 0.05); }
    const hm = new THREE.Mesh(mergeGeometries(hairs), toon('#FF8A3A')); rig.add(hm);
    for (const sx of [-1, 1]) { const e = makeEye(0.03, edge); e.position.set(sx * 0.05, 0.44, -0.16); e.lookAt(sx * 0.05, 0.44, -2); rig.add(e); }
  } else {
    const shellTex = canvasTex('guardcrab', 256, 128, (g, w, h) => { g.fillStyle = '#F3E6CF'; g.fillRect(0, 0, w, h); const r = rng(3);
      for (let i = 0; i < 70; i++) { const x = r() * w, y = r() * h * 0.8, s = 2 + r() * 5; g.fillStyle = r() < 0.7 ? '#E2462A' : '#F07A2A'; g.beginPath(); g.ellipse(x, y, s * 1.3, s, 0, 0, TAU); g.fill(); } });
    const shell = toon('#ffffff'); shell.map = shellTex; shell.emissive = new THREE.Color('#2a2018');
    const edge = '#7A2A14';
    const cara = new THREE.SphereGeometry(0.3, 32, 16, 0, TAU, 0, Math.PI / 2); cara.scale(1.15, 0.5, 0.95); cara.translate(0, 0.18, 0);
    const body = new THREE.Mesh(cara, shell); rig.add(outline(body, 0.014, edge));
    const under = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.28, 0.1, 24), toon('#EBD9BC')); under.scale.set(1.05, 1, 0.86); under.position.y = 0.15; rig.add(under);
    const legM = toon('#EED7B4');
    for (const sx of [-1, 1]) for (let l = 0; l < 4; l++) { const piv = new THREE.Group(); piv.position.set(sx * 0.28, 0.17, -0.06 + l * 0.08); rig.add(piv); legs.push({ piv, sx, l });
      const a = V(0, 0, 0), k = V(sx * 0.2, 0.08, (l - 1.5) * 0.05), f = V(sx * 0.34, -0.17, (l - 1.5) * 0.1); piv.add(capsuleAt(a, k, 0.03, legM), capsuleAt(k, f, 0.024, legM)); }
    for (const sx of [-1, 1]) { const arm = capsuleAt(V(sx * 0.22, 0.18, -0.2), V(sx * 0.3, 0.2, -0.36), 0.045, shell); rig.add(arm);
      const pal = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), shell); pal.scale.set(0.8, 0.65, 1.3); pal.position.set(sx * 0.27, 0.21, -0.48); rig.add(outline(pal, 0.012, edge));
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 8), toon('#4A2A1A')); tip.rotation.x = -Math.PI / 2; tip.position.set(sx * 0.25, 0.2, -0.6); rig.add(tip);
      const e = makeEye(0.04, edge); e.position.set(sx * 0.08, 0.3, -0.25); e.lookAt(sx * 0.08, 0.3, -2); rig.add(e); }
  }
  root.userData = { rig, legs, t: Math.random() * 10 };
  return root;
}
export function animateKomodoCrab(c, dt) {
  const u = c.userData; u.t += dt;
  u.rig.position.x = Math.sin(u.t * 0.6) * 0.25;
  const step = Math.cos(u.t * 0.6) * 0.6;   // legs tick while shuffling sideways
  u.legs.forEach(({ piv, sx, l }) => { piv.rotation.z = Math.sin(u.t * 7 + l * 1.6 + (sx > 0 ? 0 : Math.PI)) * 0.12 * Math.abs(step); piv.rotation.y = Math.sin(u.t * 0.8 + l) * 0.05; });
}

// =====================================================================
// NUDIBRANCHS of Komodo: 0 Nembrotha kubaryana (black, neon-green ridges, red-orange rim, orange-tipped gills & horns),
// 1 Chromodoris annae (blue, black-ringed stripes, white rim, orange gills), 2 Phyllidia varicosa (grey-blue with black
// lines and yellow-capped tubercles, no gill plume), 3 Hypselodoris bullocki (pink-violet, yellow-white rim),
// 4 Coryphellina exoptata (violet aeolid with orange-banded white-tipped cerata), 5 Thecacera pacifica ("Pikachu":
// orange-yellow, black/blue spots, black-tipped horns and appendages). Face -Z, length ~0.6.
// =====================================================================
const NUDIS = [
  { name: 'nembrotha', base: '#141414', rim: '#FF4A1E', gill: '#FF6A2A', horn: '#FF5A20', draw: (g, w, h) => { g.fillStyle = '#141414'; g.fillRect(0, 0, w, h); g.strokeStyle = '#5BFF5A'; g.lineWidth = 3;
      for (const v of [0.18, 0.32, 0.5, 0.68, 0.82]) { g.beginPath(); for (let x = 0; x <= w; x += 4) g.lineTo(x, v * h + Math.sin(x * 0.12 + v * 9) * 2); g.stroke(); }
      const r = rng(4); g.fillStyle = '#7CFF6A'; for (let i = 0; i < 90; i++) { g.beginPath(); g.arc(r() * w, r() * h, 1.4 + r() * 1.8, 0, TAU); g.fill(); } } },
  { name: 'annae', base: '#3A7BFF', rim: '#FFFFFF', gill: '#FF9A2A', horn: '#FF8A20', draw: (g, w, h) => { g.fillStyle = '#3F7EFF'; g.fillRect(0, 0, w, h);
      for (const v of [0.3, 0.7]) { g.fillStyle = '#FFFFFF'; g.fillRect(0, v * h - 7, w, 14); g.fillStyle = '#0A0A1A'; g.fillRect(0, v * h - 4, w, 8); }
      g.fillStyle = '#9AC8FF'; g.fillRect(0, 0.5 * h - 2, w, 4); } },
  { name: 'phyllidia', base: '#6F8FB2', rim: '#9FB8D0', gill: null, horn: '#FFD21E', draw: (g, w, h) => { g.fillStyle = '#7898BC'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#0E0E14'; g.lineWidth = 6; for (const v of [0.22, 0.42, 0.58, 0.78]) { g.beginPath(); for (let x = 0; x <= w; x += 4) g.lineTo(x, v * h + Math.sin(x * 0.07 + v * 5) * 3); g.stroke(); } } },
  { name: 'bullocki', base: '#D98AE0', rim: '#FFF1A8', gill: '#FF9A3A', horn: '#FF9A3A', draw: (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#B76AD8'); gr.addColorStop(0.5, '#F2A8E8'); gr.addColorStop(1, '#B76AD8');
      g.fillStyle = gr; g.fillRect(0, 0, w, h); } },
  { name: 'coryphellina', base: '#A35AE8', rim: '#C99AFF', gill: null, horn: '#FF8A2A', aeolid: true, draw: (g, w, h) => { g.fillStyle = '#A35AE8'; g.fillRect(0, 0, w, h); g.fillStyle = '#FFFFFF'; g.fillRect(0, 0.5 * h - 2, w, 4); } },
  { name: 'thecacera', base: '#FF9A1E', rim: '#FFB03A', gill: '#FFB03A', horn: '#FF9A1E', tips: '#111111', draw: (g, w, h) => { g.fillStyle = '#FFA21E'; g.fillRect(0, 0, w, h); const r = rng(8);
      for (let i = 0; i < 80; i++) { g.fillStyle = r() < 0.6 ? '#141414' : '#2A6AFF'; g.beginPath(); g.arc(r() * w, r() * h, 1.5 + r() * 2.5, 0, TAU); g.fill(); } } }];
export function makeNudi3D(i = 0) {
  const S = NUDIS[i % NUDIS.length], root = new THREE.Group(), rig = new THREE.Group(); root.add(rig);
  const tex = canvasTex('nudi' + S.name, 256, 128, S.draw), skin = toon('#ffffff'); skin.map = tex;
  // body: a soft slug, flat foot, raised mantle; u runs head->tail, v around
  const pts = []; for (let k = 0; k <= 10; k++) pts.push(V(0, 0.07, -0.3 + k * 0.06));
  const body = sweep(pts, (t, a) => { const w = 0.1 * Math.sin(Math.PI * Math.min(1, 0.12 + t * 0.95)) ** 0.6 + 0.01, up = Math.cos(a) > 0;
    return [w * (up ? 1 : 1.25), w * (up ? 0.75 : 0.25)]; }, 18, { up: () => V(0, 1, 0) });
  const bm = new THREE.Mesh(body, skin); rig.add(outline(bm, 0.008, '#1A1020'));
  // frilly mantle rim / foot edge in the rim colour
  const rimPts = []; for (let k = 0; k <= 40; k++) { const t = k / 40, a = t * TAU, rx = 0.115, rz = 0.31; rimPts.push(V(Math.sin(a) * rx * (1 + 0.06 * Math.sin(a * 14)), 0.045, -Math.cos(a) * rz)); }
  rig.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPts, true), 80, 0.014, 6, true), toon(S.rim)));
  // Phyllidia tubercles: rows of bumps with yellow caps
  if (S.name === 'phyllidia') { const bumps = [], caps = []; for (let r = -2; r <= 2; r++) for (let k = 0; k < 9; k++) { const z = -0.22 + k * 0.055, x = r * 0.035, y = 0.12 - Math.abs(r) * 0.018;
    const b = new THREE.SphereGeometry(0.016, 8, 6); b.translate(x, y, z); bumps.push(b); const c = new THREE.SphereGeometry(0.009, 6, 4); c.translate(x, y + 0.012, z); caps.push(c); }
    rig.add(new THREE.Mesh(mergeGeometries(bumps), toon('#7898BC')), new THREE.Mesh(mergeGeometries(caps), toon('#FFD21E'))); }
  // rhinophores: lamellate horns (stacked discs), tipped in the horn colour
  for (const sx of [-1, 1]) { const h = new THREE.Group(); h.position.set(sx * 0.04, 0.11, -0.2); h.rotation.set(-0.3, 0, sx * 0.25); rig.add(h);
    h.add(capsuleAt(V(0, 0, 0), V(0, 0.06, 0), 0.012, toon(S.base)));
    for (let k = 0; k < 6; k++) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.02 - k * 0.002, 0.022 - k * 0.002, 0.008, 10), toon(S.horn)); d.position.y = 0.06 + k * 0.012; h.add(d); }
    if (S.tips) { const tp = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), toon(S.tips)); tp.position.y = 0.135; h.add(tp); } }
  // oral tentacles
  for (const sx of [-1, 1]) rig.add(capsuleAt(V(sx * 0.04, 0.04, -0.29), V(sx * 0.09, 0.03, -0.33), 0.009, toon(S.rim)));
  let gill = null;
  if (S.gill) { gill = new THREE.Group(); gill.position.set(0, 0.1, 0.18); rig.add(gill);   // branched gill plume
    for (let k = 0; k < 7; k++) { const a = k / 7 * TAU, br = new THREE.Group(); br.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7); gill.add(br);
      br.add(capsuleAt(V(0, 0, 0), V(0, 0.09, 0), 0.008, toon(S.base === '#141414' ? '#1E1E1E' : S.gill)));
      for (let q = 1; q <= 4; q++) for (const s2 of [-1, 1]) { const tw = capsuleAt(V(0, q * 0.02, 0), V(s2 * 0.022, q * 0.02 + 0.02, 0), 0.005, toon(S.gill)); br.add(tw); } } }
  if (S.name === 'thecacera') for (const sx of [-1, 1]) { const ap = capsuleAt(V(sx * 0.06, 0.08, 0.14), V(sx * 0.1, 0.17, 0.18), 0.015, toon(S.base)); rig.add(ap); const tp = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), toon('#111111')); tp.position.set(sx * 0.1, 0.18, 0.185); rig.add(tp); }
  const cerata = [];
  if (S.aeolid) for (let k = 0; k < 9; k++) for (const sx of [-1, 1]) for (let r = 0; r < 2; r++) {   // aeolid cerata: finger-like, orange band, white tip
    const z = -0.14 + k * 0.045, piv = new THREE.Group(); piv.position.set(sx * (0.03 + r * 0.035), 0.1, z); piv.rotation.set(0.2, 0, sx * (0.35 + r * 0.35)); rig.add(piv);
    const L = 0.09 + 0.03 * Math.sin(k); piv.add(capsuleAt(V(0, 0, 0), V(0, L * 0.6, 0), 0.012, toon('#C08AFF')), capsuleAt(V(0, L * 0.6, 0), V(0, L * 0.88, 0), 0.0125, toon('#FF8A1E')), capsuleAt(V(0, L * 0.88, 0), V(0, L, 0), 0.011, toon('#FFFFFF')));
    cerata.push(piv); }
  root.userData = { rig, gill, cerata, t: Math.random() * 10 };
  return root;
}
export function animateNudi3D(n, dt) {
  const u = n.userData; u.t += dt;
  u.rig.scale.z = 1 + Math.sin(u.t * 2.2) * 0.04; u.rig.position.z = -((u.t * 0.05) % 0.5) + 0.25;
  if (u.gill) { u.gill.scale.setScalar(0.92 + Math.sin(u.t * 1.3) * 0.08); u.gill.rotation.y = Math.sin(u.t * 0.4) * 0.3; }
  u.cerata.forEach((c, i) => { c.rotation.x = 0.2 + Math.sin(u.t * 1.6 + i * 0.7) * 0.15; });
}

// =====================================================================
// JUVENILE GREEN SEA TURTLE — the reviewed sea turtle model with youthful proportions: a bigger head and eyes,
// larger flippers for its size, a brighter shell with crisp scute seams.
// =====================================================================
export function makeBabyTurtle3D() {
  const t = C3.makeSeaTurtle('green'), u = t.userData;
  if (u.head) u.head.scale.setScalar(1.3);
  (u.flips || []).forEach(({ fp, rp }) => { fp.scale.setScalar(1.15); rp.scale.setScalar(1.1); });
  t.traverse(o => { if (o.isMesh && o.material && o.material.color && !o.material.isMeshBasicMaterial) o.material = o.material.clone(), o.material.color.offsetHSL(0.01, 0.06, 0.06); });
  t.scale.setScalar(1.05);
  return t;
}
export const animateBabyTurtle3D = (t, dt) => { t.userData.stroke = 0.75; C3.animateSeaTurtle(t, dt * 1.25); };

// =====================================================================
// WHALE SHARK — broad, flat head with a wide terminal mouth at the very front; three ridges along each flank;
// big first dorsal, small second dorsal, sickle pectorals; a tall crescent tail (upper lobe longer); dark blue-grey
// with the checkerboard of pale spots and stripes, white belly. One swimming wave runs head-to-tail through it all.
// Faces -Z, length ~3.8.
// =====================================================================
export function makeWhaleShark3D() {
  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig);
  const U = { uT: { value: Math.random() * 10 } }, L0 = -1.5, L1 = 2.3;
  const tex = canvasTex('whaleshark', 1024, 256, (g, w, h) => {
    // u = head -> tail, v = around starting at the belly
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#F2F5F2'); gr.addColorStop(0.22, '#E8EDEA'); gr.addColorStop(0.32, '#4E6A80'); gr.addColorStop(0.5, '#3A5468'); gr.addColorStop(0.68, '#4E6A80'); gr.addColorStop(0.78, '#E8EDEA'); gr.addColorStop(1, '#F2F5F2');
    g.fillStyle = gr; g.fillRect(0, 0, w, h); const r = rng(12);
    // pale vertical stripes on the body, a grid with the horizontal ones
    g.strokeStyle = 'rgba(235,242,240,0.75)'; g.lineWidth = 3;
    for (let x = w * 0.18; x < w * 0.82; x += w * 0.045) { g.beginPath(); g.moveTo(x + r() * 6, h * 0.27); g.lineTo(x + r() * 6, h * 0.73); g.stroke(); }
    for (const v of [0.36, 0.44, 0.56, 0.64]) { g.beginPath(); g.moveTo(w * 0.2, v * h); g.lineTo(w * 0.8, v * h + r() * 4); g.stroke(); }
    // spots: dense small ones on the head, larger ones between the stripes, fading along the tail
    g.fillStyle = '#F4F8F6';
    for (let i = 0; i < 1600; i++) { const x = r() * w, v = 0.27 + r() * 0.46, head = x < w * 0.2, s = head ? 1.6 + r() * 1.4 : 2.2 + r() * 3.2;
      if (x > w * 0.92 && r() < 0.6) continue; g.globalAlpha = 0.85; g.beginPath(); g.arc(x, v * h, s, 0, TAU); g.fill(); }
    g.globalAlpha = 1;
  });
  const skin = toon('#ffffff'); skin.map = tex;
  const wave = (m) => { m.onBeforeCompile = (sh) => { sh.uniforms.uT = U.uT; sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float zt = clamp((position.z - (-0.3)) / 2.6, 0.0, 1.0); transformed.x += sin(uT - position.z * 1.6) * zt * zt * 0.32 + sin(uT) * 0.03;`); };
    m.customProgramCacheKey = () => 'wshark' + m.type + (m.side || 0); return m; };
  wave(skin);
  // body: elliptic cross-sections, very wide and flat at the head, rounding into a tall narrow tail stalk
  const pts = []; for (let k = 0; k <= 24; k++) pts.push(V(0, 0, L0 + (L1 - L0) * k / 24));
  const body = sweep(pts, (t, a) => {
    const head = Math.min(1, t / 0.08), prof = t < 0.08 ? Math.sqrt(head) : t < 0.45 ? 1 : 1 - Math.pow((t - 0.45) / 0.55, 1.4) * 0.86;
    const wide = 0.66 * prof * (t < 0.3 ? 1.15 - t * 0.5 : 1), tall = 0.42 * prof * (t < 0.25 ? 0.8 + t : 1.05) * (t > 0.8 ? 1 + (t - 0.8) * 0.4 : 1);
    const ridge = 1 + 0.035 * (Math.pow(Math.max(0, Math.cos((a - 0.9) * 7)), 18) + Math.pow(Math.max(0, Math.cos((a + 0.9) * 7)), 18) + Math.pow(Math.max(0, Math.cos(a * 7)), 22)) * (t > 0.12 && t < 0.85 ? 1 : 0);
    return [wide * ridge, tall * ridge * (Math.cos(a) < 0 ? 0.85 : 1)]; }, 40, { up: () => V(0, 1, 0), segs: 120 });
  { const p = body.attributes.position, uvA = body.attributes.uv; for (let i = 0; i < p.count; i++) uvA.setY(i, (uvA.getY(i) + 0.5) % 1); }   // seam on the belly
  const bm = new THREE.Mesh(body, skin); rig.add(outline(bm, 0.03, '#1E2C3A'));
  const finM = wave(toon('#3E586E', { side: THREE.DoubleSide }));
  const finShape = (arr) => { const s = new THREE.Shape(); s.moveTo(arr[0][0], arr[0][1]); for (let i = 1; i < arr.length; i += 2) s.quadraticCurveTo(arr[i][0], arr[i][1], arr[i + 1][0], arr[i + 1][1]); return s; };
  const extrFin = (arr, th) => { const g = new THREE.ExtrudeGeometry(finShape(arr), { depth: th, bevelEnabled: true, bevelThickness: th * 0.4, bevelSize: th * 0.4, bevelSegments: 2, curveSegments: 14 }); g.translate(0, 0, -th / 2); return g; };
  // first and second dorsal fins (in the YZ plane)
  const d1 = new THREE.Mesh(extrFin([[0, 0], [0.15, 0.2], [0.45, 0.62], [0.55, 0.5], [0.62, 0]], 0.05), finM); d1.rotation.y = -Math.PI / 2; d1.position.set(0, 0.36, 0.35); rig.add(outline(d1, 0.02, '#1E2C3A'));
  const d2 = new THREE.Mesh(extrFin([[0, 0], [0.08, 0.1], [0.22, 0.25], [0.26, 0.18], [0.3, 0]], 0.035), finM); d2.rotation.y = -Math.PI / 2; d2.position.set(0, 0.22, 1.35); rig.add(outline(d2, 0.015, '#1E2C3A'));
  // pectoral fins: long sickles angled down and back
  for (const sx of [-1, 1]) { const g = extrFin([[0, 0], [0.4, -0.05], [1.0, -0.5], [0.75, -0.25], [0.1, 0.35]], 0.04); const f = new THREE.Mesh(g, finM);
    f.rotation.set(Math.PI / 2, 0, 0); const piv = new THREE.Group(); piv.add(f); piv.position.set(sx * 0.5, -0.22, -0.55); piv.rotation.set(0.1, sx > 0 ? -1.2 : 1.2 + Math.PI, sx * -0.35); if (sx < 0) piv.scale.x = -1;
    rig.add(piv); }
  // pelvic and anal fins
  for (const sx of [-1, 1]) { const p = new THREE.Mesh(extrFin([[0, 0], [0.1, -0.12], [0.25, -0.2], [0.22, -0.05], [0.25, 0]], 0.025), finM); p.rotation.set(0, -Math.PI / 2, sx * 0.4); p.position.set(sx * 0.18, -0.28, 1.0); rig.add(p); }
  const an = new THREE.Mesh(extrFin([[0, 0], [0.08, -0.1], [0.2, -0.2], [0.22, -0.06], [0.26, 0]], 0.025), finM); an.rotation.y = -Math.PI / 2; an.position.set(0, -0.18, 1.45); rig.add(an);
  // crescent tail: tall upper lobe, shorter lower lobe
  const tail = new THREE.Mesh(extrFin([[0, -0.05], [0.25, -0.15], [0.5, -0.75], [0.42, -0.3], [0.55, -0.05], [0.45, 0.4], [0.8, 1.15], [0.35, 0.45], [0, 0.08]], 0.05), finM);
  tail.rotation.y = -Math.PI / 2; tail.position.set(0, 0.05, L1 - 0.08); rig.add(outline(tail, 0.02, '#1E2C3A'));
  // head details: wide mouth slit, small eyes behind the mouth corners, five big gill slits, nostril barbels
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.03, 6, 40, Math.PI * 0.9), toon('#1E2A34')); mouth.rotation.set(Math.PI / 2, 0, Math.PI * 1.05); mouth.scale.set(1.05, 0.55, 1); mouth.position.set(0, -0.05, L0 + 0.32); rig.add(mouth);
  for (const sx of [-1, 1]) {
    const eye = makeEye(0.05, '#1E2C3A'); eye.position.set(sx * 0.62, 0.04, L0 + 0.48); eye.lookAt(sx * 2, 0.06, L0 - 0.2); rig.add(eye);
    for (let k = 0; k < 5; k++) { const gs = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.32 - k * 0.02, 2, 4), toon('#22303C')); gs.position.set(sx * (0.66 - k * 0.012), -0.02, L0 + 0.85 + k * 0.1); gs.rotation.z = sx * 0.25; rig.add(gs); }
    const bar = capsuleAt(V(sx * 0.15, -0.02, L0 + 0.06), V(sx * 0.17, -0.06, L0 - 0.02), 0.012, toon('#C8D4DA')); rig.add(bar); }
  root.userData = { rig, U, t: Math.random() * 10 };
  return root;
}
export function animateWhaleShark3D(w, dt) { const u = w.userData; u.t += dt; u.U.uT.value += dt * 1.3; u.rig.position.y = Math.sin(u.t * 0.6) * 0.06; u.rig.rotation.z = Math.sin(u.t * 0.65) * 0.02; }
