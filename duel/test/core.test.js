// 執行：node duel/test/core.test.js
'use strict';
const assert = require('assert');
global.TK = {};
require('../js/roster.js');
require('../js/core.js');
const D = TK.Duel, R = TK.ROSTER;
const by = (n) => R.find((g) => g.name === n);
let pass = 0;
function test(name, fn) { D.setRandom(() => 0.5); fn(); pass++; console.log('ok  - ' + name); }

test('名冊：100 位武將，每位都有必殺技與外觀', () => {
  assert.strictEqual(R.length, 100);
  for (const g of R) { assert(g.sp && D.SP_TYPES[g.type], g.name); assert(g.look && g.look.hat, g.name); }
});

test('武力排名第一是呂布', () => { assert.strictEqual(D.ranking(R)[0].name, '呂布'); });

test('相剋：猛攻勝技巧、技巧勝架擋、架擋反擊猛攻', () => {
  let m = D.newMatch(by('關羽'), by('張飛'));
  let r = D.resolve(m, 'atk', 'tech');
  assert(m.b.hp < m.b.maxHp && m.a.hp === m.a.maxHp);
  m = D.newMatch(by('關羽'), by('張飛'));
  D.resolve(m, 'tech', 'guard');
  assert(m.b.hp < m.b.maxHp && m.a.hp === m.a.maxHp);
  m = D.newMatch(by('關羽'), by('張飛'));
  r = D.resolve(m, 'atk', 'guard');
  assert(m.a.hp < m.a.maxHp && m.b.hp === m.b.maxHp);
  assert(r.events.some((e) => e.counter));
});

test('蓄氣：累積氣力，被攻擊時受到加重傷害', () => {
  const m = D.newMatch(by('關羽'), by('張飛'));
  D.resolve(m, 'charge', 'guard');
  assert.strictEqual(m.a.en, 1);
  const before = m.a.hp;
  const r = D.resolve(m, 'charge', 'atk');
  assert.strictEqual(m.a.en, 2);
  assert(m.a.hp < before && r.events.some((e) => e.open));
});

test('必殺技：氣力不足時改為猛攻；滿氣時發動並消耗氣力', () => {
  const m = D.newMatch(by('關羽'), by('張飛'));
  let r = D.resolve(m, 'special', 'charge');
  assert.strictEqual(r.moves.a, 'atk');
  m.a.en = 3;
  r = D.resolve(m, 'special', 'tech');
  assert.strictEqual(m.a.en, 0);
  assert(r.events.some((e) => e.type === 'special' && e.name === '青龍偃月斬'));
});

test('架擋可把必殺技減半', () => {
  const m1 = D.newMatch(by('關羽'), by('張飛')); m1.a.en = 3;
  D.resolve(m1, 'special', 'tech');
  const m2 = D.newMatch(by('關羽'), by('張飛')); m2.a.en = 3;
  D.resolve(m2, 'special', 'guard');
  const d1 = m1.b.maxHp - m1.b.hp, d2 = m2.b.maxHp - m2.b.hp;
  assert(d2 < d1 * 0.6, `${d1} ${d2}`);
});

test('震懾與計略：對手下回合無法行動', () => {
  const m = D.newMatch(by('張飛'), by('關羽')); m.a.en = 3;
  D.resolve(m, 'special', 'atk');
  assert.strictEqual(m.b.stun, 1);
  const r = D.resolve(m, 'atk', 'atk');
  assert.strictEqual(r.moves.b, 'stunned');
  const t = D.newMatch(by('諸葛亮'), by('呂布')); t.a.en = 3; t.b.en = 2;
  D.resolve(t, 'special', 'tech');
  assert.strictEqual(t.b.en, 0); assert.strictEqual(t.b.stun, 1);
});

test('黃忠神射只需兩格氣', () => {
  const m = D.newMatch(by('黃忠'), by('張飛')); m.a.en = 2;
  const r = D.resolve(m, 'special', 'tech');
  assert(r.events.some((e) => e.type === 'special'));
});

test('過關路線：10 戰、不重複、最後是呂布、由弱到強', () => {
  D.setRandom(Math.random);
  for (let i = 0; i < 30; i++) {
    const L = D.ladder(R, '關羽');
    assert.strictEqual(L.length, 10);
    assert.strictEqual(new Set(L.map((g) => g.name)).size, 10);
    assert.strictEqual(L[9].name, '呂布');
    assert(!L.some((g) => g.name === '關羽'));
    assert(L[0].war < L[8].war);
  }
  assert.notStrictEqual(D.ladder(R, '呂布')[9].name, '呂布');
});

test('電腦對戰一定會分出勝負，強者勝率較高', () => {
  D.setRandom(Math.random);
  let strong = 0;
  for (let i = 0; i < 400; i++) {
    const m = D.newMatch(by('呂布'), by('簡雍'));
    let n = 0;
    while (!m.over && n < 200) { D.resolve(m, D.aiMove(m, 'a', 5), D.aiMove(m, 'b', 5)); n++; }
    assert(m.over, '未分勝負');
    if (m.over === 'a') strong++;
  }
  assert(strong > 300, `呂布勝 ${strong}/400`);
});

console.log(`\n${pass} tests passed`);
