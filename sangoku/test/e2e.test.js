// 畫面（E2E）測試：用 Playwright 的 Chromium 實際打開打包好的網頁，模擬玩家操作。
// 執行：node sangoku/test/e2e.test.js [網址路徑，預設 /docs/preview/]
// 需要先 node sangoku/build.js。截圖存在 sangoku/test/e2e-shots/（不進版控），方便人工看畫面。
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');

const repo = path.join(__dirname, '..', '..');
const PAGE = process.argv[2] || '/docs/preview/';
const SHOTS = path.join(__dirname, 'e2e-shots');
fs.mkdirSync(SHOTS, { recursive: true });

// ---------- 靜態檔案伺服器（模擬 GitHub Pages） ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json' };
function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(repo, p);
      if (!f.startsWith(repo) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(0, () => resolve(srv));
  });
}

// ---------- 操作輔助 ----------
async function open(browser, base, mobile) {
  const ctx = await browser.newContext(mobile ? { ...devices['iPhone 13'] } : { viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  p.errors = [];
  p.portraitRequests = [];
  p.on('pageerror', (e) => p.errors.push(e.message));
  p.on('response', (r) => { if (r.url().includes('/portraits/')) p.portraitRequests.push(r.status()); });
  await p.goto(base + PAGE);
  await p.waitForSelector('#title-menu li');
  return { ctx, p };
}
// 新遊戲：第一個劇本（190）、指定勢力、自由模式、中等難度，按到可以下指令為止
async function newGame(p, faction) {
  await p.click('#title-menu li >> nth=0');
  await p.click('#layer li >> nth=0');
  await p.click(`#layer tr:has-text("${faction}")`);
  await p.click('#layer li:has-text("自由模式")');
  await p.waitForTimeout(300);
  if (await p.$('#layer li:has-text("中等")')) await p.click('#layer li:has-text("中等")');
  for (let i = 0; i < 60; i++) {
    if (await p.$('#cmd-win li:has-text("內政"):not(.off)') && !(await p.$('.scene'))) return;
    await p.keyboard.press('Enter');
    await p.waitForTimeout(200);
  }
  throw new Error('開局後一直無法下指令');
}
async function openGeneral(p, name) {
  await p.click('#cmd-win li:has-text("情報")');
  await p.click('#layer li:has-text("我方武將")');
  await p.click(`#layer tr:has-text("${name}")`);
  await p.waitForSelector('.detail');
}
const shot = (p, name) => p.screenshot({ path: path.join(SHOTS, name + '.png') });
async function imagesOk(p, sel) {
  return p.$$eval(sel, (a) => a.map((i) => ({ alt: i.alt, ok: i.complete && i.naturalWidth > 0, src: i.getAttribute('src') || '' })));
}
function assert(c, msg) { if (!c) throw new Error(msg); }

// ---------- 測試 ----------
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('開新局：標題畫面不下載頭像，開局後可以下指令，沒有 JS 錯誤', async (b, base) => {
  const { ctx, p } = await open(b, base);
  assert(p.portraitRequests.length === 0, `標題畫面就下載了 ${p.portraitRequests.length} 張頭像`);
  await newGame(p, '劉備軍');
  await shot(p, '01-開局');
  assert(!p.errors.length, p.errors.join('\n'));
  await ctx.close();
});

test('武將列傳：關羽的詳細畫面有列傳與立繪', async (b, base) => {
  const { ctx, p } = await open(b, base);
  await newGame(p, '劉備軍');
  await openGeneral(p, '關羽');
  const text = await p.textContent('.detail .bio');
  assert(text && text.includes('雲長') && text.includes('演義'), '列傳內容不對：' + text);
  await p.waitForTimeout(500);
  const imgs = await imagesOk(p, '.detail img.face');
  assert(imgs.length && imgs.every((x) => x.ok), '立繪沒有載入');
  await shot(p, '02-列傳');
  assert(!p.errors.length, p.errors.join('\n'));
  await ctx.close();
});

test('通用頭像：袁術軍的袁術用通用君主、閻象用通用文官、紀靈用通用武將，頭像都載入成功', async (b, base) => {
  const { ctx, p } = await open(b, base);
  await newGame(p, '袁術軍');
  await p.click('#cmd-win li:has-text("情報")');
  await p.click('#layer li:has-text("我方武將")');
  await p.waitForTimeout(800);
  const imgs = await imagesOk(p, '#layer img.face');
  const src = (n) => decodeURIComponent((imgs.find((x) => x.alt === n) || {}).src || '');
  assert(imgs.length >= 3 && imgs.every((x) => x.ok), '有頭像沒有載入：' + imgs.filter((x) => !x.ok).map((x) => x.alt).join('、'));
  for (const [n, kind] of [['袁術', '通用君主'], ['閻象', '通用文官'], ['紀靈', '通用武將']]) assert(src(n).includes(kind), `${n}沒有用${kind}頭像：${src(n).slice(0, 60)}`);
  assert(p.portraitRequests.every((s) => s === 200 || s === 304), '頭像下載失敗');
  await shot(p, '03-通用頭像');
  await ctx.close();
});

test('手動戰鬥：出征北海，下令突擊，交給部將打完，出現勝敗印章', async (b, base) => {
  const { ctx, p } = await open(b, base);
  await newGame(p, '劉備軍');
  await p.click('#cmd-win li:has-text("軍事")');
  await p.click('#layer li:has-text("出征")');
  await p.click('#layer tr:has-text("北海")');
  await p.click('.win-foot .act.primary');
  await p.click('.win-foot .act.primary >> nth=-1');
  await p.waitForSelector('.orders:not(.hidden)', { timeout: 15000 });
  await shot(p, '04-戰鬥下令');
  await p.click('.obtn.o-assault');
  await p.waitForSelector('.orders:not(.hidden), .stamp:not(.hidden)', { timeout: 20000 });
  if (await p.$('.orders:not(.hidden)')) await p.click('.oauto');
  await p.waitForSelector('.stamp:not(.hidden)', { timeout: 20000 });
  await shot(p, '05-戰鬥結果');
  assert(!p.errors.length, p.errors.join('\n'));
  await ctx.close();
});

test('手機版：主畫面與武將詳細畫面沒有超出螢幕寬度', async (b, base) => {
  const { ctx, p } = await open(b, base, true);
  await newGame(p, '劉備軍');
  const over = () => p.evaluate(() => {
    const w = innerWidth;
    return [...document.querySelectorAll('.win, #cmd-win, #layer > *')].filter((e) => e.offsetParent && e.getBoundingClientRect().right > w + 2).map((e) => e.className || e.id);
  });
  let o = await over();
  assert(!o.length, '主畫面超出寬度：' + o.join(', '));
  await openGeneral(p, '關羽');
  await shot(p, '06-手機列傳');
  o = await p.evaluate(() => [...document.querySelectorAll('.detail *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 2).length);
  assert(!o, `武將畫面有 ${o} 個元素超出寬度`);
  assert(!p.errors.length, p.errors.join('\n'));
  await ctx.close();
});

(async () => {
  const srv = await serve();
  const base = `http://localhost:${srv.address().port}`;
  if (!fs.existsSync(path.join(repo, PAGE.replace(/^\//, ''), PAGE.endsWith('/') ? 'index.html' : ''))) {
    console.error(`找不到 ${PAGE}，請先執行 node sangoku/build.js`);
    process.exit(1);
  }
  const browser = await chromium.launch();
  let failed = 0;
  for (const t of tests) {
    const t0 = Date.now();
    try { await t.fn(browser, base); console.log(`ok  - ${t.name}（${((Date.now() - t0) / 1000).toFixed(1)}s）`); }
    catch (e) { failed++; console.log(`FAIL- ${t.name}\n      ${e.message.split('\n').join('\n      ')}`); }
  }
  await browser.close();
  srv.close();
  console.log(`\n${tests.length - failed}/${tests.length} E2E tests passed（截圖：sangoku/test/e2e-shots/）`);
  process.exit(failed ? 1 : 0);
})();
