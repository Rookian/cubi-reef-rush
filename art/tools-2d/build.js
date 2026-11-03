const { fishSide, fishFront, fishBack, fx, star } = require('./fish');
const { renderAll } = require('./render');
const fs = require('fs');
const TAU = Math.PI * 2;
const S = Math.sin;

// ---------- animations ----------
const anims = {
  idle: { fps: 8, n: 8, f: (t) => fishSide({ dy: 3 * S(TAU * t), tail: 0.35 * S(TAU * t), fin: 10 * S(TAU * t + 1.6), dorsal: 5 * S(TAU * t) }) },
  blink: { fps: 12, n: 4, f: (t, i) => fishSide({ eye: ['open', 'half', 'closed', 'half'][i] }) },
  swim: { fps: 12, n: 8, f: (t, i) => {
    const b = [0, 1, 2, 3].map(k => { const u = (t + k / 4) % 1; return fx.bubble(30 - u * 14, 112 - u * 40, 3 + u * 3, 1 - u); }).join('');
    return b + fishSide({ tail: S(TAU * t), fin: -14 + 22 * S(2 * TAU * t), dorsal: 8 * S(TAU * t), rot: -4, dx: 4 + 2 * S(TAU * t), dy: 2 * S(2 * TAU * t), sx: 1 + 0.03 * S(TAU * t), sy: 1 - 0.03 * S(TAU * t), look: [0.6, 0] });
  } },
  happy: { fps: 12, n: 8, f: (t, i) => {
    const h = S(Math.PI * t);
    const land = i === 0 || i === 7;
    const sp = (i >= 2 && i <= 6) ? fx.sparkle(40, 50 - h * 10, 9 * h + 3) + fx.sparkle(160, 40 - h * 8, 7 * h + 3, '#FFF3A0') + fx.sparkle(150, 160 - h * 30, 5 * h + 2) : '';
    return sp + fishSide({ eye: 'happy', mouth: 'smile', blushStrong: true, dy: -30 * h + 4, sx: land ? 1.08 : 1 - 0.04 * h, sy: land ? 0.9 : 1 + 0.05 * h, tail: 0.6 * S(TAU * t * 2), fin: -30 * h, rot: -6 * h });
  } },
  hurt: { fps: 12, n: 6, f: (t, i) => {
    const k = [
      { eye: 'wide', mouth: 'open', flash: true, dx: -2 },
      { eye: 'hurt', mouth: 'wobble', dx: -10, rot: -12, fin: -30 },
      { eye: 'hurt', mouth: 'wobble', dx: -12, rot: -10, flash: true, fin: -20 },
      { eye: 'hurt', mouth: 'wobble', dx: -8, rot: -6, fin: -10 },
      { eye: 'hurt', mouth: 'wobble', dx: -4, rot: -3, flash: true },
      { eye: 'sad', mouth: 'wobble', dx: 0, rot: 0 },
    ][i];
    const stars = i < 4 ? fx.hitStar(168, 70 - i * 4, 12 - i * 2) + fx.hitStar(176, 108 + i * 3, 8 - i) : '';
    return stars + (i >= 3 ? fx.sweat(144, 52, 1) : '') + fishSide(k);
  } },
  eat: { fps: 10, n: 6, f: (t, i) => {
    const m = ['o', 'open', 'wide', 'chomp', 'chomp', 'smile'][i];
    const dx = [0, 3, 6, 2, 0, 0][i];
    const food = i < 2 ? `<circle cx="${176 - i * 6}" cy="118" r="6" fill="#FF9E5E" stroke="#3B2614" stroke-width="2"/>` : '';
    const crumbs = (i === 3 || i === 4) ? fx.crumb(172, 104 - (i - 3) * 6, 2.6) + fx.crumb(178, 124 + (i - 3) * 4, 2) + fx.crumb(168, 132, 1.8) : '';
    const eye = i === 3 || i === 4 ? 'happy' : 'open';
    return food + crumbs + fishSide({ mouth: m, dx, eye, sy: i === 3 ? 0.96 : 1, sx: i === 3 ? 1.03 : 1, look: [1, 0.4] });
  } },
  sleep: { fps: 6, n: 8, f: (t) => {
    const zs = [0, 0.5].map(k => { const u = (t + k) % 1; return fx.z(146 + u * 24, 66 - u * 42, 18 + u * 14, u < 0.85 ? 1 : (1 - u) * 6); }).join('');
    return zs + fishSide({ eye: 'closed', mouth: 'o', dy: 4 + 2 * S(TAU * t), tail: 0.15 * S(TAU * t), fin: 6 * S(TAU * t), sy: 1 + 0.02 * S(TAU * t), sx: 1 - 0.015 * S(TAU * t), rot: 3 });
  } },
  dizzy: { fps: 10, n: 8, f: (t) => {
    const orb = [0, 1 / 3, 2 / 3].map(k => { const a = TAU * (t + k); return fx.sparkle(118 + 34 * Math.cos(a), 40 + 9 * S(a), 6, '#FFE14D', 0.65 + 0.35 * S(a)); }).join('');
    return fishSide({ eye: 'dizzy', mouth: 'wobble', rot: 7 * S(TAU * t), dx: 3 * S(TAU * t), tail: 0.4 * S(TAU * t), fin: 12 * S(TAU * t) }) + orb;
  } },
  turn: { fps: 10, n: 6, f: (t, i) => [
    fishSide({}), fishSide({ sx: 0.5 }), fishFront({ sx: 0.82 }), fishFront({}), fishSide({ flip: true, sx: 0.5 }), fishSide({ flip: true }),
  ][i] },
};

const CELL = 256;
const jobs = [];
const meta = { character: 'Cubi (young yellow boxfish)', frameWidth: CELL, frameHeight: CELL, facing: 'right (flip X for left)', animations: {} };
for (const [name, a] of Object.entries(anims)) {
  let svg = '';
  for (let i = 0; i < a.n; i++) svg += `<g transform="translate(${i * 200},0)">${a.f(i / a.n, i)}</g>`;
  jobs.push({ name: `sheet_${name}`, w: a.n * 200, h: 200, pw: a.n * CELL, ph: CELL, svg });
  meta.animations[name] = { file: `cubi_${name}_256.png`, frames: a.n, fps: a.fps, loop: !['hurt', 'eat', 'turn'].includes(name) };
}

// ---------- design-draft images ----------
const one = (name, svg, px = 400, vb = '0 0 200 200') => jobs.push({ name, w: 200, h: 200, pw: px, ph: px, viewBox: vb, svg, saveSvg: true });
one('hero', fishSide({}), 800);
one('turn_side', fishSide({})); one('turn_front', fishFront({})); one('turn_left', fishSide({ flip: true })); one('turn_back', fishBack({}));
const expr = {
  neutral: {}, happy: { eye: 'happy', mouth: 'smile', blushStrong: true }, laugh: { eye: 'happy', mouth: 'wide', blushStrong: true },
  surprised: { eye: 'wide', mouth: 'open' }, sad: { eye: 'sad', mouth: 'wobble' }, grumpy: { eye: 'angry', mouth: 'chomp' },
  hurt: { eye: 'hurt', mouth: 'wobble' }, sleepy: { eye: 'half', mouth: 'o' }, dizzy: { eye: 'dizzy', mouth: 'wobble' },
  love: { eye: 'heart', mouth: 'kiss', blushStrong: true }, starstruck: { eye: 'star', mouth: 'smile', blushStrong: true }, curious: { look: [-0.6, -0.6], mouth: 'kiss' },
};
for (const [k, v] of Object.entries(expr)) one(`expr_${k}`, fishSide(v), 320);
one('concept_a', fishSide({}));
one('concept_b', fishSide({ style: 'round', eyeR: 24, spotList: [[64, 80, 4], [78, 64, 3], [62, 112, 3.6], [84, 126, 3]] }));
one('concept_c', fishSide({ spots: 'hearts', blushStrong: true }));
one('concept_d', fishSide({ spots: 'rings', style: 'round' }));
one('grow_baby', fishSide({ style: 'round', eyeR: 25, scale: 0.72, spotList: [[66, 82, 4], [80, 66, 3], [64, 114, 3.4]] }));
one('grow_young', fishSide({}));
one('grow_adult', fishSide({ palette: 'adult', adult: true, eyeR: 15, scale: 1.12, blush: false, sx: 1.08 }));
for (const c of ['classic', 'shiny', 'berry', 'mint']) one(`color_${c}`, fishSide({ palette: c }));

// pearl collectible + heart icon
jobs.push({ name: 'pearl', w: 60, h: 60, pw: 120, ph: 120, svg: `<circle cx="30" cy="30" r="18" fill="#F4EEFF" stroke="#3B2614" stroke-width="3"/><circle cx="30" cy="34" r="14" fill="#DCCFF7"/><circle cx="30" cy="30" r="15" fill="none"/><circle cx="24" cy="23" r="5" fill="#fff"/>` });
jobs.push({ name: 'icon_heart', w: 40, h: 40, pw: 80, ph: 80, svg: `<path d="M20,34 C4,22 6,8 14,8 C18,8 20,12 20,14 C20,12 22,8 26,8 C34,8 36,22 20,34 Z" fill="#FF5C8A" stroke="#3B2614" stroke-width="3" stroke-linejoin="round"/><circle cx="14" cy="15" r="2.6" fill="#fff"/>` });

// underwater background 1280x720
const rnd = (() => { let s = 7; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
let bg = `<defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7FE0F2"/><stop offset=".6" stop-color="#2FA9D6"/><stop offset="1" stop-color="#1A7DB3"/></linearGradient>
<linearGradient id="ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
<rect width="1280" height="720" fill="url(#w)"/>`;
for (const x of [140, 420, 760, 1040]) bg += `<path d="M${x},0 L${x + 90},0 L${x + 260},720 L${x + 120},720 Z" fill="url(#ray)"/>`;
// far rocks
bg += `<path d="M0,560 Q120,470 260,540 Q380,480 520,560 Q700,500 860,550 Q1020,470 1160,540 Q1230,520 1280,530 L1280,720 L0,720 Z" fill="#2387B8" opacity=".7"/>`;
// seaweed
const weed = (x, h, c) => `<path d="M${x},700 C${x - 24},${700 - h * 0.3} ${x + 24},${700 - h * 0.6} ${x},${700 - h} C${x + 30},${700 - h * 0.6} ${x - 8},${700 - h * 0.3} ${x + 16},700 Z" fill="${c}" stroke="#14503A" stroke-width="4" stroke-linejoin="round"/>`;
for (const [x, h] of [[60, 260], [96, 190], [1120, 300], [1160, 210], [1210, 250], [640, 150]]) bg += weed(x, h, '#3FBF7F');
// sand
bg += `<path d="M0,640 Q200,610 420,636 Q660,662 900,628 Q1100,604 1280,630 L1280,720 L0,720 Z" fill="#F7DFA3" stroke="#C99A52" stroke-width="4"/>`;
for (let i = 0; i < 40; i++) bg += `<circle cx="${rnd() * 1280}" cy="${650 + rnd() * 60}" r="${1.5 + rnd() * 2}" fill="#D9B36E"/>`;
// coral
const coral = (x, y, s, c) => `<g transform="translate(${x},${y}) scale(${s})"><path d="M0,0 L0,-70 Q0,-90 -16,-100 Q-30,-108 -30,-120 Q-30,-134 -18,-134 Q-6,-134 -6,-120 Q-6,-110 4,-104 Q10,-120 10,-140 Q10,-156 24,-156 Q38,-156 38,-140 Q38,-112 22,-84 Q34,-90 44,-96 Q48,-110 60,-110 Q72,-110 72,-96 Q72,-80 44,-66 Q24,-56 24,-30 L24,0 Z" fill="${c}" stroke="#7A1F3D" stroke-width="5" stroke-linejoin="round"/></g>`;
bg += coral(220, 650, 1.2, '#FF7FA8') + coral(980, 640, 1.0, '#FF9A6B') + coral(1010, 660, 0.7, '#FF7FA8');
bg += `<ellipse cx="380" cy="648" rx="70" ry="30" fill="#8A9BB0" stroke="#3E4A5A" stroke-width="5"/><ellipse cx="362" cy="638" rx="24" ry="8" fill="#B3C1D2"/>`;
for (let i = 0; i < 18; i++) { const x = rnd() * 1280, y = rnd() * 560, r = 3 + rnd() * 8; bg += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" fill-opacity=".18" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>`; }
jobs.push({ name: 'scene_bg', w: 1280, h: 720, svg: bg });

renderAll(jobs, '../out').then(() => {
  fs.writeFileSync('../out/cubi_sprites.json', JSON.stringify(meta, null, 2));
  console.log('done', jobs.length);
});
