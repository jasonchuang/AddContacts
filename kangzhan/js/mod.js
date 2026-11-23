/* 自訂劇本（MOD）：把劇本匯出成 JSON，修改後再匯入遊玩。
 * 格式說明見 MOD.md。這裡只處理資料（驗證、登錄、保存），畫面在 ui.js。 */
(function (TK) {
  'use strict';
  const FORMAT = 'kangzhan-scenario';
  const VERSION = 1;
  const STORE_KEY = 'kangzhan.mods.v1';
  const STATES = ['neutral', 'war', 'truce', 'alliance'];
  const APT = ['S', 'A', 'B', 'C'];

  // 匯出：完整的劇本資料（勢力、城市、道路、人物、關係、事件、適性），可直接修改後匯入
  function exportScenario(sc) {
    const names = new Set(sc.generals.map((g) => g.name));
    const bios = {};
    for (const n of names) if (TK.BIOS && TK.BIOS[n]) bios[n] = TK.BIOS[n];
    const apt = {};
    for (const n of names) if (sc.aptitude && sc.aptitude[n]) apt[n] = sc.aptitude[n];
    return {
      format: FORMAT, version: VERSION,
      id: sc.id, title: sc.title, year: sc.year, month: sc.month, tag: sc.tag || '', desc: sc.desc || '',
      factions: sc.factions.map((f) => ({ id: f.id, name: f.name, ruler: f.ruler, color: f.color, heirs: f.heirs || [], strategist: f.strategist || null, npc: !!f.npc, side: f.side || 'allies', dormant: !!f.dormant })),
      cities: sc.cities.map((c) => {
        const o = { id: c.id, x: c.x, y: c.y, owner: c.owner, troops: c.troops, gold: c.gold, food: c.food, pop: c.pop,
          farm: c.farm, commerce: c.commerce, defense: c.defense, order: c.order, train: c.train };
        for (const k of ['arsenal', 'airfield', 'port', 'locked']) if (c[k]) o[k] = true;
        return o;
      }),
      roads: sc.roads,
      sea: sc.sea || [],
      coop: sc.coop === undefined ? null : sc.coop,
      axisPlan: sc.axisPlan || [],
      generals: sc.generals.map((g) => ({ name: g.name, faction: g.faction, city: g.city, lead: g.lead, war: g.war, int: g.int, pol: g.pol, cha: g.cha,
        loyalty: g.loyalty, status: g.status })),
      relations: sc.relations || [],
      aptitude: apt,
      events: sc.events || [],
      bios,
    };
  }

  // 驗證並轉成遊戲可用的劇本；有錯時丟出中文說明（最多列 12 條）
  function importScenario(d) {
    const errs = [];
    const err = (m) => { if (errs.length < 12) errs.push(m); };
    if (!d || typeof d !== 'object') throw new Error('檔案內容不是 JSON 物件');
    if (d.format !== FORMAT) err(`format 必須是 "${FORMAT}"`);
    if (!d.title || typeof d.title !== 'string') err('缺少劇本名稱 title');
    if (!Number.isInteger(d.year)) err('year（開始年份）必須是整數');
    if (!(d.month >= 1 && d.month <= 12)) err('month（開始月份）必須是 1～12');
    const arr = (k) => { if (!Array.isArray(d[k]) || !d[k].length) { err(`${k} 必須是非空陣列`); return []; } return d[k]; };
    const factions = arr('factions'), cities = arr('cities'), generals = arr('generals');
    const roads = Array.isArray(d.roads) ? d.roads : (err('roads 必須是陣列'), []);
    const num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;

    const fids = new Set();
    for (const f of factions) {
      if (!f || !f.id || !f.name) { err('每個勢力都要有 id 與 name'); continue; }
      if (fids.has(f.id)) err(`勢力 id 重複：${f.id}`);
      fids.add(f.id);
      if (f.color && !/^#[0-9a-fA-F]{6}$/.test(f.color)) err(`勢力 ${f.name} 的 color 要寫成 #RRGGBB`);
    }
    const cids = new Set();
    for (const c of cities) {
      if (!c || !c.id) { err('每座城都要有 id'); continue; }
      if (cids.has(c.id)) err(`城市重複：${c.id}`);
      cids.add(c.id);
      if (!num(c.x, 0, 1000) || !num(c.y, 0, 760)) err(`城市 ${c.id} 的座標要在 x 0～1000、y 0～760 之內`);
      if (c.owner && !fids.has(c.owner)) err(`城市 ${c.id} 的 owner「${c.owner}」不是任何勢力`);
      if (!num(c.troops, 0, 999999)) err(`城市 ${c.id} 的 troops 不正確`);
    }
    for (const r of roads) if (!Array.isArray(r) || !cids.has(r[0]) || !cids.has(r[1])) err(`道路 ${JSON.stringify(r)} 連到不存在的城市`);
    const gnames = new Set();
    for (const g of generals) {
      if (!g || !g.name) { err('每位人物都要有 name'); continue; }
      if (gnames.has(g.name)) err(`人物重複：${g.name}`);
      gnames.add(g.name);
      for (const k of ['lead', 'war', 'int', 'pol', 'cha']) if (!num(g[k], 1, 100)) err(`${g.name} 的 ${k} 要是 1～100`);
      if (!cids.has(g.city)) err(`${g.name} 所在的城「${g.city}」不存在`);
      if (g.faction && !fids.has(g.faction)) err(`${g.name} 的 faction「${g.faction}」不是任何勢力`);
      if (g.status && !['active', 'free'].includes(g.status)) err(`${g.name} 的 status 只能是 active 或 free`);
    }
    for (const f of factions) {
      const r = generals.find((g) => g.name === f.ruler);
      if (!r) err(`勢力 ${f.name} 的首領「${f.ruler}」不在人物名單`);
      else if (r.faction !== f.id) err(`勢力 ${f.name} 的首領 ${f.ruler} 的 faction 不是 ${f.id}`);
      if (!cities.some((c) => c.owner === f.id)) err(`勢力 ${f.name} 沒有任何城`);
    }
    for (const [a, b, st] of d.relations || []) if (!fids.has(a) || !fids.has(b) || !STATES.includes(st)) err(`關係 ${a}／${b}／${st} 不正確`);
    for (const [n, o] of Object.entries(d.aptitude || {})) for (const v of Object.values(o || {})) if (!APT.includes(v)) err(`${n} 的適性只能是 S／A／B／C`);
    for (const ev of d.events || []) if (!ev || !ev.id || !ev.title || !Array.isArray(ev.lines)) err('事件需要 id、title 與 lines');
    if (errs.length) throw new Error(errs.join('\n'));

    // 轉成遊戲內部格式
    const sc = {
      id: 'mod:' + String(d.id || d.title).replace(/^mod:/, ''), mod: true,
      title: d.title, year: d.year, month: d.month, tag: d.tag || '自訂劇本', desc: d.desc || '',
      aptitude: Object.assign({}, (TK.WORLD && TK.WORLD.aptitude) || {}, d.aptitude || {}),
      factions: factions.map((f) => ({ id: f.id, name: f.name, ruler: f.ruler, color: f.color || '#888888',
        heirs: (f.heirs || []).filter((h) => generals.some((g) => g.name === h && g.faction === f.id)), strategist: f.strategist || null,
        npc: !!f.npc, dormant: !!f.dormant || undefined, side: ['axis', 'neutral'].includes(f.side) ? f.side : 'allies' })),
      cities: cities.map((c) => Object.assign({ name: c.id, gold: 800, food: 8000, pop: 300000, farm: 400, commerce: 400, defense: 400, order: 60, train: 40 }, c,
        { owner: c.owner || null })),
      roads: roads.map((r) => [r[0], r[1]]),
      sea: (Array.isArray(d.sea) ? d.sea : []).filter((r) => Array.isArray(r) && cids.has(r[0]) && cids.has(r[1])),
      coop: num(d.coop, 0, 100) ? d.coop : null,
      axisPlan: Array.isArray(d.axisPlan) ? d.axisPlan : [],
      generals: generals.map((g) => {
        const fac = factions.find((f) => f.id === g.faction);
        return { id: g.name, name: g.name, faction: g.faction || null, city: g.city, lead: g.lead, war: g.war, int: g.int, pol: g.pol, cha: g.cha,
          loyalty: g.faction ? (fac && fac.ruler === g.name ? 100 : num(g.loyalty, 0, 100) ? g.loyalty : 80) : 0,
          status: g.faction ? 'active' : 'free', hidden: !g.faction, ruler: !!(fac && fac.ruler === g.name) };
      }),
      relations: d.relations || [],
      events: (d.events || []).map((e) => Object.assign({ historical: true }, e)),
      bios: d.bios || {},
    };
    return sc;
  }

  // 登錄到劇本清單（同 id 取代舊的），列傳也一併加入
  function register(sc) {
    TK.SCENARIOS = (TK.SCENARIOS || []).filter((x) => x.id !== sc.id).concat(sc);
    if (sc.bios) TK.BIOS = Object.assign({}, sc.bios, TK.BIOS || {}, sc.bios);
    return sc;
  }

  // 瀏覽器保存：存原始 JSON，下次開啟自動載入
  function storage() { try { return globalThis.localStorage || null; } catch (e) { return null; } }
  function saved() {
    const ls = storage();
    if (!ls) return [];
    try { return JSON.parse(ls.getItem(STORE_KEY) || '[]'); } catch (e) { return []; }
  }
  function persist(list) { const ls = storage(); if (ls) try { ls.setItem(STORE_KEY, JSON.stringify(list)); } catch (e) { /* 空間不足時略過 */ } }
  function install(json) {
    const sc = register(importScenario(json));
    persist(saved().filter((d) => 'mod:' + String(d.id || d.title).replace(/^mod:/, '') !== sc.id).concat(json));
    return sc;
  }
  function remove(id) {
    TK.SCENARIOS = (TK.SCENARIOS || []).filter((x) => x.id !== id);
    persist(saved().filter((d) => 'mod:' + String(d.id || d.title).replace(/^mod:/, '') !== id));
  }
  function loadSaved() {
    for (const d of saved()) { try { register(importScenario(d)); } catch (e) { /* 壞掉的自訂劇本略過 */ } }
  }

  // 範例：假如張自忠沒有殉國（以七七事變為底，張自忠升任第二十九軍首領並加強華北守軍；虛構）
  function sample() {
    const base = (TK.scenarioById && TK.scenarioById('1937')) || TK.SCENARIOS[0];
    const d = exportScenario(base);
    d.id = 'zhang_zizhong';
    d.title = '假如華北守住了';
    d.tag = '自訂劇本範例';
    d.desc = '如果第二十九軍事先得到增援，北平、天津的守軍兵力加倍，張自忠統率全軍……（虛構劇本）';
    for (const c of d.cities) if (c.owner === 'song') c.troops *= 2;
    const song = d.factions.find((f) => f.id === 'song');
    song.strategist = '張自忠';
    const z = d.generals.find((g) => g.name === '張自忠');
    if (z) { z.lead = Math.min(100, z.lead + 4); z.loyalty = 100; }
    d.events = d.events.filter((e) => e.id !== 'nanyuan');
    return d;
  }

  TK.Mod = { FORMAT, sample, exportScenario, importScenario, register, install, remove, loadSaved, saved };
  loadSaved();
})(globalThis.TK = globalThis.TK || {});
