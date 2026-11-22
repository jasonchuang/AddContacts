// 烽火 十四年：規則與劇本測試。執行：node kangzhan/test/engine.test.js
'use strict';
const assert = require('assert');
const path = require('path');
for (const f of ['tuning.js', 'data.js', 'scenarios.js', 'engine.js', 'ai.js', 'diplomacy.js', 'events.js', 'bios.js', 'mod.js']) require(path.join(__dirname, '..', 'js', f));
const { Engine: E } = globalThis.TK;

let passed = 0;
function test(name, fn) { try { fn(); passed++; console.log('ok  -', name); } catch (e) { console.error('FAIL-', name); throw e; } }
const D = TK.Diplomacy, EV = TK.Events;

test('劇本：每個劇本都能開局，每個勢力有首領與城，AI 跑五年不出錯', () => {
  for (const sc of TK.SCENARIOS) {
    TK.SCENARIO = sc;
    const s = E.newGame(null, 7);
    for (const f of Object.values(s.factions)) {
      assert(E.citiesOf(s, f.id).length > 0, `${sc.title} ${f.name}`);
      assert(s.generals[f.ruler].ruler);
    }
    for (let i = 0; i < 60 && !s.over; i++) E.endTurn(s);
    for (const c of Object.values(s.cities)) assert(Number.isFinite(c.troops) && c.troops >= 0);
    // 英國屬地不會被佔領
    for (const id of ['臘戌', '列多']) assert.strictEqual(s.cities[id].owner, null, `${id} 被佔領了`);
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
  TK.SCENARIO = TK.scenarioById('1937');
  const s = E.newGame('kmt', 3);
  const nj = s.cities['南京'], bd = s.cities['洛陽'];
  nj.gold = bd.gold = 9000;
  const g1 = s.generals['何應欽'], g2 = s.generals['孫蔚如'];
  // 南京有兵工廠、機場、港口；洛陽都沒有
  for (const k of ['tank', 'air', 'navy']) {
    assert(E.maxDraft(s, nj, g1, k) > 0, '南京應可徵' + k);
    assert.strictEqual(E.maxDraft(s, bd, g2, k), 0, '洛陽不應可徵' + k);
  }
  const r = E.exec(s, 'kmt', { type: 'draft', city: '洛陽', general: '孫蔚如', unit: 'tank', amount: 1000 });
  assert(!r.ok && /兵工廠/.test(r.msg), JSON.stringify(r));
  const r2 = E.exec(s, 'kmt', { type: 'draft', city: '南京', general: '何應欽', unit: 'tank', amount: 1000 });
  assert(r2.ok, JSON.stringify(r2));
  assert(s.cities['南京'].mix.tank >= 1000);
});

test('海軍在港口城才有用、空軍冬季減半', () => {
  TK.SCENARIO = TK.scenarioById('1937');
  const s = E.newGame('kmt', 3);
  const gens = [s.generals['何應欽']];
  const atk = (units) => ({ faction: 'kmt', from: '南京', generals: gens, troops: E.unitsTotal(units), train: 50, units });
  const navy = Object.assign(E.emptyUnits(), { navy: 10000 });
  const port = E.battleStart(s, atk(navy), '上海');
  const inland = E.battleStart(s, atk(navy), '合肥');
  assert(port.bonusA > inland.bonusA * 3, `港口 ${port.bonusA} 內陸 ${inland.bonusA}`);
  const air = Object.assign(E.emptyUnits(), { air: 10000 });
  s.month = 6; const summer = E.battleStart(s, atk(air), '合肥').bonusA;
  s.month = 1; const winter = E.battleStart(s, atk(air), '合肥').bonusA;
  assert(winter < summer * 0.6, `夏 ${summer} 冬 ${winter}`);
});

test('日方：電腦專用、不能外交；印章為「日」；裝備優勢', () => {
  TK.SCENARIO = TK.scenarioById('1937');
  const s = E.newGame('kmt', 3);
  assert(s.factions.japan.npc && s.factions.japan.side === 'axis');
  const r = E.exec(s, 'kmt', { type: 'diplo', action: 'truce', target: 'japan', general: '何應欽' });
  assert(!r.ok && /敵我/.test(r.msg), JSON.stringify(r));
  assert.strictEqual(D.chance(s, 'kmt', 'japan', 'alliance', s.generals['何應欽']), 0);
  require('../js/mapview.js');
  assert.strictEqual(TK.surname('關東軍司令官'), '日');
  assert(E.powerMult(s, 'japan') > E.powerMult(s, 'ccp'));
});

test('進攻限制：英國屬地不能進攻；渡海要帶足海軍', () => {
  TK.SCENARIO = TK.scenarioById('1937');
  const s = E.newGame('dian', 3);
  const km = s.cities['昆明'];
  const r = E.exec(s, 'dian', { type: 'attack', city: '昆明', general: '龍雲', target: '臘戌', troops: 5000 });
  assert(!r.ok && /戰爭範圍/.test(r.msg), JSON.stringify(r));
  const s2 = E.newGame('kmt', 3);
  const fz = s2.cities['福州'];
  fz.mix = Object.assign(E.emptyUnits(), { inf: 20000 }); fz.troops = 20000;
  s2.generals['蔣鼎文'].city = '福州';
  const r2 = E.exec(s2, 'kmt', { type: 'attack', city: '福州', general: '蔣鼎文', target: '臺北', units: { inf: 10000 } });
  assert(!r2.ok && /海軍/.test(r2.msg), JSON.stringify(r2));
  fz.mix.navy = 5000; fz.troops = 25000;
  const r3 = E.exec(s2, 'kmt', { type: 'attack', city: '福州', general: '蔣鼎文', target: '臺北', units: { inf: 8000, navy: 4000 } });
  assert(r3.ok, JSON.stringify(r3));
});

test('自訂劇本：匯出再匯入可以開局；格式錯誤會用中文說明；範例劇本可以玩', () => {
  const M = TK.Mod;
  const d = JSON.parse(JSON.stringify(M.exportScenario(TK.scenarioById('1937'))));
  d.id = 'test'; d.title = '測試劇本';
  d.generals.find((g) => g.name === '薛岳').war = 99;
  const sc = M.register(M.importScenario(d));
  TK.SCENARIO = TK.scenarioById('mod:test');
  assert.strictEqual(TK.SCENARIO, sc);
  const s = E.newGame('kmt', 3);
  assert.strictEqual(s.generals['薛岳'].war, 99);
  for (let i = 0; i < 24 && !s.over; i++) E.endTurn(s);
  const bad = JSON.parse(JSON.stringify(d));
  bad.generals[0].city = '火星';
  bad.factions[0].ruler = '無名氏';
  assert.throws(() => M.importScenario(bad), (e) => /火星/.test(e.message) && /無名氏/.test(e.message));
  const sample = M.register(M.importScenario(M.sample()));
  TK.SCENARIO = sample;
  const s2 = E.newGame('song', 4);
  assert.strictEqual(s2.cities['北京'].troops, 60000);
  for (let i = 0; i < 24 && !s2.over; i++) E.endTurn(s2);
  M.remove('mod:test'); M.remove(sample.id);
  assert(!TK.SCENARIOS.some((x) => x.mod));
});

test('列傳：每一篇都對應到劇本中的武將，且欄位完整', () => {
  const names = new Set();
  for (const sc of TK.SCENARIOS) for (const g of sc.generals || []) names.add(g.name);
  for (const [n, b] of Object.entries(TK.BIOS)) {
    assert(TK.WORLD.STATS[n], `列傳 ${n} 沒有能力值`);
    assert(b.bio && b.bio.length > 20 && b.life !== undefined && b.home, `列傳 ${n} 欄位不完整`);
  }
});

test('SPEC.md 的數值表與 tuning.js 一致，且每個數值都有說明', () => {
  const r = require('../tools/spec_tables.js').run(true);
  assert(!r.missing.length, `沒有說明的數值：${r.missing.join('、')}`);
  assert(!r.changed, 'SPEC.md 數值表過期，請執行 node sangoku/tools/spec_tables.js');
});

console.log(`\n${passed} tests passed`);
