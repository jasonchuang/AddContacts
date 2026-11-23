/* 歷史事件：依條件觸發，執行效果並以對話演出。事件文字為本作原創。
 * 自由模式只會發生非歷史事件（蝗災、豐年）。 */
(function (TK) {
  'use strict';
  const E = () => TK.Engine;
  const D = () => TK.Diplomacy;

  // 通用事件（各劇本皆可能發生）；劇本專屬事件在 scenarios.js
  const EVENTS = [
    {
      id: 'locusts', title: '蝗災', historical: false, repeat: true, cooldown: 24,
      cond: { month: 6, chance: 0.1 },
      effects: [{ do: 'harvest_mult', mult: 0.5 }],
      lines: [['', '各地蝗蟲蔽天，今年秋收恐怕只有往年的一半。']],
    },
    {
      id: 'bumper', title: '豐年', historical: false, repeat: true, cooldown: 24,
      cond: { month: 6, chance: 0.1 },
      effects: [{ do: 'harvest_mult', mult: 1.4 }],
      lines: [['', '風調雨順，今年各地可望豐收。']],
    },
  ];

  const ym = (y, m) => y * 12 + m - 1;
  const alive = (s, f) => s.factions[f] && s.factions[f].alive;
  function near(s, fid, city) {
    if (s.cities[city].owner === fid) return true;
    return E().neighbors(s, city).some((n) => s.cities[n].owner === fid);
  }
  function adjacent(s, a, b) {
    return E().citiesOf(s, a).some((c) => E().neighbors(s, c.id).some((n) => s.cities[n].owner === b));
  }

  function check(s, cond) {
    const now = ym(s.year, s.month);
    if (cond.from && now < ym(...cond.from)) return false;
    if (cond.until && now > ym(...cond.until)) return false;
    if (cond.month && s.month !== cond.month) return false;
    if ((cond.alive || []).some((f) => !alive(s, f))) return false;
    for (const [f, cs] of Object.entries(cond.owns || {})) if (cs.some((c) => s.cities[c].owner !== f)) return false;
    if (cond.near && !near(s, cond.near[0], cond.near[1])) return false;
    if (cond.neutral_city && s.cities[cond.neutral_city].owner) return false;
    for (const [c, f] of Object.entries(cond.city_owner_not || {})) if (s.cities[c].owner === f) return false;
    for (const [n, f] of Object.entries(cond.general_faction || {})) {
      const g = s.generals[n];
      if (!g || g.status !== 'active' || g.faction !== f) return false;
    }
    for (const n of cond.general_free || []) {
      const g = s.generals[n];
      if (!g || g.status !== 'free') return false;
    }
    for (const [n, f] of Object.entries(cond.general_elsewhere || {})) {
      const g = s.generals[n];
      if (!g || g.status === 'dead' || g.status === 'free' || g.ruler) return false;
      if (g.status === 'active' && g.faction === f) return false;
    }
    for (const [f, n] of Object.entries(cond.cities_at_least || {})) if (E().citiesOf(s, f).length < n) return false;
    if (cond.adjacent_factions && !adjacent(s, cond.adjacent_factions[0], cond.adjacent_factions[1])) return false;
    for (const [c, n] of Object.entries(cond.troops_below || {})) if (s.cities[c].troops >= n) return false;
    // 某些事件發生之後才會觸發；某些武將已經死亡
    for (const id of cond.after || []) if (!(s.events_done || {})[id] && (s.events_done || {})[id] !== 0) return false;
    for (const n of cond.general_dead || []) if (!s.generals[n] || s.generals[n].status !== 'dead') return false;
    if (cond.before_scenario && !(TK.scenarioById && TK.scenarioById(s.scenario).year < cond.before_scenario)) return false;
    if (cond.coop_below !== undefined && !(s.coop !== null && s.coop !== undefined && s.coop < cond.coop_below)) return false;
    if (cond.chance && E().rand(s) >= cond.chance) return false;
    return true;
  }

  function capital(s, fid) {
    const r = s.generals[s.factions[fid].ruler];
    if (r && r.status === 'active' && s.cities[r.city] && s.cities[r.city].owner === fid) return r.city;
    const cs = E().citiesOf(s, fid);
    return cs.length ? cs[0].id : null;
  }

  function join(s, name, fid, force) {
    const g = s.generals[name];
    if (!g || g.status === 'dead' || g.ruler || !alive(s, fid)) return;
    if (!force && g.status !== 'free') return;
    let dest = null;
    if (s.cities[g.city] && s.cities[g.city].owner === fid) dest = g.city;
    else if (s.cities[g.city]) dest = E().neighbors(s, g.city).find((n) => s.cities[n].owner === fid) || null;
    dest = dest || capital(s, fid);
    if (!dest) return;
    Object.assign(g, { faction: fid, status: 'active', hidden: false, loyalty: 90, formerFaction: null, city: dest });
  }

  // 日本投降：日方各城交還中國（臺灣、東北、華北……），太平洋的島嶼交給美軍；遊戲結束並評分
  function surrender(s) {
    const axis = Object.values(s.factions).filter((f) => f.alive && f.side === 'axis');
    if (!axis.length) return;
    const pick = (c) => {
      if (['沖繩', '塞班'].includes(c.id) && alive(s, 'usa')) return 'usa';
      if (alive(s, 'kmt')) return 'kmt';
      const near = E().neighbors(s, c.id).map((n) => s.cities[n].owner).find((o) => o && s.factions[o] && s.factions[o].side !== 'axis');
      return near || null;
    };
    for (const c of Object.values(s.cities)) {
      const f = c.owner && s.factions[c.owner];
      if (!f || f.side !== 'axis') continue;
      c.owner = c.id === '香港' ? null : pick(c);
      if (c.id === '香港') c.locked = true; // 戰後歸還英國
      c.troops = Math.round(c.troops * 0.3);
      c.mix = null;
      E().mixOf(c);
    }
    // 日方指揮官撤離；被日方關押的人獲釋
    for (const g of Object.values(s.generals)) if (g.status === 'active' && s.factions[g.faction] && s.factions[g.faction].side === 'axis') Object.assign(g, { status: 'dead', city: null, ruler: false });
    for (const g of Object.values(s.generals)) if (g.status === 'prisoner' && g.formerFaction && alive(s, g.formerFaction)) {
      const home = E().citiesOf(s, g.formerFaction)[0];
      if (home) Object.assign(g, { status: 'active', faction: g.formerFaction, city: home.id, formerFaction: null });
    }
    for (const f of axis) E().destroyFaction(s, f.id);
    const p = s.player && s.factions[s.player];
    if (p && p.alive && p.side !== 'axis') {
      const mine = E().citiesOf(s, s.player).length;
      const total = Object.values(s.cities).filter((c) => !c.locked).length;
      const score = Math.round(mine / total * 100);
      const rank = score >= 50 ? '甲等' : score >= 25 ? '乙等' : score >= 10 ? '丙等' : '丁等';
      s.over = { result: 'win', victory: true, score, rank, cities: mine };
      E().addLog(s, `抗戰勝利！${p.name}握有 ${mine} 城（全國 ${total} 城），評等：${rank}。`, 'major', [s.player]);
    } else if (!s.player) {
      s.over = { result: 'unified', faction: alive(s, 'kmt') ? 'kmt' : null };
    }
  }

  function apply(s, e) {
    // if_owner：只在該城屬於指定勢力時套用
    if (e.if_owner && (!s.cities[e.city] || s.cities[e.city].owner !== e.if_owner)) return;
    switch (e.do) {
      case 'coalition_against':
        for (const f of Object.values(s.factions)) if (f.alive && f.id !== e.faction) D().setState(s, f.id, e.faction, 'war');
        break;
      case 'loyalty':
        for (const g of Object.values(s.generals)) if (g.faction === e.faction && g.status === 'active' && !g.ruler) g.loyalty = Math.max(0, Math.min(100, g.loyalty + e.amount));
        break;
      case 'loyalty_of':
        for (const n of e.generals) if (s.generals[n] && s.generals[n].status === 'active') s.generals[n].loyalty = e.value;
        break;
      case 'gold': {
        const cap = capital(s, e.faction);
        if (cap) s.cities[cap].gold += e.amount;
        break;
      }
      case 'city_scale': s.cities[e.city][e.field] = Math.round(s.cities[e.city][e.field] * e.mult); break;
      case 'city_add': s.cities[e.city][e.field] = Math.max(0, s.cities[e.city][e.field] + e.amount); break;
      case 'troops': {
        const c = s.cities[e.city];
        const m = E().mixOf(c);
        m[e.unit] += e.amount;
        c.troops += e.amount;
        break;
      }
      case 'give_city': {
        const c = s.cities[e.city];
        if (!c.owner && alive(s, e.faction)) {
          c.owner = e.faction;
          c.mix = Object.assign(E().emptyUnits(), e.units);
          c.troops = E().unitsTotal(c.mix);
        }
        break;
      }
      case 'join': join(s, e.general, e.faction, e.force); break;
      case 'leave': {
        const g = s.generals[e.general];
        if (g && g.status === 'active' && !g.ruler) Object.assign(g, { faction: null, status: 'free', hidden: false });
        break;
      }
      case 'ruler_dies': E().rulerDies(s, e.faction); break;
      case 'relation': if (alive(s, e.a) && alive(s, e.b)) D().setState(s, e.a, e.b, e.state, e.months); break;
      case 'harvest_mult': s.harvest_mult = e.mult; break;
      case 'relocate': {
        const g = s.generals[e.general];
        if (!g || g.status !== 'active') break;
        const dest = s.cities[e.city] && s.cities[e.city].owner === g.faction ? e.city : (E().citiesOf(s, g.faction)[0] || {}).id;
        if (dest) g.city = dest;
        break;
      }
      case 'troops_scale': {
        const c = s.cities[e.city];
        c.troops = Math.round(c.troops * e.mult);
        E().mixOf(c);
        break;
      }
      case 'die': {
        const g = s.generals[e.general];
        if (!g || g.status === 'dead') break;
        if (g.ruler && g.status === 'active') E().rulerDies(s, g.faction);
        else Object.assign(g, { status: 'dead', city: null, ruler: false });
        break;
      }
      // 勢力參戰：改變陣營、開始行動（例：珍珠港事件後的美國）
      case 'activate': if (s.factions[e.faction]) Object.assign(s.factions[e.faction], { dormant: false, side: e.side || s.factions[e.faction].side }); break;
      case 'unlock': for (const id of [].concat(e.cities || e.city)) if (s.cities[id]) s.cities[id].locked = false; break;
      case 'coop':
        if (e.set !== undefined) s.coop = e.set;
        else if (s.coop !== null && s.coop !== undefined) s.coop = Math.max(0, Math.min(100, s.coop + e.amount));
        break;
      // 軟禁、出國等：離開舞台（不是去世）
      case 'retire': { const g = s.generals[e.general]; if (g && g.status !== 'dead') { if (g.ruler && g.status === 'active') E().rulerDies(s, g.faction); Object.assign(g, { status: 'retired', city: null, faction: null, ruler: false }); } break; }
      case 'gather': for (const g of Object.values(s.generals)) if (g.faction === e.faction && g.status === 'active' && s.cities[e.city] && s.cities[e.city].owner === e.faction) g.city = e.city; break;
      case 'axis_surrender': surrender(s); break;
      // 一致抗日：所有中方勢力（彼此沒有交戰的）結為同盟
      case 'united_front': {
        const ids = Object.values(s.factions).filter((f) => f.alive && f.side === 'allies' && f.id !== 'usa').map((f) => f.id);
        for (const a of ids) for (const b of ids) if (a < b && D().stateOf(s, a, b) !== 'war') D().setState(s, a, b, 'alliance', 48);
        break;
      }
      case 'rename': if (alive(s, e.faction)) s.factions[e.faction].name = e.name; break;
      case 'absorb': if (alive(s, e.faction) && alive(s, e.into)) D().absorb(s, e.into, e.faction); break;
      case 'seize': {
        // 城池易主：原守將退往本國其他城
        const c = s.cities[e.city], old = c.owner;
        if (!alive(s, e.faction) || old === e.faction) break;
        c.owner = e.faction;
        if (old) {
          const back = E().citiesOf(s, old).find((x) => x.id !== c.id);
          for (const g of Object.values(s.generals)) {
            if (g.city === c.id && g.faction === old && g.status === 'active') {
              if (back) g.city = back.id; else Object.assign(g, { status: 'free', faction: null });
            }
          }
          if (!back) E().destroyFaction(s, old);
        }
        break;
      }
      default: break;
    }
  }

  // 每月檢查一次，回傳觸發的事件
  function run(s) {
    s.events_done = s.events_done || {};
    const historical = (s.mode || 'historical') === 'historical';
    const now = ym(s.year, s.month);
    const fired = [];
    // 190 劇本的歷史事件只在 190 劇本發生；其他劇本有各自的事件
    const sid = s.scenario || '190';
    const own = TK.scenarioById ? TK.scenarioById(sid).events || [] : [];
    for (const ev of EVENTS.concat(own)) {
      if (ev.historical && !historical) continue;
      if (ev.historical && sid !== '190' && !own.includes(ev)) continue;
      const last = s.events_done[ev.id];
      if (last !== undefined && (!ev.repeat || now - last < (ev.cooldown || 12))) continue;
      if (!check(s, ev.cond)) continue;
      s.events_done[ev.id] = now;
      for (const e of ev.effects || []) apply(s, e);
      // 抉擇事件：由玩家決定（存入 s.choices，畫面詢問後呼叫 choose）；電腦勢力依 aiChoice 自動選
      if (ev.choices) {
        if (ev.chooser === s.player) { s.choices = s.choices || []; s.choices.push(ev.id); }
        else choose(s, ev.id, ev.aiChoice || 0, true);
      }
      E().addLog(s, `【${ev.title}】${ev.lines[0][1]}`, 'major', []);
      fired.push(ev);
    }
    return fired;
  }

  function findEvent(s, id) {
    const own = TK.scenarioById ? TK.scenarioById(s.scenario).events || [] : [];
    return EVENTS.concat(own).find((e) => e.id === id) || null;
  }
  // 套用抉擇；回傳所選的選項（含要演出的台詞）
  function choose(s, id, idx, auto) {
    const ev = findEvent(s, id);
    if (!ev || !ev.choices || !ev.choices[idx]) return null;
    if (!auto) s.choices = (s.choices || []).filter((x) => x !== id);
    const c = ev.choices[idx];
    for (const e of c.effects || []) apply(s, e);
    E().addLog(s, `【${ev.title}】${c.label}：${c.lines[c.lines.length - 1][1]}`, 'major', []);
    return c;
  }

  TK.Events = { EVENTS, run, check, choose, findEvent };
})(globalThis.TK = globalThis.TK || {});
