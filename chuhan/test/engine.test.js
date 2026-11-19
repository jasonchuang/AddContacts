// 楚漢相爭：規則與劇本測試。執行：node chuhan/test/engine.test.js
'use strict';
const assert = require('assert');
const path = require('path');
global.TK = {};
for (const f of ['data.js', 'scenarios.js', 'engine.js', 'ai.js', 'diplomacy.js', 'events.js']) require(path.join(__dirname, '..', 'js', f));
const E = TK.Engine, D = TK.Diplomacy, EV = TK.Events;
let passed = 0;
function test(name, fn) { try { fn(); passed++; console.log('ok  -', name); } catch (e) { console.error('FAIL-', name); throw e; } }
const use = (id) => { TK.SCENARIO = TK.scenarioById(id); };
const jump = (s, y, m) => { s.year = y; s.month = m; };

test('劇本：兩個劇本都能開局，每個勢力有君主與城，AI 跑五年不出錯', () => {
  assert.deepStrictEqual(TK.SCENARIOS.map((x) => x.id), ['-206', '-205']);
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
  use('-206');
  const s = E.newGame('han', 1);
  assert.strictEqual(E.dateStr(s), '前206年4月');
  for (let i = 0; i < 9; i++) E.monthEnd(s);
  assert.strictEqual(E.dateStr(s), '前205年1月');
});

test('韓信：能力與特技「兵仙」，兵力劣勢時觸發背水一戰', () => {
  use('-205');
  const s = E.newGame('han', 2);
  const x = s.generals['韓信'];
  assert.strictEqual(x.lead, 100);
  assert.strictEqual(x.skill, '兵仙');
  s.cities['櫟陽'].troops = 40000;
  s.cities['安邑'].troops = 45000;
  const r = E.exec(s, 'han', { type: 'attack', city: '櫟陽', general: '韓信', generals: ['韓信', '曹參', '灌嬰'], target: '安邑', troops: 30000 });
  assert(r.ok);
  assert(r.battle.lines.some((l) => l.includes('背水一戰')));
});

test('韓信的勝率明顯高於一般將領', () => {
  use('-205');
  let win = 0, base = 0;
  for (let i = 0; i < 40; i++) {
    for (const [cmd, gens] of [['韓信', ['韓信']], ['盧綰', ['盧綰']]]) {
      const s = E.newGame('han', 100 + i);
      const home = s.cities['櫟陽'];
      s.generals[cmd].city = '櫟陽';
      home.troops = 40000; s.cities['安邑'].troops = 30000;
      const r = E.exec(s, 'han', { type: 'attack', city: '櫟陽', general: cmd, generals: gens, target: '安邑', troops: 30000 });
      if (r.battle.result === 'win') { if (cmd === '韓信') win++; else base++; }
    }
  }
  assert(win > base + 10, `韓信 ${win}/40，盧綰 ${base}/40`);
});

test('韓信北伐：木罌渡河 → 背水一戰 → 廣武君 → 燕國歸降 → 濰水之戰', () => {
  use('-205');
  const s = E.newGame('han', 3);
  jump(s, -205, 9);
  assert(EV.run(s).some((e) => e.id === 'mufou'));
  s.cities['安邑'].owner = 'han'; s.cities['晉陽'].owner = 'han';
  for (const g of Object.values(s.generals)) if (g.faction === 'wei' || g.faction === 'dai') { g.status = 'free'; g.faction = null; }
  s.factions.wei.alive = false; s.factions.dai.alive = false;
  jump(s, -204, 10);
  assert(EV.run(s).some((e) => e.id === 'beishui'));
  assert.strictEqual(s.generals['陳餘'].status, 'dead');
  s.cities['邯鄲'].owner = 'han';
  jump(s, -204, 12);
  const ids = EV.run(s).map((e) => e.id);
  assert(ids.includes('guangwu') && ids.includes('yan_surrender'), ids.join(','));
  assert.strictEqual(s.generals['李左車'].faction, 'han');
  assert(!s.factions.yan.alive);
  assert.strictEqual(s.cities['薊'].owner, 'han');
  s.cities['鉅鹿'].owner = 'han';
  jump(s, -203, 10);
  assert(EV.run(s).some((e) => e.id === 'weishui'));
  assert.strictEqual(s.generals['龍且'].status, 'dead');
});

test('漢王之國：鴻門宴、拜將開場，八月暗渡陳倉', () => {
  use('-206');
  const s = E.newGame('han', 4);
  const ids = EV.run(s).map((e) => e.id);
  assert(ids.includes('hongmen') && ids.includes('baijiang'));
  jump(s, -206, 8);
  const before = s.cities['廢丘'].troops;
  assert(EV.run(s).some((e) => e.id === 'chencang'));
  assert(s.cities['廢丘'].troops < before);
  assert.strictEqual(D.stateOf(s, 'han', 'yong'), 'war');
});

test('三國的歷史事件不會出現在楚漢劇本', () => {
  use('-206');
  const s = E.newGame('han', 5);
  for (let i = 0; i < 24; i++) { const f = E.endTurn(s); assert(!f.some((e) => ['coalition', 'oath', 'three_visits'].includes(e.id))); }
});

console.log(`\n${passed} tests passed`);
