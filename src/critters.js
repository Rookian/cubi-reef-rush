// New sea friends (and two new foes), all in the game's toon style. Every model faces -Z.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { plastic as toon, paintGradient, outline } from './materials.js';
import { makeEye, placeEye, smooth, basic, decal } from './models.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// lathe body: f(t) gives radius along the length (t: 0 = tail, 1 = snout); head ends up at -Z
function latheBody(f, y0, y1, sx = 1, sy = 1, seg = 30) {
  const prof = []; for (let i = 0; i <= 28; i++) { const t = i / 28; prof.push(new THREE.Vector2(Math.max(0.004, f(t)), y0 + t * (y1 - y0))); }
  let g = new THREE.LatheGeometry(prof, seg); g.rotateX(-Math.PI / 2); g.scale(sx, sy, 1); return smooth(g);
}
// flat fin with an ink outline (same recipe as the shark)
function fin(shape, color, edge, th = 0.03) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.ShapeGeometry(shape, 12), toon(color, { side: THREE.DoubleSide })));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(shape.getPoints(30).map(p => V(p.x, p.y, 0)), true), 60, th * 0.6, 5, true), basic(edge)));
  return g;
}
const shp = (pts) => { const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i += 2) s.quadraticCurveTo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]); s.closePath(); return s; };

// =====================================================================
// WHALE SHARK — gentle giant: wide flat head, smiley terminal mouth, white polka dots and pale stripes
// =====================================================================
export function makeWhaleShark() {
  const root = new THREE.Group(); const rig = new THREE.Group(); root.add(rig);
  const edge = '#1A2A48';
  const geo = latheBody(t => { const b = t < 0.55 ? Math.sin(Math.PI / 2 * t / 0.55) : 1 - 0.28 * ((t - 0.55) / 0.45) ** 2; const cap = t > 0.9 ? Math.sqrt(Math.max(0, 1 - ((t - 0.9) / 0.1) ** 2)) : 1; return 0.04 + 0.74 * b * cap; }, -1.8, 1.45, 1.28, 0.78, 40);
  const top = new THREE.Color('#3D63A0'), belly = new THREE.Color('#EEF5FA'), dot = new THREE.Color('#F6FBFF');
  paintGradient(geo, '#fff', '#fff', 'y', 0, 1, (c, i, p) => {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(x, y);
    c.copy(top).lerp(belly, THREE.MathUtils.smoothstep(-y, 0.0, 0.18));
    if (y > -0.05) {
      if (Math.sin(z * 10) * Math.sin(a * 11) > 0.78) c.copy(dot);                            // polka dots
      else if (Math.abs(Math.sin(z * 5.2 + 0.4)) < 0.07 && z > -1.0) c.lerp(dot, 0.6);          // pale stripes
      if (z < -1.0 && Math.sin(z * 22) * Math.sin(a * 16) > 0.8) c.copy(dot);                  // tiny dots on the head
    }
  });
  const body = outline(new THREE.Mesh(geo, toon('#ffffff', { vertexColors: true })), 0.05, edge); rig.add(body);
  // ridges along the back
  for (const sx of [-0.28, 0, 0.28]) { const r = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 1.9, 3, 6), toon('#5A80BA')); r.rotation.x = Math.PI / 2; r.position.set(sx, 0.56 - Math.abs(sx) * 0.35, 0.05); rig.add(r); }
  // big smiling mouth at the very front
  const mouth = new THREE.Group(); mouth.position.set(0, -0.12, -1.43); rig.add(mouth);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(1, 28, Math.PI, Math.PI), basic('#3A1A2A')); hole.scale.set(0.5, 0.13, 1); hole.rotation.y = Math.PI; mouth.add(hole);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 6, 28, Math.PI), basic(edge)); lip.rotation.set(0, Math.PI, Math.PI); lip.scale.set(0.5, 0.13, 0.3); mouth.add(lip);
  const tongue = new THREE.Mesh(new THREE.CircleGeometry(1, 16, Math.PI, Math.PI), basic('#FF8FA3')); tongue.scale.set(0.2, 0.05, 1); tongue.position.set(0, -0.06, -0.004); tongue.rotation.y = Math.PI; mouth.add(tongue);
  for (const sx of [-1, 1]) {
    rig.add(placeEye(makeEye(0.11, edge), V(sx * 0.82, 0.08, -1.08), V(sx, 0.15, -0.5).normalize()));
    const b = decal(0.1, 0.06, '#FF8FA3', 0.55); b.position.set(sx * 0.78, -0.12, -1.22); b.rotation.y = Math.PI + sx * 0.9; rig.add(b);
    for (let k = 0; k < 4; k++) { const gl = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.22, 2, 4), basic('#2A4070')); gl.position.set(sx * 0.93, 0.0, -0.75 + k * 0.1); gl.rotation.set(0, 0, sx * 0.2); rig.add(gl); }
  }
  const finC = '#4A70AE';
  const d1 = fin(shp([[-0.45, 0], [-0.1, 0.25], [0.1, 0.6], [0.2, 0.25], [0.45, 0]]), finC, edge); d1.rotation.y = Math.PI / 2; d1.position.set(0, 0.5, 0.35); rig.add(d1);
  const d2 = fin(shp([[-0.2, 0], [0, 0.12], [0.08, 0.25], [0.12, 0.1], [0.2, 0]]), finC, edge); d2.rotation.y = Math.PI / 2; d2.position.set(0, 0.3, 1.1); rig.add(d2);
  for (const sx of [-1, 1]) { const f = fin(shp([[0, -0.22], [0.6, -0.35], [1.0, -0.6], [0.5, 0.05], [0, 0.22]]), finC, edge); f.position.set(sx * 0.8, -0.3, -0.35); f.rotation.set(-0.25, sx > 0 ? -0.5 : Math.PI + 0.5, sx * -0.35); rig.add(f); }
  const tail = new THREE.Group(); tail.position.z = 1.75; rig.add(tail);
  const tf = fin(shp([[0, -0.1], [0.35, -0.35], [0.55, -0.55], [0.35, 0], [0.8, 0.95], [0.3, 0.4], [0, 0.1]]), finC, edge, 0.04); tf.rotation.y = -Math.PI / 2; tail.add(tf);
  root.userData = { rig, tail, t: Math.random() * 10 };
  return root;
}
export function animateWhaleShark(w, dt) {
  const u = w.userData; u.t += dt * 1.4;
  u.tail.rotation.y = Math.sin(u.t) * 0.35; u.rig.rotation.y = -Math.sin(u.t) * 0.04; u.rig.position.y = Math.sin(u.t * 0.5) * 0.08;
}

// =====================================================================
// HAMMERHEAD — foe: crosses the lane. T-shaped head with eyes on the tips and grumpy brows.
// =====================================================================
export function makeHammerhead() {
  const root = new THREE.Group(); const rig = new THREE.Group(); root.add(rig);
  const edge = '#2A2E40';
  const geo = latheBody(t => Math.sin(Math.PI * Math.pow(t, 0.72)) * (0.5 - 0.12 * t) + 0.02, -1.45, 1.0, 1.0, 0.95, 28);
  const top = new THREE.Color('#8C98AE'), belly = new THREE.Color('#F2F4F8');
  paintGradient(geo, '#fff', '#fff', 'y', 0, 1, (c, i, p) => c.copy(top).lerp(belly, THREE.MathUtils.smoothstep(-p.getY(i), 0.0, 0.14)));
  rig.add(outline(new THREE.Mesh(geo, toon('#ffffff', { vertexColors: true })), 0.04, edge));
  // the hammer
  let hg = new THREE.CapsuleGeometry(0.17, 1.05, 6, 14); hg.rotateZ(Math.PI / 2); hg.scale(1, 0.5, 1.25);
  const hp = hg.attributes.position; for (let i = 0; i < hp.count; i++) { const x = hp.getX(i); hp.setZ(i, hp.getZ(i) + x * x * 0.12); } hg.computeVertexNormals();
  const top2 = new THREE.Color('#8C98AE');
  paintGradient(hg, '#fff', '#fff', 'y', 0, 1, (c, i, p) => c.copy(top2).lerp(belly, THREE.MathUtils.smoothstep(-p.getY(i), 0.0, 0.05)));
  const hammer = outline(new THREE.Mesh(hg, toon('#ffffff', { vertexColors: true })), 0.035, edge); hammer.position.set(0, 0.04, -1.1); rig.add(hammer);
  for (const sx of [-1, 1]) {
    const e = placeEye(makeEye(0.12, edge), V(sx * 0.72, 0.1, -1.04), V(sx, 0.25, -0.45).normalize()); rig.add(e);
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.16, 4, 8), basic(edge)); brow.position.set(sx * 0.7, 0.27, -1.08); brow.rotation.set(0, 0, Math.PI / 2 + sx * 0.45); rig.add(brow);
    for (let k = 0; k < 4; k++) { const gl = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.16, 2, 4), basic('#5A6278')); gl.position.set(sx * 0.42, 0.0, -0.62 + k * 0.08); rig.add(gl); }
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.022, 6, 18, Math.PI), basic(edge)); mouth.position.set(0, -0.12, -1.3); mouth.rotation.set(-0.5, 0, 0); rig.add(mouth);
  const teeth = new THREE.Group(); for (let i = 0; i < 4; i++) { const tth = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.05, 5), basic('#ffffff')); tth.position.set(-0.08 + i * 0.053, -0.03, 0); tth.rotation.z = Math.PI; teeth.add(tth); } teeth.position.set(0, -0.0, -1.3); rig.add(teeth);
  const finC = '#7E8AA2';
  const dor = fin(shp([[-0.3, 0], [-0.05, 0.3], [0.2, 0.95], [0.18, 0.3], [0.35, 0]]), finC, edge); dor.rotation.y = Math.PI / 2; dor.position.set(0, 0.42, -0.15); rig.add(dor);
  for (const sx of [-1, 1]) { const f = fin(shp([[0, -0.15], [0.45, -0.25], [0.65, -0.5], [0.35, 0.05], [0, 0.15]]), finC, edge); f.position.set(sx * 0.42, -0.24, -0.45); f.rotation.set(-0.3, sx > 0 ? -0.5 : Math.PI + 0.5, sx * -0.4); rig.add(f); }
  const tail = new THREE.Group(); tail.position.z = 1.02; rig.add(tail);
  const tf = fin(shp([[0, -0.06], [0.2, -0.2], [0.35, -0.35], [0.25, 0], [0.9, 0.8], [0.3, 0.25], [0, 0.06]]), finC, edge, 0.035); tf.rotation.y = -Math.PI / 2; tail.add(tf);
  const body = rig.children[0];
  root.userData = { rig, tail, hammer, body, t: Math.random() * 10 };
  return root;
}
export function animateHammerhead(h, dt) {
  const u = h.userData; u.t += dt * 6;
  u.tail.rotation.y = Math.sin(u.t) * 0.5; u.rig.rotation.y = -Math.sin(u.t) * 0.08; u.hammer.rotation.y = Math.sin(u.t + 0.5) * 0.06;
}

// =====================================================================
// SEA SNAKE (banded sea krait) — foe: slithers across near the floor. Instanced segments, wavy swim, paddle tail.
// =====================================================================
const SNAKE_N = 30;
export function makeSeaSnake() {
  const root = new THREE.Group(); const rig = new THREE.Group(); root.add(rig);
  const edge = '#1A1A2E';
  const segG = new THREE.SphereGeometry(1, 14, 10);
  const bodyM = new THREE.InstancedMesh(segG, toon('#ffffff'), SNAKE_N), hullM = new THREE.InstancedMesh(segG, new THREE.MeshBasicMaterial({ color: edge, side: THREE.BackSide }), SNAKE_N);
  const blue = new THREE.Color('#A8DCFF'), black = new THREE.Color('#1E2236');
  for (let i = 0; i < SNAKE_N; i++) bodyM.setColorAt(i, (Math.floor(i / 2) % 2 === 0 ? blue : black));
  bodyM.instanceColor.needsUpdate = true; bodyM.frustumCulled = hullM.frustumCulled = false;
  rig.add(hullM, bodyM);
  // head: yellow-tipped snout, black band, cute eyes
  const head = new THREE.Group(); rig.add(head);
  let hgeo = new THREE.SphereGeometry(0.13, 20, 14); hgeo.scale(1, 0.8, 1.35);
  paintGradient(hgeo, '#fff', '#fff', 'z', 0, 1, (c, i, p) => c.set(p.getZ(i) < -0.09 ? '#FFE27A' : p.getZ(i) < 0.0 ? '#A8DCFF' : '#1E2236'));
  head.add(outline(new THREE.Mesh(hgeo, toon('#ffffff', { vertexColors: true })), 0.018, edge));
  for (const sx of [-1, 1]) head.add(placeEye(makeEye(0.05, edge), V(sx * 0.09, 0.05, -0.07), V(sx, 0.3, -0.6).normalize()));
  const tongue = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.08, 2, 4), basic('#FF4A6A')); tongue.rotation.x = Math.PI / 2; tongue.position.set(0, -0.03, -0.22); head.add(tongue);
  // flat paddle tail
  const tail = new THREE.Group(); rig.add(tail);
  const tg = new THREE.SphereGeometry(0.1, 12, 8); tg.scale(0.25, 1, 1.2);
  tail.add(outline(new THREE.Mesh(tg, toon('#1E2236')), 0.012, edge));
  root.userData = { rig, bodyM, hullM, head, tail, tongue, t: Math.random() * 10 };
  animateSeaSnake(root, 0);
  return root;
}
const _sm = new THREE.Matrix4(), _sq = new THREE.Quaternion(), _sv = new THREE.Vector3(), _ss = new THREE.Vector3(), _hm = new THREE.Matrix4();
export function animateSeaSnake(sn, dt) {
  const u = sn.userData; u.t += dt;
  const gap = 0.085, sp = 5.5;
  const pos = (i) => { const z = -0.15 + i * gap; const amp = 0.05 + 0.22 * Math.min(1, i / 10); return V(Math.sin(u.t * sp - i * 0.42) * amp, Math.sin(u.t * 1.3 - i * 0.2) * 0.03, z); };
  for (let i = 0; i < SNAKE_N; i++) {
    const p = pos(i), r = 0.1 * (1 - Math.max(0, (i - SNAKE_N * 0.6) / (SNAKE_N * 0.4)) * 0.55);
    _sm.compose(p, _sq.identity(), _ss.set(r, r * 0.92, r * 1.15)); u.bodyM.setMatrixAt(i, _sm);
    _hm.compose(p, _sq, _ss.multiplyScalar(1.0).addScalar(0.018)); u.hullM.setMatrixAt(i, _hm);
  }
  u.bodyM.instanceMatrix.needsUpdate = u.hullM.instanceMatrix.needsUpdate = true;
  const h0 = pos(-1.5), h1 = pos(0);
  u.head.position.copy(h0); u.head.rotation.y = Math.atan2(-(h1.x - h0.x), (h1.z - h0.z)) * 0.6;
  const tA = pos(SNAKE_N - 1), tB = pos(SNAKE_N - 3);
  u.tail.position.copy(tA).add(V(0, 0, 0.1)); u.tail.rotation.y = Math.atan2(tA.x - tB.x, tA.z - tB.z);
  u.tongue.scale.y = Math.sin(u.t * 9) > 0.6 ? 1 : 0.01;
}

// =====================================================================
// SHRIMP — cleaner / peppermint shrimp: curled striped body, huge eyes, waving white antennae
// =====================================================================
const SHRIMP = [['#FF3B3B', '#FFFFFF', '#FFE0A0'], ['#FF6A2A', '#FFFFFF', '#FFE0A0'], ['#FFB8C8', '#E8203A', '#FFFFFF'], ['#FFD24A', '#7A3AE8', '#FFFFFF']];
export function makeShrimp(pal = 0) {
  const [B, S, L] = SHRIMP[pal % SHRIMP.length];
  const root = new THREE.Group(); const rig = new THREE.Group(); root.add(rig);
  const edge = '#4A1A1A';
  const cB = new THREE.Color(B), cS = new THREE.Color(S);
  const segs = [];
  // curved body: head/carapace at -z, abdomen arcs down to the tail
  const N = 6;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), r = 0.085 * (1 - t * 0.45) * (i === 0 ? 1.25 : 1);
    let g = new THREE.SphereGeometry(r, 16, 12); g.scale(0.9, 0.9, i === 0 ? 1.6 : 1.15);
    paintGradient(g, '#fff', '#fff', 'y', 0, 1, (c, k, p) => { c.copy(cB); if (p.getY(k) > r * 0.55 && Math.abs(p.getX(k)) < r * 0.35) c.copy(cS); if (pal === 2 && Math.abs(Math.sin(p.getZ(k) * 60)) > 0.85) c.copy(cS); });
    const m = outline(new THREE.Mesh(g, toon('#ffffff', { vertexColors: true })), 0.012, edge);
    const a = t * 1.5; m.position.set(0, 0.18 - (1 - Math.cos(a)) * 0.22, -0.12 + Math.sin(a) * 0.3); m.rotation.x = a * 0.8;
    rig.add(m); segs.push(m);
  }
  // tail fan
  const fan = new THREE.Group(); const last = segs[N - 1]; fan.position.copy(last.position).add(V(0, -0.05, 0.03)); fan.rotation.x = 1.6; rig.add(fan);
  const _o = new THREE.Object3D(), bake1 = (g) => { _o.updateMatrix(); return g.applyMatrix4(_o.matrix); };
  const fanG = [-0.55, 0, 0.55].map(a => { _o.position.set(Math.sin(a) * 0.05, -Math.cos(a) * 0.05 - 0.02, 0); _o.rotation.set(0, 0, a); _o.scale.set(0.55, 1, 1); return bake1(new THREE.CircleGeometry(0.06, 12)); });
  fan.add(new THREE.Mesh(mergeGeometries(fanG), toon(S, { side: THREE.DoubleSide })));
  // legs (one merged mesh)
  const legG = []; _o.scale.set(1, 1, 1);
  for (let k = 0; k < 4; k++) for (const sx of [-1, 1]) { _o.position.set(sx * 0.05, 0.06, -0.18 + k * 0.07); _o.rotation.set(0.2, 0, sx * 0.5); legG.push(bake1(new THREE.CapsuleGeometry(0.008, 0.14, 2, 4))); }
  rig.add(new THREE.Mesh(mergeGeometries(legG), toon(L)));
  // big eyes on short stalks
  for (const sx of [-1, 1]) { const e = placeEye(makeEye(0.045, edge), V(sx * 0.07, 0.25, -0.27), V(sx * 0.6, 0.3, -1).normalize()); rig.add(e); }
  // long white antennae (they wave)
  const ant = [];
  for (const [sx, len, up] of [[-1, 0.9, 0.35], [1, 0.9, 0.35], [-1, 0.45, 0.15], [1, 0.45, 0.15]]) {
    const piv = new THREE.Group(); piv.position.set(sx * 0.03, 0.22, -0.3); rig.add(piv);
    const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(V(sx * t * len * 0.35, Math.sin(t * Math.PI * 0.8) * up, -t * len * 0.6)); }
    piv.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.007, 4), basic('#FFFFFF')));
    ant.push({ piv, sx, ph: Math.random() * 6 });
  }
  root.userData = { rig, ant, fan, t: Math.random() * 10, hop: 0, nextHop: 1 + Math.random() * 3 };
  return root;
}
export function animateShrimp(s, dt) {
  const u = s.userData; u.t += dt;
  u.ant.forEach(a => { a.piv.rotation.y = a.sx * 0.15 + Math.sin(u.t * 3 + a.ph) * 0.25; a.piv.rotation.x = Math.sin(u.t * 2.2 + a.ph) * 0.15; });
  u.nextHop -= dt; if (u.nextHop < 0) { u.hop = 1; u.nextHop = 1.5 + Math.random() * 3; }
  u.hop = Math.max(0, u.hop - dt * 2.5);
  u.rig.position.y = Math.sin(u.hop * Math.PI) * 0.12 + Math.sin(u.t * 2) * 0.01;
  u.fan.rotation.x = 1.6 - u.hop * 0.8;
}
