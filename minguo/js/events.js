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

  function apply(s, e) {
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
      case 'city_add': s.cities[e.city][e.field] += e.amount; break;
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
          c.mix = Object.assign({ spear: 0, cav: 0, xbow: 0 }, e.units);
          c.troops = c.mix.spear + c.mix.cav + c.mix.xbow;
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
