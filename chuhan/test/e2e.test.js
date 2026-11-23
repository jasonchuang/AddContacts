// 畫面（E2E）測試：用 Playwright 的 Chromium 實際打開打包好的網頁，模擬玩家操作。
// 執行：node chuhan/test/e2e.test.js [網址路徑，預設 /docs/chuhan/preview/]
// 需要先 node chuhan/build.js。截圖存在 chuhan/test/e2e-shots/（不進版控），方便人工看畫面。
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');

const repo = path.join(__dirname, '..', '..');
const PAGE = process.argv[2] || '/docs/chuhan/preview/';
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
  // 計算接到喇叭（AudioDestinationNode）的聲音節點數，用來確認真的有發聲
  await p.addInitScript(() => {
    window.__sounds = 0;
    const orig = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (d, ...r) { if (d instanceof AudioDestinationNode) window.__sounds++; return orig.call(this, d, ...r); };
  });
  await p.goto(base + PAGE);
  await p.waitForSelector('.title-menu li');
  return { ctx, p };
}
// 新遊戲：第一個劇本（190）、指定勢力、自由模式、中等難度，按到可以下指令為止
async function newGame(p, faction) {
  await ui.setup(p, faction, '自由模式');
  for (let i = 0; i < 60; i++) {
    if (await p.$('#cmd-win li:has-text("開墾"):not(.off)') && !(await p.$('.scene'))) return;
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
// 主畫面的操作（改版面時只要改這幾個函式）
const ui = {
  // 標題 → 第一個劇本 → 勢力卡片 → 模式與難易度 → 出陣
  async setup(p, faction, mode) {
    await p.click('.title-menu li:has-text("新遊戲")');
    await p.click('.scard >> nth=0');
    await p.click(`.fcard:has-text("${faction}")`);
    await p.click(`.seg button:has-text("${mode}")`);
    await p.click('.seg button:has-text("中等")');
    await p.click('.setup-win .start');
  },
  state: (p) => p.evaluate(() => { const S = TK.UI.state(); return S && JSON.parse(JSON.stringify(S)); }),
  async cmd(p, ...path) { // 例：cmd(p, '內政', '開墾')
    await p.click(`#cmd-win li:has-text("${path[0]}")`);
    for (const x of path.slice(1)) await p.click(`#layer li:has-text("${x}")`);
  },
  async pickFirstRow(p) { await p.click('#layer table tr:has(td) >> nth=0'); },
  async endMonth(p) {
    const before = await p.evaluate(() => TK.UI.state().month);
    await p.click('#status .endturn');
    // 按到可以下指令為止（略過戰報、事件、提議）
    for (let i = 0; i < 120; i++) {
      const ok = await p.evaluate((m) => TK.UI.state().month !== m, before);
      if (ok && await p.$('#cmd-win li:has-text("開墾"):not(.off)') && !(await p.$('.scene'))) return;
      await p.keyboard.press(i % 3 === 2 ? 'Escape' : 'Enter');
      await p.waitForTimeout(150);
    }
    throw new Error('結束本月後一直回不到可下指令的狀態');
  },
  sounds: (p) => p.evaluate(() => window.__sounds),
};
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
  await newGame(p, '漢');
  await shot(p, '01-開局');
  assert(!p.errors.length, p.errors.join('\n'));
  await ctx.close();
});

test('武將列傳：韓信的詳細畫面有列傳與頭像', async (b, base) => {
  const { ctx, p } = await open(b, base);
  await newGame(p, '漢');
  await openGeneral(p, '韓信');
  const text = await p.textContent('.detail .bio');
  assert(text && text.includes('淮陰') && text.includes('典故'), '列傳內容不對：' + text);
  await p.waitForTimeout(500);
  const imgs = await imagesOk(p, '.detail img.face');
  assert(imgs.length && imgs.every((x) => x.ok), '立繪沒有載入');
  await shot(p, '02-列傳');
  assert(!p.errors.length, p.errors.join('\n'));
  await ctx.close();
});

test('通用頭像：漢的劉邦用通用君主、蕭何用通用文官、樊噲用通用武將，頭像都載入成功', async (b, base) => {
  const { ctx, p } = await open(b, base);
  await newGame(p, '漢');
  await p.click('#cmd-win li:has-text("情報")');
  await p.click('#layer li:has-text("我方武將")');
  await p.waitForTimeout(800);
  const imgs = await imagesOk(p, '#layer img.face');
  const src = (n) => decodeURIComponent((imgs.find((x) => x.alt === n) || {}).src || '');
  assert(imgs.length >= 3 && imgs.every((x) => x.ok), '有頭像沒有載入：' + imgs.filter((x) => !x.ok).map((x) => x.alt).join('、'));
  for (const [n, kind] of [['劉邦', '通用君主'], ['蕭何', '通用文官'], ['樊噲', '通用武將']]) assert(src(n).includes(kind), `${n}沒有用${kind}頭像：${src(n).slice(0, 60)}`);
  assert(p.portraitRequests.every((s) => s === 200 || s === 304), '頭像下載失敗');
  await shot(p, '03-通用頭像');
  await ctx.close();
});

test('手動戰鬥：出征鄰近敵城，下令突擊，交給部將打完，出現勝敗印章', async (b, base) => {
  const { ctx, p } = await open(b, base);
  await newGame(p, '漢');
  await ui.cmd(p, '出征');
  await p.click('#layer table tr:has(td) >> nth=0');
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
  await newGame(p, '漢');
  const over = () => p.evaluate(() => {
    const w = innerWidth;
    return [...document.querySelectorAll('.win, #cmd-win, #layer > *')].filter((e) => e.offsetParent && e.getBoundingClientRect().right > w + 2).map((e) => e.className || e.id);
  });
  let o = await over();
  assert(!o.length, '主畫面超出寬度：' + o.join(', '));
  await openGeneral(p, '韓信');
  await shot(p, '06-手機列傳');
  o = await p.evaluate(() => [...document.querySelectorAll('.detail *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 2).length);
  assert(!o, `武將畫面有 ${o} 個元素超出寬度`);
  assert(!p.errors.length, p.errors.join('\n'));
  await ctx.close();
});

test('聲音：點擊前不啟動、點擊後音訊運作並播放標題音樂，選單有音效，關掉音效就不發聲', async (b, base) => {
  const { ctx, p } = await open(b, base);
  const st = () => p.evaluate(() => ({ audio: TK.Audio.info().state, music: TK.Music.current(), on: TK.Music.isOn(), muted: TK.Sound.isMuted() }));
  let s0 = await st();
  assert(s0.audio === 'none', '還沒點畫面就啟動了音訊：' + s0.audio);
  await p.mouse.click(5, 5);
  await p.waitForTimeout(600);
  s0 = await st();
  assert(s0.audio === 'running', '點擊後音訊沒有運作：' + s0.audio);
  assert(s0.music === 'title' && s0.on, '標題音樂沒有播放');
  let n = await ui.sounds(p);
  await p.keyboard.press('ArrowDown');
  await p.waitForTimeout(200);
  assert(await ui.sounds(p) > n, '移動選單沒有音效');
  // 關掉音效：選單操作不再產生音效節點（音樂另外計算，所以先關音樂）
  await p.evaluate(() => { if (TK.Music.isOn()) TK.Music.toggle(); if (!TK.Sound.isMuted()) TK.Sound.toggle(); });
  await p.waitForTimeout(300);
  n = await ui.sounds(p);
  await p.keyboard.press('ArrowDown');
  await p.waitForTimeout(200);
  assert(await ui.sounds(p) === n, '音效關掉後還在發聲');
  await p.evaluate(() => { TK.Music.toggle(); TK.Sound.toggle(); });
  // 聲音診斷的測試音
  n = await ui.sounds(p);
  await p.evaluate(() => TK.Audio.testTone());
  assert(await ui.sounds(p) > n, '測試音沒有發聲');
  // 進入遊戲後換成內政音樂
  await newGame(p, '漢');
  assert((await st()).music === 'domestic', '進入遊戲後沒有換成內政音樂：' + (await st()).music);
  assert(!p.errors.length, p.errors.join('\n'));
  await ctx.close();
});

test('內政：開墾後農業上升、金減少、該武將本月已行動', async (b, base) => {
  const { ctx, p } = await open(b, base);
  await newGame(p, '漢');
  const s0 = await ui.state(p);
  const cityId = Object.values(s0.cities).find((c) => c.owner === s0.player).id;
  await ui.cmd(p, '開墾');
  await ui.pickFirstRow(p);
  await p.waitForTimeout(400);
  const s1 = await ui.state(p);
  assert(s1.cities[cityId].farm > s0.cities[cityId].farm, `農業沒有上升（${s0.cities[cityId].farm} → ${s1.cities[cityId].farm}）`);
  assert(s1.cities[cityId].gold < s0.cities[cityId].gold, '金沒有減少');
  assert(Object.values(s1.generals).some((g) => g.acted), '沒有武將標記為已行動');
  assert(!p.errors.length, p.errors.join('\n'));
  await ctx.close();
});

test('外交提議：不用先點下方訊息，接受／拒絕視窗會直接出現，選完可以繼續下指令', async (b, base) => {
  const { ctx, p } = await open(b, base);
  await newGame(p, '漢');
  assert(await p.$('#cmd-win li:has-text("開墾"):not(.off)'), '開場訊息沒點掉時指令被鎖住');
  await p.evaluate(() => { const s = TK.UI.state(); const other = Object.keys(s.factions).find((f) => f !== s.player && s.factions[f].alive && !s.factions[f].npc); s.pending = [{ type: 'proposal', from: other, kind: 'truce' }]; });
  await p.click('#status .endturn');
  let found = false;
  for (let i = 0; i < 80 && !found; i++) {
    if (await p.$('.win.pop:has-text("派使者前來")')) { found = true; break; }
    if (await p.$('.win.battle')) await p.click('.win.battle');
    if (await p.$('.scene')) await p.click('.scene');
    await p.waitForTimeout(250);
  }
  assert(found, '外交提議的視窗沒有出現（卡住）');
  // 按 Esc 關掉提議視窗（視同拒絕）也不能卡住；同一個月可能有好幾個勢力來提議，逐一關掉
  for (let i = 0; i < 12 && await p.$('.win.pop:has-text("派使者前來")'); i++) {
    await p.keyboard.press('Escape');
    await p.waitForTimeout(400);
  }
  assert(await p.evaluate(() => !document.querySelector('#status .endturn').disabled), '關掉提議視窗之後遊戲還鎖著（不能結束本月）');
  assert(!p.errors.length, p.errors.join('\n'));
  await ctx.close();
});

test('結束本月：月份前進、自動存檔、武將行動次數重置', async (b, base) => {
  const { ctx, p } = await open(b, base);
  await newGame(p, '西楚');
  const s0 = await ui.state(p);
  await ui.endMonth(p);
  const s1 = await ui.state(p);
  assert(s1.month === s0.month + 1 || (s0.month === 12 && s1.month === 1), `月份沒有前進：${s0.month} → ${s1.month}`);
  assert(await p.evaluate(() => !!localStorage.getItem('chuhan.auto.v1')), '沒有自動存檔');
  assert(Object.values(s1.generals).every((g) => !g.acted), '新的月份武將行動沒有重置');
  await shot(p, '07-結束本月');
  assert(!p.errors.length, p.errors.join('\n'));
  await ctx.close();
});

test('存檔與讀檔：存到存檔 1，回到標題後讀回同一個進度', async (b, base) => {
  const { ctx, p } = await open(b, base);
  await newGame(p, '齊');
  await ui.endMonth(p);
  const s0 = await ui.state(p);
  await p.click('#status .tb:has-text("存檔")');
  await p.click('#layer li:has-text("存檔 1")');
  await p.waitForTimeout(300);
  await p.evaluate(() => location.reload());
  await p.waitForSelector('.title-menu li');
  await p.click('.title-menu li:has-text("讀取存檔")');
  await p.click('#layer li:has-text("存檔 1")');
  await p.waitForTimeout(500);
  const s1 = await ui.state(p);
  assert(s1 && s1.player === s0.player && s1.year === s0.year && s1.month === s0.month, '讀回的進度不同');
  assert(JSON.stringify(s1.cities) === JSON.stringify(s0.cities), '讀回的城市資料不同');
  assert(!p.errors.length, p.errors.join('\n'));
  await ctx.close();
});

test('歷史劇本：開局事件以場景演出，可以一路按完並開始下指令', async (b, base) => {
  const { ctx, p } = await open(b, base);
  await ui.setup(p, '西楚', '歷史劇本');
  let sawScene = false;
  for (let i = 0; i < 200; i++) {
    if (await p.$('.scene')) { if (!sawScene) await shot(p, '08-歷史事件'); sawScene = true; }
    if (await p.$('#cmd-win li:has-text("開墾"):not(.off)') && !(await p.$('.scene'))) break;
    await p.keyboard.press('Enter');
    await p.waitForTimeout(120);
  }
  assert(await p.$('#cmd-win li:has-text("開墾"):not(.off)'), '事件演完後無法下指令');
  assert(!p.errors.length, p.errors.join('\n'));
  await ctx.close();
  return sawScene;
});

(async () => {
  const srv = await serve();
  const base = `http://localhost:${srv.address().port}`;
  if (!fs.existsSync(path.join(repo, PAGE.replace(/^\//, ''), PAGE.endsWith('/') ? 'index.html' : ''))) {
    console.error(`找不到 ${PAGE}，請先執行 node chuhan/build.js`);
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
  console.log(`\n${tests.length - failed}/${tests.length} E2E tests passed（截圖：chuhan/test/e2e-shots/）`);
  process.exit(failed ? 1 : 0);
})();
