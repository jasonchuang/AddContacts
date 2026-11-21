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

// ---------- 士兵 sprite sheet ----------
// sprites/sprites.json 描述每個兵種的圖檔與動畫格（格式見 sprites/README.md）；產生 sprites/manifest.js
const spriteDir = path.join(root, 'sprites');
let spriteCfg = {};
const spriteJson = path.join(spriteDir, 'sprites.json');
if (fs.existsSync(spriteJson)) spriteCfg = JSON.parse(fs.readFileSync(spriteJson, 'utf8'));
delete spriteCfg._comment;
// 每個動畫可以指定自己的 file（一張圖一個動作），否則用兵種的 file（一張圖多列）
function spriteFiles(cfg) {
  const set = new Set();
  for (const u of Object.values(cfg)) {
    if (u.file) set.add(u.file);
    for (const a of Object.values(u.anims || {})) if (a.file) set.add(a.file);
  }
  return [...set];
}
for (const f of spriteFiles(spriteCfg)) if (!fs.existsSync(path.join(spriteDir, f))) throw new Error(`sprites.json 指到不存在的圖檔：sprites/${f}`);
// 讀 PNG 的寬高（IHDR），讓畫面能算出縮放後的背景大小
function pngSize(f) {
  const buf = fs.readFileSync(path.join(spriteDir, f));
  if (buf.toString('ascii', 1, 4) !== 'PNG') throw new Error(`士兵圖請用 PNG：sprites/${f}`);
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}
const spriteManifest = (resolve) => {
  const cfg = JSON.parse(JSON.stringify(spriteCfg));
  for (const u of Object.values(cfg)) {
    if (u.file) { u.size = pngSize(u.file); u.file = resolve(u.file); }
    for (const a of Object.values(u.anims || {})) if (a.file) { a.size = pngSize(a.file); a.file = resolve(a.file); }
  }
  return `(function (TK) { TK.SPRITES = ${JSON.stringify(cfg)}; })(globalThis.TK = globalThis.TK || {});`;
};
fs.mkdirSync(spriteDir, { recursive: true });
fs.writeFileSync(path.join(spriteDir, 'manifest.js'),
  '/* 由 build.js 自動產生（來源：sprites/sprites.json）。請勿手動編輯。 */\n' + spriteManifest((f) => `sprites/${f}`) + '\n');
console.log(`士兵圖：${Object.keys(spriteCfg).length ? Object.keys(spriteCfg).join('、') : '無（使用內建 SVG）'}`);

// ---------- 單一檔案 ----------
// portraits：'inline' 把插畫轉成 data URI 內嵌（下載的單檔版，離線可看）；
//            'url' 只放網址，圖檔另外放在網站上，瀏覽器顯示到哪張才下載哪張（GitHub Pages 版，開啟快）
const crypto = require('crypto');
function bundle(portraits) {
  let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  // 樣式：字型檔轉成 data URI 內嵌
  let css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
  css = css.replace(/url\("(fonts\/[\w.-]+\.woff2)"\)/g, (_, f) =>
    `url("data:font/woff2;base64,${fs.readFileSync(path.join(root, f)).toString('base64')}")`);
  html = html.replace(/<link rel="stylesheet" href="style\.css">/, () => `<style>\n${css}\n</style>`);

  html = html.replace(/<script src="((?:js|portraits|sprites)\/[\w.]+)"><\/script>/g, (_, src) => {
    let code;
    if (src === 'sprites/manifest.js') {
      code = spriteManifest((f) => `data:${MIME[path.extname(f).toLowerCase()]};base64,${fs.readFileSync(path.join(spriteDir, f)).toString('base64')}`);
    } else if (src === 'portraits/manifest.js') {
      const map = {};
      for (const [name, rel] of Object.entries(files)) {
        const buf = fs.readFileSync(path.join(root, rel));
        if (portraits === 'inline') map[name] = `data:${MIME[path.extname(rel).toLowerCase()]};base64,${buf.toString('base64')}`;
        // 網址後面加內容雜湊：換圖後瀏覽器不會拿到舊的快取
        else map[name] = `${encodeURI(rel)}?v=${crypto.createHash('md5').update(buf).digest('hex').slice(0, 8)}`;
      }
      code = `(function (TK) { TK.PORTRAIT_FILES = ${JSON.stringify(map)}; })(globalThis.TK = globalThis.TK || {});`;
    } else {
      code = fs.readFileSync(path.join(root, src), 'utf8');
    }
    return `<script>\n/* ${src} */\n${code.replace(/<\/script/gi, '<\\/script')}\n</script>`;
  });

  if (/src="(js|portraits|sprites)\//.test(html) || /href="style\.css"/.test(html) || /url\("fonts\//.test(html)) throw new Error('仍有未內嵌的檔案');
  return html;
}
const size = (str) => { const kb = Buffer.byteLength(str) / 1024; return kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb.toFixed(0) + ' KB'; };

const out = path.join(root, 'dist', 'qunxiong.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
const single = bundle('inline');
fs.writeFileSync(out, single);
console.log(`已輸出 ${path.relative(process.cwd(), out)}（${size(single)}，插畫內嵌，可離線）`);

// GitHub Pages：repo 根目錄的 docs/ 就是網站（docs/index.html），插畫放在 docs/portraits/ 用到才下載
const site = path.join(root, '..', 'docs');
const sitePortraits = path.join(site, 'portraits');
fs.mkdirSync(site, { recursive: true });
fs.rmSync(sitePortraits, { recursive: true, force: true });
fs.mkdirSync(sitePortraits, { recursive: true });
for (const rel of Object.values(files)) fs.copyFileSync(path.join(root, rel), path.join(site, rel));
const web = bundle('url');
fs.writeFileSync(path.join(site, 'index.html'), web);
fs.writeFileSync(path.join(site, '.nojekyll'), '');
console.log(`已更新 GitHub Pages：docs/index.html（${size(web)}）＋ docs/portraits/（${Object.keys(files).length} 張，用到才下載）`);
