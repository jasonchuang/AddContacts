/* 電腦勢力：規則式 AI，只透過 Engine.exec 下指令，與玩家遵守相同規則。 */
(function (TK) {
  'use strict';
  const E = () => TK.Engine;

  function defenseValue(s, city) {
    const gens = E().officers(s, city.id);
    const lead = gens.length ? Math.max.apply(null, gens.map((g) => g.lead)) : 45;
    return city.troops * (1 + city.defense / 800) * (0.5 + lead / 200);
  }

  function threatTo(s, city) {
    let t = 0;
    for (const n of E().neighbors(s, city.id)) {
      const c = s.cities[n];
      if (c.owner && c.owner !== city.owner) t = Math.max(t, c.troops);
    }
    return t;
  }

  function idle(s, cityId, fid) {
    return E().officers(s, cityId).filter((g) => g.faction === fid && !g.acted);
  }

  function run(s, fid) {
    const Eng = E();
    const cities = Eng.citiesOf(s, fid);

    for (const city of cities) {
      if (city.owner !== fid) continue; // 本回合可能已失守

      // 俘虜：登用或釋放
      for (const p of Eng.generalsIn(s, city.id, (g) => g.status === 'prisoner')) {
        const rec = idle(s, city.id, fid).sort((a, b) => b.cha - a.cha)[0];
        if (rec && Eng.recruitChance(s, rec, p) > 0.15) Eng.exec(s, fid, { type: 'recruit', city: city.id, general: rec.id, target: p.id });
        else if (p.ruler || E().rand(s) < 0.3) Eng.exec(s, fid, { type: 'release', city: city.id, target: p.id });
      }

      // 進攻
      tryAttack(s, fid, city);

      // 內政
      const threat = threatTo(s, city);
      for (const g of idle(s, city.id, fid)) {
        if (g.acted) continue;
        const free = Eng.generalsIn(s, city.id, (x) => x.status === 'free' && !x.hidden);
        if (free.length && g.cha >= 60) {
          Eng.exec(s, fid, { type: 'recruit', city: city.id, general: g.id, target: free[0].id });
          continue;
        }
        const want = threat ? Math.max(threat * 1.1, 8000) : 8000;
        const unit = draftUnit(s, city, g);
        const max = Eng.maxDraft(s, city, g, unit);
        if (city.troops < want && max >= 1000 && city.gold > 300 && city.food > city.troops / 40 * 6) {
          Eng.exec(s, fid, { type: 'draft', city: city.id, general: g.id, unit, amount: Math.min(max, Math.round(want - city.troops) + 1000, 5000) });
          continue;
        }
        if (city.train < 70 && city.troops > 3000) {
          Eng.exec(s, fid, { type: 'train', city: city.id, general: g.id });
          continue;
        }
        if (Eng.rand(s) < 0.15 && Eng.generalsIn(s, city.id, (x) => x.status === 'free' && x.hidden).length) {
          Eng.exec(s, fid, { type: 'search', city: city.id, general: g.id });
          continue;
        }
        const opts = [
          ['order', city.order < 60 ? 3 : city.order < 90 ? 1 : 0],
          ['farm', city.farm < 999 ? 2 : 0],
          ['commerce', city.commerce < 999 ? 2 : 0],
          ['defense', city.defense < 999 ? (threat ? 2 : 0.5) : 0],
        ].filter((o) => o[1] > 0);
        if (!opts.length) { Eng.exec(s, fid, { type: 'train', city: city.id, general: g.id }); continue; }
        const total = opts.reduce((a, o) => a + o[1], 0);
        let r = Eng.rand(s) * total, choice = opts[0][0];
        for (const o of opts) { if ((r -= o[1]) <= 0) { choice = o[0]; break; } }
        Eng.exec(s, fid, { type: choice, city: city.id, general: g.id });
      }
    }

    // 後方往前線輸送兵力與武將
    for (const city of Eng.citiesOf(s, fid)) {
      if (threatTo(s, city) > 0 || hasNeutralNeighbor(s, city)) continue;
      const fronts = Eng.neighbors(s, city.id).map((id) => s.cities[id]).filter((c) => c.owner === fid);
      if (!fronts.length) continue;
      const dest = fronts.sort((a, b) => threatTo(s, b) - threatTo(s, a))[0];
      const movers = idle(s, city.id, fid).sort((a, b) => b.lead - a.lead);
      const all = Eng.officers(s, city.id);
      if (!movers.length || all.length < 2) continue; // 至少留一人守城
      const carrier = movers[0];
      const extra = all.length >= 4 && movers.length >= 2 ? [movers[1].id] : [];
      Eng.exec(s, fid, {
        type: 'move', city: city.id, general: carrier.id, dest: dest.id, generals: extra,
        troops: Math.floor(city.troops * 0.6), gold: Math.floor(city.gold * 0.3), food: Math.floor(city.food * 0.3),
      });
    }
  }

  // 選擇徵募的兵種：剋制鄰近敵軍最多的兵種，並參考武將適性與金錢
  function draftUnit(s, city, g) {
    const Eng = E();
    const enemy = { spear: 0, cav: 0, xbow: 0 };
    for (const n of Eng.neighbors(s, city.id)) {
      const c = s.cities[n];
      if (c.owner === city.owner) continue;
      const m = Eng.mixOf(c);
      for (const k of Eng.UNIT_KEYS) enemy[k] += m[k];
    }
    let best = 'spear', bestScore = -1;
    for (const k of Eng.UNIT_KEYS) {
      let score = 0;
      for (const d of Eng.UNIT_KEYS) score += enemy[d] * Eng.matchup(k, d);
      score *= Eng.APT_MULT[Eng.aptitude(g, k)];
      if (city.gold < Eng.UNITS[k].cost * 3) score *= 0.5;
      score *= 0.9 + Eng.rand(s) * 0.2;
      if (score > bestScore) { bestScore = score; best = k; }
    }
    return best;
  }

  function hasNeutralNeighbor(s, city) {
    return E().neighbors(s, city.id).some((id) => s.cities[id].owner !== city.owner);
  }

  function tryAttack(s, fid, city) {
    const Eng = E();
    const avail = idle(s, city.id, fid).sort((a, b) => (b.lead + b.war) - (a.lead + a.war));
    const all = Eng.officers(s, city.id);
    if (!avail.length || city.troops < 8000) return;
    const targets = Eng.neighbors(s, city.id).map((id) => s.cities[id]).filter((c) => c.owner !== fid);
    if (!targets.length) return;

    const army = avail.slice(0, Math.min(3, all.length > 1 ? Math.min(avail.length, all.length - 1) : 1));
    const troops = Math.floor(city.troops * 0.75);
    const lead = army[0].lead, war = Math.max.apply(null, army.map((g) => g.war));
    const myPow = troops * (0.6 * lead + 0.4 * war) / 100 * (0.7 + city.train / 100 * 0.6);

    let best = null, bestRatio = 0;
    for (const t of targets) {
      const gens = t.owner ? Eng.officers(s, t.id) : [];
      const tl = gens.length ? Math.max.apply(null, gens.map((g) => g.lead)) : 45;
      const tw = gens.length ? Math.max.apply(null, gens.map((g) => g.war)) : 45;
      const dPow = Math.max(1, t.troops * (0.6 * tl + 0.4 * tw) / 100 * (0.7 + t.train / 100 * 0.6) * (1 + t.defense / 800));
      const ratio = myPow / dPow * (t.owner ? 1 : 1.15);
      if (ratio > bestRatio) { bestRatio = ratio; best = t; }
    }
    // 留守兵力也要夠應付其他鄰敵
    const remain = city.troops - troops;
    if (best && bestRatio > 1.6 && (remain >= threatTo(s, city) * 0.4 || Eng.rand(s) < 0.2) && city.food > troops / 10 + 1000) {
      Eng.exec(s, fid, { type: 'attack', city: city.id, general: army[0].id, generals: army.map((g) => g.id), target: best.id, troops });
    }
  }

  TK.AI = { run, threatTo, defenseValue };
})(globalThis.TK = globalThis.TK || {});
