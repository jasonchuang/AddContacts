// 1) 掃描 portraits/ 中的武將插畫，產生 portraits/manifest.js
// 2) 把 index.html、style.css、所有 js（以及插畫，轉成 data URI）合併成單一 HTML 檔
// 執行：node chuhan/build.js  → 產生 chuhan/dist/chuhan.html
'use strict';
const fs = require('fs');
const path = require('path');

const root = __dirname;
const portraitDir = path.join(root, 'portraits');
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

// ---------- SPEC.md 數值表（依 js/tuning.js 重新產生） ----------
{
  const r = require('./tools/spec_tables.js').run(false);
  if (r.missing.length) console.log('注意：以下數值在 tools/spec_tables.js 沒有說明：' + r.missing.join('、'));
  if (r.changed) console.log('已依 tuning.js 更新 SPEC.md 的數值表');
}

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
console.log(`插畫：${Object.keys(files).filter((n) => !n.endsWith('_head')).length} 位`);

// ---------- 事件背景插圖 ----------
// scenes/<事件id>.jpg（由 tools/import_scenes.py 產生）；網頁版用到才下載，單檔版不內嵌（改用內建背景，避免檔案太大）
const sceneDir = path.join(root, 'scenes');
fs.mkdirSync(sceneDir, { recursive: true });
const sceneFiles = {};
for (const f of fs.readdirSync(sceneDir).sort()) if (/\.(jpg|png)$/i.test(f)) sceneFiles[path.basename(f, path.extname(f))] = `scenes/${f}`;
fs.writeFileSync(path.join(sceneDir, 'manifest.js'),
  '/* 由 build.js 自動產生：列出 scenes/ 中的事件背景插圖。請勿手動編輯。 */\n'
  + `(function (TK) { TK.SCENE_FILES = ${JSON.stringify(sceneFiles, null, 2)}; })(globalThis.TK = globalThis.TK || {});\n`);
console.log(`事件背景：${Object.keys(sceneFiles).length} 張`);

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

  html = html.replace(/<script src="((?:js|portraits|sprites|scenes)\/[\w.]+)"><\/script>/g, (_, src) => {
    let code;
    if (src === 'scenes/manifest.js') {
      const map = {};
      if (portraits !== 'inline') for (const [id, rel] of Object.entries(sceneFiles)) {
        map[id] = `${rel}?v=${crypto.createHash('md5').update(fs.readFileSync(path.join(root, rel))).digest('hex').slice(0, 8)}`;
      }
      code = `(function (TK) { TK.SCENE_FILES = ${JSON.stringify(map)}; })(globalThis.TK = globalThis.TK || {});`;
    } else if (src === 'sprites/manifest.js') {
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

  if (/src="(js|portraits|sprites|scenes)\//.test(html) || /href="style\.css"/.test(html) || /url\("fonts\//.test(html)) throw new Error('仍有未內嵌的檔案');
  return html;
}
const size = (str) => { const kb = Buffer.byteLength(str) / 1024; return kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb.toFixed(0) + ' KB'; };

const out = path.join(root, 'dist', 'chuhan.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
const single = bundle('inline');
fs.writeFileSync(out, single);
console.log(`已輸出 ${path.relative(process.cwd(), out)}（${size(single)}，插畫內嵌，可離線）`);

// GitHub Pages：repo 根目錄的 docs/ 就是網站。
//   平常打包只更新「預覽版」docs/preview/（網址最後加 /preview/），給使用者先試玩；
//   使用者確認後執行 node chuhan/build.js --release，才更新正式版 docs/index.html。
// 插畫放在各自的 portraits/ 資料夾，畫面用到才下載。
const release = process.argv.includes('--release');
const docs = path.join(root, '..', 'docs', 'chuhan'); // 楚漢放在網站的 /chuhan/ 底下
const site = release ? docs : path.join(docs, 'preview');
const sitePortraits = path.join(site, 'portraits');
fs.mkdirSync(site, { recursive: true });
fs.rmSync(sitePortraits, { recursive: true, force: true });
fs.mkdirSync(sitePortraits, { recursive: true });
for (const rel of Object.values(files)) fs.copyFileSync(path.join(root, rel), path.join(site, rel));
const siteScenes = path.join(site, 'scenes');
fs.rmSync(siteScenes, { recursive: true, force: true });
fs.mkdirSync(siteScenes, { recursive: true });
for (const rel of Object.values(sceneFiles)) fs.copyFileSync(path.join(root, rel), path.join(site, rel));
let web = bundle('url');
if (!release) {
  // 預覽版：左下角標示，避免跟正式版搞混
  const stamp = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }).replace(/:\d\d$/, '');
  web = web.replace('<title>', '<title>【預覽】')
    .replace('</body>', `<div style="position:fixed;left:6px;bottom:6px;z-index:9999;padding:2px 8px;border-radius:4px;background:#b23a2c;color:#fff;font-size:12px;opacity:.85;pointer-events:none">預覽版 ${stamp}</div>\n</body>`);
}
fs.writeFileSync(path.join(site, 'index.html'), web);
fs.writeFileSync(path.join(docs, '.nojekyll'), '');
console.log(release
  ? `已發布正式版：docs/chuhan/index.html（${size(web)}）＋ docs/chuhan/portraits/`
  : `已更新預覽版：docs/chuhan/preview/index.html（${size(web)}）＋ docs/chuhan/preview/portraits/。確認沒問題後執行 node chuhan/build.js --release 發布正式版`);
