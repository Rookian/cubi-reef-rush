// English / German. All texts are written in English in the code and HTML; when German is chosen,
// every text node (also ones added later: toasts, lists, rankings) is translated on the way to the screen.
let lang = 'en';
// default: the browser language (first of the browser's preferred languages that is German or English);
// a flag the player tapped is remembered and wins over that
function browserLang() {
  for (const l of (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'])) {
    const c = String(l).toLowerCase().slice(0, 2); if (c === 'de' || c === 'en') return c;
  }
  return 'en';
}
lang = browserLang();
try { const saved = localStorage.getItem('cubi_lang2'); if (saved === 'de' || saved === 'en') lang = saved; localStorage.removeItem('cubi_lang'); } catch (e) {}
document.documentElement.lang = lang;
export const getLang = () => lang;

const DE = {
  // game: menu & cards
  "Cubi's Reef Rush": "Cubis Riff-Rausch",
  'Ride the current to the finish! Drag to steer (or arrow keys). Jellies, puffers, urchins and sharks hurt. Corals just bump you. Press': 'Schwimm mit der Strömung ins Ziel! Zum Lenken ziehen (oder Pfeiltasten). Quallen, Kugelfische, Seeigel und Haie tun weh. Korallen schubsen dich nur zur Seite. Drück die',
  'Space': 'Leertaste', 'or tap': 'oder tippe auf', 'Toxin': 'Gift',
  "to scare enemies, or to escape a shark's mouth.": ', um Gegner zu verscheuchen oder dich aus einem Haimaul zu befreien.',
  'Level editor': 'Level-Editor', '🏆 Ranking': '🏆 Rangliste', '🌍 Player levels': '🌍 Spieler-Level',
  'Bonk!': 'Autsch!', 'Try again': 'Nochmal', 'Levels': 'Level', 'Level complete!': 'Level geschafft!', 'Next level': 'Nächstes Level', 'Replay': 'Nochmal spielen',
  'Back': 'Zurück', 'Build your own': 'Eigenes bauen', 'Levels built and shared by other players in the level editor.': 'Level, die andere Spieler im Level-Editor gebaut und geteilt haben.',
  'Buddy shield': 'Freund-Schutz', 'TOXIN!': 'GIFT!', 'Press Space or tap the Toxin button': 'Drück die Leertaste oder tippe auf Gift', 'Filling the ocean…': 'Der Ozean wird gefüllt…',
  'Tap to start': 'Tippen zum Starten', 'Newest': 'Neueste', 'Most played': 'Meistgespielt', 'Most liked': 'Beliebteste',
  'Save': 'Speichern', 'Saving…': 'Speichert…', 'Retry': 'Nochmal versuchen', 'Your name': 'Dein Name', 'Loading ranking…': 'Rangliste wird geladen…', 'Loading levels…': 'Level werden geladen…', 'Loading…': 'Lädt…',
  'No scores yet. Be the first!': 'Noch keine Punkte. Sei der Erste!', 'World ranking': 'Weltrangliste', 'Offline: showing scores from this device': 'Offline: Punkte von diesem Gerät', 'Ranking on this device': 'Rangliste auf diesem Gerät',
  'Online levels are not set up.': 'Online-Level sind nicht eingerichtet.', 'No shared levels yet. Build one in the level editor and tap "Share online"!': 'Noch keine geteilten Level. Bau eins im Level-Editor und tippe auf „Online teilen“!',
  'Could not load levels. Check your internet connection.': 'Level konnten nicht geladen werden. Prüfe deine Internetverbindung.',
  '👍 Like this level': '👍 Level gefällt mir', '👍 Liked': '👍 Gefällt dir', 'My level': 'Mein Level',
  // level names
  'Sunny Shallows': 'Sonnige Lagune', 'Jelly Garden': 'Quallengarten', 'Current Canyon': 'Strömungsschlucht',
  // toasts & warnings
  'A whale shark is passing by!': 'Ein Walhai schwimmt vorbei!', 'Buddy saved you!': 'Dein Freund hat dich gerettet!', 'Bleh! Spat out!': 'Bäh! Ausgespuckt!', 'Saved on this device': 'Auf diesem Gerät gespeichert',
  'Could not save': 'Speichern fehlgeschlagen', 'Could not load level': 'Level konnte nicht geladen werden', 'High quality': 'Hohe Qualität', 'Fast mode': 'Schneller Modus',
  'Chomp! Too slow…': 'Happs! Zu langsam…', 'Clownfish buddy!': 'Clownfisch-Freund!', '+1 heart': '+1 Herz', 'Through the wreck!': 'Durchs Wrack!', 'Moray eel ahead!': 'Achtung, Muräne!',
  'Hammerhead!': 'Hammerhai!', 'Sea snake!': 'Seeschlange!', 'Inked!': 'Tinte!', 'Kraken!': 'Krake!', 'Shark! Press Space / tap Toxin': 'Hai! Leertaste / Gift drücken',
  'Ouch!': 'Aua!', 'Chomp! Moray!': 'Happs! Muräne!', 'Tangled by the kraken!': 'Vom Kraken umschlungen!', 'Bonk! Hammerhead!': 'Bonk! Hammerhai!', 'Zap! Sea snake!': 'Zack! Seeschlange!',
  'Mute sound (M)': 'Ton aus (M)', 'Turn sound on (M)': 'Ton an (M)', 'Release toxin (Space)': 'Gift ausstoßen (Leertaste)',
  "Cubi's Reef Rush: steer Cubi the boxfish through the reef": 'Cubis Riff-Rausch: Steuere Cubi den Kofferfisch durchs Riff',
  // editor
  "Cubi's Reef Rush – Level editor": 'Cubis Riff-Rausch – Level-Editor', 'Back to game': 'Zurück zum Spiel', 'Name': 'Name', 'Length (m)': 'Länge (m)', 'Current': 'Strömung',
  'Relaxed': 'Gemütlich', 'Normal': 'Normal', 'Fast': 'Schnell', 'Play this level': 'Level spielen', 'Copy level': 'Level kopieren', 'Paste level': 'Level einfügen', '🌍 Share online': '🌍 Online teilen',
  'Start from': 'Starten mit', 'Choose…': 'Auswählen…', 'Empty track': 'Leere Strecke', 'Close': 'Schließen', 'Load': 'Laden', 'Level text': 'Level-Text', 'Level': 'Level',
  'The map shows the track from above: the start is at the bottom and the finish at the top. The letters L, M and H show whether an item floats low, mid or high. Jellyfish, pufferfish, urchins and sharks hurt Cubi. Corals only bump him aside. Your level is saved automatically on this device and appears as “My level” in the game.':
    'Die Karte zeigt die Strecke von oben: Start ist unten, Ziel oben. Die Buchstaben L, M und H zeigen, ob etwas tief, mittel oder hoch schwebt. Quallen, Kugelfische, Seeigel und Haie tun Cubi weh. Korallen schubsen ihn nur zur Seite. Dein Level wird automatisch auf diesem Gerät gespeichert und erscheint im Spiel als „Mein Level“.',
  'Items to place': 'Dinge zum Platzieren', 'Top-down map of the track. The start is at the bottom, the finish at the top.': 'Karte der Strecke von oben. Start unten, Ziel oben.',
  'Move': 'Verschieben', 'Pearl line': 'Perlenreihe', 'Pearl': 'Perle', 'Jellyfish': 'Qualle', 'Pufferfish': 'Kugelfisch', 'Urchin': 'Seeigel', 'Sea urchin': 'Seeigel', 'Shark': 'Hai', 'Coral': 'Koralle',
  'Clownfish': 'Clownfisch', 'Clownfish home': 'Clownfisch-Zuhause', 'Wreck to swim through': 'Wrack zum Durchschwimmen', 'Moray eel': 'Muräne', 'Kraken (ink)': 'Krake (Tinte)', 'Kraken': 'Krake',
  'Hammerhead (crosses)': 'Hammerhai (kreuzt)', 'Sea snake (crosses low)': 'Seeschlange (kreuzt tief)', 'Hammerhead': 'Hammerhai', 'Sea snake': 'Seeschlange',
  'Reef decor': 'Riff-Deko', 'Visitor swims by': 'Besucher schwimmt vorbei', 'Visitor': 'Besucher',
  'Height': 'Höhe', 'Low': 'Tief', 'Mid': 'Mitte', 'High': 'Hoch', 'Count': 'Anzahl', 'Gap': 'Abstand', 'Tight': 'Eng', 'Wide': 'Weit', 'Shape': 'Form', 'Straight': 'Gerade', 'Slant →': 'Schräg →', 'Slant ←': 'Schräg ←',
  'Rise': 'Steigung', 'Flat': 'Flach', 'Up ↗': 'Hoch ↗', 'Down ↘': 'Runter ↘', 'Kind': 'Art', 'Branch': 'Ast', 'Staghorn': 'Hirschgeweih', 'Tube': 'Röhre', 'Fan': 'Fächer', 'Brain': 'Hirn', 'Bubble': 'Blasen', 'Rock': 'Fels',
  'Push': 'Schub', '← Left': '← Links', 'Right →': 'Rechts →', '↑ Up': '↑ Hoch', '↓ Down': '↓ Runter', 'Length': 'Länge', 'Short': 'Kurz', 'Medium': 'Mittel', 'Long': 'Lang',
  'Side': 'Seite', 'Home': 'Zuhause', 'Pipe coral': 'Orgelkoralle', 'From': 'Von', 'Auto': 'Auto', 'Left': 'Links', 'Right': 'Rechts', 'Thing': 'Ding', 'Who': 'Wer',
  'Duplicate': 'Duplizieren', 'Delete': 'Löschen', 'Tap an item to edit it. Drag empty space to scroll.': 'Tippe etwas an, um es zu bearbeiten. Zieh auf freier Fläche zum Scrollen.',
  'Magnificent anemone': 'Prachtanemone', 'Giant carpet anemone': 'Riesenanemone', "Merten's carpet anemone": 'Mertens Riesenanemone', 'Fluffy anemone': 'Flauschige Anemone', 'Christmas tree worms': 'Spiralröhrenwürmer',
  'Sunken debris': 'Versunkene Schätze', 'Seagrass meadow': 'Seegraswiese', 'Turtle eating coral': 'Schildkröte frisst Koralle', 'Shrimp': 'Garnele', 'Sea star': 'Seestern', 'Giant clam': 'Riesenmuschel',
  'Sponge': 'Schwamm', 'Mushroom coral': 'Pilzkoralle', 'Crab': 'Krabbe', 'Nudibranch': 'Nacktschnecke', 'Kelp': 'Seetang',
  'Whale shark': 'Walhai', 'Sea turtle': 'Meeresschildkröte', 'Baby turtles': 'Baby-Schildkröten', 'Manta ray': 'Mantarochen',
  'Level copied': 'Level kopiert', 'Online sharing is not set up': 'Online-Teilen ist nicht eingerichtet', 'Add at least 3 items first': 'Füge zuerst mindestens 3 Dinge hinzu',
  'Shared! Find it under Player levels': 'Geteilt! Du findest es unter Spieler-Level', 'Could not share': 'Teilen fehlgeschlagen', 'Level loaded': 'Level geladen', 'Sharing…': 'Wird geteilt…',
  "That doesn't look like a level. Paste the text from Copy level.": 'Das sieht nicht nach einem Level aus. Füge den Text von „Level kopieren“ ein.',
  'Copy your level': 'Dein Level kopieren', 'Paste a level': 'Level einfügen', 'Please enter your name': 'Bitte gib deinen Namen ein',
  'English': 'Englisch', 'Deutsch': 'Deutsch', 'Language': 'Sprache',
};
const lvl = (s) => DE[s] || s;
const PATTERNS = [
  [/^(\d+) points$/, (m) => `${m[1]} Punkte`],
  [/^(\d+) lives$/, (m) => `${m[1]} Leben`],
  [/^(.*) · best (\d+) pearls$/, (m) => `${lvl(m[1])} · Rekord ${m[2]} Perlen`],
  [/^(.*): (\d+) of (\d+) m · (\d+) pearls$/, (m) => `${lvl(m[1])}: ${m[2]} von ${m[3]} m · ${m[4]} Perlen`],
  [/^(.*) · (\d+)\/(\d+) pearls$/, (m) => `${lvl(m[1])} · ${m[2]}/${m[3]} Perlen`],
  [/^(.*) · (World ranking|Ranking on this device|Offline: showing scores from this device)$/, (m) => `${lvl(m[1])} · ${DE[m[2]]}`],
  [/^by (.*) · (\d+) m$/, (m) => `von ${m[1]} · ${m[2]} m`],
  [/^(.*) by (.*)$/, (m) => `${lvl(m[1])} von ${m[2]}`],
  [/^(.*) \(copy\)$/, (m) => `${lvl(m[1])} (Kopie)`],
  [/^(\d+) items · (\d+) pearls · (\d+) enemies$/, (m) => `${m[1]} Dinge · ${m[2]} Perlen · ${m[3]} Gegner`],
  [/^Tap the map to place: (.*)$/, (m) => `Tippe auf die Karte zum Platzieren: ${DE[m[1]] || m[1]}`],
  [/^at (\d+) m$/, (m) => `bei ${m[1]} m`],
  [/^(\d+) FPS · (.*) · Fast$/, (m) => `${m[1]} FPS · ${m[2]} · Schnell`],
  [/^Could not save online \((\d+)\)$/, (m) => `Online-Speichern fehlgeschlagen (${m[1]})`],
  [/^Upload failed \((\d+)\)$/, (m) => `Hochladen fehlgeschlagen (${m[1]})`],
  [/^([\p{Extended_Pictographic}☀-➿]+) (.+)$/u, (m) => DE[m[2]] ? `${m[1]} ${DE[m[2]]}` : null],     // "🪸 Magnificent anemone"
];
export function tr(s) {
  if (lang === 'en' || s == null) return s;
  const str = String(s), core = str.trim();
  if (!core) return str;
  let out = DE[core];
  if (out == null) for (const [re, fn] of PATTERNS) { const m = core.match(re); if (m) { out = fn(m); if (out != null) break; } }
  if (out == null) return str;
  if (out.startsWith(',')) return out + str.slice(str.indexOf(core) + core.length);     // glue a leading comma to the previous word
  return str.replace(core, out);
}

// ---- translate the page (text nodes + a few attributes), and keep translating what gets added later
const ATTRS = ['aria-label', 'placeholder', 'title'];
const SKIP = new Set(['SCRIPT', 'STYLE', 'CANVAS', 'TEXTAREA', 'svg']);
function doText(n) {
  if (n.__tr !== undefined && n.nodeValue === n.__tr) { /* our own value */ } else n.__en = n.nodeValue;
  const out = lang === 'en' ? n.__en : tr(n.__en);
  n.__tr = out; if (n.nodeValue !== out) n.nodeValue = out;
}
function doEl(el) {
  for (const a of ATTRS) {
    if (!el.hasAttribute(a)) continue;
    const key = 'en' + a.replace(/-./g, x => x[1].toUpperCase()).replace(/^./, c => c.toUpperCase());
    const cur = el.getAttribute(a);
    if (el.dataset[key] === undefined || cur !== el.dataset[key + 'Tr']) el.dataset[key] = cur;
    const out = lang === 'en' ? el.dataset[key] : tr(el.dataset[key]);
    el.dataset[key + 'Tr'] = out; if (cur !== out) el.setAttribute(a, out);
  }
}
function walk(root) {
  if (root.nodeType === 3) { if (!SKIP.has(root.parentNode?.nodeName)) doText(root); return; }
  if (root.nodeType !== 1 || SKIP.has(root.nodeName)) return;
  doEl(root);
  for (const c of root.childNodes) walk(c);
}
let busy = false;
const obs = new MutationObserver((list) => {
  if (busy) return; busy = true;
  for (const m of list) {
    if (m.type === 'characterData') { if (!SKIP.has(m.target.parentNode?.nodeName)) doText(m.target); }
    else if (m.type === 'attributes') doEl(m.target);
    else m.addedNodes.forEach(walk);
  }
  obs.takeRecords(); busy = false;
});
function startTranslating() { walk(document.body); obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS }); }
if (document.body) startTranslating(); else addEventListener('DOMContentLoaded', startTranslating);

const listeners = [];
export function onLangChange(fn) { listeners.push(fn); }
export function setLang(l) {
  if (l === lang) return; lang = l; document.documentElement.lang = l;
  try { localStorage.setItem('cubi_lang2', l); } catch (e) {}
  busy = true; walk(document.body); obs.takeRecords(); busy = false;
  listeners.forEach(fn => fn(l));
  document.querySelectorAll('.langSwitch button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === l)));
}

// ---- flag switch (SVG flags: emoji flags don't show on Windows)
const FLAG = {
  en: '<svg viewBox="0 0 60 30" aria-hidden="true"><clipPath id="ukc"><path d="M30,15h30v15zv15h-30zh-30v-15zv-15h30z"/></clipPath><path d="M0,0v30h60v-30z" fill="#012169"/><path d="M0,0 60,30M60,0 0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 60,30M60,0 0,30" clip-path="url(#ukc)" stroke="#C8102E" stroke-width="4"/><path d="M30,0v30M0,15h60" stroke="#fff" stroke-width="10"/><path d="M30,0v30M0,15h60" stroke="#C8102E" stroke-width="6"/></svg>',
  de: '<svg viewBox="0 0 5 3" aria-hidden="true"><rect width="5" height="1" fill="#000"/><rect y="1" width="5" height="1" fill="#DD0000"/><rect y="2" width="5" height="1" fill="#FFCE00"/></svg>',
};
export function langSwitch() {
  const box = document.createElement('div'); box.className = 'langSwitch'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Language');
  for (const [l, name] of [['en', 'English'], ['de', 'Deutsch']]) {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.lang = l; b.title = name; b.setAttribute('aria-label', name);
    b.setAttribute('aria-pressed', String(l === lang)); b.innerHTML = FLAG[l];
    b.addEventListener('pointerdown', (e) => e.stopPropagation());
    b.onclick = (e) => { e.stopPropagation(); setLang(l); };
    box.appendChild(b);
  }
  return box;
}
export const LANG_CSS = `.langSwitch{display:inline-flex;gap:6px}.langSwitch button{width:44px;height:30px;min-height:0;padding:3px;border-radius:8px;border:3px solid transparent;background:rgba(255,255,255,.9);box-shadow:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}.langSwitch button svg{width:100%;height:100%;border-radius:3px;display:block}.langSwitch button[aria-pressed="true"]{border-color:#3B2614;box-shadow:0 2px 0 #3B2614}.langSwitch button[aria-pressed="false"]{opacity:.65}`;
