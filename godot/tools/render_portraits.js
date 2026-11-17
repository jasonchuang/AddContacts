// 把全部武將的動畫風肖像輸出成 PNG，放進 art/portraits/（Godot 會自動優先使用）。
// 執行：node godot/tools/render_portraits.js [武將名,武將名...]
// 需要：npm 套件 playwright（含 Chromium）。
// 每人兩張：<名>.png（半身 400×500）與 <名>_head.png（頭像 224×224）。
// 服飾顏色依開局所屬勢力；在野武將為中性色。
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { traits } = require('./portrait_traits.js');
const { svg } = require('./anime_portrait.js');

const root = path.join(__dirname, '..');
const scn = JSON.parse(fs.readFileSync(path.join(root, 'data', 'scenario_190.json'), 'utf8'));
const colors = Object.fromEntries(scn.factions.map((f) => [f.id, f.color]));
const only = process.argv[2] ? new Set(process.argv[2].split(',')) : null;
const outDir = path.join(root, 'art', 'portraits');

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  let n = 0;
  for (const g of scn.generals) {
    if (only && !only.has(g.name)) continue;
    const col = colors[g.faction] || '#8d857a';
    const t = traits(g);
    for (const [mode, w, hgt, file] of [['full', 200, 250, `${g.name}.png`], ['head', 112, 112, `${g.name}_head.png`]]) {
      await page.setViewportSize({ width: w, height: hgt });
      await page.setContent(`<html><body style="margin:0">${svg(g, col, mode, t).replace('<svg ', `<svg style="display:block;width:${w}px;height:${hgt}px" `)}</body></html>`);
      await page.screenshot({ path: path.join(outDir, file), clip: { x: 0, y: 0, width: w, height: hgt } });
    }
    n++;
  }
  await browser.close();
  // 減色壓縮（動畫風顏色少，256 色無明顯差異）；需要 Python 的 Pillow，沒有則略過
  const quant = `import glob\nfrom PIL import Image\nfor f in glob.glob(${JSON.stringify(outDir + '/*.png')}):\n  Image.open(f).convert('RGB').quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(f, optimize=True)`;
  const r = require('child_process').spawnSync('python3', ['-c', quant], { stdio: 'inherit' });
  console.log(`已輸出 ${n} 名武將的肖像到 ${path.relative(process.cwd(), outDir)}${r.status === 0 ? '（已減色壓縮）' : '（未壓縮：需要 Pillow）'}`);
})();
