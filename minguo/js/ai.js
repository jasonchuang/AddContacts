/* 電腦勢力：規則式 AI，只透過 Engine.exec 下指令，與玩家遵守相同規則。 */
(function (TK) {
  'use strict';
  const E = () => TK.Engine;

  function defenseValue(s, city) {
    const gens = E().officers(s, city.id);
    const lead = gens.length ? Math.max.apply(null, gens.map((g) => g.lead)) : 45;
    return city.troops * (1 + city.defense / 2500) * (0.5 + lead / 200);
  }

  function threatTo(s, city) {
    let t = 0;
    for (const n of E().neighbors(s, city.id)) {
      const c = s.cities[n];
      if (c.owner && c.owner !== city.owner && (!TK.Diplomacy || TK.Diplomacy.canAttack(s, c.owner, city.owner))) t = Math.max(t, c.troops);
    }
    return t;
  }

  // 進攻方戰力（以城中最好的將領估）與守方戰力
  function atkPow(s, city, troops) {
    const gens = E().officers(s, city.id);
    const lead = gens.length ? Math.max.apply(null, gens.map((g) => g.lead)) : 45;
    const war = gens.length ? Math.max.apply(null, gens.map((g) => g.war)) : 45;
    return troops * (0.6 * lead + 0.4 * war) / 100 * (0.7 + city.train / 100 * 0.6);
  }
  function defPow(s, t) {
    const gens = t.owner ? E().officers(s, t.id) : [];
    const tl = gens.length ? Math.max.apply(null, gens.map((g) => g.lead)) : 45;
    const tw = gens.length ? Math.max.apply(null, gens.map((g) => g.war)) : 45;
    return Math.max(1, t.troops * (0.6 * tl + 0.4 * tw) / 100 * (0.7 + t.train / 100 * 0.6) * (1 + t.defense / 2500));
  }

  // 作戰計畫：選出最有希望攻下的目標，指定一座相鄰的我方城作為集結地，其他鄰近我方城把兵送過去
  function plan(s, fid) {
    const Eng = E();
    let best = null;
    for (const city of Eng.citiesOf(s, fid)) {
      if (!Eng.officers(s, city.id).length) continue;
      const feeders = Eng.neighbors(s, city.id).map((id) => s.cities[id]).filter((c) => c.owner === fid);
      const pool = city.troops * 0.8 + feeders.reduce((a, c) => a + c.troops * 0.5, 0);
      for (const n of Eng.neighbors(s, city.id)) {
        const t = s.cities[n];
        if (t.owner === fid || t.locked || (t.owner && TK.Diplomacy && !TK.Diplomacy.canAttack(s, fid, t.owner))) continue;
        const neutralRel = t.owner && TK.Diplomacy && TK.Diplomacy.stateOf(s, fid, t.owner) === 'neutral';
        const score = atkPow(s, city, pool) / defPow(s, t) * (t.owner ? 1 : 1.2) * (neutralRel ? 0.8 : 1)
          * (1 + (t.pop / 1e6)); // 大城優先
        if (!best || score > best.score) best = { score, staging: city.id, target: t.id };
      }
    }
    return best;
  }

  function concentrate(s, fid, p) {
    const Eng = E();
    if (!p || p.score < 1.1 * (s.player ? Eng.diff(s).aiAggro : 1)) return;
    const staging = s.cities[p.staging];
    for (const n of Eng.neighbors(s, staging.id)) {
      const c = s.cities[n];
      if (c.owner !== fid) continue;
      const movers = idle(s, c.id, fid).sort((a, b) => b.lead - a.lead);
      const all = Eng.officers(s, c.id);
      if (!movers.length || all.length < 2) continue;
      // 自己若也面臨威脅，只送出超出威脅一半的兵力
      const keep = Math.max(3000, threatTo(s, c) * 0.35);
      const send = Math.floor(c.troops - keep);
      if (send < 2000) continue;
      Eng.exec(s, fid, { type: 'move', city: c.id, general: movers[0].id, dest: staging.id, troops: send, food: Math.floor(c.food * 0.3) });
    }
  }

  function idle(s, cityId, fid) {
    return E().officers(s, cityId).filter((g) => g.faction === fid && !g.acted);
  }

  // 電腦勢力自動任命官職：智略最高者為軍師，各城政務最高者為太守
  function appointOfficials(s, fid) {
    const Eng = E();
    if (!Eng.strategistOf(s, fid)) {
      const best = Object.values(s.generals).filter((g) => g.faction === fid && g.status === 'active' && !g.ruler).sort((a, b) => b.int - a.int)[0];
      const cap = Eng.citiesOf(s, fid)[0];
      if (best && cap) Eng.exec(s, fid, { type: 'appoint', role: 'strategist', city: cap.id, target: best.id });
    }
    for (const c of Eng.citiesOf(s, fid)) {
      if (Eng.governorOf(s, c)) continue;
      const best = Eng.officers(s, c.id).sort((a, b) => b.pol - a.pol)[0];
      if (best) Eng.exec(s, fid, { type: 'appoint', role: 'governor', city: c.id, target: best.id });
    }
  }

  // 估計從某城派 troops 兵攻打 target 的勝算比（>1 代表佔優）
  function estimate(s, from, troops, target) {
    return atkPow(s, from, troops) / defPow(s, target);
  }

  function run(s, fid) {
    const Eng = E();
    appointOfficials(s, fid);
    const cities = Eng.citiesOf(s, fid);
    const p = plan(s, fid);

    for (const city of cities) {
      if (city.owner !== fid) continue; // 本回合可能已失守

      // 缺糧（不到三個月）又有錢：派政務最高的武將買糧
      const monthly = Math.ceil(city.troops / TK.TUNING.economy.foodPer);
      if (city.commerce >= TK.TUNING.trade.minCommerce && city.food < monthly * 3) {
        const tr = idle(s, city.id, fid).sort((a, b) => b.pol - a.pol)[0];
        if (tr) {
          const q = Eng.tradeQuote(s, city, tr);
          const amt = Math.min(q.max, monthly * 4, Math.floor((city.gold - 300) * 100 / q.buy));
          if (amt >= 500) Eng.exec(s, fid, { type: 'trade', city: city.id, general: tr.id, mode: 'buy', amount: amt });
        }
      }

      // 俘虜：登用或釋放
      for (const p of Eng.generalsIn(s, city.id, (g) => g.status === 'prisoner')) {
        const rec = idle(s, city.id, fid).sort((a, b) => b.cha - a.cha)[0];
        if (rec && Eng.recruitChance(s, rec, p) > 0.15) Eng.exec(s, fid, { type: 'recruit', city: city.id, general: rec.id, target: p.id });
        else if (p.ruler || E().rand(s) < 0.3) Eng.exec(s, fid, { type: 'release', city: city.id, target: p.id });
      }

      // 進攻（集結地全力出擊）
      tryAttack(s, fid, city, p && p.staging === city.id ? p.target : null);

      // 內政
      const threat = threatTo(s, city);
      for (const g of idle(s, city.id, fid)) {
        if (g.acted) continue;
        const free = Eng.generalsIn(s, city.id, (x) => x.status === 'free' && !x.hidden);
        if (free.length && g.cha >= 60) {
          Eng.exec(s, fid, { type: 'recruit', city: city.id, general: g.id, target: free[0].id });
          continue;
        }
        // 目標兵力：經濟養得起的量（月收入的八成用於軍餉），且不超過人口上限；前線多養一些
        const income = city.commerce * 0.35 * (0.5 + city.order / 200) + city.pop / 10000;
        const frontline = threat > 0 || hasNeutralNeighbor(s, city);
        const want = Math.min(Eng.troopCap(city), Math.max(8000, income * 250 * (frontline ? 0.9 : 0.5)));
        const unit = draftUnit(s, city, g);
        const max = Eng.maxDraft(s, city, g, unit);
        if (city.troops < want && max >= 1000 && city.gold > 300 + city.troops / 50 && city.food > city.troops / TK.TUNING.economy.foodPer * 6) {
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

    // 依作戰計畫集結兵力
    concentrate(s, fid, p);

    // 後方往前線輸送兵力與武將：有作戰計畫時，沿著我方領土的最短路線送往集結地
    const dist = p ? distances(s, fid, p.staging) : null;
    for (const city of Eng.citiesOf(s, fid)) {
      if (threatTo(s, city) > 0 || hasNeutralNeighbor(s, city)) continue;
      const fronts = Eng.neighbors(s, city.id).map((id) => s.cities[id]).filter((c) => c.owner === fid);
      if (!fronts.length) continue;
      let dest;
      if (dist && dist[city.id] != null) {
        dest = fronts.filter((c) => dist[c.id] != null && dist[c.id] < dist[city.id]).sort((a, b) => dist[a.id] - dist[b.id])[0];
      }
      dest = dest || fronts.sort((a, b) => threatTo(s, b) - threatTo(s, a))[0];
      const movers = idle(s, city.id, fid).sort((a, b) => b.lead - a.lead);
      const all = Eng.officers(s, city.id);
      // 後方安全的城可以不留武將；兵太少就不必送
      if (!movers.length || city.troops < 3000) continue;
      const carrier = movers[0];
      const extra = all.length >= 4 && movers.length >= 2 ? [movers[1].id] : [];
      Eng.exec(s, fid, {
        type: 'move', city: city.id, general: carrier.id, dest: dest.id, generals: extra,
        troops: Math.floor(city.troops * (all.length < 2 ? 0.9 : 0.7)), gold: Math.floor(city.gold * 0.3), food: Math.floor(city.food * 0.3),
      });
    }
  }

  // 我方領土內，各城到某城的步數
  function distances(s, fid, from) {
    const Eng = E();
    const d = { [from]: 0 };
    const q = [from];
    while (q.length) {
      const cur = q.shift();
      for (const n of Eng.neighbors(s, cur)) {
        if (d[n] != null || s.cities[n].owner !== fid) continue;
        d[n] = d[cur] + 1;
        q.push(n);
      }
    }
    return d;
  }

  // 選擇徵募的兵種：剋制鄰近敵軍最多的兵種，並參考武將適性與金錢
  function draftUnit(s, city, g) {
    const Eng = E();
    const enemy = Eng.emptyUnits();
    for (const n of Eng.neighbors(s, city.id)) {
      const c = s.cities[n];
      if (c.owner === city.owner) continue;
      const m = Eng.mixOf(c);
      for (const k of Eng.UNIT_KEYS) enemy[k] += m[k];
    }
    const own = Eng.fractions(Eng.mixOf(city));
    const foes = Eng.neighbors(s, city.id).map((n) => s.cities[n]).filter((c) => c.owner !== city.owner);
    let best = 'inf', bestScore = -1;
    for (const k of Eng.UNIT_KEYS) {
      if (!Eng.canDraft(city, k)) continue;
      let score = 0;
      for (const d of Eng.UNIT_KEYS) score += enemy[d] * Eng.matchup(k, d);
      // 每兵戰力（坦克、空軍較強；海軍只在港口城有用），並偏好城內比例還少的兵種，避免全是步兵
      // 海軍：鄰近的敵城是港口才有用
      score *= k === 'navy' ? (foes.some((c) => c.port) ? TK.TUNING.units.navyPort * 0.8 : TK.TUNING.units.navyInland) : Eng.unitWeight(k, s, city);
      score *= 1.4 - (own[k] || 0);
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

  function tryAttack(s, fid, city, focus) {
    const Eng = E();
    const avail = idle(s, city.id, fid).sort((a, b) => (b.lead + b.war) - (a.lead + a.war));
    const all = Eng.officers(s, city.id);
    if (!avail.length || city.troops < 8000) return;
    const targets = Eng.neighbors(s, city.id).map((id) => s.cities[id]).filter((c) => c.owner !== fid && !c.locked && (!TK.Diplomacy || TK.Diplomacy.canAttack(s, fid, c.owner)));
    if (!targets.length) return;

    const army = avail.slice(0, Math.min(3, all.length > 1 ? Math.min(avail.length, all.length - 1) : 1));
    const troops = Math.floor(city.troops * (focus ? 0.85 : 0.75));
    const lead = army[0].lead, war = Math.max.apply(null, army.map((g) => g.war));
    const myPow = troops * (0.6 * lead + 0.4 * war) / 100 * (0.7 + city.train / 100 * 0.6);

    let best = null, bestRatio = 0;
    for (const t of targets) {
      const gens = t.owner ? Eng.officers(s, t.id) : [];
      const tl = gens.length ? Math.max.apply(null, gens.map((g) => g.lead)) : 45;
      const tw = gens.length ? Math.max.apply(null, gens.map((g) => g.war)) : 45;
      const dPow = Math.max(1, t.troops * (0.6 * tl + 0.4 * tw) / 100 * (0.7 + t.train / 100 * 0.6) * (1 + t.defense / 2500));
      // 不輕易對中立勢力開戰
      const neutralRel = t.owner && TK.Diplomacy && TK.Diplomacy.stateOf(s, fid, t.owner) === 'neutral';
      const ratio = myPow / dPow * (t.owner ? 1 : 1.15) * (neutralRel ? 0.8 : 1);
      if (ratio > bestRatio) { bestRatio = ratio; best = t; }
    }
    // 留守兵力也要夠應付其他鄰敵
    const remain = city.troops - troops;
    const aggro = s.player ? Eng.diff(s).aiAggro : 1;
    if (best && bestRatio > (focus && best.id === focus ? 1.12 : 1.25) * aggro && (remain >= threatTo(s, city) * 0.5 || Eng.rand(s) < 0.08) && city.food > troops / 10 + 1000) {
      Eng.exec(s, fid, { type: 'attack', city: city.id, general: army[0].id, generals: army.map((g) => g.id), target: best.id, troops });
    }
  }

  TK.AI = { run, threatTo, defenseValue, estimate, appointOfficials };
})(globalThis.TK = globalThis.TK || {});
