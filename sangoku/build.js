// 1) 掃描 portraits/ 中的武將插畫，產生 portraits/manifest.js
// 2) 把 index.html、style.css、所有 js（以及插畫，轉成 data URI）合併成單一 HTML 檔
// 執行：node sangoku/build.js  → 產生 sangoku/dist/qunxiong.html
'use strict';
const fs = require('fs');
const path = require('path');

const root = __dirname;
const portraitDir = path.join(root, 'portraits');
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

// ---------- 插畫清單 ----------
const files = {};
if (fs.existsSync(portraitDir)) {
  for (const f of fs.readdirSync(portraitDir).sort()) {
    const ext = path.extname(f).toLowerCase();
    if (MIME[ext]) files[path.basename(f, ext)] = `portraits/${f}`;
  }
}
fs.writeFileSync(path.join(portraitDir, 'manifest.js'),
  '/* 由 build.js 自動產生：列出 portraits/ 資料夾中可用的武將插畫。請勿手動編輯。 */\n'
  + `(function (TK) { TK.PORTRAIT_FILES = ${JSON.stringify(files, null, 2)}; })(globalThis.TK = globalThis.TK || {});\n`);
console.log(`插畫：${Object.keys(files).length} 張${Object.keys(files).length ? `（${Object.keys(files).join('、')}）` : ''}`);

// ---------- 單一檔案 ----------
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="style\.css">/, () =>
  `<style>\n${fs.readFileSync(path.join(root, 'style.css'), 'utf8')}\n</style>`);

html = html.replace(/<script src="((?:js|portraits)\/[\w.]+)"><\/script>/g, (_, src) => {
  let code;
  if (src === 'portraits/manifest.js') {
    const inline = {};
    for (const [name, rel] of Object.entries(files)) {
      const buf = fs.readFileSync(path.join(root, rel));
      inline[name] = `data:${MIME[path.extname(rel).toLowerCase()]};base64,${buf.toString('base64')}`;
    }
    code = `(function (TK) { TK.PORTRAIT_FILES = ${JSON.stringify(inline)}; })(globalThis.TK = globalThis.TK || {});`;
  } else {
    code = fs.readFileSync(path.join(root, src), 'utf8');
  }
  return `<script>\n/* ${src} */\n${code.replace(/<\/script/gi, '<\\/script')}\n</script>`;
});

if (/src="(js|portraits)\//.test(html) || /href="style\.css"/.test(html)) throw new Error('仍有未內嵌的檔案');

const out = path.join(root, 'dist', 'qunxiong.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
const kb = html.length / 1024;
console.log(`已輸出 ${path.relative(process.cwd(), out)}（${kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb.toFixed(0) + ' KB'}）`);
