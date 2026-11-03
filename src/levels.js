// Level format (also what the editor saves):
// { name, length (m), speed, speedEnd, items: [ { t, z, x, y?, ... } ] }
// t: pearl | pearls (n, gap) | jelly | puffer | urchin | shark | hammer (y, from) | seasnake (y, from) | coral (kind) | stream (dir, len) | anemone
// x: -3.4 (left) .. 3.4 (right).  y: 1.2 low · 2.4 mid · 3.6 high.  z: metres from the start.
export const LANE = { minX: -3.4, maxX: 3.4, low: 1.2, mid: 2.4, high: 3.6 };
export const HAZARDS = ['jelly', 'puffer', 'urchin'];
export const SPECIALS = ['wreckgate', 'moray', 'kraken', 'hammer', 'seasnake'];
export const CORAL_KINDS = ['branch', 'stag', 'tube', 'fan', 'brain', 'bubble', 'rock'];

const L = LANE;
const line = (z, x, y, n = 5, gap = 3, dx = 0, dy = 0) => ({ t: 'pearls', z, x, y, n, gap, dx, dy });

const BASE_LEVELS = [
  {
    name: 'Sunny Shallows', length: 230, speed: 5.5, speedEnd: 6.5,
    items: [
      { t: 'seasnake', z: 65, x: 2 }, { t: 'hammer', z: 200, x: -2, y: L.mid },
      line(15, 0, L.mid, 5),
      { t: 'anemone', z: 38, x: -1.5 },
      line(52, -1.5, L.low, 4),
      { t: 'coral', kind: 'branch', z: 70, x: 0 },
      line(78, 2, L.mid, 5),
      { t: 'jelly', z: 100, x: -1.6, y: L.mid },
      line(104, 1.6, L.mid, 4),
      { t: 'coral', kind: 'fan', z: 125, x: 2.2 },
      { t: 'coral', kind: 'tube', z: 128, x: -2.2 },
      line(118, 0, L.low, 4),
      { t: 'wreckgate', z: 140, x: 0 },
      line(134, 0, L.mid, 3, 2),
      { t: 'stream', z: 158, dir: 'right', len: 14 },
      line(152, -2, L.mid, 5),
      { t: 'shark', z: 172, x: 0, y: L.mid },
      { t: 'jelly', z: 180, x: 1.8, y: L.high },
      { t: 'urchin', z: 182, x: -1.2 },
      line(186, 0, L.mid, 6, 2.5, 0.25, 0),
      line(212, 0, L.high, 5),
    ],
  },
  {
    name: 'Jelly Garden', length: 300, speed: 6, speedEnd: 7.5,
    items: [
      { t: 'seasnake', z: 95, x: -2 }, { t: 'hammer', z: 186, x: 2, y: L.high },
      line(15, 0, L.mid, 5),
      { t: 'jelly', z: 40, x: -2, y: L.mid }, { t: 'jelly', z: 40, x: 2, y: L.mid },
      line(38, 0, L.mid, 4),
      { t: 'anemone', z: 62, x: 1.8 },
      { t: 'coral', kind: 'branch', z: 80, x: -2.4 }, { t: 'coral', kind: 'stag', z: 80, x: 2.4 },
      line(84, 0, L.low, 5),
      { t: 'jelly', z: 108, x: 0, y: L.mid },
      line(110, -2.2, L.high, 4), line(110, 2.2, L.low, 4),
      { t: 'moray', z: 122, x: 1, home: 'rock' },
      { t: 'urchin', z: 132, x: -2.5 }, { t: 'urchin', z: 136, x: 0 }, { t: 'urchin', z: 140, x: 2.5 },
      line(132, 0, L.high, 5),
      { t: 'shark', z: 150, x: 0, y: L.mid },
      { t: 'stream', z: 162, dir: 'left', len: 14 },
      { t: 'jelly', z: 170, x: -2.5, y: L.high },
      line(165, 1.5, L.mid, 5),
      { t: 'jelly', z: 198, x: -1.5, y: L.low }, { t: 'jelly', z: 204, x: 1.5, y: L.high },
      line(200, 0, L.mid, 5),
      { t: 'wreckgate', z: 222, x: -1.2 },
      line(214, -1.2, L.mid, 3, 2),
      { t: 'kraken', z: 252, x: 0 },
      { t: 'puffer', z: 258, x: 1.5, y: L.mid },
      { t: 'shark', z: 278, x: -1, y: L.mid },
      line(262, -1.5, L.mid, 5),
      line(285, 0, L.high, 5),
    ],
  },
  {
    name: 'Current Canyon', length: 360, speed: 6.5, speedEnd: 8.5,
    items: [
      { t: 'seasnake', z: 55, x: 2 }, { t: 'hammer', z: 158, x: -2, y: L.mid }, { t: 'seasnake', z: 226, x: -2 }, { t: 'hammer', z: 307, x: 2, y: L.low },
      line(15, 0, L.mid, 5),
      { t: 'stream', z: 35, dir: 'right', len: 16 },
      line(38, -2.5, L.mid, 5),
      { t: 'puffer', z: 68, x: 0, y: L.mid },
      { t: 'moray', z: 96, x: -1, home: 'tube' },
      line(70, -2.4, L.low, 4),
      { t: 'anemone', z: 92, x: 2 },
      { t: 'coral', kind: 'branch', z: 110, x: -1 }, { t: 'coral', kind: 'tube', z: 112, x: 1.4 },
      line(114, 3, L.mid, 4),
      { t: 'shark', z: 125, x: 1, y: L.mid },
      { t: 'stream', z: 135, dir: 'up', len: 14 },
      { t: 'jelly', z: 142, x: 0, y: L.high },
      line(140, 0, L.low, 5),
      { t: 'urchin', z: 170, x: -1.6 }, { t: 'urchin', z: 174, x: 1.6 },
      { t: 'jelly', z: 176, x: 0, y: L.mid },
      line(172, -2.8, L.high, 4),
      { t: 'kraken', z: 188, x: 1 },
      { t: 'stream', z: 200, dir: 'left', len: 16 },
      { t: 'puffer', z: 214, x: -1.5, y: L.low },
      line(206, 2.5, L.mid, 5),
      { t: 'jelly', z: 238, x: -2, y: L.mid }, { t: 'jelly', z: 244, x: 0, y: L.high }, { t: 'jelly', z: 250, x: 2, y: L.mid },
      line(240, 0, L.low, 6),
      { t: 'shark', z: 262, x: 0, y: L.high },
      { t: 'stream', z: 275, dir: 'down', len: 12 },
      line(278, 0, L.high, 5),
      { t: 'wreckgate', z: 296, x: 1.5 },
      line(288, 1.5, L.mid, 3, 2),
      { t: 'moray', z: 318, x: 1, home: 'tube' },
      { t: 'puffer', z: 330, x: -1.8, y: L.mid },
      line(335, 0, L.high, 6, 2.5, 0, -0.2),
    ],
  },
];

// every level is twice as long: the second half is a mirrored remix of the first
function doubled(lv) {
  const flip = { left: 'right', right: 'left', up: 'up', down: 'down' };
  const second = lv.items.map(i => ({ ...i, z: i.z + lv.length - 10, x: -(i.x || 0), ...(i.dir ? { dir: flip[i.dir] } : {}), ...(i.dx ? { dx: -i.dx } : {}) }));
  return { ...lv, length: lv.length * 2 - 10, speedEnd: lv.speedEnd + 0.8, items: [...lv.items, ...second] };
}
export const STARTER_LEVELS = BASE_LEVELS.map(doubled);

export function normalizeLevel(lv) {
  const out = {
    name: String(lv?.name || 'My level').slice(0, 40),
    length: Math.max(60, Math.min(2000, +lv?.length || 200)),
    speed: Math.max(3, Math.min(14, +lv?.speed || 6)),
    speedEnd: Math.max(3, Math.min(16, +lv?.speedEnd || +lv?.speed || 7)),
    items: Array.isArray(lv?.items) ? lv.items.filter(i => i && typeof i.t === 'string' && isFinite(+i.z)).map(i => ({ ...i, z: +i.z, x: +i.x || 0 })) : [],
  };
  out.items.sort((a, b) => a.z - b.z);
  return out;
}
export function countPearls(lv) { return lv.items.reduce((n, i) => n + (i.t === 'pearl' ? 1 : i.t === 'pearls' ? (i.n || 5) : 0), 0); }

// storage helpers (storage can be missing in some viewers)
export function saveCustom(lv) { const s = JSON.stringify(lv); try { localStorage.setItem('cubi_custom_level', s); } catch (e) {} try { window.name = 'cubi:' + s; } catch (e) {} }
export function loadCustom() {
  try { const s = localStorage.getItem('cubi_custom_level'); if (s) return normalizeLevel(JSON.parse(s)); } catch (e) {}
  try { if (window.name.startsWith('cubi:')) return normalizeLevel(JSON.parse(window.name.slice(5))); } catch (e) {}
  return null;
}
