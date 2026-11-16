// Design review: one animal at a time, animated in 3D. Accept it or leave a note, then copy the summary into the chat.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeRenderer, setupScene } from './env.js';
import { FISH3D, makeFish3D, animateFish3D } from './fish3d.js';
import { CRITTERS3D } from './critters3d.js';
const ITEMS = FISH3D.map(d => ({ en: d.en, de: d.de, flat: d.flat, make: () => makeFish3D(d, 1), anim: animateFish3D })).concat(CRITTERS3D);
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const $ = (id) => document.getElementById(id);
const renderer = makeRenderer($('c'), 2);
const { scene } = setupScene(renderer, { fogNear: 30, fogFar: 120 });
const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100); cam.position.set(-1.6, 0.35, -2.6);
const ctl = new OrbitControls(cam, renderer.domElement); ctl.enablePan = false; ctl.minDistance = 1.4; ctl.maxDistance = 6; ctl.autoRotate = true; ctl.autoRotateSpeed = 2.2; ctl.enableDamping = true;
renderer.domElement.addEventListener('pointerdown', () => { ctl.autoRotate = false; });
// soft bubbles in the background
const bub = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([...Array(240)].map(() => (Math.random() - 0.5) * 10), 3)), new THREE.PointsMaterial({ color: '#DFF8FF', size: 0.05, transparent: true, opacity: 0.6 }));
scene.add(bub);

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(16, 16, { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new RenderPass(scene, cam)); composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.45, 0.5, 0.95)); composer.addPass(new OutputPass());
const KEY = 'cubi_review_v1';
let notes = {}; try { notes = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(notes)); } catch (e) {} };
let idx = Math.max(0, Math.min(ITEMS.length - 1, (+new URLSearchParams(location.search).get('i') || 1) - 1)), cur = null;
function show(i) {
  idx = (i + ITEMS.length) % ITEMS.length;
  if (cur) scene.remove(cur);
  const d = ITEMS[idx]; cur = d.make(); scene.add(cur);
  ctl.target.set(...(d.target || [0, 0, 0]));
  if (d.cam) cam.position.set(...d.cam); else if (d.flat) cam.position.set(-1.7, 2.4, -1.7); else cam.position.set(-1.6, 0.35, -2.6);
  $('name').textContent = d.en; $('de').textContent = d.de; $('count').textContent = `${idx + 1} / ${ITEMS.length}`;
  const n = notes[d.en] || {};
  $('note').value = n.note || ''; $('ok').setAttribute('aria-pressed', String(n.ok === true)); $('no').setAttribute('aria-pressed', String(n.ok === false));
  renderList();
}
function renderList() {
  $('list').innerHTML = ITEMS.map((d, i) => { const n = notes[d.en] || {}; return `<button data-i="${i}" class="${i === idx ? 'on' : ''}">${n.ok === true ? '✅' : n.ok === false ? '✏️' : '▫️'} ${i + 1}. ${d.en}</button>`; }).join('');
}
$('list').onclick = (e) => { const b = e.target.closest('button'); if (b) show(+b.dataset.i); };
$('prev').onclick = () => show(idx - 1); $('next').onclick = () => show(idx + 1);
const mark = (ok) => { const d = ITEMS[idx]; notes[d.en] = { ...(notes[d.en] || {}), ok, note: $('note').value.trim() }; save(); if (ok) show(idx + 1); else { show(idx); $('note').focus(); } };
$('ok').onclick = () => mark(true); $('no').onclick = () => mark(false);
$('note').oninput = () => { const d = ITEMS[idx]; notes[d.en] = { ...(notes[d.en] || {}), note: $('note').value.trim() }; if (notes[d.en].note && notes[d.en].ok !== true) notes[d.en].ok = false; save(); };
$('copy').onclick = async () => {
  const txt = ITEMS.map((d, i) => { const n = notes[d.en]; return n && (n.ok !== undefined || n.note) ? `${i + 1}. ${d.en}: ${n.ok === true ? 'OK' : 'change'}${n.note ? ' - ' + n.note : ''}` : null; }).filter(Boolean).join('\n') || 'No feedback yet';
  try { await navigator.clipboard.writeText(txt); $('copy').textContent = 'Copied! Paste it into the chat'; } catch (e) { prompt('Copy this into the chat:', txt); }
  setTimeout(() => { $('copy').textContent = 'Copy my feedback'; }, 2500);
};
addEventListener('keydown', (e) => { if (e.target.tagName === 'TEXTAREA') return; if (e.key === 'ArrowRight') show(idx + 1); if (e.key === 'ArrowLeft') show(idx - 1); });
function resize() { const w = $('c').clientWidth, h = $('c').clientHeight; renderer.setSize(w, h, false); composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
show(idx);
let last = performance.now();
function frame(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; if (cur) ITEMS[idx].anim(cur, dt); bub.rotation.y += dt * 0.02; ctl.update(); composer.render(); requestAnimationFrame(frame); }
window.__review = { show, tick: (n = 1) => { for (let i = 0; i < n; i++) if (cur) ITEMS[idx].anim(cur, 1 / 30); ctl.update(); composer.render(); }, cam, ctl, count: ITEMS.length };
if (!/[?&]still/.test(location.search)) requestAnimationFrame(frame);
