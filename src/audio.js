// Cubi's sound: a procedurally played underwater melody + cute sound effects (Web Audio, no files).
let ctx = null, master, musicBus, sfxBus, wet, filt, delay;
let on = true; try { on = localStorage.getItem('cubi_sound') !== 'off'; } catch (e) {}
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function init() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = on ? 0.9 : 0;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
  master.connect(comp).connect(ctx.destination);
  // underwater feel: soft lowpass that slowly "breathes", plus a watery reverb
  filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 3200; filt.Q.value = 0.6;
  const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 0.09; lfoG.gain.value = 700; lfo.connect(lfoG).connect(filt.frequency); lfo.start();
  musicBus = ctx.createGain(); musicBus.gain.value = 0.55; musicBus.connect(filt);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master);
  filt.connect(master);
  const conv = ctx.createConvolver(); conv.buffer = impulse(2.6); wet = ctx.createGain(); wet.gain.value = 0.32; wet.connect(conv).connect(master);
  // echo for the melody (dotted eighth)
  delay = ctx.createDelay(1); delay.delayTime.value = 0.49; const fb = ctx.createGain(); fb.gain.value = 0.3; const dl = ctx.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 1800;
  delay.connect(dl).connect(fb).connect(delay); dl.connect(musicBus);
  startMusic();
}
function impulse(sec) {
  const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2); }
  return b;
}
const noiseBuf = () => { const n = ctx.sampleRate * 0.5, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return b; };
let _noise = null;

// ---------- instruments ----------
function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function kalimba(m, t, vol = 0.22, dest = musicBus, echo = true, pan = 0) {
  const f = mtof(m), o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g1 = ctx.createGain(), g2 = ctx.createGain(), p = ctx.createStereoPanner();
  o1.type = 'sine'; o1.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 4.02;
  env(g1, t, 0.005, vol, 0.9); env(g2, t, 0.002, vol * 0.35, 0.12);
  p.pan.value = pan; o1.connect(g1).connect(p); o2.connect(g2).connect(p); p.connect(dest); p.connect(wet); if (echo) p.connect(delay);
  o1.start(t); o2.start(t); o1.stop(t + 1.1); o2.stop(t + 0.3);
}
function pad(ms, t, dur) {
  ms.forEach((m, i) => [-6, 6].forEach(det => {
    const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = mtof(m); o.detune.value = det; lp.type = 'lowpass'; lp.frequency.value = 900;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.028, t + 0.9); g.gain.setValueAtTime(0.028, t + dur - 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.6);
    o.connect(lp).connect(g); g.connect(musicBus); g.connect(wet); o.start(t); o.stop(t + dur + 0.7);
  }));
}
function bass(m, t, vol = 0.2) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = mtof(m);
  env(g, t, 0.01, vol, 0.38); o.connect(g).connect(musicBus); o.start(t); o.stop(t + 0.5);
}
function thump(t, vol = 0.18) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.18);
  env(g, t, 0.005, vol, 0.22); o.connect(g).connect(musicBus); o.start(t); o.stop(t + 0.3);
}
function shaker(t, vol = 0.05) {
  _noise ||= noiseBuf(); const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = _noise; bp.type = 'bandpass'; bp.frequency.value = 5200; bp.Q.value = 1.2; env(g, t, 0.004, vol, 0.07);
  s.connect(bp).connect(g).connect(musicBus); s.start(t, Math.random() * 0.3); s.stop(t + 0.12);
}
function blip(t, f0 = 300, f1 = 900, vol = 0.09, dur = 0.08, dest = musicBus) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(g, t, 0.004, vol, dur + 0.03); o.connect(g); g.connect(dest); g.connect(wet); o.start(t); o.stop(t + dur + 0.1);
}

// ---------- the song: F major, 92 bpm, 4 chords x 1 bar, two melody phrases ----------
const BPM = 92, STEP = 60 / BPM / 2;          // eighth notes
const CHORDS = [[53, 57, 60, 64], [50, 53, 57, 60], [46, 50, 53, 57], [48, 52, 55, 62]];   // Fmaj7, Dm7, Bbmaj7, Cadd9
const ROOTS = [41, 38, 34, 36];
const _ = null;
const MEL = [
  [72, _, 69, 72, 77, _, 76, _,   74, _, 72, 69, 72, _, _, _,   74, _, 77, 76, 74, _, 72, _,   67, 69, 72, _, 74, _, _, _],
  [77, _, 76, 74, 72, _, 69, _,   72, 74, 72, 69, 65, _, _, _,  70, _, 74, 77, 81, _, 79, 77,  76, _, 74, _, 72, _, _, 67],
  [_, _, 81, _, 79, 77, _, 76,    74, _, 72, _, 69, _, 72, _,   _, 74, 77, _, 74, 70, _, 69,   72, _, _, 74, 76, _, 77, _],
];
let step = 0, nextT = 0, timer = null, mode = 'menu', phrase = 0;
function startMusic() {
  nextT = ctx.currentTime + 0.1;
  timer = setInterval(schedule, 25);
}
function schedule() {
  if (!ctx || ctx.state !== 'running') return;
  while (nextT < ctx.currentTime + 0.15) { playStep(step, nextT); nextT += STEP * (step % 2 ? 0.94 : 1.06); step++; }   // a little swing
}
function playStep(i, t) {
  const s32 = i % 32, bar = Math.floor(s32 / 8), b8 = s32 % 8;
  if (s32 === 0) phrase = Math.floor(i / 32) % 4 === 3 ? 2 : Math.floor(i / 32) % 2;
  const busy = mode === 'play';
  if (b8 === 0) pad(CHORDS[bar], t, STEP * 8);
  if (b8 === 0 || b8 === 3 || (busy && b8 === 6)) bass(ROOTS[bar] + (b8 === 6 ? 7 : 0), t, b8 === 0 ? 0.22 : 0.15);
  if (busy) { if (b8 === 0 || b8 === 4) thump(t, 0.16); if (b8 % 2 === 1) shaker(t, b8 === 3 || b8 === 7 ? 0.05 : 0.03); }
  const m = MEL[phrase][s32];
  if (m && mode !== 'over') kalimba(m, t, mode === 'menu' ? 0.16 : 0.2, musicBus, true, Math.sin(i * 0.7) * 0.25);
  else if (busy && b8 % 2 === 1 && Math.random() < 0.35) kalimba(CHORDS[bar][Math.floor(Math.random() * 4)] + 24, t, 0.05, musicBus, false, (Math.random() - 0.5) * 0.8);   // sparkles
  if (Math.random() < (busy ? 0.12 : 0.06)) { const f = 280 + Math.random() * 400; blip(t + Math.random() * STEP, f, f * 2.6, 0.05); }       // bubbles
}

// ---------- public API ----------
const unlock = () => { init(); if (ctx && ctx.state === 'suspended') ctx.resume(); };
['pointerdown', 'keydown', 'touchstart'].forEach(e => addEventListener(e, unlock, { passive: true }));
const T = () => ctx ? ctx.currentTime + 0.01 : 0;
const ok = () => ctx && ctx.state === 'running' && on;
let combo = 0, lastPearl = 0;
export const sound = {
  get on() { return on; },
  toggle() { on = !on; try { localStorage.setItem('cubi_sound', on ? 'on' : 'off'); } catch (e) {} unlock(); if (master) master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.05); return on; },
  setMode(m) { mode = m; if (musicBus) musicBus.gain.setTargetAtTime(m === 'over' ? 0.25 : 0.55, ctx.currentTime, 0.4); },
  pearl() {
    if (!ok()) return; const now = performance.now(); combo = now - lastPearl < 1300 ? combo + 1 : 0; lastPearl = now;
    const scale = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93], m = scale[Math.min(combo, scale.length - 1)], t = T();
    kalimba(m, t, 0.2, sfxBus, false, 0); kalimba(m + 7, t + 0.06, 0.14, sfxBus, false, 0.2);
  },
  hurt() {   // cute "uh-oh" squeak with a wobble, plus a little bubble burst
    if (!ok()) return; const t = T();
    [[1320, 1050, 0, 0.13], [880, 660, 0.15, 0.26]].forEach(([f0, f1, dt, d]) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(), vib = ctx.createOscillator(), vg = ctx.createGain();
      o.type = 'triangle'; lp.type = 'lowpass'; lp.frequency.value = 3000;
      o.frequency.setValueAtTime(f0, t + dt); o.frequency.exponentialRampToValueAtTime(f1, t + dt + d);
      vib.frequency.value = 13; vg.gain.value = dt ? 28 : 12; vib.connect(vg).connect(o.frequency);
      env(g, t + dt, 0.01, 0.22, d); o.connect(lp).connect(g).connect(sfxBus); g.connect(wet);
      o.start(t + dt); vib.start(t + dt); o.stop(t + dt + d + 0.1); vib.stop(t + dt + d + 0.1);
    });
    for (let k = 0; k < 4; k++) blip(t + 0.05 + k * 0.05, 400 + k * 120, 1200 + k * 200, 0.05, 0.06, sfxBus);
  },
  toxin() {
    if (!ok()) return; const t = T(); _noise ||= noiseBuf();
    const s = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = _noise;
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(400, t); lp.frequency.exponentialRampToValueAtTime(2400, t + 0.15); lp.frequency.exponentialRampToValueAtTime(300, t + 0.5);
    env(g, t, 0.03, 0.35, 0.45); s.connect(lp).connect(g).connect(sfxBus); g.connect(wet); s.start(t); s.stop(t + 0.6);
    blip(t, 140, 70, 0.25, 0.25, sfxBus);
  },
  bump() { if (!ok()) return; blip(T(), 220, 160, 0.12, 0.09, sfxBus); },
  blub() { if (!ok()) return; const f = 350 + Math.random() * 200; blip(T(), f, f * 2.4, 0.1, 0.09, sfxBus); },
  boop() { if (!ok()) return; const t = T(); blip(t, 520, 760, 0.1, 0.06, sfxBus); kalimba(79 + Math.floor(Math.random() * 3) * 2, t + 0.02, 0.07, sfxBus, false); },
  pop() { if (!ok()) return; const t = T(); blip(t, 900, 1800, 0.12, 0.04, sfxBus); kalimba(84 + Math.floor(Math.random() * 3) * 2, t + 0.03, 0.08, sfxBus, false); },
  warn() { if (!ok()) return; const t = T(); kalimba(81, t, 0.14, sfxBus, false); kalimba(81, t + 0.16, 0.14, sfxBus, false); },
  whale() {   // a soft, far-away whale-shark "hum"
    if (!ok()) return; const t = T();
    [0, 0.05].forEach((dt, k) => { const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(); o.type = 'sawtooth'; lp.type = 'lowpass'; lp.frequency.value = 520;
      o.frequency.setValueAtTime(150 + k * 2, t + dt); o.frequency.linearRampToValueAtTime(230, t + dt + 0.9); o.frequency.linearRampToValueAtTime(170, t + dt + 2.0);
      g.gain.setValueAtTime(0.0001, t + dt); g.gain.exponentialRampToValueAtTime(0.09, t + dt + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 2.3);
      o.connect(lp).connect(g); g.connect(sfxBus); g.connect(wet); g.connect(wet); o.start(t + dt); o.stop(t + dt + 2.4); });
  },
  start() { if (!ok()) return; const t = T(); [65, 69, 72, 77].forEach((m, i) => kalimba(m, t + i * 0.08, 0.16, sfxBus, false)); },
  win() { if (!ok()) return; const t = T(); [72, 76, 79, 84, 79, 84, 88].forEach((m, i) => kalimba(m, t + i * 0.12 + (i > 3 ? 0.12 : 0), 0.2, sfxBus, false, (i % 2 ? 0.3 : -0.3))); },
  over() { if (!ok()) return; const t = T(); [77, 74, 72, 69, 65].forEach((m, i) => kalimba(m, t + i * 0.22, 0.17, sfxBus, false)); },
};
