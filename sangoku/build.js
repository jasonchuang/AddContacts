// 把 index.html、style.css 與所有 js 合併成單一 HTML 檔，方便下載後直接雙擊遊玩。
// 執行：node sangoku/build.js  → 產生 sangoku/dist/qunxiong.html
'use strict';
const fs = require('fs');
const path = require('path');

const root = __dirname;
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

html = html.replace(/<link rel="stylesheet" href="style\.css">/, () =>
  `<style>\n${fs.readFileSync(path.join(root, 'style.css'), 'utf8')}\n</style>`);

html = html.replace(/<script src="(js\/[\w.]+)"><\/script>/g, (_, src) => {
  const code = fs.readFileSync(path.join(root, src), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script>\n/* ${src} */\n${code}\n</script>`;
});

if (/src="js\//.test(html) || /href="style\.css"/.test(html)) throw new Error('仍有未內嵌的檔案');

const out = path.join(root, 'dist', 'qunxiong.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`已輸出 ${path.relative(process.cwd(), out)}（${(html.length / 1024).toFixed(0)} KB）`);
