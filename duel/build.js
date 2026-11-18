// 把 index.html、style.css、js 與字型合併成單一 HTML 檔（手機直接開網址或下載皆可玩）
// 執行：node duel/build.js  → 產生 duel/dist/yiqitao.html
'use strict';
const fs = require('fs');
const path = require('path');
const root = __dirname;

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
let css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
css = css.replace(/url\("(fonts\/[\w.-]+\.woff2)"\)/g, (_, f) =>
  `url("data:font/woff2;base64,${fs.readFileSync(path.join(root, f)).toString('base64')}")`);
html = html.replace(/<link rel="stylesheet" href="style\.css">/, () => `<style>\n${css}\n</style>`);
html = html.replace(/<script src="(js\/[\w.]+)"><\/script>/g, (_, src) => {
  const code = fs.readFileSync(path.join(root, src), 'utf8');
  return `<script>\n/* ${src} */\n${code.replace(/<\/script/gi, '<\\/script')}\n</script>`;
});
if (/src="js\//.test(html) || /href="style\.css"/.test(html) || /url\("fonts\//.test(html)) throw new Error('仍有未內嵌的檔案');

const out = path.join(root, 'dist', 'yiqitao.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`已輸出 ${path.relative(process.cwd(), out)}（${(html.length / 1024).toFixed(0)} KB）`);
