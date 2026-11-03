// Turntable / beauty-shot viewer. ?m=cubi|clown|jelly|puffer|urchin|corals|lineup  &angle=deg  &spin=1
import * as THREE from 'three';
import * as M from './models.js';
import * as RF from './reef.js';
import { makeRenderer, setupScene, makeFloor } from './env.js';

const q = new URLSearchParams(location.search);
const which = q.get('m') || 'lineup';
const canvas = document.getElementById('c');
const renderer = makeRenderer(canvas, 2, which === 'icon');
const { scene, sun } = setupScene(renderer, { fogNear: 20, fogFar: 90 });
const { floor, caus } = makeFloor(); scene.add(floor);
const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 500);
const items = [];
const anim = [];
function add(obj, x, y, z, ry = 0) { obj.position.set(x, y, z); obj.rotation.y = ry; scene.add(obj); items.push(obj); return obj; }

const ang = (+q.get('angle') || 0) * Math.PI / 180;
if (which === 'cubi') { const c = add(M.makeCubi(), 0, 1.2, 0, ang); anim.push(dt => M.animateFish(c, dt, 0.3)); cam.position.set(0, 1.5, 4.2); cam.lookAt(0, 1.15, 0); }
if (which === 'cast') {
  const c = add(M.makeCubi(), -1.3, 1.3, 0, Math.PI + 0.5); const cf = add(M.makeClown(), 0.9, 1.2, 0.4, Math.PI - 0.6); cf.scale.setScalar(1.25);
  const a = add(M.makeAnemone(), 1.4, 0, -1.2); add(M.makeBranchCoral(M.COR.pink, 5, 1.1), -3.3, 0, -1.6); add(M.makeStarfish(4), 2.6, 0, 0.8); add(M.makeGrass(), 3.4, 0, -1.6); add(M.makeBrainCoral(M.COR.green, 0.8), -1.8, 0, -2.2); add(M.makeSeaweed(), -4.2, 0, -3); add(M.makeTubeCoral(M.COR.purple, 0.9), 2.6, 0, -3.2); add(M.makeBubbleCoral(0.7), 0, 0, -2.6);
  const p = add(M.makePearl(), -0.2, 2.2, 0.3);
  anim.push(dt => { M.animateFish(c, dt, 0.3); M.animateFish(cf, dt, 0.3); M.animateAnemone(a, dt); });
  cam.position.set(0, 2.0, 6.4); cam.lookAt(0, 1.2, 0);
}
if (which === 'life') {
  const tu = add(M.makeTurtle(), 2.2, 2.4, -1.5, -0.9);
  const sch = [add(M.makeSchool('tang', 3, 0, 'band', 1.1), -3.4, 3.4, 0, -0.5), add(M.makeSchool('chromis', 12, 1, 'plain', 0.5), 0, 3.6, -1, 0.6), add(M.makeSchool('butterfly', 1, 2, 'band', 2), 3.6, 1.6, 0.5, -0.6), add(M.makeSchool('wrasse', 6, 3, 'line', 0.8), -1.4, 1.3, 1.2, 1.2), add(M.makeSchool('dot', 9, 4, 'spots', 0.6), 1.8, 4.3, -2, 0.3), add(M.makeSchool('tang', 5, 7, 'bars', 0.8), -4, 1.4, -1.5, 0.4), add(M.makeSchool('chromis', 4, 9, 'nose', 0.9), 2.4, 3.0, 1.2, -0.8)];
  const cl = add(M.makeClam(), -3.2, 0, 1.5, 0.3); add(M.makeSponge(M.COR.purple, 1), -4.2, 0, -1); add(M.makeSponge(M.COR.orange, 0.8), 4.5, 0, -0.5); add(M.makeMushroom(M.COR.teal, 1), 0.6, 0, 1.8); add(M.makeMushroom(M.COR.pink, 0.8), 1.7, 0, 2.2);
  add(M.makeArch(0.9), 0, 0, -6);
  anim.push(dt => { M.animateTurtle(tu, dt); sch.forEach(s => M.animateSchool(s, dt)); M.animateClam(cl, dt); });
  cam.position.set(0, 2.6, 10); cam.lookAt(0, 1.6, 0);
}
if (which === 'newlife') {
  const s1 = add(M.makeSchool('rainbow', 10, 0, 'rainbow', 0.9), -3, 3.2, 0, -0.6), s2 = add(M.makeSchool('parrot', 2, 12, 'face', 1.6), 2.6, 3.0, 0, -0.5), s3 = add(M.makeSchool('grouper', 1, 15, 'dots', 2.2), 0, 1.4, 1, -0.7), s4 = add(M.makeSchool('parrot', 1, 13, 'face', 1.7), 3.6, 1.2, 1.5, -0.9);
  anim.push(dt => [s1, s2, s3, s4].forEach(s => M.animateSchool(s, dt)));
  cam.position.set(0, 2.4, 9); cam.lookAt(0, 2, 0);
}
if (which === 'icon') {
  scene.background = null; scene.fog = null; floor.visible = false; renderer.setClearColor(0x000000, 0);
  const k = q.get('k'); let o;
  if (k === 'wreckgate') { o = add(RF.makeWreckGate(0), 0, 0, 0, 0.25); cam.position.set(0, 4.5, 20); cam.lookAt(0, 3, 0); }
  if (k === 'wreck') { o = add(RF.makeShipwreck(), 0, 0, 0, -0.35); cam.position.set(0, 4, 15); cam.lookAt(0, 1.8, 0); }
  if (k === 'moray') { o = add(RF.makeMoray('rock'), 0, 0, 0, 0.9); RF.setMoray(o, 0.6, 1); cam.position.set(1, 2.2, 6); cam.lookAt(0.6, 1.0, 0.8); }
  if (k === 'moraytube') { o = add(RF.makeMoray('tube'), 0, 0, 0, 0.9); RF.setMoray(o, 0.5, 1); cam.position.set(2, 2.5, 7); cam.lookAt(0.6, 1.6, 0.6); }
  if (k === 'kraken') { o = add(RF.makeKraken(), 0, 0, 0, 0); cam.position.set(0, 1, 7); cam.lookAt(0, 0.4, 0); }
  if (k === 'xmas' || k === 'xmashide') { o = add(RF.makeXmasRock(3), 0, 0, 0, 0); if (k === 'xmashide') for (let i = 0; i < 60; i++) RF.animateXmas(o, 1 / 30, true); else RF.animateXmas(o, 0, false); cam.position.set(0, 1.5, 3); cam.lookAt(0, 0.5, 0); }
  if (k === 'nudi') { o = add(RF.makeNudibranch(0), 0, 0, 0, -0.7); cam.position.set(0, 0.6, 1.0); cam.lookAt(0, 0.1, 0); }
}
if (which === 'lush') {
  add(RF.makeReefMound(7, 1.3), -2.6, 0, -0.5, 0.4); add(RF.makeReefMound(21, 1.1), 2.4, 0, -0.3, 2); add(RF.makeReefMound(44, 0.9), 0, 0, -3.2, 1);
  add(RF.makeFluffyAnemone(0, 1.5), -0.2, 0, 1.3, 0); add(RF.makeFluffyAnemone(3, 1.2), 4.3, 0, 1.0, 0);
  const sw = add(M.makeSchool('chromis', 26, 18, 'plain', 0.36), 0.5, 3.3, -1.5, -0.7); anim.push(dt => { RF.reefClock.value += dt; M.animateSchool(sw, dt); });
  cam.position.set(0, 2.6, 8.5); cam.lookAt(0, 1.0, 0);
}
if (which === 'stars') { for (let i = 0; i < 6; i++) { const st = add(M.makeStarfish(i), -2.5 + (i % 3) * 2.5, 0, i < 3 ? -0.6 : 1.0, 0); st.scale.setScalar(2.2); } cam.position.set(0, 3.2, 5.2); cam.lookAt(0, 0, 0.2); }
if (which === 'enemies') {
  const j = add(M.makeJelly(), -2.4, 1.7, 0, 0.2); const j2 = add(M.makeJelly('#C7A4FF', '#3E2370', '#E9DCFF'), -0.9, 2.3, -1.2, -0.3); const p = add(M.makePuffer(), 0.9, 1.2, 0, -0.35); M.setPuff(p, 0.1); const p2 = add(M.makePuffer(), 2.7, 1.4, -0.4, -0.5); M.setPuff(p2, 1); add(M.makeUrchin(), -0.2, 0, 0.9, 0.2); add(M.makeUrchin(), 1.6, 0, 1.2, -0.2);
  anim.push(dt => { M.animateJelly(j, dt); M.animateJelly(j2, dt); });
  cam.position.set(0, 2.0, 7); cam.lookAt(0, 1.2, 0);
}
if (which === 'shark') { const sk = add(M.makeShark(), 0, 1.6, 0, Math.PI * 2 - 0.5 + ang); M.setSharkMouth(sk, +(q.get('open') ?? 0.7)); anim.push(dt => M.animateShark(sk, dt, 0.2)); cam.position.set(0, 2.0, 6); cam.lookAt(0, 1.5, 0); }
if (which === 'clown') { const c = add(M.makeClown(), 0, 1.0, 0, ang); c.scale.setScalar(1.6); anim.push(dt => M.animateFish(c, dt, 0.3)); cam.position.set(0, 1.3, 4.2); cam.lookAt(0, 1.0, 0); }
if (which === 'jelly') { const j = add(M.makeJelly(), 0, 1.8, 0, ang); anim.push(dt => M.animateJelly(j, dt)); cam.position.set(0, 1.6, 4.6); cam.lookAt(0, 1.4, 0); }
if (which === 'puffer') { const p = add(M.makePuffer(), 0, 1.3, 0, ang); M.setPuff(p, +(q.get('puff') ?? 0.6)); cam.position.set(0, 1.5, 4); cam.lookAt(0, 1.3, 0); }
if (which === 'urchin') { add(M.makeUrchin(), 0, 0, 0, ang); cam.position.set(0, 1.2, 3); cam.lookAt(0, 0.3, 0); }
if (which === 'corals') {
  add(M.makeBranchCoral(M.COR.pink, 5, 1.2), -3.2, 0, 0); add(M.makeBrainCoral(M.COR.green, 1.1), -1.4, 0, 0.3); add(M.makeTubeCoral(M.COR.orange, 1.1), 0.4, 0, 0);
  add(M.makeStarfish(), 2.2, 0, 0.6); add(M.makeGrass(), 2.6, 0, -0.4); add(M.makeSeaFan(M.COR.purple, 1), 4, 0, -0.3); add(M.makeBubbleCoral(1.1), -2.4, 0, 1.6); add(M.makeStaghorn(M.COR.red, 9, 1.2), 3, 0, 1.4);
  const a = add(M.makeAnemone(), 1, 0, 1.8); const cf = add(M.makeClown(), 1.1, 0.95, 1.8, -0.6); anim.push(dt => { M.animateAnemone(a, dt); M.animateFish(cf, dt, 0.2); });
  add(M.makeSeaweed(), -4.3, 0, -1); add(M.makeRock(1, 3), 5.5, 0, -1.5);
  cam.position.set(0, 3.2, 10.5); cam.lookAt(0, 0.9, 0);
}
if (which === 'lineup') {
  const c = add(M.makeCubi(), -1.6, 1.1, 0, -0.7); const cf = add(M.makeClown(), 0.2, 1.0, 0.3, -0.9); cf.scale.setScalar(1.3);
  const j = add(M.makeJelly(), 2.1, 1.7, -0.6, 0.3); const p = add(M.makePuffer(), 3.6, 0.9, 0.2, -0.4); M.setPuff(p, 0.7);
  add(M.makeBranchCoral(M.COR.pink, 5, 1.1), -3.8, 0, -1.5); add(M.makeBrainCoral(M.COR.green, 0.9), -2.6, 0, -2.2);
  const a = add(M.makeAnemone(), 0.6, 0, -1.4); add(M.makeTubeCoral(M.COR.orange, 1), 4.4, 0, -2.2); add(M.makeSeaweed(), 5.4, 0, -3);
  add(M.makePearl(), -0.3, 1.9, 0.6);
  anim.push(dt => { M.animateFish(c, dt, 0.3); M.animateFish(cf, dt, 0.3); M.animateJelly(j, dt); M.animateAnemone(a, dt); });
  cam.position.set(0, 2.6, 9.5); cam.lookAt(0.2, 1.0, 0);
}
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
let last = performance.now(), t = 0;
const spin = q.get('spin') === '1';
function loop(now) {
  if (q.get('still')) return;
  const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
  anim.forEach(f => f(dt)); M.animateSeaweed(t);
  caus.offset.set(t * 0.02, t * 0.015);
  if (spin && items[0]) items[0].rotation.y += dt * 0.6;
  renderer.render(scene, cam);
  requestAnimationFrame(loop);
}
if (q.get('still')) { for (let i = 0; i < 30; i++) { anim.forEach(f => f(1 / 30)); } M.animateSeaweed(1); renderer.render(scene, cam); } else requestAnimationFrame(loop);
window.__ready = true; window.__items = items;
