/* 外交：同盟、停戰、宣戰、勸降。關係存在 s.relations['a|b'] = {state, months, rel}
 * state：neutral（可開戰）、war、truce（停戰中不可攻擊）、alliance（同盟不可攻擊）。規則為本作原創。 */
(function (TK) {
  'use strict';
  const E = () => TK.Engine;

  const STATE_LABEL = { neutral: '中立', war: '交戰', truce: '停戰', alliance: '同盟' };
  const ACTIONS = {
    alliance: { label: '同盟', cost: 300 },
    truce: { label: '停戰', cost: 200 },
    war: { label: '宣戰', cost: 0 },
    surrender: { label: '勸降', cost: 100 },
  };

  const key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  function rel(s, a, b) {
    if (!s.relations) s.relations = {};
    const k = key(a, b);
    if (!s.relations[k]) s.relations[k] = { state: 'neutral', months: 0, rel: 0 };
    return s.relations[k];
  }
  function setState(s, a, b, state, months) {
    const r = rel(s, a, b);
    r.state = state;
    r.months = months || 0;
    if (state === 'alliance') r.rel = Math.max(r.rel, 40);
    if (state === 'war') r.rel = Math.min(r.rel, -20);
  }
  function stateOf(s, a, b) {
    if (!a || !b || a === b) return 'neutral';
    return rel(s, a, b).state;
  }
  function canAttack(s, a, b) {
    if (!b) return true;
    if (a === b) return false;
    const st = stateOf(s, a, b);
    return st !== 'alliance' && st !== 'truce';
  }
  function onAttack(s, a, b) {
    if (!b) return;
    const r = rel(s, a, b);
    if (r.state === 'neutral') {
      r.state = 'war';
      r.rel -= 30;
      E().addLog(s, `${E().factionName(s, a)}向${E().factionName(s, b)}開戰！`, 'major', [a, b]);
    }
  }
  function power(s, fid) {
    return E().citiesOf(s, fid).reduce((a, c) => a + c.troops + 2000, 0);
  }
  function atWarWith(s, fid) {
    return Object.values(s.factions).filter((f) => f.alive && f.id !== fid && stateOf(s, fid, f.id) === 'war').map((f) => f.id);
  }

  function chance(s, fid, target, action, envoy) {
    const r = rel(s, fid, target);
    const ratio = power(s, fid) / Math.max(1, power(s, target));
    let p = 0;
    if (action === 'alliance') {
      if (r.state === 'war' || r.state === 'alliance') return 0;
      p = 0.08 + envoy.cha / 220 + r.rel / 200;
      if (atWarWith(s, target).some((e) => e !== fid && stateOf(s, fid, e) === 'war')) p += 0.15;
      if (ratio < 0.4) p -= 0.1;
    } else if (action === 'truce') {
      if (r.state !== 'war') return 0;
      p = 0.12 + envoy.int / 260 + r.rel / 300;
      if (ratio > 1.3) p += 0.15; else if (ratio < 0.7) p -= 0.08;
    } else if (action === 'war') {
      return r.state !== 'war' ? 1 : 0;
    } else if (action === 'surrender') {
      if (ratio < 3) return 0;
      p = Math.min(0.45, (ratio - 3) / 6) + envoy.cha / 400 - 0.05;
      if (r.state === 'alliance') p -= 0.1;
    }
    return Math.max(0.02, Math.min(0.85, p));
  }

  function absorb(s, fid, target) {
    for (const c of E().citiesOf(s, target)) c.owner = fid;
    for (const g of Object.values(s.generals)) {
      if (g.faction === target && g.status === 'active') {
        g.ruler = false;
        g.faction = fid;
        g.loyalty = 60 + E().rint(s, 0, 15);
      }
    }
    s.factions[target].alive = false;
    E().addLog(s, `${s.factions[target].name}歸順了${E().factionName(s, fid)}。`, 'major', [fid, target]);
  }

  // {type:'diplo', action, target, general}
  function exec(s, fid, cmd) {
    const a = ACTIONS[cmd.action];
    const target = cmd.target;
    if (!a) return { ok: false, msg: '未知的外交行動' };
    if (!target || target === fid || !s.factions[target] || !s.factions[target].alive) return { ok: false, msg: '對象不正確' };
    const g = s.generals[cmd.general];
    if (!g || g.faction !== fid || g.status !== 'active') return { ok: false, msg: '使者不正確' };
    if (g.acted) return { ok: false, msg: `${g.name}本月已行動` };
    const city = s.cities[g.city];
    if (city.gold < a.cost) return { ok: false, msg: `金不足（需 ${a.cost}）` };
    const p = chance(s, fid, target, cmd.action, g);
    if (p <= 0) return { ok: false, msg: `目前無法${a.label}` };
    city.gold -= a.cost;
    g.acted = true;
    const fname = E().factionName(s, fid), tname = E().factionName(s, target);
    const r = rel(s, fid, target);
    if (cmd.action === 'war') {
      const betrayal = r.state === 'alliance' || r.state === 'truce';
      setState(s, fid, target, 'war');
      if (betrayal) for (const x of Object.values(s.generals)) if (x.faction === fid && x.status === 'active' && !x.ruler) x.loyalty = Math.max(0, x.loyalty - 5);
      const msg = `${fname}向${tname}宣戰！${betrayal ? '（背棄盟約，部下忠誠下降）' : ''}`;
      E().addLog(s, msg, 'major', [fid, target]);
      return { ok: true, msg, success: true };
    }
    if (E().rand(s) >= p) {
      r.rel -= 5;
      const msg = `${g.name}出使${tname}，${a.label}遭到拒絕。`;
      E().addLog(s, msg, 'info', [fid, target]);
      return { ok: true, msg, success: false };
    }
    if (cmd.action === 'alliance') setState(s, fid, target, 'alliance');
    else if (cmd.action === 'truce') setState(s, fid, target, 'truce', 12);
    else if (cmd.action === 'surrender') absorb(s, fid, target);
    const msg = `${g.name}出使${tname}，${a.label}成功！`;
    E().addLog(s, msg, 'major', [fid, target]);
    return { ok: true, msg, success: true };
  }

  function monthTick(s) {
    for (const [k, r] of Object.entries(s.relations || {})) {
      if (r.state === 'truce' && --r.months <= 0) {
        r.state = 'neutral';
        const [a, b] = k.split('|');
        E().addLog(s, `${E().factionName(s, a)}與${E().factionName(s, b)}的停戰期滿。`, 'info', [a, b]);
      }
      if (r.rel > 0) r.rel -= 1; else if (r.rel < 0) r.rel += 1;
    }
  }

  // 電腦勢力的外交判斷；對玩家的提案放入 s.pending
  function aiConsider(s, fid) {
    const myP = power(s, fid);
    for (const f of Object.values(s.factions)) {
      if (!f.alive || f.id === fid) continue;
      const other = f.id;
      const st = stateOf(s, fid, other);
      let kind = '';
      if (st === 'war' && myP / Math.max(1, power(s, other)) < 0.6 && E().rand(s) < 0.1) kind = 'truce';
      else if (st === 'neutral' && E().rand(s) < 0.03) {
        if (atWarWith(s, fid).some((e) => stateOf(s, other, e) === 'war' && power(s, e) > myP)) kind = 'alliance';
      }
      if (!kind) continue;
      if (other === s.player) {
        s.pending = s.pending || [];
        if (!s.pending.some((p) => p.from === fid)) s.pending.push({ type: 'proposal', from: fid, kind });
      } else if (E().rand(s) < 0.5) {
        setState(s, fid, other, kind, kind === 'truce' ? 12 : 0);
        E().addLog(s, `${E().factionName(s, fid)}與${E().factionName(s, other)}${kind === 'alliance' ? '締結同盟' : '停戰'}。`, 'info', [fid, other]);
      }
    }
  }

  function respond(s, p, accept) {
    const fid = p.from;
    if (!s.factions[fid] || !s.factions[fid].alive) return '';
    const label = p.kind === 'alliance' ? '同盟' : '停戰';
    if (accept) {
      setState(s, fid, s.player, p.kind, p.kind === 'truce' ? 12 : 0);
      const msg = `接受了${E().factionName(s, fid)}的${label}提議。`;
      E().addLog(s, msg, 'major', [fid, s.player]);
      return msg;
    }
    rel(s, fid, s.player).rel -= 10;
    return `拒絕了${E().factionName(s, fid)}的${label}提議。`;
  }

  TK.Diplomacy = { STATE_LABEL, ACTIONS, rel, setState, stateOf, canAttack, onAttack, chance, exec, absorb, monthTick, aiConsider, respond, power, atWarWith };
})(globalThis.TK = globalThis.TK || {});
