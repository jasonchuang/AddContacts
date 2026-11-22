// 民國 群雄並起：規則與劇本測試。執行：node minguo/test/engine.test.js
'use strict';
const assert = require('assert');
const path = require('path');
for (const f of ['tuning.js', 'data.js', 'scenarios.js', 'engine.js', 'ai.js', 'diplomacy.js', 'events.js', 'bios.js', 'mod.js']) require(path.join(__dirname, '..', 'js', f));
const { Engine: E } = globalThis.TK;

let passed = 0;
function test(name, fn) { try { fn(); passed++; console.log('ok  -', name); } catch (e) { console.error('FAIL-', name); throw e; } }
const D = TK.Diplomacy, EV = TK.Events;

test('劇本：六個劇本都能開局，每個勢力有首領與城，AI 跑五年不出錯', () => {
  assert.deepStrictEqual(TK.SCENARIOS.map((x) => x.id), ['1915', '1917', '1920', '1924', '1926', '1928']);
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

test('兵種：五種兵，陸軍相剋為步剋砲、砲剋坦克、坦克剋步；空軍海軍不參加相剋', () => {
  assert.deepStrictEqual(E.UNIT_KEYS.map((k) => E.UNITS[k].name), ['步兵', '坦克', '砲兵', '空軍', '海軍']);
  const C = TK.TUNING.units.counter;
  assert.strictEqual(E.matchup('inf', 'art'), C);
  assert.strictEqual(E.matchup('art', 'tank'), C);
  assert.strictEqual(E.matchup('tank', 'inf'), C);
  assert(E.matchup('inf', 'tank') < 1);
  for (const k of E.UNIT_KEYS) { assert.strictEqual(E.matchup('air', k), 1); assert.strictEqual(E.matchup(k, 'navy'), 1); }
});

test('徵兵：坦克要兵工廠、空軍要機場、海軍要港口', () => {
  TK.SCENARIO = TK.scenarioById('1917');
  const s = E.newGame('zhi', 3);
  const nj = s.cities['南京'], bd = s.cities['保定'];
  nj.gold = bd.gold = 9000;
  const g1 = s.generals['李純'], g2 = s.generals['王承斌'];
  // 南京有兵工廠、機場、港口；保定都沒有
  for (const k of ['tank', 'air', 'navy']) {
    assert(E.maxDraft(s, nj, g1, k) > 0, '南京應可徵' + k);
    assert.strictEqual(E.maxDraft(s, bd, g2, k), 0, '保定不應可徵' + k);
  }
  const r = E.exec(s, 'zhi', { type: 'draft', city: '保定', general: '王承斌', unit: 'tank', amount: 1000 });
  assert(!r.ok && /兵工廠/.test(r.msg), JSON.stringify(r));
  const r2 = E.exec(s, 'zhi', { type: 'draft', city: '南京', general: '李純', unit: 'tank', amount: 1000 });
  assert(r2.ok, JSON.stringify(r2));
  assert(s.cities['南京'].mix.tank >= 1000);
});

test('海軍在港口城才有用、空軍冬季減半', () => {
  TK.SCENARIO = TK.scenarioById('1917');
  const s = E.newGame('zhi', 3);
  const gens = [s.generals['李純']];
  const atk = (units) => ({ faction: 'zhi', from: '南京', generals: gens, troops: E.unitsTotal(units), train: 50, units });
  const navy = Object.assign(E.emptyUnits(), { navy: 10000 });
  const port = E.battleStart(s, atk(navy), '上海');
  const inland = E.battleStart(s, atk(navy), '合肥');
  assert(port.bonusA > inland.bonusA * 3, `港口 ${port.bonusA} 內陸 ${inland.bonusA}`);
  const air = Object.assign(E.emptyUnits(), { air: 10000 });
  s.month = 6; const summer = E.battleStart(s, atk(air), '合肥').bonusA;
  s.month = 1; const winter = E.battleStart(s, atk(air), '合肥').bonusA;
  assert(winter < summer * 0.6, `夏 ${summer} 冬 ${winter}`);
});

test('護國戰爭：洪憲帝制、雲南起義、廣西響應，袁世凱病逝後北洋分裂為皖系與直系', () => {
  TK.SCENARIO = TK.scenarioById('1915');
  const s = E.newGame('dian', 5);
  for (const [y, m] of [[1915, 12], [1916, 1], [1916, 3], [1916, 6], [1916, 11]]) { s.year = y; s.month = m; EV.run(s); }
  assert.strictEqual(s.generals['袁世凱'].status, 'dead');
  assert.strictEqual(s.factions.duan.ruler, '段祺瑞');
  assert.strictEqual(s.factions.duan.name, '皖系');
  assert.strictEqual(s.factions.zhi.name, '直系');
  assert.strictEqual(s.generals['曹錕'].faction, 'zhi');
  assert.strictEqual(s.generals['蔡鍔'].status, 'dead');
  assert.strictEqual(D.stateOf(s, 'gui', 'dian'), 'alliance');
});

test('地方事件：五四運動只在 1919 年 5～6 月發生，晚開局的劇本不會補發', () => {
  TK.SCENARIO = TK.scenarioById('1917');
  const s = E.newGame('duan', 5);
  s.year = 1919; s.month = 5;
  const o = s.cities['北京'].order;
  assert(EV.run(s).some((e) => e.id === 'may4'));
  assert(s.cities['北京'].order < o);
  TK.SCENARIO = TK.scenarioById('1920');
  const s2 = E.newGame('duan', 5);
  assert(!EV.run(s2).some((e) => e.id === 'may4'));
  assert(TK.SCENARIOS.every((sc) => sc.events.some((e) => e.id === 'wushe')));
});

test('自訂劇本：匯出再匯入可以開局；格式錯誤會用中文說明；範例劇本可以玩', () => {
  const M = TK.Mod;
  const d = JSON.parse(JSON.stringify(M.exportScenario(TK.scenarioById('1924'))));
  d.id = 'test'; d.title = '測試劇本';
  d.generals.find((g) => g.name === '吳佩孚').war = 99;
  const sc = M.register(M.importScenario(d));
  TK.SCENARIO = TK.scenarioById('mod:test');
  assert.strictEqual(TK.SCENARIO, sc);
  const s = E.newGame('zhi', 3);
  assert.strictEqual(s.generals['吳佩孚'].war, 99);
  for (let i = 0; i < 24 && !s.over; i++) E.endTurn(s);
  const bad = JSON.parse(JSON.stringify(d));
  bad.generals[0].city = '火星';
  bad.factions[0].ruler = '無名氏';
  assert.throws(() => M.importScenario(bad), (e) => /火星/.test(e.message) && /無名氏/.test(e.message));
  const sample = M.register(M.importScenario(M.sample()));
  TK.SCENARIO = sample;
  const s2 = E.newGame('dian', 4);
  assert.strictEqual(s2.generals['蔡鍔'].faction, 'dian');
  for (let i = 0; i < 24 && !s2.over; i++) E.endTurn(s2);
  M.remove('mod:test'); M.remove(sample.id);
  assert(!TK.SCENARIOS.some((x) => x.mod));
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
