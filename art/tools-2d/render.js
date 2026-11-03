// Render helper: list of {name, w, h, svgInner, viewBox} -> PNG (transparent)
const { chromium } = require('playwright');
const fs = require('fs');

async function renderAll(jobs, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const j of jobs) {
    const vb = j.viewBox || `0 0 ${j.w} ${j.h}`;
    const html = `<!doctype html><html><head><style>html,body{margin:0;background:transparent}</style>
    <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;700&display=swap" rel="stylesheet"></head><body>
    <svg id="s" xmlns="http://www.w3.org/2000/svg" width="${j.pw || j.w}" height="${j.ph || j.h}" viewBox="${vb}">${j.svg}</svg></body></html>`;
    await page.setContent(html, { waitUntil: 'load' }).catch(() => {});
    const el = await page.$('#s');
    await el.screenshot({ path: `${outDir}/${j.name}.png`, omitBackground: true });
    if (j.saveSvg) fs.writeFileSync(`${outDir}/${j.name}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${j.pw || j.w}" height="${j.ph || j.h}" viewBox="${vb}">${j.svg}</svg>`);
  }
  await browser.close();
}
module.exports = { renderAll };
