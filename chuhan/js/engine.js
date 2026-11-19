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

  // 一騎討：雙方體力 100，輪流出招；武力高者命中率與傷害較高。回傳每一招的紀錄供動畫播放。
  function duel(s, a, d) {
    let hpA = 100, hpD = 100;
    const bouts = [];
    for (let n = 0; n < 12 && hpA > 0 && hpD > 0; n++) {
      const who = n % 2 === 0 ? 'a' : 'd';
      const me = who === 'a' ? a : d, foe = who === 'a' ? d : a;
      const hitP = Math.min(0.9, Math.max(0.35, 0.6 + (me.war - foe.war) / 60));
      let dmg = 0, crit = false;
      if (rand(s) < hitP) {
        dmg = Math.max(6, Math.round(14 + (me.war - 60) * 0.45 + rint(s, 0, 10)));
        if (rand(s) < 0.12 + Math.max(0, me.war - 85) / 50) { dmg = Math.round(dmg * 1.8); crit = true; }
      }
      if (who === 'a') hpD = Math.max(0, hpD - dmg); else hpA = Math.max(0, hpA - dmg);
      bouts.push({ who, dmg, crit, hpA, hpD });
    }
    const winner = hpD <= 0 ? 'a' : hpA <= 0 ? 'd' : (hpA >= hpD ? 'a' : 'd');
    return { winner, bouts };
  }
  function pick(s, arr) { return arr[Math.floor(rand(s) * arr.length)]; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // ---------- 建立 / 查詢 ----------
  // 難易度：容易、中等、困難
  const DIFFICULTY = {
    easy: { label: '容易', desc: '玩家收入 ×1.2、戰力 ×1.1；電腦收入 ×0.8、出兵保守；登用較容易', playerIncome: 1.2, aiIncome: 0.8, playerPower: 1.1, aiPower: 1, aiAggro: 1.15, recruit: 0.1 },
    normal: { label: '中等', desc: '標準規則', playerIncome: 1, aiIncome: 1, playerPower: 1, aiPower: 1, aiAggro: 1, recruit: 0 },
    hard: { label: '困難', desc: '電腦收入 ×1.25、戰力 ×1.1、出兵積極', playerIncome: 1, aiIncome: 1.25, playerPower: 1, aiPower: 1.1, aiAggro: 0.92, recruit: 0 },
  };
  function diff(s) { return DIFFICULTY[(s && s.difficulty) || 'normal'] || DIFFICULTY.normal; }
  function incomeMult(s, fid) { if (!fid) return 1; const d = diff(s); return fid === s.player ? d.playerIncome : d.aiIncome; }
  function powerMult(s, fid) { if (!fid || !s.player) return 1; const d = diff(s); return fid === s.player ? d.playerPower : d.aiPower; }

  function newGame(playerFaction, seed, mode, difficulty) {
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
      mode: mode || 'historical',
      difficulty: DIFFICULTY[difficulty] ? difficulty : 'normal',
      relations: {},
      events_done: {},
      harvest_mult: 1,
      pending: [],
      scenario: sc.id || '190',
    };
    for (const f of sc.factions) s.factions[f.id] = Object.assign({ alive: true }, f);
    for (const c of sc.cities) { s.cities[c.id] = c; mixOf(c); }
    for (const g of sc.generals) s.generals[g.id] = Object.assign({ acted: false, formerFaction: null }, g);
    for (const [a, b, st, months] of sc.relations || []) {
      if (TK.Diplomacy && s.factions[a] && s.factions[b]) TK.Diplomacy.setState(s, a, b, st, months || (st === 'truce' ? 12 : 0));
    }
    addLog(s, `${yearText(s.year)}年，${sc.title}。${sc.desc}`, 'sys');
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
  // 西元前以負數儲存，顯示為「前206年」
  function yearText(y) { return y < 0 ? `前${-y}` : `${y}`; }
  function dateStr(s) { return `${yearText(s.year)}年${s.month}月`; }
  function addLog(s, text, kind, factions) {
    s.log.push({ date: dateStr(s), text, kind: kind || 'info', factions: factions || [] });
    if (s.log.length > 400) s.log.splice(0, s.log.length - 400);
  }

  // ---------- 兵種 ----------
  // 槍剋騎、騎剋弩、弩剋槍。cost＝每 1000 兵所需金
  const UNITS = {
    spear: { name: '槍兵', short: '槍', cost: 100, desc: '陣型穩固、損失較少，剋制騎兵' },
    cav: { name: '騎兵', short: '騎', cost: 200, desc: '進攻時衝鋒加成，剋制弩兵' },
    xbow: { name: '弩兵', short: '弩', cost: 150, desc: '守城時加成、首輪齊射，剋制槍兵' },
  };
  const UNIT_KEYS = ['spear', 'cav', 'xbow'];
  const BEATS = { spear: 'cav', cav: 'xbow', xbow: 'spear' };
  const APT_MULT = { S: 1.18, A: 1.07, B: 1, C: 0.9 };

  function matchup(a, d) { return a === d ? 1 : BEATS[a] === d ? 1.3 : 0.8; }

  // 武將兵種適性：劇本可指定，否則依能力推得
  function aptitude(g, type) {
    if (!g) return 'C';
    const o = (TK.SCENARIO.aptitude || {})[g.name];
    if (o && o[type]) return o[type];
    if (type === 'spear') return g.lead >= 85 || g.war >= 88 ? 'A' : g.lead >= 68 ? 'B' : 'C';
    if (type === 'cav') return g.war >= 85 ? 'A' : g.war >= 70 ? 'B' : 'C';
    return g.int >= 85 ? 'A' : g.int >= 68 || g.lead >= 80 ? 'B' : 'C';
  }

  const FACTION_MIX = {
    ma: { spear: 0.3, cav: 0.5, xbow: 0.2 }, gongsun: { spear: 0.3, cav: 0.5, xbow: 0.2 }, dong: { spear: 0.35, cav: 0.45, xbow: 0.2 },
    sun: { spear: 0.4, cav: 0.15, xbow: 0.45 }, liubiao: { spear: 0.4, cav: 0.15, xbow: 0.45 },
  };
  function defaultMix(c) {
    const r = !c.owner ? { spear: 0.55, cav: 0.1, xbow: 0.35 } : FACTION_MIX[c.owner] || { spear: 0.45, cav: 0.25, xbow: 0.3 };
    const m = { spear: Math.floor(c.troops * r.spear), cav: Math.floor(c.troops * r.cav), xbow: 0 };
    m.xbow = c.troops - m.spear - m.cav;
    return m;
  }
  // 依比例分配 total，回傳整數且總和精確
  function scaleMix(mix, total) {
    const sum = UNIT_KEYS.reduce((a, k) => a + (mix[k] || 0), 0);
    const out = { spear: 0, cav: 0, xbow: 0 };
    if (total <= 0) return out;
    if (sum <= 0) { out.spear = total; return out; }
    let acc = 0, big = 'spear';
    for (const k of UNIT_KEYS) {
      out[k] = Math.floor((mix[k] || 0) * total / sum);
      acc += out[k];
      if ((mix[k] || 0) > (mix[big] || 0)) big = k;
    }
    out[big] += total - acc;
    return out;
  }
  // 取得城市兵種組成；troops 為準，組成不一致時依比例校正
  function mixOf(c) {
    if (!c.mix) c.mix = defaultMix(c);
    const sum = c.mix.spear + c.mix.cav + c.mix.xbow;
    if (sum !== c.troops) c.mix = scaleMix(c.mix, c.troops);
    return c.mix;
  }
  function addUnits(c, units, train) {
    mixOf(c);
    const n = UNIT_KEYS.reduce((a, k) => a + (units[k] || 0), 0);
    if (n <= 0) return;
    if (train !== undefined) c.train = Math.round((c.train * c.troops + train * n) / (c.troops + n));
    for (const k of UNIT_KEYS) c.mix[k] += units[k] || 0;
    c.troops += n;
  }
  function takeUnits(c, units) {
    mixOf(c);
    for (const k of UNIT_KEYS) { c.mix[k] -= units[k] || 0; c.troops -= units[k] || 0; }
  }
  function unitsTotal(u) { return UNIT_KEYS.reduce((a, k) => a + (u[k] || 0), 0); }
  // 指令可給 units（分兵種）或 troops（依城內比例）
  function unitsFromCmd(c, cmd) {
    mixOf(c);
    if (cmd.units) {
      const u = {};
      for (const k of UNIT_KEYS) {
        u[k] = Math.floor(cmd.units[k] || 0);
        if (u[k] < 0 || u[k] > c.mix[k]) return null;
      }
      return u;
    }
    const n = Math.floor(cmd.troops || 0);
    if (n < 0 || n > c.troops) return null;
    return scaleMix(c.mix, n);
  }
  function fractions(u) {
    const t = unitsTotal(u) || 1;
    return { spear: (u.spear || 0) / t, cav: (u.cav || 0) / t, xbow: (u.xbow || 0) / t };
  }
  function mixName(u) {
    return UNIT_KEYS.filter((k) => u[k] > 0).map((k) => `${UNITS[k].short}${u[k]}`).join('・') || '無兵';
  }

  // ---------- 指令 ----------
  const DEV = {
    farm: { label: '開墾', cost: 50, stat: 'pol', key: 'farm' },
    commerce: { label: '商業', cost: 50, stat: 'pol', key: 'commerce' },
    defense: { label: '築城', cost: 60, stat: 'lead', key: 'defense' },
    order: { label: '巡察', cost: 30, stat: 'cha', key: 'order' },
    train: { label: '訓練', cost: 0, stat: 'lead', key: 'train' },
  };

  // ---------- 楚漢特色：截斷糧道、反間、封王 ----------
  const RAID_COST = 100, DISCORD_COST = 300;
  function raidRisk(g) { return clamp(0.35 - g.war / 300 - (g.skill === '游擊' ? 0.2 : 0), 0.04, 0.4); }
  function discordChance(s, spy, t) {
    return clamp(0.2 + (spy.int - t.int) / 150 + (t.loyalty < 80 ? 0.15 : 0) + (spy.skill === '奇計' ? 0.25 : 0), 0.05, 0.85);
  }
  // 野心：統率、武力、智略的平均；野心 80 以上的王，忠誠每月 -1
  function ambition(g) { return (g.lead + g.war + g.int) / 3; }
  // 受封的王自立：忠誠低於 60 時每月有機會帶著封地獨立
  function kingsTick(s) {
    for (const g of Object.values(s.generals)) {
      if (!g.king || g.status !== 'active' || !g.faction) continue;
      const c = s.cities[g.king];
      if (!c || c.owner !== g.faction) { g.king = null; continue; }
      if (ambition(g) >= 80 && g.loyalty > 0) g.loyalty -= 1;
      if (g.loyalty < 60 && rand(s) < (60 - g.loyalty) / 150) rebel(s, g, c);
    }
  }
  function rebel(s, g, c) {
    const old = g.faction, fid = `k_${g.id}`;
    if (s.factions[fid]) return;
    s.factions[fid] = { id: fid, name: `${c.name}王`, ruler: g.name, color: '#6a6a6a', heirs: [], alive: true };
    c.owner = fid; c.governor = g.id;
    g.faction = fid; g.ruler = true; g.loyalty = 100; g.king = null; g.city = c.id;
    // 城中原勢力的武將：忠誠不高的跟著自立，其餘撤回原勢力的鄰城（沒有就回首都，再沒有就下野）
    const back = neighbors(s, c.id).find((n) => s.cities[n].owner === old) || (citiesOf(s, old)[0] || {}).id;
    for (const x of Object.values(s.generals)) {
      if (x === g || x.faction !== old || x.city !== c.id || x.status !== 'active') continue;
      if (x.loyalty < 75 && !x.ruler) x.faction = fid;
      else if (back) x.city = back;
      else Object.assign(x, { faction: null, status: 'free', hidden: false });
    }
    if (TK.Diplomacy) TK.Diplomacy.setState(s, fid, old, 'war');
    addLog(s, `${g.name}據${c.name}自立，與${factionName(s, old)}反目！`, 'major', [old, fid]);
    if (citiesOf(s, old).length === 0) destroyFaction(s, old);
  }

  // 官職：軍師（勢力）與太守（城），人已離開或不在職位上就視為空缺
  function strategistOf(s, fid) {
    const f = fid && s.factions[fid];
    const g = f && f.strategist ? s.generals[f.strategist] : null;
    return g && g.status === 'active' && g.faction === fid && !g.ruler ? g : null;
  }
  function governorOf(s, c) {
    const g = c && c.governor ? s.generals[c.governor] : null;
    return g && g.status === 'active' && g.faction === c.owner && g.city === c.id ? g : null;
  }
  // 每月金收入（商業與人口，受民心影響；太守依政務加成）與軍餉（每 250 兵 1 金）
  function goldIncome(c, s) {
    const base = c.commerce * 0.35 * (0.5 + c.order / 200) + c.pop / 10000;
    const gov = s ? governorOf(s, c) : null;
    return Math.round(base * (gov ? (1 + gov.pol / 500) * (gov.skill === '鎮國' ? 1.6 : 1) : 1));
  }
  function upkeep(c) { return Math.floor(c.troops / 250); }
  // 一城可養的兵力上限：人口的 12%（至少 15000）
  function troopCap(city) { return Math.max(15000, Math.floor(city.pop * 0.12)); }
  function maxDraft(s, city, g, type) {
    const cost = UNITS[type || 'spear'].cost;
    return Math.max(0, Math.min(g.cha * 100, Math.floor(city.gold * 1000 / cost), Math.floor(city.pop / 5), troopCap(city) - city.troops));
  }

  function recruitChance(s, g, target) {
    if (target.ruler) return 0;
    const bonus = g.faction === s.player ? diff(s).recruit : 0;
    if (target.status === 'free') return clamp(0.15 + (g.cha / 100) * 0.55 + bonus, 0, 0.85);
    if (target.status === 'prisoner') return clamp(0.05 + (g.cha / 100) * 0.45 - (target.loyalty - 50) / 200, 0.02, 0.6);
    return 0;
  }

  // 舊存檔補上新欄位
  function ensure(s) {
    if (!s.relations) s.relations = {};
    if (!s.events_done) s.events_done = {};
    if (!s.pending) s.pending = [];
    if (!s.mode) s.mode = 'historical';
    if (!s.difficulty) s.difficulty = 'normal';
    if (!s.harvest_mult) s.harvest_mult = 1;
    if (!s.scenario) s.scenario = '190';
  }

  // 回傳 {ok, msg}
  function exec(s, fid, cmd) {
    if (s.over) return fail('遊戲已結束');
    ensure(s);
    if (cmd.type === 'diplo') return TK.Diplomacy.exec(s, fid, cmd);
    const city = s.cities[cmd.city];
    if (!city || city.owner !== fid) return fail('不是我方城市');
    let g = null;
    const needsExec = !['reward', 'release', 'execute', 'appoint', 'enfeoff'].includes(cmd.type);
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
        const type = UNITS[cmd.unit] ? cmd.unit : 'spear';
        const amt = Math.floor(cmd.amount || 0);
        const max = maxDraft(s, city, g, type);
        if (amt < 100) return fail('徵兵數至少 100');
        if (amt > max) return fail(`最多可徵 ${max}`);
        city.gold -= Math.ceil(amt * UNITS[type].cost / 1000);
        city.pop -= amt;
        addUnits(city, { [type]: amt }, 20);
        city.order = Math.max(0, city.order - Math.ceil(amt / 2000));
        g.acted = true;
        return ok(`${g.name}於${city.name}徵募${UNITS[type].name} ${amt}`);
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
      case 'appoint': {
        // 任命官職：軍師（全勢力一位）、太守（每城一位）；不消耗行動
        const t = cmd.target ? s.generals[cmd.target] : null;
        if (t && (t.faction !== fid || t.status !== 'active')) return fail('找不到武將');
        if (cmd.role === 'strategist') {
          if (t && t.ruler) return fail('君主不能兼任軍師');
          s.factions[fid].strategist = t ? t.id : null;
          return ok(t ? `任命${t.name}為軍師` : '解除了軍師的職務');
        }
        if (cmd.role === 'governor') {
          if (t && t.city !== city.id) return fail('太守必須駐在本城');
          city.governor = t ? t.id : null;
          return ok(t ? `任命${t.name}為${city.name}太守` : `解除了${city.name}太守`);
        }
        return fail('未知的官職');
      }
      case 'raid': {
        // 截斷糧道：派武將潛入相鄰敵城燒糧；武力高、有「游擊」特技者效果好又不易被抓
        const t = s.cities[cmd.target];
        if (!t || !t.owner || t.owner === fid || !neighbors(s, city.id).includes(t.id)) return fail('只能襲擾相鄰的敵城');
        if (city.gold < RAID_COST) return fail('金不足');
        city.gold -= RAID_COST;
        g.acted = true;
        const guerrilla = g.skill === '游擊';
        const caught = rand(s) < raidRisk(g);
        if (caught) {
          Object.assign(g, { status: 'prisoner', formerFaction: fid, faction: null, city: t.id });
          return ok(`${g.name}襲擾${t.name}糧道時被擒！`, null);
        }
        const burn = Math.round(t.food * Math.min(0.6, 0.15 + g.war / 500 + (guerrilla ? 0.2 : 0)));
        t.food -= burn;
        t.order = Math.max(0, t.order - (guerrilla ? 8 : 4));
        const scare = Math.round(t.troops * (guerrilla ? 0.04 : 0.02));
        t.troops -= scare;
        addLog(s, `${g.name}襲擾${t.name}的糧道，燒毀軍糧 ${burn}`, 'major', [fid, t.owner]);
        return ok(`${g.name}襲擾${t.name}糧道，燒毀軍糧 ${burn}，守軍逃散 ${scare}`);
      }
      case 'enfeoff': {
        // 封王：把本城封給有功的部下。忠誠立刻全滿、擔任太守，但野心大的王忠誠會慢慢下滑，太低可能自立
        const t = s.generals[cmd.target];
        if (!t || t.faction !== fid || t.status !== 'active' || t.city !== city.id) return fail('找不到武將');
        if (t.ruler) return fail('君主不能受封');
        if (t.king) return fail(`${t.name}已經是王了`);
        if (Object.values(s.generals).some((x) => x.king === city.id && x.status === 'active' && x.faction === fid)) return fail(`${city.name}已有封王`);
        if (citiesOf(s, fid).length < 3) return fail('至少要有三座城才能封王');
        t.king = city.id;
        t.loyalty = 100;
        city.governor = t.id;
        addLog(s, `${t.name}受封為${city.name}王`, 'major', [fid]);
        return ok(`封${t.name}為${city.name}王`);
      }
      case 'discord': {
        // 反間計：離間敵方武將與其君主
        const t = s.generals[cmd.target];
        if (!t || t.status !== 'active' || !t.faction || t.faction === fid || t.ruler) return fail('對象不正確');
        if (city.gold < DISCORD_COST) return fail('金不足');
        city.gold -= DISCORD_COST;
        g.acted = true;
        if (rand(s) >= discordChance(s, g, t)) return ok(`${g.name}的反間計被${t.name}識破了`);
        const owner = t.faction, wasStrategist = strategistOf(s, owner) === t;
        t.loyalty = Math.max(0, t.loyalty - 35);
        let msg = `反間計成功！${s.factions[owner].ruler}開始猜忌${t.name}`;
        if (wasStrategist) { s.factions[owner].strategist = null; msg += `，罷去了他的軍師之職`; }
        if (t.loyalty <= 45) {
          if (t.name === '范增') {
            Object.assign(t, { status: 'dead', city: null });
            msg += `。${t.name}憤而離去，途中背疽發作而死`;
          } else {
            Object.assign(t, { status: 'free', faction: null, hidden: false, loyalty: 0 });
            msg += `。${t.name}離開了${factionName(s, owner)}`;
          }
        }
        addLog(s, msg, 'major', [fid, owner]);
        return ok(msg);
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
        const units = unitsFromCmd(city, cmd);
        const gold = Math.floor(cmd.gold || 0), food = Math.floor(cmd.food || 0);
        if (!units || gold < 0 || gold > city.gold || food < 0 || food > city.food) {
          return fail('兵、金或糧數量不正確');
        }
        const troops = unitsTotal(units);
        mixOf(dest);
        takeUnits(city, units);
        addUnits(dest, units, city.train);
        city.gold -= gold; dest.gold += gold;
        city.food -= food; dest.food += food;
        for (const m of movers) { m.city = dest.id; m.acted = true; }
        return ok(`${movers.map((m) => m.name).join('、')}率兵 ${troops} 移動至${dest.name}`);
      }
      case 'attack': {
        const target = s.cities[cmd.target];
        if (!target || target.owner === fid || !neighbors(s, city.id).includes(target.id)) return fail('無法進攻該城');
        if (TK.Diplomacy && !TK.Diplomacy.canAttack(s, fid, target.owner)) {
          return fail(`與${factionName(s, target.owner)}處於${TK.Diplomacy.STATE_LABEL[TK.Diplomacy.stateOf(s, fid, target.owner)]}，不能進攻`);
        }
        const ids = uniq([g.id].concat(cmd.generals || [])).slice(0, 3);
        const army = ids.map((id) => s.generals[id]);
        for (const m of army) {
          if (!m || m.faction !== fid || m.city !== city.id || m.status !== 'active' || m.acted) return fail('有武將無法出陣');
        }
        const units = unitsFromCmd(city, cmd);
        if (!units) return fail('兵力不足');
        const troops = unitsTotal(units);
        if (troops < 1000) return fail('出陣兵力至少 1000');
        const foodNeed = Math.ceil(troops / 10);
        if (city.food < foodNeed) return fail(`軍糧不足（需 ${foodNeed}）`);
        city.food -= foodNeed;
        takeUnits(city, units);
        for (const m of army) m.acted = true;
        if (TK.Diplomacy) TK.Diplomacy.onAttack(s, fid, target.owner);
        const atkInfo = { faction: fid, generals: army, troops, units, train: city.train, from: city.id };
        if (cmd.interactive) {
          const live = battleStart(s, atkInfo, target.id, { interactive: true });
          return { ok: true, msg: `${army[0].name}率兵 ${troops} 進攻${target.name}`, live };
        }
        const res = battle(s, atkInfo, target.id);
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


  // ---------- 特技 ----------
  // atk：進攻時戰力倍率；def：守城時倍率；few：兵力劣勢時再加成（背水一戰）；scheme：計略發動率加成；duel：單挑武力加成
  const SKILLS = {
    兵仙: { desc: '用兵如神：進攻戰力 ×1.3，兵力劣勢時再 ×1.25（背水一戰），計略率提高', atk: 1.3, def: 1.15, few: 1.25, scheme: 0.12 },
    霸王: { desc: '力拔山兮：進攻戰力 ×1.3，單挑武力 +8', atk: 1.3, def: 1.1, duel: 8 },
    運籌: { desc: '運籌帷幄：同軍計略率大幅提高', scheme: 0.18 },
    奇計: { desc: '六出奇計：計略率提高', scheme: 0.14 },
    廣武: { desc: '廣武君：守城戰力 ×1.15，計略率提高', def: 1.15, scheme: 0.1 },
    亞父: { desc: '老謀深算：計略率提高', scheme: 0.12 },
    鎮國: { desc: '鎮國撫民：擔任太守時收入加倍', },
    游擊: { desc: '游擊戰：進攻戰力 ×1.15', atk: 1.15 },
    黥布: { desc: '驍勇：進攻戰力 ×1.15，單挑武力 +4', atk: 1.15, duel: 4 },
    鴻門: { desc: '鴻門護主：守城戰力 ×1.1，單挑武力 +4', def: 1.1, duel: 4 },
    名將: { desc: '秦之名將：守城戰力 ×1.15', def: 1.15, atk: 1.05 },
    義士: { desc: '五百義士：守城戰力 ×1.15', def: 1.15 },
  };
  function skillsOf(gens) { return gens.map((g) => g && g.skill && SKILLS[g.skill]).filter(Boolean); }

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

  // 戰鬥分成三步：battleStart（佈陣）→ battleRound（一回合，可下指令）→ battleEnd（結算）。
  // 電腦的戰鬥一口氣跑完；玩家主動出征時由畫面逐段下指令（interactive）。
  // 指令：normal 一般、assault 突擊、hold 穩守、scheme 計略、duel 單挑（只能在第一回合）、retreat 撤退
  const ORDERS = {
    normal: { label: '一般', desc: '照常交戰' },
    assault: { label: '突擊', desc: '對敵傷害 ×1.35，我方損失 ×1.25' },
    hold: { label: '穩守', desc: '我方損失 ×0.65，對敵傷害 ×0.75' },
    scheme: { label: '計略', desc: '依智略施展計謀，成功時敵軍大亂；失敗會被反制' },
    duel: { label: '單挑', desc: '派最強的武將挑戰敵將（只能在開戰時）' },
    retreat: { label: '撤退', desc: '收兵回城，殿後部隊會有些損失' },
  };

  function battleStart(s, atk, targetId, opts) {
    opts = opts || {};
    const city = s.cities[targetId];
    const defOwner = city.owner;
    const defGens = defOwner ? officers(s, city.id).sort((a, b) => b.lead - a.lead).slice(0, 3) : [];
    const A = Object.assign(sideStats(atk.generals), { troops: atk.troops, train: atk.train });
    const D = Object.assign(sideStats(defGens), { troops: city.troops, train: city.train });
    // 軍師運籌帷幄：計略以軍師與出陣武將中較高的智略計算（軍師不在場略打折扣）
    const sa = strategistOf(s, atk.faction), sd = defOwner ? strategistOf(s, defOwner) : null;
    if (sa) A.int = Math.max(A.int, sa.int - 5);
    if (sd) D.int = Math.max(D.int, sd.int - 5);
    // 兵種：雙方組成比例、相剋、主將適性
    const aUnits = atk.units || { spear: atk.troops, cav: 0, xbow: 0 };
    const dUnits = Object.assign({}, mixOf(city));
    const fA = fractions(aUnits), fD = fractions(dUnits);
    let mA = 0, mD = 0, aptA = 0, aptD = 0;
    for (const a of UNIT_KEYS) {
      for (const d of UNIT_KEYS) { mA += fA[a] * fD[d] * matchup(a, d); mD += fD[d] * fA[a] * matchup(d, a); }
      aptA += fA[a] * APT_MULT[aptitude(A.commander, a)];
      aptD += fD[a] * (D.commander ? APT_MULT[aptitude(D.commander, a)] : 1);
    }
    // 特技：出陣武將的特技加成；軍師的特技只影響計略
    let bonusA = mA * aptA * (1 + 0.12 * fA.cav);
    let bonusD = mD * aptD * (1 + 0.15 * fD.xbow);
    const skA = skillsOf(atk.generals), skD = skillsOf(defGens);
    for (const k of skA) bonusA *= k.atk || 1;
    for (const k of skD) bonusD *= k.def || 1;
    const fewSkill = skA.find((k) => k.few);
    const fewA = !!fewSkill && atk.troops < city.troops;
    if (fewA) bonusA *= fewSkill.few;
    bonusA *= powerMult(s, atk.faction);
    bonusD *= powerMult(s, defOwner);
    const ctx = {
      city, atk, defOwner, defGens, A, D, aUnits, dUnits, fA, fD,
      bonusA, bonusD, fewA,
      schemeA: [...skA, ...skillsOf([sa])].reduce((t, k) => t + (k.scheme || 0), 0),
      schemeD: [...skD, ...skillsOf([sd])].reduce((t, k) => t + (k.scheme || 0), 0),
      sturdyA: 1 - 0.1 * fA.spear, sturdyD: 1 - 0.1 * fD.spear,
      A0: A.troops, D0: D.troops,
      aName: factionName(s, atk.faction), dName: factionName(s, defOwner),
      parties: [atk.faction, defOwner].filter(Boolean),
      lines: [], round: 0, result: null, schemes: 0, interactive: !!opts.interactive, dueled: false,
    };
    ctx.aCmd = A.commander ? A.commander.name : '';
    ctx.dCmd = D.commander ? D.commander.name : FREE_STATS.name;
    ctx.lines.push(`${ctx.aName}（${ctx.aCmd}，${ctx.A0}兵）自${atk.from}進攻${city.name}（${ctx.dName}，${ctx.dCmd}，${ctx.D0}兵）`);
    // frames：給戰鬥畫面逐格播放 {a, d, ev, kind}
    ctx.frames = [{ a: ctx.A0, d: ctx.D0, ev: null }];
    const domA = UNIT_KEYS.reduce((b, k) => (fA[k] > fA[b] ? k : b), 'spear');
    const domD = UNIT_KEYS.reduce((b, k) => (fD[k] > fD[b] ? k : b), 'spear');
    if (mA > 1.06) ctx.lines.push(`兵種相剋：${ctx.aName}的${UNITS[domA].name}佔上風`);
    else if (mD > 1.06) ctx.lines.push(`兵種相剋：守軍的${UNITS[domD].name}佔上風`);
    if (fewA) {
      ctx.lines.push(`背水一戰！${ctx.aCmd}以寡擊眾，士卒人人死戰`);
      ctx.frames.push({ a: ctx.A0, d: ctx.D0, ev: `背水一戰！${ctx.aName}士氣大振`, kind: 'charge' });
    }
    ctx.ahero = atk.generals.slice().sort((a, b) => b.war - a.war)[0] || null;
    ctx.dhero = defGens.slice().sort((a, b) => b.war - a.war)[0] || null;
    ctx.canDuel = !!(ctx.ahero && ctx.dhero);
    // 電腦的戰鬥：雙方猛將夠強時約六成機率自動單挑；玩家指揮時改由玩家決定
    if (!ctx.interactive && ctx.canDuel && Math.max(ctx.ahero.war, ctx.dhero.war) >= 70 && Math.min(ctx.ahero.war, ctx.dhero.war) >= 50 && rand(s) < 0.6) doDuel(s, ctx);
    return ctx;
  }

  function doDuel(s, ctx) {
    if (ctx.dueled || !ctx.canDuel) return;
    ctx.dueled = true;
    const { ahero, dhero, A, D } = ctx;
    const duelBonus = (g) => skillsOf([g]).reduce((t, k) => t + (k.duel || 0), 0);
    const d = duel(s, Object.assign({}, ahero, { war: ahero.war + duelBonus(ahero) }), Object.assign({}, dhero, { war: dhero.war + duelBonus(dhero) }));
    const winner = d.winner === 'a' ? ahero : dhero, loser = d.winner === 'a' ? dhero : ahero;
    ctx.lines.push(`單挑！${ahero.name} 對 ${dhero.name}，${d.bouts.length}回合後${winner.name}擊退了${loser.name}`);
    // 勝方士氣大振，敗方軍心動搖
    if (d.winner === 'a') D.troops = Math.round(D.troops * 0.85);
    else A.troops = Math.round(A.troops * 0.85);
    ctx.frames.push({ a: A.troops, d: D.troops, ev: `${ahero.name} 對 ${dhero.name}，${winner.name}勝！`, kind: 'duel', duel: [ahero.name, dhero.name], winner: d.winner, bouts: d.bouts });
  }

  // 進行一回合；回傳本回合新增的 frames
  function battleRound(s, ctx, order) {
    if (ctx.result) return [];
    const start = ctx.frames.length;
    order = ORDERS[order] ? order : 'normal';
    const { A, D, city, fA, fD, aName, dName, lines } = ctx;
    if (order === 'retreat') {
      const lost = Math.round(A.troops * 0.08);
      A.troops -= lost;
      ctx.result = 'retreat';
      lines.push(`${aName}下令撤退，殿後部隊折損 ${lost}`);
      ctx.frames.push({ a: A.troops, d: D.troops, ev: `${aName}撤退！`, kind: 'retreat' });
      return ctx.frames.slice(start);
    }
    if (order === 'duel') {
      if (ctx.round === 0) doDuel(s, ctx);
      order = 'normal';
    }
    ctx.round++;
    const round = ctx.round;
    const powA = A.troops * (0.6 * A.lead + 0.4 * A.war) / 100 * (0.7 + A.train / 100 * 0.6) * ctx.bonusA;
    const powD = D.troops * (0.6 * D.lead + 0.4 * D.war) / 100 * (0.7 + D.train / 100 * 0.6) * (1 + city.defense / 2500) * ctx.bonusD;
    let lossD = Math.round(powA * 0.08 * (0.85 + rand(s) * 0.3) * ctx.sturdyD);
    let ev = null, kind = null;
    let lossA = Math.round(powD * 0.08 * (0.85 + rand(s) * 0.3) * ctx.sturdyA);
    if (round === 1) {
      // 開戰：弩兵齊射、騎兵衝鋒
      if (fA.xbow >= 0.3) { lossD = Math.round(lossD * (1 + fA.xbow)); ev = `${aName}弩兵齊射！`; kind = 'volley-a'; }
      if (fD.xbow >= 0.3) { lossA = Math.round(lossA * (1 + fD.xbow)); ev = `城上弩箭如雨！`; kind = 'volley-d'; }
      if (fA.cav >= 0.3) {
        if (fD.spear >= 0.4) { lossA = Math.round(lossA * 1.25); ev = '騎兵衝鋒，撞上槍陣！'; kind = 'charge-fail'; }
        else { lossD = Math.round(lossD * (1 + fA.cav * 0.8)); ev = `${aName}騎兵衝鋒！`; kind = 'charge'; }
      }
      if (ev) lines.push(ev);
    }
    // 玩家指令
    if (order === 'assault') { lossD = Math.round(lossD * 1.35); lossA = Math.round(lossA * 1.25); ev = ev || `${aName}全軍突擊！`; kind = kind || 'charge'; }
    else if (order === 'hold') { lossD = Math.round(lossD * 0.75); lossA = Math.round(lossA * 0.65); ev = ev || `${aName}穩住陣腳`; }
    let schemeA = A.int >= 75 && rand(s) < (A.int - 60) / 200 + ctx.schemeA;
    if (order === 'scheme') {
      // 主動用計：成功率依智略（約 20%～80%），失敗會被敵方反制
      const p = Math.max(0.15, Math.min(0.9, (A.int - 40) / 60 - (D.int - 60) / 200 + ctx.schemeA));
      schemeA = rand(s) < p;
      if (!schemeA) { lossA = Math.round(lossA * 1.2); ev = `${aName}的計謀被識破了！`; kind = 'scheme-d'; lines.push(`${aName}用計失敗`); }
    }
    if (schemeA) {
      lossD = Math.round(lossD * (order === 'scheme' ? 1.9 : 1.5));
      ev = `${aName}施展計略，守軍陷入混亂`; kind = 'scheme-a';
      if (ctx.schemes++ < 2) lines.push(`${aName}施展計略，${city.name}守軍陷入混亂`);
    }
    if (D.int >= 75 && rand(s) < (D.int - 60) / 200 + ctx.schemeD) {
      lossA = Math.round(lossA * 1.5);
      ev = `${dName}識破敵計並反擊`; kind = 'scheme-d';
      if (ctx.schemes++ < 2) lines.push(`${dName}識破敵計並反擊`);
    }
    A.troops = Math.max(0, A.troops - lossA);
    D.troops = Math.max(0, D.troops - lossD);
    city.defense = Math.max(0, city.defense - rint(s, 3, 12));
    ctx.frames.push({ a: A.troops, d: D.troops, ev, kind });

    if (D.troops <= 0) ctx.result = 'win';
    else if (A.troops <= 0) ctx.result = 'lose';
    else if (D.troops < ctx.D0 * 0.2 && D.troops < A.troops * 0.5) { ctx.result = 'win'; D.troops = 0; }
    else if (A.troops < ctx.A0 * 0.3 && A.troops < D.troops) ctx.result = 'lose';
    else if (round >= 20) { ctx.result = 'lose'; lines.push('久攻不下，撤兵'); }
    return ctx.frames.slice(start);
  }

  function battleEnd(s, ctx) {
    const { city, atk, A, D, lines, aName } = ctx;
    if (!ctx.result) { ctx.result = 'lose'; lines.push('久攻不下，撤兵'); }
    const result = ctx.result === 'win' ? 'win' : 'lose';
    const aLeft = scaleMix(ctx.aUnits, A.troops);
    const last = ctx.frames[ctx.frames.length - 1];
    last.a = A.troops; last.d = D.troops;
    city.troops = D.troops;
    let summary, gone = null;
    if (result === 'win') {
      gone = conquer(s, city, atk, A, lines, aLeft);
      summary = `${aName}攻陷了${city.name}！（剩餘 ${A.troops} 兵）`;
    } else {
      const home = s.cities[atk.from];
      if (home.owner === atk.faction) addUnits(home, aLeft, atk.train);
      summary = ctx.result === 'retreat'
        ? `${aName}從${city.name}撤兵（我損 ${ctx.A0 - A.troops}，敵損 ${ctx.D0 - D.troops}）`
        : `${aName}進攻${city.name}失敗（我損 ${ctx.A0 - A.troops}，敵損 ${ctx.D0 - D.troops}）`;
    }
    lines.push(summary);
    for (const l of lines) addLog(s, l, 'battle', ctx.parties);
    if (gone) destroyFaction(s, gone);
    const res = {
      result, retreated: ctx.result === 'retreat', summary, lines, frames: ctx.frames, atkLoss: ctx.A0 - A.troops, defLoss: ctx.D0 - D.troops,
      city: city.id, from: atk.from,
      atk: { faction: atk.faction, name: aName, commander: ctx.aCmd, generals: atk.generals.map((g) => g.name), troops: ctx.A0, units: ctx.aUnits },
      def: { faction: ctx.defOwner, name: ctx.dName, commander: ctx.dCmd, generals: ctx.defGens.map((g) => g.name), troops: ctx.D0, units: ctx.dUnits },
    };
    if (TK.Engine && typeof TK.Engine.onBattle === 'function') TK.Engine.onBattle(res);
    return res;
  }

  function battle(s, atk, targetId) {
    const ctx = battleStart(s, atk, targetId);
    while (!ctx.result) battleRound(s, ctx, 'normal');
    return battleEnd(s, ctx);
  }

  function conquer(s, city, atk, A, lines, aLeft) {
    const oldOwner = city.owner;
    const defenders = oldOwner ? generalsIn(s, city.id, (g) => g.status === 'active' && g.faction === oldOwner) : [];
    city.owner = atk.faction;
    city.troops = A.troops;
    city.mix = aLeft;
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
    // 滅亡由 battle() 在戰報寫完之後處理，記錄順序才正確
    return oldOwner && citiesOf(s, oldOwner).length === 0 ? oldOwner : null;
  }

  // 君主去世：由繼承人（資料指定，否則魅力最高者）接任
  function rulerDies(s, fid) {
    const f = s.factions[fid];
    if (!f || !f.alive) return;
    const old = s.generals[f.ruler];
    if (old) { old.status = 'dead'; old.ruler = false; old.city = null; addLog(s, `${old.name}去世了。`, 'major', [fid]); }
    const act = (g) => g && g.status === 'active' && g.faction === fid;
    let heir = (f.heirs || []).map((n) => s.generals[n]).find(act);
    if (!heir) heir = Object.values(s.generals).filter(act).sort((a, b) => b.cha - a.cha)[0];
    if (!heir) { destroyFaction(s, fid); return; }
    heir.ruler = true;
    heir.loyalty = 100;
    f.ruler = heir.name;
    f.name = `${heir.name}軍`;
    addLog(s, `${heir.name}繼承大業，勢力改稱${f.name}。`, 'major', [fid]);
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
    if (s.over) return [];
    ensure(s);
    const order = Object.keys(s.factions).filter((id) => id !== s.player && s.factions[id].alive);
    // 打亂 AI 順序
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rand(s) * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (const fid of order) {
      if (s.factions[fid].alive && !s.over) {
        if (TK.Diplomacy) TK.Diplomacy.aiConsider(s, fid);
        TK.AI.run(s, fid);
      }
      checkEnd(s);
    }
    monthEnd(s);
    const fired = TK.Events ? TK.Events.run(s) : [];
    checkEnd(s);
    return fired;
  }

  function monthEnd(s) {
    for (const c of Object.values(s.cities)) {
      if (!c.owner) {
        // 無主城緩慢恢復守軍
        c.troops = Math.min(c.troops + 100, 12000);
        continue;
      }
      const ord = 0.5 + c.order / 200;
      c.gold += Math.round(goldIncome(c, s) * incomeMult(s, c.owner));
      const gov = governorOf(s, c);
      if (gov && gov.cha >= 60 && c.order < 100) c.order = Math.min(100, c.order + 1);
      if (s.month === 7) {
        const harvest = Math.round(c.farm * 30 * ord * (s.harvest_mult || 1) * incomeMult(s, c.owner));
        c.food += harvest;
        if (c.owner === s.player) addLog(s, `${c.name}秋收，得糧 ${harvest}`, 'info', [c.owner]);
      }
      // 軍餉：每 250 兵每月 1 金，付不出時部分士兵逃散
      const pay = upkeep(c);
      if (c.gold >= pay) c.gold -= pay;
      else {
        const left = Math.round(c.troops * 0.05);
        c.gold = 0; c.troops -= left;
        addLog(s, `${c.name}欠餉，${left} 兵逃散`, 'warn', [c.owner]);
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
    if (s.month === 7) s.harvest_mult = 1;
    if (TK.Diplomacy) TK.Diplomacy.monthTick(s);
    kingsTick(s);
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
    duel,
    destroyFaction, DIFFICULTY, diff, SKILLS, yearText, RAID_COST, DISCORD_COST, raidRisk, discordChance, ambition, rebel, ORDERS, battleStart, battleRound, battleEnd, troopCap, goldIncome, upkeep, strategistOf, governorOf,
    MAX, DEV, newGame, exec, endTurn, monthEnd, checkEnd, battle, rulerDies, ensure,
    neighbors, citiesOf, generalsIn, officers, factionName, dateStr, addLog,
    maxDraft, recruitChance, powerOf, rand, rint, pick, clamp,
    UNITS, UNIT_KEYS, BEATS, APT_MULT, matchup, aptitude, mixOf, scaleMix, unitsTotal, mixName, fractions,
  };
})(globalThis.TK = globalThis.TK || {});
