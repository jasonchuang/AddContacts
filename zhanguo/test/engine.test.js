// 戰國七雄：規則與劇本測試。執行：node zhanguo/test/engine.test.js
'use strict';
const assert = require('assert');
const path = require('path');
for (const f of ['tuning.js', 'data.js', 'scenarios.js', 'engine.js', 'ai.js', 'diplomacy.js', 'events.js', 'bios.js']) require(path.join(__dirname, '..', 'js', f));
const E = TK.Engine, D = TK.Diplomacy, EV = TK.Events;
let passed = 0;
function test(name, fn) { try { fn(); passed++; console.log('ok  -', name); } catch (e) { console.error('FAIL-', name); throw e; } }
const use = (id) => { TK.SCENARIO = TK.scenarioById(id); };
const jump = (s, y, m) => { s.year = y; s.month = m; };

test('劇本：四個劇本都能開局，每個勢力有君主與城，AI 跑五年不出錯', () => {
  assert.deepStrictEqual(TK.SCENARIOS.map((x) => x.id), ['-260', '-247', '-233', '-224']);
  for (const sc of TK.SCENARIOS) {
    TK.SCENARIO = sc;
    const s = E.newGame(null, 7);
    for (const f of Object.values(s.factions)) {
      assert(E.citiesOf(s, f.id).length > 0, `${sc.title} ${f.name}`);
      assert(s.generals[f.ruler].ruler);
    }
    for (let i = 0; i < 60 && !s.over; i++) E.endTurn(s);
    for (const c of Object.values(s.cities)) assert(Number.isFinite(c.troops) && c.troops >= 0);
  }
});

test('年份：西元前以「前」顯示，跨年遞減', () => {
  use('-260');
  const s = E.newGame('qin', 1);
  assert.strictEqual(E.dateStr(s), '前260年4月');
  for (let i = 0; i < 9; i++) E.monthEnd(s);
  assert.strictEqual(E.dateStr(s), '前259年1月');
});

test('白起：特技「人屠」，攻城勝率高於一般將領', () => {
  use('-260');
  let win = 0, base = 0;
  for (let i = 0; i < 40; i++) {
    for (const cmd of ['白起', '王齕']) {
      const s = E.newGame('qin', 100 + i, 'free');
      s.cities['安邑'].troops = 50000; s.cities['上黨'].troops = 30000;
      const r = E.exec(s, 'qin', { type: 'attack', city: '安邑', general: cmd, generals: [cmd], target: '上黨', troops: 35000 });
      assert(r.ok, r.msg);
      if (r.battle.result === 'win') { if (cmd === '白起') win++; else base++; }
    }
  }
  assert.strictEqual(TK.Engine.SKILLS['人屠'].atk, 1.35);
  assert(win > base, `白起 ${win}/40，王齕 ${base}/40`);
});

test('李牧：特技「北境之盾」守城加成，同樣兵力下比沒有李牧更難攻破', () => {
  use('-233');
  let held = 0, heldNo = 0;
  for (let i = 0; i < 40; i++) {
    for (const withLi of [true, false]) {
      const s = E.newGame('qin', 150 + i, 'free');
      if (!withLi) s.generals['李牧'].city = '邯鄲';
      s.cities['晉陽'].troops = 60000; s.cities['代'].troops = 30000;
      const r = E.exec(s, 'qin', { type: 'attack', city: '晉陽', general: '王賁', generals: ['王賁'], target: '代', troops: 45000 });
      assert(r.ok, r.msg);
      if (r.battle.result !== 'win') { if (withLi) held++; else heldNo++; }
    }
  }
  assert(held > heldNo, `有李牧守住 ${held}/40，沒有 ${heldNo}/40`);
});

test('長平之戰：趙由電腦控制時中反間計，以趙括代廉頗，趙軍大敗', () => {
  use('-260');
  const s = E.newGame('qin', 500);
  assert(EV.run(s).some((e) => e.id === 'shangdang'));
  jump(s, -260, 7);
  const fired = EV.run(s).map((e) => e.id);
  assert(fired.includes('huanjiang'));
  assert.strictEqual(s.generals['趙括'].status, 'dead');
  assert(s.cities['長平'].troops < 20000);
});

test('長平之戰：玩家扮演趙時可以拒絕換將，廉頗留守長平', () => {
  use('-260');
  const s = E.newGame('zhao', 501);
  EV.run(s);
  jump(s, -260, 7);
  EV.run(s);
  assert.deepStrictEqual(s.choices, ['huanjiang']);
  const c = EV.choose(s, 'huanjiang', 1);
  assert.strictEqual(c.label, '堅持用廉頗');
  assert.strictEqual(s.generals['趙括'].status, 'active');
  assert.strictEqual(s.generals['廉頗'].city, '長平');
  assert.strictEqual(s.cities['長平'].troops, 50000);
});

test('信陵君合縱：秦與各國開戰，魏與趙結盟，秦軍在河外大敗', () => {
  use('-247');
  const s = E.newGame('wei', 600);
  const a0 = s.cities['安邑'].troops;
  assert(EV.run(s).some((e) => e.id === 'hezong'));
  for (const f of ['zhao', 'wei', 'hann', 'chu', 'yan', 'qi']) assert.strictEqual(D.stateOf(s, 'qin', f), 'war', f);
  assert.strictEqual(D.stateOf(s, 'wei', 'zhao'), 'alliance');
  assert(s.cities['安邑'].troops < a0);
});

test('郭開讒言：電腦的趙殺李牧；玩家的趙可以改斬郭開', () => {
  use('-233');
  const ai = E.newGame('qin', 700);
  jump(ai, -229, 6);
  EV.run(ai);
  assert.strictEqual(ai.generals['李牧'].status, 'dead');
  const me = E.newGame('zhao', 701);
  jump(me, -229, 6);
  EV.run(me);
  assert(me.choices.includes('guokai'));
  EV.choose(me, 'guokai', 1);
  assert.strictEqual(me.generals['郭開'].status, 'dead');
  assert.strictEqual(me.generals['李牧'].status, 'active');
  assert.strictEqual(me.generals['李牧'].loyalty, 100);
});

test('三國、楚漢的歷史事件不會出現在戰國劇本', () => {
  use('-260');
  const s = E.newGame('qin', 5);
  for (let i = 0; i < 24; i++) { const f = E.endTurn(s); assert(!f.some((e) => ['coalition', 'oath', 'three_visits', 'hongmen'].includes(e.id))); }
});

test('截斷糧道：派武將燒毀相鄰敵城的軍糧', () => {
  use('-260');
  const s = E.newGame('qin', 200, 'free');
  s.cities['上黨'].food = 50000;
  const r = E.exec(s, 'qin', { type: 'raid', city: '安邑', general: '蒙驁', target: '上黨' });
  assert(r.ok, r.msg);
  assert(s.cities['上黨'].food < 50000);
});

test('封君：忠誠全滿並兼任太守', () => {
  use('-233');
  const s = E.newGame('qin', 300, 'free');
  const r = E.exec(s, 'qin', { type: 'enfeoff', city: '晉陽', target: '王翦' });
  assert(r.ok, r.msg);
  assert(r.msg.includes('晉陽君'));
  const x = s.generals['王翦'];
  assert.strictEqual(x.king, '晉陽');
  assert.strictEqual(x.loyalty, 100);
  assert.strictEqual(E.governorOf(s, s.cities['晉陽']), x);
});

test('反間計：頓弱（奇計）離間敵將的成功率高於一般文臣', () => {
  use('-233');
  let ok1 = 0, ok2 = 0;
  for (let i = 0; i < 30; i++) {
    for (const spy of ['頓弱', '姚賈']) {
      const s = E.newGame('qin', 400 + i, 'free');
      s.cities['咸陽'].gold = 5000;
      const t = s.generals['司馬尚'];
      t.loyalty = 80;
      const r = E.exec(s, 'qin', { type: 'discord', city: '咸陽', general: spy, target: '司馬尚' });
      assert(r.ok, r.msg);
      if (t.loyalty < 80) { if (spy === '頓弱') ok1++; else ok2++; }
    }
  }
  assert(ok1 > ok2, `頓弱 ${ok1}/30，姚賈 ${ok2}/30`);
});

test('難易度：容易時玩家收入較多、電腦較少；困難時電腦收入較高', () => {
  use('-260');
  const inc = (d) => {
    const s = E.newGame('qin', 90, 'free', d);
    const p0 = s.cities['咸陽'].gold, a0 = s.cities['臨淄'].gold;
    E.monthEnd(s);
    return { p: s.cities['咸陽'].gold - p0, a: s.cities['臨淄'].gold - a0 };
  };
  const e = inc('easy'), n = inc('normal'), h = inc('hard');
  assert(e.p > n.p && n.p === h.p, `玩家 ${e.p}/${n.p}/${h.p}`);
  assert(e.a < n.a && n.a < h.a, `電腦 ${e.a}/${n.a}/${h.a}`);
});

test('列傳：每一篇都對應到劇本中的武將，且欄位完整', () => {
  const names = new Set();
  for (const sc of TK.SCENARIOS) for (const g of sc.generals || []) names.add(g.name);
  for (const [n, b] of Object.entries(TK.BIOS)) {
    assert(names.has(n), `列傳 ${n} 不在任何劇本`);
    assert(b.bio && b.bio.length > 20 && b.life !== undefined && b.home, `列傳 ${n} 欄位不完整`);
  }
});

test('SPEC.md 的數值表與 tuning.js 一致，且每個數值都有說明', () => {
  const r = require('../tools/spec_tables.js').run(true);
  assert(!r.missing.length, `沒有說明的數值：${r.missing.join('、')}`);
  assert(!r.changed, 'SPEC.md 數值表過期，請執行 node sangoku/tools/spec_tables.js');
});

console.log(`\n${passed} tests passed`);
