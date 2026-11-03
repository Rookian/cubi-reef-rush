// Cache-busting: after each build, give the script tags a fresh ?v= so browsers load the new game right away.
const fs = require('fs'), path = require('path');
const v = Date.now().toString(36);
for (const [html, js] of [['index.html', 'game.js'], ['editor.html', 'editor.js'], ['showcase.html', 'showcase.js']]) {
  const p = path.join(__dirname, '..', 'public', html);
  if (!fs.existsSync(p)) continue;
  const s = fs.readFileSync(p, 'utf8').replace(new RegExp(`src="${js.replace('.', '\\.')}(\\?v=[a-z0-9]+)?"`), `src="${js}?v=${v}"`);
  fs.writeFileSync(p, s);
}
console.log('stamped', v);
