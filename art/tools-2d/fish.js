// Cubi the young yellow boxfish — parametric SVG generator.
// Coordinate space: 200x200 cell, side view faces RIGHT.

const PALETTES = {
  classic: { body: '#FFD23F', shade: '#F0AE17', light: '#FFF3B0', spot: '#2E2318', fin: '#FFB23A', finRay: '#FFE08A', tail: '#FFBF2E', line: '#3B2614', lips: '#FF9A5C', blush: '#FF8FA3', pupil: '#1F1A2E' },
  shiny:   { body: '#8FE3FF', shade: '#4DB8E8', light: '#E3F8FF', spot: '#1D3A5C', fin: '#5FC8F0', finRay: '#C9F1FF', tail: '#6FD0F5', line: '#173049', lips: '#FF9AB8', blush: '#FF8FC0', pupil: '#14203A' },
  berry:   { body: '#FFB3D1', shade: '#F07FAE', light: '#FFE6F1', spot: '#5A1F3F', fin: '#FF8CBE', finRay: '#FFD6E8', tail: '#FF9CC6', line: '#4A1832', lips: '#FF6F7F', blush: '#FF6F9A', pupil: '#2A1426' },
  mint:    { body: '#A8F0C6', shade: '#62CF97', light: '#E6FFF0', spot: '#1F4A37', fin: '#7FE0AC', finRay: '#D6FBE6', tail: '#8BE6B4', line: '#173A2A', lips: '#FFA36C', blush: '#FF9A9A', pupil: '#14241C' },
  adult:   { body: '#F2C53A', shade: '#C9921A', light: '#FBE7A0', spot: '#1E1A16', fin: '#E8A43A', finRay: '#F7D58A', tail: '#EBB13A', line: '#33230F', lips: '#E8875A', blush: '#F09A9A', pupil: '#16131F' },
};

const DEFAULT_SPOTS = [[68,74,4.2],[88,65,3],[60,103,4.4],[81,92,3.2],[101,72,3],[73,123,3.6],[97,110,2.6],[57,82,2.4]];
const HEART = (x,y,r) => `M${x},${y+r*0.9} C${x-r*1.6},${y-r*0.2} ${x-r*0.9},${y-r*1.5} ${x},${y-r*0.55} C${x+r*0.9},${y-r*1.5} ${x+r*1.6},${y-r*0.2} ${x},${y+r*0.9} Z`;

let uid = 0;

function fishSide(o = {}) {
  const p = PALETTES[o.palette || 'classic'];
  const id = 'k' + (uid++);
  const lw = o.lw ?? 3.2;
  const tailS = o.tail ?? 0;         // -1..1 sweep
  const finA = o.fin ?? 0;           // pectoral angle deg
  const dorsA = o.dorsal ?? 0;
  const eye = o.eye || 'open';
  const mouth = o.mouth || 'o';
  const look = o.look || [0, 0];
  const round = o.style === 'round';
  const eyeR = o.eyeR ?? (round ? 22 : 19);

  const body = round
    ? 'M70,58 Q98,50 126,58 Q150,66 150,100 Q150,136 124,143 Q98,149 70,143 Q46,136 46,100 Q46,64 70,58 Z'
    : 'M66,56 Q96,52 122,56 Q146,57 147,82 Q149,98 148,114 Q146,143 120,144 Q94,147 68,144 Q48,143 48,122 Q46,100 48,78 Q48,57 66,56 Z';

  // tail
  const tsx = 1 - 0.5 * Math.abs(tailS);
  const tRot = tailS * 16;
  const tail = `
  <g transform="translate(40,100) rotate(${tRot}) scale(${tsx.toFixed(3)},1)">
    <path d="M2,0 C-6,-6 -14,-22 -28,-24 C-23,-9 -23,9 -28,24 C-14,22 -6,6 2,0 Z" fill="${p.tail}" stroke="${p.line}" stroke-width="${lw}" stroke-linejoin="round"/>
    <path d="M-3,0 L-22,-15 M-3,0 L-24,0 M-3,0 L-22,15" stroke="${p.finRay}" stroke-width="1.8" stroke-linecap="round" fill="none" opacity=".9"/>
  </g>
  <rect x="34" y="89" width="22" height="22" rx="8" fill="${p.body}" stroke="${p.line}" stroke-width="${lw}"/>`;

  const dorsal = `<g transform="translate(66,60) rotate(${dorsA}) scale(.78)"><path d="M4,2 C0,-10 -12,-20 -22,-16 C-20,-8 -12,0 -4,4 Z" fill="${p.fin}" stroke="${p.line}" stroke-width="${lw*0.85}" stroke-linejoin="round"/></g>`;
  const anal = `<g transform="translate(70,141) rotate(${-dorsA}) scale(.62)"><path d="M4,-2 C0,10 -12,20 -22,16 C-20,8 -12,0 -4,-4 Z" fill="${p.fin}" stroke="${p.line}" stroke-width="${lw*0.85}" stroke-linejoin="round"/></g>`;

  const pect = `<g transform="translate(108,114) rotate(${finA})">
    <path d="M2,0 C-4,-11 -24,-15 -32,-7 C-36,2 -27,14 -6,9 Z" fill="${p.fin}" fill-opacity=".92" stroke="${p.line}" stroke-width="${lw*0.85}" stroke-linejoin="round"/>
    <path d="M-2,2 L-26,-7 M-2,3 L-26,3" stroke="${p.finRay}" stroke-width="1.6" stroke-linecap="round" fill="none"/>
  </g>`;

  // spots
  let spots = '';
  const spotStyle = o.spots || 'dots';
  const spotList = o.spotList || (o.adult ? DEFAULT_SPOTS.concat([[110,64,2.6],[90,130,2.8],[64,138,2.2],[112,132,2.4],[52,118,2.2]]) : DEFAULT_SPOTS);
  if (spotStyle === 'dots') spots = spotList.map(([x,y,r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${p.spot}"/>`).join('');
  if (spotStyle === 'hearts') spots = spotList.slice(0,6).map(([x,y,r]) => `<path d="${HEART(x,y,r*1.1)}" fill="${p.spot}"/>`).join('');
  if (spotStyle === 'rings') spots = spotList.slice(0,6).map(([x,y,r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${p.spot}" stroke-width="2"/>`).join('');

  // eye
  const ex = round ? 118 : 120, ey = 88;
  let eyeSvg = '';
  const px = ex + 4 + look[0] * 5, py = ey + 1 + look[1] * 5;
  const sclera = (r) => `<circle cx="${ex}" cy="${ey}" r="${r}" fill="#fff" stroke="${p.line}" stroke-width="${lw}"/>`;
  const pupil = (r) => `<circle cx="${px}" cy="${py}" r="${r}" fill="${p.pupil}"/><circle cx="${px+r*0.4}" cy="${py-r*0.45}" r="${r*0.36}" fill="#fff"/><circle cx="${px-r*0.35}" cy="${py+r*0.45}" r="${r*0.18}" fill="#fff"/>`;
  const pr = eyeR * 0.6;
  if (eye === 'open') eyeSvg = sclera(eyeR) + pupil(pr);
  if (eye === 'wide') eyeSvg = sclera(eyeR + 2) + pupil(pr * 0.55);
  if (eye === 'half') eyeSvg = sclera(eyeR) + pupil(pr) +
    `<path d="M${ex-eyeR},${ey} A${eyeR},${eyeR} 0 0 1 ${ex+eyeR},${ey} Z" fill="${p.body}" stroke="${p.line}" stroke-width="${lw}" stroke-linejoin="round"/>`;
  if (eye === 'closed') eyeSvg = `<path d="M${ex-14},${ey} Q${ex},${ey+11} ${ex+14},${ey}" fill="none" stroke="${p.line}" stroke-width="${lw+0.8}" stroke-linecap="round"/>`;
  if (eye === 'happy') eyeSvg = `<path d="M${ex-14},${ey+6} Q${ex},${ey-12} ${ex+14},${ey+6}" fill="none" stroke="${p.line}" stroke-width="${lw+1}" stroke-linecap="round"/>`;
  if (eye === 'hurt') eyeSvg = `<path d="M${ex-10},${ey-10} L${ex+10},${ey} L${ex-10},${ey+10}" fill="none" stroke="${p.line}" stroke-width="${lw+1}" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (eye === 'angry') eyeSvg = sclera(eyeR) + pupil(pr) + `<path d="M${ex-eyeR-2},${ey-eyeR+4} L${ex+eyeR+2},${ey-6} L${ex+eyeR+2},${ey-eyeR-6} L${ex-eyeR-2},${ey-eyeR-6} Z" fill="${p.body}"/><path d="M${ex-eyeR-2},${ey-eyeR+4} L${ex+eyeR+1},${ey-6}" stroke="${p.line}" stroke-width="${lw+0.6}" stroke-linecap="round"/>`;
  if (eye === 'sad') eyeSvg = sclera(eyeR) + pupil(pr) + `<path d="M${ex-eyeR-2},${ey-8} L${ex+eyeR+2},${ey-eyeR+2} L${ex+eyeR+2},${ey-eyeR-6} L${ex-eyeR-2},${ey-eyeR-6} Z" fill="${p.body}"/><path d="M${ex-eyeR},${ey-8} L${ex+eyeR},${ey-eyeR+2}" stroke="${p.line}" stroke-width="${lw+0.6}" stroke-linecap="round"/>`;
  if (eye === 'dizzy') eyeSvg = sclera(eyeR) + `<path d="M${ex},${ey} m-1,0 a2,2 0 1 1 4,0 a5,5 0 1 1 -9,0 a8,8 0 1 1 15,0 a11,11 0 1 1 -20,1" fill="none" stroke="${p.pupil}" stroke-width="2.4" stroke-linecap="round"/>`;
  if (eye === 'star') eyeSvg = sclera(eyeR) + `<path d="${star(px, py, pr*1.05, pr*0.45)}" fill="#FFB300" stroke="${p.pupil}" stroke-width="2"/>`;
  if (eye === 'heart') eyeSvg = sclera(eyeR) + `<path d="${HEART(px, py, pr*0.9)}" fill="#FF4F7A" stroke="${p.pupil}" stroke-width="1.6"/>`;

  // mouth at snout
  const mx = round ? 152 : 151, my = 118;
  let mouthSvg = '';
  const lipsBase = (rx, ry) => `<ellipse cx="${mx}" cy="${my}" rx="${rx}" ry="${ry}" fill="${p.lips}" stroke="${p.line}" stroke-width="${lw*0.85}"/>`;
  if (mouth === 'o') mouthSvg = lipsBase(6.5, 7.5) + `<ellipse cx="${mx+1.5}" cy="${my}" rx="1.8" ry="2.8" fill="${p.line}"/>`;
  if (mouth === 'kiss') mouthSvg = lipsBase(6.5, 5) + `<path d="M${mx-2},${my} L${mx+5},${my}" stroke="${p.line}" stroke-width="1.8" stroke-linecap="round"/>`;
  if (mouth === 'open') mouthSvg = lipsBase(7, 10) + `<ellipse cx="${mx+1.5}" cy="${my+0.5}" rx="3.6" ry="6.4" fill="#7A2B2B"/>`;
  if (mouth === 'wide') mouthSvg = lipsBase(8.5, 12.5) + `<ellipse cx="${mx+1.5}" cy="${my+1}" rx="5" ry="8.6" fill="#7A2B2B"/><ellipse cx="${mx+2}" cy="${my+5}" rx="3" ry="2.6" fill="#FF7A8A"/>`;
  if (mouth === 'smile') mouthSvg = lipsBase(5.5, 6.5) + `<path d="M${mx-2},${my-1.5} Q${mx+1},${my+3.5} ${mx+5},${my-1.5}" fill="none" stroke="${p.line}" stroke-width="1.8" stroke-linecap="round"/>`;
  if (mouth === 'wobble') mouthSvg = lipsBase(5.5, 6.5) + `<path d="M${mx-2},${my+1} q1.5,-2 3,0 q1.5,2 3,0" fill="none" stroke="${p.line}" stroke-width="1.6" stroke-linecap="round"/>`;
  if (mouth === 'chomp') mouthSvg = lipsBase(6, 4) + `<path d="M${mx-3},${my} L${mx+5},${my}" stroke="${p.line}" stroke-width="2" stroke-linecap="round"/>`;

  const blush = o.blush === false ? '' : `<ellipse cx="${ex+6}" cy="${ey+26}" rx="8.5" ry="4.6" fill="${p.blush}" opacity="${o.blushStrong ? 0.85 : 0.55}"/>`;

  const flash = o.flash ? `filter="url(#${id}f)"` : '';
  const defs = `<defs>
    <clipPath id="${id}c"><path d="${body}"/></clipPath>
    <filter id="${id}f" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="linear" slope=".55" intercept=".45"/><feFuncG type="linear" slope=".5" intercept=".12"/><feFuncB type="linear" slope=".5" intercept=".14"/></feComponentTransfer></filter>
  </defs>`;

  const sx = o.sx ?? 1, sy = o.sy ?? 1, dx = o.dx ?? 0, dy = o.dy ?? 0, rot = o.rot ?? 0;
  const scale = o.scale ?? 1;
  const flip = o.flip ? -1 : 1;
  const cx = 98, cy = 100;
  const tf = `translate(${100 + dx},${100 + dy}) rotate(${rot}) scale(${flip * sx * scale},${sy * scale}) translate(${-cx},${-cy})`;

  return `${defs}<g transform="${tf}" ${flash}>
    ${tail}${dorsal}${anal}
    <path d="${body}" fill="${p.body}"/>
    <g clip-path="url(#${id}c)">
      <ellipse cx="98" cy="156" rx="78" ry="30" fill="${p.shade}"/>
      <ellipse cx="80" cy="70" rx="24" ry="9" transform="rotate(-8 80 70)" fill="${p.light}" opacity=".85"/>
      ${spots}
    </g>
    <circle cx="106" cy="62" r="2.8" fill="#fff" opacity=".9"/>
    <path d="${body}" fill="none" stroke="${p.line}" stroke-width="${lw}" stroke-linejoin="round"/>
    ${blush}${eyeSvg}${mouthSvg}${pect}
  </g>`;
}

function star(cx, cy, R, r, n = 5) {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + i * Math.PI / n;
    const rr = i % 2 ? r : R;
    d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(2) + ',' + (cy + rr * Math.sin(a)).toFixed(2);
  }
  return d + 'Z';
}

// Front view (facing viewer)
function fishFront(o = {}) {
  const p = PALETTES[o.palette || 'classic'];
  const lw = o.lw ?? 3.2;
  const id = 'k' + (uid++);
  const body = 'M66,58 Q100,52 134,58 Q148,60 148,84 Q150,104 146,124 Q142,146 118,146 Q100,148 82,146 Q58,146 54,124 Q50,104 52,84 Q52,60 66,58 Z';
  const fin = o.fin ?? 0;
  const eye = o.eye || 'open';
  const sx = o.sx ?? 1, sy = o.sy ?? 1, dy = o.dy ?? 0, dx = o.dx ?? 0;
  const eyes = [[74, 88, 1], [126, 88, -1]].map(([x, y, s]) => {
    if (eye === 'closed') return `<path d="M${x-12},${y} Q${x},${y+10} ${x+12},${y}" fill="none" stroke="${p.line}" stroke-width="${lw+0.8}" stroke-linecap="round"/>`;
    if (eye === 'happy') return `<path d="M${x-12},${y+5} Q${x},${y-10} ${x+12},${y+5}" fill="none" stroke="${p.line}" stroke-width="${lw+1}" stroke-linecap="round"/>`;
    const px = x + s * 3;
    return `<circle cx="${x}" cy="${y}" r="17" fill="#fff" stroke="${p.line}" stroke-width="${lw}"/>
      <circle cx="${px}" cy="${y+1}" r="10" fill="${p.pupil}"/><circle cx="${px+4}" cy="${y-4}" r="3.6" fill="#fff"/><circle cx="${px-3.5}" cy="${y+5}" r="1.8" fill="#fff"/>`;
  }).join('');
  const spots = [[100,70,3.2],[88,128,2.6],[114,130,2.8],[62,112,2.4],[138,110,2.4]].map(([x,y,r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${p.spot}"/>`).join('');
  const pect = (x, s) => `<g transform="translate(${x},116) rotate(${s * fin})"><path d="M0,-4 C${s*-14},-14 ${s*-22},-6 ${s*-22},4 C${s*-20},12 ${s*-10},12 0,6 Z" fill="${p.fin}" stroke="${p.line}" stroke-width="${lw*0.85}" stroke-linejoin="round"/></g>`;
  const tf = `translate(${100+dx},${100+dy}) scale(${sx},${sy}) translate(-100,-100)`;
  return `<defs><clipPath id="${id}c"><path d="${body}"/></clipPath></defs>
  <g transform="${tf}">
    <ellipse cx="100" cy="52" rx="5" ry="10" fill="${p.fin}" stroke="${p.line}" stroke-width="${lw*0.85}"/>
    <ellipse cx="100" cy="150" rx="5" ry="8" fill="${p.fin}" stroke="${p.line}" stroke-width="${lw*0.85}"/>
    <path d="${body}" fill="${p.body}"/>
    <g clip-path="url(#${id}c)">
      <ellipse cx="100" cy="160" rx="80" ry="32" fill="${p.shade}"/>
      <ellipse cx="86" cy="66" rx="22" ry="7" fill="${p.light}" opacity=".85"/>
      ${spots}
    </g>
    <path d="${body}" fill="none" stroke="${p.line}" stroke-width="${lw}" stroke-linejoin="round"/>
    <ellipse cx="70" cy="112" rx="8" ry="4.4" fill="${p.blush}" opacity=".55"/><ellipse cx="130" cy="112" rx="8" ry="4.4" fill="${p.blush}" opacity=".55"/>
    ${eyes}
    <ellipse cx="100" cy="118" rx="8" ry="7" fill="${p.lips}" stroke="${p.line}" stroke-width="${lw*0.85}"/>
    <ellipse cx="100" cy="118" rx="3" ry="3.4" fill="${p.line}"/>
    ${pect(52, 1)}${pect(148, -1)}
  </g>`;
}

// Back view
function fishBack(o = {}) {
  const p = PALETTES[o.palette || 'classic'];
  const lw = o.lw ?? 3.2;
  const id = 'k' + (uid++);
  const body = 'M66,58 Q100,52 134,58 Q148,60 148,84 Q150,104 146,124 Q142,146 118,146 Q100,148 82,146 Q58,146 54,124 Q50,104 52,84 Q52,60 66,58 Z';
  const spots = [[72,74,4],[100,68,3],[128,76,4],[66,104,3.4],[134,104,3.4],[84,96,2.6],[116,96,2.6],[78,128,3],[122,128,3],[100,122,2.6]].map(([x,y,r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${p.spot}"/>`).join('');
  return `<defs><clipPath id="${id}c"><path d="${body}"/></clipPath></defs>
  <g>
    <ellipse cx="100" cy="52" rx="5" ry="10" fill="${p.fin}" stroke="${p.line}" stroke-width="${lw*0.85}"/>
    <ellipse cx="100" cy="150" rx="5" ry="8" fill="${p.fin}" stroke="${p.line}" stroke-width="${lw*0.85}"/>
    <path d="M60,116 C46,108 36,114 36,122 C38,130 50,130 60,124 Z" fill="${p.fin}" stroke="${p.line}" stroke-width="${lw*0.85}"/>
    <path d="M140,116 C154,108 164,114 164,122 C162,130 150,130 140,124 Z" fill="${p.fin}" stroke="${p.line}" stroke-width="${lw*0.85}"/>
    <path d="${body}" fill="${p.body}"/>
    <g clip-path="url(#${id}c)">
      <ellipse cx="100" cy="160" rx="80" ry="32" fill="${p.shade}"/>
      <ellipse cx="86" cy="66" rx="22" ry="7" fill="${p.light}" opacity=".85"/>
      ${spots}
    </g>
    <path d="${body}" fill="none" stroke="${p.line}" stroke-width="${lw}" stroke-linejoin="round"/>
    <rect x="89" y="89" width="22" height="22" rx="8" fill="${p.body}" stroke="${p.line}" stroke-width="${lw}"/>
    <ellipse cx="100" cy="100" rx="7" ry="28" fill="${p.tail}" stroke="${p.line}" stroke-width="${lw}"/>
    <path d="M100,78 L100,122" stroke="${p.finRay}" stroke-width="1.8" stroke-linecap="round"/>
  </g>`;
}

// FX helpers
const fx = {
  bubble: (x, y, r, o = 1) => `<g opacity="${o}"><circle cx="${x}" cy="${y}" r="${r}" fill="#CFF3FF" fill-opacity=".35" stroke="#2F86B0" stroke-width="2.2"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.28}" fill="#fff"/></g>`,
  sparkle: (x, y, s, c = '#FFE14D', o = 1) => `<path d="M${x},${y - s} Q${x + s * 0.18},${y - s * 0.18} ${x + s},${y} Q${x + s * 0.18},${y + s * 0.18} ${x},${y + s} Q${x - s * 0.18},${y + s * 0.18} ${x - s},${y} Q${x - s * 0.18},${y - s * 0.18} ${x},${y - s} Z" fill="${c}" stroke="#3B2614" stroke-width="2" stroke-linejoin="round" opacity="${o}"/>`,
  z: (x, y, s, o = 1) => `<text x="${x}" y="${y}" font-family="Fredoka, Arial Rounded MT Bold, sans-serif" font-weight="700" font-size="${s}" fill="#7FB8FF" stroke="#2A3D66" stroke-width="2" paint-order="stroke" opacity="${o}">z</text>`,
  hitStar: (x, y, s, o = 1) => `<path d="${star(x, y, s, s * 0.45, 5)}" fill="#FFF" stroke="#FF5A5A" stroke-width="2.5" stroke-linejoin="round" opacity="${o}"/>`,
  sweat: (x, y, s = 1) => `<path d="M${x},${y} q${-6 * s},${10 * s} 0,${14 * s} q${6 * s},${-4 * s} 0,${-14 * s} Z" fill="#9FE0FF" stroke="#2A6A8A" stroke-width="1.8"/>`,
  heart: (x, y, r, o = 1) => `<path d="${HEART(x, y, r)}" fill="#FF5C8A" stroke="#3B2614" stroke-width="2" opacity="${o}"/>`,
  crumb: (x, y, r, o = 1) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#FF9E5E" stroke="#3B2614" stroke-width="1.6" opacity="${o}"/>`,
  shadow: (y = 178, rx = 44, o = 0.18) => `<ellipse cx="100" cy="${y}" rx="${rx}" ry="${rx * 0.16}" fill="#0B3A52" opacity="${o}"/>`,
};

module.exports = { fishSide, fishFront, fishBack, fx, PALETTES, star };
