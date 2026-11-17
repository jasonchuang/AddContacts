/* 介面：地圖、城市面板、指令視窗、戰報、存讀檔。 */
(function (TK) {
  'use strict';
  const E = TK.Engine;
  const SAVE_KEY = 'qunxiong.save.v1';
  const AUTO_KEY = 'qunxiong.auto.v1';
  const $ = (id) => document.getElementById(id);
  const SVG = 'http://www.w3.org/2000/svg';

  let S = null;
  let selected = null;

  // ---------- 小工具 ----------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat()) if (k != null) el.append(k.nodeType ? k : document.createTextNode(String(k)));
    return el;
  }
  function svg(tag, attrs, ...kids) {
    const el = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
    for (const k of kids) el.append(k.nodeType ? k : document.createTextNode(String(k)));
    return el;
  }
  function fmt(n) { return Math.round(n).toLocaleString('zh-Hant'); }
  function color(fid) { return fid ? S.factions[fid].color : '#bdb3a0'; }
  function genLabel(g) { return `${g.name}（統${g.lead} 武${g.war} 智${g.int} 政${g.pol} 魅${g.cha}）`; }

  let toastTimer = null;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), 2600);
  }

  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val);
      return true;
    } catch (e) { return null; }
  }

  // ---------- 視窗 ----------
  let modalOk = null;
  function openModal(title, body, onOk, opts) {
    opts = opts || {};
    $('modal-title').textContent = title;
    const b = $('modal-body');
    b.replaceChildren(body);
    $('modal-ok').textContent = opts.okText || '確定';
    $('modal-ok').style.display = opts.noOk ? 'none' : '';
    $('modal-cancel').textContent = opts.cancelText || (opts.noOk ? '關閉' : '取消');
    $('modal-cancel').style.display = opts.noCancel ? 'none' : '';
    modalOk = onOk;
    $('modal').classList.remove('hidden');
  }
  function closeModal() { $('modal').classList.add('hidden'); modalOk = null; }

  function field(label, input, hint) {
    return h('div', { class: 'field' }, h('label', {}, label), input, hint ? h('div', { class: 'hint' }, hint) : null);
  }
  function selectOf(options, onchange) {
    const sel = h('select', onchange ? { onchange } : {}, options.map((o) => h('option', { value: o.value }, o.label)));
    return sel;
  }
  function numberOf(max, def, step) {
    return h('input', { type: 'number', min: 0, max, step: step || 100, value: Math.min(def, max) });
  }
  function checksOf(options, checkedCount) {
    return h('div', { class: 'checks' }, options.map((o, i) =>
      h('label', {}, h('input', { type: 'checkbox', value: o.value, checked: i < (checkedCount || 0) }), ' ', o.label)));
  }
  function checkedValues(box) { return Array.from(box.querySelectorAll('input:checked')).map((x) => x.value); }

  // ---------- 主流程 ----------
  function startScreen(first) {
    first = first === true;
    const list = h('div', { class: 'pick-list' });
    const auto = store(AUTO_KEY);
    if (auto) {
      list.append(h('button', { class: 'primary', onclick: () => { if (loadFrom(AUTO_KEY)) closeModal(); } }, '繼續上次的遊戲（自動存檔）'));
    }
    const sc = TK.SCENARIO;
    list.append(h('p', { class: 'hint' }, `劇本：${sc.year}年「${sc.title}」。選擇你要扮演的君主：`));
    for (const f of sc.factions) {
      const cities = sc.cities.filter((c) => c.owner === f.id);
      const gens = sc.generals.filter((g) => g.faction === f.id).length;
      const troops = cities.reduce((a, c) => a + c.troops, 0);
      list.append(h('button', { onclick: () => { newGame(f.id); closeModal(); } },
        h('span', { class: 'swatch', style: `background:${f.color}` }),
        h('b', {}, f.ruler), ` ${f.name}`,
        h('small', {}, `${cities.map((c) => c.name).join('、')}｜武將 ${gens}｜兵 ${fmt(troops)}`)));
    }
    openModal('群雄逐鹿', list, null, { noOk: true, noCancel: first });
  }

  function newGame(fid) {
    S = E.newGame(fid);
    selected = E.citiesOf(S, fid)[0].id;
    E.addLog(S, `你成為了${S.factions[fid].name}的君主。目標：統一天下！`, 'major', [fid]);
    render();
  }

  function loadFrom(key) {
    const raw = store(key);
    if (!raw) { toast('沒有存檔'); return false; }
    try {
      const data = JSON.parse(raw);
      if (!data || data.version !== 1) throw new Error('版本不符');
      S = data;
      const mine = E.citiesOf(S, S.player);
      selected = mine.length ? mine[0].id : Object.keys(S.cities)[0];
      render();
      toast(`已讀取 ${E.dateStr(S)} 的存檔`);
      return true;
    } catch (e) {
      toast('存檔損毀，無法讀取');
      return false;
    }
  }

  function endMonth() {
    if (!S || S.over) return;
    const last = S.log[S.log.length - 1];
    E.endTurn(S);
    store(AUTO_KEY, JSON.stringify(S));
    const fresh = S.log.slice(S.log.lastIndexOf(last) + 1);
    const mine = fresh.filter((l) => l.kind === 'battle' && l.factions.includes(S.player) || l.kind === 'major');
    if (selected && S.cities[selected].owner !== S.player) {
      const c = E.citiesOf(S, S.player)[0];
      if (c) selected = c.id;
    }
    render();
    if (S.over) return gameOver();
    if (mine.length) {
      openModal(`${E.dateStr(S)}・本月戰報`, h('ol', { id: 'report' }, mine.map((l) => h('li', {}, l.text))), null, { noOk: true });
    } else {
      toast(`進入 ${E.dateStr(S)}`);
    }
  }

  function gameOver() {
    const win = S.over.result === 'win';
    openModal(win ? '天下統一！' : '勢力覆滅', h('p', {}, win
      ? `${E.dateStr(S)}，${S.factions[S.player].name}平定四方，結束了亂世。`
      : `${E.dateStr(S)}，${S.factions[S.player].name}的最後一座城陷落了。`), () => { startScreen(); return false; }, { okText: '重新開始', cancelText: '查看地圖' });
  }

  function run(cmd) {
    const r = E.exec(S, S.player, cmd);
    if (!r.ok) { toast(r.msg); return false; }
    if (!r.battle) E.addLog(S, r.msg, 'info', [S.player]);
    render();
    if (r.battle) {
      openModal(r.battle.result === 'win' ? '攻城勝利' : '攻城失敗', h('ol', {}, r.battle.lines.map((l) => h('li', {}, l))), null, { noOk: true });
      if (E.checkEnd(S)) gameOver();
      return 'keep';
    }
    toast(r.msg);
    return true;
  }

  // ---------- 繪製 ----------
  function render() {
    renderStatus();
    renderMap();
    renderCity();
    renderFactions();
    renderLog();
  }

  function renderStatus() {
    const f = S.factions[S.player];
    const p = E.powerOf(S, S.player);
    $('status').replaceChildren(
      h('span', { class: 'swatch', style: `background:${f.color}` }),
      h('b', {}, `${E.dateStr(S)}　${f.name}`),
      `　城 ${p.cities}｜兵 ${fmt(p.troops)}｜金 ${fmt(p.gold)}｜糧 ${fmt(p.food)}｜武將 ${p.generals}`);
    $('btn-end').disabled = !!S.over;
  }

  // 自繪的簡化地形（非任何既有作品的地圖）
  const LAND = 'M40,40 L960,30 L980,250 L940,320 L960,420 L930,520 L975,600 L960,705 L40,705 Z';
  const RIVERS = [
    'M60,250 C200,230 300,280 420,300 S600,250 700,260 S860,230 990,215',
    'M80,520 C200,560 330,580 470,590 S620,600 700,580 S820,540 990,545',
  ];

  function renderMap() {
    const map = $('map');
    const kids = [svg('path', { class: 'land', d: LAND })];
    for (const d of RIVERS) kids.push(svg('path', { class: 'river', d }));
    for (const [a, b] of S.roads) {
      const A = S.cities[a], B = S.cities[b];
      kids.push(svg('line', { class: 'road', x1: A.x, y1: A.y, x2: B.x, y2: B.y }));
    }
    const sel = selected && S.cities[selected];
    const targets = sel && sel.owner === S.player ? E.neighbors(S, sel.id) : [];
    for (const c of Object.values(S.cities)) {
      const hasRuler = E.generalsIn(S, c.id, (g) => g.ruler && g.status === 'active').length > 0;
      const cls = 'city' + (c.id === selected ? ' sel' : '') + (targets.includes(c.id) && S.cities[c.id].owner !== S.player ? ' target' : '');
      const grp = svg('g', { class: cls, tabindex: 0, role: 'button', 'aria-label': c.name },
        svg('circle', { class: 'ring', cx: c.x, cy: c.y, r: 20 }),
        svg('circle', { class: 'dot', cx: c.x, cy: c.y, r: 13, fill: color(c.owner) }),
        svg('text', { x: c.x, y: c.y + 32 }, c.name),
        svg('text', { class: 'troops', x: c.x, y: c.y - 19 }, fmt(c.troops)));
      if (hasRuler) grp.append(svg('text', { class: 'ruler-mark', x: c.x, y: c.y + 4 }, '主'));
      grp.addEventListener('click', () => { selected = c.id; render(); });
      grp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { selected = c.id; render(); } });
      kids.push(grp);
    }
    map.replaceChildren(...kids);
  }

  function renderCity() {
    const panel = $('city-panel');
    const c = S.cities[selected];
    if (!c) { panel.replaceChildren(h('p', {}, '點選地圖上的城市')); return; }
    const mine = c.owner === S.player;
    const stat = (k, v) => h('div', {}, h('span', {}, k), v);
    const head = h('h2', {}, h('span', { class: 'swatch', style: `background:${color(c.owner)}` }), `${c.name}　`,
      h('small', { class: 'hint' }, E.factionName(S, c.owner)));
    const stats = h('div', { class: 'stats' },
      stat('兵', fmt(c.troops)), stat('訓練', c.train), stat('城防', c.defense),
      stat('金', fmt(c.gold)), stat('糧', fmt(c.food)), stat('人口', fmt(c.pop)),
      stat('農業', c.farm), stat('商業', c.commerce), stat('民心', c.order));

    const gens = c.owner ? E.officers(S, c.id) : [];
    const table = h('table', { class: 'gens' },
      h('tr', {}, ['武將', '統', '武', '智', '政', '魅', '忠'].map((t) => h('th', {}, t))),
      gens.map((g) => h('tr', { class: g.acted ? 'acted' : '' },
        h('td', {}, g.name, g.ruler ? h('span', { class: 'tag' }, '君主') : null, g.acted && mine ? h('span', { class: 'tag' }, '已行動') : null),
        [g.lead, g.war, g.int, g.pol, g.cha, g.ruler ? '—' : g.loyalty].map((v) => h('td', {}, v)))));

    const free = E.generalsIn(S, c.id, (g) => g.status === 'free' && !g.hidden);
    const prisoners = E.generalsIn(S, c.id, (g) => g.status === 'prisoner');
    const extra = [];
    if (free.length) extra.push(h('h3', {}, '在野人才'), h('div', {}, free.map((g) => g.name).join('、')));
    if (prisoners.length) extra.push(h('h3', {}, '俘虜'), h('div', {}, prisoners.map((g) => g.name).join('、')));

    const parts = [head, stats, h('h3', {}, `武將（${gens.length}）`), gens.length ? table : h('div', { class: 'hint' }, '無人駐守'), ...extra];
    if (mine && !S.over) parts.push(h('h3', {}, '指令'), commandButtons(c));
    panel.replaceChildren(...parts);
  }

  function commandButtons(c) {
    const ready = E.officers(S, c.id).filter((g) => !g.acted);
    const has = ready.length > 0;
    const prisoners = E.generalsIn(S, c.id, (g) => g.status === 'prisoner');
    const btn = (label, fn, enabled) => h('button', { onclick: fn, disabled: !enabled }, label);
    return h('div', { class: 'cmds' },
      Object.entries(E.DEV).map(([type, d]) => btn(d.label, () => devDialog(c, type), has)),
      btn('徵兵', () => draftDialog(c), has),
      btn('搜索', () => simpleDialog(c, 'search', '搜索', '尋找在野人才或金錢。智略越高越容易發現人才。'), has),
      btn('登用', () => recruitDialog(c), has),
      btn('賞賜', () => rewardDialog(c), E.officers(S, c.id).some((g) => !g.ruler)),
      btn('移動', () => moveDialog(c), has),
      btn('出征', () => attackDialog(c), has),
      btn('俘虜', () => prisonerDialog(c), prisoners.length > 0));
  }

  function execSelect(c, sortKey) {
    const ready = E.officers(S, c.id).filter((g) => !g.acted).sort((a, b) => b[sortKey] - a[sortKey]);
    return selectOf(ready.map((g) => ({ value: g.id, label: genLabel(g) })));
  }

  function devDialog(c, type) {
    const d = E.DEV[type];
    const statName = { pol: '政務', lead: '統率', cha: '魅力' }[d.stat];
    const sel = execSelect(c, d.stat);
    openModal(`${d.label}（${c.name}）`, h('div', {},
      field('執行武將', sel, `花費金 ${d.cost}。效果取決於${statName}。`)), () => run({ type, city: c.id, general: sel.value }));
  }

  function simpleDialog(c, type, title, hint) {
    const sel = execSelect(c, 'int');
    openModal(`${title}（${c.name}）`, h('div', {}, field('執行武將', sel, hint)), () => run({ type, city: c.id, general: sel.value }));
  }

  function draftDialog(c) {
    const info = h('div', { class: 'hint' });
    const amt = numberOf(0, 3000, 500);
    const update = () => {
      const g = S.generals[sel.value];
      const max = E.maxDraft(S, c, g);
      amt.max = max;
      info.textContent = `最多可徵 ${fmt(max)}（受魅力、金、人口限制）。每 1000 兵花費金 100，會降低民心。`;
    };
    const sel = execSelect(c, 'cha');
    sel.addEventListener('change', update);
    update();
    amt.value = Math.min(3000, Number(amt.max));
    openModal(`徵兵（${c.name}）`, h('div', {}, field('執行武將', sel), field('徵兵數', amt), info),
      () => run({ type: 'draft', city: c.id, general: sel.value, amount: Number(amt.value) }));
  }

  function recruitDialog(c) {
    const targets = E.generalsIn(S, c.id, (g) => (g.status === 'free' && !g.hidden) || g.status === 'prisoner');
    if (!targets.length) { toast('城中沒有可登用的人才，先「搜索」看看'); return; }
    const sel = execSelect(c, 'cha');
    const tsel = selectOf(targets.map((g) => ({ value: g.id, label: (g.status === 'prisoner' ? '【俘】' : '') + genLabel(g) })));
    const hint = h('div', { class: 'hint' });
    const update = () => {
      const p = E.recruitChance(S, S.generals[sel.value], S.generals[tsel.value]);
      hint.textContent = `成功率約 ${Math.round(p * 100)}%（取決於魅力）`;
    };
    sel.addEventListener('change', update); tsel.addEventListener('change', update); update();
    openModal(`登用（${c.name}）`, h('div', {}, field('執行武將', sel), field('對象', tsel), hint),
      () => run({ type: 'recruit', city: c.id, general: sel.value, target: tsel.value }));
  }

  function rewardDialog(c) {
    const list = E.officers(S, c.id).filter((g) => !g.ruler).sort((a, b) => a.loyalty - b.loyalty);
    const tsel = selectOf(list.map((g) => ({ value: g.id, label: `${g.name}（忠誠 ${g.loyalty}）` })));
    openModal(`賞賜（${c.name}）`, h('div', {}, field('對象', tsel, '花費金 100，提升忠誠。不消耗行動。')),
      () => run({ type: 'reward', city: c.id, target: tsel.value }));
  }

  function prisonerDialog(c) {
    const list = E.generalsIn(S, c.id, (g) => g.status === 'prisoner');
    const tsel = selectOf(list.map((g) => ({ value: g.id, label: genLabel(g) })));
    const act = selectOf([{ value: 'release', label: '釋放' }, { value: 'execute', label: '處斬' }]);
    openModal(`處置俘虜（${c.name}）`, h('div', {}, field('俘虜', tsel, '想收為己用請改用「登用」。'), field('處置', act)),
      () => run({ type: act.value, city: c.id, target: tsel.value }));
  }

  function moveDialog(c) {
    const dests = E.neighbors(S, c.id).filter((id) => S.cities[id].owner === S.player);
    if (!dests.length) { toast('沒有相鄰的我方城市'); return; }
    const dsel = selectOf(dests.map((id) => ({ value: id, label: id })));
    const ready = E.officers(S, c.id).filter((g) => !g.acted);
    const gbox = checksOf(ready.map((g) => ({ value: g.id, label: genLabel(g) })), 1);
    const tr = numberOf(c.troops, 0, 1000), gold = numberOf(c.gold, 0, 100), food = numberOf(c.food, 0, 1000);
    openModal(`移動（${c.name}）`, h('div', {},
      field('目的地', dsel), field('移動武將', gbox),
      field(`帶兵（最多 ${fmt(c.troops)}）`, tr), field(`運金（最多 ${fmt(c.gold)}）`, gold), field(`運糧（最多 ${fmt(c.food)}）`, food)),
    () => {
      const ids = checkedValues(gbox);
      if (!ids.length) { toast('請至少選一名武將'); return false; }
      return run({ type: 'move', city: c.id, general: ids[0], generals: ids, dest: dsel.value, troops: +tr.value, gold: +gold.value, food: +food.value });
    });
  }

  function attackDialog(c) {
    const targets = E.neighbors(S, c.id).filter((id) => S.cities[id].owner !== S.player);
    if (!targets.length) { toast('沒有相鄰的敵城'); return; }
    const tsel = selectOf(targets.map((id) => {
      const t = S.cities[id];
      return { value: id, label: `${id}（${E.factionName(S, t.owner)}，兵 ${fmt(t.troops)}，城防 ${t.defense}）` };
    }));
    const ready = E.officers(S, c.id).filter((g) => !g.acted).sort((a, b) => (b.lead + b.war) - (a.lead + a.war));
    const gbox = checksOf(ready.map((g) => ({ value: g.id, label: genLabel(g) })), 1);
    const tr = numberOf(c.troops, Math.floor(c.troops * 0.7), 1000);
    openModal(`出征（${c.name}）`, h('div', {},
      field('目標', tsel),
      field('出陣武將（最多 3 名，統率最高者為主將）', gbox),
      field(`兵力（最多 ${fmt(c.troops)}）`, tr, `軍糧消耗：兵力 ÷ 10（城中有 ${fmt(c.food)}）。戰敗時殘兵撤回本城。`)),
    () => {
      const ids = checkedValues(gbox);
      if (!ids.length) { toast('請至少選一名武將'); return false; }
      if (ids.length > 3) { toast('最多 3 名武將'); return false; }
      return run({ type: 'attack', city: c.id, general: ids[0], generals: ids, target: tsel.value, troops: +tr.value });
    });
  }

  function renderFactions() {
    const rows = Object.values(S.factions).map((f) => {
      const p = E.powerOf(S, f.id);
      return { f, p };
    }).sort((a, b) => b.p.cities - a.p.cities || b.p.troops - a.p.troops);
    $('faction-panel').replaceChildren(h('h2', {}, '勢力一覽'),
      h('table', { class: 'factions' },
        h('tr', {}, ['勢力', '城', '兵', '武將'].map((t) => h('th', {}, t))),
        rows.map(({ f, p }) => h('tr', { class: (f.id === S.player ? 'me' : '') + (f.alive ? '' : ' dead') },
          h('td', {}, h('span', { class: 'swatch', style: `background:${f.color}` }), f.name),
          h('td', {}, p.cities), h('td', {}, fmt(p.troops)), h('td', {}, p.generals)))));
  }

  function renderLog() {
    const items = S.log.slice(-120).reverse().map((l) => {
      const mine = l.factions.includes(S.player);
      const cls = l.kind === 'major' ? 'major' : l.kind === 'warn' && mine ? 'warn' : mine ? 'mine' : 'other';
      return h('li', { class: cls }, h('span', { class: 'd' }, l.date), l.text);
    });
    $('log').replaceChildren(...items);
  }

  // ---------- 綁定 ----------
  function bind() {
    $('modal-cancel').addEventListener('click', closeModal);
    $('modal-ok').addEventListener('click', () => {
      if (!modalOk) return closeModal();
      const r = modalOk();
      if (r === true) closeModal();
      // 'keep'：已換成結果視窗；false：保留原視窗
    });
    $('modal').addEventListener('click', (e) => { if (e.target.id === 'modal' && $('modal-cancel').style.display !== 'none') closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('modal-cancel').style.display !== 'none') closeModal(); });
    $('btn-end').addEventListener('click', endMonth);
    $('btn-new').addEventListener('click', () => startScreen());
    $('btn-save').addEventListener('click', () => {
      if (!S) return;
      toast(store(SAVE_KEY, JSON.stringify(S)) ? `已存檔（${E.dateStr(S)}）` : '此瀏覽器無法存檔');
    });
    $('btn-load').addEventListener('click', () => loadFrom(SAVE_KEY));
  }

  bind();
  newGame('cao');
  startScreen(true);
})(globalThis.TK = globalThis.TK || {});
