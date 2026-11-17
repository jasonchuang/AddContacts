/* 介面：標題、地圖、城市面板、指令視窗、戰鬥動畫、換月橫幅、存讀檔。 */
(function (TK) {
  'use strict';
  const E = TK.Engine, I = TK.Icons, SND = TK.Sound;
  const SAVE_KEY = 'qunxiong.save.v1';
  const AUTO_KEY = 'qunxiong.auto.v1';
  const $ = (id) => document.getElementById(id);
  const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const SEASONS = [['spring', '春'], ['summer', '夏'], ['autumn', '秋'], ['winter', '冬']];
  const NEUTRAL_COLOR = '#a39a8a';

  const CMD = {
    farm: { label: '開墾', icon: 'farm', color: '#3e9b4f' },
    commerce: { label: '商業', icon: 'commerce', color: '#d9822b' },
    defense: { label: '築城', icon: 'defense', color: '#6c7a89' },
    order: { label: '巡察', icon: 'order', color: '#b8901c' },
    train: { label: '訓練', icon: 'train', color: '#b03a2e' },
    draft: { label: '徵兵', icon: 'draft', color: '#2e86c1' },
    search: { label: '搜索', icon: 'search', color: '#16a085' },
    recruit: { label: '登用', icon: 'recruit', color: '#8e44ad' },
    reward: { label: '賞賜', icon: 'reward', color: '#c0392b' },
    move: { label: '移動', icon: 'move', color: '#a0522d' },
    attack: { label: '出征', icon: 'attack', color: '#8b1a12' },
    prisoner: { label: '俘虜', icon: 'prisoner', color: '#566573' },
  };

  let S = null;
  let selected = null;
  let busy = false;
  let lastRes = {};

  // ---------- 小工具 ----------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'class') el.className = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(String(k)));
    return el;
  }
  function raw(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }
  const ic = (name) => raw(I.icon(name));
  function fmt(n) { return Math.round(n).toLocaleString('zh-Hant'); }
  // 用「萬」表示大數字，減少畫面上的數字感
  function fmtW(n) {
    n = Math.round(n);
    if (Math.abs(n) >= 10000) return `${(n / 10000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, '')}萬`;
    return String(n);
  }
  // 能力評等
  function grade(v) { return v >= 90 ? 'S' : v >= 80 ? 'A' : v >= 70 ? 'B' : v >= 60 ? 'C' : 'D'; }
  function gradeChip(label, v) { return h('i', { class: `gr gr-${grade(v)}`, title: `${label} ${v}` }, label, h('b', {}, grade(v))); }
  function color(fid) {
    const fs = S ? S.factions : null;
    if (fid && fs && fs[fid]) return fs[fid].color;
    const f = fid && TK.SCENARIO.factions.find((x) => x.id === fid);
    return f ? f.color : NEUTRAL_COLOR;
  }
  // 勢力朱印（方形印章）
  function sealStamp(fid, size) {
    const f = fid && S && S.factions[fid] ? S.factions[fid] : TK.SCENARIO.factions.find((x) => x.id === fid);
    if (!f) return h('span', { class: 'stamp-sq neutral', style: `--sz:${size || 28}px` }, '空');
    return h('span', { class: 'stamp-sq', style: `--sc:${f.color};--sz:${size || 28}px` }, sealChar(f.ruler));
  }
  function sealChar(name) { return name ? name.slice(-1) : '守'; }
  function seal(name, fid, ruler) {
    return h('div', { class: 'seal' + (ruler ? ' ruler' : ''), style: `--sc:${color(fid)}` }, sealChar(name));
  }
  // 武將小頭像（點擊可開啟列傳）
  function portraitMini(g, opts) {
    opts = opts || {};
    const el = h('button', {
      class: 'pmini' + (g.ruler ? ' ruler' : '') + (opts.size ? ' ' + opts.size : ''),
      style: `--sc:${color(g.faction || g.formerFaction)}`, title: `${g.name}：查看列傳`,
      onclick: (e) => { e.stopPropagation(); SND.click(); showGeneral(g.id); },
    }, portraitArt(g, 'head'));
    return el;
  }

  // 有插畫用插畫，否則用向量肖像
  function portraitArt(g, mode) {
    const url = TK.Portrait.art(g);
    if (url) return h('span', { class: 'p-img ' + mode, style: `background-image:url("${url}")`, role: 'img', 'aria-label': g.name });
    return raw(TK.Portrait.svg(g, color(g.faction || g.formerFaction), mode));
  }

  function showGeneral(id) {
    const g = S ? S.generals[id] : TK.SCENARIO.generals.find((x) => x.id === id);
    if (!g) return;
    const fid = g.faction || g.formerFaction;
    const col = color(fid);
    const t = TK.Portrait.traits(g);
    const statusText = { active: '仕官', free: '在野', prisoner: '俘虜', dead: '已故' }[g.status] || '';
    const bar = (label, v, c) => h('div', { class: 'gstat' }, h('span', {}, label),
      h('div', { class: 'track' }, h('div', { class: 'fill', style: `width:${v}%;background:${c}` })),
      h('b', {}, h('em', { class: `gr-${grade(v)}` }, grade(v)), ` ${v}`));
    const body = h('div', { class: 'gdetail' },
      h('div', { class: 'pbig', style: `--sc:${col}` }, portraitArt(g, 'full')),
      h('div', { class: 'ginfo' },
        h('div', { class: 'gtitle' }, g.name, t.title ? h('span', { class: 'epithet' }, t.title) : null),
        h('div', { class: 'gtags' },
          h('span', { class: 'owner', style: `background:${col}` }, g.faction ? E.factionName(S || { factions: {} }, g.faction) : statusText),
          h('span', { class: 'tag' }, TK.Portrait.classLabel(g, t)),
          h('span', { class: 'tag alt' }, `武器：${TK.Portrait.WEAPON_NAME[t.weapon] || '—'}`)),
        h('div', { class: 'hint' }, g.city ? `所在：${g.city}（${statusText}）` : statusText),
        bar('統率', g.lead, '#2f5f8f'), bar('武力', g.war, '#b23a2c'), bar('智略', g.int, '#5e4280'),
        bar('政務', g.pol, '#3d7a4c'), bar('魅力', g.cha, '#b8892c'),
        g.ruler || g.status !== 'active' ? null : bar('忠誠', g.loyalty, '#6b6358')));
    openModal('武將列傳', body, null, { noOk: true, icon: 'general' });
  }

  function genLabel(g) { return `${g.name}（統${grade(g.lead)} 武${grade(g.war)} 智${grade(g.int)} 政${grade(g.pol)} 魅${grade(g.cha)}）`; }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  let toastTimer = null;
  function toast(msg, bad) {
    const t = $('toast');
    t.textContent = msg;
    t.className = 'toast' + (bad ? ' bad' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), 2600);
    if (bad) SND.error();
  }

  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val);
      return true;
    } catch (e) { return null; }
  }
  function saveMeta(key) {
    const raw = store(key);
    if (!raw) return null;
    try {
      const d = JSON.parse(raw);
      return d && d.version === 1 ? `${d.year}年${d.month}月・${d.factions[d.player].name}` : null;
    } catch (e) { return null; }
  }

  // ---------- 一般視窗 ----------
  let modalOk = null;
  function openModal(title, body, onOk, opts) {
    opts = opts || {};
    const t = $('modal-title');
    t.replaceChildren();
    if (opts.icon) t.append(ic(opts.icon));
    t.append(title);
    $('modal-body').replaceChildren(body);
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
  function selectOf(options) {
    return h('select', {}, options.map((o) => h('option', { value: o.value }, o.label)));
  }
  function numberOf(max, def, step) {
    return h('input', { type: 'number', min: 0, max, step: step || 100, value: Math.max(0, Math.min(def, max)) });
  }
  function checksOf(options, checkedCount) {
    return h('div', { class: 'checks' }, options.map((o, i) =>
      h('label', {}, h('input', { type: 'checkbox', value: o.value, checked: i < (checkedCount || 0) }), o.label)));
  }
  function checkedValues(box) { return Array.from(box.querySelectorAll('input:checked')).map((x) => x.value); }

  // ---------- 標題畫面 ----------
  function showTitle() {
    $('game').classList.add('hidden');
    $('title-screen').classList.remove('hidden');
    $('faction-pick').classList.add('hidden');
    const menu = $('title-menu');
    menu.classList.remove('hidden');
    renderTitleLandscape();
    const seals = h('div', { class: 'title-seals' }, TK.SCENARIO.factions.map((f) => sealStamp(f.id, 30)));
    const btns = [seals, h('button', { class: 'lacquer', onclick: () => { SND.click(); showFactionPick(); } }, '開始新遊戲')];
    const auto = saveMeta(AUTO_KEY), manual = saveMeta(SAVE_KEY);
    if (auto) btns.push(h('button', { class: 'ghost', onclick: () => loadFrom(AUTO_KEY) }, `繼續遊戲（${auto}）`));
    if (manual) btns.push(h('button', { class: 'ghost', onclick: () => loadFrom(SAVE_KEY) }, `讀取存檔（${manual}）`));
    menu.replaceChildren(...btns);
  }

  // 標題背景：層疊的水墨遠山、飛鳥與紅日
  function renderTitleLandscape() {
    const el = $('title-landscape');
    if (el.firstChild) return;
    let s = '<svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMax slice" width="100%" height="100%">';
    s += '<rect width="1200" height="700" fill="#efe5cf"/>';
    s += '<circle cx="880" cy="190" r="62" fill="#b23a2c" opacity=".82" filter="url(#ink-bleed)"/>';
    const layers = [
      { y: 470, amp: 120, op: 0.22, seed: 1 }, { y: 530, amp: 150, op: 0.35, seed: 2 },
      { y: 600, amp: 140, op: 0.55, seed: 3 }, { y: 680, amp: 110, op: 0.85, seed: 4 },
    ];
    for (const L of layers) {
      let d = `M-40,700 L-40,${L.y}`;
      for (let x = -40; x <= 1240; x += 80) {
        const k = Math.sin(x * 0.011 * L.seed + L.seed) * 0.5 + Math.sin(x * 0.027 + L.seed * 3) * 0.5;
        const peak = L.y - Math.max(0, k) * L.amp - 20;
        d += ` Q${x + 40},${peak} ${x + 80},${L.y - Math.max(0, Math.sin((x + 80) * 0.019 + L.seed)) * L.amp * 0.4}`;
      }
      d += ' L1240,700 Z';
      s += `<path d="${d}" fill="url(#mtn-ink)" opacity="${L.op}" filter="url(#ink-wash)"/>`;
    }
    for (const [x, y, sc] of [[300, 210, 1], [340, 190, 0.8], [372, 226, 0.7], [410, 205, 0.6]]) {
      s += `<path d="M${x - 9 * sc},${y} Q${x - 4 * sc},${y - 5 * sc} ${x},${y} Q${x + 4 * sc},${y - 5 * sc} ${x + 9 * sc},${y}" fill="none" stroke="#1f1a14" stroke-width="1.6" opacity=".7"/>`;
    }
    s += '<rect width="1200" height="700" filter="url(#paper-grain)"/><rect width="1200" height="700" filter="url(#paper-fiber)"/>';
    s += '</svg>';
    el.innerHTML = s;
  }

  function showFactionPick() {
    $('title-menu').classList.add('hidden');
    const pick = $('faction-pick');
    pick.classList.remove('hidden');
    const sc = TK.SCENARIO;
    const cards = sc.factions.map((f) => {
      const cities = sc.cities.filter((c) => c.owner === f.id);
      const gens = sc.generals.filter((g) => g.faction === f.id).length;
      const troops = cities.reduce((a, c) => a + c.troops, 0);
      const diff = troops >= 60000 ? 1 : troops >= 40000 ? 2 : troops >= 30000 ? 3 : troops >= 15000 ? 4 : 5;
      const n = Math.max(2, Math.min(6, Math.round(troops / 10000)));
      return h('button', { class: 'fcard', style: `--fc:${f.color}`, onclick: () => { SND.gong(); newGame(f.id); } },
        h('span', { class: 'pmini lg', style: `--sc:${f.color}` }, portraitArt(sc.generals.find((x) => x.id === f.ruler), 'head')),
        h('div', {},
          h('div', { class: 'fname' }, f.name, sealStamp(f.id, 20)),
          h('div', { class: 'fmeta' }, `君主 ${f.ruler}｜${cities.map((c) => c.name).join('、')}`),
          h('div', { class: 'fmeta' }, `武將 ${gens} 名｜兵 ${fmtW(troops)}`),
          h('div', { class: 'stars' }, '難度 ' + '★'.repeat(diff) + '☆'.repeat(5 - diff))),
        h('span', { class: 'troopline' }, Array.from({ length: n }, () => raw(I.soldier(f.color)))));
    });
    pick.replaceChildren(
      h('h2', {}, `${sc.year}年「${sc.title}」・選擇君主`),
      h('div', { class: 'faction-grid' }, cards),
      h('div', { style: 'margin-top:16px' }, h('button', { class: 'ghost', onclick: showTitle }, '返回')));
  }

  function enterGame() {
    $('title-screen').classList.add('hidden');
    $('game').classList.remove('hidden');
    lastRes = {};
    render();
  }

  function newGame(fid) {
    S = E.newGame(fid);
    selected = E.citiesOf(S, fid)[0].id;
    E.addLog(S, `你成為了${S.factions[fid].name}的君主。目標：統一天下！`, 'major', [fid]);
    enterGame();
    showMonthBanner();
  }

  function loadFrom(key) {
    const rawData = store(key);
    if (!rawData) { toast('沒有存檔', true); return false; }
    try {
      const data = JSON.parse(rawData);
      if (!data || data.version !== 1) throw new Error('版本不符');
      S = data;
      const mine = E.citiesOf(S, S.player);
      selected = mine.length ? mine[0].id : Object.keys(S.cities)[0];
      closeModal();
      enterGame();
      SND.gong();
      toast(`已讀取 ${E.dateStr(S)} 的存檔`);
      return true;
    } catch (e) {
      toast('存檔損毀，無法讀取', true);
      return false;
    }
  }

  // ---------- 換月 ----------
  async function showMonthBanner() {
    const b = $('month-banner');
    const [cls, name] = SEASONS[Math.floor((S.month - 1) / 3)];
    b.replaceChildren(h('div', { class: 'mb' },
      h('div', { class: 'y' }, `${S.year}年`),
      h('div', { class: 'm' }, MONTHS[S.month - 1]),
      h('div', {}, h('span', { class: `season ${cls}`, style: 'padding:0 10px;border-radius:10px;color:#fff' }, name))));
    b.classList.remove('hidden');
    // 重新觸發動畫
    b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
    SND.month();
    await wait(1400);
    b.classList.add('hidden');
  }

  async function endMonth() {
    if (!S || S.over || busy) return;
    busy = true;
    $('btn-end').disabled = true;
    const battles = [];
    const last = S.log[S.log.length - 1];
    E.onBattle = (r) => {
      if (r.atk.faction === S.player || r.def.faction === S.player) battles.push(r);
    };
    try { E.endTurn(S); } finally { E.onBattle = null; }
    store(AUTO_KEY, JSON.stringify(S));
    const fresh = S.log.slice(S.log.lastIndexOf(last) + 1);
    if (selected && S.cities[selected].owner !== S.player) {
      const c = E.citiesOf(S, S.player)[0];
      if (c) selected = c.id;
    }
    render();
    await showMonthBanner();
    for (const r of battles.slice(0, 3)) await playBattle(r);
    const rest = battles.slice(3);
    const majors = fresh.filter((l) => l.kind === 'major');
    busy = false;
    render();
    if (S.over) return gameOver();
    if (rest.length || majors.length) {
      openModal(`${E.dateStr(S)}・天下情勢`, h('ol', { class: 'report' },
        majors.map((l) => h('li', {}, l.text)),
        rest.map((r) => h('li', {}, r.summary))), null, { noOk: true, icon: 'city' });
    }
  }

  function gameOver() {
    const win = S.over.result === 'win';
    if (win) SND.win(); else SND.lose();
    openModal(win ? '天下統一！' : '勢力覆滅', h('div', {},
      h('p', {}, win
        ? `${E.dateStr(S)}，${S.factions[S.player].name}平定四方，結束了亂世。`
        : `${E.dateStr(S)}，${S.factions[S.player].name}的最後一座城陷落了。`),
      h('div', { class: 'title-soldiers' }, Array.from({ length: 8 }, () => raw(I.soldier(color(win ? S.player : null)))))),
    () => { closeModal(); showTitle(); return false; }, { okText: '回到標題', cancelText: '查看地圖', icon: win ? 'reward' : 'prisoner' });
  }

  // ---------- 下指令 ----------
  async function run(cmd) {
    const r = E.exec(S, S.player, cmd);
    if (!r.ok) { toast(r.msg, true); return false; }
    if (!r.battle) E.addLog(S, r.msg, 'info', [S.player]);
    closeModal();
    render();
    if (r.battle) {
      busy = true;
      await playBattle(r.battle);
      busy = false;
      render();
      if (E.checkEnd(S)) gameOver();
    } else {
      SND.click();
      toast(r.msg);
    }
    return 'done';
  }

  // ---------- 戰鬥動畫 ----------
  function playBattle(r) {
    return new Promise((resolve) => {
      const box = $('battle');
      const aCol = color(r.atk.faction), dCol = color(r.def.faction);
      const mine = r.atk.faction === S.player ? 'a' : r.def.faction === S.player ? 'd' : null;
      $('battle-title').textContent = `${r.city}攻防戰`;

      const army = (side, info, col) => {
        const num = h('div', { class: 'num' }, fmt(info.troops));
        const fill = h('div', { style: `width:100%;background:${col}` });
        const el = h('div', { class: 'army' + (side === 'd' ? ' right' : '') },
          info.generals.length && S.generals[info.commander]
            ? portraitMini(S.generals[info.commander], { size: 'xl' })
            : seal('守', info.faction, false),
          h('div', {},
            h('div', { class: 'an' }, info.name, side === 'a' ? '（攻）' : '（守）'),
            h('div', { class: 'ag' }, info.generals.length ? info.generals.join('・') : '守軍'),
            num, h('div', { class: 'hp' }, fill)));
        return { el, num, fill };
      };
      const A = army('a', r.atk, aCol), D = army('d', r.def, dCol);
      $('army-a').replaceWith(Object.assign(A.el, { id: 'army-a' }));
      $('army-d').replaceWith(Object.assign(D.el, { id: 'army-d' }));

      const big = Math.max(r.atk.troops, r.def.troops, 1);
      const mkUnits = (side, troops, col) => {
        const n = Math.max(4, Math.round(30 * troops / big));
        const wrap = $(side === 'a' ? 'units-a' : 'units-d');
        const units = [];
        for (let i = 0; i < n; i++) {
          const svgStr = i === 0 && (side === 'a' ? r.atk.generals.length : r.def.generals.length)
            ? I.cavalry(col, { flip: side === 'd', cls: 'cav march' })
            : I.soldier(col, { flip: side === 'd', cls: 'march' });
          const u = raw(svgStr);
          u.style.animationDelay = `${(i % 5) * 0.1}s`;
          units.push(u);
        }
        wrap.replaceChildren(...(side === 'd' ? units.slice().reverse() : units));
        return { wrap, units, n };
      };
      const UA = mkUnits('a', r.atk.troops, aCol), UD = mkUnits('d', r.def.troops, dCol);

      const ev = $('battle-event'), lines = $('battle-lines'), stamp = $('battle-stamp');
      ev.textContent = ''; lines.replaceChildren(); stamp.className = 'stamp hidden';
      const okBtn = $('battle-ok'), skipBtn = $('battle-skip');
      okBtn.classList.add('hidden'); skipBtn.classList.remove('hidden');
      box.querySelectorAll('.duel-flash').forEach((x) => x.remove());
      box.classList.remove('hidden');

      const apply = (f) => {
        const setSide = (U, cur, init, ui) => {
          const alive = init > 0 ? Math.ceil(U.n * cur / init) : 0;
          U.units.forEach((u, i) => u.classList.toggle('fallen', i >= alive));
          ui.num.textContent = fmt(cur);
          ui.fill.style.width = `${init ? Math.max(0, 100 * cur / init) : 0}%`;
        };
        setSide(UA, f.a, r.atk.troops, A);
        setSide(UD, f.d, r.def.troops, D);
      };

      let i = 1, timer = null, done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        apply(r.frames[r.frames.length - 1]);
        const atkWon = r.result === 'win';
        let text, good;
        if (mine === 'a') { text = atkWon ? '勝利' : '敗退'; good = atkWon; }
        else if (mine === 'd') { text = atkWon ? '失守' : '守住'; good = !atkWon; }
        else { text = atkWon ? '攻陷' : '擊退'; good = true; }
        stamp.textContent = text;
        stamp.className = 'stamp ' + (good ? 'win' : 'lose');
        if (good) SND.win(); else SND.lose();
        ev.textContent = r.summary;
        lines.replaceChildren(...r.lines.slice(1, -1).map((l) => h('li', {}, l)));
        skipBtn.classList.add('hidden');
        okBtn.classList.remove('hidden');
        okBtn.focus();
      };
      const step = () => {
        if (done) return;
        if (i >= r.frames.length) { finish(); return; }
        const prev = r.frames[i - 1], f = r.frames[i];
        apply(f);
        if (f.a < prev.a) { UA.wrap.classList.remove('hit'); void UA.wrap.offsetWidth; UA.wrap.classList.add('hit'); }
        if (f.d < prev.d) { UD.wrap.classList.remove('hit'); void UD.wrap.offsetWidth; UD.wrap.classList.add('hit'); }
        let delay = 420;
        if (f.kind === 'duel') {
          const fl = h('div', { class: 'duel-flash' }, h('div', {}, '單挑！', h('div', { style: 'font-size:28px' }, `${f.duel[0]} vs ${f.duel[1]}`)));
          box.querySelector('.battle-box').append(fl);
          SND.clash(); setTimeout(() => SND.clash(), 300);
          delay = 1300;
        } else if (i % 2) SND.drum(); else SND.clash();
        if (f.ev) {
          ev.textContent = f.ev;
          ev.classList.remove('flash'); void ev.offsetWidth; ev.classList.add('flash');
          lines.append(h('li', {}, f.ev));
          if (f.kind !== 'duel') delay = 800;
        }
        i++;
        timer = setTimeout(step, delay);
      };

      skipBtn.onclick = finish;
      okBtn.onclick = () => { box.classList.add('hidden'); resolve(); };
      apply(r.frames[0]);
      timer = setTimeout(step, 700);
    });
  }

  // ---------- 繪製 ----------
  function render() {
    if (!S) return;
    renderHud();
    renderMap();
    renderCity();
    renderFactions();
    renderLog();
  }

  function renderHud() {
    const f = S.factions[S.player];
    const p = E.powerOf(S, S.player);
    const [cls, name] = SEASONS[Math.floor((S.month - 1) / 3)];
    $('hud-date').replaceChildren(
      h('span', { class: 'y' }, `${S.year}年`), h('span', { class: 'm' }, MONTHS[S.month - 1]),
      h('span', { class: `season ${cls}` }, name));
    $('hud-faction').replaceChildren(sealStamp(S.player, 28), h('span', {}, f.name));
    const chip = (key, iconName, label, v) => {
      const el = h('span', { class: 'chip', title: `${label} ${fmt(v)}` }, ic(iconName), h('b', {}, fmtW(v)));
      if (lastRes[key] !== undefined && lastRes[key] !== v) el.classList.add('bump');
      lastRes[key] = v;
      return el;
    };
    $('hud-res').replaceChildren(
      chip('c', 'city', '城', p.cities), chip('t', 'troops', '兵', p.troops),
      chip('g', 'gold', '金', p.gold), chip('f', 'food', '糧', p.food), chip('w', 'general', '武將', p.generals));
    $('btn-end').disabled = !!S.over || busy;
    $('btn-sound').textContent = SND.isMuted() ? '♪✕' : '♪';
  }

  // ---------- 水墨地圖（自繪地形，非任何既有作品的地圖） ----------
  // 海岸線控制點（東側為海），以平滑曲線連接
  const COAST = [[930, -10], [950, 70], [985, 150], [952, 228], [990, 296], [958, 352], [978, 420], [938, 472], [962, 525], [992, 596], [958, 655], [985, 730]];
  const RIVERS = [
    ['M-10,252 C120,226 230,262 330,284 S470,312 560,270 S700,238 790,258 S900,242 960,222', 455, 300, '黃河'],
    ['M40,515 C150,548 270,590 380,592 S520,612 610,598 S720,560 800,552 S900,548 975,552', 330, 608, '長江'],
    ['M330,450 C390,480 450,520 520,545', 0, 0, ''],
    ['M535,330 C560,360 600,390 640,410', 0, 0, ''],
  ];
  // 山脈：[x, y, 寬, 高, 遠近(0近 1遠)]
  const RANGES = [
    // 太行
    [600, 160, 60, 46, 0], [628, 128, 44, 34, 1], [585, 252, 40, 30, 1], [470, 205, 52, 38, 0], [445, 250, 40, 30, 1],
    // 秦嶺
    [295, 400, 70, 52, 0], [350, 392, 52, 40, 1], [425, 405, 62, 46, 0], [462, 388, 40, 30, 1],
    // 巴蜀
    [262, 480, 58, 44, 0], [292, 528, 46, 34, 1], [110, 470, 56, 42, 1], [88, 545, 62, 46, 0],
    // 西涼、北方
    [95, 330, 64, 48, 0], [65, 120, 60, 44, 1], [250, 120, 56, 40, 0], [300, 160, 40, 28, 1], [700, 112, 46, 32, 1],
    // 江南丘陵
    [640, 650, 46, 30, 1], [780, 640, 44, 30, 1], [470, 690, 40, 26, 1],
  ];
  const DOTS = [[380, 560], [300, 640], [870, 470], [150, 640], [720, 520], [560, 600], [420, 470], [760, 300], [180, 420]];

  function smooth(pts) {
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0]},${p2[1]}`;
    }
    return d;
  }

  // 一座水墨山：數個山峰疊染 + 筆觸山脊
  function inkMountain(x, y, w, hgt, far, seed) {
    const r = (k) => ((Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;
    const fill = far ? 'url(#mtn-ink-far)' : 'url(#mtn-ink)';
    let s = `<g filter="url(#ink-wash)" opacity="${far ? 0.75 : 0.95}">`;
    const peaks = 3;
    for (let i = 0; i < peaks; i++) {
      const px = x + (i - 1) * w * 0.32 + (r(i) - 0.5) * w * 0.15;
      const ph = hgt * (i === 1 ? 1 : 0.62 + r(i + 3) * 0.25);
      const pw = w * (i === 1 ? 0.55 : 0.42);
      s += `<path d="M${px - pw},${y} Q${px - pw * 0.35},${y - ph * 0.55} ${px - pw * 0.08},${y - ph} Q${px + pw * 0.1},${y - ph * 0.96} ${px + pw * 0.3},${y - ph * 0.6} Q${px + pw * 0.6},${y - ph * 0.3} ${px + pw},${y} Z" fill="${fill}"/>`;
    }
    s += '</g>';
    if (!far) {
      const ph = hgt;
      s += `<path d="M${x - w * 0.3},${y - ph * 0.45} Q${x - w * 0.12},${y - ph * 0.92} ${x - w * 0.03},${y - ph} Q${x + w * 0.08},${y - ph * 0.8} ${x + w * 0.2},${y - ph * 0.55}" fill="none" stroke="#1f1a14" stroke-width="2.2" stroke-linecap="round" opacity=".7" filter="url(#ink-bleed)"/>`;
      s += `<path d="M${x - w * 0.02},${y - ph * 0.9} Q${x + w * 0.02},${y - ph * 0.6} ${x - w * 0.06},${y - ph * 0.35}" fill="none" stroke="#1f1a14" stroke-width="1.1" opacity=".45" filter="url(#ink-bleed)"/>`;
    }
    return s;
  }

  // 城池：墨色城樓剪影 + 勢力朱印
  function castleMarkup(c, capital) {
    const ink = c.owner ? '#2a231b' : '#7d756a';
    let s = `<g class="castle" filter="url(#ink-bleed)">`;
    s += `<path d="M-19,13 L-16,-1 L16,-1 L19,13 Z" fill="${ink}"/>`;
    s += `<path d="M-16,-1 V-5 H-12 V-1 M-8,-1 V-5 H-4 V-1 M4,-1 V-5 H8 V-1 M12,-1 V-5 H16 V-1" stroke="${ink}" stroke-width="3.2" fill="none"/>`;
    s += `<path d="M-4.5,13 V7 Q0,2 4.5,7 V13 Z" fill="#efe5cf"/>`;
    // 城樓
    s += `<rect x="-8" y="-12" width="16" height="9" fill="${ink}"/>`;
    s += `<path d="M-15,-11 Q-8,-14 0,-19 Q8,-14 15,-11 Q8,-12.5 0,-12 Q-8,-12.5 -15,-11 Z" fill="${ink}"/>`;
    if (capital) {
      s += `<rect x="-5" y="-25" width="10" height="7" fill="${ink}"/>`;
      s += `<path d="M-11,-24 Q-5,-27 0,-31 Q5,-27 11,-24 Q5,-25.5 0,-25 Q-5,-25.5 -11,-24 Z" fill="${ink}"/>`;
    }
    s += '</g>';
    return s;
  }

  function sealMarkup(c, x, y, size) {
    if (!c.owner) return '';
    const f = S.factions[c.owner];
    return `<g class="seal-stamp" transform="translate(${x} ${y}) rotate(-4)" filter="url(#ink-bleed)">`
      + `<rect x="0" y="0" width="${size}" height="${size}" rx="2" fill="${f.color}"/>`
      + `<rect x="1.6" y="1.6" width="${size - 3.2}" height="${size - 3.2}" rx="1.5" fill="none" stroke="#f3ead6" stroke-width=".9"/>`
      + `<text x="${size / 2}" y="${size * 0.74}" text-anchor="middle" font-size="${size * 0.66}" fill="#f3ead6" class="seal-char">${sealChar(f.ruler)}</text></g>`;
  }

  function placeSvg(str, x, y, w, hgt) {
    return str.replace('<svg ', `<svg x="${x}" y="${y}" width="${w}" height="${hgt}" `);
  }

  function renderMap() {
    const map = $('map');
    let s = '';
    // 宣紙底
    s += '<rect x="-20" y="-20" width="1040" height="760" fill="#efe5cf"/>';
    // 海：淡青墨暈 + 浪紋筆觸
    const coastD = smooth(COAST);
    s += `<path d="${coastD} L1040,730 L1040,-10 Z" fill="#9fb3b0" opacity=".38" filter="url(#ink-wash)"/>`;
    for (let i = 0; i < 26; i++) {
      const y = 30 + i * 27, x = 980 - ((i * 37) % 30);
      s += `<path d="M${x},${y} q8,-6 16,0 q8,6 16,0" fill="none" stroke="#4f6b70" stroke-width="1.2" opacity=".35"/>`;
    }
    // 海岸線（濃淡兩筆）
    s += `<path d="${coastD}" fill="none" stroke="#2a231b" stroke-width="3" opacity=".55" filter="url(#ink-bleed)"/>`;
    s += `<path d="${coastD}" fill="none" stroke="#2a231b" stroke-width="8" opacity=".08" filter="url(#ink-wash)"/>`;
    // 河流
    for (const [d, lx, ly, name] of RIVERS) {
      s += `<path d="${d}" fill="none" stroke="#7d9aa0" stroke-width="${name ? 9 : 4}" opacity=".35" stroke-linecap="round" filter="url(#ink-wash)"/>`;
      s += `<path d="${d}" fill="none" stroke="#4f6b70" stroke-width="${name ? 1.8 : 1.1}" opacity=".6" stroke-linecap="round" filter="url(#ink-bleed)"/>`;
      if (name) s += `<text x="${lx}" y="${ly}" class="map-label">${name}</text>`;
    }
    // 山脈（遠山先畫）
    RANGES.slice().sort((a, b) => b[4] - a[4]).forEach(([x, y, w, hh, far], i) => { s += inkMountain(x, y, w, hh, far, i + 1); });
    // 點苔（樹林）
    // 點苔成林：每叢幾株小樹（樹幹＋米點樹冠）
    for (const [x, y] of DOTS) {
      for (let t = 0; t < 4; t++) {
        const tx = x + (t - 1.5) * 9 + ((t * 7) % 5), ty = y + ((t * 11) % 7) - 3;
        s += `<g filter="url(#ink-bleed)" opacity="${0.55 + (t % 2) * 0.2}"><line x1="${tx}" y1="${ty + 6}" x2="${tx}" y2="${ty - 3}" stroke="#2a231b" stroke-width="1.2"/>`;
        for (let k = 0; k < 6; k++) {
          const a = k * 1.05 + t, r = 3 + (k % 3);
          s += `<ellipse cx="${(tx + Math.cos(a) * r).toFixed(1)}" cy="${(ty - 5 + Math.sin(a) * r * 0.8).toFixed(1)}" rx="2.4" ry="1.5" fill="#2a231b" opacity="${0.4 + (k % 3) * 0.2}"/>`;
        }
        s += '</g>';
      }
    }
    // 道路
    for (const [a, b] of S.roads) {
      const A = S.cities[a], B = S.cities[b];
      s += `<line class="road" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`;
    }
    const sel = selected && S.cities[selected];
    const targets = sel && sel.owner === S.player ? E.neighbors(S, sel.id).filter((id) => S.cities[id].owner !== S.player) : [];
    for (const c of Object.values(S.cities)) {
      const capital = E.generalsIn(S, c.id, (g) => g.ruler && g.status === 'active').length > 0;
      s += `<g class="city${c.owner === S.player ? ' mine' : ''}" data-city="${c.id}" transform="translate(${c.x} ${c.y})" tabindex="0" role="button" aria-label="${c.name}">`;
      s += '<ellipse cx="0" cy="14" rx="30" ry="7" fill="#3b332a" opacity=".16" filter="url(#ink-wash)"/>';
      if (c.id === selected) s += '<ellipse class="sel-ring" cx="0" cy="2" rx="34" ry="26"/>';
      if (c.owner) s += `<ellipse cx="0" cy="2" rx="28" ry="20" fill="${c.owner ? S.factions[c.owner].color : 'none'}" opacity=".16" filter="url(#ink-wash)"/>`;
      const n = c.troops <= 0 ? 0 : c.troops < 5000 ? 1 : c.troops < 15000 ? 2 : c.troops < 30000 ? 3 : 4;
      for (let i = 0; i < n; i++) {
        s += `<g class="garrison bob" style="animation-delay:${i * 0.2}s">${placeSvg(I.soldier(color(c.owner)), -38 - i * 8, -6 + (i % 2) * 4, 13, 18)}</g>`;
      }
      s += castleMarkup(c, capital);
      s += sealMarkup(c, 13, -30, 15);
      s += `<text class="cname" y="32">${c.name}</text>`;
      if (targets.includes(c.id)) s += `<g class="target-mark">${placeSvg(TK.Icons.ICONS.attack, -11, -54, 22, 22)}</g>`;
      s += '</g>';
    }
    // 紙張紋理與焦邊
    s += '<rect x="-20" y="-20" width="1040" height="760" filter="url(#paper-grain)" pointer-events="none"/>';
    s += '<rect x="-20" y="-20" width="1040" height="760" filter="url(#paper-fiber)" pointer-events="none"/>';
    s += '<rect x="-20" y="-20" width="1040" height="760" fill="url(#map-burn)" pointer-events="none"/>';
    map.innerHTML = s;
  }

  function showTip(cityId, evt) {
    const c = S.cities[cityId], tip = $('tip');
    const gens = c.owner ? E.officers(S, c.id).length : 0;
    tip.replaceChildren(
      h('div', {}, h('b', {}, c.name), ' ', h('span', { style: `color:${color(c.owner)};font-weight:700` }, E.factionName(S, c.owner))),
      h('div', {}, `兵 ${fmtW(c.troops)}｜武將 ${gens} 名`));
    const frame = $('map').parentElement.getBoundingClientRect();
    let x = evt.clientX - frame.left + 14, y = evt.clientY - frame.top + 14;
    if (x > frame.width - 170) x -= 190;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
    tip.classList.remove('hidden');
  }

  function renderCity() {
    const panel = $('city-panel');
    const c = S.cities[selected];
    if (!c) { panel.replaceChildren(h('p', {}, '點選地圖上的城市')); return; }
    const mine = c.owner === S.player;
    const ruler = c.owner ? S.factions[c.owner].ruler : '';
    const head = h('div', { class: 'city-head' },
      sealStamp(c.owner, 34),
      h('span', { class: 'cn' }, c.name),
      h('span', { class: 'owner', style: `color:${color(c.owner)}` }, E.factionName(S, c.owner)));
    const cell = (iconName, label, v) => h('div', { class: 'res-cell', title: `${label} ${fmt(v)}` }, ic(iconName), h('span', {}, label), h('b', {}, fmtW(v)));
    const res = h('div', { class: 'res-row' },
      cell('troops', '兵', c.troops), cell('gold', '金', c.gold), cell('food', '糧', c.food), cell('pop', '人口', c.pop));
    // 發展度以文字等級 + 墨條表示，精確數值放在提示中
    const level = (r) => r >= 0.85 ? '極盛' : r >= 0.65 ? '繁榮' : r >= 0.45 ? '尚可' : r >= 0.25 ? '薄弱' : '荒蕪';
    const bar = (iconName, label, v, max, col) => h('div', { class: 'bar', title: `${label} ${v} / ${max}` }, ic(iconName), h('span', {}, label),
      h('div', { class: 'track' }, h('div', { class: 'fill', style: `width:${100 * v / max}%;background:${col}` })), h('b', {}, level(v / max)));
    const bars = h('div', { class: 'bars' },
      bar('farm', '農業', c.farm, 999, '#3d7a4c'), bar('commerce', '商業', c.commerce, 999, '#c06a2e'),
      bar('defense', '城防', c.defense, 999, '#4a5560'), bar('order', '民心', c.order, 100, '#b8892c'),
      bar('train', '訓練', c.train, 100, '#b23a2c'));

    const gens = c.owner ? E.officers(S, c.id).sort((a, b) => (b.ruler - a.ruler) || (b.lead + b.war + b.int - a.lead - a.war - a.int)) : [];
    const genList = h('div', { class: 'gen-list' }, gens.map((g) =>
      h('div', { class: 'gen' + (g.acted && mine ? ' acted' : ''), onclick: () => showGeneral(g.id), title: '查看列傳' },
        portraitMini(g, { size: 'lg' }),
        h('div', {},
          h('div', { class: 'gname' }, g.name, g.ruler ? h('span', { class: 'tag' }, '君主') : h('span', { class: 'tag soft' }, TK.Portrait.classLabel(g, TK.Portrait.traits(g)))),
          h('div', { class: 'gstats' },
            gradeChip('統', g.lead), gradeChip('武', g.war), gradeChip('智', g.int), gradeChip('政', g.pol), gradeChip('魅', g.cha))))));

    const free = E.generalsIn(S, c.id, (g) => g.status === 'free' && !g.hidden);
    const prisoners = E.generalsIn(S, c.id, (g) => g.status === 'prisoner');
    const parts = [head, res, bars, h('h3', {}, `麾下武將`), gens.length ? genList : h('div', { class: 'hint' }, '無人駐守')];
    if (free.length) parts.push(h('h3', {}, '在野人才'), h('div', { class: 'people' }, free.map((g) => h('span', { onclick: () => showGeneral(g.id) }, portraitMini(g), g.name))));
    if (prisoners.length) parts.push(h('h3', {}, '俘虜'), h('div', { class: 'people' }, prisoners.map((g) => h('span', { onclick: () => showGeneral(g.id) }, portraitMini(g), g.name))));
    if (mine && !S.over) parts.push(h('h3', {}, '指令'), commandButtons(c));
    else if (!mine) {
      const from = E.neighbors(S, c.id).filter((id) => S.cities[id].owner === S.player);
      if (from.length) parts.push(h('p', { class: 'hint' }, `可從 ${from.join('、')} 出征此城。`));
    }
    panel.replaceChildren(...parts);
  }

  function commandButtons(c) {
    const ready = E.officers(S, c.id).filter((g) => !g.acted);
    const has = ready.length > 0;
    const prisoners = E.generalsIn(S, c.id, (g) => g.status === 'prisoner');
    const btn = (key, fn, enabled) => {
      const d = CMD[key];
      return h('button', { class: 'cmd', style: `--cc:${d.color}`, disabled: !enabled || busy, onclick: () => { SND.click(); fn(); } }, ic(d.icon), d.label);
    };
    return h('div', { class: 'cmds' },
      Object.keys(E.DEV).map((type) => btn(type, () => devDialog(c, type), has)),
      btn('draft', () => draftDialog(c), has),
      btn('search', () => simpleDialog(c, 'search', '搜索', '尋找在野人才或金錢。智略越高越容易發現人才。'), has),
      btn('recruit', () => recruitDialog(c), has),
      btn('reward', () => rewardDialog(c), E.officers(S, c.id).some((g) => !g.ruler)),
      btn('move', () => moveDialog(c), has),
      btn('attack', () => attackDialog(c), has),
      btn('prisoner', () => prisonerDialog(c), prisoners.length > 0));
  }

  function execSelect(c, sortKey) {
    const ready = E.officers(S, c.id).filter((g) => !g.acted).sort((a, b) => b[sortKey] - a[sortKey]);
    return selectOf(ready.map((g) => ({ value: g.id, label: genLabel(g) })));
  }

  function devDialog(c, type) {
    const d = E.DEV[type];
    const statName = { pol: '政務', lead: '統率', cha: '魅力' }[d.stat];
    const sel = execSelect(c, d.stat);
    openModal(`${d.label}・${c.name}`, h('div', {},
      field('執行武將', sel, `${d.cost ? `花費金 ${d.cost}。` : ''}效果取決於${statName}。`)),
    () => run({ type, city: c.id, general: sel.value }), { icon: CMD[type].icon });
  }

  function simpleDialog(c, type, title, hint) {
    const sel = execSelect(c, 'int');
    openModal(`${title}・${c.name}`, h('div', {}, field('執行武將', sel, hint)),
      () => run({ type, city: c.id, general: sel.value }), { icon: CMD[type].icon });
  }

  function draftDialog(c) {
    const info = h('div', { class: 'hint' });
    const amt = numberOf(0, 3000, 500);
    const sel = execSelect(c, 'cha');
    const update = () => {
      const max = E.maxDraft(S, c, S.generals[sel.value]);
      amt.max = max;
      info.textContent = `最多可徵 ${fmt(max)}（受魅力、金、人口限制）。每 1000 兵花費金 100，會降低民心。`;
    };
    sel.addEventListener('change', update);
    update();
    amt.value = Math.min(3000, Number(amt.max));
    openModal(`徵兵・${c.name}`, h('div', {}, field('執行武將', sel), field('徵兵數', amt), info),
      () => run({ type: 'draft', city: c.id, general: sel.value, amount: Number(amt.value) }), { icon: 'draft' });
  }

  function recruitDialog(c) {
    const targets = E.generalsIn(S, c.id, (g) => (g.status === 'free' && !g.hidden) || g.status === 'prisoner');
    if (!targets.length) { toast('城中沒有可登用的人才，先「搜索」看看', true); return; }
    const sel = execSelect(c, 'cha');
    const tsel = selectOf(targets.map((g) => ({ value: g.id, label: (g.status === 'prisoner' ? '【俘】' : '') + genLabel(g) })));
    const hint = h('div', { class: 'hint' });
    const update = () => {
      const p = E.recruitChance(S, S.generals[sel.value], S.generals[tsel.value]);
      hint.textContent = `成功率約 ${Math.round(p * 100)}%（取決於魅力）`;
    };
    sel.addEventListener('change', update); tsel.addEventListener('change', update); update();
    openModal(`登用・${c.name}`, h('div', {}, field('執行武將', sel), field('對象', tsel), hint),
      () => run({ type: 'recruit', city: c.id, general: sel.value, target: tsel.value }), { icon: 'recruit' });
  }

  function rewardDialog(c) {
    const list = E.officers(S, c.id).filter((g) => !g.ruler).sort((a, b) => a.loyalty - b.loyalty);
    const tsel = selectOf(list.map((g) => ({ value: g.id, label: `${g.name}（忠誠 ${g.loyalty}）` })));
    openModal(`賞賜・${c.name}`, h('div', {}, field('對象', tsel, '花費金 100，提升忠誠。不消耗行動。')),
      () => run({ type: 'reward', city: c.id, target: tsel.value }), { icon: 'reward' });
  }

  function prisonerDialog(c) {
    const list = E.generalsIn(S, c.id, (g) => g.status === 'prisoner');
    const tsel = selectOf(list.map((g) => ({ value: g.id, label: genLabel(g) })));
    const act = selectOf([{ value: 'release', label: '釋放' }, { value: 'execute', label: '處斬' }]);
    openModal(`處置俘虜・${c.name}`, h('div', {}, field('俘虜', tsel, '想收為己用請改用「登用」。'), field('處置', act)),
      () => run({ type: act.value, city: c.id, target: tsel.value }), { icon: 'prisoner' });
  }

  function moveDialog(c) {
    const dests = E.neighbors(S, c.id).filter((id) => S.cities[id].owner === S.player);
    if (!dests.length) { toast('沒有相鄰的我方城市', true); return; }
    const dsel = selectOf(dests.map((id) => ({ value: id, label: id })));
    const ready = E.officers(S, c.id).filter((g) => !g.acted);
    const gbox = checksOf(ready.map((g) => ({ value: g.id, label: genLabel(g) })), 1);
    const tr = numberOf(c.troops, 0, 1000), gold = numberOf(c.gold, 0, 100), food = numberOf(c.food, 0, 1000);
    openModal(`移動・${c.name}`, h('div', {},
      field('目的地', dsel), field('移動武將', gbox),
      field(`帶兵（最多 ${fmt(c.troops)}）`, tr), field(`運金（最多 ${fmt(c.gold)}）`, gold), field(`運糧（最多 ${fmt(c.food)}）`, food)),
    () => {
      const ids = checkedValues(gbox);
      if (!ids.length) { toast('請至少選一名武將', true); return false; }
      return run({ type: 'move', city: c.id, general: ids[0], generals: ids, dest: dsel.value, troops: +tr.value, gold: +gold.value, food: +food.value });
    }, { icon: 'move' });
  }

  function attackDialog(c) {
    const targets = E.neighbors(S, c.id).filter((id) => S.cities[id].owner !== S.player);
    if (!targets.length) { toast('沒有相鄰的敵城', true); return; }
    const tsel = selectOf(targets.map((id) => {
      const t = S.cities[id];
      return { value: id, label: `${id}（${E.factionName(S, t.owner)}，兵 ${fmt(t.troops)}，城防 ${t.defense}）` };
    }));
    const ready = E.officers(S, c.id).filter((g) => !g.acted).sort((a, b) => (b.lead + b.war) - (a.lead + a.war));
    const gbox = checksOf(ready.map((g) => ({ value: g.id, label: genLabel(g) })), 1);
    const tr = numberOf(c.troops, Math.floor(c.troops * 0.7), 1000);
    openModal(`出征・${c.name}`, h('div', {},
      field('目標', tsel),
      field('出陣武將（最多 3 名，統率最高者為主將）', gbox),
      field(`兵力（最多 ${fmt(c.troops)}）`, tr, `軍糧消耗：兵力 ÷ 10（城中有 ${fmt(c.food)}）。戰敗時殘兵撤回本城。`)),
    () => {
      const ids = checkedValues(gbox);
      if (!ids.length) { toast('請至少選一名武將', true); return false; }
      if (ids.length > 3) { toast('最多 3 名武將', true); return false; }
      return run({ type: 'attack', city: c.id, general: ids[0], generals: ids, target: tsel.value, troops: +tr.value });
    }, { icon: 'attack', okText: '出陣！' });
  }

  function renderFactions() {
    const rows = Object.values(S.factions).map((f) => ({ f, p: E.powerOf(S, f.id) }))
      .sort((a, b) => (b.f.alive - a.f.alive) || b.p.cities - a.p.cities || b.p.troops - a.p.troops);
    const maxT = Math.max(1, ...rows.map((r) => r.p.troops));
    $('faction-panel').replaceChildren(h('h2', {}, '勢力一覽'),
      h('table', { class: 'factions' },
        rows.map(({ f, p }) => h('tr', { class: (f.id === S.player ? 'me' : '') + (f.alive ? '' : ' dead') },
          h('td', {}, sealStamp(f.id, 20)),
          h('td', {}, f.name),
          h('td', { class: 'num' }, `${p.cities}城`),
          h('td', { style: 'width:40%' }, h('div', { class: 'pbar' }, h('div', { style: `width:${100 * p.troops / maxT}%;background:${f.color}` }))),
          h('td', { class: 'num' }, fmtW(p.troops))))));
  }

  function renderLog() {
    const items = S.log.slice(-120).reverse().map((l) => {
      const mine = l.factions.includes(S.player);
      const cls = l.kind === 'major' ? 'major' : l.kind === 'warn' && mine ? 'warn' : mine ? 'mine' : 'other';
      const fc = l.factions.length ? color(l.factions[0]) : 'transparent';
      return h('li', { class: cls, style: `border-left-color:${fc}` }, h('span', { class: 'd' }, l.date), l.text);
    });
    $('log').replaceChildren(...items);
  }

  // ---------- 綁定 ----------
  function bind() {
    $('modal-cancel').addEventListener('click', closeModal);
    $('modal-ok').addEventListener('click', () => {
      if (!modalOk) return closeModal();
      Promise.resolve(modalOk()).then((r) => { if (r === true) closeModal(); });
    });
    const cancellable = () => !$('modal').classList.contains('hidden') && $('modal-cancel').style.display !== 'none';
    $('modal').addEventListener('click', (e) => { if (e.target.id === 'modal' && cancellable()) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && cancellable()) closeModal(); });

    const map = $('map');
    const cityOf = (e) => { const g = e.target.closest && e.target.closest('.city'); return g ? g.getAttribute('data-city') : null; };
    map.addEventListener('click', (e) => {
      const id = cityOf(e);
      if (id) { selected = id; SND.click(); render(); }
    });
    map.addEventListener('keydown', (e) => {
      const id = cityOf(e);
      if (id && e.key === 'Enter') { selected = id; render(); }
    });
    map.addEventListener('mousemove', (e) => {
      const id = cityOf(e);
      if (id) showTip(id, e); else $('tip').classList.add('hidden');
    });
    map.addEventListener('mouseleave', () => $('tip').classList.add('hidden'));

    $('btn-end').addEventListener('click', endMonth);
    $('btn-menu').addEventListener('click', () => {
      openModal('回到標題', h('p', {}, '每月結束時會自動存檔。要回到標題畫面嗎？'), () => { closeModal(); showTitle(); return false; }, { icon: 'city' });
    });
    $('btn-sound').addEventListener('click', () => { SND.toggle(); renderHud(); });
    $('btn-save').addEventListener('click', () => {
      if (!S) return;
      if (store(SAVE_KEY, JSON.stringify(S))) { SND.click(); toast(`已存檔（${E.dateStr(S)}）`); }
      else toast('此瀏覽器無法存檔', true);
    });
    $('btn-load').addEventListener('click', () => loadFrom(SAVE_KEY));
  }

  bind();
  showTitle();
})(globalThis.TK = globalThis.TK || {});
