// Fish designs (2D source of truth): body silhouette, colours, pattern, fins. Used by the 3D builder (fish3d.js).
const O = '#3B2614', W = 5;
let uid = 0;
const eye = ([x, y, r], grumpy) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${O}" stroke-width="3.5"/><ellipse cx="${x - r * 0.28}" cy="${y + r * 0.05}" rx="${r * 0.58}" ry="${r * 0.66}" fill="#1F1A2E"/><circle cx="${x - r * 0.5}" cy="${y - r * 0.28}" r="${r * 0.24}" fill="#fff"/><circle cx="${x - r * 0.05}" cy="${y + r * 0.34}" r="${r * 0.12}" fill="#fff"/>${grumpy ? `<path d="M${x - r * 1.5},${y - r * 0.9} L${x + r * 0.9},${y - r * 1.75}" stroke="${O}" stroke-width="4.5" stroke-linecap="round"/>` : ''}`;
const blush = ([x, y], r = 7) => `<ellipse cx="${x}" cy="${y}" rx="${r * 1.25}" ry="${r * 0.75}" fill="#FF8FA3" opacity=".8"/>`;
const smile = ([x, y], s = 1) => `<path d="M${x},${y} q${5 * s},${6 * s} ${11 * s},${1 * s}" fill="none" stroke="${O}" stroke-width="3.5" stroke-linecap="round"/>`;
const fin = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" stroke="${O}" stroke-width="${W}" stroke-linejoin="round"/>${extra}`;
function fish(f) { return f; }
const DAMSEL = 'M58,104 C72,70 114,52 155,54 C200,58 232,80 240,100 C232,122 200,144 155,146 C114,148 72,136 58,104Z';
const dFins = (c, tc = c) => [fin('M108,60 C140,32 202,40 230,78 L216,82 C196,60 150,56 120,66Z', c), fin('M140,144 C166,168 206,158 224,128 L212,124 C198,140 170,146 150,140Z', c), fin('M236,100 L286,62 C272,88 272,112 286,138Z', tc)];
const SHARK = 'M26,102 C40,84 92,70 140,72 C190,74 232,88 262,97 C232,108 190,122 140,124 C92,126 44,118 26,102Z';
const finT = (d, fill, tip, cx, cy, r) => { const id = 't' + (uid++); return `<clipPath id="${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${fill}"/>${tip ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${tip}" clip-path="url(#${id})"/>` : ''}<path d="${d}" fill="none" stroke="${O}" stroke-width="${W}" stroke-linejoin="round"/>`; };
function shark(top, finC, tip, tips, spots) {
  const has = (k) => tips.includes(k) ? tip : null;
  return fish({ body: SHARK, fill: top, grumpy: true, shine: [132, 80, 26, -2],
    fins: [finT('M126,76 C134,54 150,36 170,26 C163,46 167,64 182,80Z', finC, has('d'), 170, 26, 36),
           finT('M254,97 C268,84 282,62 292,38 C296,62 290,84 277,98 C283,108 289,122 291,138 C277,128 264,113 254,101Z', finC, has('t'), 292, 38, 40),
           tips.includes('l') ? `<clipPath id="tl${uid}"><path d="M254,97 C268,84 282,62 292,38 C296,62 290,84 277,98 C283,108 289,122 291,138 C277,128 264,113 254,101Z"/></clipPath><circle cx="291" cy="138" r="26" fill="${tip}" clip-path="url(#tl${uid++})"/><path d="M277,98 C283,108 289,122 291,138 C277,128 264,113 254,101" fill="none" stroke="${O}" stroke-width="${W}" stroke-linejoin="round"/>` : '',
           finT('M206,88 C210,79 217,72 226,68 C223,77 225,85 232,92Z', finC, null),
           finT('M198,114 C202,123 208,130 217,133 C214,126 214,120 216,113Z', finC, null)],
    pattern: `<path d="M10,108 C60,113 120,112 180,106 C220,102 250,99 272,97 L272,140 L10,140Z" fill="#F6F8FB"/>${spots ? [[150, 90], [178, 96], [204, 94], [126, 94], [164, 100]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.8" fill="#4A5262"/>`).join('') : `<path d="M148,101 C185,94 222,95 252,97" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/>`}`,
    over: [92, 100, 108].map(x => `<path d="M${x},88 q-5,9 0,18" stroke="#5A6278" stroke-width="3" fill="none" stroke-linecap="round"/>`).join('') + `<path d="M38,111 q12,-7 26,1" stroke="${O}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
    eye: [64, 94, 10], blush: [70, 108], blushR: 4.5,
    pec: finT('M112,116 C117,134 128,150 146,160 C148,144 145,128 138,116Z', finC, has('p'), 146, 160, 27) });
}
const finRim = (d, fill, rim = '#16161C') => { const id = 'r' + (uid++); return `<clipPath id="${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${fill}"/><path d="${d}" fill="none" stroke="${rim}" stroke-width="10" clip-path="url(#${id})"/><path d="${d}" fill="none" stroke="${O}" stroke-width="${W}" stroke-linejoin="round"/>`; };
const PSPOTS = (pts) => pts.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r || 4.5}" fill="#2A2018"/>`).join('');
const F = [
 ['Palette surgeonfish', 'Paletten-Doktorfisch', fish({ body: 'M42,108 C50,104 54,96 60,84 C80,58 116,44 152,44 C200,46 234,72 244,100 C234,128 200,154 152,156 C116,156 82,146 62,126 C54,120 46,116 42,112Z', fill: '#1670FF',
   fins: [finRim('M84,62 C110,32 198,24 242,80 C242,86 240,92 238,96 C214,58 150,48 96,70Z', '#1670FF'), finRim('M112,150 C140,178 206,174 242,120 C242,114 240,108 238,104 C214,146 160,152 122,144Z', '#1670FF'),
          fin('M240,100 C252,86 270,64 294,52 C284,72 280,86 280,100 C280,114 284,128 294,148 C270,136 252,114 240,100Z', '#FFD400', `<path d="M244,97 C256,84 272,64 293,53 M244,103 C256,116 272,136 293,147" stroke="#16161C" stroke-width="8" fill="none" stroke-linecap="round"/>`)],
   pattern: `<path d="M30,126 C90,150 200,146 250,110 L250,170 L30,170Z" fill="#4C9BFF"/><path d="M92,82 C112,50 194,42 250,98 C226,96 208,106 194,118 C172,134 140,130 124,110 C112,102 100,94 92,82Z" fill="#101018"/><ellipse cx="172" cy="90" rx="36" ry="13" fill="#1670FF" transform="rotate(7 172 90)"/><path d="M228,84 L252,100 L228,116Z" fill="#FFD400"/>`,
   shine: [124, 58, 22], eye: [84, 92, 12], blush: [78, 114], blushR: 5.5, mouth: [46, 110], mouthS: 0.8,
   pec: finT('M118,112 C134,98 158,102 166,118 C150,128 128,128 118,112Z', '#1670FF', '#FFD400', 166, 118, 26) })],
 ['Moorish idol', 'Halfterfisch', fish({ body: 'M44,112 L74,100 C92,62 128,38 160,36 C200,40 234,74 242,100 C234,128 200,160 160,164 C128,160 98,142 80,118 L46,118Z', fill: '#FFFDF0',
   fins: [fin('M148,40 C168,-6 232,-8 290,22 C238,12 196,20 176,44Z', '#FFFFFF'), fin('M146,162 C162,188 198,184 212,150Z', '#16161C'),
          fin('M238,100 L280,70 C272,90 272,110 280,130Z', '#16161C', `<path d="M280,70 C272,90 272,110 280,130" stroke="#fff" stroke-width="4" fill="none"/>`)],
   pattern: `<rect x="86" y="20" width="40" height="160" fill="#16161C"/><rect x="150" y="20" width="32" height="160" fill="#FFE14D"/><rect x="182" y="20" width="36" height="160" fill="#16161C"/><rect x="218" y="20" width="30" height="160" fill="#FFE14D"/><ellipse cx="62" cy="104" rx="13" ry="7" fill="#FF8A00"/>`,
   eye: [106, 90, 11], blush: [80, 116, ], blushR: 5, mouth: [44, 115, ], mouthS: 0.6 })],
 ['Foxface rabbitfish', 'Kaninchenfisch (Fuchsgesicht)', fish({ body: 'M44,108 C58,100 70,84 92,70 C122,50 180,46 216,66 C234,76 244,90 246,100 C244,112 234,126 216,136 C180,154 122,150 92,132 C70,120 58,112 44,108Z', fill: '#FFD21F',
   fins: [fin('M104,62 C110,40 128,34 142,40 C152,30 168,30 178,36 C190,30 206,34 214,42 C226,46 234,58 236,76 C210,56 150,50 104,62Z', '#FFDD4A', `<path d="M142,40 C142,46 144,50 146,54 M178,36 C178,42 180,48 182,52 M214,42 C212,48 212,54 214,60" stroke="#E0A800" stroke-width="2.5" fill="none" stroke-linecap="round"/>`),
          fin('M112,140 C118,160 134,166 148,160 C160,170 178,168 188,160 C202,164 218,156 228,140 C232,134 234,128 236,124 C210,144 156,150 112,140Z', '#FFDD4A'),
          fin('M240,100 C254,86 270,74 288,68 C280,88 280,112 288,132 C270,126 254,114 240,100Z', '#FFDD4A')],
   pattern: `<path d="M20,124 C60,92 96,62 126,36 L134,60 C126,100 120,130 114,164 L20,164Z" fill="#FFFFFF"/><path d="M128,44 C106,58 72,90 40,110 C52,114 62,116 70,113 C90,100 108,84 122,66Z" fill="#101018"/><path d="M66,116 C82,134 104,148 128,152 C122,140 118,128 116,116 C98,123 80,123 66,116Z" fill="#101018"/>`,
   shine: [176, 62, 24], eye: [94, 88, 12], blush: [100, 108], blushR: 5, mouth: [46, 110], mouthS: 0.6,
   pec: fin('M132,104 C146,94 164,98 168,112 C154,122 138,118 132,104Z', '#FFE46A') })],
 ['Emperor angelfish', 'Kaiserfisch', fish({ body: 'M48,104 C60,70 100,42 150,40 C206,42 242,72 246,100 C242,130 206,160 150,162 C100,160 60,134 48,104Z', fill: '#1E4FD8',
   fins: [fin('M150,40 C192,20 238,40 250,82 L238,86 C226,56 190,46 160,50Z', '#1E4FD8', `<path d="M160,36 C196,26 234,44 248,80" stroke="#7FD8FF" stroke-width="4" fill="none"/>`), fin('M150,162 C192,182 236,164 248,122 L236,118 C224,146 190,156 160,152Z', '#14308A', `<path d="M160,166 C196,174 232,158 246,124" stroke="#7FD8FF" stroke-width="4" fill="none"/>`),
          fin('M240,100 L284,70 C274,92 274,108 284,130Z', '#FFD21F')],
   pattern: [48, 61, 74, 87, 100, 113, 126, 139, 152].map(y => `<path d="M112,${y + 6} C160,${y - 4} 205,${y - 3} 250,${y + 3}" stroke="#FFD21F" stroke-width="6.5" fill="none"/>`).join('') +
     `<path d="M30,60 L96,30 L104,170 L30,150Z" fill="#DDE8FF"/><path d="M84,40 C112,58 120,92 108,130 L90,132 C100,98 96,66 74,52Z" fill="#16161C" stroke="#7FD8FF" stroke-width="3.5"/><path d="M120,98 C142,94 152,112 142,130 C130,134 118,122 120,98Z" fill="#16161C" stroke="#7FD8FF" stroke-width="3"/>`,
   eye: [88, 90, 10], blush: [70, 112], blushR: 5, mouth: [50, 108], mouthS: 0.7 })],
 ['Needlefish', 'Hornhecht', fish({ thick: 0.9, body: 'M8,100 C40,97 70,94 98,91 C150,83 230,85 262,98 C230,111 150,117 98,109 C70,106 40,103 8,100Z', fill: '#F0F7FA',
   fins: [fin('M204,86 C212,68 230,64 244,72 C242,82 238,90 232,94Z', '#A8DCDC'), fin('M204,114 C212,132 230,136 244,128 C242,118 238,110 232,106Z', '#A8DCDC'),
          fin('M256,98 C268,88 280,78 294,70 C288,84 282,92 274,98 C282,104 288,112 294,126 C280,118 268,108 256,98Z', '#A8DCDC')],
   pattern: `<path d="M0,60 L270,60 L270,93 C220,87 150,87 98,95 C70,97 40,99 0,100Z" fill="#35B0A2"/><path d="M20,101 C80,99 160,97 262,99" stroke="#63D6F2" stroke-width="5" fill="none"/>`,
   over: `<path d="M12,101 C40,100 66,100 92,102" stroke="${O}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
   shine: [160, 90, 30, -1], eye: [108, 97, 9], blush: [112, 108], blushR: 4, pec: fin('M130,104 C140,100 150,102 152,108 C144,113 134,112 130,104Z', '#D2ECEE') })],
 ['Trumpetfish', 'Trompetenfisch', fish({ thick: 0.95, body: 'M12,95 C14,90 22,89 28,91 C52,95 76,96 98,94 C112,90 130,86 156,86 C200,86 236,92 258,98 C236,106 200,114 156,114 C130,114 112,110 98,107 C76,106 52,107 28,110 C22,112 14,110 12,105Z', fill: '#FFC21F',
   fins: [fin('M196,88 C202,70 220,64 236,72 C236,82 232,90 226,94Z', '#FFE08A', `<path d="M204,84 L216,70 M214,88 L228,74" stroke="#E0A800" stroke-width="2"/>`), fin('M196,112 C202,130 220,136 236,128 C236,118 232,110 226,106Z', '#FFE08A', `<path d="M204,116 L216,130 M214,112 L228,126" stroke="#E0A800" stroke-width="2"/>`),
          fin('M254,98 C262,88 274,82 288,84 C292,92 292,104 288,112 C274,114 262,108 254,98Z', '#FFE08A', `<circle cx="276" cy="92" r="4" fill="#101018"/><circle cx="276" cy="104" r="4" fill="#101018"/>`)],
   pattern: `<path d="M0,70 L270,70 L270,94 C200,88 150,90 100,96 C70,99 40,98 0,96Z" fill="#F0A800"/><path d="M30,100 C70,102 100,100 130,98 C180,96 230,97 256,98" stroke="#FFF3C0" stroke-width="3.5" fill="none"/><path d="M110,106 C160,108 215,106 250,101" stroke="#FFF3C0" stroke-width="2" fill="none" stroke-dasharray="2 6" stroke-linecap="round"/>` + [206, 218, 230, 242].map(x => `<path d="M${x},90 l-3,18" stroke="#D08A00" stroke-width="3" opacity=".7"/>`).join('') + `<path d="M128,90 C134,96 134,104 128,110" stroke="#D08A00" stroke-width="2.5" fill="none"/>`,
   over: `<path d="M13,96 C17,100 17,102 13,105" stroke="${O}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M20,110 C19,115 16,118 12,119" stroke="${O}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
   shine: [170, 91, 26, -1], eye: [114, 97, 8], blush: [118, 106], blushR: 3.5,
   pec: fin('M136,102 C146,97 156,100 158,106 C150,112 140,110 136,102Z', '#FFE08A') })],
 ['Blue-green chromis', 'Riffbarsch (Grünes Schwalbenschwänzchen)', fish({ body: DAMSEL, fill: '#4FE0D0', fins: dFins('#7FF0E0'),
   pattern: `<path d="M40,40 L260,40 L260,84 C200,70 110,72 40,100Z" fill="#3FC8F0" opacity=".85"/>`, shine: [128, 66, 20], eye: [90, 92, 13], blush: [86, 116], mouth: [60, 110],
   pec: fin('M124,106 C138,98 154,102 158,112 C146,120 132,118 124,106Z', '#7FF0E0') })],
 ['Yellowtail damselfish', 'Riffbarsch (Gelbschwanz-Demoiselle)', fish({ body: DAMSEL, fill: '#1E5BFF', fins: dFins('#1747C9', '#FFE600'),
   pattern: `<path d="M196,30 L260,30 L260,170 L212,170Z" fill="#FFE600"/>`, shine: [128, 66, 20], eye: [90, 92, 13], blush: [86, 116], mouth: [60, 110],
   pec: fin('M124,106 C138,98 154,102 158,112 C146,120 132,118 124,106Z', '#3E8BFF') })],
 ['Pink skunk clownfish', 'Halsband-Anemonenfisch (rosa)', fish({ body: DAMSEL, fill: '#FF8FBF', fins: dFins('#FFC2DC', '#FFD8E8'),
   pattern: `<path d="M40,150 C100,160 200,160 250,140 L250,180 L40,180Z" fill="#FFB8D6"/><path d="M58,104 C72,70 114,52 155,54 C200,58 232,80 240,100" stroke="#fff" stroke-width="20" fill="none"/><path d="M114,40 C105,72 106,112 118,152" stroke="#fff" stroke-width="13" fill="none"/>`, eye: [90, 94, 13], blush: [84, 118], mouth: [60, 110],
   pec: fin('M128,108 C142,100 158,104 162,114 C150,122 136,120 128,108Z', '#FFC2DC') })],
 ['Clownfish', 'Clownfisch (Falscher Clown-Anemonenfisch)', fish({ body: DAMSEL, fill: '#FF7A1A',
   fins: [finRim('M108,60 C140,32 202,40 230,78 L216,82 C196,60 150,56 120,66Z', '#FF7A1A'), finRim('M140,144 C166,168 206,158 224,128 L212,124 C198,140 170,146 150,140Z', '#FF7A1A'), finRim('M236,100 C256,74 276,66 286,70 C278,90 278,110 286,130 C276,134 256,126 236,100Z', '#FF7A1A')],
   pattern: `<path d="M106,40 C94,70 96,112 110,160 L132,160 C120,112 118,70 128,40Z" fill="#fff" stroke="#16161C" stroke-width="5"/><path d="M152,40 C146,66 140,84 152,100 C142,116 146,136 154,164 L182,164 C174,136 176,116 186,100 C174,84 176,66 182,40Z" fill="#fff" stroke="#16161C" stroke-width="5"/><path d="M212,56 L228,56 L234,144 L214,144Z" fill="#fff" stroke="#16161C" stroke-width="5"/>`,
   shine: [150, 62, 14], eye: [86, 94, 13], blush: [82, 118], blushR: 6, mouth: [60, 110],
   pec: finRim('M124,108 C138,98 156,102 160,114 C148,124 132,122 124,108Z', '#FF7A1A') })],
 ['Blackspotted puffer (yellow)', 'Schwarzflecken-Kugelfisch, gelb (normal)', fish({ body: 'M50,104 C50,76 84,60 130,60 C180,60 226,80 244,100 C226,122 180,142 130,142 C84,142 50,130 50,104Z', fill: '#FFD21F',
   fins: [fin('M194,74 C202,54 220,50 230,58 C228,72 222,82 212,86Z', '#FFE266'), fin('M194,128 C202,148 220,152 230,144 C228,130 222,120 212,116Z', '#FFE266'), fin('M240,100 C256,84 276,78 286,82 C280,94 280,106 286,118 C276,122 256,116 240,100Z', '#FFE266')],
   pattern: `<ellipse cx="56" cy="108" rx="18" ry="14" fill="#C98A1A" opacity=".55"/><path d="M40,128 C90,140 180,138 240,112 L240,160 L40,160Z" fill="#FFE98A"/>` + PSPOTS([[120, 74], [150, 70, 5.5], [180, 78], [136, 92, 5], [166, 96], [198, 96, 5], [112, 112], [146, 118, 5.5], [180, 116], [214, 104, 3.5], [100, 90, 3.5], [128, 130, 3.5], [162, 132]]),
   shine: [118, 68, 18], over: `<path d="M48,102 q8,-5 14,1 q-6,8 -14,-1Z" fill="#fff" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>`, eye: [88, 90, 13], blush: [82, 114], blushR: 6,
   pec: fin('M122,104 C138,96 154,102 156,114 C144,122 130,118 122,104Z', '#FFE266') })],
 ['Blackspotted puffer, puffed up', 'Schwarzflecken-Kugelfisch (aufgeblasen)', fish({ body: 'M78,100 C78,60 110,30 150,30 C190,30 222,60 222,100 C222,140 190,170 150,170 C110,170 78,140 78,100Z', fill: '#FFD21F',
   fins: [fin('M186,40 C196,24 212,24 218,34 C214,46 206,54 198,56Z', '#FFE266'), fin('M186,160 C196,176 212,176 218,166 C214,154 206,146 198,144Z', '#FFE266'), fin('M218,100 C232,88 248,84 256,88 C252,96 252,104 256,112 C248,116 232,112 218,100Z', '#FFE266')],
   pattern: `<path d="M60,128 C110,150 190,150 240,128 L240,190 L60,190Z" fill="#FFE98A"/>` + PSPOTS([[128, 50], [158, 44, 5.5], [188, 58], [140, 72, 5], [172, 76], [200, 86, 5], [150, 100, 5.5], [184, 108], [206, 116, 3.5], [132, 122], [164, 130, 5], [196, 138, 3.5], [144, 150], [176, 154, 3.5], [118, 142, 3.5]]),
   shine: [124, 44, 20], over: `<ellipse cx="84" cy="116" rx="7" ry="9" fill="#fff" stroke="${O}" stroke-width="3.5"/>`, eye: [108, 88, 17], blush: [112, 122], blushR: 7,
   pec: fin('M148,112 C164,102 180,108 184,120 C172,130 156,128 148,112Z', '#FFE266') })],
 ['Clown triggerfish', 'Leoparden-Drückerfisch', (() => { const TB = 'M46,112 C60,84 104,50 150,48 C200,50 236,80 244,100 C236,124 200,154 150,156 C104,154 66,134 46,112Z';
   return fish({ body: TB, fill: '#16161C',
   fins: [fin('M122,56 L132,28 L148,50Z', '#16161C'), fin('M168,50 C186,30 216,38 232,78 L222,84 C208,62 190,56 176,58Z', '#F4F0E0'), fin('M168,154 C186,174 216,166 232,126 L222,120 C208,142 190,148 176,146Z', '#F4F0E0'),
          fin('M240,100 C256,78 276,70 286,72 C280,90 280,110 286,128 C276,130 256,122 240,100Z', '#16161C', `<path d="M266,78 C261,92 261,108 266,122" stroke="#FFE14D" stroke-width="9" fill="none" stroke-linecap="round"/>`)],
   pattern: `<ellipse cx="172" cy="60" rx="48" ry="22" fill="#FFD21F"/>` + [[146, 58], [162, 66], [178, 56], [194, 66], [206, 56], [170, 48], [188, 46]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.6" fill="#16161C"/>`).join('') +
     [[104, 126, 11], [130, 138, 12], [160, 142, 12], [190, 134, 11], [146, 116, 10], [176, 114, 10], [206, 114, 9], [118, 106, 8]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/>`).join('') +
     `<path d="M82,76 C94,90 98,104 94,120" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round"/><ellipse cx="52" cy="112" rx="22" ry="17" fill="#FFE14D"/><ellipse cx="234" cy="100" rx="12" ry="16" fill="#FFE14D"/>`,
   over: `<ellipse cx="54" cy="112" rx="11" ry="8" fill="#FF8A00" stroke="${O}" stroke-width="3.5"/>`, eye: [112, 74, 10], blush: [86, 132], blushR: 5 }); })()],
 ['Titan triggerfish', 'Riesen-Drückerfisch', (() => { const TB = 'M40,114 C50,84 100,48 150,46 C200,48 236,78 244,100 C236,126 200,156 150,158 C104,156 56,140 40,114Z';
   let sc = ''; for (let c = -20; c < 60; c++) { sc += `<path d="M${c * 14},0 l200,200 M${c * 14},0 l-200,200" stroke="#8C9C4E" stroke-width="1.6"/>`; }
   for (let i = 0; i < 40; i++) for (let j = -20; j < 20; j++) { const x = 7 * (i + j + 1), y = 7 * (i - j); if (x > 100 && x < 250 && y > 40 && y < 162) sc += `<circle cx="${x}" cy="${y}" r="2.8" fill="#4E6030"/>`; }
   const rays = (pts) => pts.map(([a, b, c, d]) => `<path d="M${a},${b} L${c},${d}" stroke="#C89A1A" stroke-width="2"/>`).join('');
   return fish({ body: TB, fill: '#DCD67C',
   fins: [fin('M118,58 L128,22 L134,44 L144,34 L150,50Z', '#55663A'),
          finRim('M166,48 C186,24 220,34 234,78 L222,84 C208,60 190,54 176,56Z', '#FFD24A'), finRim('M166,156 C186,180 220,170 234,126 L222,120 C208,144 190,150 176,148Z', '#FFD24A'),
          finRim('M240,100 C254,76 276,66 288,68 C281,90 281,110 288,132 C276,134 254,124 240,100Z', '#FFD24A') + `<path d="M262,80 C257,93 257,107 262,120" stroke="#16161C" stroke-width="6" fill="none"/>`],
   pattern: sc + `<path d="M20,60 L112,36 L104,176 L20,150Z" fill="#F4E48C"/><path d="M112,40 C122,78 116,124 100,160" stroke="#55663A" stroke-width="22" fill="none"/><path d="M112,40 C122,78 116,124 100,160" stroke="#3A4526" stroke-width="3" fill="none" stroke-dasharray="3 7"/>
     <path d="M52,98 C66,90 82,92 92,104" stroke="#3A4526" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M62,120 C72,124 80,130 86,138 M58,128 C66,132 72,138 76,146" stroke="#A8963A" stroke-width="3.5" fill="none" stroke-linecap="round"/>
     <path d="M224,66 L252,66 L252,134 L224,134Z" fill="#F4E48C"/><ellipse cx="116" cy="74" rx="17" ry="15" fill="#3A4526"/>`,
   shine: [166, 56, 18],
   over: `<path d="M38,108 C44,100 58,100 64,110 C60,122 46,124 38,118Z" fill="#B8A0C8" stroke="${O}" stroke-width="3.5" stroke-linejoin="round"/><path d="M43,109 h7 v7 h-7Z M51,109 h7 v7 h-7Z" fill="#fff" stroke="${O}" stroke-width="2"/>`,
   eye: [116, 74, 10], grumpy: true, blush: [84, 144], blushR: 5,
   pec: fin('M126,112 C140,102 156,108 158,120 C146,128 132,126 126,112Z', '#FFD24A', rays([[132, 114, 152, 112], [134, 118, 154, 120]])) }); })()],
 ['Blacktip reef shark', 'Schwarzspitzen-Riffhai', shark('#AEB9C9', '#9AA6B8', '#16161C', 'dtlp', false)],
 ['Whitetip reef shark', 'Weißspitzen-Riffhai', shark('#8A94A6', '#7C8698', '#FFFFFF', 'dt', true)],
 ['Blue-spotted stingray', 'Blaupunktrochen', (() => {
   const spots = [[62, 110, 6], [84, 100, 7], [84, 120, 5], [106, 90, 6], [108, 112, 7], [128, 124, 6], [150, 76, 6], [172, 124, 6], [192, 112, 7], [194, 90, 6], [216, 100, 7], [216, 120, 5], [238, 110, 6], [150, 126, 5], [128, 78, 5], [172, 78, 5]];
   const e2 = (x, y) => `<circle cx="${x}" cy="${y}" r="12" fill="#fff" stroke="${O}" stroke-width="3.5"/><ellipse cx="${x}" cy="${y + 2}" rx="7" ry="8" fill="#1F1A2E"/><circle cx="${x - 3}" cy="${y - 2}" r="3" fill="#fff"/><circle cx="${x + 3}" cy="${y + 5}" r="1.5" fill="#fff"/>`;
   return fish({ body: 'M24,108 C30,96 44,96 58,98 C92,78 122,66 150,66 C178,66 208,78 242,98 C256,96 270,96 276,108 C262,128 206,142 150,142 C94,142 38,128 24,108Z', fill: '#E0B560',
   fins: [fin('M168,72 C190,40 232,22 284,30 C290,32 290,37 284,38 C244,38 212,54 190,84Z', '#E0B560', `<path d="M186,66 C208,46 240,34 276,33" stroke="#2F8BFF" stroke-width="4" fill="none" stroke-linecap="round"/>`)],
   pattern: `<path d="M10,118 C60,134 110,140 150,140 C190,140 240,134 290,118 L290,160 L10,160Z" fill="#F6EBCB"/><ellipse cx="150" cy="98" rx="46" ry="30" fill="#EBC476"/>` + spots.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#2F8BFF" stroke="#1A5FD0" stroke-width="2"/>`).join(''),
   shine: [150, 74, 16, 0],
   over: e2(131, 94) + e2(169, 94) + blush([112, 110], 5.5) + blush([188, 110], 5.5) + `<path d="M141,114 q9,8 18,0" fill="none" stroke="${O}" stroke-width="3.5" stroke-linecap="round"/>` }); })()],
 ['Clown surgeonfish', 'Blaustreifen-Doktorfisch', fish({ body: 'M42,108 C50,104 54,96 60,84 C80,58 116,44 152,44 C200,46 234,72 244,100 C234,128 200,154 152,156 C116,156 82,146 62,126 C54,120 46,116 42,112Z', fill: '#FFB000',
   fins: [finRim('M84,62 C110,32 198,24 242,80 C242,86 240,92 238,96 C214,58 150,48 96,70Z', '#2A2F6A', '#3FA0FF'), finRim('M112,150 C140,178 206,174 242,120 C242,114 240,108 238,104 C214,146 160,152 122,144Z', '#2A2F6A', '#3FA0FF'), fin('M96,144 C98,160 106,170 118,172 C118,160 114,150 110,144Z', '#FF8A00'),
          fin('M240,100 C252,86 270,64 294,52 C284,72 280,86 280,100 C280,114 284,128 294,148 C270,136 252,114 240,100Z', '#2A2F6A', `<path d="M268,76 C260,90 260,110 268,124" stroke="#6FC0FF" stroke-width="5" fill="none" stroke-linecap="round"/>`)],
   pattern: [0, 1, 2, 3, 4, 5].map(i => { const y = 58 + i * 13, d = `M48,${96 + (i - 2.5) * 5} C96,${y - 8} 190,${y - 8} 258,${84 + i * 7}`; return `<path d="${d}" stroke="#101018" stroke-width="9.5" fill="none"/><path d="${d}" stroke="#2E9BFF" stroke-width="5" fill="none"/>`; }).join('') + `<path d="M30,132 C90,128 200,134 256,124 L256,170 L30,170Z" fill="#EAE6FB"/><path d="M48,124 C100,126 200,132 256,122" stroke="#101018" stroke-width="2.5" fill="none"/>`,
   shine: [128, 52, 18], eye: [86, 86, 11], blush: [78, 124], blushR: 5, mouth: [46, 110], mouthS: 0.8,
   pec: fin('M118,114 C134,102 156,106 162,120 C148,128 128,128 118,114Z', '#FFB000') })],
 ['Brown sailfin tang', 'Brauner Segelflossen-Doktorfisch', (() => { const rays = (y0, sgn) => [0, 1, 2, 3, 4, 5].map(i => `<path d="M${116 + i * 22},${y0 - sgn * (i < 3 ? i * 2 : 6 - i)} C${122 + i * 22},${y0 - sgn * 22} ${132 + i * 20},${y0 - sgn * 36} ${146 + i * 17},${y0 - sgn * (44 - i * 3)}" stroke="#9A7038" stroke-width="2.2" fill="none"/>`).join('');
   return fish({ body: 'M40,112 L70,100 C76,84 96,62 126,54 C170,46 222,66 240,98 L244,100 L240,104 C222,134 170,154 126,146 C100,140 84,128 76,118 L42,118Z', fill: '#D9AE48',
   fins: [fin('M100,66 C96,26 150,0 214,20 C236,30 246,56 240,92 C220,62 160,50 100,66Z', '#3E2412', rays(60, 1)), fin('M104,136 C100,176 150,200 214,182 C236,172 246,146 240,108 C220,138 160,150 104,136Z', '#3E2412', rays(142, -1)),
          fin('M240,100 C252,88 266,76 284,70 C278,90 278,110 284,130 C266,124 252,112 240,100Z', '#3E2412')],
   pattern: `<defs><linearGradient id="sgr" x1="0" x2="1"><stop offset=".22" stop-color="#D9AE48"/><stop offset=".5" stop-color="#8A5A26"/><stop offset=".85" stop-color="#3E2412"/></linearGradient></defs><rect x="0" y="0" width="300" height="200" fill="url(#sgr)"/>` + [62, 72, 82, 92, 102, 112, 122, 132, 142].map(y => `<path d="M92,${y} C140,${y - 4} 200,${y - 4} 240,${y}" stroke="#9AE0D0" stroke-width="1.6" opacity=".55" fill="none" stroke-dasharray="7 4"/>`).join(''),
   shine: [130, 62, 16], over: `<path d="M218,98 l14,-3 l0,6Z" fill="#fff" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>`, eye: [96, 90, 11], blush: [82, 116], blushR: 5, mouth: [42, 114], mouthS: 0.6,
   pec: fin('M118,108 C132,98 150,102 154,114 C142,122 126,120 118,108Z', '#B8862E') }); })()],
 ['Threadfin butterflyfish', 'Fähnchen-Falterfisch', fish({ body: 'M44,112 L74,100 C92,62 128,38 160,36 C200,40 234,74 242,100 C234,128 200,160 160,164 C128,160 98,142 80,118 L46,118Z', fill: '#FFFFFF',
   fins: [fin('M132,42 C160,18 214,26 240,76 L228,84 C210,52 170,44 142,50Z', '#FFD21F'), fin('M132,158 C160,182 214,174 240,124 L228,116 C210,148 170,156 142,150Z', '#FFD21F'), fin('M238,100 L276,76 C270,92 270,108 276,124Z', '#FFD21F')],
   pattern: `<path d="M168,20 L260,20 L260,180 L150,180 C176,130 180,70 168,20Z" fill="#FFD21F"/>` + [0, 1, 2, 3, 4, 5].map(i => `<path d="M${104 + i * 12},150 L${134 + i * 12},50" stroke="#55606A" stroke-width="2.5"/>`).join('') + `<path d="M106,30 C98,70 94,100 86,130" stroke="#16161C" stroke-width="15" fill="none"/><circle cx="212" cy="64" r="9" fill="#16161C"/>`,
   eye: [98, 88, 10], blush: [78, 118], blushR: 5, mouth: [44, 115], mouthS: 0.6 })],
 ['Orange-lined triggerfish', 'Orangestreifen-Drückerfisch', (() => { const TB = 'M40,114 C50,84 100,48 150,46 C200,48 236,78 244,100 C236,126 200,156 150,158 C104,156 56,140 40,114Z';
   let ln = ''; for (let i = 0; i < 13; i++) { const x = 88 + i * 13; ln += `<path d="M${x},170 q12,-18 3,-38 q-9,-20 5,-40 q12,-18 4,-44 q-4,-10 2,-22" stroke="#FF9A2A" stroke-width="3.6" fill="none" stroke-linecap="round"/>`; }
   const rays = (x0, y0, dx, dy, n, sx, sy) => [...Array(n)].map((_, i) => `<path d="M${x0 + i * sx},${y0 + i * sy} l${dx},${dy}" stroke="#E0701A" stroke-width="2"/>`).join('');
   return fish({ body: TB, fill: '#27583E',
   fins: [fin('M118,58 L128,22 L134,44 L144,34 L150,50Z', '#1B3E2C'),
          fin('M166,48 C186,24 220,34 234,78 L222,84 C208,60 190,54 176,56Z', '#FFB44A', rays(178, 50, 8, -12, 5, 9, 4)), fin('M166,156 C186,180 220,170 234,126 L222,120 C208,144 190,150 176,148Z', '#FFB44A', rays(178, 154, 8, 12, 5, 9, -4)),
          fin('M240,100 C254,76 276,66 288,68 C281,90 281,110 288,132 C276,134 254,124 240,100Z', '#FF9A2A', `<path d="M250,100 L282,76 M250,100 L284,100 M250,100 L282,124 M250,100 L284,88 M250,100 L284,112" stroke="#E0701A" stroke-width="2"/>`)],
   pattern: `<path d="M150,40 L260,40 L260,170 L150,170Z" fill="#1F4A34" opacity=".5"/>` + ln +
     `<path d="M20,60 L100,40 L92,176 L20,150Z" fill="#2F6A4A"/><path d="M50,108 C74,104 100,112 128,128 M52,116 C76,116 98,126 122,144 M56,124 C76,128 92,138 108,156" stroke="#FF9A2A" stroke-width="4.5" fill="none" stroke-linecap="round"/>
     <path d="M70,96 C84,84 96,76 104,62" stroke="#FF9A2A" stroke-width="3.5" fill="none" stroke-linecap="round"/><ellipse cx="228" cy="100" rx="13" ry="12" fill="#16161C"/>` + [[224, 95], [232, 95], [224, 105], [232, 105]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="#FFD08A"/>`).join('') + `<circle cx="112" cy="74" r="15" fill="#1B3E2C"/>`,
   shine: [166, 56, 18],
   over: `<path d="M38,110 C44,102 56,102 62,110 C58,120 46,122 38,118Z" fill="#FFC870" stroke="${O}" stroke-width="3.5" stroke-linejoin="round"/><path d="M40,112 L58,112" stroke="${O}" stroke-width="2.5"/>`,
   eye: [112, 74, 10], blush: [84, 146], blushR: 5,
   pec: fin('M126,112 C140,102 156,108 158,120 C146,128 132,126 126,112Z', '#FFB44A') }); })()],
 ['Lunar fusilier', 'Mond-Füsilier', fish({ body: 'M40,102 C70,80 130,74 180,80 C214,84 238,94 248,100 C238,108 214,118 180,122 C130,126 70,122 40,102Z', fill: '#3FA8F0',
   fins: [fin('M110,80 C140,62 190,66 222,88 L212,92 C186,78 146,76 120,84Z', '#2F86D8'), fin('M170,122 C186,134 208,130 222,112 L212,110 C202,120 188,122 178,118Z', '#2F86D8'),
          finT('M242,100 C256,86 272,70 290,60 C284,78 274,92 262,100Z', '#3FA8F0', '#16161C', 290, 60, 24), finT('M242,100 C256,114 272,130 290,140 C284,122 274,108 262,100Z', '#3FA8F0', '#16161C', 290, 140, 24)],
   pattern: `<path d="M30,60 L250,60 L250,86 C190,78 100,80 30,98Z" fill="#2F86D8"/><path d="M30,112 C90,118 190,114 250,102 L250,140 L30,140Z" fill="#C8EAFF"/>`,
   shine: [130, 84, 22, -2], eye: [70, 98, 11], blush: [68, 114], blushR: 5, mouth: [42, 104], pec: fin('M104,106 C116,100 130,104 132,112 C122,118 110,116 104,106Z', '#7FC8FF') })],
 ['Silversides', 'Ährenfische (riesige Schwärme)', (() => { const one = () => fish({ body: 'M40,102 C64,82 130,72 190,80 C220,84 240,94 250,100 C240,108 220,120 190,124 C130,130 64,124 40,102Z', fill: '#F2F8FB',
     fins: [fin('M120,78 L134,56 L146,78Z', '#CFE4EC'), fin('M176,80 L192,60 L204,84Z', '#CFE4EC'), fin('M170,126 L186,146 L200,122Z', '#CFE4EC'),
            fin('M246,100 C258,88 272,74 290,64 C284,80 276,92 266,100Z', '#CFE4EC'), fin('M246,100 C258,112 272,126 290,136 C284,120 276,108 266,100Z', '#CFE4EC')],
     pattern: `<path d="M20,50 L260,50 L260,88 C200,78 110,80 20,104Z" fill="#9CC4B0"/><path d="M58,102 C120,92 200,92 250,100" stroke="#3A6A7A" stroke-width="4" fill="none"/><path d="M58,108 C120,98 200,98 250,104" stroke="#6FE0FF" stroke-width="10" fill="none"/><path d="M70,112 C130,104 200,104 246,106" stroke="#fff" stroke-width="3" fill="none" opacity=".9"/>` + [110, 128, 146, 164, 182, 200].map(x => `<path d="M${x},84 q5,5 10,0" stroke="#7FA898" stroke-width="2.5" fill="none"/>`).join(''),
     eye: [74, 98, 15], mouth: [42, 106], mouthS: 0.7, blush: [76, 118], blushR: 6,
     pec: fin('M112,108 C124,102 138,106 140,114 C130,120 118,118 112,108Z', '#DCEEF4') }); return one(); })()],
 ['Giant puffer', 'Riesenkugelfisch (Sternkugelfisch)', (() => { let d = ''; for (let r = 0; r < 8; r++) for (let c = 0; c < 13; c++) d += `<circle cx="${74 + c * 14 + (r % 2) * 7}" cy="${66 + r * 10}" r="${2.2 + ((r * 3 + c) % 3) * 0.5}" fill="#2A2018"/>`;
   return fish({ body: 'M50,104 C50,76 84,60 130,60 C180,60 226,80 244,100 C226,122 180,142 130,142 C84,142 50,130 50,104Z', fill: '#F4F1E6',
   fins: [fin('M194,74 C202,54 220,50 230,58 C228,72 222,82 212,86Z', '#E4DECC'), fin('M194,128 C202,148 220,152 230,144 C228,130 222,120 212,116Z', '#E4DECC'), fin('M240,100 C256,84 276,78 286,82 C280,94 280,106 286,118 C276,122 256,116 240,100Z', '#E4DECC')],
   pattern: `<path d="M40,50 L250,50 L250,94 C180,82 110,84 40,102Z" fill="#DAD4C2"/>` + d,
   over: `<path d="M48,102 q8,-5 14,1 q-6,8 -14,-1Z" fill="#fff" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>`, eye: [88, 90, 13], blush: [82, 114], blushR: 6, pec: fin('M122,104 C138,96 154,102 156,114 C144,122 130,118 122,104Z', '#E4DECC') }); })()],
 ['Anthias', 'Fahnenbarsch', fish({ body: 'M52,104 C68,78 110,64 152,66 C196,68 228,86 238,100 C228,116 196,134 152,136 C110,138 68,130 52,104Z', fill: '#FF8A3A',
   fins: [fin('M106,72 L112,30 L122,64 C150,52 196,58 222,84 L212,88 C190,72 150,68 118,76Z', '#FF6A9A'), fin('M150,136 C168,152 198,146 212,122 L202,120 C192,132 174,136 160,132Z', '#FF6A9A'),
          fin('M236,100 C252,88 270,70 292,58 C284,76 274,90 260,100Z', '#FF6A9A'), fin('M236,100 C252,112 270,130 292,142 C284,124 274,110 260,100Z', '#FF6A9A')],
   pattern: `<path d="M40,112 C100,124 190,120 240,104 L240,150 L40,150Z" fill="#FF9EC0"/><path d="M94,102 C108,104 120,110 130,120" stroke="#B04AE8" stroke-width="5" fill="none" stroke-linecap="round"/>`,
   shine: [130, 74, 18], eye: [84, 94, 12], blush: [80, 116], blushR: 5, mouth: [56, 106] })],
 ['Parrotfish', 'Papageifisch', (() => { let sc = ''; for (let r = 0; r < 7; r++) for (let c = 10; c >= 0; c--) { const x = 100 + c * 15 + (r % 2) * 7.5, y = 64 + r * 12; sc += `<circle cx="${x}" cy="${y}" r="9.5" fill="${(r + c) % 3 ? '#34D0BE' : '#4FDCC8'}" stroke="#FF7AB8" stroke-width="2.2"/>`; }
   return fish({ thick: 0.56, body: 'M34,108 C34,92 44,78 62,70 C92,60 140,58 182,64 C212,68 236,84 248,100 C236,116 212,130 182,134 C140,140 92,140 60,134 C44,128 34,120 34,108Z', fill: '#34D0BE',
   fins: [finRim('M78,66 C110,46 198,48 240,86 L230,92 C200,68 130,62 86,72Z', '#FF8AC4', '#3F8AE8'), finRim('M150,136 C174,154 214,146 236,114 L226,112 C210,130 180,136 160,132Z', '#FF8AC4', '#3F8AE8'),
          finRim('M244,100 C256,86 272,72 294,62 C286,76 282,88 282,100 C282,112 286,124 294,138 C272,128 256,114 244,100Z', '#34D0BE', '#3F8AE8') + `<path d="M252,100 C262,95 270,93 278,93 M252,100 C262,105 270,107 278,107" stroke="#FF7AB8" stroke-width="4" fill="none" stroke-linecap="round"/>`],
   pattern: sc + `<path d="M30,122 C90,138 190,134 250,106 L250,170 L30,170Z" fill="#C8F4A8" opacity=".75"/><path d="M20,40 L98,40 C110,70 110,120 96,170 L20,170Z" fill="#2FBFD8"/><path d="M98,40 C110,70 110,120 96,170" stroke="#FF7AB8" stroke-width="4" fill="none"/>
     <path d="M52,84 C60,76 72,72 86,74 M86,92 C94,92 100,96 104,102 M50,100 C60,106 72,108 84,104" stroke="#FF7AB8" stroke-width="4.5" fill="none" stroke-linecap="round"/><ellipse cx="68" cy="120" rx="16" ry="8" fill="#FFE14D" opacity=".85"/><path d="M48,124 C62,131 80,131 92,124" stroke="#FF9A4A" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
   shine: [150, 66, 24, -1],
   over: `<path d="M33,105 C36,96 48,95 55,102 L36,108Z" fill="#F6FFF8" stroke="${O}" stroke-width="3" stroke-linejoin="round"/><path d="M36,110 L55,105 C54,115 43,120 35,115Z" fill="#E4F6EA" stroke="${O}" stroke-width="3" stroke-linejoin="round"/><path d="M43,98 v7 M49,98 v6 M43,110 v6 M49,109 v6" stroke="#A8C8B4" stroke-width="1.5"/>`,
   eye: [72, 88, 11], blush: [86, 116], blushR: 4.5,
   pec: fin('M110,104 C124,92 146,96 150,110 C138,120 118,120 110,104Z', '#FF9A4A', `<path d="M118,105 L142,104 M120,111 L144,111" stroke="#E0701A" stroke-width="2"/>`) }); })()],
 ['Coral grouper', 'Juwelen-Zackenbarsch', (() => { let d = ''; let q = 7; const rnd = () => ((q = (q * 73 + 19) % 101) / 101);
   for (let r = 0; r < 9; r++) for (let c = 0; c < 14; c++) { const x = 62 + c * 14 + (r % 2) * 7 + rnd() * 4, y = 60 + r * 11 + rnd() * 4, rr = x < 110 ? 2.2 : 2.8 + rnd() * 1.8; d += `<circle cx="${x}" cy="${y}" r="${rr}" fill="#5FD0FF" stroke="#1A3FA0" stroke-width="1.4"/>`; }
   const fd = (pts) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4" fill="#5FD0FF" stroke="#1A3FA0" stroke-width="1.2"/>`).join('');
   return fish({ body: 'M34,112 C36,78 86,52 142,54 C196,56 234,82 246,100 C234,122 196,146 142,148 C92,148 40,142 34,112Z', fill: '#EC4A30',
   fins: [fin('M88,68 C90,50 100,42 108,48 C114,38 126,36 132,46 C140,36 152,38 156,48 C164,42 174,46 176,56 C196,50 218,62 232,84 L220,90 C200,72 150,64 100,72Z', '#D43A24', fd([[186, 66], [202, 70], [214, 78]])),
          fin('M150,146 C168,166 206,158 226,122 L214,120 C200,140 174,146 160,142Z', '#D43A24', fd([[180, 150], [198, 144], [210, 134]])),
          fin('M240,100 C254,80 276,72 288,78 C282,92 282,108 288,122 C276,128 254,120 240,100Z', '#D43A24', fd([[258, 92], [270, 86], [258, 108], [270, 114], [274, 100]]) + `<path d="M288,78 C282,92 282,108 288,122" stroke="#9AD8FF" stroke-width="3" fill="none"/>`)],
   pattern: `<path d="M20,40 L260,40 L260,84 C190,70 100,72 20,104Z" fill="#C83220" opacity=".7"/>` + d + `<path d="M108,54 C120,80 120,120 104,146" stroke="#B82A1C" stroke-width="4" fill="none"/><path d="M20,128 C80,140 180,142 250,112 L250,170 L20,170Z" fill="#FF8A6A" opacity=".55"/>`,
   shine: [160, 60, 20],
   over: `<path d="M32,106 C48,100 70,102 86,110 C72,116 50,116 34,112Z" fill="#F0705A" stroke="${O}" stroke-width="3.5" stroke-linejoin="round"/><path d="M30,114 C46,120 70,120 88,112 C80,130 46,134 32,124Z" fill="#FF9A80" stroke="${O}" stroke-width="3.5" stroke-linejoin="round"/><path d="M44,113 l3,4 l3,-4 M58,114 l3,4 l3,-4" fill="#fff" stroke="${O}" stroke-width="1.5"/>`,
   eye: [88, 80, 12], grumpy: false, blush: [100, 104], blushR: 5,
   pec: fin('M124,110 C140,98 160,104 164,118 C150,128 132,126 124,110Z', '#FF7A5A', fd([[140, 112], [150, 118]])) }); })()],
 ['Coral catshark', 'Korallen-Katzenhai', fish({ thick: 0.9, body: 'M22,104 C40,90 90,84 150,88 C200,90 240,96 268,100 C240,106 200,112 150,114 C90,118 40,116 22,104Z', fill: '#EAD9B6',
   fins: [fin('M176,90 C182,74 192,68 202,68 C200,78 202,86 206,92Z', '#D8C29A'), fin('M216,94 C220,84 228,80 236,80 C234,88 236,94 240,98Z', '#D8C29A'), fin('M190,112 C194,122 202,126 210,126 C208,120 208,114 210,110Z', '#D8C29A'),
          fin('M262,100 C272,92 284,84 296,80 C292,90 290,98 284,104 C288,106 290,108 292,112 C280,110 270,106 262,102Z', '#D8C29A')],
   pattern: `<path d="M0,112 C80,120 180,116 270,102 L270,140 L0,140Z" fill="#FBF3E2"/>` + [[70, 92, 16, 8], [112, 90, 15, 7], [152, 92, 15, 7], [192, 94, 13, 6], [228, 97, 11, 5]].map(([x, y, a, b]) => `<ellipse cx="${x}" cy="${y}" rx="${a}" ry="${b}" fill="#6E4C34"/>`).join('') + [[62, 92], [78, 96], [104, 88], [120, 94], [146, 90], [160, 96], [188, 92], [200, 98], [90, 102], [134, 104], [176, 104], [226, 98]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#fff"/>`).join(''),
   over: `<path d="M26,108 C34,112 44,112 52,108" stroke="${O}" stroke-width="3" fill="none" stroke-linecap="round"/>` + [64, 70, 76].map(x => `<path d="M${x},100 q-3,5 0,10" stroke="#8A6A4A" stroke-width="2.2" fill="none" stroke-linecap="round"/>`).join(''),
   eye: [46, 98, 8], blush: [52, 108], blushR: 3.5, pec: fin('M88,112 C92,126 102,136 116,140 C116,128 112,118 106,112Z', '#D8C29A') })],
 ['Moray eel', 'Muräne', fish({ thick: 0.9, wave: 2.2, grumpy: true, body: 'M20,100 C24,84 44,78 64,80 C120,84 200,88 284,96 C290,98 290,104 284,106 C200,116 120,120 64,122 C44,124 22,118 20,100Z', fill: '#9A8A3E',
   fins: [fin('M70,82 C120,66 210,74 286,96 C210,84 130,80 70,82Z', '#7A6A2A'), fin('M120,120 C180,128 240,118 286,104 C240,112 180,116 120,120Z', '#7A6A2A')],
   pattern: `<path d="M0,112 C80,124 200,118 290,102 L290,140 L0,140Z" fill="#D8CC8A"/>` + [...Array(46)].map((_, i) => `<circle cx="${70 + (i * 37) % 210}" cy="${84 + (i * 53) % 30}" r="${2 + (i % 3)}" fill="#5A4A1E"/>`).join(''),
   over: `<path d="M20,104 C34,110 52,110 68,102" stroke="${O}" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M30,107 l3,5 l3,-5 M42,108 l3,5 l3,-5 M54,106 l3,5 l3,-4" fill="#fff" stroke="${O}" stroke-width="1.5"/><circle cx="28" cy="94" r="2.2" fill="${O}"/>`,
   eye: [50, 92, 8], blush: [62, 108], blushR: 4 })],
 ['Banded snake eel', 'Ringel-Schlangenaal', fish({ thick: 0.95, wave: 2.4, body: 'M16,100 C18,92 30,89 44,90 C120,92 220,95 288,99 C290,100 290,102 288,103 C220,108 120,110 44,111 C30,112 18,108 16,100Z', fill: '#FBF7EA',
   fins: [fin('M60,91 C120,84 220,90 286,99 C220,93 130,92 60,91Z', '#EDE6D0')],
   pattern: [...Array(10)].map((_, i) => `<rect x="${52 + i * 25}" y="60" width="${13 - i * 0.5}" height="80" fill="#16161C"/>`).join('') + `<path d="M0,60 L40,60 L40,140 L0,140Z" fill="#FFE9A0"/>`,
   over: `<path d="M17,103 C24,106 32,106 38,103" stroke="${O}" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="20" cy="97" r="1.6" fill="${O}"/>`, eye: [32, 97, 6], blush: [38, 104], blushR: 3 })],
 ['Scorpionfish', 'Skorpionsfisch', fish({ thick: 0.72, grumpy: true, body: 'M36,112 C36,84 70,62 120,62 C170,62 214,80 240,100 C214,122 170,142 120,142 C76,142 36,134 36,112Z', fill: '#C9563A',
   fins: [fin('M78,70 C80,48 92,42 100,52 C106,38 120,38 124,50 C132,40 146,42 148,54 C158,48 168,52 170,62 C190,58 212,70 226,88 L214,92 C196,76 150,66 92,74Z', '#A8402A', [[100, 52], [124, 50], [148, 54]].map(([x, y]) => `<path d="M${x},${y} l2,14" stroke="#F0A070" stroke-width="2.5"/>`).join('')),
          fin('M150,140 C166,156 196,150 212,124 L202,122 C192,134 172,138 160,136Z', '#A8402A'), fin('M236,100 C250,84 268,78 280,82 C276,94 276,106 280,118 C268,122 250,116 236,100Z', '#A8402A', `<path d="M260,86 C256,96 256,104 260,114" stroke="#F0A070" stroke-width="4" fill="none"/>`)],
   pattern: [[90, 80, 20, 10], [150, 78, 24, 10], [200, 96, 16, 9], [120, 110, 22, 9], [176, 120, 18, 8], [70, 126, 16, 7]].map(([x, y, a, b], i) => `<ellipse cx="${x}" cy="${y}" rx="${a}" ry="${b}" fill="${i % 2 ? '#F0A070' : '#8A3020'}" opacity=".85"/>`).join('') + [...Array(30)].map((_, i) => `<circle cx="${60 + (i * 41) % 170}" cy="${70 + (i * 29) % 64}" r="2" fill="#FFE0C0"/>`).join(''),
   over: `<path d="M36,116 C50,108 70,108 84,116" stroke="${O}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M44,122 l-4,10 M58,124 l-2,11 M72,122 l2,10" stroke="#A8402A" stroke-width="4" stroke-linecap="round"/><path d="M84,66 l-4,-12 M98,62 l0,-12" stroke="#A8402A" stroke-width="4" stroke-linecap="round"/>`,
   eye: [82, 86, 12], blush: [96, 108], blushR: 5,
   pec: fin('M116,110 C134,96 164,104 170,126 C158,142 130,140 116,110Z', '#E0704A', `<path d="M124,112 L160,116 M126,118 L158,128 M130,124 L150,134" stroke="#8A3020" stroke-width="2.5"/>`) })],
 ['Lionfish', 'Rotfeuerfisch', (() => { const ray = (x0, y0, x1, y1) => `<path d="M${x0},${y0} Q${(x0 + x1) / 2 - 6},${(y0 + y1) / 2} ${x1},${y1}" stroke="${O}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M${x0},${y0} Q${(x0 + x1) / 2 - 6},${(y0 + y1) / 2} ${x1},${y1}" stroke="#FFF4E4" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M${x0},${y0} Q${(x0 + x1) / 2 - 6},${(y0 + y1) / 2} ${x1},${y1}" stroke="#A83A28" stroke-width="5" fill="none" stroke-dasharray="7 7"/>`;
   return fish({ thick: 0.6, body: 'M40,108 C48,86 84,70 126,70 C170,72 210,86 236,100 C210,116 170,130 126,132 C84,132 46,126 40,108Z', fill: '#FFF4E4',
   fins: [...Array(10)].map((_, i) => ray(86 + i * 13, 76 + (i > 6 ? (i - 6) * 3 : 0), 66 + i * 15, 18 + Math.abs(i - 4) * 4)).concat([...Array(8)].map((_, i) => ray(116, 112, 70 + i * 16, 182 - Math.abs(i - 3) * 4))).concat(
          [fin('M232,100 C246,84 264,78 278,82 C274,94 274,106 278,118 C264,122 246,116 232,100Z', '#FFF4E4', [[250, 92], [262, 88], [252, 106], [264, 112], [266, 100]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#A83A28"/>`).join(''))]),
   pattern: [...Array(12)].map((_, i) => `<path d="M${52 + i * 16},60 C${58 + i * 16},90 ${46 + i * 16},110 ${54 + i * 16},140" stroke="#A83A28" stroke-width="${i % 2 ? 8 : 4}" fill="none"/>`).join(''),
   over: `<path d="M40,112 C50,116 60,116 68,112" stroke="${O}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M74,74 l-6,-14 M58,96 l-12,-8" stroke="#A83A28" stroke-width="4" stroke-linecap="round"/>`,
   eye: [76, 94, 10], blush: [86, 112], blushR: 4.5 }); })()],
 ['Crocodilefish', 'Krokodilfisch', fish({ thick: 1.7, wide: 2.3, body: 'M14,108 C30,100 60,92 100,88 C160,84 220,90 262,100 C220,110 160,116 100,116 C60,116 30,114 14,108Z', fill: '#C4AE7C',
   fins: [fin('M120,88 C128,72 146,68 160,74 C160,82 156,88 152,90Z', '#B09A68'), fin('M170,90 C178,76 198,74 214,82 C212,90 208,94 204,96Z', '#B09A68'), fin('M258,100 C270,90 282,86 292,88 C288,96 288,104 292,112 C282,114 270,110 258,100Z', '#B09A68', `<path d="M276,90 C272,98 272,104 276,110" stroke="#6A5A34" stroke-width="4" fill="none"/>`)],
   pattern: [[60, 100, 12, 5], [104, 96, 16, 6], [150, 98, 18, 6], [196, 100, 16, 5], [236, 102, 10, 4]].map(([x, y, a, b]) => `<ellipse cx="${x}" cy="${y}" rx="${a}" ry="${b}" fill="#7A6840"/>`).join('') + [...Array(40)].map((_, i) => `<circle cx="${30 + (i * 43) % 220}" cy="${92 + (i * 17) % 22}" r="1.6" fill="${i % 2 ? '#F4E8C8' : '#5A4A28'}"/>`).join(''),
   over: `<path d="M15,109 C40,112 70,110 96,104" stroke="${O}" stroke-width="3" fill="none" stroke-linecap="round"/>`, eye: [78, 96, 8], blush: [88, 106], blushR: 3.5,
   pec: fin('M110,108 C120,104 136,108 140,118 C128,124 114,120 110,108Z', '#B09A68') })],
 ['Dolphin', 'Delfin', fish({ thick: 0.85, body: 'M18,106 C30,102 40,98 52,90 C80,70 130,62 176,70 C214,78 244,92 266,100 C244,106 214,116 176,122 C130,130 84,128 56,118 C40,114 28,110 18,106Z', fill: '#6E9FD0',
   fins: [fin('M150,66 C160,44 176,34 190,32 C184,48 186,62 192,74Z', '#5A8ABE'),
          fin('M260,100 C272,84 284,76 296,74 C292,88 290,98 290,100 C290,104 292,114 296,128 C284,124 272,116 260,100Z', '#5A8ABE')],
   pattern: `<path d="M0,112 C40,106 60,112 90,118 C140,128 200,116 270,100 L270,150 L0,150Z" fill="#F4F8FC"/><path d="M60,80 C110,62 170,64 220,84" stroke="#5A8ABE" stroke-width="10" fill="none" opacity=".6"/>`,
   shine: [130, 74, 30, -3], over: `<path d="M20,107 C36,110 52,108 66,100" stroke="${O}" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="96" cy="70" rx="4" ry="2" fill="${O}"/>`,
   eye: [70, 92, 8.5], blush: [78, 104], blushR: 4.5, pec: fin('M110,116 C114,132 124,144 138,150 C138,136 134,124 128,116Z', '#5A8ABE') })],
 ['Bigfin reef squid', 'Großflossen-Riffkalmar', fish({ thick: 0.8, wave: 0.5, body: 'M70,100 C74,84 100,76 150,78 C200,80 250,90 278,100 C250,110 200,120 150,122 C100,124 74,116 70,100Z', fill: '#F6DCCB',
   fins: [fin('M108,82 C150,60 224,68 272,98 C230,84 160,78 108,82Z', '#FFD0DC'), fin('M108,118 C150,140 224,132 272,102 C230,116 160,122 108,118Z', '#FFD0DC')].concat(
     [[-10, 78], [-4, 88], [0, 98], [-4, 110], [-10, 120]].map(([dx, y]) => `<path d="M76,100 C56,${(100 + y) / 2} 36,${y} ${14 - dx},${y + (y - 100) * 0.3}" stroke="${O}" stroke-width="11" fill="none" stroke-linecap="round"/><path d="M76,100 C56,${(100 + y) / 2} 36,${y} ${14 - dx},${y + (y - 100) * 0.3}" stroke="#F6C8B4" stroke-width="6.5" fill="none" stroke-linecap="round"/>`)),
   pattern: `<path d="M60,60 L290,60 L290,92 C230,82 150,82 60,96Z" fill="#E8B4A4" opacity=".7"/>` + [...Array(40)].map((_, i) => `<circle cx="${112 + (i * 37) % 150}" cy="${82 + (i * 23) % 34}" r="${1.5 + (i % 3) * 0.6}" fill="${i % 4 ? '#C8688A' : '#5FE0E0'}"/>`).join(''),
   shine: [170, 84, 30, 3], eye: [92, 100, 12], blush: [108, 110], blushR: 4.5 })],
 ['Bluespotted stingray', 'Blaupunktrochen', fish({ flat: true, thick: 0.13, wave: 0.25, flap: 0.5, body: 'M40,100 C40,60 80,34 130,34 C176,36 204,66 210,100 C204,134 176,164 130,166 C80,166 40,140 40,100Z', fill: '#E2B762',
   fins: [fin('M200,95 C236,96 268,98 296,100 C268,102 236,104 200,105Z', '#E2B762', `<path d="M210,97 C240,98 266,99 288,100 M210,103 C240,102 266,101 288,100" stroke="#2F8BFF" stroke-width="2.4" fill="none"/>`),
          fin('M186,72 C200,68 212,74 214,84 C206,88 196,86 190,82Z', '#D4A850'), fin('M186,128 C200,132 212,126 214,116 C206,112 196,114 190,118Z', '#D4A850')],
   pattern: `<ellipse cx="124" cy="100" rx="60" ry="46" fill="#ECC67A"/>` + [[70, 100, 6], [84, 74, 7], [84, 126, 7], [108, 56, 6], [108, 144, 6], [112, 88, 7], [112, 112, 7], [138, 70, 7], [138, 130, 7], [142, 100, 8], [164, 56, 6], [164, 144, 6], [168, 86, 7], [168, 114, 7], [190, 100, 6], [60, 82, 5], [60, 118, 5], [132, 44, 5], [132, 156, 5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#2F8BFF" stroke="#1A5FD0" stroke-width="2"/>`).join(''),
   eyes: [[76, 86, 9], [76, 114, 9]] })],
 ['Manta ray', 'Mantarochen', fish({ flat: true, thick: 0.12, wave: 0.2, flap: 1.0, body: 'M60,100 C64,90 70,84 80,80 C100,40 130,14 150,6 C160,40 176,70 214,92 C222,96 226,98 228,100 C226,102 222,104 214,108 C176,130 160,160 150,194 C130,186 100,160 80,120 C70,116 64,110 60,100Z', fill: '#2B3650',
   fins: [fin('M66,88 C56,84 46,84 38,90 C48,92 56,94 64,97Z', '#2B3650'), fin('M66,112 C56,116 46,116 38,110 C48,108 56,106 64,103Z', '#2B3650'), fin('M222,98 C250,99 276,99.5 298,100 C276,100.5 250,101 222,102Z', '#2B3650')],
   pattern: `<path d="M84,84 C100,70 120,60 138,58 C128,74 112,86 92,92Z" fill="#F4F8FC"/><path d="M84,116 C100,130 120,140 138,142 C128,126 112,114 92,108Z" fill="#F4F8FC"/><path d="M150,10 C156,40 170,66 200,86" stroke="#4A5A7A" stroke-width="5" fill="none"/><path d="M150,190 C156,160 170,134 200,114" stroke="#4A5A7A" stroke-width="5" fill="none"/>`,
   over: `<path d="M62,94 C64,98 64,102 62,106" stroke="#F4F8FC" stroke-width="3" fill="none" stroke-linecap="round"/>`, eyes: [[76, 82, 6.5], [76, 118, 6.5]] })],
 ['Peacock flounder', 'Pfauenbutt', fish({ flat: true, thick: 0.12, wave: 0.5, flap: 0.25, body: 'M44,100 C44,66 84,46 140,46 C196,46 240,70 248,100 C240,130 196,154 140,154 C84,154 44,134 44,100Z', fill: '#C9B08A',
   fins: [fin('M70,62 C100,28 200,28 240,76 C200,50 110,48 70,62Z', '#B49A70', [...Array(8)].map((_, i) => `<path d="M${92 + i * 18},${52 - (i > 3 ? 0 : 2)} l${-4 + i},-14" stroke="#8A7450" stroke-width="2"/>`).join('')),
          fin('M70,138 C100,172 200,172 240,124 C200,150 110,152 70,138Z', '#B49A70', [...Array(8)].map((_, i) => `<path d="M${92 + i * 18},148 l${-4 + i},14" stroke="#8A7450" stroke-width="2"/>`).join('')),
          fin('M244,100 C256,86 272,80 284,82 C280,94 280,106 284,118 C272,120 256,114 244,100Z', '#B49A70')],
   pattern: [[104, 80], [140, 70], [180, 78], [214, 96], [120, 108], [160, 104], [196, 122], [140, 134], [100, 128], [80, 104]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="none" stroke="#3FA0FF" stroke-width="3.5"/><circle cx="${x}" cy="${y}" r="3" fill="#3FA0FF"/>`).join('') + [...Array(30)].map((_, i) => `<circle cx="${60 + (i * 47) % 180}" cy="${60 + (i * 31) % 84}" r="1.8" fill="#7A6440"/>`).join(''),
   over: `<path d="M46,96 C50,102 50,108 46,112" stroke="${O}" stroke-width="3" fill="none" stroke-linecap="round"/>`, eyes: [[68, 90, 7.5], [72, 110, 7.5]] })],
 ['Mola mola (ocean sunfish)', 'Mondfisch (Mola mola)', fish({ thick: 0.2, wave: 0.1, scull: 1,
   body: 'M38,100 C38,62 76,34 130,32 C176,32 208,46 224,64 C236,66 240,76 234,82 C244,86 244,96 236,100 C244,104 244,114 236,118 C240,124 236,134 224,136 C208,154 176,168 130,168 C76,166 38,138 38,100Z', fill: '#A9BCCB',
   fins: [fin('M164,40 C170,20 182,4 200,0 C198,14 200,30 208,50Z', '#7F96AA', `<path d="M172,38 C178,22 186,10 196,5" stroke="#9FB3C4" stroke-width="3" fill="none" stroke-linecap="round"/>`),
          fin('M164,160 C170,180 182,196 200,200 C198,186 200,170 208,150Z', '#7F96AA', `<path d="M172,162 C178,178 186,190 196,195" stroke="#9FB3C4" stroke-width="3" fill="none" stroke-linecap="round"/>`)],
   pattern: `<path d="M20,116 C70,140 170,140 250,112 L250,180 L20,180Z" fill="#DDE7EE"/><path d="M20,70 C70,40 170,34 250,64 L250,0 L20,0Z" fill="#8EA3B6"/>`
     + [[110, 74, 11, 7], [150, 66, 9, 6], [186, 82, 10, 7], [132, 104, 8, 5], [170, 112, 12, 7], [96, 122, 7, 5], [204, 108, 7, 5], [146, 140, 9, 5]].map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#C9D6E1" opacity=".9"/>`).join('')
     + `<path d="M226,64 C236,80 236,120 226,136" stroke="#D3DEE7" stroke-width="10" fill="none"/>` + [72, 88, 104, 120].map(y => `<path d="M214,${y} l18,${(y - 100) * 0.08}" stroke="#8EA3B6" stroke-width="2.5" fill="none"/>`).join(''),
   shine: [104, 46, 26, -10], eye: [74, 88, 12], blush: [78, 110], blushR: 6,
   over: `<ellipse cx="41" cy="104" rx="5" ry="6.5" fill="#4A3A40" stroke="${O}" stroke-width="3"/><path d="M106,92 C100,100 100,112 106,120" stroke="#6F8498" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
   pec: finT('M108,104 C116,90 138,84 146,92 C144,102 132,112 108,104Z', '#8EA3B6', null) + [0, 1, 2].map(k => `<path d="M${114 + k * 2},${102 - k * 1} L${136 + k * 3},${90 + k * 4}" stroke="#A9BCCB" stroke-width="2.2" stroke-linecap="round"/>`).join('') })],
];



export const DESIGNS = F.map(([en, de, cfg]) => ({ en, de, ...cfg }));
