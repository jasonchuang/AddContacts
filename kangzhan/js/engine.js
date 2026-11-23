/* 遊戲核心：狀態、指令、戰鬥、回合結算。不碰 DOM，可在 Node 中測試。 */
(function (TK) {
  'use strict';

  const MAX = { farm: 999, commerce: 999, defense: 999, order: 100, train: 100 };
  const NEUTRAL = { lead: 45, war: 45, int: 40 };
  const FREE_STATS = { name: '守軍' };
  const T = TK.TUNING; // 手感數值表（js/tuning.js）

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
      const hitP = Math.min(T.duel.hitMax, Math.max(T.duel.hitMin, T.duel.hitBase + (me.war - foe.war) / 60));
      let dmg = 0, crit = false;
      if (rand(s) < hitP) {
        dmg = Math.max(6, Math.round(14 + (me.war - 60) * 0.45 + rint(s, 0, 10)));
        if (rand(s) < T.duel.critBase + Math.max(0, me.war - 85) / 50) { dmg = Math.round(dmg * T.duel.critMult); crit = true; }
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
  // 說明文字依數值自動產生，改 tuning.js 時不用另外改說明
  function diffDesc(d) {
    const p = [];
    if (d.playerIncome !== 1) p.push(`玩家收入 ×${d.playerIncome}`);
    if (d.playerPower !== 1) p.push(`玩家戰力 ×${d.playerPower}`);
    if (d.aiIncome !== 1) p.push(`電腦收入 ×${d.aiIncome}`);
    if (d.aiPower !== 1) p.push(`電腦戰力 ×${d.aiPower}`);
    if (d.aiAggro > 1) p.push('電腦出兵保守'); else if (d.aiAggro < 1) p.push('電腦出兵積極');
    if (d.recruit > 0) p.push('登用較容易');
    return p.join('、') || '標準規則';
  }
  const DIFFICULTY = {};
  for (const [k, d] of Object.entries(T.difficulty)) DIFFICULTY[k] = Object.assign({ desc: diffDesc(d) }, d);
  function diff(s) { return DIFFICULTY[(s && s.difficulty) || 'normal'] || DIFFICULTY.normal; }
  function incomeMult(s, fid) { if (!fid) return 1; const d = diff(s); return fid === s.player ? d.playerIncome : d.aiIncome; }
  function powerMult(s, fid) {
    if (!fid) return 1;
    const f = s.factions[fid];
    const side = f && f.side === 'axis' ? T.war.axisPower * supplyMult(s, fid) : 1;
    if (!s.player) return side;
    const d = diff(s);
    return side * (fid === s.player ? d.playerPower : d.aiPower);
  }
  // 日方補給線：佔領越多城、戰線越長，戰力越低
  function supplyMult(s, fid) {
    const n = citiesOf(s, fid).length;
    return Math.max(T.war.supplyMin, 1 - Math.max(0, n - T.war.supplyFree) * T.war.supplyPer);
  }
  // 海路（臺灣海峽、東海）：兩城之間只能渡海
  function isSea(s, a, b) { return (s.sea || []).some(([x, y]) => (x === a && y === b) || (x === b && y === a)); }
  // 能不能從 from 進攻 target（不論外交）：英國屬地等鎖定的城不能進攻；渡海要帶足海軍
  function attackBlock(s, from, target, units) {
    if (target.locked) return `${target.name}不在戰爭範圍內`;
    const atk = s.factions[s.cities[from].owner];
    // 日方掌握制海權，渡海不受限制
    if (isSea(s, from, target.id) && !(atk && atk.side === 'axis')) {
      const n = unitsTotal(units || {});
      if (!n || (units.navy || 0) / n < T.war.seaNavy) return `渡海進攻${target.name}，海軍至少要佔出陣兵力的 ${Math.round(T.war.seaNavy * 100)}%`;
    }
    return '';
  }

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
      sea: sc.sea || [],
      coop: sc.coop === undefined ? null : sc.coop,
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
    addLog(s, sc.id && sc.id !== '190' ? `${s.year}年，${sc.title}。${sc.desc}` : `${s.year}年，天下大亂，群雄並起。`, 'sys');
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

  // ---------- 兵種 ----------
  // 陸軍三種互相剋制：步兵剋砲兵（衝進砲兵陣地）、砲兵剋坦克、坦克剋步兵。
  // 空軍、海軍不參加相剋，改成有條件的加成。cost＝每 1000 兵所需金；needs＝徵兵需要的城市設施
  const UNITS = {
    inf: { name: '步兵', short: '步', cost: 100, desc: '便宜耐打，守城主力；剋制砲兵' },
    tank: { name: '坦克', short: '坦', cost: 400, needs: 'arsenal', desc: '攻擊力最強，開戰衝鋒；剋制步兵。只有兵工廠城能徵' },
    art: { name: '砲兵', short: '砲', cost: 200, desc: '開戰砲擊、削減城防；剋制坦克' },
    air: { name: '空軍', short: '空', cost: 600, needs: 'airfield', desc: '戰前轟炸、不受地面部隊剋制，冬季效果減半。只有機場城能徵' },
    navy: { name: '海軍', short: '海', cost: 300, needs: 'port', desc: '攻守沿海、沿江城時艦砲支援；攻打內陸城幾乎無用。只有港口城能徵' },
  };
  const UNIT_KEYS = ['inf', 'tank', 'art', 'air', 'navy'];
  const LAND = ['inf', 'tank', 'art'];
  const BEATS = { inf: 'art', art: 'tank', tank: 'inf' };
  const FACILITY = { arsenal: '兵工廠', airfield: '機場', port: '港口' };
  const APT_MULT = T.units.apt;

  function matchup(a, d) {
    if (!BEATS[a] || !BEATS[d] || a === d) return 1;
    return BEATS[a] === d ? T.units.counter : T.units.countered;
  }
  // 這座城能不能徵這種兵
  function canDraft(city, type) { const n = UNITS[type] && UNITS[type].needs; return !n || !!city[n]; }

  // 武將兵種適性：劇本可指定，否則依能力推得
  function aptitude(g, type) {
    if (!g) return 'C';
    const o = (TK.SCENARIO.aptitude || {})[g.name];
    if (o && o[type]) return o[type];
    if (type === 'inf') return g.lead >= 85 || g.war >= 88 ? 'A' : g.lead >= 68 ? 'B' : 'C';
    if (type === 'tank') return g.war >= 85 || (g.lead >= 85 && g.war >= 70) ? 'A' : g.war >= 70 ? 'B' : 'C';
    if (type === 'air') return g.int >= 85 ? 'A' : g.int >= 72 ? 'B' : 'C';
    if (type === 'navy') return g.lead >= 85 && g.int >= 70 ? 'A' : g.lead >= 72 ? 'B' : 'C';
    return g.int >= 85 ? 'A' : g.int >= 68 || g.lead >= 80 ? 'B' : 'C';
  }

  // 開局各城的兵種比例（依城市設施）
  function defaultMix(c) {
    const r = !c.owner ? { inf: 0.75, tank: 0, art: 0.25, air: 0, navy: 0 }
      : c.owner === 'japan' ? { inf: 0.5, tank: 0.12, art: 0.2, air: c.airfield ? 0.1 : 0.04, navy: c.port ? 0.12 : 0 }
      : { inf: 0.62, tank: c.arsenal ? 0.1 : 0.04, art: 0.22, air: c.airfield ? 0.05 : 0, navy: c.port ? 0.07 : 0 };
    return scaleMix(r, c.troops);
  }
  function emptyUnits() { return { inf: 0, tank: 0, art: 0, air: 0, navy: 0 }; }
  // 依比例分配 total，回傳整數且總和精確
  function scaleMix(mix, total) {
    const sum = UNIT_KEYS.reduce((a, k) => a + (mix[k] || 0), 0);
    const out = emptyUnits();
    if (total <= 0) return out;
    if (sum <= 0) { out.inf = total; return out; }
    let acc = 0, big = 'inf';
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
    for (const k of UNIT_KEYS) if (!(c.mix[k] >= 0)) c.mix[k] = 0;
    const sum = unitsTotal(c.mix);
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
    const f = {};
    for (const k of UNIT_KEYS) f[k] = (u[k] || 0) / t;
    return f;
  }
  function mixName(u) {
    return UNIT_KEYS.filter((k) => u[k] > 0).map((k) => `${UNITS[k].short}${u[k]}`).join('・') || '無兵';
  }
  // 每兵戰力倍率：坦克、砲兵較強；空軍冬季減半；海軍只在沿海沿江城發揮
  function unitWeight(k, s, city) {
    const U = T.units;
    if (k === 'tank') return U.tankPower;
    if (k === 'art') return U.artPower;
    if (k === 'air') return U.airPower * (s.month === 12 || s.month <= 2 ? U.airWinter : 1);
    if (k === 'navy') return city.port ? U.navyPort : U.navyInland;
    return 1;
  }

  // ---------- 指令 ----------
  const DEV = {
    farm: { label: '開墾', cost: 50, stat: 'pol', key: 'farm' },
    commerce: { label: '商業', cost: 50, stat: 'pol', key: 'commerce' },
    defense: { label: '築城', cost: 60, stat: 'lead', key: 'defense' },
    order: { label: '巡察', cost: 30, stat: 'cha', key: 'order' },
    train: { label: '訓練', cost: 0, stat: 'lead', key: 'train' },
  };

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
    const base = c.commerce * T.economy.commerceGold * (0.5 + c.order / 200) + c.pop / 10000;
    const gov = s ? governorOf(s, c) : null;
    return Math.round(base * (gov ? 1 + gov.pol / 500 : 1));
  }
  function upkeep(c) { return Math.floor(c.troops / T.economy.upkeepPer); }
  // 一城可養的兵力上限：人口的 12%（至少 15000）
  function troopCap(city) { return Math.max(T.economy.troopCapMin, Math.floor(city.pop * T.economy.troopCapPop)); }
  function maxDraft(s, city, g, type) {
    const cost = UNITS[type || 'inf'].cost;
    if (!canDraft(city, type || 'inf')) return 0;
    return Math.max(0, Math.min(g.cha * 100, Math.floor(city.gold * 1000 / cost), Math.floor(city.pop / 5), troopCap(city) - city.troops));
  }

  // 交易報價：每 100 糧的買價與賣價（金），以及單次上限
  function tradeQuote(s, city, g) {
    const m = s.month;
    const season = m >= 7 && m <= 9 ? T.trade.harvestMult : m >= 3 && m <= 5 ? T.trade.springMult : 1;
    const skill = g ? Math.max(-0.15, Math.min(0.2, (g.pol - 50) * T.trade.polBonus)) : 0;
    return {
      buy: Math.max(1, Math.round(T.trade.buyPrice * season * (1 - skill) * 10) / 10),
      sell: Math.max(1, Math.round(T.trade.sellPrice * season * (1 + skill) * 10) / 10),
      max: Math.floor(city.commerce * T.trade.maxPerCommerce),
      season: season < 1 ? '秋收後糧價便宜' : season > 1 ? '青黃不接糧價高' : '糧價平穩',
    };
  }

  function recruitChance(s, g, target) {
    if (target.ruler) return 0;
    const bonus = g.faction === s.player ? diff(s).recruit : 0;
    if (target.status === 'free') return clamp(T.recruit.freeBase + (g.cha / 100) * T.recruit.freeCha + bonus, 0, T.recruit.freeMax);
    if (target.status === 'prisoner') return clamp(T.recruit.prisonerBase + (g.cha / 100) * T.recruit.prisonerCha - (target.loyalty - 50) / 200, 0.02, T.recruit.prisonerMax);
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
    const needsExec = !['reward', 'release', 'execute', 'appoint'].includes(cmd.type);
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
      case 'evacuate': {
        if (city.evacuated) return fail(`${city.name}已經遷移過了`);
        const dest = s.cities[cmd.dest];
        if (!dest || !evacDests(s, fid, city).includes(dest)) return fail('只能遷往沒有與日軍接壤的我方城市');
        const r = evacuate(s, city, dest);
        g.acted = true;
        return ok(`${g.name}主持${city.name}西遷，商業 ${r.com}、人口 ${r.pop}、金 ${r.gold} 移往${dest.name}`);
      }
      case 'draft': {
        const type = UNITS[cmd.unit] ? cmd.unit : 'inf';
        if (!canDraft(city, type)) return fail(`${city.name}沒有${FACILITY[UNITS[type].needs]}，不能徵${UNITS[type].name}`);
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
        if (s.factions[fid] && s.factions[fid].side === 'axis') return fail('日方不登用人才');
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
      case 'trade': {
        // 交易：在商業發達的城買賣軍糧；價格依季節與負責武將的政務
        if (city.commerce < T.trade.minCommerce) return fail(`商業需達 ${T.trade.minCommerce} 才能交易`);
        const amt = Math.floor(cmd.amount || 0);
        const q = tradeQuote(s, city, g);
        if (amt <= 0 || amt > q.max) return fail(`一次最多交易糧 ${q.max}`);
        if (cmd.mode === 'buy') {
          const cost = Math.ceil(amt * q.buy / 100);
          if (city.gold < cost) return fail('金不足');
          city.gold -= cost; city.food += amt;
          g.acted = true;
          return ok(`${g.name}在${city.name}以金 ${cost} 買進糧 ${amt}`);
        }
        if (cmd.mode === 'sell') {
          if (city.food < amt) return fail('糧不足');
          const got = Math.floor(amt * q.sell / 100);
          city.food -= amt; city.gold += got;
          g.acted = true;
          return ok(`${g.name}在${city.name}賣出糧 ${amt}，得金 ${got}`);
        }
        return fail('未知的交易');
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
        const block = attackBlock(s, city.id, target, units);
        if (block) return fail(block);
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
    assault: { label: '突擊', desc: `對敵傷害 ×${T.orders.assault.dealt}，我方損失 ×${T.orders.assault.taken}` },
    hold: { label: '穩守', desc: `我方損失 ×${T.orders.hold.taken}，對敵傷害 ×${T.orders.hold.dealt}` },
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
    const aUnits = atk.units || Object.assign(emptyUnits(), { inf: atk.troops });
    const dUnits = Object.assign({}, mixOf(city));
    const fA = fractions(aUnits), fD = fractions(dUnits);
    // 相剋只算陸軍；空軍、海軍以每兵戰力倍率表現
    const land = (f) => { const t = LAND.reduce((a, k) => a + f[k], 0) || 1; const o = {}; for (const k of LAND) o[k] = f[k] / t; return o; };
    const lA = land(fA), lD = land(fD);
    let mA = 0, mD = 0, aptA = 0, aptD = 0, wA = 0, wD = 0;
    for (const a of LAND) for (const d of LAND) { mA += lA[a] * lD[d] * matchup(a, d); mD += lD[d] * lA[a] * matchup(d, a); }
    // 有一方完全沒有陸軍（例如只派艦隊）時不算相剋
    if (!mA || !mD) { mA = 1; mD = 1; }
    for (const k of UNIT_KEYS) {
      aptA += fA[k] * APT_MULT[aptitude(A.commander, k)];
      aptD += fD[k] * (D.commander ? APT_MULT[aptitude(D.commander, k)] : 1);
      wA += fA[k] * unitWeight(k, s, city);
      wD += fD[k] * unitWeight(k, s, city);
    }
    let bonusA = mA * aptA * (wA || 1);
    let bonusD = mD * aptD * (wD || 1);
    bonusA *= powerMult(s, atk.faction);
    bonusD *= powerMult(s, defOwner);
    const ctx = {
      city, atk, defOwner, defGens, A, D, aUnits, dUnits, fA, fD,
      bonusA, bonusD,
      sturdyA: 1 - T.units.infSturdy * fA.inf - T.units.airSturdy * fA.air, sturdyD: 1 - T.units.infSturdy * fD.inf - T.units.airSturdy * fD.air,
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
    const domA = LAND.reduce((b, k) => (fA[k] > fA[b] ? k : b), 'inf');
    const domD = LAND.reduce((b, k) => (fD[k] > fD[b] ? k : b), 'inf');
    if (mA > 1.06) ctx.lines.push(`兵種相剋：${ctx.aName}的${UNITS[domA].name}佔上風`);
    else if (mD > 1.06) ctx.lines.push(`兵種相剋：守軍的${UNITS[domD].name}佔上風`);
    ctx.ahero = atk.generals.slice().sort((a, b) => b.war - a.war)[0] || null;
    ctx.dhero = defGens.slice().sort((a, b) => b.war - a.war)[0] || null;
    ctx.canDuel = !!(ctx.ahero && ctx.dhero);
    // 電腦的戰鬥：雙方猛將夠強時約六成機率自動單挑；玩家指揮時改由玩家決定
    if (!ctx.interactive && ctx.canDuel && Math.max(ctx.ahero.war, ctx.dhero.war) >= 70 && Math.min(ctx.ahero.war, ctx.dhero.war) >= 50 && rand(s) < T.duel.autoChance) doDuel(s, ctx);
    return ctx;
  }

  function doDuel(s, ctx) {
    if (ctx.dueled || !ctx.canDuel) return;
    ctx.dueled = true;
    const { ahero, dhero, A, D } = ctx;
    const d = duel(s, ahero, dhero);
    const winner = d.winner === 'a' ? ahero : dhero, loser = d.winner === 'a' ? dhero : ahero;
    ctx.lines.push(`單挑！${ahero.name} 對 ${dhero.name}，${d.bouts.length}回合後${winner.name}擊退了${loser.name}`);
    // 勝方士氣大振，敗方軍心動搖
    if (d.winner === 'a') D.troops = Math.round(D.troops * (1 - T.duel.moraleLoss));
    else A.troops = Math.round(A.troops * (1 - T.duel.moraleLoss));
    ctx.frames.push({ a: A.troops, d: D.troops, ev: `${ahero.name} 對 ${dhero.name}，${winner.name}勝！`, kind: 'duel', duel: [ahero.name, dhero.name], winner: d.winner, bouts: d.bouts });
  }

  // 進行一回合；回傳本回合新增的 frames
  function battleRound(s, ctx, order) {
    if (ctx.result) return [];
    const start = ctx.frames.length;
    order = ORDERS[order] ? order : 'normal';
    const { A, D, city, fA, fD, aName, dName, lines } = ctx;
    if (order === 'retreat') {
      const lost = Math.round(A.troops * T.battle.retreatLoss);
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
    const powD = D.troops * (0.6 * D.lead + 0.4 * D.war) / 100 * (0.7 + D.train / 100 * 0.6) * (1 + city.defense / T.battle.wallPerDefense) * ctx.bonusD;
    let lossD = Math.round(powA * T.battle.lossRate * (0.85 + rand(s) * 0.3) * ctx.sturdyD);
    let ev = null, kind = null;
    let lossA = Math.round(powD * T.battle.lossRate * (0.85 + rand(s) * 0.3) * ctx.sturdyA);
    if (round === 1) {
      // 開戰：空軍轟炸、艦砲射擊、砲兵齊射、坦克衝鋒（後面的事件蓋過前面的文字）
      const winter = s.month === 12 || s.month <= 2;
      if (fA.air >= 0.05) { lossD = Math.round(lossD * (1 + fA.air * T.units.airStrike * (winter ? T.units.airWinter : 1))); ev = `${aName}空軍轟炸！`; kind = 'air-a'; }
      if (fD.air >= 0.05) { lossA = Math.round(lossA * (1 + fD.air * T.units.airStrike * (winter ? T.units.airWinter : 1))); ev = '守軍飛機升空迎擊！'; kind = 'air-d'; }
      if (city.port && fA.navy >= 0.1) { lossD = Math.round(lossD * (1 + fA.navy * T.units.navalGun)); ev = `${aName}艦砲轟擊！`; kind = 'navy-a'; }
      if (city.port && fD.navy >= 0.1) { lossA = Math.round(lossA * (1 + fD.navy * T.units.navalGun)); ev = '港內軍艦開砲！'; kind = 'navy-d'; }
      if (fA.art >= 0.3) { lossD = Math.round(lossD * (1 + fA.art)); ev = `${aName}砲兵齊射！`; kind = 'volley-a'; }
      if (fD.art >= 0.3) { lossA = Math.round(lossA * (1 + fD.art)); ev = '城頭砲火猛烈！'; kind = 'volley-d'; }
      if (fA.tank >= 0.2) {
        if (fD.art >= 0.35) { lossA = Math.round(lossA * T.units.tankIntoArt); ev = '坦克衝鋒，撞上砲兵陣地！'; kind = 'charge-fail'; }
        else { lossD = Math.round(lossD * (1 + fA.tank * 1.2)); ev = `${aName}坦克衝鋒！`; kind = 'charge'; }
      }
      if (ev) lines.push(ev);
    }
    // 玩家指令
    if (order === 'assault') { lossD = Math.round(lossD * T.orders.assault.dealt); lossA = Math.round(lossA * T.orders.assault.taken); ev = ev || `${aName}全軍突擊！`; kind = kind || 'charge'; }
    else if (order === 'hold') { lossD = Math.round(lossD * T.orders.hold.dealt); lossA = Math.round(lossA * T.orders.hold.taken); ev = ev || `${aName}穩住陣腳`; }
    let schemeA = A.int >= 75 && rand(s) < (A.int - 60) / 200;
    if (order === 'scheme') {
      // 主動用計：成功率依智略（約 20%～80%），失敗會被敵方反制
      const p = Math.max(T.orders.schemeMin, Math.min(T.orders.schemeMax, (A.int - 40) / 60 - (D.int - 60) / 200));
      schemeA = rand(s) < p;
      if (!schemeA) { lossA = Math.round(lossA * T.orders.schemeFail); ev = `${aName}的計謀被識破了！`; kind = 'scheme-d'; lines.push(`${aName}用計失敗`); }
    }
    if (schemeA) {
      lossD = Math.round(lossD * (order === 'scheme' ? T.orders.schemeSuccess : T.orders.passiveScheme));
      ev = `${aName}施展計略，守軍陷入混亂`; kind = 'scheme-a';
      if (ctx.schemes++ < 2) lines.push(`${aName}施展計略，${city.name}守軍陷入混亂`);
    }
    if (D.int >= 75 && rand(s) < (D.int - 60) / 200) {
      lossA = Math.round(lossA * T.orders.passiveScheme);
      ev = `${dName}識破敵計並反擊`; kind = 'scheme-d';
      if (ctx.schemes++ < 2) lines.push(`${dName}識破敵計並反擊`);
    }
    A.troops = Math.max(0, A.troops - lossA);
    D.troops = Math.max(0, D.troops - lossD);
    // 砲兵越多，城防削得越快
    city.defense = Math.max(0, city.defense - rint(s, T.battle.wallWearMin, T.battle.wallWearMax) - Math.round(T.units.artWall * fA.art));
    ctx.frames.push({ a: A.troops, d: D.troops, ev, kind });

    if (D.troops <= 0) ctx.result = 'win';
    else if (A.troops <= 0) ctx.result = 'lose';
    else if (D.troops < ctx.D0 * T.battle.routDefender && D.troops < A.troops * 0.5) { ctx.result = 'win'; D.troops = 0; }
    else if (A.troops < ctx.A0 * T.battle.routAttacker && A.troops < D.troops) ctx.result = 'lose';
    else if (round >= T.battle.maxRounds) { ctx.result = 'lose'; lines.push('久攻不下，撤兵'); }
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
      const axisDef = s.factions[oldOwner] && s.factions[oldOwner].side === 'axis';
      for (const g of defenders) {
        // 日方指揮官（只用職稱）不會成為俘虜：撤離戰場
        if (axisDef && !(escapes.length && (g.ruler || rand(s) < 0.5 + g.war / 400))) {
          Object.assign(g, { status: 'dead', city: null, faction: null, ruler: false });
          lines.push(`${g.name}撤離戰場`);
          continue;
        }
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
    const order = Object.keys(s.factions).filter((id) => id !== s.player && s.factions[id].alive && !s.factions[id].dormant);
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

  // 抗戰的每月結算：日方增援與補給、游擊戰、國共合作度、美援、大後方遷移（電腦）
  const alive = (s, id) => s.factions[id] && s.factions[id].alive;
  function active(f) { return f && f.alive && !f.dormant; }
  function warTick(s) {
    const W = T.war;
    const axis = Object.values(s.factions).filter((f) => f.alive && f.side === 'axis');
    const late = s.year >= 1943 ? W.axisLate : 1;
    for (const f of axis) {
      const mine = citiesOf(s, f.id);
      const front = mine.filter((c) => neighbors(s, c.id).some((n) => s.cities[n].owner && s.cities[n].owner !== f.id && !s.cities[n].locked));
      const list = front.length ? front : mine;
      if (!list.length) continue;
      const each = Math.floor(W.axisReinforce * late / list.length);
      for (const c of list) {
        addUnits(c, scaleMix({ inf: 0.55, tank: 0.12, art: 0.2, air: c.airfield ? 0.08 : 0, navy: c.port ? 0.05 : 0 }, each), 70);
        c.food = Math.max(c.food, Math.ceil(c.troops / T.economy.foodPer) * 6);
        c.gold = Math.max(c.gold, upkeep(c) * 3);
      }
    }
    // 游擊戰：中共在兩步以內的日佔城展開游擊，削弱守軍；敵後根據地吸收新兵
    if (alive(s, 'ccp') && axis.length) {
      const hit = {};
      for (const c of citiesOf(s, 'ccp')) {
        const near = new Set();
        for (const n of neighbors(s, c.id)) { near.add(n); for (const m of neighbors(s, n)) near.add(m); }
        for (const id of near) {
          const t = s.cities[id];
          if (!t.owner || !s.factions[t.owner] || s.factions[t.owner].side !== 'axis') continue;
          const loss = Math.min(W.guerrillaMax - (hit[id] || 0), Math.round(c.troops * W.guerrillaRate));
          if (loss <= 0) continue;
          hit[id] = (hit[id] || 0) + loss;
          takeUnits(t, scaleMix(mixOf(t), Math.max(0, Math.min(loss, t.troops - 500))));
          addUnits(c, { inf: W.guerrillaRecruit }, 40);
        }
      }
      const n = Object.keys(hit).length;
      if (n && (s.player === 'ccp' || (s.factions[s.player] && s.factions[s.player].side === 'axis'))) addLog(s, `八路軍、新四軍在敵後 ${n} 座城展開游擊戰。`, 'info', ['ccp']);
    }
    // 國共合作度
    if (s.coop !== null && s.coop !== undefined && alive(s, 'kmt') && alive(s, 'ccp')) {
      const extra = Math.max(0, citiesOf(s, 'ccp').length - W.coopCcp) * 0.5;
      s.coop = Math.max(0, Math.min(100, s.coop - W.coopDrift - extra));
      if (TK.Diplomacy) {
        const st = TK.Diplomacy.stateOf(s, 'kmt', 'ccp');
        if (s.coop >= W.coopAlliance && st !== 'alliance') TK.Diplomacy.setState(s, 'kmt', 'ccp', 'alliance', 12);
        else if (s.coop < W.coopFriction && st === 'alliance') {
          TK.Diplomacy.setState(s, 'kmt', 'ccp', 'neutral');
          addLog(s, '國共摩擦加劇，合作瀕臨破裂。', 'major', ['kmt', 'ccp']);
        }
      }
    }
    // 中方（與盟軍）之間的同盟自動延續；國共兩黨則看合作度
    if (axis.length && TK.Diplomacy) {
      for (const [k, r] of Object.entries(s.relations || {})) {
        const [a, b] = k.split('|');
        if (r.state !== 'alliance' || TK.Diplomacy.enemies(s, a, b) || !(r.months > 0 && r.months < 6)) continue;
        if (a + b === 'ccpkmt' || a + b === 'kmtccp') { if (s.coop === null || s.coop === undefined || s.coop >= W.coopAlliance) r.months = 12; } else r.months = 12;
      }
    }
    // 美援：參戰後每月援助國府；1942 年起駝峰航線送來空軍
    const usa = s.factions.usa;
    if (active(usa) && usa.side === 'allies' && alive(s, 'kmt')) {
      const mine = citiesOf(s, 'kmt');
      if (mine.length) {
        const rich = mine.slice().sort((x, y) => y.gold - x.gold)[0];
        rich.gold += W.usAidGold;
        const base = ['昆明', '重慶', '芷江', '成都'].map((id) => s.cities[id]).find((c) => c && c.owner === 'kmt');
        if (s.year >= 1942 && base) addUnits(base, { air: W.usAidAir }, 70);
      }
    }
    // 電腦的國府：受威脅的城先把商業與人口遷往大後方
    if (axis.length && alive(s, 'kmt') && s.player !== 'kmt') {
      for (const c of citiesOf(s, 'kmt')) {
        if (c.evacuated || c.commerce < 300) continue;
        const threat = neighbors(s, c.id).reduce((m, n) => (s.cities[n].owner && s.factions[s.cities[n].owner].side === 'axis' ? Math.max(m, s.cities[n].troops) : m), 0);
        if (threat > c.troops * 1.5) { const d = evacDests(s, 'kmt', c)[0]; if (d) evacuate(s, c, d); }
      }
    }
  }
  // 大後方：沒有和日方相鄰的我方城（越遠越好）
  function evacDests(s, fid, from) {
    return citiesOf(s, fid).filter((c) => c.id !== from.id && !neighbors(s, c.id).some((n) => s.cities[n].owner && s.factions[s.cities[n].owner] && s.factions[s.cities[n].owner].side === 'axis'))
      .sort((a, b) => b.x < a.x ? 1 : -1);
  }
  function evacuate(s, c, dest) {
    const com = Math.floor(c.commerce * T.war.evacCommerce), pop = Math.floor(c.pop * T.war.evacPop), gold = Math.floor(c.gold / 2);
    c.commerce -= com; dest.commerce = Math.min(MAX.commerce, dest.commerce + com);
    c.pop -= pop; dest.pop += pop;
    c.gold -= gold; dest.gold += gold;
    c.evacuated = true;
    addLog(s, `${c.name}的工廠、學校與人口西遷${dest.name}（商業 ${com}、人口 ${pop}）。`, 'info', [c.owner]);
    return { com, pop, gold };
  }

  function monthEnd(s) {
    warTick(s);
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
        const harvest = Math.round(c.farm * T.economy.harvestPerFarm * ord * (s.harvest_mult || 1) * incomeMult(s, c.owner));
        c.food += harvest;
        if (c.owner === s.player) addLog(s, `${c.name}秋收，得糧 ${harvest}`, 'info', [c.owner]);
      }
      // 軍餉：每 250 兵每月 1 金，付不出時部分士兵逃散
      const pay = upkeep(c);
      if (c.gold >= pay) c.gold -= pay;
      else {
        const left = Math.round(c.troops * T.economy.desertUnpaid);
        c.gold = 0; c.troops -= left;
        addLog(s, `${c.name}欠餉，${left} 兵逃散`, 'warn', [c.owner]);
      }
      c.food -= Math.ceil(c.troops / T.economy.foodPer);
      if (c.food < 0) {
        c.food = 0;
        const lost = Math.round(c.troops * T.economy.desertStarve);
        c.troops -= lost;
        c.order = Math.max(0, c.order - 5);
        addLog(s, `${c.name}缺糧，${lost} 兵逃散`, 'warn', [c.owner]);
      }
      c.pop = Math.max(10000, Math.round(c.pop * (1 + (c.order - 40) / 20000)));
      if (c.train > 50 && c.troops > 0 && rand(s) < 0.3) c.train -= 1;
    }
    if (s.month === 7) s.harvest_mult = 1;
    if (TK.Diplomacy) TK.Diplomacy.monthTick(s);
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
    } else if (s.player && (Object.values(s.cities).every((c) => c.locked || c.owner === s.player)
      || (Object.values(s.factions).some((f) => f.side === 'axis') && !Object.values(s.factions).some((f) => f.alive && f.side === 'axis')))) {
      s.over = { result: 'win' };
      addLog(s, Object.values(s.factions).some((f) => f.side === 'axis') ? '日方勢力瓦解，抗戰勝利！' : `${s.factions[s.player].name}統一天下！`, 'major', [s.player]);
    } else if (!s.player || !s.factions[s.player]) {
      if (alive.length === 1 && Object.values(s.cities).every((c) => c.locked || c.owner === alive[0].id)) {
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
    destroyFaction, DIFFICULTY, diff, tradeQuote, ORDERS, battleStart, battleRound, battleEnd, troopCap, goldIncome, upkeep, strategistOf, governorOf,
    MAX, DEV, newGame, exec, endTurn, monthEnd, checkEnd, battle, rulerDies, ensure,
    neighbors, citiesOf, generalsIn, officers, factionName, dateStr, addLog,
    maxDraft, powerMult, recruitChance, powerOf, rand, rint, pick, clamp,
    UNITS, UNIT_KEYS, LAND, BEATS, FACILITY, APT_MULT, matchup, canDraft, emptyUnits, unitWeight, isSea, attackBlock, supplyMult, evacDests, evacuate, aptitude, mixOf, scaleMix, unitsTotal, mixName, fractions,
  };
})(globalThis.TK = globalThis.TK || {});
