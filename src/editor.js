import { STARTER_LEVELS, normalizeLevel, saveCustom, loadCustom, LANE, countPearls } from './levels.js';
import { publishLevel, communityOnline } from './community.js';
import { tr, langSwitch, LANG_CSS, onLangChange } from './i18n.js';

const $ = (id) => document.getElementById(id);
const cv = $('map'), ctx = cv.getContext('2d');

// ------------------------------------------------------------ tools
const ICON = {};
const img = (n) => { const i = new Image(); i.src = 'icons/' + n + '.png'; i.onload = () => draw(); return i; };
['pearl', 'jelly', 'puffer_puffed', 'urchin', 'shark', 'anemone_clown', 'coral_branch_pink', 'coral_staghorn', 'coral_tube', 'coral_fan', 'coral_brain', 'coral_bubble', 'rock', 'cubi'].forEach(n => ICON[n] = img(n));
const CORAL_ICON = { branch: 'coral_branch_pink', stag: 'coral_staghorn', tube: 'coral_tube', fan: 'coral_fan', brain: 'coral_brain', bubble: 'coral_bubble', rock: 'rock' };
const TOOLS = [
  { id: 'select', label: 'Move', make: null },
  { id: 'pearls', label: 'Pearl line', icon: 'pearl', make: (x, z) => ({ t: 'pearls', x, z, y: LANE.mid, n: 5, gap: 3 }) },
  { id: 'pearl', label: 'Pearl', icon: 'pearl', make: (x, z) => ({ t: 'pearl', x, z, y: LANE.mid }) },
  { id: 'jelly', label: 'Jellyfish', icon: 'jelly', make: (x, z) => ({ t: 'jelly', x, z, y: LANE.mid }) },
  { id: 'puffer', label: 'Pufferfish', icon: 'puffer_puffed', make: (x, z) => ({ t: 'puffer', x, z, y: LANE.mid }) },
  { id: 'urchin', label: 'Urchin', icon: 'urchin', make: (x, z) => ({ t: 'urchin', x, z }) },
  { id: 'shark', label: 'Shark', icon: 'shark', make: (x, z) => ({ t: 'shark', x, z, y: LANE.mid }) },
  { id: 'coral', label: 'Coral', icon: 'coral_branch_pink', make: (x, z) => ({ t: 'coral', kind: 'branch', x, z }) },
  { id: 'anemone', label: 'Clownfish', icon: 'anemone_clown', make: (x, z) => ({ t: 'anemone', x, z }) },
  { id: 'stream', label: 'Current', icon: null, make: (x, z) => ({ t: 'stream', x: 0, z, dir: 'right', len: 14 }) },
  { id: 'wreckgate', label: 'Wreck to swim through', icon: null, make: (x, z) => ({ t: 'wreckgate', x: Math.max(-2.2, Math.min(2.2, x)), z }) },
  { id: 'moray', label: 'Moray eel', icon: null, make: (x, z) => ({ t: 'moray', x: x >= 0 ? 1 : -1, z, home: 'rock' }) },
  { id: 'kraken', label: 'Kraken (ink)', icon: null, make: (x, z) => ({ t: 'kraken', x, z }) },
  { id: 'hammer', label: 'Hammerhead (crosses)', icon: null, make: (x, z) => ({ t: 'hammer', x, z, y: LANE.mid }) },
  { id: 'seasnake', label: 'Sea snake (crosses low)', icon: null, make: (x, z) => ({ t: 'seasnake', x, z, y: LANE.low }) },
  { id: 'decor', label: 'Reef decor', icon: null, make: (x, z) => ({ t: 'decor', kind: 'magnifica', x, z }) },
  { id: 'visitor', label: 'Visitor swims by', icon: null, make: (x, z) => ({ t: 'visitor', kind: 'whaleshark', x, z }) },
];
// emoji symbols for items without a picture (map + palette)
const DECOR = [['magnifica', 'Magnificent anemone', '🪸'], ['gigantea', 'Giant carpet anemone', '🌸'], ['mertensii', "Merten's carpet anemone", '🌼'], ['heroanem', 'Fluffy anemone', '🌺'], ['xmas', 'Christmas tree worms', '🎄'],
  ['debris', 'Sunken debris', '⚓'], ['seagrass', 'Seagrass meadow', '🌿'], ['grazer', 'Turtle eating coral', '🐢'], ['shrimp', 'Shrimp', '🦐'], ['star', 'Sea star', '⭐'],
  ['clam', 'Giant clam', '🐚'], ['sponge', 'Sponge', '🧽'], ['mushroom', 'Mushroom coral', '🍄'], ['crab', 'Crab', '🦀'], ['nudi', 'Nudibranch', '🐌'], ['kelp', 'Kelp', '🌱']];
const VISITORS = [['whaleshark', 'Whale shark', '🐋'], ['turtle', 'Sea turtle', '🐢'], ['babyturtles', 'Baby turtles', '🐣'], ['manta', 'Manta ray', '🪽']];
const EMOJI = { wreckgate: '🚢', moray: '🐉', kraken: '🐙', hammer: '🦈', seasnake: '🐍', stream: '⇄', decor: '🪸', visitor: '🐋' };
const emojiFor = (it) => it.t === 'decor' ? (DECOR.find(d => d[0] === it.kind) || DECOR[0])[2] : it.t === 'visitor' ? (VISITORS.find(d => d[0] === it.kind) || VISITORS[0])[2] : EMOJI[it.t];
const FLOATERS = ['pearl', 'pearls', 'jelly', 'puffer', 'shark', 'hammer', 'seasnake'];
const NAMES = { pearl: 'Pearl', pearls: 'Pearl line', jelly: 'Jellyfish', puffer: 'Pufferfish', urchin: 'Sea urchin', shark: 'Shark', coral: 'Coral', anemone: 'Clownfish home', stream: 'Current', hammer: 'Hammerhead', seasnake: 'Sea snake', wreckgate: 'Wreck to swim through', moray: 'Moray eel', kraken: 'Kraken', decor: 'Reef decor', visitor: 'Visitor' };
let tool = 'select';

// ------------------------------------------------------------ level state
let lv = loadCustom() || normalizeLevel(JSON.parse(JSON.stringify(STARTER_LEVELS[0])));
lv.name = lv.name || 'My level';
let sel = null;
let scrollZ = 0;             // metres at the bottom edge of the map
const PX_PER_M = 7;
const PAD = 40;              // px below the start line

function save() { lv.items.sort((a, b) => a.z - b.z); saveCustom(lv); updateStats(); }
function updateStats() {
  const hz = lv.items.filter(i => ['jelly', 'puffer', 'urchin', 'shark', 'hammer', 'seasnake'].includes(i.t)).length;
  $('stats').textContent = `${lv.items.length} items · ${countPearls(lv)} pearls · ${hz} enemies`;
}

// ------------------------------------------------------------ coordinates
let W = 0, H = 0, dpr = 1;
function laneW() { return Math.min(W - 64, 460); }
function cx() { return W < 560 ? 52 + laneW() / 2 : W / 2; }
function xToPx(x) { return cx() + (x / 4.2) * (laneW() / 2); }
function pxToX(px) { return ((px - cx()) / (laneW() / 2)) * 4.2; }
function zToPy(z) { return H - PAD - (z - scrollZ) * PX_PER_M; }
function pyToZ(py) { return (H - PAD - py) / PX_PER_M + scrollZ; }
function resize() {
  const r = cv.getBoundingClientRect(); dpr = Math.min(devicePixelRatio || 1, 2);
  W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; draw();
}
addEventListener('resize', resize);

// ------------------------------------------------------------ drawing
function itemPoints(it) {
  if (it.t === 'pearls') { const pts = []; for (let i = 0; i < (it.n || 5); i++) pts.push([it.x + (it.dx || 0) * i, it.z + i * (it.gap || 3)]); return pts; }
  return [[it.x, it.z]];
}
function iconFor(it) {
  if (it.t === 'coral') return ICON[CORAL_ICON[it.kind] || 'coral_branch_pink'];
  const tl = TOOLS.find(t => t.id === it.t); return tl && tl.icon ? ICON[tl.icon] : null;
}
function hBadge(it) { if (!FLOATERS.includes(it.t)) return null; const y = it.y ?? LANE.mid; return y < 1.8 ? 'L' : y > 3 ? 'H' : 'M'; }
function draw() {
  if (!W) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  // water + sand lane
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#7FE0F2'); g.addColorStop(1, '#2FA9D6');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const l = xToPx(LANE.minX - 0.4), r = xToPx(LANE.maxX + 0.4);
  ctx.fillStyle = '#F7DFA3'; ctx.fillRect(l, 0, r - l, H);
  ctx.strokeStyle = '#C99A52'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(l, 0); ctx.lineTo(l, H); ctx.moveTo(r, 0); ctx.lineTo(r, H); ctx.stroke();
  // distance grid
  ctx.font = '600 12px Fredoka, system-ui'; ctx.textBaseline = 'middle';
  const z0 = Math.floor(pyToZ(H) / 10) * 10, z1 = pyToZ(0);
  for (let z = Math.max(0, z0); z <= Math.min(lv.length, z1); z += 10) {
    const y = zToPy(z);
    ctx.strokeStyle = z % 50 === 0 ? 'rgba(120,80,30,.45)' : 'rgba(120,80,30,.18)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(l, y); ctx.lineTo(r, y); ctx.stroke();
    ctx.fillStyle = '#12324A'; ctx.textAlign = 'right'; ctx.fillText(z + ' m', l - 6, y);
  }
  // start & finish
  const band = (z, label, col) => { const y = zToPy(z); ctx.fillStyle = col; ctx.fillRect(l, y - 4, r - l, 8); ctx.fillStyle = '#12324A'; ctx.textAlign = 'center'; ctx.font = '700 14px Fredoka, system-ui'; ctx.fillText(label, cx(), y - 14); ctx.font = '600 12px Fredoka, system-ui'; };
  band(0, 'START', '#8EDB7A'); band(lv.length, document.documentElement.lang === 'de' ? 'ZIEL' : 'FINISH', '#FF7FA8');
  // streams under everything
  for (const it of lv.items.filter(i => i.t === 'stream')) {
    const y0 = zToPy(it.z), y1 = zToPy(it.z + (it.len || 14));
    ctx.fillStyle = it === sel ? 'rgba(80,200,255,.45)' : 'rgba(255,255,255,.4)'; ctx.fillRect(l, y1, r - l, y0 - y1);
    ctx.strokeStyle = '#0B5F8A'; ctx.lineWidth = it === sel ? 3 : 1.5; ctx.strokeRect(l, y1, r - l, y0 - y1);
    ctx.fillStyle = '#0B5F8A'; ctx.textAlign = 'center'; ctx.font = '700 22px Fredoka, system-ui';
    const arrow = { left: '←', right: '→', up: '↑ up', down: '↓ down' }[it.dir] || '→';
    for (let k = 0; k < 3; k++) ctx.fillText(arrow, l + (r - l) * (0.2 + k * 0.3), (y0 + y1) / 2);
    ctx.font = '600 12px Fredoka, system-ui';
  }
  // items
  for (const it of lv.items) {
    if (it.t === 'stream') continue;
    const ic = iconFor(it);
    const size = it.t === 'shark' || it.t === 'wreckgate' || it.t === 'kraken' || it.t === 'hammer' ? 54 : it.t === 'pearl' || it.t === 'pearls' ? 22 : 38;
    for (const [x, z] of itemPoints(it)) {
      const px = xToPx(x), py = zToPy(z);
      if (py < -40 || py > H + 40) continue;
      if (ic && ic.complete) ctx.drawImage(ic, px - size / 2, py - size / 2, size, size);
      else if (emojiFor(it)) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(px, py, size / 2 - 2, 0, 7); ctx.fill(); ctx.font = `${Math.round(size * 0.62)}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#12324A'; ctx.fillText(emojiFor(it), px, py + 1); ctx.font = '600 12px Fredoka, system-ui'; }
      else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px, py, 10, 0, 7); ctx.fill(); }
    }
    const [x, z] = itemPoints(it)[0]; const px = xToPx(x), py = zToPy(z);
    const b = hBadge(it);
    if (b) { ctx.fillStyle = '#12324A'; ctx.beginPath(); ctx.arc(px + size / 2 - 2, py - size / 2 + 2, 8, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(b, px + size / 2 - 2, py - size / 2 + 3); }
    if (it === sel) { ctx.strokeStyle = '#FF4F7E'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.arc(px, py, size / 2 + 6, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  }
  // scroll hint
  
}

// ------------------------------------------------------------ hit testing & input
function hit(px, py) {
  let best = null, bd = 1e9;
  for (const it of lv.items) {
    if (it.t === 'stream') continue;
    for (const [x, z] of itemPoints(it)) { const d = Math.hypot(xToPx(x) - px, zToPy(z) - py); if (d < 30 && d < bd) { bd = d; best = it; } }
  }
  if (best) return best;
  for (const it of lv.items.filter(i => i.t === 'stream')) { const y0 = zToPy(it.z), y1 = zToPy(it.z + (it.len || 14)); if (py <= y0 && py >= y1) return it; }
  return null;
}
let drag = null;
cv.addEventListener('pointerdown', (e) => {
  cv.setPointerCapture(e.pointerId);
  const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
  const h = hit(px, py);
  if (tool !== 'select' && !h) {
    const T = TOOLS.find(t => t.id === tool);
    const it = T.make(round1(clampX(pxToX(px))), Math.max(2, Math.round(pyToZ(py))));
    lv.items.push(it); sel = it; save(); panel(); draw();
    drag = { mode: 'move', it, sx: px, sy: py, ox: it.x, oz: it.z, moved: true };
    return;
  }
  if (h) { sel = h; panel(); draw(); drag = { mode: 'move', it: h, sx: px, sy: py, ox: h.x, oz: h.z, moved: false }; }
  else { sel = null; panel(); draw(); drag = { mode: 'scroll', sy: py, oz: scrollZ }; }
});
cv.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
  if (drag.mode === 'scroll') { scrollZ = clampScroll(drag.oz + (py - drag.sy) / PX_PER_M); draw(); return; }
  if (Math.hypot(px - drag.sx, py - drag.sy) > 4) drag.moved = true;
  if (!drag.moved) return;
  const it = drag.it;
  if (it.t !== 'stream') it.x = round1(clampX(drag.ox + pxToX(px) - pxToX(drag.sx)));
  it.z = Math.max(1, Math.min(lv.length - 1, Math.round(drag.oz + (drag.sy - py) / PX_PER_M)));
  draw();
});
const up = () => { if (drag && drag.mode === 'move') { save(); panel(); } drag = null; };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
cv.addEventListener('wheel', (e) => { e.preventDefault(); scrollZ = clampScroll(scrollZ - e.deltaY / PX_PER_M); draw(); }, { passive: false });
addEventListener('keydown', (e) => { if ((e.key === 'Delete' || e.key === 'Backspace') && sel && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') { removeSel(); } });
const round1 = (v) => Math.round(v * 10) / 10;
const clampX = (x) => Math.max(LANE.minX, Math.min(LANE.maxX, x));
const clampScroll = (z) => Math.max(-10, Math.min(lv.length - (H - PAD) / PX_PER_M + 20, z));

// ------------------------------------------------------------ palette & panel
function buildPalette() {
  const p = $('palette'); p.innerHTML = '';
  for (const T of TOOLS) {
    const b = document.createElement('button'); b.className = 'tool' + (tool === T.id ? ' on' : '');
    b.setAttribute('aria-pressed', tool === T.id);
    b.innerHTML = (T.icon ? `<img src="icons/${T.icon}.png" alt="">` : `<span class="ic" aria-hidden="true">${T.id === 'select' ? '✥' : EMOJI[T.id] || '•'}</span>`) + `<span>${T.label}</span>`;
    b.onclick = () => { tool = T.id; buildPalette(); };
    p.appendChild(b);
  }
}
function seg(label, opts, val, on) {
  return `<div class="field" data-k="${label}"><span>${label}</span><div class="seg">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(val) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div></div>`;
}
function panel() {
  const el = $('panel');
  if (!sel) { el.innerHTML = `<p class="hint">${tool === 'select' ? 'Tap an item to edit it. Drag empty space to scroll.' : 'Tap the map to place: ' + TOOLS.find(t => t.id === tool).label}</p>`; return; }
  const it = sel; let h = `<div class="ptitle"><b>${NAMES[it.t]}</b> <span>at ${Math.round(it.z)} m</span></div><div class="fields">`;
  if (FLOATERS.includes(it.t)) h += seg('Height', [[LANE.low, 'Low'], [LANE.mid, 'Mid'], [LANE.high, 'High']], it.y ?? LANE.mid);
  if (it.t === 'pearls') h += seg('Count', [[3, '3'], [5, '5'], [8, '8'], [12, '12']], it.n || 5) + seg('Gap', [[2, 'Tight'], [3, 'Normal'], [4.5, 'Wide']], it.gap || 3) + seg('Shape', [[0, 'Straight'], [0.4, 'Slant →'], [-0.4, 'Slant ←']], it.dx || 0) + seg('Rise', [[0, 'Flat'], [0.25, 'Up ↗'], [-0.25, 'Down ↘']], it.dy || 0);
  if (it.t === 'moray') h += seg('Side', [[-1, '← Left'], [1, 'Right →']], it.x >= 0 ? 1 : -1) + seg('Home', [['rock', 'Rock'], ['tube', 'Pipe coral']], it.home || 'rock');
  if (it.t === 'hammer' || it.t === 'seasnake') h += seg('From', [['auto', 'Auto'], ['left', 'Left'], ['right', 'Right']], it.from || 'auto');
  if (it.t === 'decor') h += seg('Thing', DECOR.map(d => [d[0], d[2] + ' ' + d[1]]), it.kind);
  if (it.t === 'visitor') h += seg('Who', VISITORS.map(d => [d[0], d[2] + ' ' + d[1]]), it.kind);
  if (it.t === 'coral') h += seg('Kind', [['branch', 'Branch'], ['stag', 'Staghorn'], ['tube', 'Tube'], ['fan', 'Fan'], ['brain', 'Brain'], ['bubble', 'Bubble'], ['rock', 'Rock']], it.kind);
  if (it.t === 'stream') h += seg('Push', [['left', '← Left'], ['right', 'Right →'], ['up', '↑ Up'], ['down', '↓ Down']], it.dir) + seg('Length', [[10, 'Short'], [14, 'Medium'], [20, 'Long']], it.len || 14);
  h += `</div><div class="pbtns"><button class="alt" id="dupBtn">Duplicate</button><button class="danger" id="delBtn">Delete</button></div>`;
  el.innerHTML = h;
  const keys = { Height: 'y', Count: 'n', Gap: 'gap', Shape: 'dx', Rise: 'dy', Kind: 'kind', Push: 'dir', Length: 'len', Side: 'x', Home: 'home', From: 'from', Thing: 'kind', Who: 'kind' };
  el.querySelectorAll('.field').forEach(f => {
    const k = keys[f.dataset.k];
    f.querySelectorAll('button').forEach(b => b.onclick = () => { const v = b.dataset.v; it[k] = isNaN(+v) ? v : +v; save(); panel(); draw(); });
  });
  $('delBtn').onclick = removeSel;
  $('dupBtn').onclick = () => { const c = JSON.parse(JSON.stringify(it)); c.z = Math.min(lv.length - 2, c.z + 8); lv.items.push(c); sel = c; save(); panel(); draw(); };
}
function removeSel() { lv.items = lv.items.filter(i => i !== sel); sel = null; save(); panel(); draw(); }

// ------------------------------------------------------------ level settings & actions
function bindSettings() {
  $('lvName').value = lv.name; $('lvLen').value = lv.length;
  const sp = lv.speed <= 5.6 ? 'relaxed' : lv.speed >= 6.8 ? 'fast' : 'normal'; $('lvSpeed').value = sp;
  updateStats();
}
$('lvName').oninput = (e) => { lv.name = e.target.value.slice(0, 40) || 'My level'; save(); };
$('lvLen').onchange = (e) => { lv.length = Math.max(60, Math.min(2000, Math.round(+e.target.value || 200))); e.target.value = lv.length; save(); draw(); };
$('lvSpeed').onchange = (e) => { const m = { relaxed: [5, 6], normal: [6, 7.5], fast: [7, 9] }[e.target.value]; lv.speed = m[0]; lv.speedEnd = m[1]; save(); };
$('playBtn').onclick = () => { save(); location.href = 'index.html?play=custom'; };
$('copyBtn').onclick = async () => {
  const txt = JSON.stringify(lv, null, 1);
  try { await navigator.clipboard.writeText(txt); toast('Level copied'); }
  catch (e) { openModal('Copy your level', txt, false); }
};
$('shareBtn').onclick = async () => {
  if (!communityOnline()) { toast('Online sharing is not set up'); return; }
  if (lv.items.length < 3) { toast('Add at least 3 items first'); return; }
  let name = ''; try { name = localStorage.getItem('cubi_name') || ''; } catch (e) {}
  name = (prompt(document.documentElement.lang === 'de' ? `„${lv.name}“ mit allen Spielern teilen.\nDein Name (wird als Erbauer angezeigt):` : `Share "${lv.name}" with all players.\nYour name (shown as the builder):`, name) || '').trim().slice(0, 16);
  if (!name) return;
  try { localStorage.setItem('cubi_name', name); } catch (e) {}
  const b = $('shareBtn'); b.disabled = true; b.textContent = 'Sharing…';
  try { await publishLevel(lv, name); toast('Shared! Find it under Player levels'); }
  catch (e) { toast(e.message || 'Could not share'); }
  b.disabled = false; b.textContent = '🌍 Share online';
};
$('pasteBtn').onclick = () => openModal('Paste a level', '', true);
$('newBtn').onclick = () => { lv = normalizeLevel({ name: 'My level', length: 200, speed: 6, speedEnd: 7.5, items: [] }); sel = null; scrollZ = 0; save(); bindSettings(); panel(); draw(); };
$('tplSel').onchange = (e) => { const i = +e.target.value; if (i >= 0) { lv = normalizeLevel(JSON.parse(JSON.stringify(STARTER_LEVELS[i]))); lv.name += ' (copy)'; sel = null; scrollZ = 0; save(); bindSettings(); panel(); draw(); } e.target.value = '-1'; };
function openModal(title, text, editable) {
  $('mTitle').textContent = title; $('mText').value = text; $('mText').readOnly = !editable;
  $('mLoad').classList.toggle('hidden', !editable); $('modal').classList.remove('hidden');
  setTimeout(() => { $('mText').focus(); if (!editable) $('mText').select(); }, 50);
}
$('mClose').onclick = () => $('modal').classList.add('hidden');
$('mLoad').onclick = () => {
  try { lv = normalizeLevel(JSON.parse($('mText').value)); sel = null; scrollZ = 0; save(); bindSettings(); panel(); draw(); $('modal').classList.add('hidden'); toast('Level loaded'); }
  catch (e) { $('mErr').textContent = "That doesn't look like a level. Paste the text from Copy level."; }
};
function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.remove('show'), 1400); }

{ const st = document.createElement('style'); st.textContent = LANG_CSS + 'header .langSwitch{margin-left:12px}'; document.head.appendChild(st);
  const hd = document.querySelector('header'); if (hd) hd.appendChild(langSwitch()); }
onLangChange(() => { buildPalette(); panel(); draw(); });
buildPalette(); bindSettings(); panel(); resize(); save();
