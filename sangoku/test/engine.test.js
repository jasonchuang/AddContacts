// 執行：node sangoku/test/engine.test.js
'use strict';
const assert = require('assert');
const path = require('path');
for (const f of ['data.js', 'engine.js', 'ai.js']) require(path.join(__dirname, '..', 'js', f));
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

console.log(`\n${passed} tests passed`);
