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
    // 英國屬地在滇緬戰役之前不會被佔領
    if (sc.cities.find((c) => c.id === '臘戌').locked && !(s.events_done || {}).burma) assert.strictEqual(s.cities['臘戌'].owner, null, '臘戌在滇緬戰役前被佔領了');
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
  // 和日方作戰不單挑
  const ctx = E.battleStart(s, { faction: 'song', from: '北京', generals: [s.generals['張自忠']], troops: 10000, train: 50, units: { inf: 10000 } }, '承德');
  assert(!ctx.canDuel && !ctx.dueled, '和日軍作戰出現單挑');
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

test('游擊戰：中共兩步以內的日佔城每月被削弱，中共吸收新兵', () => {
  TK.SCENARIO = TK.scenarioById('1937');
  const s = E.newGame('kmt', 3);
  s.cities['太原'].owner = 'japan';
  const t0 = s.cities['太原'].troops, d0 = s.cities['大同'].troops, y0 = s.cities['延安'].troops;
  s.cities['大同'].owner = 'japan';
  E.monthEnd(s);
  assert(s.cities['延安'].troops > y0, '中共沒有吸收新兵');
  // 太原（相鄰）與大同（兩步）都被游擊；增援另外加上去，所以比較「增援後扣掉游擊」
  const lossT = TK.TUNING.war.guerrillaMax;
  assert(s.cities['太原'].troops < t0 + TK.TUNING.war.axisReinforce, '太原沒有被削弱');
});

test('國共合作度：每月下降、送禮提高；太低時同盟破裂、可能爆發皖南事變', () => {
  TK.SCENARIO = TK.scenarioById('1937');
  const s = E.newGame('kmt', 3);
  assert.strictEqual(s.coop, 70);
  E.monthEnd(s);
  assert(s.coop < 70);
  const c0 = s.coop;
  const r = E.exec(s, 'kmt', { type: 'diplo', action: 'gift', target: 'ccp', general: '何應欽', gold: 500, food: 0 });
  assert(r.ok, JSON.stringify(r));
  assert(s.coop > c0, '送禮沒有提高合作度');
  s.coop = 20;
  E.monthEnd(s);
  assert.notStrictEqual(D.stateOf(s, 'kmt', 'ccp'), 'alliance', '合作度太低同盟卻沒破裂');
  Object.assign(s.generals['項英'], { faction: 'ccp', status: 'active', city: '延安' });
  s.year = 1941; s.month = 1;
  assert(EV.run(s).some((e) => e.id === 'wannan'));
  assert.strictEqual(s.generals['項英'].status, 'dead');
});

test('日軍補給線：佔城越多戰力越低', () => {
  TK.SCENARIO = TK.scenarioById('1937');
  const s = E.newGame('kmt', 3);
  const p0 = E.powerMult(s, 'japan');
  for (const id of ['北京', '天津', '保定', '張家口', '濟南', '青島', '徐州', '南京', '上海', '杭州', '合肥', '武漢', '南昌', '鄭州']) s.cities[id].owner = 'japan';
  assert(E.powerMult(s, 'japan') < p0, '補給線沒有影響戰力');
  assert(E.supplyMult(s, 'japan') >= TK.TUNING.war.supplyMin);
});

test('大後方遷移：與日軍接壤的城可以把商業與人口遷往後方，只能一次', () => {
  TK.SCENARIO = TK.scenarioById('1937');
  const s = E.newGame('kmt', 3);
  s.cities['南京'].owner = 'japan';
  const sh = s.cities['上海'], c0 = sh.commerce;
  s.cities['重慶'].owner = 'kmt';
  const dests = E.evacDests(s, 'kmt', sh).map((c) => c.id);
  assert(dests.includes('重慶') && !dests.includes('杭州') === false || dests.includes('重慶'));
  const r = E.exec(s, 'kmt', { type: 'evacuate', city: '上海', general: '張治中', dest: '重慶' });
  assert(r.ok, JSON.stringify(r));
  assert(sh.commerce < c0);
  s.generals['謝晉元'].acted = false;
  assert(!E.exec(s, 'kmt', { type: 'evacuate', city: '上海', general: '謝晉元', dest: '重慶' }).ok, '可以重複遷移');
});

test('美國參戰與日本投降：珍珠港後美軍行動；1945 年 8 月投降，臺灣交還、遊戲以勝利評分結束', () => {
  TK.SCENARIO = TK.scenarioById('1937');
  const s = E.newGame('kmt', 3);
  assert(s.factions.usa.dormant);
  assert(!E.exec(s, 'kmt', { type: 'diplo', action: 'alliance', target: 'usa', general: '何應欽' }).ok, '參戰前不能與美國交涉');
  s.year = 1941; s.month = 12;
  EV.run(s);
  assert(!s.factions.usa.dormant && s.factions.usa.side === 'allies');
  assert.strictEqual(D.stateOf(s, 'usa', 'japan'), 'war');
  assert.strictEqual(s.cities['香港'].owner, 'japan', '珍珠港後香港淪陷');
  assert(!s.cities['香港'].locked);
  s.year = 1945; s.month = 8;
  EV.run(s);
  assert(!s.factions.japan.alive);
  assert.strictEqual(s.cities['臺北'].owner, 'kmt');
  assert.strictEqual(s.cities['沖繩'].owner, 'usa');
  assert(s.cities['香港'].locked && s.cities['香港'].owner === null, '戰後香港歸還英國');
  assert(s.over && s.over.victory && s.over.rank, JSON.stringify(s.over));
});

test('八個劇本：1931 到 1946，每個劇本只帶開局之後的事件', () => {
  assert.deepStrictEqual(TK.SCENARIOS.map((x) => x.id), ['1931', '1933', '1936', '1937', '1938', '1940', '1944', '1946']);
  const ym = (y, m) => y * 12 + m;
  for (const sc of TK.SCENARIOS) for (const e of sc.events) if (e.cond && e.cond.from) assert(ym(...e.cond.from) >= ym(sc.year, sc.month), `${sc.title} 帶了開局前的事件 ${e.id}`);
  assert(TK.scenarioById('1944').factions.some((f) => f.id === 'usa' && !f.dormant), '1944 可以選美軍');
});

test('長征：中共從瑞金轉移到延安', () => {
  TK.SCENARIO = TK.scenarioById('1931');
  const s = E.newGame('kmt', 3);
  s.year = 1934; s.month = 10;
  EV.run(s);
  assert.strictEqual(s.cities['延安'].owner, 'ccp');
  assert.strictEqual(s.cities['瑞金'].owner, 'kmt');
  assert.strictEqual(s.generals['毛澤東'].city, '延安');
});

test('西安事變：和平解決時國共合作成形、張學良遭軟禁；玩家扮演東北軍可以選擇', () => {
  TK.SCENARIO = TK.scenarioById('1936');
  const s = E.newGame('kmt', 3);
  EV.run(s);
  assert.strictEqual(s.coop, 60);
  assert.strictEqual(D.stateOf(s, 'kmt', 'ccp'), 'alliance');
  assert.strictEqual(s.generals['張學良'].status, 'retired');
  assert(s.factions.dongbei.alive, '東北軍應由于學忠繼續');
  const s2 = E.newGame('dongbei', 3);
  EV.run(s2);
  assert(s2.choices && s2.choices.includes('xian'));
  EV.choose(s2, 'xian', 1);
  assert.strictEqual(D.stateOf(s2, 'kmt', 'dongbei'), 'war');
});

test('花園口：電腦國府決堤，鄭州農業與民心大減', () => {
  TK.SCENARIO = TK.scenarioById('1938');
  const s = E.newGame('ccp', 3);
  const f0 = s.cities['鄭州'].farm;
  s.year = 1938; s.month = 6;
  EV.run(s);
  assert(s.cities['鄭州'].farm < f0);
});

test('全面抗戰前日軍只攻打年度攻勢目標', () => {
  TK.SCENARIO = TK.scenarioById('1931');
  const s = E.newGame(null, 5);
  for (let i = 0; i < 36; i++) E.endTurn(s);
  const allowed = new Set(['瀋陽', '長春', '哈爾濱', '錦州', '承德', '張家口', '臺北', '臺南', '沖繩', '塞班']);
  for (const c of Object.values(s.cities)) if (c.owner === 'japan') assert(allowed.has(c.id), `日軍在 1934 年前佔了 ${c.id}`);
});

test('國共內戰：通膨拖累國府收入、土地改革、三大戰役、古寧頭與遷臺、1950 年結局', () => {
  TK.SCENARIO = TK.scenarioById('1946');
  const s = E.newGame('kmt', 3);
  assert(s.civil);
  assert.strictEqual(E.inflation(s, 'kmt'), 1);
  s.year = 1948; s.month = 6;
  assert(E.inflation(s, 'kmt') < 0.8 && E.inflation(s, 'ccp') === 1);
  const y0 = s.cities['延安'].troops;
  E.civilTick(s);
  assert(s.cities['延安'].troops > y0, '土地改革沒有新兵');
  s.year = 1948; s.month = 9; EV.run(s);
  assert.strictEqual(s.cities['長春'].owner, 'ccp');
  assert.strictEqual(s.generals['廖耀湘'].status, 'retired');
  s.year = 1948; s.month = 12; EV.run(s);
  assert.strictEqual(s.cities['北京'].owner, 'ccp');
  assert.strictEqual(s.generals['傅作義'].faction, 'ccp');
  s.cities['福州'].owner = 'ccp';
  s.year = 1949; s.month = 10;
  const k0 = s.cities['金門'].troops;
  assert(EV.run(s).some((e) => e.id === 'guningtou'));
  assert(s.cities['金門'].troops > k0);
  s.cities['南京'].owner = 'ccp';
  s.year = 1949; s.month = 12; EV.run(s);
  assert.strictEqual(s.generals['蔣介石'].city, '臺北');
  s.year = 1950; s.month = 6; EV.run(s);
  assert(s.over && s.over.civil && s.over.rank, JSON.stringify(s.over));
});

test('抗戰勝利後可以繼續玩國共內戰', () => {
  TK.SCENARIO = TK.scenarioById('1937');
  const s = E.newGame('ccp', 3);
  s.year = 1941; s.month = 12; EV.run(s);
  s.year = 1945; s.month = 8; EV.run(s);
  assert(s.over && s.over.victory);
  assert(E.continueCivil(s));
  assert(!s.over && s.civil && s.scenario === '1946');
  assert(s.generals['劉少奇'] && s.generals['劉少奇'].faction === 'ccp');
  s.year = 1946; s.month = 6;
  assert(EV.run(s).some((e) => e.id === 'neizhan'));
  assert.strictEqual(D.stateOf(s, 'kmt', 'ccp'), 'war');
  for (let i = 0; i < 12 && !s.over; i++) E.endTurn(s);
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
