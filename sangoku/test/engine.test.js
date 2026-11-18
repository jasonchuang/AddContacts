// 執行：node sangoku/test/engine.test.js
'use strict';
const assert = require('assert');
const path = require('path');
for (const f of ['data.js', 'scenarios.js', 'engine.js', 'ai.js', 'diplomacy.js', 'events.js']) require(path.join(__dirname, '..', 'js', f));
const { Engine: E } = globalThis.TK;

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('ok  -', name); } catch (e) { console.error('FAIL-', name); throw e; }
}

function invariants(s) {
  for (const c of Object.values(s.cities)) {
    for (const k of ['troops', 'gold', 'food', 'pop', 'farm', 'commerce', 'defense', 'order', 'train']) {
      assert(Number.isFinite(c[k]) && c[k] >= 0, `${c.id}.${k} = ${c[k]}`);
    }
    assert(c.order <= 100 && c.farm <= 999 && c.defense <= 999);
    const m = E.mixOf(c);
    for (const k of E.UNIT_KEYS) assert(Number.isInteger(m[k]) && m[k] >= 0, `${c.id}.mix.${k} = ${m[k]}`);
    assert.strictEqual(m.spear + m.cav + m.xbow, c.troops, `${c.id} 兵種總和不符`);
    if (c.owner) assert(s.factions[c.owner].alive, `${c.id} 屬於已滅亡勢力`);
  }
  for (const g of Object.values(s.generals)) {
    if (g.status === 'dead') continue;
    assert(s.cities[g.city], `${g.name} 所在城不存在`);
    if (g.status === 'active') {
      assert(g.faction && s.factions[g.faction].alive, `${g.name} 勢力無效`);
      assert.strictEqual(s.cities[g.city].owner, g.faction, `${g.name} 不在己方城`);
    } else {
      assert.strictEqual(g.faction, null);
    }
  }
}

test('建立新遊戲', () => {
  const s = E.newGame('cao', 1);
  assert.strictEqual(E.citiesOf(s, 'cao').length, 2);
  assert(s.generals['曹操'].ruler);
  invariants(s);
});

test('內政指令與重複行動', () => {
  const s = E.newGame('cao', 2);
  const before = s.cities['陳留'].farm;
  let r = E.exec(s, 'cao', { type: 'farm', city: '陳留', general: '荀彧' });
  assert(r.ok, r.msg);
  assert(s.cities['陳留'].farm > before);
  r = E.exec(s, 'cao', { type: 'commerce', city: '陳留', general: '荀彧' });
  assert(!r.ok);
  r = E.exec(s, 'cao', { type: 'farm', city: '鄴', general: '袁紹' });
  assert(!r.ok, '不能操作他國城市');
});

test('徵兵上限與花費', () => {
  const s = E.newGame('cao', 3);
  const c = s.cities['陳留'];
  const g = s.generals['典韋'];
  const max = E.maxDraft(s, c, g);
  assert(!E.exec(s, 'cao', { type: 'draft', city: '陳留', general: '典韋', amount: max + 1 }).ok);
  const gold = c.gold, troops = c.troops;
  assert(E.exec(s, 'cao', { type: 'draft', city: '陳留', general: '典韋', amount: 2000 }).ok);
  assert.strictEqual(c.troops, troops + 2000);
  assert.strictEqual(c.gold, gold - 200);
});

test('移動武將與兵力', () => {
  const s = E.newGame('cao', 4);
  const r = E.exec(s, 'cao', { type: 'move', city: '濮陽', general: '夏侯惇', generals: ['曹洪'], dest: '陳留', troops: 4000, gold: 100, food: 0 });
  assert(r.ok, r.msg);
  assert.strictEqual(s.generals['曹洪'].city, '陳留');
  assert.strictEqual(s.cities['濮陽'].troops, 10000);
  assert.strictEqual(s.cities['陳留'].troops, 22000);
  assert(!E.exec(s, 'cao', { type: 'move', city: '陳留', general: '荀彧', dest: '洛陽', troops: 0 }).ok);
  invariants(s);
});

test('進攻空城並佔領', () => {
  const s = E.newGame('cao', 5);
  s.cities['許昌'].troops = 500;
  const r = E.exec(s, 'cao', { type: 'attack', city: '陳留', general: '曹操', generals: ['典韋'], target: '許昌', troops: 12000 });
  assert(r.ok, r.msg);
  assert.strictEqual(s.cities['許昌'].owner, 'cao');
  assert.strictEqual(s.generals['典韋'].city, '許昌');
  invariants(s);
});

test('攻陷最後一城則勢力滅亡、守將被俘或流亡', () => {
  const s = E.newGame('cao', 6);
  s.cities['平原'].troops = 300;
  const r = E.exec(s, 'cao', { type: 'move', city: '濮陽', general: '夏侯惇', dest: '陳留', troops: 0 });
  assert(r.ok);
  const a = E.exec(s, 'cao', { type: 'attack', city: '濮陽', general: '夏侯淵', generals: ['曹仁'], target: '平原', troops: 10000 });
  assert(a.ok, a.msg);
  assert.strictEqual(s.cities['平原'].owner, 'cao');
  assert.strictEqual(s.factions.liu.alive, false);
  assert.strictEqual(s.generals['劉備'].status, 'prisoner');
  // 君主不可登用
  assert.strictEqual(E.recruitChance(s, s.generals['曹仁'], s.generals['劉備']), 0);
  invariants(s);
});

test('存檔可序列化並還原', () => {
  const s = E.newGame('sun', 7);
  E.endTurn(s);
  const t = JSON.parse(JSON.stringify(s));
  E.endTurn(t);
  invariants(t);
  assert.strictEqual(t.month, 3);
});

test('全 AI 模擬十年不出錯（多個亂數種子）', () => {
  for (const seed of [11, 22, 33, 44, 55]) {
    const s = E.newGame(null, seed);
    for (let i = 0; i < 120 && !s.over; i++) {
      E.endTurn(s);
      invariants(s);
    }
    const alive = Object.values(s.factions).filter((f) => f.alive);
    const owned = Object.values(s.cities).filter((c) => c.owner).length;
    console.log(`      seed ${seed}: ${E.dateStr(s)} 存活 ${alive.map((f) => `${f.name}(${E.citiesOf(s, f.id).length})`).join(' ')}，佔城 ${owned}/26`);
  }
});

test('玩家放置不動時 AI 仍正常運作', () => {
  const s = E.newGame('liu', 99);
  for (let i = 0; i < 60 && !s.over; i++) { E.endTurn(s); invariants(s); }
});

test('兵種：徵兵花費與組成', () => {
  const s = E.newGame('cao', 12);
  const c = s.cities['陳留'];
  const before = Object.assign({}, E.mixOf(c)), gold = c.gold;
  assert(E.exec(s, 'cao', { type: 'draft', city: '陳留', general: '典韋', unit: 'cav', amount: 2000 }).ok);
  assert.strictEqual(c.gold, gold - 400, '騎兵每千 200 金');
  assert.strictEqual(E.mixOf(c).cav, before.cav + 2000);
  assert(E.exec(s, 'cao', { type: 'draft', city: '陳留', general: '荀彧', unit: 'xbow', amount: 1000 }).ok);
  assert.strictEqual(E.mixOf(c).xbow, before.xbow + 1000);
});

test('兵種：分兵種移動與出征', () => {
  const s = E.newGame('cao', 13);
  const a = s.cities['濮陽'], b = s.cities['陳留'];
  const ma = Object.assign({}, E.mixOf(a)), mb = Object.assign({}, E.mixOf(b));
  assert(E.exec(s, 'cao', { type: 'move', city: '濮陽', general: '曹洪', dest: '陳留', units: { cav: 1000, spear: 500 } }).ok);
  assert.strictEqual(E.mixOf(a).cav, ma.cav - 1000);
  assert.strictEqual(E.mixOf(b).spear, mb.spear + 500);
  assert(!E.exec(s, 'cao', { type: 'move', city: '濮陽', general: '曹仁', dest: '陳留', units: { cav: 999999 } }).ok, '超過該兵種數量');
  s.cities['許昌'].troops = 300;
  const r = E.exec(s, 'cao', { type: 'attack', city: '陳留', general: '曹操', target: '許昌', units: { cav: 3000, xbow: 1000 } });
  assert(r.ok, r.msg);
  assert.strictEqual(s.cities['許昌'].owner, 'cao');
  const m = E.mixOf(s.cities['許昌']);
  assert.strictEqual(m.spear, 0, '佔領後只剩出征的兵種');
  assert(m.cav > 0);
});

test('兵種相剋：槍兵守城對騎兵比對弩兵更有利', () => {
  const trial = (defType) => {
    let atkLoss = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const s = E.newGame('cao', seed);
      const t = s.cities['許昌'];
      t.troops = 8000; t.mix = { spear: 0, cav: 0, xbow: 0 }; t.mix[defType] = 8000; t.defense = 300;
      const r = E.exec(s, 'cao', { type: 'attack', city: '陳留', general: '樂進', target: '許昌', units: { cav: 4000 } });
      assert(r.ok, r.msg);
      atkLoss += r.battle.atkLoss;
    }
    return atkLoss;
  };
  assert(trial('spear') > trial('xbow'), '騎兵攻打槍兵應損失較多');
});

test('武將適性：趙雲槍兵 S、黃忠弩兵 S，一般武將依能力推得', () => {
  const s = E.newGame('cao', 14);
  assert.strictEqual(E.aptitude(s.generals['趙雲'], 'spear'), 'S');
  assert.strictEqual(E.aptitude(s.generals['黃忠'], 'xbow'), 'S');
  assert(['A', 'B', 'C'].includes(E.aptitude(s.generals['簡雍'], 'cav')));
});

test('外交：同盟不能攻擊、宣戰、停戰期滿、攻擊中立自動開戰', () => {
  const D = globalThis.TK.Diplomacy;
  const s = E.newGame('cao', 21);
  D.setState(s, 'cao', 'yuans', 'alliance');
  assert(!E.exec(s, 'cao', { type: 'attack', city: '濮陽', general: '夏侯惇', target: '鄴', troops: 3000 }).ok, '同盟不能攻擊');
  const r = E.exec(s, 'cao', { type: 'diplo', action: 'war', target: 'yuans', general: '荀彧' });
  assert(r.ok && D.stateOf(s, 'cao', 'yuans') === 'war', '宣戰');
  D.setState(s, 'cao', 'liu', 'truce', 2);
  D.monthTick(s); D.monthTick(s);
  assert.strictEqual(D.stateOf(s, 'cao', 'liu'), 'neutral');
  assert(E.exec(s, 'cao', { type: 'attack', city: '濮陽', general: '夏侯淵', target: '平原', troops: 2000 }).ok);
  assert.strictEqual(D.stateOf(s, 'cao', 'liu'), 'war', '攻擊中立勢力自動開戰');
});

test('外交：勸降使整個勢力歸順', () => {
  const D = globalThis.TK.Diplomacy;
  const s = E.newGame('cao', 22);
  D.absorb(s, 'cao', 'liu');
  assert.strictEqual(s.cities['平原'].owner, 'cao');
  assert.strictEqual(s.generals['關羽'].faction, 'cao');
  assert(!s.factions.liu.alive);
});

test('歷史事件：開局聯盟與桃園之誓、自由模式不觸發', () => {
  const D = globalThis.TK.Diplomacy, EV = globalThis.TK.Events;
  const s = E.newGame('liu', 23);
  const ids = EV.run(s).map((e) => e.id);
  assert(ids.includes('coalition') && ids.includes('oath'));
  assert.strictEqual(D.stateOf(s, 'cao', 'dong'), 'war');
  assert(!EV.run(s).some((e) => e.id === 'coalition'), '不重複觸發');
  const f = E.newGame('liu', 23, 'free');
  assert(EV.run(f).every((e) => !e.historical));
});

test('歷史事件：三顧茅廬、君主繼承', () => {
  const EV = globalThis.TK.Events;
  const s = E.newGame('liu', 24);
  s.year = 196;
  s.cities['宛'].owner = 'liu';
  EV.run(s);
  assert.strictEqual(s.generals['諸葛亮'].faction, 'liu');
  assert.strictEqual(s.cities[s.generals['諸葛亮'].city].owner, 'liu');
  E.rulerDies(s, 'sun');
  assert.strictEqual(s.factions.sun.ruler, '孫策');
  assert.strictEqual(s.generals['孫堅'].status, 'dead');
});

// ---------- 劇本 ----------
const withScenario = (id, fn) => {
  const T = globalThis.TK, keep = T.SCENARIO;
  T.SCENARIO = T.scenarioById(id);
  try { return fn(); } finally { T.SCENARIO = keep; }
};
const jump = (s, y, m) => { s.year = y; s.month = m; };

test('劇本：六個劇本都能開局，每個勢力都有君主與城，AI 跑三年不出錯', () => {
  const T = globalThis.TK;
  assert.deepStrictEqual(T.SCENARIOS.map((x) => x.id), ['190', '197', '200', '208', '219', '221']);
  for (const sc of T.SCENARIOS) {
    withScenario(sc.id, () => {
      const s = E.newGame(null, 7);
      assert.strictEqual(s.scenario, sc.id);
      assert.strictEqual(s.year, sc.year);
      for (const f of Object.values(s.factions)) {
        assert(E.citiesOf(s, f.id).length > 0, `${sc.title} ${f.name} 無城`);
        const r = s.generals[f.ruler];
        assert(r && r.ruler && r.faction === f.id, `${sc.title} ${f.name} 君主`);
      }
      for (let i = 0; i < 36 && !s.over; i++) E.endTurn(s);
      for (const c of Object.values(s.cities)) assert(c.troops >= 0 && Number.isFinite(c.troops));
    });
  }
});

test('劇本：初始外交關係（赤壁孫劉同盟、夷陵蜀吳交戰）', () => {
  const D = globalThis.TK.Diplomacy;
  withScenario('208', () => { const s = E.newGame('liu', 1); assert.strictEqual(D.stateOf(s, 'sun', 'liu'), 'alliance'); assert.strictEqual(D.stateOf(s, 'cao', 'liu'), 'war'); });
  withScenario('221', () => { const s = E.newGame('liu', 1); assert.strictEqual(D.stateOf(s, 'sun', 'liu'), 'war'); });
});

test('劇本事件：宛城之變（典韋戰死、張繡反目）', () => {
  const D = globalThis.TK.Diplomacy, EV = globalThis.TK.Events;
  withScenario('197', () => {
    const s = E.newGame('cao', 3);
    EV.run(s);
    jump(s, 197, 2);
    const ids = EV.run(s).map((e) => e.id);
    assert(ids.includes('wancheng'));
    assert.strictEqual(s.generals['典韋'].status, 'dead');
    assert.strictEqual(D.stateOf(s, 'cao', 'zhangxiu'), 'war');
    assert(!ids.includes('coalition'), '190 年的事件不應出現');
  });
});

test('劇本事件：官渡（斬顏良、千里尋兄、烏巢）', () => {
  const EV = globalThis.TK.Events;
  withScenario('200', () => {
    const s = E.newGame('cao', 4);
    assert.strictEqual(s.generals['關羽'].faction, 'cao');
    jump(s, 200, 2); EV.run(s);
    assert.strictEqual(s.generals['顏良'].status, 'dead');
    jump(s, 200, 4); EV.run(s);
    assert.strictEqual(s.generals['關羽'].faction, 'liu');
    jump(s, 200, 9);
    const food = s.cities['鄴'].food;
    EV.run(s);
    assert.strictEqual(s.generals['許攸'].faction, 'cao');
    assert(s.cities['鄴'].food < food);
  });
});

test('劇本事件：赤壁火攻、水淹七軍與白衣渡江、夷陵', () => {
  const EV = globalThis.TK.Events;
  withScenario('208', () => {
    const s = E.newGame('sun', 5);
    s.rng = 1;
    const before = s.cities['江陵'].troops;
    for (let m = 10; m <= 12 && s.cities['江陵'].troops === before; m++) { jump(s, 208, m); EV.run(s); }
    for (let y = 209; y <= 210 && s.cities['江陵'].troops === before; y++) for (let m = 1; m <= 12; m++) { jump(s, y, m); EV.run(s); }
    assert(s.cities['江陵'].troops < before * 0.5, '火燒赤壁');
  });
  withScenario('219', () => {
    const s = E.newGame('liu', 6);
    jump(s, 219, 8); EV.run(s);
    assert.strictEqual(s.generals['龐德'].status, 'dead');
    assert.strictEqual(s.generals['于禁'].faction, 'liu');
    s.cities['江陵'].troops = 12000;
    for (let m = 10; m <= 12 && s.cities['江陵'].owner === 'liu'; m++) { jump(s, 219, m); EV.run(s); }
    for (let m = 1; m <= 12 && s.cities['江陵'].owner === 'liu'; m++) { jump(s, 220, m); EV.run(s); }
    assert.strictEqual(s.cities['江陵'].owner, 'sun', '白衣渡江');
    assert(s.generals['關羽'].city !== '江陵');
  });
  withScenario('221', () => {
    const s = E.newGame('sun', 8);
    const before = s.cities['成都'].troops;
    for (let m = 6; m <= 12 && s.generals['馮習'].status !== 'dead'; m++) { jump(s, 222, m); EV.run(s); }
    assert.strictEqual(s.generals['馮習'].status, 'dead');
    assert(s.cities['成都'].troops < before);
    jump(s, 223, 4); EV.run(s);
    assert.strictEqual(s.factions.liu.ruler, '劉禪');
  });
});

test('平衡：徵兵受人口上限、軍餉每月扣金、同盟三年期滿', () => {
  const D = globalThis.TK.Diplomacy;
  const s = E.newGame('liu', 31);
  const c = s.cities['平原'], g = s.generals['劉備'];
  c.gold = 999999;
  assert(E.maxDraft(s, c, g, 'spear') <= E.troopCap(c) - c.troops);
  const before = c.gold;
  E.monthEnd(s);
  assert(c.gold < before + E.goldIncome(c), '軍餉應扣金');
  D.setState(s, 'liu', 'cao', 'alliance');
  for (let i = 0; i < 36; i++) E.monthEnd(s);
  assert.strictEqual(D.stateOf(s, 'liu', 'cao'), 'neutral');
});

test('戰報順序：勢力滅亡記錄在攻城戰報之後', () => {
  const s = E.newGame('cao', 32);
  s.cities['平原'].troops = 500; s.cities['濮陽'].troops = 60000;
  globalThis.TK.Diplomacy.setState(s, 'cao', 'liu', 'war');
  const r = E.exec(s, 'cao', { type: 'attack', city: '濮陽', general: '夏侯惇', generals: ['夏侯惇', '夏侯淵'], target: '平原', troops: 50000 });
  assert(r.ok && r.battle.result === 'win');
  const texts = s.log.map((l) => l.text);
  assert(texts.indexOf('劉備軍滅亡了。') > texts.findIndex((t) => t.includes('攻陷了平原')));
});

test('自動試玩：電腦勢力會互相征戰，十年內城池易主', () => {
  const T = globalThis.TK;
  const s = E.newGame(null, 33);
  const start = JSON.stringify(Object.values(s.cities).map((c) => c.owner));
  for (let i = 0; i < 120 && !s.over; i++) E.endTurn(s);
  const changed = Object.values(s.cities).map((c) => c.owner);
  assert.notStrictEqual(JSON.stringify(changed), start);
  assert(Object.values(s.factions).filter((f) => !f.alive).length >= 1, '十年內應有勢力滅亡');
});

console.log(`\n${passed} tests passed`);
