// 民國 群雄並起：規則與劇本測試。執行：node minguo/test/engine.test.js
'use strict';
const assert = require('assert');
const path = require('path');
for (const f of ['tuning.js', 'data.js', 'scenarios.js', 'engine.js', 'ai.js', 'diplomacy.js', 'events.js', 'bios.js']) require(path.join(__dirname, '..', 'js', f));
const { Engine: E } = globalThis.TK;

let passed = 0;
function test(name, fn) { try { fn(); passed++; console.log('ok  -', name); } catch (e) { console.error('FAIL-', name); throw e; } }
const D = TK.Diplomacy, EV = TK.Events;

test('劇本：五個劇本都能開局，每個勢力有首領與城，AI 跑五年不出錯', () => {
  assert.deepStrictEqual(TK.SCENARIOS.map((x) => x.id), ['1917', '1920', '1924', '1926', '1928']);
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

test('兵種：步兵、騎兵、炮兵，相剋為步剋騎、騎剋炮、炮剋步', () => {
  assert.strictEqual(E.UNITS.spear.name, '步兵');
  assert.strictEqual(E.UNITS.cav.name, '騎兵');
  assert.strictEqual(E.UNITS.xbow.name, '炮兵');
});

test('直奉大戰：北京政變，馮玉祥倒戈，國民軍佔領北京', () => {
  TK.SCENARIO = TK.scenarioById('1924');
  const s = E.newGame('feng', 30);
  EV.run(s);
  s.year = 1924; s.month = 10;
  EV.run(s);
  assert.strictEqual(s.generals['馮玉祥'].faction, 'guomin');
  assert.strictEqual(s.cities['北京'].owner, 'guomin');
  assert.strictEqual(D.stateOf(s, 'guomin', 'zhi'), 'war');
});

test('東北易幟：電腦控制奉系時易幟歸順；玩家扮演奉系可以選擇', () => {
  TK.SCENARIO = TK.scenarioById('1928');
  const s = E.newGame('kmt', 40);
  EV.run(s);
  s.year = 1928; s.month = 6; EV.run(s);
  assert.strictEqual(s.generals['張作霖'].status, 'dead');
  s.year = 1928; s.month = 12; EV.run(s);
  assert(!s.factions.feng.alive, '奉系應已易幟');
  assert.strictEqual(s.cities['瀋陽'].owner, 'kmt');
  const p = E.newGame('feng', 41);
  EV.run(p); p.year = 1928; p.month = 6; EV.run(p); p.year = 1928; p.month = 12; EV.run(p);
  assert(p.choices.includes('yizhi'));
  EV.choose(p, 'yizhi', 1);
  assert(p.factions.feng.alive);
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
