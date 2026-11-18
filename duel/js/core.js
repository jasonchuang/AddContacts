/* 單挑核心規則（不碰 DOM，可在 Node 測試）。
 * 每回合雙方同時出招：猛攻 剋 技巧、技巧 剋 架擋、架擋 剋 猛攻；蓄氣可累積氣力，但會被打個正著。
 * 氣力滿（3 格，神射 2 格）可放必殺技；必殺技無法閃避，只有架擋能減半。 */
(function (TK) {
  'use strict';

  const MOVES = {
    atk: { name: '猛攻', icon: '斬', beats: 'tech', desc: '剋技巧' },
    tech: { name: '技巧', icon: '巧', beats: 'guard', desc: '剋架擋' },
    guard: { name: '架擋', icon: '守', beats: 'atk', desc: '剋猛攻・減半必殺' },
    charge: { name: '蓄氣', icon: '氣', beats: null, desc: '氣力＋1，但毫無防備' },
  };
  const SP_TYPES = {
    power: { label: '重擊', desc: '一擊造成巨大傷害' },
    combo: { label: '連擊', desc: '連續三次攻擊' },
    stun: { label: '震懾', desc: '造成傷害，對手下回合無法行動' },
    drain: { label: '鼓舞', desc: '造成傷害並回復自身體力' },
    trick: { label: '計略', desc: '以智力造成傷害，清空對手氣力並令其停一回合' },
    arrow: { label: '神射', desc: '只需 2 格氣力即可發動' },
  };
  const MAX_EN = 3;

  // 可替換的亂數（測試時注入固定序列）
  let rnd = Math.random;
  function setRandom(fn) { rnd = fn || Math.random; }

  function cost(g) { return g.type === 'arrow' ? 2 : MAX_EN; }

  function fighter(g) {
    return { g, maxHp: 110 + Math.round(g.lead / 5), hp: 110 + Math.round(g.lead / 5), en: 0, stun: 0 };
  }

  function newMatch(ga, gb) { return { a: fighter(ga), b: fighter(gb), turn: 0, history: { a: [], b: [] }, over: null }; }

  // 基本傷害：武力決定攻擊，統率略減受到的傷害
  function baseDmg(att, def, stat) {
    const s = stat === 'int' ? att.g.int : att.g.war;
    const raw = 8 + s * 0.22;
    const guard = 1 - (def.g.lead - 50) / 500;
    return raw * guard * (0.88 + rnd() * 0.24);
  }

  function canSpecial(f) { return f.en >= cost(f.g); }

  // 結算一回合。回傳 events（依序播放）：{type:'hit'|'heal'|'stun'|'clash'|'charge'|'idle'|'special', who, to, dmg, ...}
  function resolve(m, moveA, moveB) {
    if (m.over) return [];
    m.turn++;
    const F = { a: m.a, b: m.b };
    const mv = { a: moveA, b: moveB };
    // 被震懾的一方本回合不能行動
    for (const k of ['a', 'b']) {
      if (F[k].stun > 0) { mv[k] = 'stunned'; F[k].stun--; }
      else if (mv[k] === 'special' && !canSpecial(F[k])) mv[k] = 'atk';
      if (mv[k] !== 'stunned') m.history[k].push(mv[k]);
    }
    const ev = [];
    const other = (k) => (k === 'a' ? 'b' : 'a');
    const hit = (from, mult, extra) => {
      const to = other(from);
      const dmg = Math.max(1, Math.round(baseDmg(F[from], F[to], extra && extra.stat) * mult));
      F[to].hp = Math.max(0, F[to].hp - dmg);
      ev.push(Object.assign({ type: 'hit', who: from, to, dmg }, extra || {}));
      return dmg;
    };
    const gain = (k, n) => { F[k].en = Math.min(MAX_EN, F[k].en + n); };

    // 必殺技
    const special = (k) => {
      const f = F[k], o = other(k), sp = f.g.type;
      f.en -= cost(f.g);
      const guarded = mv[o] === 'guard';
      const red = guarded ? 0.5 : 1;
      ev.push({ type: 'special', who: k, name: f.g.sp, sp, guarded });
      if (sp === 'combo') { for (let i = 0; i < 3; i++) hit(k, 0.95 * red, { sp: true, n: i }); }
      else if (sp === 'power') hit(k, 2.4 * red, { sp: true, big: true });
      else if (sp === 'arrow') hit(k, 2.0 * red, { sp: true, big: true });
      else if (sp === 'stun') { hit(k, 1.5 * red, { sp: true }); if (!guarded) { F[o].stun = 1; ev.push({ type: 'stun', to: o }); } }
      else if (sp === 'drain') {
        const d = hit(k, 1.6 * red, { sp: true });
        const heal = Math.round(d * 0.6);
        f.hp = Math.min(f.maxHp, f.hp + heal);
        ev.push({ type: 'heal', to: k, amount: heal });
      } else if (sp === 'trick') {
        hit(k, 1.7 * red, { sp: true, stat: 'int' });
        F[o].en = 0;
        if (!guarded) { F[o].stun = 1; ev.push({ type: 'stun', to: o }); }
      }
    };

    const spA = mv.a === 'special', spB = mv.b === 'special';
    if (spA || spB) {
      if (spA) special('a');
      if (spB) special('b');
      // 對方出一般招式仍照常判定（必殺技者不受一般招式影響外的傷害）
      for (const k of ['a', 'b']) {
        const o = other(k);
        if (mv[k] === 'special' || mv[o] !== 'special') continue;
        if (mv[k] === 'atk' || mv[k] === 'tech') { hit(k, 0.6); }
        else if (mv[k] === 'charge') { gain(k, 1); ev.push({ type: 'charge', who: k }); }
      }
    } else {
      const A = mv.a, B = mv.b;
      const isAtk = (x) => x === 'atk' || x === 'tech';
      const open = (x) => x === 'charge' || x === 'stunned';
      if (A === B) {
        if (A === 'atk') { ev.push({ type: 'clash' }); hit('a', 0.5); hit('b', 0.5); }
        else if (A === 'tech') { ev.push({ type: 'clash' }); hit('a', 0.4); hit('b', 0.4); }
        else if (A === 'guard') ev.push({ type: 'idle', text: '雙方互相牽制' });
        else if (A === 'charge') { gain('a', 1); gain('b', 1); ev.push({ type: 'charge', who: 'a' }, { type: 'charge', who: 'b' }); }
        else ev.push({ type: 'idle', text: '雙方都動彈不得' });
      } else {
        for (const k of ['a', 'b']) {
          const me = mv[k], o = other(k), you = mv[o];
          if (me === 'charge') { gain(k, 1); ev.push({ type: 'charge', who: k }); }
          if (isAtk(me) && open(you)) { hit(k, 1.2, { open: true }); gain(k, 1); }
          else if (isAtk(me) && MOVES[me].beats === you) { hit(k, 1.0, { win: true }); gain(k, 1); }
          else if (me === 'guard' && you === 'atk') { hit(k, 0.8, { counter: true }); gain(k, 1); }
        }
        if (!ev.some((e) => e.type === 'hit') && !ev.some((e) => e.type === 'charge')) ev.push({ type: 'idle', text: '攻勢被化解' });
      }
    }
    if (m.a.hp <= 0 || m.b.hp <= 0) {
      m.over = m.a.hp <= 0 && m.b.hp <= 0 ? (m.a.hp >= m.b.hp ? 'a' : 'b') : (m.a.hp > 0 ? 'a' : 'b');
    }
    return { moves: mv, events: ev };
  }

  // 電腦出招：依個性、氣力與玩家習慣判斷；level 1–10 越高越會讀招
  function aiMove(m, me, level) {
    const F = m[me], O = m[me === 'a' ? 'b' : 'a'];
    const hist = m.history[me === 'a' ? 'b' : 'a'];
    if (F.stun > 0) return 'guard';
    // 前幾關的對手比較隨性：有一定機率亂出招（第 1 關約四成，第 9 關以後不會）
    if (level > 0 && rnd() < Math.max(0, 0.45 - level * 0.05)) return ['atk', 'tech', 'guard', 'charge'][Math.floor(rnd() * 4)];
    if (canSpecial(F) && rnd() < (level > 0 && level <= 3 ? 0.55 : 0.8)) return 'special';
    // 對手氣力滿：多半架擋
    if (canSpecial(O) && rnd() < 0.3 + level * 0.04) return 'guard';
    // 對手被震懾：放心蓄氣或猛攻
    if (O.stun > 0) return F.en < cost(F.g) - 1 ? 'charge' : 'atk';
    // 讀招：找出玩家最近最常出的招，出剋制它的招
    if (hist.length >= 2 && rnd() < 0.12 + level * 0.05) {
      const recent = hist.slice(-4).filter((x) => x !== 'special');
      const cnt = {};
      recent.forEach((x) => { cnt[x] = (cnt[x] || 0) + 1; });
      const fav = Object.keys(cnt).sort((x, y) => cnt[y] - cnt[x])[0];
      if (fav === 'charge') return 'atk';
      const counter = Object.keys(MOVES).find((k) => MOVES[k].beats === fav);
      if (counter) return counter;
    }
    const w = {
      atk: 0.6 + F.g.war / 150,
      tech: 0.5 + F.g.int / 160,
      guard: 0.55 + F.g.lead / 220,
      charge: F.en < cost(F.g) ? 0.35 + (F.hp / F.maxHp) * 0.2 : 0,
    };
    let total = 0;
    for (const k in w) total += w[k];
    let r = rnd() * total;
    for (const k in w) { r -= w[k]; if (r <= 0) return k; }
    return 'atk';
  }

  // 看穿：智力高於對手越多，越常看出對手下一招（偶爾會看錯）
  function readChance(me, foe) { return Math.max(0.08, Math.min(0.7, 0.25 + (me.int - foe.int) / 140)); }
  function hint(m, me, foeMove) {
    const F = m[me], O = m[me === 'a' ? 'b' : 'a'];
    if (rnd() >= readChance(F.g, O.g)) return null;
    if (rnd() < 0.85) return foeMove;
    const keys = Object.keys(MOVES).filter((k) => k !== foeMove);
    return keys[Math.floor(rnd() * keys.length)];
  }

  // 過關路線：10 戰，由弱到強，最後一戰為最強者（通常是呂布）
  function power(g) { return g.war * 0.75 + g.lead * 0.25; }
  function ladder(roster, playerName) {
    const pool = roster.filter((g) => g.name !== playerName && g.war >= 55).sort((x, y) => power(x) - power(y));
    const boss = pool.pop();
    const tiers = [[0, 0.3], [0.2, 0.45], [0.35, 0.55], [0.45, 0.65], [0.55, 0.72], [0.65, 0.8], [0.72, 0.88], [0.8, 0.95], [0.88, 1]];
    const used = new Set();
    const out = tiers.map(([lo, hi]) => {
      const a = Math.floor(pool.length * lo), b = Math.max(a + 1, Math.floor(pool.length * hi));
      const cand = pool.slice(a, b).filter((g) => !used.has(g.name));
      const pick = cand[Math.floor(rnd() * cand.length)] || pool.find((g) => !used.has(g.name));
      used.add(pick.name);
      return pick;
    });
    out.push(boss);
    return out;
  }

  function ranking(roster, key) { return roster.slice().sort((x, y) => y[key || 'war'] - x[key || 'war'] || y.lead - x.lead); }

  TK.Duel = { MOVES, SP_TYPES, MAX_EN, cost, setRandom, fighter, newMatch, resolve, aiMove, hint, readChance, ladder, ranking, canSpecial };
})(globalThis.TK = globalThis.TK || {});
