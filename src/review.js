// Design review: one animal at a time, animated in 3D. Accept it or leave a note, then copy the summary into the chat.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeRenderer, setupScene } from './env.js';
import { FISH3D, makeFish3D, animateFish3D } from './fish3d.js';
import { CRITTERS3D } from './critters3d.js';
import { CORALS3D } from './corals3d.js';
import { SOFT3D } from './softcorals3d.js';
const fishItem = d => ({ en: d.en, de: d.de, flat: d.flat, make: () => makeFish3D(d, 1), anim: animateFish3D });
const LATE = ['Mola mola (ocean sunfish)', 'Schooling bannerfish', 'Cleaner wrasse'];   // added after the review numbers were set: appended so earlier numbers stay the same
// models the game still uses that were never on this page: shown scaled to a common size (this page judges design, not size)
function fitted(make) { const inner = make(), g = new THREE.Group(); g.add(inner); const b = new THREE.Box3().setFromObject(inner), sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  const k = 1.7 / Math.max(sz.x, sz.y, sz.z, 0.01); inner.scale.multiplyScalar(k); inner.position.sub(c.multiplyScalar(k)); g.userData.inner = inner; return g; }
const leg = (en, de, make, anim) => ({ en, de, legacy: true, make: () => fitted(make), anim: anim ? (m, dt) => anim(m.userData.inner, dt) : null });
const LEGACY = [
  leg('Seahorse', 'Seepferdchen', () => { const g = new THREE.Group(); ['kuda', 'dusky', 'thorny'].forEach((k, i) => { const h = KO.makeSeahorse3D(k); h.position.x = (i - 1) * 0.75; h.rotation.y = -0.5; g.add(h); }); return g; }, (g, dt) => g.children.forEach(h => KO.animateSeahorse3D(h, dt))),
  leg('Crab', 'Krabbe', () => { const g = new THREE.Group(); const a = KO.makeKomodoCrab('orangutan'), b = KO.makeKomodoCrab('guard'); a.position.x = -0.75; b.position.x = 0.75; g.add(a, b); return g; }, (g, dt) => g.children.forEach(c => KO.animateKomodoCrab(c, dt))),
  leg('Nudibranchs (6 kinds)', 'Nacktschnecken (6 Arten)', () => { const g = new THREE.Group(); for (let i = 0; i < 6; i++) { const n = KO.makeNudi3D(i); n.position.set((i % 3 - 1) * 0.55, 0, Math.floor(i / 3) * 0.75 - 0.375); g.add(n); } return g; },
    (g, dt) => g.children.forEach(n => KO.animateNudi3D(n, dt))),
  leg('Baby sea turtle', 'Baby-Meeresschildkröte', () => KO.makeBabyTurtle3D(), KO.animateBabyTurtle3D),
  leg('Jellyfish', 'Qualle', () => KO.makeMoonJelly(0), KO.animateMoonJelly),
  leg('Starfish', 'Seestern', () => M.makeStarfish(), null),
  leg('Giant clam', 'Riesenmuschel', () => M.makeClam(), M.animateClam),
  leg('Moray eel in its rock (game)', 'Muräne im Fels (Spiel)', () => RF.makeMoray('rock'), (m, dt) => { m.userData.rt = (m.userData.rt || 0) + dt; const k = Math.max(0, Math.sin(m.userData.rt * 0.7)); RF.setMoray(m, 0.15 + 0.85 * k, k > 0.6 ? 1 : 0.1); }),
  leg('Moray eel in its tube (game)', 'Muräne in der Röhre (Spiel)', () => RF.makeMoray('tube'), (m, dt) => { m.userData.rt = (m.userData.rt || 0) + dt; const k = Math.max(0, Math.sin(m.userData.rt * 0.7)); RF.setMoray(m, 0.15 + 0.85 * k, k > 0.6 ? 1 : 0.1); }),
  leg('Eel in a rock hole', 'Aal im Felsloch', () => RF.makeEelRock(), RF.animateEel),
  leg('Sea snake', 'Seeschlange', () => CR.makeSeaSnake(), CR.animateSeaSnake),
  leg('Grazing turtle', 'Grasende Schildkröte', () => CR.makeGrazer(0), (g, dt) => CR.animateGrazer(g, dt, false)),
  leg('Whale shark', 'Walhai', () => KO.makeWhaleShark3D(), KO.animateWhaleShark3D),
  leg('Kraken', 'Krake', () => RF.makeKraken(), RF.animateKraken)];
const ITEMS = FISH3D.filter(d => !LATE.includes(d.en)).map(fishItem).concat(CRITTERS3D, CORALS3D, SOFT3D, FISH3D.filter(d => LATE.includes(d.en)).map(fishItem), LEGACY);
// groups for the list and the gallery (review numbers stay as they were, so earlier feedback still matches)
const GROUPS = [
  ['reef', 'Reef fish', 'Rifffische'], ['open', 'Open water & schools', 'Freiwasser & Schwärme'], ['sharks', 'Sharks & rays', 'Haie & Rochen'],
  ['bottom', 'Bottom dwellers & eels', 'Bodenbewohner & Aale'], ['critters', 'Turtles & invertebrates', 'Schildkröten & Wirbellose'],
  ['hard', 'Hard corals', 'Steinkorallen'], ['soft', 'Soft corals & anemones', 'Weichkorallen & Anemonen'], ['legacy', 'Not reviewed yet (older game models)', 'Noch nicht geprüft (ältere Spielmodelle)']];
const FISH_GROUP = { open: ['Needlefish', 'Trumpetfish', 'Lunar fusilier', 'Silversides', 'Bigfin reef squid', 'Dolphin', 'Mola mola (ocean sunfish)'],
  sharks: ['Blacktip reef shark', 'Whitetip reef shark', 'Coral catshark', 'Blue-spotted stingray', 'Bluespotted stingray', 'Manta ray'],
  bottom: ['Moray eel', 'Banded snake eel', 'Scorpionfish', 'Lionfish', 'Crocodilefish', 'Peacock flounder'] };
ITEMS.forEach((d, i) => { d.no = i + 1;
  d.group = d.legacy ? 'legacy' : CRITTERS3D.includes(d) ? 'critters' : CORALS3D.includes(d) ? 'hard' : SOFT3D.includes(d) ? 'soft' : Object.keys(FISH_GROUP).find(k => FISH_GROUP[k].includes(d.en)) || 'reef'; });
import { makeComposer } from './post.js';
import * as M from './models.js';
import * as RF from './reef.js';
import * as CR from './critters.js';
import * as KO from './komodo.js';

const $ = (id) => document.getElementById(id);
const renderer = makeRenderer($('c'), 2);
const { scene } = setupScene(renderer, { fogNear: 30, fogFar: 120 });
const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100); cam.position.set(-1.6, 0.35, -2.6);
const ctl = new OrbitControls(cam, renderer.domElement); ctl.enablePan = false; ctl.minDistance = 1.4; ctl.maxDistance = 6; ctl.autoRotate = true; ctl.autoRotateSpeed = 2.2; ctl.enableDamping = true;
renderer.domElement.addEventListener('pointerdown', () => { ctl.autoRotate = false; });
// soft bubbles in the background
const bub = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([...Array(240)].map(() => (Math.random() - 0.5) * 10), 3)), new THREE.PointsMaterial({ color: '#DFF8FF', size: 0.05, transparent: true, opacity: 0.6 }));
scene.add(bub);

const { composer } = makeComposer(renderer, scene, cam, { strength: 0.45, radius: 0.5, threshold: 0.95 });
window.__post = { composer, renderer };
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
const badge = (d) => { const n = notes[d.en] || {}; return n.ok === true ? '✅' : n.ok === false ? '✏️' : '▫️'; };
const tally = (g) => { const its = ITEMS.filter(d => d.group === g); return `${its.filter(d => (notes[d.en] || {}).ok === true).length}/${its.length}`; };
function renderList() {
  $('list').innerHTML = `<button class="gal" id="galBtn">▦ Gallery · Galerie</button>` + GROUPS.map(([g, en, de]) => `<h2>${en}<small>${de} · ${tally(g)}</small></h2>` +
    ITEMS.filter(d => d.group === g).map(d => `<button data-i="${d.no - 1}" class="${d.no - 1 === idx ? 'on' : ''}">${badge(d)} ${d.no}. ${d.en}</button>`).join('')).join('');
  const on = $('list').querySelector('button.on'); if (on && !galOpen) on.scrollIntoView({ block: 'nearest' });
}
// ---- gallery: every design as a still picture, grouped; click one to open it in 3D
let galOpen = false;
const thumbs = {};
function renderGallery() {
  $('gallery').innerHTML = `<div class="ghead"><h1>Cubi's Reef Rush · Designs</h1><button class="b" id="galClose">✕ Close</button></div>` +
    `<nav class="chips">${GROUPS.map(([g, en]) => `<a href="#g-${g}">${en} <b>${tally(g)}</b></a>`).join('')}</nav>` +
    GROUPS.map(([g, en, de]) => `<section id="g-${g}"><h2>${en} <small>${de}</small></h2><div class="grid">` +
      ITEMS.filter(d => d.group === g).map(d => `<button class="card" data-i="${d.no - 1}"><span class="pic">${thumbs[d.no] ? `<img src="${thumbs[d.no]}" alt="">` : '<i class="wait"></i>'}</span><span class="st">${badge(d) === '▫️' ? '' : badge(d)}</span><span class="no">${d.no}</span><b>${d.en}</b><small>${d.de}</small></button>`).join('') + '</div></section>').join('');
}
function openGallery(on) {
  galOpen = on; document.body.classList.toggle('galOn', on);
  if (on) { renderGallery(); makeThumbs(); }
  try { history.replaceState(null, '', on ? '?gallery' : '?i=' + (idx + 1)); } catch (e) {}
}
$('gallery').onclick = (e) => { if (e.target.closest('#galClose')) return openGallery(false); const c = e.target.closest('.card'); if (c) { openGallery(false); show(+c.dataset.i); } };
// thumbnails: a small second renderer draws each design once (textures need a moment to load)
let thumbR = null, thumbBusy = false;
async function makeThumbs() {
  if (thumbBusy) return; thumbBusy = true;
  if (!thumbR) { const cv = document.createElement('canvas'); thumbR = { r: makeRenderer(cv, 1), cam: new THREE.PerspectiveCamera(32, 4 / 3, 0.1, 100) }; thumbR.r.setSize(320, 240, false); thumbR.scene = setupScene(thumbR.r, { fogNear: 30, fogFar: 120 }).scene; }
  const { r, cam: tc, scene: ts } = thumbR, wait = (ms) => new Promise(res => setTimeout(res, ms));
  for (const d of ITEMS) {
    if (thumbs[d.no]) continue;
    const m = d.make(); ts.add(m);
    if (d.anim) d.anim(m, 0.4);
    await wait(160);
    if (d.cam) tc.position.set(...d.cam); else if (d.flat) tc.position.set(-1.7, 2.4, -1.7); else tc.position.set(-1.6, 0.35, -2.6);
    const tg = new THREE.Vector3(...(d.target || [0, 0, 0])); tc.position.sub(tg).multiplyScalar(d.make.length === 0 && FISH3D.some(f => f.en === d.en) ? 0.68 : 0.95).add(tg); tc.lookAt(tg);
    r.render(ts, tc); thumbs[d.no] = r.domElement.toDataURL('image/jpeg', 0.82); ts.remove(m);
    const img = $('gallery').querySelector(`.card[data-i="${d.no - 1}"] .pic`); if (img) img.innerHTML = `<img src="${thumbs[d.no]}" alt="">`;
    await wait(0);
  }
  thumbBusy = false;
}
$('list').onclick = (e) => { if (e.target.closest('#galBtn')) return openGallery(true); const b = e.target.closest('button[data-i]'); if (b) show(+b.dataset.i); };
$('galTop').onclick = () => openGallery(true);
$('prev').onclick = () => show(idx - 1); $('next').onclick = () => show(idx + 1);
const mark = (ok) => { const d = ITEMS[idx]; notes[d.en] = { ...(notes[d.en] || {}), ok, note: $('note').value.trim() }; save(); if (ok) show(idx + 1); else { show(idx); $('note').focus(); } };
$('ok').onclick = () => mark(true); $('no').onclick = () => mark(false);
$('note').oninput = () => { const d = ITEMS[idx]; notes[d.en] = { ...(notes[d.en] || {}), note: $('note').value.trim() }; if (notes[d.en].note && notes[d.en].ok !== true) notes[d.en].ok = false; save(); };
$('copy').onclick = async () => {
  const txt = ITEMS.map((d, i) => { const n = notes[d.en]; return n && (n.ok !== undefined || n.note) ? `${i + 1}. ${d.en}: ${n.ok === true ? 'OK' : 'change'}${n.note ? ' - ' + n.note : ''}` : null; }).filter(Boolean).join('\n') || 'No feedback yet';
  try { await navigator.clipboard.writeText(txt); $('copy').textContent = 'Copied! Paste it into the chat'; } catch (e) { prompt('Copy this into the chat:', txt); }
  setTimeout(() => { $('copy').textContent = 'Copy my feedback'; }, 2500);
};
addEventListener('keydown', (e) => { if (e.target.tagName === 'TEXTAREA') return; if (e.key === 'Escape') openGallery(!galOpen); if (galOpen) return; if (e.key === 'ArrowRight') show(idx + 1); if (e.key === 'ArrowLeft') show(idx - 1); });
function resize() { const w = $('c').clientWidth, h = $('c').clientHeight; renderer.setSize(w, h, false); composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
show(idx);
if (!new URLSearchParams(location.search).has('i') && !/[?&]still/.test(location.search)) openGallery(true);
let last = performance.now();
function frame(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; if (galOpen) { requestAnimationFrame(frame); return; } if (cur) ITEMS[idx].anim(cur, dt); bub.rotation.y += dt * 0.02; ctl.update(); composer.render(); requestAnimationFrame(frame); }
window.__review = { show, tick: (n = 1) => { for (let i = 0; i < n; i++) if (cur) ITEMS[idx].anim(cur, 1 / 30); ctl.update(); composer.render(); }, cam, ctl, count: ITEMS.length };
if (!/[?&]still/.test(location.search)) requestAnimationFrame(frame);
