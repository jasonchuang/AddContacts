/* 遊戲核心：狀態、指令、戰鬥、回合結算。不碰 DOM，可在 Node 中測試。 */
(function (TK) {
  'use strict';

  const MAX = { farm: 999, commerce: 999, defense: 999, order: 100, train: 100 };
  const NEUTRAL = { lead: 45, war: 45, int: 40 };
  const FREE_STATS = { name: '守軍' };

  // ---------- 亂數（可存檔、可重現） ----------
  function rand(s) {
    let t = (s.seed = (s.seed + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function rint(s, a, b) { return a + Math.floor(rand(s) * (b - a + 1)); }
  function pick(s, arr) { return arr[Math.floor(rand(s) * arr.length)]; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // ---------- 建立 / 查詢 ----------
  function newGame(playerFaction, seed) {
    const sc = JSON.parse(JSON.stringify(TK.SCENARIO));
    const s = {
      version: 1,
      year: sc.year,
      month: sc.month,
      seed: (seed === undefined ? Date.now() : seed) | 0,
      player: playerFaction,
      factions: {},
      cities: {},
      generals: {},
      roads: sc.roads,
      log: [],
      over: null,
    };
    for (const f of sc.factions) s.factions[f.id] = Object.assign({ alive: true }, f);
    for (const c of sc.cities) s.cities[c.id] = c;
    for (const g of sc.generals) s.generals[g.id] = Object.assign({ acted: false, formerFaction: null }, g);
    addLog(s, `${s.year}年，天下大亂，群雄並起。`, 'sys');
    return s;
  }

  const adjCache = new WeakMap();
  function neighbors(s, cityId) {
    let adj = adjCache.get(s.roads);
    if (!adj) {
      adj = {};
      for (const [a, b] of s.roads) {
        (adj[a] = adj[a] || []).push(b);
        (adj[b] = adj[b] || []).push(a);
      }
      adjCache.set(s.roads, adj);
    }
    return adj[cityId] || [];
  }
  function citiesOf(s, fid) { return Object.values(s.cities).filter((c) => c.owner === fid); }
  function generalsIn(s, cityId, pred) {
    return Object.values(s.generals).filter((g) => g.city === cityId && (!pred || pred(g)));
  }
  function officers(s, cityId) {
    const c = s.cities[cityId];
    return generalsIn(s, cityId, (g) => g.status === 'active' && g.faction === c.owner);
  }
  function factionName(s, fid) { return fid ? s.factions[fid].name : '無主勢力'; }
  function dateStr(s) { return `${s.year}年${s.month}月`; }
  function addLog(s, text, kind, factions) {
    s.log.push({ date: dateStr(s), text, kind: kind || 'info', factions: factions || [] });
    if (s.log.length > 400) s.log.splice(0, s.log.length - 400);
  }

  // ---------- 指令 ----------
  const DEV = {
    farm: { label: '開墾', cost: 50, stat: 'pol', key: 'farm' },
    commerce: { label: '商業', cost: 50, stat: 'pol', key: 'commerce' },
    defense: { label: '築城', cost: 60, stat: 'lead', key: 'defense' },
    order: { label: '巡察', cost: 30, stat: 'cha', key: 'order' },
    train: { label: '訓練', cost: 0, stat: 'lead', key: 'train' },
  };

  function maxDraft(s, city, g) {
    return Math.max(0, Math.min(g.cha * 100, city.gold * 10, Math.floor(city.pop / 5), 120000 - city.troops));
  }

  function recruitChance(s, g, target) {
    if (target.ruler) return 0;
    if (target.status === 'free') return clamp(0.15 + (g.cha / 100) * 0.55, 0, 0.75);
    if (target.status === 'prisoner') return clamp(0.05 + (g.cha / 100) * 0.45 - (target.loyalty - 50) / 200, 0.02, 0.6);
    return 0;
  }

  // 回傳 {ok, msg}
  function exec(s, fid, cmd) {
    if (s.over) return fail('遊戲已結束');
    const city = s.cities[cmd.city];
    if (!city || city.owner !== fid) return fail('不是我方城市');
    let g = null;
    const needsExec = !['reward', 'release', 'execute'].includes(cmd.type);
    if (needsExec) {
      g = s.generals[cmd.general];
      if (!g || g.faction !== fid || g.status !== 'active' || g.city !== city.id) return fail('武將不在此城');
      if (g.acted) return fail(`${g.name}本月已行動`);
    }

    if (DEV[cmd.type]) {
      const d = DEV[cmd.type];
      if (city.gold < d.cost) return fail('金不足');
      if (city[d.key] >= MAX[d.key]) return fail(`${d.label}已達上限`);
      city.gold -= d.cost;
      const st = g[d.stat];
      const gain = cmd.type === 'order' || cmd.type === 'train'
        ? Math.round(st / 20 + rint(s, 1, 4))
        : Math.round(st / 10 + rint(s, 0, 5));
      city[d.key] = Math.min(MAX[d.key], city[d.key] + gain);
      g.acted = true;
      return ok(`${g.name}於${city.name}${d.label}，${labelOf(d.key)} +${gain}`);
    }

    switch (cmd.type) {
      case 'draft': {
        const amt = Math.floor(cmd.amount || 0);
        const max = maxDraft(s, city, g);
        if (amt < 100) return fail('徵兵數至少 100');
        if (amt > max) return fail(`最多可徵 ${max}`);
        city.gold -= Math.ceil(amt / 10);
        city.pop -= amt;
        city.train = Math.round((city.train * city.troops + 20 * amt) / (city.troops + amt));
        city.troops += amt;
        city.order = Math.max(0, city.order - Math.ceil(amt / 2000));
        g.acted = true;
        return ok(`${g.name}於${city.name}徵兵 ${amt}`);
      }
      case 'search': {
        g.acted = true;
        const hidden = generalsIn(s, city.id, (x) => x.status === 'free' && x.hidden);
        if (hidden.length && rand(s) < 0.25 + g.int / 200) {
          const f = pick(s, hidden);
          f.hidden = false;
          return ok(`${g.name}在${city.name}發現了人才「${f.name}」！`);
        }
        if (rand(s) < 0.4) {
          const gold = rint(s, 30, 120);
          city.gold += gold;
          return ok(`${g.name}在${city.name}搜索，得到金 ${gold}`);
        }
        return ok(`${g.name}在${city.name}搜索，一無所獲`);
      }
      case 'recruit': {
        const t = s.generals[cmd.target];
        if (!t || t.city !== city.id || !(t.status === 'prisoner' || (t.status === 'free' && !t.hidden))) {
          return fail('找不到登用對象');
        }
        g.acted = true;
        const p = recruitChance(s, g, t);
        if (rand(s) < p) {
          joinFaction(t, fid, rint(s, 60, 80));
          t.acted = true;
          return ok(`${t.name}接受了${g.name}的邀請，加入${factionName(s, fid)}！`);
        }
        return ok(`${t.name}拒絕了${g.name}的登用`);
      }
      case 'reward': {
        const t = s.generals[cmd.target];
        if (!t || t.faction !== fid || t.city !== city.id || t.status !== 'active') return fail('找不到武將');
        if (t.ruler) return fail('不能賞賜君主');
        if (city.gold < 100) return fail('金不足');
        if (t.loyalty >= 100) return fail('忠誠已滿');
        city.gold -= 100;
        const gain = rint(s, 5, 10);
        t.loyalty = Math.min(100, t.loyalty + gain);
        return ok(`賞賜${t.name}，忠誠 +${gain}`);
      }
      case 'release':
      case 'execute': {
        const t = s.generals[cmd.target];
        if (!t || t.city !== city.id || t.status !== 'prisoner') return fail('找不到俘虜');
        if (cmd.type === 'release') {
          t.status = 'free';
          t.hidden = false;
          return ok(`釋放了${t.name}`);
        }
        t.status = 'dead';
        t.city = null;
        return ok(`處斬了${t.name}`);
      }
      case 'move': {
        const dest = s.cities[cmd.dest];
        if (!dest || dest.owner !== fid || !neighbors(s, city.id).includes(dest.id)) return fail('目的地不正確');
        const ids = uniq([g.id].concat(cmd.generals || []));
        const movers = ids.map((id) => s.generals[id]);
        for (const m of movers) {
          if (!m || m.faction !== fid || m.city !== city.id || m.status !== 'active' || m.acted) return fail('有武將無法移動');
        }
        const troops = Math.floor(cmd.troops || 0), gold = Math.floor(cmd.gold || 0), food = Math.floor(cmd.food || 0);
        if (troops < 0 || troops > city.troops || gold < 0 || gold > city.gold || food < 0 || food > city.food) {
          return fail('兵、金或糧數量不正確');
        }
        transferTroops(city, dest, troops);
        city.gold -= gold; dest.gold += gold;
        city.food -= food; dest.food += food;
        for (const m of movers) { m.city = dest.id; m.acted = true; }
        return ok(`${movers.map((m) => m.name).join('、')}率兵 ${troops} 移動至${dest.name}`);
      }
      case 'attack': {
        const target = s.cities[cmd.target];
        if (!target || target.owner === fid || !neighbors(s, city.id).includes(target.id)) return fail('無法進攻該城');
        const ids = uniq([g.id].concat(cmd.generals || [])).slice(0, 3);
        const army = ids.map((id) => s.generals[id]);
        for (const m of army) {
          if (!m || m.faction !== fid || m.city !== city.id || m.status !== 'active' || m.acted) return fail('有武將無法出陣');
        }
        const troops = Math.floor(cmd.troops || 0);
        if (troops < 1000) return fail('出陣兵力至少 1000');
        if (troops > city.troops) return fail('兵力不足');
        const foodNeed = Math.ceil(troops / 10);
        if (city.food < foodNeed) return fail(`軍糧不足（需 ${foodNeed}）`);
        if (city.troops - troops < 0) return fail('兵力不足');
        city.food -= foodNeed;
        city.troops -= troops;
        for (const m of army) m.acted = true;
        const res = battle(s, { faction: fid, generals: army, troops, train: city.train, from: city.id }, target.id);
        return ok(res.summary, res);
      }
      default:
        return fail('未知指令');
    }
  }

  function ok(msg, extra) { return Object.assign({ ok: true, msg }, extra ? { battle: extra } : {}); }
  function fail(msg) { return { ok: false, msg }; }
  function uniq(a) { return Array.from(new Set(a)); }
  function labelOf(k) {
    return { farm: '農業', commerce: '商業', defense: '城防', order: '民心', train: '訓練' }[k] || k;
  }

  function joinFaction(g, fid, loyalty) {
    g.faction = fid;
    g.status = 'active';
    g.hidden = false;
    g.loyalty = loyalty;
    g.formerFaction = null;
  }

  function transferTroops(from, to, n) {
    if (n <= 0) return;
    to.train = Math.round((to.train * to.troops + from.train * n) / (to.troops + n));
    to.troops += n;
    from.troops -= n;
  }

  // ---------- 戰鬥 ----------
  function sideStats(gens) {
    if (!gens.length) return Object.assign({}, NEUTRAL);
    const cmdr = gens.slice().sort((a, b) => b.lead - a.lead)[0];
    return {
      lead: cmdr.lead,
      war: Math.max.apply(null, gens.map((x) => x.war)),
      int: Math.max.apply(null, gens.map((x) => x.int)),
      commander: cmdr,
    };
  }

  function battle(s, atk, targetId) {
    const city = s.cities[targetId];
    const defOwner = city.owner;
    const defGens = defOwner ? officers(s, city.id).sort((a, b) => b.lead - a.lead).slice(0, 3) : [];
    const A = Object.assign(sideStats(atk.generals), { troops: atk.troops, train: atk.train });
    const D = Object.assign(sideStats(defGens), { troops: city.troops, train: city.train });
    const A0 = A.troops, D0 = D.troops;
    const aName = factionName(s, atk.faction), dName = factionName(s, defOwner);
    const parties = [atk.faction, defOwner].filter(Boolean);
    const lines = [];
    const aCmd = A.commander ? A.commander.name : '';
    const dCmd = D.commander ? D.commander.name : FREE_STATS.name;
    lines.push(`${aName}（${aCmd}，${A0}兵）自${atk.from}進攻${city.name}（${dName}，${dCmd}，${D0}兵）`);

    // 單挑
    if (A.war >= 80 && D.war >= 80 && rand(s) < 0.3) {
      const ah = atk.generals.slice().sort((a, b) => b.war - a.war)[0];
      const dh = defGens.slice().sort((a, b) => b.war - a.war)[0];
      const ar = ah.war + rint(s, 0, 25), dr = dh.war + rint(s, 0, 25);
      const winner = ar >= dr ? ah : dh, loser = ar >= dr ? dh : ah;
      lines.push(`單挑！${ah.name} 對 ${dh.name}，${winner.name}擊退了${loser.name}`);
      if (winner === ah) D.troops = Math.round(D.troops * 0.9);
      else A.troops = Math.round(A.troops * 0.9);
    }

    let result = null, schemes = 0;
    for (let round = 1; round <= 20 && !result; round++) {
      const powA = A.troops * (0.6 * A.lead + 0.4 * A.war) / 100 * (0.7 + A.train / 100 * 0.6);
      const powD = D.troops * (0.6 * D.lead + 0.4 * D.war) / 100 * (0.7 + D.train / 100 * 0.6) * (1 + city.defense / 800);
      let lossD = Math.round(powA * 0.08 * (0.85 + rand(s) * 0.3));
      let lossA = Math.round(powD * 0.08 * (0.85 + rand(s) * 0.3));
      if (A.int >= 75 && rand(s) < (A.int - 60) / 200) {
        lossD = Math.round(lossD * 1.5);
        if (schemes++ < 2) lines.push(`${aName}施展計略，${city.name}守軍陷入混亂`);
      }
      if (D.int >= 75 && rand(s) < (D.int - 60) / 200) {
        lossA = Math.round(lossA * 1.5);
        if (schemes++ < 2) lines.push(`${dName}識破敵計並反擊`);
      }
      A.troops = Math.max(0, A.troops - lossA);
      D.troops = Math.max(0, D.troops - lossD);
      city.defense = Math.max(0, city.defense - rint(s, 3, 12));

      if (D.troops <= 0) result = 'win';
      else if (A.troops <= 0) result = 'lose';
      else if (D.troops < D0 * 0.2 && D.troops < A.troops * 0.5) { result = 'win'; D.troops = 0; }
      else if (A.troops < A0 * 0.3 && A.troops < D.troops) result = 'lose';
    }
    if (!result) { result = 'lose'; lines.push('久攻不下，撤兵'); }

    city.troops = D.troops;
    let summary;
    if (result === 'win') {
      conquer(s, city, atk, A, lines);
      summary = `${aName}攻陷了${city.name}！（剩餘 ${A.troops} 兵）`;
    } else {
      const home = s.cities[atk.from];
      if (home.owner === atk.faction) {
        transferTroops({ troops: A.troops, train: atk.train }, home, A.troops);
      }
      summary = `${aName}進攻${city.name}失敗（我損 ${A0 - A.troops}，敵損 ${D0 - D.troops}）`;
    }
    lines.push(summary);
    for (const l of lines) addLog(s, l, 'battle', parties);
    return { result, summary, lines, atkLoss: A0 - A.troops, defLoss: D0 - D.troops };
  }

  function conquer(s, city, atk, A, lines) {
    const oldOwner = city.owner;
    const defenders = oldOwner ? generalsIn(s, city.id, (g) => g.status === 'active' && g.faction === oldOwner) : [];
    city.owner = atk.faction;
    city.troops = A.troops;
    city.train = atk.train;
    city.order = Math.max(10, city.order - 15);
    for (const g of atk.generals) g.city = city.id;

    if (oldOwner) {
      const escapes = neighbors(s, city.id).filter((id) => s.cities[id].owner === oldOwner);
      for (const g of defenders) {
        if (escapes.length && (g.ruler || rand(s) < 0.5 + g.war / 400)) {
          g.city = pick(s, escapes);
          lines.push(`${g.name}逃往${g.city}`);
        } else {
          g.status = 'prisoner';
          g.formerFaction = oldOwner;
          g.faction = null;
          lines.push(`${g.name}被俘`);
        }
      }
    }
    // 城中原本關押的我方武將獲救
    for (const p of generalsIn(s, city.id, (g) => g.status === 'prisoner' && g.formerFaction === atk.faction)) {
      joinFaction(p, atk.faction, Math.max(p.loyalty, 70));
      lines.push(`${p.name}獲救歸隊`);
    }
    if (oldOwner && citiesOf(s, oldOwner).length === 0) destroyFaction(s, oldOwner);
  }

  function destroyFaction(s, fid) {
    const f = s.factions[fid];
    f.alive = false;
    for (const g of Object.values(s.generals)) {
      if (g.faction === fid && g.status === 'active') {
        g.faction = null;
        g.status = 'free';
        g.hidden = false;
      }
    }
    addLog(s, `${f.name}滅亡了。`, 'major', [fid]);
  }

  // ---------- 回合結算 ----------
  function endTurn(s) {
    if (s.over) return;
    const order = Object.keys(s.factions).filter((id) => id !== s.player && s.factions[id].alive);
    // 打亂 AI 順序
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rand(s) * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (const fid of order) {
      if (s.factions[fid].alive && !s.over) TK.AI.run(s, fid);
      checkEnd(s);
    }
    monthEnd(s);
    checkEnd(s);
  }

  function monthEnd(s) {
    for (const c of Object.values(s.cities)) {
      if (!c.owner) {
        // 無主城緩慢恢復守軍
        c.troops = Math.min(c.troops + 100, 12000);
        continue;
      }
      const ord = 0.5 + c.order / 200;
      c.gold += Math.round(c.commerce * 0.35 * ord + c.pop / 10000);
      if (s.month === 7) {
        const harvest = Math.round(c.farm * 30 * ord);
        c.food += harvest;
        if (c.owner === s.player) addLog(s, `${c.name}秋收，得糧 ${harvest}`, 'info', [c.owner]);
      }
      c.food -= Math.ceil(c.troops / 40);
      if (c.food < 0) {
        c.food = 0;
        const lost = Math.round(c.troops * 0.1);
        c.troops -= lost;
        c.order = Math.max(0, c.order - 5);
        addLog(s, `${c.name}缺糧，${lost} 兵逃散`, 'warn', [c.owner]);
      }
      c.pop = Math.max(10000, Math.round(c.pop * (1 + (c.order - 40) / 20000)));
      if (c.train > 50 && c.troops > 0 && rand(s) < 0.3) c.train -= 1;
    }
    for (const g of Object.values(s.generals)) g.acted = false;
    s.month += 1;
    if (s.month > 12) { s.month = 1; s.year += 1; }
  }

  function checkEnd(s) {
    if (s.over) return s.over;
    const alive = Object.values(s.factions).filter((f) => f.alive);
    if (s.player && s.factions[s.player] && !s.factions[s.player].alive) {
      s.over = { result: 'lose' };
      addLog(s, '我軍覆滅……', 'major', [s.player]);
    } else if (s.player && Object.values(s.cities).every((c) => c.owner === s.player)) {
      s.over = { result: 'win' };
      addLog(s, `${s.factions[s.player].name}統一天下！`, 'major', [s.player]);
    } else if (!s.player || !s.factions[s.player]) {
      if (alive.length === 1 && Object.values(s.cities).every((c) => c.owner === alive[0].id)) {
        s.over = { result: 'unified', faction: alive[0].id };
      }
    }
    return s.over;
  }

  function powerOf(s, fid) {
    const cs = citiesOf(s, fid);
    return {
      cities: cs.length,
      troops: cs.reduce((a, c) => a + c.troops, 0),
      gold: cs.reduce((a, c) => a + c.gold, 0),
      food: cs.reduce((a, c) => a + c.food, 0),
      generals: Object.values(s.generals).filter((g) => g.faction === fid && g.status === 'active').length,
    };
  }

  TK.Engine = {
    MAX, DEV, newGame, exec, endTurn, monthEnd, checkEnd, battle,
    neighbors, citiesOf, generalsIn, officers, factionName, dateStr, addLog,
    maxDraft, recruitChance, powerOf, rand, rint, pick, clamp,
  };
})(globalThis.TK = globalThis.TK || {});
