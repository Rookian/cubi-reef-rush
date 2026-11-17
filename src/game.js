import * as THREE from 'three';
import * as M from './models.js';
import * as RF from './reef.js';
import * as CR from './critters.js';
import * as F3 from './fish3d.js';
import * as C3 from './critters3d.js';
import { setLite } from './polyps.js';
import * as K from './corals3d.js';
import * as SK from './softcorals3d.js';
import * as RS from './reefscape.js';
setLite(true);   // game-weight corals (the review page keeps full detail)
import { glowAll, glowU } from './materials.js';
import { sound } from './audio.js';
import * as LB from './leaderboard.js';
import * as CM from './community.js';
import { langSwitch, LANG_CSS, onLangChange } from './i18n.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { makeRenderer, setupScene, makeFloor, rayTexture, causticClock } from './env.js';
import { STARTER_LEVELS, normalizeLevel, countPearls, loadCustom, LANE, HAZARDS } from './levels.js';

// ------------------------------------------------------------------ setup
const canvas = document.getElementById('c');
const renderer = makeRenderer(canvas, matchMedia("(pointer: coarse)").matches ? 1.25 : 1.5);
const { scene, sun } = setupScene(renderer, { fogNear: 13, fogFar: 46 });   // less haze close up so near corals keep their colour
const { floor, sand, caus } = makeFloor();
// ---- living terrain: the path curves left/right and rolls up/down; ground is sand or rocky reef ----
const TER = { W: 84, L: 72, NX: 56, NZ: 72, z0: 4 };
const terGeo = new THREE.PlaneGeometry(TER.W, TER.L, TER.NX, TER.NZ); terGeo.rotateX(-Math.PI / 2); terGeo.translate(0, 0, TER.z0 - TER.L / 2);
terGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(terGeo.attributes.position.count * 3).fill(1), 3));
const terBase = terGeo.attributes.position.array.slice();
floor.material.vertexColors = true; floor.material.needsUpdate = true;
sand.repeat.set(TER.W / 6, TER.L / 6); caus.repeat.set(TER.W / 2.727, TER.L / 2.727);
const terrain = new THREE.Mesh(terGeo, floor.material); terrain.receiveShadow = true; scene.add(terrain);
let PATH = { a: 0, b: 1, c: 2, e: 3 };
const relXRaw = (d) => 7.0 * Math.sin(d * 0.018 + PATH.a) + 3.0 * Math.sin(d * 0.043 + PATH.b);
const relYRaw = (d) => 4.2 * Math.sin(d * 0.028 + PATH.c) + 1.8 * Math.sin(d * 0.063 + PATH.e);   // clear hills and dips
let curD = 0, baseX = 0, baseY = 0;
const relX = (d) => relXRaw(d) - baseX, relY = (d) => relYRaw(d) - baseY;
// zone shape parameters sampled per distance: canyon walls, cliff side, rocky floor
function shapeAt(d) {
  const out = { canyon: 0, cliff: 0, rocky: 0, narrow: 0, side: 1 };
  for (const k of [-7, 0, 7]) { const Z = (mode === 'menu' || mode === 'splash') ? { type: 'garden', side: 1 } : zoneAt(d + k);
    if (Z.type === 'canyon') out.canyon += 1 / 3; if (Z.type === 'narrows') out.narrow += 1 / 3; if (Z.type === 'cliff') { out.cliff += 1 / 3; out.side = Z.side; }
    if (Z.type === 'canyon' || Z.type === 'narrows' || Z.type === 'cliff' || Z.type === 'arches' || Z.type === 'reefbed') out.rocky += 1 / 3; }
  return out;
}
function bankH(xl, d, S) {
  const ax = Math.abs(xl) + 0.9;   // walls hug the narrower lane
  let h = 0.5 * Math.pow(Math.max(0, ax - 9) / 6, 2) * 3;                                    // gentle rise at the far sides everywhere
  if (S.canyon) h += S.canyon * 4.4 * Math.pow(THREE.MathUtils.clamp((ax - 4.3) / 7.5, 0, 1), 2.0) + S.canyon * 0.6 * Math.max(0, ax - 11.8);
  if (S.narrow) h += S.narrow * 7.5 * Math.pow(THREE.MathUtils.clamp((ax - 3.9) / 3.2, 0, 1), 1.4) + S.narrow * 1.2 * Math.max(0, ax - 7.1);   // tight gorge
  if (S.cliff && xl * S.side > 0) h += S.cliff * 6.5 * Math.pow(THREE.MathUtils.clamp((ax - 4.6) / 6, 0, 1), 1.6);
  h += (0.25 + S.rocky * 0.35) * Math.sin(xl * 0.9 + d * 0.21) * Math.sin(d * 0.13 - xl * 0.4) * THREE.MathUtils.clamp((ax - 3.6) / 3, 0, 1); // dunes / boulders outside the lane
  h += S.rocky * 0.12 * Math.sin(xl * 2.3 + d * 0.7) * Math.sin(d * 0.9);                   // rocky texture under the lane
  return h;
}
function groundAt(xl, d) { return relY(d) + bankH(xl, d, shapeAt(d)); }
const C_SAND = new THREE.Color(1, 1, 1), C_ROCK = new THREE.Color('#B8A8F0'), C_CRUST = new THREE.Color('#FFB8F4'), C_CRUST2 = new THREE.Color('#C0FFF4'), _tc = new THREE.Color();
function updateTerrain() {
  const p = terGeo.attributes.position.array, col = terGeo.attributes.color.array;
  const NX = TER.NX + 1;
  for (let j = 0; j <= TER.NZ; j++) {
    const z = terBase[(j * NX) * 3 + 2], d = curD - z;
    const S = shapeAt(d), rx = relX(d), ry = relY(d);
    for (let i = 0; i < NX; i++) {
      const k = (j * NX + i) * 3, X = terBase[k], xl = X - rx;
      const h = ry + bankH(xl, d, S);
      p[k + 1] = h;
      const rockiness = Math.min(1, S.rocky * 1.2 + THREE.MathUtils.smoothstep(h - ry, 0.6, 1.6));
      const n = Math.sin(xl * 1.7 + d * 0.31) * Math.sin(d * 0.23 - xl * 0.8);
      _tc.copy(C_ROCK).multiplyScalar(0.9 + n * 0.1);
      _tc.lerp(C_SAND, 1 - rockiness);
      col[k] = _tc.r; col[k + 1] = _tc.g; col[k + 2] = _tc.b;
    }
  }
  terGeo.attributes.position.needsUpdate = true; terGeo.attributes.color.needsUpdate = true; terGeo.computeVertexNormals();
}
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 300);
const $ = (id) => document.getElementById(id);
const SPAWN_AHEAD = 42;

// light shafts + shimmering surface
const rayTex = rayTexture();
const rays = new THREE.Group(); scene.add(rays);
rays.position.set(0, 13, -38);
for (let i = 0; i < 14; i++) {
  const geo = new THREE.PlaneGeometry(1.2 + Math.random() * 2.4, 44); geo.translate(0, -22, 0);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: rayTex, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  m.rotation.set(0, (Math.random() - 0.5) * 1.2, -0.75 + (i / 13) * 1.5 + (Math.random() - 0.5) * 0.1);
  m.userData.ph = Math.random() * 6; m.userData.rz = m.rotation.z; rays.add(m);
}
const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: M.glowTexture(), color: '#FFFBE0', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
sunGlow.scale.set(26, 14, 1); sunGlow.position.set(0, 0.5, 0); rays.add(sunGlow);
// cartoon water surface seen from below: rolling waves + flowing toon caustic lines
const surfMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide,
  uniforms: { uTime: { value: 0 }, uOff: { value: 0 }, uCam: { value: new THREE.Vector3() } },
  vertexShader: `
    uniform float uTime; uniform float uOff;
    varying vec2 vP; varying float vH; varying vec3 vW;
    float waves(vec2 p){
      return 0.35 * sin(p.x * 0.35 + uTime * 0.9) * cos(p.y * 0.28 + uTime * 0.7)
           + 0.22 * sin((p.x + p.y) * 0.55 - uTime * 1.3)
           + 0.12 * sin(p.x * 1.1 - p.y * 0.8 + uTime * 1.7);
    }
    void main(){
      vec3 pos = position;
      vec2 wp = vec2(pos.x, pos.y + uOff);           // plane is rotated, local y = world -z
      float h = waves(wp);
      pos.z += h;                                     // local z = world -y (down toward the reef)
      vP = wp; vH = h;
      vec4 w = modelMatrix * vec4(pos, 1.0); vW = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
  fragmentShader: `
    uniform float uTime; uniform vec3 uCam;
    varying vec2 vP; varying float vH; varying vec3 vW;
    vec2 hash2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
    // animated cell edges = cartoon caustic web
    float web(vec2 p, float t){
      vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
      for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
        vec2 g = vec2(float(x), float(y)); vec2 o = hash2(i + g);
        o = 0.5 + 0.42 * sin(t + 6.2831 * o);
        float d = length(g + o - f);
        if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
      }
      return d2 - d1;
    }
    void main(){
      vec2 p = vP * 0.32;
      p += 0.35 * vec2(sin(p.y * 1.3 + uTime * 0.6), cos(p.x * 1.1 + uTime * 0.5)); // flowing warp
      float e1 = web(p, uTime * 0.8);
      float e2 = web(p * 1.9 + 3.7, uTime * 1.1);
      float line1 = 1.0 - smoothstep(0.045, 0.085, e1);     // bold bright lines
      float line2 = 1.0 - smoothstep(0.03, 0.06, e2);       // thin secondary lines
      float crest = smoothstep(0.18, 0.26, vH);              // toon band on wave crests
      vec3 base = mix(vec3(0.42, 0.86, 0.97), vec3(0.70, 0.96, 1.0), crest);
      vec3 col = mix(base, vec3(1.0), max(line1, line2 * 0.7));
      float dist = length(vW - uCam);
      float fade = 1.0 - smoothstep(22.0, 58.0, dist);
      float a = (0.42 + crest * 0.12 + line1 * 0.45 + line2 * 0.22) * fade;
      gl_FragColor = vec4(col, a);
    }`,
});
const surface = new THREE.Mesh(new THREE.PlaneGeometry(140, 140, 140, 140), surfMat);
surface.rotation.x = Math.PI / 2; surface.position.set(0, 12, -30); scene.add(surface);

// little "blub" bubbles from Cubi's mouth
const blubGeo = new THREE.SphereGeometry(1, 12, 8);
const blubMat = new THREE.MeshBasicMaterial({ color: '#E8FBFF', transparent: true, opacity: 0.8 });
const blubRing = new THREE.MeshBasicMaterial({ color: '#5FB8D8', side: THREE.BackSide });
const blubs = [];
for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(blubGeo, blubMat); const r = new THREE.Mesh(blubGeo, blubRing); r.scale.setScalar(1.18); m.add(r); m.visible = false; scene.add(m); blubs.push({ m, life: 0, vx: 0 }); }
let blubNext = 0;
function emitPartyBubble(x, y, z) {
  const b = blubs.find(q => q.life <= 0) || blubs[blubNext++ % blubs.length];
  b.m.visible = true; b.party = true; b.life = 9; b.vx = Math.random(); b.nudges = 0; b.maxN = 2 + Math.floor(Math.random() * 3);
  b.pv = (b.pv || new THREE.Vector3()).set((Math.random() - 0.5) * 0.4, 0.5, 0.15); b.r = 0.1 + Math.random() * 0.04;
  b.m.position.set(x, y, z); b.m.scale.setScalar(b.r);
}
function emitBlubAt(x, y, z) { for (let k = 0; k < 2; k++) { const b = blubs[blubNext++ % blubs.length]; b.m.visible = true; b.life = 1.3; b.vx = (Math.random() - 0.5) * 0.3; b.m.position.set(x + (Math.random() - 0.5) * 0.15, y + k * 0.12, z); b.m.scale.setScalar(0.06 + Math.random() * 0.03); } }
function emitBlub(n = 1) {
  if (window.__noBlub) return;
  const head = new THREE.Vector3(0, -0.12, -0.62).applyMatrix4(cubi.matrixWorld);
  for (let k = 0; k < n; k++) {
    const b = blubs[blubNext++ % blubs.length];
    b.m.visible = true; b.life = 1.4; b.vx = (Math.random() - 0.5) * 0.4;
    b.m.position.copy(head).add(new THREE.Vector3((Math.random() - 0.5) * 0.15, k * 0.12, 0));
    b.m.scale.setScalar(0.05 + Math.random() * 0.035);
  }
}

// celebration: clownfish friend + floating hearts
const heartShape = new THREE.Shape();
heartShape.moveTo(0, -0.5); heartShape.bezierCurveTo(-0.9, 0.05, -0.55, 0.85, 0, 0.4); heartShape.bezierCurveTo(0.55, 0.85, 0.9, 0.05, 0, -0.5);
const heartGeo = new THREE.ExtrudeGeometry(heartShape, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 3, curveSegments: 12 }).center();
const hearts = [];
for (let i = 0; i < 12; i++) {
  const m = new THREE.Mesh(heartGeo, new THREE.MeshToonMaterial({ color: i % 3 ? '#FF6F9F' : '#FF9BC0', emissive: new THREE.Color(i % 3 ? '#B0305A' : '#C06080') }));
  const o = new THREE.Mesh(heartGeo, new THREE.MeshBasicMaterial({ color: '#7A1F3D', side: THREE.BackSide })); o.scale.setScalar(1.12); m.add(o);
  m.visible = false; scene.add(m); hearts.push({ m, life: 0, vx: 0 });
}
let heartNext = 0;
function popHeart(x, y, z, big = 1) { const h = hearts[heartNext++ % hearts.length]; h.m.visible = true; h.life = 1.6; h.vx = (Math.random() - 0.5) * 0.5; h.m.position.set(x, y, z); h.m.userData.s = (0.13 + Math.random() * 0.05) * big; h.m.scale.setScalar(0.01); }
let party = null;   // { clown, t, own }
function startParty() {
  let clown, own = false;
  if (buddy) { clown = buddy; buddy = null; }
  else { clown = M.makeClown(); scene.add(clown); own = true; clown.position.set(P.x + 4.5, P.y + 0.6, 0.3); }
  clown.scale.setScalar(1.15);
  party = { clown, t: 0, own, lastHeart: 0 };
}
function endParty() { blubs.forEach(b => { if (b.party) { b.party = false; b.life = 0; b.m.visible = false; } }); if (party) { scene.remove(party.clown); party = null; } hearts.forEach(h => { h.life = 0; h.m.visible = false; }); }
const angLerp = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

// marine snow
const SNOW = 400;
const snowGeo = new THREE.BufferGeometry();
const snowPos = new Float32Array(SNOW * 3);
for (let i = 0; i < SNOW; i++) { snowPos[i * 3] = (Math.random() - 0.5) * 30; snowPos[i * 3 + 1] = Math.random() * 10; snowPos[i * 3 + 2] = -60 + Math.random() * 66; }
snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
scene.add(new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: '#E6FBFF', size: 0.06, transparent: true, opacity: 0.75, depthWrite: false })));

// sand details, sparkly plankton, soft bubbles in front of the camera
const ground = RF.makeGroundScatter(); scene.add(ground);
const glitter = RF.makeGlitter(); scene.add(glitter);
const bokeh = RF.makeBokeh(); scene.add(bokeh);

// ------------------------------------------------------------------ player
const cubi = M.makeCubi(); scene.add(cubi);
const bodyMat = cubi.userData.bodyMat;
const P = { x: 0, y: 2.4, vx: 0, vy: 0, tx: 0, ty: 2.4 };
const LANE_K = 2.5 / 3.4;   // the swim lane is 5 m wide; level designs (±3.4) are scaled into it
const B = { minX: -2.5, maxX: 2.5, minY: 0.8, maxY: 4.4, r: 0.46 };
// scenery placed for the old wide lane: lane-floor bits squeeze with the lane, everything beyond the edge moves in by the same 0.9 m
const mapX = (x) => Math.abs(x) < 3.4 ? x * LANE_K : Math.sign(x) * (Math.abs(x) - 0.9);
let decorMap = false;
let buddy = null;
const stars = new THREE.Group(); scene.add(stars); stars.visible = false;
for (let i = 0; i < 3; i++) stars.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), new THREE.MeshToonMaterial({ color: '#FFE14D', emissive: new THREE.Color('#996600') })));

// toxin cloud (pooled puffs)
const toxin = { cd: 0, CD: 5, puffs: [] };
const puffGeo = new THREE.SphereGeometry(1, 16, 12);
for (let i = 0; i < 16; i++) {
  const m = new THREE.Mesh(puffGeo, new THREE.MeshToonMaterial({ color: i % 3 ? '#B07CFF' : '#7FE08A', transparent: true, opacity: 0, depthWrite: false, gradientMap: null }));
  m.visible = false; scene.add(m); toxin.puffs.push({ m, life: 0, v: new THREE.Vector3() });
}

// ------------------------------------------------------------------ world objects
const objs = [];
const pools = {};
const C = M.COR;
const KINDS = {
  branch: { make: () => coral(SK.makeTreeCoral, SK.animateTree, 1.25), shape: s => [pillar(0.55 * s, 1.75 * s)] },
  stag: { make: () => coral(K.makeStaghorn, K.animatePF, 1.75, 0.72), shape: s => [pillar(0.6 * s, 1.85 * s)] },
  tube: { make: () => coral(K.makeFireCoral, K.animatePF, 1.7), shape: s => [pillar(0.55 * s, 1.4 * s)] },
  brain: { make: () => coral(K.makeBrain, K.animWorms, 1.15), shape: s => [pillar(0.75 * s, 0.55 * s)] },
  bubble: { make: () => coral(K.makeBubble, K.animateBubble, 1.3), shape: s => [pillar(0.55 * s, 0.95 * s)] },
  // reviewed Komodo corals as scenery
  treec: { make: () => coral(SK.makeTreeCoral, SK.animateTree, 1.25), shape: () => [] },
  table: { make: () => coral(K.makeTable, K.animatePF, 1.3), shape: () => [] },
  cauli: { make: () => coral(K.makeCauliflower, K.animatePF, 1.5), shape: () => [] },
  scroll: { make: () => coral(K.makeScroll, K.animatePF, 1.4), shape: () => [] },
  purplec: { make: () => coral(K.makePurplePore, K.animatePF, 1.35), shape: () => [] },
  cupc: { make: () => coral(K.makeCupCoral, K.animateCup, 1.5), shape: () => [] },
  finger: { make: () => coral(K.makeFinger, K.animWorms, 1.35), shape: () => [] },
  leather: { make: () => coral(SK.makeLeather, SK.animateLeather, 1.4), shape: () => [] },
  xenia: { make: () => coral(SK.makeXenia, SK.animateXenia, 2.0), shape: () => [] },
  whips: { make: () => coral(SK.makeWhips, SK.animateWhips, 1.6), shape: () => [] },
  btanem: { make: () => coral(SK.makeBubbleTip, SK.animateBubbleTip, 1.5), shape: () => [] },
  fan: { make: () => M.makeSeaFan(pick([C.purple, C.pink, C.red])), shape: s => [pillar(0.8 * s, 2.0 * s)] },
  rock: { make: () => M.makeRock(1, ri(1, 20)), shape: s => [sph(0.25 * s, 0.85 * s)] },
  sponge: { make: () => M.makeSponge(pick([C.purple, C.orange, C.pink, C.yellow])), shape: () => [] },
  mushroom: { make: () => coral(K.makeMushroom, K.animatePF, 0.75), shape: () => [] },
  clam: { make: () => pick([() => M.makeClam(), () => M.makeClam('#5FD3C8', '#D4FFF8', '#13504B'), () => M.makeClam('#FF9A6B', '#FFE0D0', '#7A2E14')])(), shape: () => [] },
  arch: { make: () => M.makeArch(1, ri(1, 9)), shape: () => [] },
  vent: { make: () => M.makeVent(), shape: () => [] },
  turtle: { make: () => wrapC(C3.makeSeaTurtle(Math.random() < 0.5 ? 'green' : 'hawksbill'), C3.animateSeaTurtle), shape: () => [] },
  school: { make: () => { const g = F3.makeSchool3D(); M.animateSchool(g, 0.016); return g; }, shape: () => [] },
  wall: { make: () => RS.makeCoralWall(ri(1, 999), false), shape: () => [] },
  mound: { make: () => RS.makeOutcrop(ri(1, 9999), 1), shape: () => [] },
  bank: { make: () => RF.makeBank(ri(1, 9999)), shape: () => [] },
  kelp: { make: () => M.makeSeaweed(pick(['#2FB070', '#3FC27F', '#5AD08A']), rf(2.2, 3.4)), shape: () => [] },
  patch: { make: () => RS.makeOutcrop(ri(1, 9999), 0.5, 'carpet'), shape: () => [] },
  whaleshark: { make: () => CR.makeWhaleShark(), shape: () => [] },
  hammer: { make: () => shark3D('Blacktip reef shark'), shape: () => [] },
  blacktip: { make: () => shark3D('Blacktip reef shark'), shape: () => [] },
  whitetip: { make: () => shark3D('Whitetip reef shark'), shape: () => [] },
  stingray: { make: () => wrap3D('Bluespotted stingray', 1.0, 0.05), shape: () => [] },
  scorpion: { make: () => wrap3D('Scorpionfish', 0.75, 0.3), shape: () => [] },
  croco: { make: () => wrap3D('Crocodilefish', 1.2, 0.1), shape: () => [] },
  flounder: { make: () => wrap3D('Peacock flounder', 0.8, 0.04), shape: () => [] },
  snakeeel: { make: () => wrap3D('Banded snake eel', 1.1, 0.07), shape: () => [] },
  catshark: { make: () => wrap3D('Coral catshark', 1.1, 0.12), shape: () => [] },
  lionfish: { make: () => wrap3D('Lionfish', 0.85), shape: () => [] },
  dolphin: { make: () => wrap3D('Dolphin', 2.3), shape: () => [] },
  squid: { make: () => wrap3D('Bigfin reef squid', 0.7), shape: () => [] },
  gorgonian: { make: () => CR.makeGorgonian(ri(0, 9)), shape: () => [] },
  rubble: { make: () => CR.makeRubble(ri(0, 99)), shape: () => [] },
  seasnake: { make: () => CR.makeSeaSnake(), shape: () => [] },
  babyturtle: { make: () => M.makeTurtle(true), shape: () => [] },
  debris: { make: () => RF.makeDebris(ri(0, 89)), shape: () => [] },
  seagrass: { make: () => RF.makeSeagrass(ri(0, 50), rf(1.1, 1.8), ri(110, 170)), shape: () => [] },
  grazer: { make: () => CR.makeGrazer(ri(0, 7)), shape: () => [] },
  shrimp: { make: () => wrapC(C3.makeCoralShrimp(), C3.animateCoralShrimp, 0.42, 0, 25), shape: () => [] },
  octopus: { make: () => wrapC(C3.makeOctopus(), C3.animateOctopus, 0.8, 0, 28), shape: () => [] },
  featherstar: { make: () => wrapC(C3.makeFeatherStar(ri(0, 2)), C3.animateFeatherStar, 0.9, 0, 22), shape: () => [] },
  bloodstar: { make: () => wrapC(C3.makeBloodStar(), C3.animateBloodStar, 0.75, 0, 22), shape: () => [] },
  magnifica: { make: () => anemK(RF.makeMagnifica(ri(0, 3), rf(1.5, 2.0))), shape: () => [] },
  gigantea: { make: () => anemK(RF.makeGigantea(ri(0, 3), rf(1.6, 2.1))), shape: () => [] },
  mertensii: { make: () => anemK(RF.makeMertensii(ri(0, 3), rf(1.4, 1.8))), shape: () => [] },
  heroanem: { make: () => RF.makeFluffyAnemone(ri(0, 99), rf(1.8, 2.3)), shape: () => [] },
  moundbig: { make: () => RS.makeOutcrop(ri(1, 9999), 1.5), shape: () => [] },
  pinnacle: { make: () => RS.makePinnacle(ri(1, 9999)), shape: () => [] },
  // set pieces (segments; shapes come with the spawn options)
  ridge: { make: () => RS.makeRidgeSeg(ri(1, 9999)), shape: () => [] },
  ridgeEnd: { make: () => RS.makeRidgeSeg(ri(1, 9999), true), shape: () => [] },
  slab: { make: () => RS.makeSlabSeg(ri(1, 9999), 2.0, 3.0), shape: () => [] },
  shelfL: { make: () => RS.makeSlabSeg(ri(1, 9999), 1.9, 3.1, -3.6, 0.2), shape: () => [] },
  shelfR: { make: () => RS.makeSlabSeg(ri(1, 9999), 1.9, 3.1, -0.2, 3.6), shape: () => [] },
  tunnel: { make: () => RS.makeTunnelSeg(ri(1, 9999)), shape: () => [] },
  tunnelMouth: { make: () => RS.makeTunnelSeg(ri(1, 9999), true), shape: () => [] },
  hump: { make: () => RS.makeSlabSeg(ri(1, 9999), -0.3, 1.65, -1.4, 1.4), shape: () => [] },
  roof: { make: () => RS.makeSlabSeg(ri(1, 9999), 2.9, 5.6, -3.6, 3.6), shape: () => [] },
  wallfar: { make: () => RS.makeCoralWall(ri(1, 999), true), shape: () => [] },
  crab: { make: () => RF.makeCrab(pick(['#FF6B4A', '#FF8A3D', '#FF5C7A'])), shape: () => [] },
  seahorse: { make: () => pick([() => RF.makeSeahorse(), () => RF.makeSeahorse('#FF7FB8', '#FFD0EA'), () => RF.makeSeahorse('#9B6BE8', '#E2D4FF')])(), shape: () => [] },
  manta: { make: () => wrap3D('Manta ray', 2.4), shape: () => [] },
  eel: { make: () => RF.makeEelRock(), shape: () => [] },
  whale: { make: () => RF.makeWhale(), shape: () => [] },
  wreck: { make: () => RF.makeShipwreck(), shape: () => [] },
  xmas: { make: () => RF.makeXmasRock(ri(1, 99)), shape: () => [] },
  nudi: { make: () => RF.makeNudibranch(Math.random() < 0.35 ? 0 : ri(1, 5)), shape: () => [] },
  moray: { make: () => RF.makeMoray('rock'), shape: () => [] },
  moraytube: { make: () => RF.makeMoray('tube'), shape: () => [] },
  kraken: { make: () => RF.makeKraken(), shape: () => [] },
  weed: { make: () => M.makeSeaweed(pick(['#3FBF7F', '#5AD08A', '#2FB58E'])), shape: () => [] },
  grass: { make: () => M.makeGrass(pick(['#4FCB7A', '#7FDB6A', '#3FBF9A'])), shape: () => [] },
  star: { make: () => M.makeStarfish(), shape: () => [] },
  anemone: { make: () => { const c = pick([['#9B6BE8', '#D9B8FF', '#3E2370'], ['#FF7FB8', '#FFD0EA', '#7A1F3D'], ['#5FCF8A', '#D4FFE4', '#1F5A3A']]); return M.makeAnemone(...c); }, shape: () => [] },
  jelly: { make: () => pick([() => M.makeJelly(), () => M.makeJelly('#C7A4FF', '#3E2370', '#E9DCFF')])(), shape: () => [sph(0.15, 0.55), cap(-0.15, -1.0, 0.25)] },
  puffer: { make: () => puffer3D(), shape: () => [] },
  urchin: { make: () => wrapC(C3.makeLongSpineUrchin(), C3.animateLongSpineUrchin, 0.62, 0, 30), shape: s => [sph(0.3 * s, 0.5 * s)] },
  pearl: { make: () => M.makePearl(), shape: () => [] },
  shark: { make: () => M.makeShark(), shape: () => [] },
};
function pillar(r, h) { return { t: 'p', r, h }; }
function sph(y, r) { return { t: 's', y, r }; }
function cap(y1, y2, r) { return { t: 'c', y1, y2, r }; }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function rf(a, b) { return a + Math.random() * (b - a); }

// yellow blackspotted puffer: slim model swaps to the round one as it puffs up; faces the player
function puffer3D() { const g = new THREE.Group(), turn = new THREE.Group(); turn.rotation.y = Math.PI * 0.7; g.add(turn);
  const a = F3.makeFish3D(F3.design('Blackspotted puffer (yellow)'), 0.8), b = F3.makeFish3D(F3.design('Blackspotted puffer, puffed up'), 1); turn.add(a, b); g.userData = { a, b }; setPuff3D(g, 0); return g; }
function setPuff3D(g, k) { const { a, b } = g.userData; a.visible = k < 0.3; b.visible = !a.visible; a.scale.setScalar(0.8 * (1 + k * 0.8)); b.scale.setScalar(0.62 + 0.5 * k); }
// any reviewed 3D design as a scene object (lift: raise ground dwellers so they rest on the sand)
// a reviewed hand-built model (critters3d.js) with its own animation; animated only when near (far = z beyond -far)
// a reviewed coral (corals3d / softcorals3d): sx squeezes the footprint without changing the height; animated only when near
function coral(make, anim, size, sx = 1) { const m = make(); m.scale.set(size * sx, size, size * sx); const g = new THREE.Group(); g.add(m); g.userData.c3 = { m, anim, far: 32 }; return g; }
function wrapC(m, anim, size = 1, lift = 0, far = 45) { const g = new THREE.Group(); m.scale.setScalar(size); m.position.y = lift; g.add(m); g.userData.c3 = { m, anim, far }; return g; }
function wrap3D(name, size, lift = 0) { const g = new THREE.Group(), f = F3.makeFish3D(F3.design(name), size); f.position.y = lift; g.add(f); g.userData.f3 = f; return g; }
function shark3D(name) { const g = new THREE.Group(), f = F3.makeFish3D(F3.design(name), 2.1); g.add(f); g.userData = f.userData; return g; }
function anemK(a) { const g = new THREE.Group(); g.add(a); g.userData.anem = a.userData.anem; return g; }
const NOGLOW = ['turtle', 'shrimp', 'octopus', 'featherstar', 'bloodstar', 'urchin', 'stingray', 'manta', 'scorpion', 'croco', 'flounder', 'snakeeel', 'catshark', 'lionfish', 'dolphin', 'squid', 'puffer', 'school', 'hammer', 'blacktip', 'whitetip', 'rubble', 'debris', 'seagrass', 'bank', 'wallfar', 'rock', 'arch', 'wreck', 'wreckgate', 'pearl', 'stream', 'finish'];
function spawn(kind, x, y, z, opt = {}) {
  if (decorMap) x = mapX(x);
  if (kind === 'heroanem' && !opt.keepKind && Math.random() < 0.6) kind = pick(['magnifica', 'gigantea', 'mertensii']);
  const pool = (pools[kind] ||= []);
  let mesh = kind === 'school' && opt.species ? null : pool.pop();
  if (!mesh) { mesh = kind === 'school' && opt.species ? F3.makeSchool3D(opt.species, opt.n, opt.size) : KINDS[kind].make(); if (!NOGLOW.includes(kind)) glowAll(mesh); if (opt.solid === false) mesh.traverse(m => { m.castShadow = false; }); }
  const s = opt.scale ?? 1;
  mesh.scale.setScalar(s);
  mesh.rotation.set(0, opt.ry ?? 0, 0);
  mesh.visible = true;
  scene.add(mesh);
  const o = { kind, mesh, x, y, z, s, shapes: opt.solid === false ? [] : KINDS[kind].shape(s), hit: false, ph: Math.random() * 6, hazard: HAZARDS.includes(kind) && opt.solid !== false, grounded: y <= 0.05 && !opt.swim, ...opt };
  if (kind === 'puffer') { o.puff = 0; setPuff3D(mesh, 0); }
  if (kind === 'shark') { M.setSharkMouth(mesh, 0); mesh.userData.sick = 0; }
  objs.push(o);
  if (RESIDENT_HOMES.includes(kind) && !opt.noRes) residents(o);
  return o;
}
let hungry = null, hungryCD = 45, hungryTipShown = false;   // the one hungry shark (see SHARKS WITH MOODS)
// ---- who lives where: each reef structure gets the fish that really hang around that kind of coral
const RESIDENT_HOMES = ['mound', 'moundbig', 'wall', 'pinnacle'];
const BIG_ROCKS = new Set(['mound', 'moundbig', 'wall', 'pinnacle', 'rock', 'patch', 'xmas']);
const RESIDENTS = {
  thicket: [['Blue-green chromis', 0.55], ['Yellowtail damselfish', 0.3]],     // damsels & chromis hover over branching coral and dive into it
  terrace: [['Anthias', 0.5], ['Yellowtail damselfish', 0.25]],
  garden: [['Anthias', 0.6], ['Moorish idol', 0.2]],                          // orange anthias clouds over soft corals
  boulder: [['Threadfin butterflyfish', 0.6], ['Coral grouper', 0.25], ['Parrotfish', 0.25]],
  bommie: [['Clownfish', 0.9], ['Blue-green chromis', 0.35]],
  mixed: [['Anthias', 0.3], ['Blue-green chromis', 0.2], ['Threadfin butterflyfish', 0.3], ['Palette surgeonfish', 0.2]],
  wall: [['Anthias', 0.3], ['Lunar fusilier', 0.2], ['Clown triggerfish', 0.12], ['Emperor angelfish', 0.15]],
  pinnacle: [['Anthias', 0.95], ['Lunar fusilier', 0.6], ['Blue-green chromis', 0.5], ['Titan triggerfish', 0.15]],
};
function residents(home) {
  if (mode === 'menu' && Math.random() < 0.5) return;
  const th = home.mesh.userData.theme || (home.kind === 'pinnacle' ? 'pinnacle' : home.kind.startsWith('wall') ? 'wall' : 'mixed');
  const top = home.kind === 'pinnacle' ? 4.5 * home.s : home.kind === 'wall' ? 3.2 : (home.kind === 'moundbig' ? 2.6 : 1.9) * (home.s || 1);
  const was = decorMap; decorMap = false;
  for (const [sp, p] of RESIDENTS[th] || RESIDENTS.mixed) if (Math.random() < p) {
    const low = sp === 'Clownfish' || sp === 'Threadfin butterflyfish' || sp === 'Coral grouper' || sp === 'Parrotfish';
    spawn('school', home.x + rf(-0.6, 0.6), low ? top * rf(0.55, 0.8) : top + rf(0.3, 1.4), home.z + rf(-0.8, 0.8), { solid: false, species: sp, noRes: true, ry: rf(0, 6), size: sp === 'Clownfish' ? 0.28 : undefined });
  }
  decorMap = was;
}
const PREWARM = ['brain', 'treec', 'stag', 'table', 'cauli', 'bubble', 'scroll', 'purplec', 'cupc', 'tube', 'finger', 'leather', 'xenia', 'whips', 'btanem', 'mushroom'];
let prewarmI = 0;
function prewarmStep() { if (prewarmI >= PREWARM.length * 2) return; const k = PREWARM[prewarmI % PREWARM.length]; prewarmI++;
  const m = KINDS[k].make(); if (!NOGLOW.includes(k)) glowAll(m); m.traverse(q => { q.castShadow = false; }); (pools[k] ||= []).push(m); }
function despawn(o) {
  if (o === hungry) { hungry = null; hungryCD = rf(60, 100); const w = $('sharkwarn'); if (w) w.classList.remove('show'); }
  scene.remove(o.mesh);
  if (o.extra) o.extra.forEach(e => scene.remove(e));
  if (o.clown && !o.clownTaken) scene.remove(o.clown);
  if (!o.noPool && o.kind !== 'school') (pools[o.kind] ||= []).push(o.mesh);
}
const DIRS = { left: [-1, 0], right: [1, 0], up: [0, 1], down: [0, -1] };
function spawnStream(z, dirName, len = 14, strength = 22) {
  const dir = DIRS[dirName] || DIRS.right;
  const N = 150;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 6), seeds = new Float32Array(N * 3);
  for (let i = 0; i < N * 3; i++) seeds[i] = Math.random();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#E8FDFF', transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(lines);
  const chev = new THREE.Group();
  const shape = new THREE.Shape(); shape.moveTo(-0.35, 0.5); shape.lineTo(0.15, 0); shape.lineTo(-0.35, -0.5); shape.lineTo(-0.15, 0); shape.closePath();
  const cm = new THREE.MeshBasicMaterial({ color: '#BDF6FF', transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (let k = 0; k < 6; k++) chev.add(new THREE.Mesh(new THREE.ShapeGeometry(shape), cm));
  scene.add(chev);
  const o = { kind: 'stream', mesh: lines, extra: [chev], x: 0, y: 0, z, len, dir, strength, seeds, N, shapes: [], noPool: true, chev };
  objs.push(o); return o;
}
let finishObj = null;
function spawnFinish(z) {
  const g = new THREE.Group();
  const cols = ['#FF7FA8', '#FFD86B', '#8EDB7A', '#5FD3C8', '#B48CFF'];
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI * (i / 14);
    const m = M.makePearl(); m.scale.setScalar(1.8); m.position.set(Math.cos(a) * 4.4, Math.sin(a) * 4.4, 0);
    m.children[0].material = m.children[0].material.clone(); m.children[0].material.color.set(cols[i % 5]);
    g.add(m);
  }
  scene.add(g);
  finishObj = { kind: 'finish', mesh: g, x: 0, y: 0, z, shapes: [], noPool: true };
  objs.push(finishObj);
}

// ------------------------------------------------------------------ level / state
let mode = /[?&]play=custom/.test(location.search) ? 'menu' : 'splash';  // splash | menu | play | caught | over | win
let level = STARTER_LEVELS[0], levelIdx = 0, items = [], itemIdx = 0, pearlTotal = 0;
let speed = 6, s = 0, pearls = 0, lives = 3, invuln = 0, nextDecor = 0, t = 0, shake = 0, menuS = 0;
let caught = null; // { shark, t }
const best = {}; try { Object.assign(best, JSON.parse(localStorage.getItem('cubi_best') || '{}')); } catch (e) {}

let whaleTimes = [];
function resetWorld() {
  whaleTimes = [rf(0.15, 0.3), rf(0.55, 0.75)];
  buildZones();
  [...objs].forEach(despawn); objs.length = 0; finishObj = null; hungry = null; hungryCD = 45;
  if (buddy) { scene.remove(buddy); buddy = null; }
  endParty(); ink.level = 0;
  s = 0; pearls = 0; lives = 3; invuln = 0; nextDecor = 0; shake = 0; caught = null; toxin.cd = 0;
  P.x = 0; P.y = 2.4; P.vx = P.vy = 0; P.tx = 0; P.ty = 2.4;
  cubi.rotation.order = 'XYZ'; cubi.rotation.set(0, 0, 0); cubi.scale.setScalar(1); stars.visible = false; cubi.visible = true;
  for (let z = -SPAWN_AHEAD; z < 6; z += 3.5) decorRow(z);
  wreckDone = false;
  if (mode === 'menu' || mode === 'splash') spawn('wreck', 7.5, 0, -16, { solid: false, ry: 0.5, scale: 0.9 });
  updateHud();
}
let wreckDone = false;
function loadLevel(lv, idx) {
  level = normalizeLevel(lv); levelIdx = idx;
  items = level.items.map(it => ({ ...it })); itemIdx = 0; pearlTotal = countPearls(level);
}

// scenery stays at the sides so the lane is easy to read
function reefCluster(x, z, big = 1) {
  const o = { solid: false };
  if (Math.random() < 0.6) spawn('rock', x, 0, z, { ...o, scale: rf(0.8, 1.2) * big, ry: rf(0, 6) });
  const n = ri(2, 4);
  for (let k = 0; k < n; k++) {
    const a = rf(0, 6.28), r = rf(0.6, 1.4) * big;
    const kind = pick(['treec', 'stag', 'table', 'cauli', 'brain', 'bubble', 'scroll', 'purplec', 'cupc', 'finger', 'leather', 'xenia', 'whips', 'fan', 'anemone', 'weed', 'sponge', 'mushroom', 'clam']);
    const sc = { branch: rf(0.9, 1.4), stag: rf(0.9, 1.3), tube: rf(0.8, 1.1), brain: rf(0.6, 1.0), bubble: rf(0.7, 1.0), fan: rf(0.7, 1.0), anemone: rf(0.9, 1.2), weed: rf(0.8, 1.2), grass: rf(1, 1.5), sponge: rf(0.7, 1.1), mushroom: rf(0.7, 1.1), clam: rf(0.8, 1.1) }[kind] * big;
    spawn(kind, x + Math.cos(a) * r, 0, z + Math.sin(a) * r, { ...o, scale: CORAL_SET.includes(kind) ? rf(0.85, 1.15) * CS : sc, ry: rf(0, 6) });
  }
}
// the reviewed Komodo corals, sprinkled along the reef edges of every zone (light ones more often than heavy ones)
const CORAL_SET = ['treec', 'stag', 'table', 'cauli', 'brain', 'bubble', 'scroll', 'purplec', 'cupc', 'finger', 'leather', 'xenia', 'whips', 'btanem', 'mushroom'];
const EDGE_CORALS = ['table', 'table', 'cauli', 'scroll', 'purplec', 'cupc', 'cupc', 'finger', 'finger', 'leather', 'leather', 'xenia', 'whips', 'whips', 'bubble', 'brain', 'brain', 'stag', 'treec', 'btanem'];
const CS = 1.6;   // scenery corals are drawn bigger than the lane obstacles of the same kind
function edgeCorals(z, p = 0.2, near = 4.4, far = 6.4) {
  for (const sd of [-1, 1]) if (Math.random() < p) spawn(pick(EDGE_CORALS), sd * rf(near, far), 0, z + rf(-1.5, 1.5), { solid: false, ry: rf(0, 6), scale: rf(0.85, 1.2) * CS });
}
// the landscape is a sequence of zones, shuffled per run so every swim feels different
const ZONES = ['canyon', 'narrows', 'open', 'garden', 'narrows', 'arches', 'cliff', 'kelp', 'reefbed'];
let zoneList = [];
function buildZones() {
  PATH = { a: Math.random() * 6.28, b: Math.random() * 6.28, c: Math.random() * 6.28, e: Math.random() * 6.28 };
  zoneList = []; let d = 0, prev = '';
  while (d < 4000) { let z; do { z = pick(ZONES); } while (z === prev); zoneList.push({ from: d, type: z, side: Math.random() < 0.5 ? -1 : 1 }); prev = z; d += rf(55, 95); }
}
function zoneAt(d) { if (window.__forceZone) return { type: window.__forceZone, side: 1 }; let zz = zoneList[0]; for (const q of zoneList) { if (q.from <= d) zz = q; else break; } return zz || { type: 'garden', side: 1 }; }
function decorRow(z) { decorMap = true; try { if (!setPiece(z)) decorRow0(z); else sideOnly(z); } finally { decorMap = false; } }
let pieceUntil = -999, pieceFrom = -999;
function sideOnly(z) { const Z = zoneAt(s - z); if (Z.type !== 'garden') decorRow0(z); else sharedLife(z, true); }
const PIECES = ['ridge', 'slab', 'tunnel', 'shelf', 'hump', 'roof', 'hump', 'roof', 'ridge', 'hump'];
function setPiece(z) {
  const here = s - z;
  if (here >= pieceFrom && here <= pieceUntil) return true;                                   // inside a piece: keep the lane clear
  if (mode !== 'play' || here < 35 || here < pieceUntil + (window.__piece ? 12 : 22) || Math.random() > (window.__piece ? 1 : 0.16)) return false;
  const kind = window.__piece || pick(PIECES), n = kind === 'tunnel' ? 9 : kind === 'ridge' ? 9 : kind === 'hump' ? 3 : kind === 'roof' ? 5 : 6, len = n * RS.SEG;
  // the piece brings its own pearls and dangers: ordinary level items in its stretch step aside; special moments block it
  const span = items.filter(it => it.z > here - 6 && it.z < here + len + 6);
  if (span.some(it => !['pearl', 'pearls', 'jelly', 'puffer', 'urchin', 'coral'].includes(it.t)) || (level.length && here + len > level.length - 20)) return false;
  for (const it of span) if (!it.skip) { it.skip = true; if (it.t === 'pearl') pearlTotal--; if (it.t === 'pearls') pearlTotal -= it.n || 5; }
  pieceFrom = here; pieceUntil = here + len;
  const was = decorMap; decorMap = false;
  const good = Math.random() < 0.5 ? -1 : 1;   // which route carries the pearls
  const pearl = (x, y, zz) => { spawn('pearl', x, y, zz, { solid: false, pearl: true }); pearlTotal++; };
  for (let i = 0; i < n; i++) { const zz = z - i * RS.SEG, mid = i > 0 && i < n - 1;
    if (kind === 'ridge') { spawn(i === 0 || i === n - 1 ? 'ridgeEnd' : 'ridge', 0, 0, zz, { shapes: [pillar(0.75, 9)], bump: true, len: RS.SEG });
      if (mid && i % 2) pearl(good * 1.7, 2.2 + Math.sin(i) * 0.6, zz - 1);
      if (i === 3 || i === 6) spawn('jelly', -good * 1.7, 2.4, zz - 1, { bob: 0.3, drift: 0 }); }
    if (kind === 'slab') { spawn('slab', 0, 0, zz, { shapes: [{ t: 'b', x0: -3, x1: 3, y0: 2.0, y1: 3.0, dz: RS.SEG / 2 }], bumpY: true, len: RS.SEG });
      if (mid) pearl(rf(-1, 1), good > 0 ? 3.75 : 1.3, zz - 1);
      if (i === 2 || i === 4) spawn('jelly', rf(-1.2, 1.2), good > 0 ? 1.4 : 3.8, zz - 1, { bob: 0.15, drift: 0 }); }
    if (kind === 'shelf') { const sd = good; spawn(sd > 0 ? 'shelfR' : 'shelfL', 0, 0, zz, { shapes: [{ t: 'b', x0: sd > 0 ? -0.2 : -3, x1: sd > 0 ? 3 : 0.2, y0: 1.9, y1: 3.1, dz: RS.SEG / 2 }], bumpY: true, len: RS.SEG });
      if (mid) pearl(sd * 1.5, 1.25, zz - 1); }
    if (kind === 'hump') { spawn('hump', 0, 0, zz, { shapes: [{ t: 'b', x0: -1.35, x1: 1.35, y0: -3, y1: 1.65, dz: RS.SEG / 2 }], bumpY: true, len: RS.SEG });   // a reef head in the lane: over or around
      pearl(0, 2.35 + (i === 1 ? 0.35 : 0), zz - 1); }
    if (kind === 'roof') { spawn('roof', 0, 0, zz, { shapes: [{ t: 'b', x0: -3, x1: 3, y0: 2.85, y1: 7, dz: RS.SEG / 2 }], bumpY: true, len: RS.SEG });   // rock hanging from above: dive
      if (mid) pearl(Math.sin(i * 1.3) * 1.4, 1.35, zz - 1); }
    if (kind === 'tunnel') { spawn(i === 0 || i === n - 1 ? 'tunnelMouth' : 'tunnel', 0, 0, zz, { shapes: [{ t: 'b', x0: -3, x1: 3, y0: 4.1, y1: 8, dz: RS.SEG / 2 }], bumpY: true, len: RS.SEG, cover: true });
      if (mid) pearl(Math.sin(i * 0.9) * 1.6, 2.2 + Math.cos(i * 0.7) * 0.9, zz - 1); }
  }
  decorMap = was; return true;
}
function decorRow0(z) {
  if (!zoneList.length) buildZones();
  const here = (mode === 'play' || mode === 'caught' ? s : menuS) - z;
  const Z = (mode === 'menu' || mode === 'splash') ? { type: 'garden', side: 1 } : zoneAt(here);
  const zone = Z.type;
  window.__zone = zone;
  if (zone === 'garden') {   // low coral carpet under Cubi's lane (purely decoration, never hurts)
    if (Math.random() < 0.8) spawn('patch', rf(-3.2, 3.2), 0, z + rf(-1.5, 1.5), { solid: false, ry: rf(0, 6) });
    if (Math.random() < 0.25) spawn(pick(['star', 'mushroom', 'nudi']), rf(-3.5, 3.5), 0, z, { solid: false, ry: rf(0, 6), scale: rf(0.6, 1.2) });
    if (Math.random() < 0.12) spawn(pick(['finger', 'cupc', 'leather', 'purplec']), rf(-3.2, 3.2), 0, z + rf(-1.5, 1.5), { solid: false, ry: rf(0, 6), scale: rf(0.75, 0.95) });
  }
  if (zone === 'narrows') {  // tight gorge: coral-covered rock walls right beside the lane
    for (const sd of [-1, 1]) {
      if (Math.random() < 0.85) spawn('mound', sd * rf(4.6, 5.6), 0, z + rf(-1, 1), { solid: false, ry: rf(0, 6) });
      if (Math.random() < 0.7) spawn('wall', sd * rf(6.6, 7.6), 0, z + rf(-1, 1), { solid: false, ry: rf(0, 6), scale: rf(1.0, 1.25) });
      if (Math.random() < 0.45) spawn(pick(['heroanem', 'xmas', 'xmas']), sd * rf(4.2, 4.8), 0, z, { solid: false, ry: rf(0, 6), xmas: false });
    }
    edgeCorals(z, 0.2, 4.2, 4.8); sharedLife(z); return;
  }
  if (zone === 'canyon') {   // U-shaped valley: sand curves up into reef slopes, walls crown the rim
    for (const sd of [-1, 1]) {
      if (Math.random() < 0.75) spawn(pick(['mound', 'mound', 'moundbig']), sd * rf(5.2, 9), 0, z + rf(-1.5, 1.5), { solid: false, ry: rf(0, 6) });
      if (Math.random() < 0.8) spawn('wall', sd * rf(11, 12), 0, z + rf(-1, 1), { solid: false, ry: rf(0, 6), scale: rf(0.9, 1.15) });
      if (Math.random() < 0.3) spawn('heroanem', sd * rf(4.6, 5.4), 0.05, z + rf(-2, 2), { solid: false, ry: rf(0, 6) });
      if (Math.random() < 0.6) spawn('xmas', sd * rf(4.4, 5.5), 0, z, { solid: false, ry: rf(0, 6), scale: rf(1.1, 1.4), xmas: true });
    }
    edgeCorals(z, 0.24, 4.6, 7); sharedLife(z);
    return;
  }
  if (zone === 'arches') {   // rock arches span right over the lane
    if (here - (window.__lastArch || -99) > 16 && Math.random() < 0.5) { window.__lastArch = here; spawn('arch', 0, 0, z, { solid: false, scale: rf(2.6, 3.0), ry: 0 }); }
    for (const sd of [-1, 1]) if (Math.random() < 0.5) spawn('heroanem', sd * rf(4.5, 5.5), 0, z, { solid: false, ry: rf(0, 6) });
    for (const sd of [-1, 1]) if (Math.random() < 0.8) spawn('mound', sd * rf(5.3, 7), 0, z + rf(-1, 1), { solid: false, ry: rf(0, 6) });
    edgeCorals(z); sharedLife(z); return;
  }
  if (zone === 'cliff') {    // one side: a towering coral cliff (like the photo); the other: wide open sand
    const sd = Z.side;
    if (Math.random() < 0.75) spawn('mound', sd * rf(5.2, 9), 0, z + rf(-1.5, 1.5), { solid: false, ry: rf(0, 6) });
    spawn('wall', sd * rf(10.5, 11.5), 0, z + rf(-1, 1), { solid: false, ry: rf(0, 6), scale: rf(1.2, 1.5) });
    if (Math.random() < 0.6) spawn('wall', sd * rf(13, 15), 0, z, { solid: false, ry: rf(0, 6), scale: rf(1.2, 1.5) });
    if (Math.random() < 0.4) spawn('heroanem', sd * rf(4.6, 5.4), 0, z, { solid: false, ry: rf(0, 6) });
    if (Math.random() < 0.55) spawn(pick(['mound', 'mound', 'star']), -sd * rf(5.5, 10), 0, z + rf(-2, 2), { solid: false, ry: rf(0, 6) });
    if (Math.random() < 0.55) spawn(pick(EDGE_CORALS), sd * rf(4.5, 6.5), 0, z + rf(-1.5, 1.5), { solid: false, ry: rf(0, 6), scale: rf(0.9, 1.25) * CS });
    if (Math.random() < 0.2) spawn(pick(['table', 'cauli', 'scroll', 'finger']), -sd * rf(4.6, 7.5), 0, z + rf(-2, 2), { solid: false, ry: rf(0, 6), scale: CS });
    if (Math.random() < 0.06) spawn('pinnacle', -sd * rf(8.5, 12), 0, z, { solid: false, ry: rf(0, 6), scale: rf(1.2, 1.5) });
    sharedLife(z); return;
  }
  if (zone === 'reefbed') {  // swimming right over a rocky reef floor
    if (Math.random() < 0.85) spawn('patch', rf(-3.4, 3.4), 0, z + rf(-1.5, 1.5), { solid: false, ry: rf(0, 6) });
    if (Math.random() < 0.6) spawn('xmas', pick([-1, 1]) * rf(3.8, 5), 0, z, { solid: false, ry: rf(0, 6), scale: rf(1.0, 1.3), xmas: true });
    if (Math.random() < 0.35) spawn(pick(['xmas', 'heroanem', 'rock']), rf(-3.4, 3.4), 0, z, { solid: false, ry: rf(0, 6), scale: rf(0.6, 0.9), xmas: false });
    for (const sd of [-1, 1]) { if (Math.random() < 0.85) spawn(pick(['mound', 'moundbig']), sd * rf(5, 9), 0, z + rf(-1, 1), { solid: false, ry: rf(0, 6) }); if (Math.random() < 0.3) spawn('wall', sd * rf(11, 14), 0, z, { solid: false, ry: rf(0, 6) }); }
    if (Math.random() < 0.15) spawn(pick(['finger', 'cupc', 'mushroom', 'purplec']), rf(-3.2, 3.2), 0, z + rf(-1.5, 1.5), { solid: false, ry: rf(0, 6), scale: rf(0.7, 0.9) });
    edgeCorals(z); sharedLife(z); return;
  }
  if (zone === 'kelp') {     // tall swaying kelp forest
    for (const sd of [-1, 1]) {
      for (let k = 0; k < 5; k++) if (Math.random() < 0.8) spawn('kelp', sd * rf(4.6, 12), 0, z + rf(-2.5, 2.5), { solid: false, ry: rf(0, 6) });
      if (Math.random() < 0.6) spawn(pick(['mound', 'rock', 'heroanem']), sd * rf(5.3, 8), 0, z, { solid: false, ry: rf(0, 6) });
      if (Math.random() < 0.15) spawn(pick(['whips', 'leather', 'xenia']), sd * rf(4.5, 6), 0, z + rf(-1.5, 1.5), { solid: false, ry: rf(0, 6), scale: CS });
      if (Math.random() < 0.04) spawn('pinnacle', sd * rf(9.5, 13), 0, z, { solid: false, ry: rf(0, 6), scale: rf(1.2, 1.5) });
    }
    if (Math.random() < 0.3) spawn('grass', rf(-3.5, 3.5), 0, z, { solid: false, ry: rf(0, 6) });
    sharedLife(z); return;
  }
  for (const side of [-1, 1]) {
    if (zone === 'open') {   // wide sandy flats with scattered reef islands and big open water
      if (Math.random() < 0.45) spawn(pick(['mound', 'moundbig']), side * rf(5.5, 11), 0, z + rf(-2, 2), { solid: false, ry: rf(0, 6) });
      if (Math.random() < 0.25) spawn(pick(['grass', 'star', 'weed', 'heroanem']), side * rf(4.4, 12), 0, z + rf(-2, 2), { solid: false, ry: rf(0, 6) });
      if (Math.random() < 0.18) spawn(pick(EDGE_CORALS), side * rf(4.6, 8.5), 0, z + rf(-2, 2), { solid: false, ry: rf(0, 6), scale: rf(0.9, 1.3) * CS });
      if (Math.random() < 0.07) spawn('pinnacle', side * rf(8, 12), 0, z + rf(-2, 2), { solid: false, ry: rf(0, 6), scale: rf(1.2, 1.5) });
      if (Math.random() < 0.08) spawn('wallfar', side * rf(20, 26), 0, z, { solid: false, ry: rf(0, 6), scale: rf(1.1, 1.5) });
      continue;
    }
    if (Math.random() < 0.8) spawn('mound', side * rf(5.3, 6.8), 0, z + rf(-1, 1), { solid: false, ry: rf(0, 6) });
    else if (Math.random() < 0.5) reefCluster(side * rf(5.6, 9), z + rf(-1, 1), rf(1, 1.3));
    if (Math.random() < 0.3) spawn('moundbig', side * rf(7.5, 9), 0, z + rf(-1, 1), { solid: false, ry: rf(0, 6) });
    // reef walls form a valley around the lane, with a taller far wall behind
    if (Math.random() < (zone === 'garden' ? 0.35 : 0.9)) spawn('wall', side * (zone === 'garden' ? rf(11, 13) : rf(9.5, 11)), 0, z + rf(-1, 1), { solid: false, ry: rf(-0.3, 0.3) + (side > 0 ? Math.PI : 0), scale: rf(0.9, 1.15) });
    if (Math.random() < 0.3) spawn('wallfar', side * rf(14, 18), 0, z + rf(-2, 2), { solid: false, ry: rf(0, 6), scale: rf(1.1, 1.5) });
    // foreground plants that whoosh past the camera
    if (Math.random() < 0.25) spawn(pick(['weed', 'weed', 'treec', 'fan', 'whips']), side * rf(4.8, 6.2), 0, z + rf(-1, 1), { solid: false, scale: rf(1.2, 1.6), ry: rf(0, 6) });
    if (Math.random() < 0.18) spawn(pick(EDGE_CORALS), side * rf(4.4, 5.8), 0, z + rf(-1.5, 1.5), { solid: false, ry: rf(0, 6), scale: rf(0.85, 1.15) * CS });
    // little creatures
    if (Math.random() < 0.1) spawn('crab', side * rf(3.9, 5.5), 0, z, { solid: false, ry: rf(-0.5, 0.5) });
    if (Math.random() < 0.12) spawn('heroanem', side * rf(4.4, 5.2), 0, z + rf(-1, 1), { solid: false, ry: rf(0, 6) });
    if (Math.random() < 0.5) spawn('xmas', side * rf(4.3, 6), 0, z + rf(-1, 1), { solid: false, ry: rf(0, 6), scale: rf(1.1, 1.5), xmas: true });
    if (Math.random() < 0.16) spawn('nudi', side * rf(3.7, 5.4), 0, z + rf(-1, 1), { solid: false, ry: rf(0, 6), scale: rf(1.5, 2.1) });
    if (Math.random() < 0.07) spawn('seahorse', side * rf(5, 7), rf(1.0, 2.0), z, { solid: false, ry: side > 0 ? -Math.PI / 2 - 0.4 : Math.PI / 2 + 0.4, scale: rf(0.9, 1.2) });
    if (Math.random() < 0.05) spawn('eel', side * rf(5.6, 7.5), 0, z, { solid: false, ry: side > 0 ? -Math.PI / 2 - 0.5 : Math.PI / 2 + 0.5, scale: rf(1, 1.3) });
    if (Math.random() < 0.4) spawn(pick(['weed', 'star', 'star']), side * rf(4.4, 6), 0, z + rf(-1.5, 1.5), { solid: false, scale: rf(0.8, 1.2), ry: rf(0, 6) });
  }
  if (Math.random() < 0.35) spawn(pick(['star', 'star', 'mushroom']), rf(-3.5, 3.5), 0, z, { scale: rf(0.4, 0.7), ry: rf(0, 6), solid: false });
  sharedLife(z, true);
}
// creatures, fish and far features shared by every landscape type
function sharedLife(z, bg) {
  const side = Math.random() < 0.5 ? -1 : 1;
  if (Math.random() < 0.45) spawn('star', rf(-3.6, 3.6), 0, z + rf(-1.5, 1.5), { solid: false, scale: rf(1.0, 1.6), ry: rf(0, 6) });
  if (Math.random() < 0.35) spawn('star', side * rf(3.8, 6), 0, z + rf(-1.5, 1.5), { solid: false, scale: rf(1.1, 1.8), ry: rf(0, 6) });
  if (Math.random() < 0.35) spawn('wallfar', side * rf(16, 24), rf(0, 2), z + rf(-3, 3), { solid: false, ry: rf(0, 6), scale: rf(1.4, 2.2) });
  if (Math.random() < 0.08) spawn('crab', side * rf(3.9, 5.2), 0, z, { solid: false, ry: rf(-0.5, 0.5) });
  if (Math.random() < 0.1) spawn('nudi', side * rf(3.7, 5), 0, z + rf(-1, 1), { solid: false, ry: rf(0, 6), scale: rf(1.5, 2.1) });
  if (!bg) { if (Math.random() < 0.05) spawn('seahorse', side * rf(5, 7), rf(1.6, 2.6), z, { solid: false, ry: side > 0 ? -Math.PI / 2 - 0.4 : Math.PI / 2 + 0.4 }); }
  if (Math.random() < 0.09) spawn('arch', side * rf(11, 16), 0, z, { solid: false, scale: rf(0.9, 1.3), ry: side * rf(1.2, 1.9) });
  if (Math.random() < 0.3) spawn('weed', side * rf(9, 15), 0, z + rf(-2, 2), { solid: false, scale: rf(1.8, 2.6), ry: rf(0, 6) });
  if (Math.random() < 0.1) spawn('vent', side * rf(4.6, 7), 0, z, { solid: false, scale: 1 });
  // reef life swimming by
  // open-water life: fusilier streams high up, silverside bait balls, surgeonfish and tangs roving over the reef
  if (Math.random() < 0.16) { const dir = Math.random() < 0.5 ? 1 : -1; spawn('school', side * rf(5, 9), rf(5.2, 7.2), z, { solid: false, species: pick(['Lunar fusilier', 'Lunar fusilier', 'Silversides', 'Needlefish']), ry: dir > 0 ? Math.PI : 0, swim: [rf(-0.3, 0.3), dir * rf(1.5, 3.5)], noRes: true }); }
  if (Math.random() < 0.14) spawn('school', side * rf(3.6, 6), rf(1.6, 3.4), z + rf(-2, 2), { solid: false, species: pick(['Palette surgeonfish', 'Clown surgeonfish', 'Brown sailfin tang', 'Foxface rabbitfish', 'Moorish idol', 'Orange-lined triggerfish', 'Parrotfish']), ry: rf(0, 6), swim: [rf(-0.4, 0.4), -rf(0.3, 1.2)], noRes: true });
  const nSchools = Math.random() < 0.35 ? 1 : 0;
  for (let k = 0; k < nSchools; k++) {
    const sd = Math.random() < 0.5 ? -1 : 1;
    const across = Math.random() < 0.4;
    if (across) { const dir = Math.random() < 0.5 ? 1 : -1; spawn('school', -dir * rf(9, 13), rf(4.9, 7), z + rf(-2, 2), { solid: false, ry: dir * Math.PI / 2 + Math.PI, swim: [dir * rf(0.8, 2.2), 0] }); }
    else spawn('school', sd * rf(6.5, 11), rf(1.8, 6.5), z + rf(-2, 2), { solid: false, ry: rf(-0.3, 0.3), swim: [rf(-0.3, 0.3), -rf(0.8, 3.2)] });
  }
  if (Math.random() < 0.02) { const dir = Math.random() < 0.5 ? 1 : -1; spawn('manta', -dir * 14, rf(7, 8.5), z - 6, { solid: false, scale: rf(1.2, 1.6), ry: dir * Math.PI / 2 + Math.PI, swim: [dir * 2.2, 0], maxX: 20 }); }
  if (Math.random() < 0.012) { const dir = Math.random() < 0.5 ? 1 : -1; spawn('whaleshark', -dir * 26, rf(8.5, 10.5), z - 10, { solid: false, scale: rf(2.3, 2.8), ry: dir * Math.PI / 2 + Math.PI, swim: [dir * 1.5, 0], maxX: 32 }); }
  else if (Math.random() < 0.01) { const sd = Math.random() < 0.5 ? -1 : 1; spawn('whaleshark', sd * rf(9, 12), rf(7.5, 9.5), z - 10, { solid: false, scale: rf(2.3, 2.8), ry: 0, swim: [0, -rf(1.8, 2.6)] }); }
  if (Math.random() < 0.03) { const dir = Math.random() < 0.5 ? 1 : -1, n = 1 + Math.floor(Math.random() * 3), y0 = rf(4.4, 5.6); for (let k = 0; k < n; k++) spawn('babyturtle', -dir * (10 + k * rf(0.9, 1.6)), y0 + rf(-0.5, 0.5), z - 6 + rf(-1.2, 1.2), { solid: false, scale: rf(0.4, 0.5), ry: dir * Math.PI / 2 + Math.PI, swim: [dir * rf(1.1, 1.5), 0], maxX: 16 }); }
  if (Math.random() < 0.13) spawn('xmas', side * rf(2.4, 3.8), 0, z + rf(-1.5, 1.5), { solid: false, ry: rf(0, 6), scale: rf(0.85, 1.15), xmas: true });
  if (Math.random() < 0.13) spawn('debris', side * rf(3.7, 6.5), 0, z + rf(-2, 2), { solid: false, ry: rf(0, 6), scale: rf(0.9, 1.2) });
  if (Math.random() < 0.04) spawn('debris', rf(-2.6, 2.6), 0, z, { solid: false, ry: rf(0, 6) });
  if (Math.random() < 0.45) spawn('seagrass', side * rf(3.8, 9), 0, z + rf(-2, 2), { solid: false, ry: rf(0, 6), scale: rf(0.9, 1.3) });
  if (Math.random() < 0.18) spawn('seagrass', rf(-3, 3), 0, z + rf(-2, 2), { solid: false, ry: rf(0, 6), scale: rf(0.6, 0.85) });
  // reef residents from the design review: ground dwellers rest on the sand, lionfish and squid hover, dolphins pass by high up
  for (const [k, p, a, b] of [['octopus', 0.022, 3.2, 5.5], ['featherstar', 0.04, 3.4, 6.5], ['bloodstar', 0.045, 2.6, 5.5]]) if (Math.random() < p) spawn(k, side * rf(a, b), 0, z + rf(-2, 2), { solid: false, ry: rf(0, 6) });
  for (const [k, p] of [['scorpion', 0.06], ['croco', 0.04], ['flounder', 0.05], ['snakeeel', 0.04], ['catshark', 0.04]]) if (Math.random() < p) spawn(k, side * rf(2.8, 5.5), 0, z + rf(-2, 2), { solid: false, ry: rf(0, 6) });
  if (Math.random() < 0.06) spawn('lionfish', side * rf(3.6, 5.4), rf(1.0, 2.4), z + rf(-2, 2), { solid: false, ry: side * rf(1.2, 1.9) });
  if (Math.random() < 0.035) { const n = 2 + Math.floor(Math.random() * 3), y0 = rf(3.2, 5); for (let k = 0; k < n; k++) spawn('squid', side * rf(4, 6) + k * 0.5, y0 + rf(-0.3, 0.3), z + k * 0.7, { solid: false, ry: side * Math.PI / 2 }); }
  if (Math.random() < 0.01) { const dir = Math.random() < 0.5 ? 1 : -1, n = 2 + Math.floor(Math.random() * 2), y0 = rf(7.2, 8.4); for (let k = 0; k < n; k++) spawn('dolphin', -dir * (16 + k * 2.2), y0 + rf(-0.6, 0.6), z - 8 + rf(-2, 2), { solid: false, ry: dir * Math.PI / 2 + Math.PI, swim: [dir * 5.5, 0], maxX: 22 }); }
  if (Math.random() < 0.09) spawn('stingray', side * rf(3.2, 5.6), 0, z + rf(-2, 2), { solid: false, ry: rf(0, 6), scale: rf(1.1, 1.5) });
  if (Math.random() < 0.03) spawn('stingray', rf(-2.4, 2.4), 0, z, { solid: false, ry: rf(0, 6), scale: rf(1.0, 1.3) });
  if (Math.random() < 0.22) spawn('gorgonian', side * rf(4.4, 7.5), 0, z + rf(-2, 2), { solid: false, ry: rf(-0.5, 0.5), scale: rf(0.9, 1.5) });
  if (Math.random() < 0.45) spawn('rubble', side * rf(2.8, 7), 0, z + rf(-2, 2), { solid: false, ry: rf(0, 6), scale: rf(0.9, 1.3) });
  if (Math.random() < 0.2) spawn('rubble', rf(-2.6, 2.6), 0, z + rf(-2, 2), { solid: false, ry: rf(0, 6), scale: rf(0.7, 1.0) });
  if (Math.random() < 0.07) spawn('grazer', side * rf(4.3, 5.6), 0, z, { solid: false, ry: side * rf(1.0, 1.9) + (Math.random() < 0.5 ? Math.PI : 0) });
  if (Math.random() < 0.07) spawn('shrimp', side * rf(3.7, 5.2), 0, z + rf(-2, 2), { solid: false, scale: rf(1.5, 2.0), ry: rf(0, 6) });
  if (!bg) sharkLife(z, side);
  if (Math.random() < 0.006) { const dir = Math.random() < 0.5 ? 1 : -1; spawn('whale', -dir * 34, rf(9, 11), z - 4, { solid: false, scale: 1.4, ry: dir * Math.PI / 2 + Math.PI, swim: [dir * 1.6, 0], maxX: 40 }); }
  if (Math.random() < 0.025) { const dir = Math.random() < 0.5 ? 1 : -1; spawn('turtle', -dir * 13, rf(7.6, 9), z - 8, { solid: false, scale: 1.3, ry: dir * Math.PI / 2 + Math.PI, swim: [dir * 1.3, 0] }); }
}

function spawnItem(it, z) {
  const x = THREE.MathUtils.clamp(+it.x || 0, -3.6, 3.6) * LANE_K, y = +it.y || LANE.mid;
  switch (it.t) {
    case 'pearl': spawn('pearl', x, y, z, { solid: false, pearl: true }); break;
    case 'pearls': { const n = it.n || 5, gap = it.gap || 3; for (let i = 0; i < n; i++) spawn('pearl', x + (it.dx || 0) * i, y + (it.dy || 0) * i, z - i * gap, { solid: false, pearl: true }); break; }
    case 'jelly': spawn('jelly', x, y, z, { bob: 0.3, drift: 0 }); break;
    case 'puffer': spawn('puffer', x, y, z, { vz: 2.2 }); break;
    case 'urchin': spawn('urchin', x, 0, z, { scale: 1.15, ry: rf(0, 6) }); break;
    case 'coral': spawn(KINDS[it.kind] ? it.kind : 'branch', x, 0, z, { scale: it.kind === 'brain' ? 1.4 : 1.5, ry: rf(0, 6), bump: true }); break;
    case 'stream': spawnStream(z, it.dir, it.len || 14); break;
    case 'wreckgate': { const hx = THREE.MathUtils.clamp(+it.x || 0, -2.2, 2.2) * LANE_K; const gm = RF.makeWreckGate(hx); scene.add(gm); objs.push({ kind: 'gate', mesh: gm, x: 0, y: 0, z, hx, shapes: [], noPool: true, gate: true }); break; }
    case 'moray': { const sd = (+it.x || 1) >= 0 ? 1 : -1; const tube = it.home ? it.home === 'tube' : Math.random() < 0.5; spawn(tube ? 'moraytube' : 'moray', sd * (tube ? 3.7 : 4.1), 0, z, { scale: 1.3, solid: false, ry: sd > 0 ? -Math.PI / 2 : Math.PI / 2, side: sd, moray: true, tube, phase: 'peek', mt: 0 }); break; }
    case 'kraken': spawn('kraken', THREE.MathUtils.clamp(+it.x || 0, -2.5, 2.5) * LANE_K, 5.0, z, { solid: false, kraken: true, phase: 'wait', mt: 0, scale: 1.15 }); break;
    case 'hammer': case 'seasnake': {
      const dir = it.from === 'right' ? -1 : it.from === 'left' ? 1 : (x > 0 ? -1 : 1);
      const hammer = it.t === 'hammer';
      const kind = hammer ? (it.kind === 'whitetip' || it.kind === 'blacktip' ? it.kind : pick(['blacktip', 'whitetip'])) : 'seasnake';
      spawn(kind, -dir * 12, hammer ? (+it.y || LANE.mid) : (+it.y || LANE.low), z, { crosser: dir, ry: -dir * Math.PI / 2, scale: hammer ? 1.15 : 1.8, halfL: hammer ? 1.35 : 1.25, rad: hammer ? 0.42 : 0.2, cOff: hammer ? 0.2 : -1.1, warn: hammer ? 'Reef shark!' : 'Sea snake!' });
      break;
    }
    case 'shark': hungryShark(z - 10, x); break;
    case 'decor': {
      const SC = { octopus: 1, featherstar: 1, bloodstar: 1, scorpion: 1, croco: 1, flounder: 1, snakeeel: 1, catshark: 1, lionfish: 1, squid: 1, stingray: 1.3, gorgonian: 1.2, rubble: 1, xmas: 1.25, star: 1.3, shrimp: 1.8, debris: 1.05, seagrass: 1.1, clam: 1, sponge: 0.9, mushroom: 0.9, crab: 1, nudi: 1.8, kelp: 1 };
      const k = ['magnifica', 'gigantea', 'mertensii', 'heroanem', 'xmas', 'debris', 'seagrass', 'grazer', 'shrimp', 'star', 'clam', 'sponge', 'mushroom', 'crab', 'nudi', 'kelp', 'octopus', 'featherstar', 'bloodstar', 'scorpion', 'croco', 'flounder', 'snakeeel', 'catshark', 'lionfish', 'squid', 'stingray', 'gorgonian', 'rubble', 'treec', 'table', 'cauli', 'scroll', 'purplec', 'cupc', 'finger', 'leather', 'xenia', 'whips', 'btanem', 'brain', 'bubble', 'stag'].includes(it.kind) ? it.kind : 'magnifica';
      spawn(k, x, 0, z, { solid: false, ry: rf(0, 6), scale: SC[k] ?? (CORAL_SET.includes(k) ? CS : 1), xmas: k === 'xmas', keepKind: true });
      break;
    }
    case 'visitor': {
      const sd = x >= 0 ? 1 : -1, dir = -sd;
      if (it.kind === 'turtle') spawn('turtle', -dir * 13, rf(6.5, 7.5), z, { solid: false, scale: 1.3, ry: dir * Math.PI / 2 + Math.PI, swim: [dir * 1.3, 0] });
      else if (it.kind === 'babyturtles') { const y0 = rf(4.4, 5.4); for (let k = 0; k < 3; k++) spawn('babyturtle', -dir * (10 + k * 1.2), y0 + rf(-0.4, 0.4), z + rf(-1.2, 1.2), { solid: false, scale: rf(0.4, 0.5), ry: dir * Math.PI / 2 + Math.PI, swim: [dir * rf(1.1, 1.5), 0], maxX: 16 }); }
      else if (it.kind === 'dolphin') { for (let k = 0; k < 3; k++) spawn('dolphin', -dir * (16 + k * 2.2), rf(7, 8.4), z + rf(-2, 2), { solid: false, ry: dir * Math.PI / 2 + Math.PI, swim: [dir * 5.5, 0], maxX: 22 }); }
      else if (it.kind === 'manta') spawn('manta', -dir * 14, rf(7, 8), z, { solid: false, scale: 1.4, ry: dir * Math.PI / 2 + Math.PI, swim: [dir * 2.2, 0], maxX: 20 });
      else { spawn('whaleshark', sd * 6, 6.2, z, { solid: false, scale: 2.4, ry: -sd * 0.12, swim: [-sd * 0.12, -speed * 0.7] }); if (mode === 'play') { toast('A whale shark is passing by!'); sound.whale(); } }
      break;
    }
    case 'anemone': {
      const a = spawn('anemone', x, 0, z, { scale: 1.3, solid: false });
      const clown = M.makeClown(); clown.scale.setScalar(0.9); scene.add(clown); a.clown = clown; break;
    }
  }
}

// ------------------------------------------------------------------ collision
function hitShape(o) {
  for (const sh of o.shapes) {
    const dx = P.x - o.x, dz = -o.z;
    if (sh.t === 'p') {
      const cy = Math.min(Math.max(P.y, 0), sh.h), dy = P.y - cy;
      if (dx * dx + dz * dz < (sh.r + B.r) ** 2 && Math.abs(dy) < B.r) return true;
    } else if (sh.t === 's') {
      const dy = P.y - (o.y + sh.y);
      if (dx * dx + dy * dy + dz * dz < (sh.r + B.r) ** 2) return true;
    } else if (sh.t === 'b') {   // box: a shelf or roof across the lane
      if (P.x > sh.x0 - B.r && P.x < sh.x1 + B.r && P.y > sh.y0 - B.r && P.y < sh.y1 + B.r && Math.abs(dz) < sh.dz + B.r) return true;
    } else if (sh.t === 'c') {
      const cy = Math.min(Math.max(P.y, o.y + sh.y2), o.y + sh.y1), dy = P.y - cy;
      if (dx * dx + dy * dy + dz * dz < (sh.r + B.r) ** 2) return true;
    }
  }
  return false;
}
function hurt(msg = 'Ouch!') {
  if (window.__god) { invuln = 0.5; return false; }
  if (invuln > 0 || mode !== 'play') return false;
  shake = 0.35;
  if (buddy) {
    const b = buddy; buddy = null;
    objs.push({ kind: 'flee', mesh: b, x: b.position.x, y: b.position.y, z: b.position.z, shapes: [], noPool: true, flee: P.x > 0 ? -1 : 1 });
    invuln = 1.2; sound.hurt(); toast('Buddy saved you!'); updateHud(); return true;
  }
  lives--; invuln = 1.6; updateHud(); sound.hurt();
  if (lives <= 0) gameOver(); else toast(msg, 3);
  return true;
}
let pathD = 0; const BEND = 0, BEND_Y = 0;   // no corridor pull (it made steering feel draggy); direction comes from the set pieces
function wallScrape(sx, sy) { if (t - (wallScrape.last || -9) < 0.45) return; wallScrape.last = t; sound.bump(); P.vx += sx * 5; P.vy += sy * 4; shake = Math.max(shake, 0.08); cubi.userData.boing = 0.25; }
function bumpY(o) { // shelves and roofs: nudge up or down, whichever is closer
  if (t - (bump.last || -9) > 0.5) { bump.last = t; sound.bump(); }
  const sh = o.shapes[0], up = P.y > (sh.y0 + sh.y1) / 2;
  P.vy += up ? 7 : -7; P.ty = THREE.MathUtils.clamp(up ? sh.y1 + B.r + 0.15 : sh.y0 - B.r - 0.15, B.minY, B.maxY); o.hit = false; o.rehit = t + 0.4;
  shake = Math.max(shake, 0.12); cubi.userData.boing = 0.35;
}
function bump(o) { // corals & rocks: soft nudge, no damage
  if (t - (bump.last || -9) > 0.5) { bump.last = t; sound.bump(); }
  const side = P.x >= o.x ? 1 : -1;
  P.vx += side * 9; P.tx = THREE.MathUtils.clamp(P.tx + side * 1.1, B.minX, B.maxX);
  shake = Math.max(shake, 0.12);
  cubi.userData.boing = 0.35;
}

// ------------------------------------------------------------------ toxin
function useToxin() {
  if (mode === 'caught') { releaseFromShark(); return; }
  if (mode !== 'play' || toxin.cd > 0) return;
  toxin.cd = toxin.CD; sound.toxin();
  puffCloud(P.x, P.y, 0, 1);
  // scare everything nearby
  for (const o of objs) {
    if (!(o.hazard || o.shark || o.moray || o.kraken || o.crosser) || o.sick) continue;
    const d = Math.hypot(o.x - P.x, (o.y || 0) - P.y, o.z);
    if (d < (o.shark ? 9 : 4.5)) makeSick(o);
  }
  updateHud();
}
function makeSick(o) {
  o.sick = true; o.hazard = false; o.shapes = [];
  o.flee = o.x >= P.x ? 1 : -1;
  if (o.shark) { o.mesh.userData.sick = 1; M.setSharkMouth(o.mesh, 0); }
  o.mesh.traverse(m => { if (m.isMesh && m.material && m.material.emissive && !m.material.userData.cloned) { m.material = m.material.clone(); m.material.userData.cloned = true; m.material.emissive.setRGB(0.05, 0.22, 0.04); } });
}
function puffCloud(x, y, z, power) {
  toxin.puffs.forEach((p, i) => {
    p.m.visible = true; p.life = 1.2 + Math.random() * 0.4;
    p.m.position.set(x, y, z);
    const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI;
    p.v.set(Math.cos(a) * Math.sin(b), Math.cos(b) * 0.8 + 0.3, Math.sin(a) * Math.sin(b)).multiplyScalar(2 + Math.random() * 2.5 * power);
    p.m.scale.setScalar(0.25);
  });
  $('toxinBtn').classList.add('fire'); setTimeout(() => $('toxinBtn').classList.remove('fire'), 300);
}
function releaseFromShark() {
  if (!caught) return;
  const o = caught.shark;
  puffCloud(P.x, P.y, 0, 1.3);
  makeSick(o); o.spitT = 0.4;
  caught = null; mode = 'play'; invuln = 1.2; toxin.cd = toxin.CD;
  P.vy = 6; P.vx = (P.x > o.x ? 1 : -1) * 5; P.ty = Math.min(B.maxY, P.y + 1);
  cubi.scale.setScalar(1);
  $('caught').classList.remove('show');
  toast('Bleh! Spat out!');
}

// ------------------------------------------------------------------ input
const keys = {};
let drag = null;
canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, tx: P.tx, ty: P.ty }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => {
  if (!drag || mode !== 'play') return;
  const k = 7.5 / Math.min(innerWidth, innerHeight * 1.2);
  P.tx = THREE.MathUtils.clamp(drag.tx + (e.clientX - drag.x) * k, B.minX, B.maxX);
  P.ty = THREE.MathUtils.clamp(drag.ty - (e.clientY - drag.y) * k, B.minY, B.maxY);
});
const endDrag = () => { drag = null; };
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase(); keys[k] = true;
  if (k === ' ' || k === 'spacebar') { e.preventDefault(); if (!e.repeat) useToxin(); }
  if (k.startsWith('arrow')) e.preventDefault();
});
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
const sndBtn = $('soundBtn'); const sndUI = () => { sndBtn.textContent = sound.on ? '🔊' : '🔇'; sndBtn.setAttribute('aria-label', sound.on ? 'Mute sound (M)' : 'Turn sound on (M)'); }; sndUI();
sndBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); sound.toggle(); sndUI(); });
addEventListener('keydown', (e) => { if (e.key === 'm' || e.key === 'M') { sound.toggle(); sndUI(); } });
$('toxinBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); useToxin(); });

// ------------------------------------------------------------------ HUD & menus
function updateHud() {
  $('hearts').innerHTML = [0, 1, 2].map(i => `<span class="heart${i < lives ? '' : ' gone'}" aria-hidden="true"></span>`).join('');
  $('hearts').setAttribute('aria-label', `${lives} lives`);
  $('pearls').textContent = `${pearls}/${pearlTotal}`;
  $('buddy').classList.toggle('on', !!buddy);
}
// messages: one at a time. A more important one replaces a less important one; the same text is not repeated within 6 s;
// at most one message waits in line (the most important), everything else is dropped.
// prio: 3 = you got hurt, 2 = danger ahead, 1 = info
const MSG = { cur: null, until: 0, prio: 0, next: null, seen: new Map() };
function toast(txt, prio = 1) {
  const now = performance.now() / 1000;
  if (MSG.seen.has(txt) && now - MSG.seen.get(txt) < 6) return;
  if (MSG.cur && now < MSG.until && prio <= MSG.prio) { if (!MSG.next || prio > MSG.next.prio) MSG.next = { txt, prio }; return; }
  showMsg(txt, prio, now);
}
function showMsg(txt, prio, now) {
  const el = $('toast'); MSG.cur = txt; MSG.prio = prio; MSG.until = now + 1.5; MSG.seen.set(txt, now);
  el.textContent = txt; el.classList.toggle('long', txt.length > 22); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(MSG.tm); MSG.tm = setTimeout(() => { MSG.cur = null; const n = MSG.next; MSG.next = null; if (n) showMsg(n.txt, n.prio, performance.now() / 1000); }, 1500);
}
function showOnly(id) {
  ['ranks', 'community'].forEach(k => $(k) && $(k).classList.add('hidden'));
  if (id === 'menu') sound.setMode('menu'); ['menu', 'over', 'win'].forEach(k => $(k).classList.toggle('hidden', k !== id)); $('hud').classList.toggle('hidden', !!id); $('toxinBtn').classList.toggle('hidden', !!id); }
// ------------------------------------------------------------------ ranking
const esc = (t) => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function boardHTML(rows, me) {
  if (!rows.length) return '<ol class="board"><li><span class="n">No scores yet. Be the first!</span></li></ol>';
  let marked = false;
  return '<ol class="board">' + rows.map(r => { const isMe = !marked && me && r.name === me.name && r.score === me.score; if (isMe) marked = true;
    return `<li class="${isMe ? 'me' : ''}"><span class="n">${esc(r.name)}</span><span class="p">${r.pearls} 🫧${r.won ? ' ✓' : ''}</span><b>${r.score}</b></li>`; }).join('') + '</ol>';
}
const noteText = (isOnline) => isOnline ? 'World ranking' : (LB.online() ? 'Offline: showing scores from this device' : 'Ranking on this device');
async function showBoard(el, lvl, me) {
  const box = el.querySelector('.boardBox'); if (!box) return;
  box.innerHTML = '<p>Loading ranking…</p>';
  const { rows, online } = await LB.topScores(lvl);
  box.innerHTML = boardHTML(rows, me) + `<p class="lbnote">${noteText(online)}</p>`;
}
// rankings: built-in levels 0..n, shared player levels 1000 + id, own unshared levels: none
const rankKey = () => levelIdx >= 0 ? levelIdx : level.cid ? 1000 + level.cid : null;
function renderRank(id, res) {
  const el = $(id); if (!el) return;
  if (rankKey() == null) { el.innerHTML = `<div class="score">${res.score} points</div>`; return; }
  el.innerHTML = `<div class="score">${res.score} points</div>
    <form class="saveForm"><input name="n" maxlength="16" autocomplete="nickname" placeholder="Your name" aria-label="Your name" value="${esc(LB.savedName())}"><button type="submit">Save</button></form>
    <div class="boardBox"></div>`;
  const form = el.querySelector('form'), input = form.querySelector('input'), btn = form.querySelector('button');
  form.onsubmit = async (e) => {
    e.preventDefault(); const name = LB.cleanName(input.value);
    if (!name) { input.focus(); return; }
    btn.disabled = true; btn.textContent = 'Saving…';
    try { const r = await LB.submitScore({ ...res, name, level: rankKey() }); form.remove(); sound.start(); if (r.failed) toast('Saved on this device'); showBoard(el, rankKey(), { name, score: res.score }); }
    catch (err) { btn.disabled = false; btn.textContent = 'Retry'; toast('Could not save'); }
  };
  showBoard(el, rankKey(), null);
}
let rankLvl = 0;
function openRanks() {
  ['menu', 'over', 'win'].forEach(k => $(k).classList.add('hidden')); $('ranks').classList.remove('hidden');
  const tabs = $('rankTabs'); tabs.innerHTML = '';
  STARTER_LEVELS.forEach((lv, i) => { const b = document.createElement('button'); b.textContent = `Level ${i + 1}`; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(i === rankLvl)); b.onclick = () => { rankLvl = i; openRanks(); }; tabs.appendChild(b); });
  $('rankList').innerHTML = '<p>Loading ranking…</p>'; $('rankNote').textContent = STARTER_LEVELS[rankLvl].name;
  LB.topScores(rankLvl).then(({ rows, online }) => { $('rankList').innerHTML = boardHTML(rows, null); $('rankNote').textContent = `${STARTER_LEVELS[rankLvl].name} · ${noteText(online)}`; });
}
if ($('ranksBtn')) $('ranksBtn').onclick = () => { rankLvl = Math.max(0, levelIdx); openRanks(); };
if ($('ranksClose')) $('ranksClose').onclick = () => { $('ranks').classList.add('hidden'); $('menu').classList.remove('hidden'); };
// ------------------------------------------------------------------ shared player levels
let commSort = 'new';
async function openCommunity() {
  ['menu', 'over', 'win', 'ranks'].forEach(k => $(k).classList.add('hidden')); $('community').classList.remove('hidden');
  const tabs = $('commTabs'); tabs.innerHTML = '';
  [['new', 'Newest'], ['plays', 'Most played'], ['likes', 'Most liked']].forEach(([k, l]) => { const b = document.createElement('button'); b.textContent = l; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(k === commSort)); b.onclick = () => { commSort = k; openCommunity(); }; tabs.appendChild(b); });
  const list = $('commList');
  if (!CM.communityOnline()) { list.innerHTML = '<p>Online levels are not set up.</p>'; return; }
  list.innerHTML = '<p>Loading levels…</p>';
  try {
    const rows = await CM.listLevels(commSort);
    if (!rows.length) { list.innerHTML = '<p>No shared levels yet. Build one in the level editor and tap "Share online"!</p>'; return; }
    list.innerHTML = '';
    rows.forEach(r => {
      const b = document.createElement('button'); b.className = 'clvl';
      b.innerHTML = `<span class="t"><b>${esc(r.name)}</b><small>by ${esc(r.author)} · ${r.length} m</small></span><span class="st">▶ ${r.plays} · 👍 ${r.likes}</span>`;
      b.onclick = async () => {
        b.disabled = true; b.querySelector('small').textContent = 'Loading…';
        try { const lv = await CM.fetchLevel(r.id); CM.countPlay(r.id); start(lv, -1); toast(`${lv.name} by ${lv.author}`); }
        catch (e) { b.disabled = false; toast('Could not load level'); }
      };
      list.appendChild(b);
    });
  } catch (e) { list.innerHTML = '<p>Could not load levels. Check your internet connection.</p>'; }
}
if ($('commBtn')) $('commBtn').onclick = openCommunity;
if ($('commClose')) $('commClose').onclick = () => { $('community').classList.add('hidden'); $('menu').classList.remove('hidden'); };
function renderLike() {
  const box = $('likeBox'); if (!box) return;
  if (!level.cid) { box.innerHTML = ''; return; }
  const done = CM.hasLiked(level.cid);
  box.innerHTML = `<button class="alt" ${done ? 'disabled' : ''}>${done ? '👍 Liked' : '👍 Like this level'}</button>`;
  box.querySelector('button').onclick = (e) => { if (CM.likeLevel(level.cid)) { e.target.textContent = '👍 Liked'; e.target.disabled = true; sound.pop(); } };
}
// typing a name must not steer Cubi or toggle sound/quality
addEventListener('keydown', (e) => { if (e.target instanceof HTMLInputElement) e.stopImmediatePropagation(); }, true);

function gameOver() {
  sound.over(); sound.setMode('over');
  mode = 'over'; stars.visible = true; caught = null; $('caught').classList.remove('show');
  $('overText').textContent = `${level.name}: ${Math.floor(s)} of ${level.length} m · ${pearls} pearls`;
  renderRank('overRank', { score: LB.computeScore({ pearls, distance: s, won: false, lives: 0 }), pearls, distance: s, won: false });
  setTimeout(() => { if (mode === 'over') { showOnly('over'); stars.visible = false; startParty(); } }, 1400);
}
function win() {
  mode = 'win'; startParty(); sound.win(); sound.setMode('win');
  const key = level.name; const prev = best[key] || 0;
  if (pearls > prev) { best[key] = pearls; try { localStorage.setItem('cubi_best', JSON.stringify(best)); } catch (e) {} }
  const ratio = pearlTotal ? pearls / pearlTotal : 1;
  const nStars = ratio >= 0.9 ? 3 : ratio >= 0.5 ? 2 : 1;
  $('winStars').innerHTML = [0, 1, 2].map(i => `<span class="star${i < nStars ? ' on' : ''}" aria-hidden="true">★</span>`).join('');
  $('winStars').setAttribute('aria-label', `${nStars} of 3 stars`);
  $('winText').textContent = `${level.name} · ${pearls}/${pearlTotal} pearls`;
  renderLike();
  renderRank('winRank', { score: LB.computeScore({ pearls, distance: level.length, won: true, lives }), pearls, distance: level.length, won: true });
  $('nextBtn').classList.toggle('hidden', levelIdx < 0 || levelIdx >= STARTER_LEVELS.length - 1);
  setTimeout(() => { if (mode === 'win') showOnly('win'); }, 1200);
}
function start(lv, idx) {
  if (typeof splash !== 'undefined' && splash.isConnected) { splash.remove(); } loadLevel(lv, idx); mode = 'play'; sound.start(); sound.setMode('play'); resetWorld(); showOnly(null); toast(level.name); updateHud(); }
function buildMenu() {
  const list = $('levels'); list.innerHTML = '';
  const add = (lv, idx, label) => {
    const b = document.createElement('button'); b.className = 'lvl';
    const bp = best[lv.name] != null ? ` · best ${best[lv.name]} pearls` : '';
    b.innerHTML = `<b>${label}</b><span>${lv.name}${bp}</span>`;
    b.onclick = () => start(lv, idx); list.appendChild(b);
  };
  STARTER_LEVELS.forEach((lv, i) => add(lv, i, `Level ${i + 1}`));
  const custom = loadCustom();
  if (custom) add(custom, -1, 'My level');
}
$('againBtn').onclick = () => start(level, levelIdx);
$('retryBtn').onclick = () => start(level, levelIdx);
$('nextBtn').onclick = () => start(STARTER_LEVELS[levelIdx + 1], levelIdx + 1);
[...document.querySelectorAll('.toMenu')].forEach(b => b.onclick = () => { mode = 'menu'; loadLevel(STARTER_LEVELS[0], 0); resetWorld(); buildMenu(); showOnly('menu'); });
buildMenu();
// language switch (flags) in the menu card and on the splash screen
{ const st = document.createElement('style'); st.textContent = LANG_CSS + '#menu .langSwitch{position:absolute;top:12px;right:14px}#menu{position:fixed}#menu h1{padding:0 96px}@media (max-width:480px){#menu h1{padding:0 0 0 0;margin-top:30px}}#splash .langSwitch{position:absolute;top:14px;right:14px;z-index:2}'; document.head.appendChild(st);
  $('menu').prepend(langSwitch()); }
onLangChange(() => {
  buildMenu();
  if (!$('ranks').classList.contains('hidden')) openRanks();
  if (!$('community').classList.contains('hidden')) openCommunity();
  sndUI(); updateHud();
});

// ------------------------------------------------------------------ splash screen
const splash = document.createElement('div');
splash.id = 'splash';
splash.innerHTML = `
  <style>
    #splash { position: fixed; inset: 0; z-index: 20; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: max(4vh, 18px) 16px max(5vh, 22px); pointer-events: auto; cursor: pointer; transition: opacity .5s; background: radial-gradient(ellipse at 50% 55%, rgba(255,255,255,0) 40%, rgba(10,60,100,.35) 100%); }
    #splash.gone { opacity: 0; pointer-events: none; }
    #splash .logo { text-align: center; line-height: .9; font-family: Fredoka, system-ui, sans-serif; filter: drop-shadow(0 6px 0 rgba(8,44,66,.35)); }
    #splash .l1 { display: block; font-size: clamp(54px, min(15vw, 15vh), 132px); font-weight: 700; color: #FFD23F; -webkit-text-stroke: clamp(4px, 1vw, 8px) #3B2614; paint-order: stroke fill; letter-spacing: .02em; }
    #splash .l2 { display: block; font-size: clamp(30px, min(8vw, 8vh), 70px); font-weight: 700; color: #5FE0D0; -webkit-text-stroke: clamp(3px, .7vw, 6px) #12324A; paint-order: stroke fill; margin-top: .1em; }
    #splash .l1 span, #splash .l2 span { display: inline-block; animation: bob 2.2s ease-in-out infinite; }
    @keyframes bob { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-8px) rotate(2deg); } }
    #splash .tap { font-family: Fredoka, system-ui, sans-serif; font-weight: 600; font-size: clamp(20px, 4.5vw, 28px); color: #12324A; background: #FFD23F; border: 3px solid #12324A; border-radius: 999px; padding: 12px 34px; box-shadow: 0 5px 0 #12324A; animation: pulse 1.4s ease-in-out infinite; }
    @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.07); } }
    #splash .bub { position: absolute; bottom: -40px; border-radius: 50%; border: 3px solid rgba(255,255,255,.85); background: rgba(255,255,255,.18); animation: rise linear infinite; pointer-events: none; }
    @keyframes rise { to { transform: translateY(-115vh) translateX(20px); } }
    @media (prefers-reduced-motion: reduce) { #splash * { animation: none !important; } }
  </style>
  <div class="logo" aria-label="Cubi's Reef Rush">
    <span class="l1">${[..."Cubi's"].map((c, i) => `<span style="animation-delay:${i * 0.12}s">${c}</span>`).join('')}</span>
    <span class="l2">${[..."Reef Rush"].map((c, i) => `<span style="animation-delay:${0.4 + i * 0.1}s">${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</span>
  </div>
  <button class="tap" id="tapStart">Tap to start</button>
  ${Array.from({ length: 14 }, (_, i) => `<span class="bub" aria-hidden="true" style="left:${(i * 7.3 + 3) % 100}%;width:${10 + (i * 7) % 26}px;height:${10 + (i * 7) % 26}px;animation-duration:${6 + (i * 3) % 7}s;animation-delay:${-(i * 1.3) % 8}s"></span>`).join('')}
`;
splash.prepend(langSwitch());
document.body.appendChild(splash);
let splashT = 0;
if (mode === 'splash') $('menu').classList.add('hidden');
function closeSplash() { if (mode !== 'splash') return; mode = 'menu'; splash.classList.add('gone'); setTimeout(() => splash.remove(), 600); showOnly('menu'); }
splash.addEventListener('pointerdown', (e) => { e.preventDefault(); closeSplash(); });
addEventListener('keydown', (e) => { if (mode === 'splash' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); closeSplash(); } });
// opened from the editor's "Play this level"
if (/[?&]play=custom/.test(location.search)) { const c = loadCustom(); if (c) setTimeout(() => start(c, -1), 50); }

// ------------------------------------------------------------------ resize
// colour grade: vibrance (lifts the dull colours most, so corals pop without over-cooking what is already vivid),
// a gentle S-curve for contrast, and a touch of warmth in the highlights against the blue water
const GRADE = { vib: { value: 0.5 }, sat: { value: 1.08 }, con: { value: 1.3 }, warm: { value: 0.6 } };
const gradePass = new ShaderPass({ uniforms: { tDiffuse: { value: null }, ...GRADE }, vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float vib, sat, con, warm; varying vec2 vUv;
    void main() { vec4 t = texture2D(tDiffuse, vUv); vec3 c = max(t.rgb, 0.0);
      vec3 s = pow(c, vec3(1.0 / 2.2));                                  // grade in display space
      float l = dot(s, vec3(0.2126, 0.7152, 0.0722)), mx = max(s.r, max(s.g, s.b)), mn = min(s.r, min(s.g, s.b));
      s = mix(vec3(l), s, sat + vib * (1.0 - (mx - mn)));               // vibrance + saturation
      s = clamp(s, 0.0, 1.0); s = mix(s, s * s * (3.0 - 2.0 * s), con - 1.0);   // S-curve contrast
      s += warm * vec3(0.04, 0.015, -0.03) * smoothstep(0.45, 1.0, l);
      gl_FragColor = vec4(pow(max(s, 0.0), vec3(2.2)), t.a); }` });
for (const k in GRADE) GRADE[k] = gradePass.uniforms[k];   // ShaderPass clones its uniforms: talk to the live ones
// soft bloom: only the brightest, glowing colours (coral tips, anemones, fish) get a halo of their own colour
const BLOOM = !/[?&]nobloom/.test(location.search);
let composer = null, bloomPass = null;
if (BLOOM) {
  const rt = new THREE.WebGLRenderTarget(16, 16, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.35, 0.93);
  composer.addPass(bloomPass);
  composer.addPass(gradePass);
  composer.addPass(new OutputPass());
}
renderer.info.autoReset = false;
// quality: HQ = bloom + sharper resolution, LQ = no bloom, 1x resolution (toggle with Q)
let hq = true; try { hq = localStorage.getItem('cubi_hq') !== 'low'; } catch (e) {}
const PR_CAP = matchMedia('(pointer: coarse)').matches ? 1.25 : 1.5;
scene.add(RS.fieldGroup);
const fieldRoots = [];
function renderFrame() { fieldRoots.length = 0; for (const o of objs) if (o.mesh.userData.corals) fieldRoots.push(o.mesh); RS.syncField(fieldRoots, camera.position); renderer.info.reset(); if (composer && hq) composer.render(); else renderer.render(scene, camera); }
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, hq ? PR_CAP : 1));
  renderer.setSize(w, h, false);
  if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
  camera.aspect = w / h;
  camera.fov = w / h < 0.8 ? 70 : w / h < 1.2 ? 64 : 56;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ------------------------------------------------------------------ loop
let last = performance.now();
const tmpV = new THREE.Vector3();
const camLook = new THREE.Vector3(0, 2, -2);
camera.position.set(0, 2.8, 3.2);
// FPS display (toggle with F); counts real frames over half-second windows
const fpsEl = document.createElement('div'); fpsEl.id = 'fps'; fpsEl.setAttribute('aria-hidden', 'true');
fpsEl.style.cssText = 'position:fixed;left:76px;bottom:28px;z-index:30;font:700 15px/1 system-ui,sans-serif;padding:7px 11px;border-radius:999px;background:rgba(255,255,255,.85);color:#1F7A3A;border:2px solid #3B2614;pointer-events:none;min-width:64px;white-space:nowrap;text-align:center';
let fpsOn = true; try { fpsOn = localStorage.getItem('cubi_fps') !== 'off'; } catch (e) {}
fpsEl.style.display = fpsOn ? 'block' : 'none'; document.body.appendChild(fpsEl);
addEventListener('keydown', (e) => { if (e.key === 'f' || e.key === 'F') { fpsOn = !fpsOn; fpsEl.style.display = fpsOn ? 'block' : 'none'; try { localStorage.setItem('cubi_fps', fpsOn ? 'on' : 'off'); } catch (err) {} } });
let fpsN = 0, fpsT = performance.now(), workMs = 0;
addEventListener('keydown', (e) => { if (e.key === 'q' || e.key === 'Q') { hq = !hq; try { localStorage.setItem('cubi_hq', hq ? 'high' : 'low'); } catch (err) {} resize(); toast(hq ? 'High quality' : 'Fast mode'); } });
function countFps(now) {
  fpsN++;
  if (now - fpsT >= 500) {
    const fps = Math.round(fpsN * 1000 / (now - fpsT)); const ms = workMs / Math.max(1, fpsN); fpsN = 0; fpsT = now; workMs = 0;
    if (fpsOn) { fpsEl.textContent = `${fps} FPS · ${ms.toFixed(1)} ms · ${hq ? 'HQ' : 'Fast'}`; fpsEl.style.color = fps >= 50 ? '#1F7A3A' : fps >= 30 ? '#9A6A00' : '#C0282A'; }
  }
}
function frame(now) {
  countFps(now);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const w0 = performance.now();
  step(dt);
  renderFrame();
  workMs += performance.now() - w0;
  requestAnimationFrame(frame);
}
function step(dt) {
  glowU.uGlowT.value += dt; causticClock.value += dt;
  t += dt;
  const progress = level.length ? Math.min(1, s / level.length) : 0;
  if (mode === 'play' || mode === 'caught') speed = THREE.MathUtils.lerp(level.speed, level.speedEnd, progress);
  // the whale shark visits twice per level: glides in from behind-ahead, slowly overtaken by Cubi, high off to one side
  if (mode === 'play' && whaleTimes.length && progress > whaleTimes[0]) {
    whaleTimes.shift(); const sd = Math.random() < 0.5 ? -1 : 1;
    spawn('whaleshark', sd * rf(5.5, 6.5), rf(5.8, 6.6), -46, { solid: false, scale: rf(2.2, 2.5), ry: -sd * 0.12, swim: [-sd * 0.12, -speed * 0.7] });
    toast('A whale shark is passing by!'); sound.whale();
  }
  else if (mode === 'menu' || mode === 'splash') speed = mode === 'splash' ? 3 : 5;
  else speed = Math.max(0, speed - dt * 6);
  const move = speed * dt;
  if (mode === 'play' || mode === 'caught') s += move;
  if (mode === 'play' && hungryCD > 0) hungryCD -= dt;
  if (mode === 'menu') menuS += move;
  if (mode === 'menu' || mode === 'splash' || mode === 'over' || mode === 'win') prewarmStep();
  if (mode === 'splash') splashT += dt;

  // spawn level items ahead
  if (mode === 'play' || mode === 'caught') {
    while (itemIdx < items.length && items[itemIdx].z - s <= SPAWN_AHEAD) { const it = items[itemIdx++]; if (!it.skip) spawnItem(it, -(it.z - s)); }
    if (!finishObj && level.length - s <= SPAWN_AHEAD) spawnFinish(-(level.length - s));
    if (!wreckDone && s > level.length * 0.35) { wreckDone = true; const sd = Math.random() < 0.5 ? -1 : 1; spawn('wreck', sd * 12.5, 0, -SPAWN_AHEAD, { solid: false, ry: sd > 0 ? 2.4 : 0.7, scale: 1.1 }); }
    if (s >= level.length && mode === 'play') win();
  }

  // the landscape steers: when the path bends, the corridor slides under Cubi (he keeps his heading) — follow it or bump into the reef
  if (mode === 'play') {
    const ddx = (relXRaw(s) - relXRaw(pathD)) * BEND, ddy = (relYRaw(s) - relYRaw(pathD)) * BEND_Y; pathD = s;
    if (Math.abs(ddx) < 1 && Math.abs(ddy) < 1) { P.x -= ddx; P.tx -= ddx; P.y -= ddy; P.ty -= ddy; if (drag) { drag.tx -= ddx; drag.ty = (drag.ty ?? P.ty) - ddy; } }
    const over = P.tx < B.minX ? B.minX - P.tx : P.tx > B.maxX ? B.maxX - P.tx : 0, overY = P.ty < B.minY ? B.minY - P.ty : P.ty > B.maxY ? B.maxY - P.ty : 0;
    if (over || overY) { P.tx += over; P.ty += overY;                                         // the reef edge pushes back …
      if (Math.abs(over) > 0.02 || Math.abs(overY) > 0.02) wallScrape(Math.sign(over), Math.sign(overY)); }   // … with a little bump
  } else pathD = s;
  // steering
  if (mode === 'play') {
    const kx = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0);
    const ky = (keys.arrowup || keys.w ? 1 : 0) - (keys.arrowdown || keys.s ? 1 : 0);
    if (kx || ky) { P.tx = THREE.MathUtils.clamp(P.tx + kx * 6.5 * dt, B.minX, B.maxX); P.ty = THREE.MathUtils.clamp(P.ty + ky * 5.5 * dt, B.minY, B.maxY); }
  } else if (mode === 'menu') { P.tx = Math.sin(t * 0.4) * 0.4; P.ty = 2.75 + Math.sin(t * 0.8) * 0.12; }
  else if (mode === 'splash') { P.tx = Math.sin(t * 0.5) * 0.25; P.ty = 2.6 + Math.sin(t * 0.9) * 0.15; }
  let ax = (P.tx - P.x) * 26 - P.vx * 7, ay = (P.ty - P.y) * 26 - P.vy * 7;
  let inStream = null;
  for (const o of objs) if (o.kind === 'stream' && o.z >= 0 && o.z - o.len <= 0) inStream = o;
  if (inStream && mode === 'play') { ax += inStream.dir[0] * inStream.strength; ay += inStream.dir[1] * inStream.strength; }
  if (mode === 'over') { ax = -P.vx * 3; ay = party ? (2.5 - P.y) * 4 - P.vy * 3 : -1.2 - P.vy * 2; }
  if (mode === 'win') { ax = -P.vx * 3; ay = (2.6 - P.y) * 6 - P.vy * 3; }
  if (mode !== 'caught') {
    P.vx += ax * dt; P.vy += ay * dt;
    P.x = THREE.MathUtils.clamp(P.x + P.vx * dt, B.minX - 0.6, B.maxX + 0.6);
    P.y = THREE.MathUtils.clamp(P.y + P.vy * dt, 0.55, B.maxY + 0.4);
  }

  // stream warning
  let warn = null;
  for (const o of objs) if (o.kind === 'stream' && o.z < 0 && o.z > -26) warn = o;
  const w = $('warn');
  if (mode === 'play' && (warn || inStream)) {
    const d = (warn || inStream).dir;
    w.textContent = d[0] > 0 ? 'Current  →' : d[0] < 0 ? '←  Current' : d[1] > 0 ? 'Current  ↑' : 'Current  ↓';
    w.classList.add('show'); w.classList.toggle('in', !!inStream);
  } else w.classList.remove('show');
  $('progress').style.width = (progress * 100).toFixed(1) + '%';

  // caught by a shark: 2 seconds to use the toxin
  if (mode === 'caught' && caught) {
    caught.t -= dt;
    const sh = caught.shark;
    P.x = sh.x; P.y = sh.y - 0.1;
    cubi.scale.setScalar(0.8);
    $('caughtBar').style.width = Math.max(0, caught.t / 2 * 100) + '%';
    shake = Math.max(shake, 0.08);
    if (caught.t <= 0) {
      const o = sh; caught = null; mode = 'play'; $('caught').classList.remove('show');
      cubi.scale.setScalar(1); makeSick(o); o.spitT = 0.4; P.vy = 5;
      lives--; invuln = 1.6; updateHud();
      if (lives <= 0) gameOver(); else toast('Chomp! Too slow…');
    }
  }

  // Cubi pose
  if (!party) cubi.position.set(P.x, P.y, mode === 'caught' ? 0.55 : 0);
  if (mode === 'over' && !party) { cubi.rotation.z += dt * 2.2; cubi.rotation.x = Math.sin(t * 3) * 0.2; }
  else if (mode === 'over') { /* end scene */ }
  else if (mode === 'menu') cubi.rotation.set(Math.sin(t * 1.1) * 0.08, Math.PI + Math.sin(t * 0.6) * 0.45, Math.sin(t * 0.9) * 0.06);
  else if (mode === 'splash') {
    // swims in from the distance, does a happy twirl, then says hi
    const k = Math.min(1, splashT / 1.8), e = 1 - Math.pow(1 - k, 3);
    cubi.position.z = -7 * (1 - e);
    const tw = splashT > 1.8 && splashT < 2.6 ? (splashT - 1.8) / 0.8 * Math.PI * 2 : 0;
    cubi.rotation.set(Math.sin(t * 1.1) * 0.08, Math.PI + tw + (splashT > 2.6 ? Math.sin(t * 0.7) * 0.35 : 0), Math.sin(t * 0.9) * 0.08);
    const sc = splashT > 2.6 ? 1 + Math.max(0, Math.sin((splashT - 2.6) * 6)) * 0.06 * Math.exp(-(splashT - 2.6)) : 1; cubi.scale.setScalar(sc);
    if (splashT > 2.6 && Math.random() < dt * 1.2) cubi.userData.chomp = 0.3;
  }
  else if (mode === 'win') { /* choreographed below */ }
  else if (mode === 'caught') cubi.rotation.set(Math.sin(t * 20) * 0.15, 0, Math.sin(t * 17) * 0.2);
  else {
    const boing = cubi.userData.boing || 0;
    if (boing > 0) cubi.userData.boing = boing - dt;
    const slope = Math.atan((relY(curD + 3) - relY(curD - 3)) / 6);
    cubi.rotation.set(THREE.MathUtils.clamp(P.vy * 0.06 + slope * 0.6, -0.5, 0.5), -P.vx * 0.05, -P.vx * 0.07 + Math.sin(boing * 40) * boing * 0.8);
  }
  M.animateFish(cubi, dt, mode === 'over' ? 0.1 : mode === 'caught' ? 1 : Math.min(1, 0.45 + Math.hypot(P.vx, P.vy) * 0.08));
  if (invuln > 0) { invuln -= dt; cubi.visible = Math.floor(t * 14) % 2 === 0 || invuln <= 0; bodyMat.emissive.setRGB(invuln > 1.2 ? 0.35 : 0, 0.02, 0.01); }
  else { cubi.visible = true; bodyMat.emissive.setRGB(0, 0, 0); }
  if (stars.visible) { stars.position.set(P.x, P.y + 0.75, 0); stars.children.forEach((st, i) => { const a = t * 3 + i * 2.1; st.position.set(Math.cos(a) * 0.6, Math.sin(a * 2) * 0.08, Math.sin(a) * 0.6); st.rotation.y += dt * 4; }); }

  updateHearts(dt);
  // blub bubbles
  cubi.updateMatrixWorld();
  if (cubi.userData.blub && cubi.visible && Math.random() < 0.6) emitBlub(1 + (Math.random() < 0.3 ? 1 : 0));
  if (cubi.userData.chomp > 0.28) emitBlub(3);
  blubs.forEach(b => {
    if (b.party) {
      if (b.life <= 0) { b.m.visible = false; b.party = false; return; }
      b.life -= dt; const p = b.m.position;
      p.addScaledVector(b.pv, dt); b.pv.multiplyScalar(Math.pow(0.45, dt));
      p.y += dt * 0.18; p.x += Math.sin(t * 2 + b.vx * 10) * dt * 0.08;
      if (p.x < P.x - 2.4 || p.x > P.x + 2.4) { b.pv.x = -b.pv.x * 0.7; p.x = THREE.MathUtils.clamp(p.x, P.x - 2.4, P.x + 2.4); }
      if (p.z < -2.2 || p.z > 0.9) { b.pv.z = -b.pv.z * 0.7; p.z = THREE.MathUtils.clamp(p.z, -2.2, 0.9); }
      if (p.y < P.y - 1.1 || p.y > P.y + 2.3) { b.pv.y = -b.pv.y * 0.7; p.y = THREE.MathUtils.clamp(p.y, P.y - 1.1, P.y + 2.3); }
      b.m.scale.setScalar(b.r * (1 + Math.sin(t * 5 + b.vx * 20) * 0.04));
      if (b.life <= 0) popBubble(b);
      return;
    }
    if (b.life <= 0) { b.m.visible = false; return; } b.life -= dt; b.m.position.y += dt * 0.9; b.m.position.x += Math.sin(t * 6 + b.vx * 10) * dt * 0.15 + b.vx * dt; b.m.position.z += move * 0.85; if (b.life < 0.2) b.m.scale.multiplyScalar(1 + dt * 4); });

  // toxin
  if (toxin.cd > 0) toxin.cd = Math.max(0, toxin.cd - dt);
  $('toxinBtn').style.setProperty('--cd', (toxin.cd / toxin.CD).toFixed(3));
  $('toxinBtn').classList.toggle('ready', toxin.cd <= 0 || mode === 'caught');
  toxin.puffs.forEach(p => {
    if (p.life <= 0) { p.m.visible = false; return; }
    p.life -= dt; p.m.position.addScaledVector(p.v, dt); p.v.multiplyScalar(Math.pow(0.15, dt)); p.m.position.z += move;
    p.m.scale.setScalar(0.25 + (1.6 - p.life) * 0.55); p.m.material.opacity = Math.min(0.7, p.life * 0.7);
  });

  // level complete: Cubi and the clownfish celebrate, facing the camera
  if ((mode === 'win' || mode === 'over') && party) updateParty(dt);

  // buddy
  if (buddy) {
    tmpV.set(P.x + 1.0, P.y + 0.35 + Math.sin(t * 2) * 0.1, 0.5);
    if (tmpV.distanceTo(cubi.position) < 0.95) tmpV.copy(cubi.position).add(_cv.copy(tmpV).sub(cubi.position).normalize().multiplyScalar(0.95));
    buddy.position.lerp(tmpV, 1 - Math.pow(0.002, dt));
    buddy.rotation.set(0, -P.vx * 0.06, -P.vx * 0.06);
    M.animateFish(buddy, dt, 0.7);
  }

  // decor
  if (mode !== 'over' && mode !== 'win') { nextDecor -= move; if (nextDecor <= 0) { decorRow(-SPAWN_AHEAD - 4); nextDecor = 3.5; } }

  // update objects
  for (let i = objs.length - 1; i >= 0; i--) {
    const o = objs[i];
    o.z += move;
    if (o.kind === 'jelly') { o.y0 ??= o.y; o.y = o.y0 + Math.sin(t * 1.4 + o.ph) * o.bob; M.animateJelly(o.mesh, dt); }
    if (o.kind === 'puffer') {
      o.z += o.vz * dt;
      // puffs up when Cubi comes close, slowly goes flat again afterwards
      const pd = Math.hypot(o.x - P.x, o.y - P.y, o.z);
      if (!o.sick) o.puff = pd < 3.0 ? Math.min(1, o.puff + dt * 4.5) : Math.max(0, o.puff - dt * 0.7);
      if (o.sick) o.puff = Math.max(0, o.puff - dt * 2);
      setPuff3D(o.mesh, o.puff); F3.animateFish3D(o.mesh.userData.a, dt); F3.animateFish3D(o.mesh.userData.b, dt);
      if (!o.sick) o.shapes = [sph(0, 0.42 * (1 + o.puff * 0.6) + o.puff * 0.1)];
    }
    if (o.kind === 'shark') updateShark(o, dt);
    if (o.mood) updateMood(o, dt);
    if (o.sick && !o.moray && !o.kraken) { o.x += o.flee * 5 * dt; o.y += 0.6 * dt; if (o.kind !== 'shark') o.mesh.rotation.z = o.flee * -0.4; }
    if (o.kind === 'anemone' && o.z > -40 && o.z < 10) M.animateAnemone(o.mesh, dt);
    { const c3 = o.mesh.userData.c3; if (c3 && o.z > -c3.far && o.z < 12) c3.anim(c3.m, dt); }
    if (o.mesh.userData.f3 && o.z > -45 && o.z < 12) F3.animateFish3D(o.mesh.userData.f3, dt);
    if (o.mesh.userData.anem && o.z > -40 && o.z < 10) RF.animateAnemone(o.mesh, dt, Math.abs(o.z) < 3.2 && Math.abs(o.x - P.x) < 2.8 && P.y < 3.2);
    if (o.xmas && o.z > -30) RF.animateXmas(o.mesh, dt, Math.abs(o.z) < 4.5 && Math.abs(o.x - P.x) < 3.6 && P.y < 3.4);
    if (o.kind === 'nudi' && o.z > -30) RF.animateNudi(o.mesh, dt);
    if (o.crosser) updateCrosser(o, dt);
    if (o.gate) updateGate(o, dt);
    if (o.moray) updateMoray(o, dt);
    if (o.kraken) updateKraken(o, dt);
    if (o.swim) {
      const w = o.kind === 'school' ? 1 : 0.3;
      o.x += (o.swim[0] + Math.sin(t * 0.45 + o.ph) * 0.9 * w) * dt; o.z += (o.swim[1] + Math.cos(t * 0.37 + o.ph) * 0.6 * w) * dt;
      o.y += Math.sin(t * 0.6 + o.ph * 2) * 0.35 * w * dt;
      o.mesh.rotation.y = (o.ry ?? 0) + Math.sin(t * 0.45 + o.ph) * 0.35 * w;
    }
    if (o.z > -48) {
      if (o.kind === 'school') M.animateSchool(o.mesh, dt);
      else if (o.kind === 'clam') M.animateClam(o.mesh, dt);
      else if (o.kind === 'vent') M.animateVent(o.mesh, dt);
      else if (o.kind === 'crab') RF.animateCrab(o.mesh, dt);
      else if (o.kind === 'seahorse') RF.animateSeahorse(o.mesh, dt);
      else if (o.kind === 'eel') RF.animateEel(o.mesh, dt);
      else if (o.kind === 'whale') RF.animateWhale(o.mesh, dt);
      else if (o.kind === 'whaleshark') CR.animateWhaleShark(o.mesh, dt);
      else if (o.kind === 'babyturtle') M.animateTurtle(o.mesh, dt);
      else if (o.kind === 'grazer' && o.z > -30) CR.animateGrazer(o.mesh, dt, Math.abs(o.z) < 4 && Math.abs(o.x - P.x) < 3.5);
      else if (o.kind === 'hammer' || o.kind === 'blacktip' || o.kind === 'whitetip') F3.animateFish3D(o.mesh, dt * (o.tail || 1));
      else if (o.kind === 'seasnake') CR.animateSeaSnake(o.mesh, dt);
    }
    if (o.kind === 'pearl') { o.mesh.children[0].rotation.y += dt * 2; o.mesh.position.y = o.y + Math.sin(t * 2 + o.ph) * 0.08; }
    if (o.kind === 'flee') { o.x += o.flee * 7 * dt; o.y += 2 * dt; o.mesh.rotation.y = o.flee * 1.3; M.animateFish(o.mesh, dt, 1); }
    if (o.kind === 'stream') updateStream(o);
    if (o.kind === 'finish') o.mesh.children.forEach((m, k) => { m.position.z = Math.sin(t * 3 + k) * 0.1; });

    const dd = curD - o.z, ox = relX(dd), oy = o.grounded ? groundAt(o.x, dd) : relY(dd);
    if (o.z > 1.0 && !o.pearl && !o.hazard && !o.mood && !o.crosser && !o.shapes.length && o.kind !== 'school' && o.kind !== 'finish') {   // never let the camera sit inside scenery
      const r = BIG_ROCKS.has(o.kind) ? (o.kind === 'wall' || o.kind === 'moundbig' ? 5.5 : 3.8) : 1.3 * (o.s || 1) + 0.4;
      o.mesh.visible = Math.hypot(o.x + ox - camera.position.x, o.z - camera.position.z) > r || o.z < 1.0; }
    o.mesh.position.x = o.x + ox; o.mesh.position.z = o.z;
    if (o.kind === 'stream') { o.mesh.position.y = oy; o.chev.position.set(ox, oy, 0); }
    else if (o.kind === 'pearl') o.mesh.position.y += oy;
    else o.mesh.position.y = o.y + oy;
    if (o.clown && !o.clownTaken) { o.clownOff = [ox, oy]; }
    if (o.clown && !o.clownTaken) {
      const co = o.clownOff || [0, 0]; o.clown.position.set(o.x + co[0] + Math.sin(t * 1.2) * 0.25, 1.15 + co[1] + Math.sin(t * 2) * 0.12, o.z + Math.cos(t * 1.2) * 0.25);
      o.clown.rotation.y = t * 0.8; M.animateFish(o.clown, dt, 0.4);
      if (mode === 'play' && Math.abs(o.z) < 1.6 && Math.abs(P.x - o.x) < 1.8 && P.y < 3.0) {
        o.clownTaken = true;
        if (!buddy) { buddy = o.clown; buddy.rotation.set(0, 0, 0); toast('Clownfish buddy!'); }
        else { scene.remove(o.clown); if (lives < 3) { lives++; toast('+1 heart'); } }
        updateHud();
      }
    }
    // collisions
    if (mode === 'play' && Math.abs(o.z) < 2.4) {
      if (o.pearl && !o.hit) {
        const dx = P.x - o.x, dy = P.y - o.y, dz = o.z;
        if (dx * dx + dy * dy + dz * dz < 0.9) { o.hit = true; pearls++; sound.pearl(); cubi.userData.chomp = 0.3; updateHud(); o.z = 99; }
      } else if ((!o.hit || (o.rehit && t > o.rehit)) && o.shapes.length && hitShape(o)) { o.rehit = 0;
        o.hit = true;
        if (o.hazard) hurt(); else if (o.bumpY) bumpY(o); else if (o.bump) bump(o);
      }
    }
    if (o.z > 9 || o.gone || (o.swim && Math.abs(o.x) > (o.maxX || 18)) || (o.sick && Math.abs(o.x) > 16) || (o.kind === 'flee' && Math.abs(o.x) > 14)) { if (o === finishObj) finishObj = null; despawn(o); objs.splice(i, 1); }
  }

  // ambient
  const sp = snowGeo.attributes.position.array;
  for (let i = 0; i < SNOW; i++) { sp[i * 3 + 2] += move + dt * 0.3; sp[i * 3 + 1] -= dt * 0.05; if (sp[i * 3 + 2] > 6) { sp[i * 3 + 2] -= 66; sp[i * 3 + 1] = Math.random() * 10; } if (sp[i * 3 + 1] < 0) sp[i * 3 + 1] = 10; }
  snowGeo.attributes.position.needsUpdate = true;
  RF.reefClock.value = t;
  drawInk(dt);
  curD = (mode === 'play' || mode === 'caught' || mode === 'over' || mode === 'win') ? s : menuS; baseX = relXRaw(curD); baseY = relYRaw(curD);
  updateTerrain();
  ground.userData.update(move, (x, z) => groundAt(x, curD - z), (z) => relX(curD - z)); glitter.userData.update(move, t); bokeh.userData.update(dt, t, camera);
  sand.offset.y += move / 6;
  caus.offset.y += move / 2.727 + dt * 0.02; caus.offset.x = Math.sin(t * 0.3) * 0.15;
  surfMat.uniforms.uTime.value = t; surfMat.uniforms.uOff.value -= move; surfMat.uniforms.uCam.value.copy(camera.position); surface.position.x = camera.position.x;
  rays.children.forEach(r => { if (r.isSprite) return; r.material.opacity = 0.1 + Math.sin(t * 0.6 + r.userData.ph) * 0.05; r.rotation.z = r.userData.rz + Math.sin(t * 0.25 + r.userData.ph) * 0.04; });
  rays.position.x = P.x * 0.5;
  M.animateSeaweed(t);

  // camera
  const portrait = camera.aspect < 0.8;
  let cx, cy, cz, lx, ly, lz;
  if (mode === 'splash') { cx = P.x * 0.5; cy = P.y + 0.1; cz = portrait ? 4.4 : 3.6; lx = P.x * 0.5; ly = P.y + (portrait ? -0.05 : 0.55); lz = -2; }
  else if (mode === 'win' || (mode === 'over' && party)) { const wide = camera.aspect > 1.25; const mx = P.x + 0.78; cx = mx; cy = P.y + 0.2; cz = portrait ? 5.2 : 4.4; lx = mx + (wide ? 1.9 : 0); ly = P.y - (portrait ? 0.95 : wide ? 0.05 : 0.45); lz = -2; }
  else if (mode === 'menu') { const wide = camera.aspect > 1.25; cx = P.x * 0.6; cy = P.y + 0.05; cz = portrait ? 3.7 : 3.0; lx = P.x * 0.6 + (wide ? 1.15 : 0); ly = P.y - (portrait ? 0.75 : wide ? 0.05 : 0.35); lz = -2; }
  else { cx = P.x * 0.5; cy = P.y * 0.55 + (portrait ? 2.5 : 2.15); cz = portrait ? 5.2 : 4.2; lx = P.x * 0.75; ly = P.y * 0.7 + (portrait ? 0.55 : 0.3); lz = -8; }
  const k = 1 - Math.pow(0.002, dt);
  camera.position.x += (cx - camera.position.x) * k;
  camera.position.y += (cy - camera.position.y) * k;
  camera.position.z += (cz - camera.position.z) * k;
  if (mode !== 'menu' && mode !== 'splash' && mode !== 'win') { const ahead = relY(curD + 12); ly += ahead * 0.55; cy += Math.max(-1.2, ahead * 0.15); }
  // roofs and ledges: keep the camera on Cubi's side of the rock (below a tunnel roof, under or over a ledge)
  if (mode === 'play' || mode === 'over') for (const o of objs) { const sh = o.shapes && o.shapes[0]; if (!sh || sh.t !== 'b' || o.z < -1.5 || o.z > 7.5) continue;
    if (cx < sh.x0 - 0.6 || cx > sh.x1 + 0.6) continue;
    const oy = relY(curD - o.z), cp = camera.position; if (P.y < sh.y0) cp.y = Math.min(cp.y, sh.y0 + oy - 0.35); else if (cp.y < sh.y1 + oy + 0.5) cp.y = Math.max(cp.y, sh.y1 + oy + 0.5); }
  if (mode === 'play' || mode === 'over') camera.position.y = Math.max(camera.position.y, groundAt(camera.position.x, curD - camera.position.z) + 0.5);   // and never under the sand
  camLook.x += (lx - camLook.x) * k; camLook.y += (ly - camLook.y) * k; camLook.z += (lz - camLook.z) * k;
  if (shake > 0) { shake -= dt; camera.position.x += (Math.random() - 0.5) * shake * 0.6; camera.position.y += (Math.random() - 0.5) * shake * 0.6; }
  camera.lookAt(camLook);
  sun.position.set(P.x + 4, 12, 6); sun.target.position.set(P.x, 0, -2);
}

function nearestBubble(pos, maxD) {
  let best = null, bd = maxD;
  for (const b of blubs) { if (b.life <= 0.15 || !b.m.visible) continue; const d = b.m.position.distanceTo(pos); if (d < bd) { bd = d; best = b; } }
  return best;
}
function popBubble(b) { sound.pop(); b.life = 0; b.party = false; if (party && party.cur === b) party.cur = null; b.m.visible = false; popHeart(b.m.position.x, b.m.position.y + 0.1, b.m.position.z, 0.35); }
const _pt = new THREE.Vector3(), _cv = new THREE.Vector3();
const _hv = new THREE.Vector3(), _cv2 = new THREE.Vector3();
// face along a velocity (models look down -Z), with pitch and a gentle bank into turns
function steerFace(obj, v, st, dt, bankK = 0.35) {
  obj.rotation.order = 'YXZ';
  const sp = Math.hypot(v.x, v.z);
  if (sp > 0.05) {
    const yaw = Math.atan2(-v.x, -v.z), prev = obj.rotation.y;
    obj.rotation.y = angLerp(prev, yaw, 1 - Math.pow(0.02, dt));
    const turn = Math.atan2(Math.sin(obj.rotation.y - prev), Math.cos(obj.rotation.y - prev)) / Math.max(dt, 1e-3);
    st.bank = THREE.MathUtils.lerp(st.bank || 0, THREE.MathUtils.clamp(-turn * bankK, -0.5, 0.5), 1 - Math.pow(0.05, dt));
  }
  obj.rotation.x = THREE.MathUtils.lerp(obj.rotation.x, THREE.MathUtils.clamp(v.y * 0.35, -0.45, 0.45), 1 - Math.pow(0.05, dt));
  obj.rotation.z = st.bank || 0;
}
function updateParty(dt) {
  const pt = (party.t += dt);
  const c = party.clown;
  party.cx ??= THREE.MathUtils.clamp(P.x, -0.3, 0.3); party.cy ??= THREE.MathUtils.clamp(P.y, 1.8, 3.0);
  party.cubiSt ||= {}; party.clownSt ||= { v: new THREE.Vector3() };
  // Cubi: slow, lazy loops through the scene (toward the camera, sideways, away) so we see it from every side
  const w = 0.42, k = Math.min(1, pt / 1.5);
  _hv.set(party.cx + Math.sin(pt * w) * 1.3 * k, party.cy + Math.sin(pt * w * 2) * 0.3 * k + Math.sin(pt * 1.6) * 0.04, -0.35 * k - Math.cos(pt * w) * 0.85 * k + (1 - k) * cubi.position.z);
  const cv = _cv2.copy(_hv).sub(cubi.position).divideScalar(Math.max(dt, 1e-3));
  cubi.position.lerp(_hv, 1 - Math.pow(0.02, dt));
  if (pt > 0.3) steerFace(cubi, cv, party.cubiSt, dt, 0.3);
  P.x = party.cx; P.y = party.cy;                           // bubbles stay around the centre of the stage
  // blow a bubble every now and then (from Cubi's mouth, wherever it is facing)
  const live = blubs.filter(b => b.party && b.life > 0).length;
  if (pt > 1.0 && (party.nextBlow ??= 1.0) < pt && live < 4) {
    party.nextBlow = pt + 1.4 + Math.random() * 1.0; cubi.userData.chomp = 0.3; sound.blub();
    cubi.updateMatrixWorld(); const mouth = new THREE.Vector3(0, -0.12, -0.7).applyMatrix4(cubi.matrixWorld);
    emitPartyBubble(mouth.x, mouth.y, mouth.z);
  }
  // clownfish: pick a bubble, boop it away, follow it, boop again ... until it bursts; then the next one
  let target;
  if (party.cur && !(party.cur.party && party.cur.life > 0)) party.cur = null;
  if (!party.cur && pt > 1.3) { let bd = 9; for (const b of blubs) if (b.party && b.life > 0 && b.m.position.distanceTo(cubi.position) > 0.7) { const d = b.m.position.distanceTo(c.position); if (d < bd) { bd = d; party.cur = b; } } }
  const bub = party.cur;
  if (bub) {
    const bp = bub.m.position;
    party.dir ||= new THREE.Vector3();
    if (!bub.dirSet) { bub.dirSet = true; const away = bp.x >= party.cx ? 1 : -1; party.dir.set(away * (0.6 + Math.random() * 0.5) * (Math.abs(bp.x - party.cx) > 2.2 ? -1 : 1), 0.3 + Math.random() * 0.6, (Math.random() - 0.5) * 0.6).normalize(); }
    target = _pt.copy(bp).addScaledVector(party.dir, -0.32);
    if (c.position.distanceTo(bp) < 0.38 && pt > (party.nextBoop || 0)) {
      party.nextBoop = pt + 0.45; party.happy = pt;
      if (++bub.nudges >= bub.maxN) popBubble(bub);
      else { bub.pv.copy(party.dir).multiplyScalar(1.2 + Math.random() * 0.6); sound.boop(); bub.dirSet = false; }
    }
  } else {
    // no bubble: swim a playful little orbit around Cubi
    const a = pt * 0.9;
    target = _pt.set(cubi.position.x + Math.cos(a) * 1.4, cubi.position.y + 0.35 + Math.sin(a * 1.7) * 0.25, cubi.position.z + Math.sin(a) * 0.9);
  }
  // natural steering (spring + drag) instead of snapping, and never overlap Cubi
  const st = party.clownSt, kS = pt < 1.3 ? 3 : bub ? 9 : 5;
  st.v.addScaledVector(_cv2.copy(target).sub(c.position), kS * dt).multiplyScalar(Math.pow(bub ? 0.12 : 0.2, dt));
  if (st.v.length() > 3.2) st.v.setLength(3.2);
  c.position.addScaledVector(st.v, dt);
  _cv2.copy(c.position).sub(cubi.position); const dd = _cv2.length();
  if (dd < 1.0) { c.position.copy(cubi.position).addScaledVector(_cv2.normalize(), 1.0); st.v.addScaledVector(_cv2, 1.5); }
  steerFace(c, st.v, st, dt, 0.4);
  const wig = party.happy && pt - party.happy < 0.5 ? Math.sin((pt - party.happy) * 30) * 0.2 : 0;
  c.rotation.z += wig;
  M.animateFish(c, dt, 0.4 + Math.min(0.6, st.v.length() * 0.25));
}
function updateHearts(dt) {
  hearts.forEach(h => {
    if (h.life <= 0) { h.m.visible = false; return; }
    h.life -= dt; const age = 1.6 - h.life;
    h.m.position.y += dt * 0.8; h.m.position.x += h.vx * dt + Math.sin(age * 6) * dt * 0.2;
    const s = h.m.userData.s * Math.min(1, age * 6) * (1 + Math.sin(age * 10) * 0.08) * (h.life < 0.3 ? h.life / 0.3 : 1);
    h.m.scale.setScalar(Math.max(0.001, s)); h.m.rotation.set(0, Math.sin(age * 3) * 0.4, Math.sin(age * 4) * 0.15);
  });
}

// --- swim-through wreck: the hull nudges Cubi toward the hole
function updateGate(o, dt) {
  if (mode !== 'play' || Math.abs(o.z) > RF.GATE.depth / 2 + B.r) return;
  const inX = Math.abs(P.x - o.hx) < RF.GATE.halfW - B.r * 0.6, inY = P.y > RF.GATE.y0 + B.r * 0.6 && P.y < RF.GATE.y1 - B.r * 0.6;
  if (inX && inY) { if (!o.through) { o.through = true; toast('Through the wreck!'); } return; }
  const cy = (RF.GATE.y0 + RF.GATE.y1) / 2;
  P.vx += (o.hx - P.x) * 10 * dt * 6; P.vy += (cy - P.y) * 10 * dt * 6;
  P.tx = THREE.MathUtils.lerp(P.tx, o.hx, 0.25); P.ty = THREE.MathUtils.lerp(P.ty, cy, 0.25);
  if (!o.bumped) { o.bumped = true; shake = Math.max(shake, 0.15); cubi.userData.boing = 0.35; }
}
const _mv = new THREE.Vector3(), _mv2 = new THREE.Vector3(), _mv3 = new THREE.Vector3();
// --- moray: peeks from its rock, then lunges across the lane edge
function updateMoray(o, dt) {
  o.mt += dt; const m = o.mesh; m.userData.t += dt;
  let out = 0.15 + Math.sin(o.mt * 2) * 0.03, open = 0.1;
  if (o.phase === 'peek' && o.z > -14 && !o.warned && mode === 'play') { o.warned = true; toast('Moray eel ahead!', 2); }
  if (o.phase === 'peek' && o.z > -2.6 && mode === 'play') { o.phase = 'lunge'; o.mt = 0; }
  if (o.phase === 'lunge') { const k = o.mt; out = k < 0.22 ? 0.15 + (k / 0.22) * 0.85 : k < 0.6 ? 1 : Math.max(0.15, 1 - (k - 0.6) / 0.6 * 0.85); open = k < 0.6 ? 1 : 0.2; if (k > 1.3) o.phase = 'done'; }
  if (o.phase === 'done' || o.sick) { out = Math.max(0, (m.userData.out || 0.15) - dt * 0.8); open = 0; }
  RF.setMoray(m, out, open);
  // hazard: the stretched-out body
  if (mode === 'play' && o.phase === 'lunge' && out > 0.5 && !o.sick && invuln <= 0 && Math.abs(o.z) < 3) {
    m.updateMatrixWorld(true);
    const head = m.userData.segs[0].getWorldPosition(_mv), base = m.userData.eel.getWorldPosition(_mv2);
    // distance from Cubi to the eel's body (segment base -> head)
    _mv3.set(P.x, P.y, 0); const ab = head.clone().sub(base); const tt = THREE.MathUtils.clamp(_mv3.clone().sub(base).dot(ab) / ab.lengthSq(), 0, 1);
    const cpt = base.clone().addScaledVector(ab, tt);
    if (cpt.distanceTo(_mv3) < 0.32 + B.r) hurt('Chomp! Moray!');
  }
}
// --- crossers (hammerhead, sea snake): wait at the side, then swim across the lane so they pass Cubi's spot right on time
function updateCrosser(o, dt) {
  if (o.sick) { o.mesh.rotation.y = o.flee > 0 ? -Math.PI / 2 : Math.PI / 2; return; }
  if (!o.go) {
    o.x = -o.crosser * 12;
    if (o.z > -24) { o.go = true; o.vx = o.crosser * 12 / (24 / Math.max(speed, 2)); if (mode === 'play') { toast(o.warn, 2); sound.warn(); } }
  } else o.x += o.vx * dt;
  if (mode === 'play' && invuln <= 0 && Math.abs(o.z) < 1.6) {
    const s = o.s, cx = o.x + o.crosser * o.cOff * s, along = THREE.MathUtils.clamp(P.x - cx, -o.halfL * s, o.halfL * s);
    if (Math.hypot(P.x - cx - along, P.y - o.y, o.z) < o.rad * s + B.r) hurt(o.kind === 'seasnake' ? 'Zap! Sea snake!' : 'Bonk! Reef shark!');
  }
}
// --- kraken: hovers ahead, squirts ink, then jets away
const inkCv = document.createElement('canvas');
inkCv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:5';
document.body.appendChild(inkCv);
const inkCtx = inkCv.getContext('2d');
const ink = { level: 0, blobs: [] };
function squirtInk() {
  ink.level = 1; ink.blobs = [];
  for (let i = 0; i < 18; i++) ink.blobs.push({ x: Math.random(), y: 0.15 + Math.random() * 0.75, r: 0.18 + Math.random() * 0.3, vx: (Math.random() - 0.5) * 0.05, vy: (Math.random() - 0.5) * 0.04, ph: Math.random() * 6 });
  toast('Inked!'); shake = Math.max(shake, 0.2);
}
const FOG0 = { near: scene.fog.near, far: scene.fog.far }, inkFogCol = new THREE.Color('#2E4A6A'), fogCol0 = scene.fog.color.clone();
function drawInk(dt) {
  const fk = Math.min(1, ink.level * 1.5);
  scene.fog.near = THREE.MathUtils.lerp(FOG0.near, 0.5, fk); scene.fog.far = THREE.MathUtils.lerp(FOG0.far, 9, fk);
  scene.fog.color.copy(fogCol0).lerp(inkFogCol, fk);
  const w = inkCv.clientWidth, h = inkCv.clientHeight;
  if (ink.level <= 0) { if (inkCv.width) { inkCv.width = 0; } return; }
  if (inkCv.width !== w) { inkCv.width = w; inkCv.height = h; }
  ink.level = Math.max(0, ink.level - dt / 4.2);
  const a = Math.min(1, ink.level * 1.6) * 0.58;
  inkCtx.clearRect(0, 0, w, h);
  const S = Math.max(w, h);
  ink.blobs.forEach(b => {
    b.x += b.vx * dt; b.y += b.vy * dt; const r = b.r * S * (1.1 + (1 - ink.level) * 0.5) * (1 + Math.sin(t * 2 + b.ph) * 0.05);
    const gr = inkCtx.createRadialGradient(b.x * w, b.y * h, 0, b.x * w, b.y * h, r);
    gr.addColorStop(0, `rgba(34,40,62,${a})`); gr.addColorStop(0.6, `rgba(40,48,72,${a * 0.8})`); gr.addColorStop(1, 'rgba(40,48,72,0)');
    inkCtx.fillStyle = gr; inkCtx.beginPath(); inkCtx.arc(b.x * w, b.y * h, r, 0, Math.PI * 2); inkCtx.fill();
  });
}
function updateKraken(o, dt) {
  const move = speed * dt;
  const k = o.mesh; RF.animateKraken(k, dt); o.mt += dt;
  k.userData.squirt = Math.max(0, k.userData.squirt - dt * 2);
  if (o.phase === 'wait') {
    if (o.z > -30 && !o.warned && mode === 'play') { o.warned = true; toast('Kraken!', 2); }
    if (o.z > -13) { o.z = -13; o.hold = (o.hold || 0) + dt; }        // hovers ahead of Cubi, glaring…
    if (o.hold > 1.3 && mode === 'play') { o.phase = 'squirt'; o.mt = 0; k.userData.squirt = 1; squirtInk(); }
  } else if (o.phase === 'squirt') {
    o.z -= move;
    if (o.mt > 0.6) { o.phase = 'flee'; o.mt = 0; }
  } else {                                     // jets up and away
    o.y += dt * 3.5; o.z -= dt * 6; k.rotation.x = -0.4;
    if (o.y > 14) o.z = 99;
  }
  if (o.sick && o.phase !== 'flee') o.phase = 'flee';
  if (mode === 'play' && !o.sick && invuln <= 0 && Math.abs(o.z) < 1.4 && Math.hypot(P.x - o.x, P.y - (o.y - 0.4)) < 1.3) hurt('Tangled by the kraken!');
}

function updateShark(o, dt) {
  const u = o.mesh.userData;
  M.animateShark(o.mesh, dt, 1);
  if (o.sick) { // swims away sideways, spitting
    o.mesh.rotation.y = THREE.MathUtils.lerp(o.mesh.rotation.y, o.flee * Math.PI / 2, dt * 3);
    if (o.spitT > 0) { o.spitT -= dt; M.setSharkMouth(o.mesh, 0.6); } else M.setSharkMouth(o.mesh, 0.1);
    o.z -= 2 * dt;
    return;
  }
  if (caught && caught.shark === o) { o.z = 1.2; M.setSharkMouth(o.mesh, 0.15 + Math.abs(Math.sin(t * 9)) * 0.1); o.mesh.rotation.z = Math.sin(t * 8) * 0.08; return; }
  o.z += o.vz * dt;
  // homes in on Cubi once close
  if (o.z > -16 && mode === 'play') {
    o.x += THREE.MathUtils.clamp(P.x - o.x, -1, 1) * 2.4 * dt;
    o.y += THREE.MathUtils.clamp(P.y - o.y, -1, 1) * 2.0 * dt;
    const open = THREE.MathUtils.clamp((o.z + 10) / 8, 0, 1);
    M.setSharkMouth(o.mesh, open);
    o.mesh.rotation.y = THREE.MathUtils.clamp(P.x - o.x, -1, 1) * 0.25;
    if (!o.warned) { o.warned = true; toast('Shark! Press Space / tap Toxin'); }
  }
  if (mode === 'play' && invuln <= 0 && o.z > -0.8 && o.z < 1.4 && Math.hypot(P.x - o.x, P.y - o.y) < 1.15) {
    caught = { shark: o, t: 2.0 }; mode = 'caught';
    M.setSharkMouth(o.mesh, 0.2);
    $('caught').classList.add('show'); shake = 0.3;
  }
}

// ================= SHARKS WITH MOODS =================
// patrol: a few reef sharks cruising together · rest: whitetips lying on the sand by the reef edge ·
// curious: one swims close past Cubi and turns away · hungry (max one): stalks ahead, warns, lunges — a bite costs a life,
// unless Cubi hides (tunnel, under a ledge, tight in the coral at the reef edge, next to a coral head) or sprays toxin
function sharkLife(z, side) {
  const sp = Math.random() < 0.6 ? 'blacktip' : 'whitetip';
  if (Math.random() < 0.035) {                                                          // patrol group
    const n = 2 + Math.floor(Math.random() * 3), dir = Math.random() < 0.5 ? 1 : -1, along = Math.random() < 0.5, y0 = rf(4.4, 6.4), x0 = side * rf(6, 10);
    for (let k = 0; k < n; k++) { const kk = Math.random() < 0.8 ? sp : (sp === 'blacktip' ? 'whitetip' : 'blacktip');
      if (along) spawn(kk, x0 + rf(-1.5, 1.5), y0 + rf(-0.6, 0.6), z - k * rf(1.6, 2.6), { solid: false, scale: rf(0.95, 1.25), mood: 'patrol', ry: 0, swim: [rf(-0.2, 0.2), -rf(2.2, 3.4)], noRes: true });
      else spawn(kk, -dir * (12 + k * rf(1.6, 2.4)), y0 + rf(-0.6, 0.6), z + rf(-1.5, 1.5), { solid: false, scale: rf(0.95, 1.25), mood: 'patrol', ry: -dir * Math.PI / 2, swim: [dir * rf(2.2, 3), 0], maxX: 20, noRes: true }); }
  }
  if (Math.random() < 0.04) { const n = Math.random() < 0.5 ? 1 : 2;                     // whitetips resting on the sand
    for (let k = 0; k < n; k++) spawn('whitetip', side * rf(3.1, 4.6), 0.18, z + k * rf(1.2, 2), { solid: false, scale: rf(0.9, 1.1), mood: 'rest', ry: rf(0, 6), noRes: true }); }
  if (Math.random() < 0.02) spawn(sp, side * rf(7, 10), rf(2.2, 4), z, { solid: false, scale: rf(1, 1.2), mood: 'curious', phase: 'in', side, noRes: true });
  if (mode === 'play' && !hungry && hungryCD <= 0 && s > 120 && Math.random() < 0.01) hungryShark(z + 10, side * 6);
}
function hungryShark(z, x) {
  if (hungry || mode !== 'play') return;
  const was = decorMap; decorMap = false;
  hungry = spawn('blacktip', THREE.MathUtils.clamp(x, -6, 6), 3.2, Math.min(z, -24), { solid: false, scale: 1.65, mood: 'hungry', phase: 'approach', pt: 0, shark: true, noRes: true, ry: Math.PI - Math.sign(x || 1) * 0.35 });
  hungry.hd = hungry.mesh.rotation.y; hungry.spd = 3;
  decorMap = was;
  const w = $('sharkwarn'); if (w) w.querySelector('span').textContent = hungryTipShown ? 'Hungry shark!' : 'Hungry shark – hide in a tunnel, under a ledge or low in the coral, or use toxin'; hungryTipShown = true;
}
function inCover() {
  if (Math.abs(P.x) > 2.0 && P.y < 2.0) return true;                                     // tucked low into the coral at the reef edge
  for (const o of objs) { if (Math.abs(o.z) > 1.7) continue;
    if (o.cover) return true;                                                           // tunnel
    const sh = o.shapes && o.shapes[0];
    if (sh && sh.t === 'b' && sh.y0 < 3.5 && P.y < sh.y0 && P.x > sh.x0 - 0.3 && P.x < sh.x1 + 0.3) return true;   // under a ledge
    if (o.bump && Math.hypot(P.x - o.x, o.z) < 1.6) return true;                        // pressed against a coral head or the ridge
  }
  return false;
}
// shark locomotion: a glider. It always swims forward along its heading, turns in wide arcs (limited turn rate),
// leans into the turn, changes depth gently, and speeds up or slows down smoothly. Tail beat follows its speed.
function glide(o, tx, ty, tz, cruise, turn, dt, move) {
  if (o.hd === undefined) { o.hd = o.mesh.rotation.y; o.spd = o.spd ?? cruise; o.roll = 0; o.mesh.rotation.order = 'YXZ'; }
  const want = Math.atan2(-(tx - o.x), -(tz - o.z)); let dh = Math.atan2(Math.sin(want - o.hd), Math.cos(want - o.hd));
  const step = THREE.MathUtils.clamp(dh, -turn * dt, turn * dt); o.hd += step;
  o.spd += (cruise - o.spd) * Math.min(1, dt * (cruise > o.spd ? 1.6 : 0.7));
  const dy = THREE.MathUtils.clamp(ty - o.y, -1, 1) * 0.6; o.y += dy * dt;
  o.x += -Math.sin(o.hd) * o.spd * dt; o.z += -Math.cos(o.hd) * o.spd * dt - move;
  o.roll += ((-step / Math.max(dt, 1e-4)) * 0.35 - o.roll) * Math.min(1, dt * 3);
  o.mesh.rotation.y = o.hd; o.mesh.rotation.x = THREE.MathUtils.lerp(o.mesh.rotation.x, -dy * 0.25, Math.min(1, dt * 2)); o.mesh.rotation.z = THREE.MathUtils.clamp(o.roll, -0.35, 0.35);
  o.tail = 0.55 + o.spd / 5;   // tail beat rate for the animation
  return Math.hypot(tx - o.x, tz - o.z);
}
const facing = (o) => { const want = Math.atan2(-(P.x - o.x), -(0 - o.z)); return Math.abs(Math.atan2(Math.sin(want - o.hd), Math.cos(want - o.hd))); };
function updateMood(o, dt) {
  const move = (mode === 'play' || mode === 'caught') ? speed * dt : 0;
  if (o.mood === 'patrol') { o.mesh.rotation.y = Math.atan2(-o.swim[0], -o.swim[1]) + Math.sin(t * 0.6 + o.ph) * 0.06; o.tail = 0.9; return; }
  if (o.mood === 'rest') { o.mesh.rotation.z = Math.sin(t * 0.8 + o.ph) * 0.03; o.tail = 0.25; return; }
  if (o.mood === 'curious') {                                                           // glides in, passes alongside, peels away
    if (o.phase === 'in') { if (glide(o, o.side * 3.2, Math.max(1.6, P.y + 0.4), 2, 3.4, 0.7, dt, 0) < 2 || o.z > 0.5) o.phase = 'out'; }
    else { glide(o, o.side * 16, 4.5, o.z - 12, 3.8, 0.6, dt, 0); if (Math.abs(o.x) > 13 || o.z > 9) o.gone = true; }
    return;
  }
  if (o.mood !== 'hungry') return;
  // ---- the hungry one: lazy passes across the lane ahead of Cubi, getting closer — then one burst at him
  const warn = $('sharkwarn');
  if (o.sick && o.phase !== 'leave') { o.phase = 'leave'; o.pt = 0; }
  o.pt += dt;
  if (o.phase === 'approach') { glide(o, o.x > 0 ? -4 : 4, P.y + 0.8, -12, 3, 0.8, dt, move * 0.7); if (o.z > -15 || o.pt > 6) { o.phase = 'pass'; o.pt = 0; o.passes = 0; o.goal = o.x > 0 ? -4.5 : 4.5; } }
  else if (o.phase === 'pass') {                                                        // sweeps from one side to the other, keeping pace
    const zt = -11 + Math.min(o.passes, 2) * 1.5;
    if (o.passes < 2) glide(o, o.goal, P.y + 0.6, zt, 3.6, 0.9, dt, move);
    else glide(o, P.x, P.y, -3, 3.2, 1.1, dt, move);                                   // turns to line up with Cubi
    if (Math.abs(o.x - o.goal) < 1.2) { o.passes++; o.goal = -o.goal; }
    if (o.z > -6) o.z -= (o.z + 6) * Math.min(1, dt * 2);   // stays well ahead while sweeping
    if (o.passes >= 2 && facing(o) < 0.45 && o.z < -4.5) { o.phase = 'lunge'; o.pt = 0; o.tx = P.x; o.ty = P.y; sound.bump(); }
    if (o.pt > 15) { o.phase = 'leave'; o.pt = 0; }
  } else if (o.phase === 'lunge') {                                                    // a short burst; aim locks after half a second
    if (o.pt < 0.5) { o.tx = P.x; o.ty = P.y; }
    glide(o, o.tx, o.ty, 2, 9.5, 1.5, dt, move);
    if (o.z > -1.2 && o.z < 1.2 && Math.hypot(P.x - o.x, P.y - o.y) < 1.25) {
      if (inCover()) { toast('Hidden!', 2); o.phase = 'leave'; o.pt = 0; window.__sharkResult = 'hidden'; }
      else if (invuln <= 0) { hurt('Shark bite!'); o.phase = 'leave'; o.pt = 0; window.__sharkResult = 'bite'; }
    }
    if (o.z > 1.8 || o.pt > 2.6) { if (o.phase === 'lunge') { const h = inCover(); if (h) toast('Hidden!', 2); window.__sharkResult = h ? 'hidden' : 'missed'; } o.phase = 'leave'; o.pt = 0; }
  } else if (o.phase === 'leave') { glide(o, (o.x >= 0 ? 1 : -1) * 18, 6, o.z - 8, 4, 0.7, dt, 0); if (Math.abs(o.x) > 15 || o.z > 9 || o.pt > 8) o.gone = true; }
  if (warn) warn.classList.toggle('show', mode === 'play' && (o.phase === 'pass' || o.phase === 'lunge' || o.phase === 'approach') && !o.gone);
}
function updateStream(o) {
  const pos = o.mesh.geometry.attributes.position.array;
  const [dx, dy] = o.dir;
  const tt = t * 1.4;
  for (let i = 0; i < o.N; i++) {
    const sx = o.seeds[i * 3], sy = o.seeds[i * 3 + 1], sz = o.seeds[i * 3 + 2];
    let x = -8 + sx * 16, y = 0.4 + sy * 5.6;
    const zz = o.z - sz * o.len;
    if (dx) x = -8 + (((sx * 16 + tt * dx * 5) % 16) + 16) % 16;
    if (dy) y = 0.4 + (((sy * 5.6 + tt * dy * 2.5) % 5.6) + 5.6) % 5.6;
    pos[i * 6] = x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = zz;
    pos[i * 6 + 3] = x + dx * 0.9; pos[i * 6 + 4] = y + dy * 0.63; pos[i * 6 + 5] = zz;
  }
  o.mesh.geometry.attributes.position.needsUpdate = true;
  o.mesh.geometry.computeBoundingSphere();
  o.chev.children.forEach((m, k) => {
    const ph = ((t * 0.8 + k / 6) % 1);
    m.position.set(dx ? (-5 + ph * 10) * dx : (k - 2.5) * 1.4, dy ? (dy > 0 ? 0.6 + ph * 4.6 : 5.2 - ph * 4.6) : 1.4 + (k % 3) * 1.4, o.z - 4 - (k % 2) * 6);
    m.rotation.z = dx ? (dx > 0 ? 0 : Math.PI) : (dy > 0 ? Math.PI / 2 : -Math.PI / 2);
    m.material.opacity = 0.5 * Math.sin(ph * Math.PI);
  });
}

loadLevel(STARTER_LEVELS[0], 0);
resetWorld();
if (!/[?&]test/.test(location.search)) requestAnimationFrame(frame); else renderFrame();
window.__grade = (o) => { for (const k in o) if (GRADE[k]) GRADE[k].value = o[k]; else if (k === 'fogNear') scene.fog.near = o[k]; else if (k === 'glow') glowU.uGlowK.value = o[k]; };
window.__glowSet = (k, b) => { glowU.uGlowK.value = k; if (bloomPass) bloomPass.strength = b ?? bloomPass.strength; };
window.__game = { scene, camera, dbg: () => ({ cam: camera.position.toArray().map(v => +v.toFixed(2)), P: [+P.x.toFixed(2), +P.y.toFixed(2)], ground: +groundAt(camera.position.x, curD - camera.position.z).toFixed(2), slabs: objs.filter(o => o.shapes && o.shapes[0] && o.shapes[0].t === "b").map(o => [+o.z.toFixed(1), +(o.shapes[0].y0 + relY(curD - o.z)).toFixed(2), o.mesh.visible]) }), hungry: (x) => hungryShark(-30, x || 3), get shark() { return hungry; },
  get mode() { return mode; }, P, objs, get s() { return s; }, get lives() { return lives; }, get pearls() { return pearls; }, get buddy() { return !!buddy; },
  start: (i) => start(STARTER_LEVELS[i || 0], i || 0), spawn: (k, x, y, z, o) => spawn(k, x, y, z, o || {}), item: (it, z) => spawnItem(it, z), forceWin: () => win(), forceOver: () => { lives = 0; gameOver(); }, toxin: useToxin,
  sim(n) { for (let i = 0; i < n; i++) step(1 / 60); renderFrame(); },
  info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, objs: objs.length }),
  breakdown: () => { const r = {}; objs.forEach(o => { let n = 0, tr = 0; o.mesh.traverse(m => { if (m.isMesh || m.isPoints || m.isLineSegments || m.isSprite) { n++; const gg = m.geometry; if (gg) tr += (gg.index ? gg.index.count : gg.attributes.position.count) / 3 * (m.isInstancedMesh ? m.count : 1); } }); r[o.kind] = r[o.kind] || [0, 0, 0]; r[o.kind][0]++; r[o.kind][1] += n; r[o.kind][2] += Math.round(tr); }); return r; },
};
