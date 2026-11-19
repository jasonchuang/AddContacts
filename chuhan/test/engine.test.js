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
  assert.deepStrictEqual(TK.SCENARIOS.map((x) => x.id), ['-206', '-205', '-202']);
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

test('截斷糧道：燒掉敵城軍糧；彭越（游擊）燒得更多、更不容易被抓', () => {
  use('-205');
  let burnP = 0, burnX = 0, caughtP = 0, caughtX = 0;
  for (let i = 0; i < 40; i++) {
    for (const who of ['彭越', '盧綰']) {
      const s = E.newGame('han', 200 + i);
      const g = s.generals[who];
      Object.assign(g, { faction: 'han', status: 'active', city: '滎陽', hidden: false, acted: false });
      s.cities['定陶'].food = 50000;
      const r = E.exec(s, 'han', { type: 'raid', city: '滎陽', general: who, target: '定陶' });
      assert(r.ok, r.msg);
      const burned = 50000 - s.cities['定陶'].food;
      if (who === '彭越') { burnP += burned; if (g.status === 'prisoner') caughtP++; } else { burnX += burned; if (g.status === 'prisoner') caughtX++; }
    }
  }
  assert(burnP > burnX * 1.3, `彭越燒 ${burnP}，盧綰燒 ${burnX}`);
  assert(caughtP < caughtX, `被擒 彭越 ${caughtP}／盧綰 ${caughtX}`);
});

test('封王：忠誠全滿並兼任太守；野心大的王忠誠會下降，太低時可能自立', () => {
  use('-205');
  const s = E.newGame('han', 300);
  const r = E.exec(s, 'han', { type: 'enfeoff', city: '櫟陽', target: '韓信' });
  assert(r.ok, r.msg);
  const x = s.generals['韓信'];
  assert.strictEqual(x.king, '櫟陽');
  assert.strictEqual(x.loyalty, 100);
  assert.strictEqual(E.governorOf(s, s.cities['櫟陽']), x);
  assert(!E.exec(s, 'han', { type: 'enfeoff', city: '櫟陽', target: '曹參' }).ok, '一城只能封一王');
  E.monthEnd(s);
  assert.strictEqual(x.loyalty, 99, '韓信野心大，忠誠每月 -1');
  x.loyalty = 10;
  for (let i = 0; i < 24 && x.faction === 'han'; i++) E.monthEnd(s);
  assert.notStrictEqual(x.faction, 'han', '忠誠過低應會自立');
  assert(x.ruler && s.cities['櫟陽'].owner === x.faction && x.city === '櫟陽');
  assert.strictEqual(D.stateOf(s, 'han', x.faction), 'war');
  // 不跟隨的武將不能留在已自立的城
  for (const g of Object.values(s.generals)) if (g.status === 'active' && g.city === '櫟陽') assert.strictEqual(g.faction, x.faction, g.name);
});

test('反間計：陳平離間范增，成功時罷去軍師、忠誠過低就離開（范增背疽發作）', () => {
  use('-205');
  let success = 0;
  for (let i = 0; i < 30; i++) {
    const s = E.newGame('han', 400 + i);
    s.cities['滎陽'].gold = 5000;
    const fz = s.generals['范增'];
    fz.loyalty = 70;
    const r = E.exec(s, 'han', { type: 'discord', city: '滎陽', general: '陳平', target: '范增' });
    assert(r.ok, r.msg);
    if (fz.loyalty < 70) {
      success++;
      assert.strictEqual(E.strategistOf(s, 'chu'), null, '范增應被罷去軍師');
      assert.strictEqual(fz.status, 'dead', '忠誠 35 以下，范增離去而死');
    }
  }
  assert(success >= 15, `陳平成功 ${success}/30`);
});

test('垓下之戰：四面楚歌；楚由電腦控制時項羽烏江自刎、楚地歸漢', () => {
  use('-202');
  const s = E.newGame('han', 500);
  assert(EV.run(s).some((e) => e.id === 'simian'));
  s.cities['垓下'].owner = 'han';
  s.generals['項羽'].city = '烏江';
  const fired = EV.run(s).map((e) => e.id);
  assert(fired.includes('wujiang'));
  assert.strictEqual(s.generals['項羽'].status, 'dead');
  assert(!s.factions.chu.alive);
  assert.strictEqual(s.cities['吳'].owner, 'han');
});

test('垓下之戰：玩家扮演楚時由玩家抉擇；選渡江則退到江東', () => {
  use('-202');
  const s = E.newGame('chu', 501);
  EV.run(s);
  s.cities['垓下'].owner = 'han';
  s.generals['項羽'].city = '烏江';
  EV.run(s);
  assert.deepStrictEqual(s.choices, ['wujiang']);
  assert.strictEqual(s.generals['項羽'].status, 'active', '還沒選之前不會死');
  const c = EV.choose(s, 'wujiang', 0);
  assert.strictEqual(c.label, '渡江・捲土重來');
  assert.strictEqual(s.generals['項羽'].city, '吳');
  assert(s.factions.chu.alive);
  assert.deepStrictEqual(s.choices, []);
});

test('難易度：容易時玩家收入較多、電腦較少；困難時電腦收入較高', () => {
  use('-205');
  const inc = (d) => {
    const s = E.newGame('han', 90, 'free', d);
    const p0 = s.cities['櫟陽'].gold, a0 = s.cities['彭城'].gold;
    E.monthEnd(s);
    return { p: s.cities['櫟陽'].gold - p0, a: s.cities['彭城'].gold - a0 };
  };
  const e = inc('easy'), n = inc('normal'), h = inc('hard');
  assert(e.p > n.p && n.p === h.p, `玩家 ${e.p}/${n.p}/${h.p}`);
  assert(e.a < n.a && n.a < h.a, `電腦 ${e.a}/${n.a}/${h.a}`);
});

console.log(`\n${passed} tests passed`);
