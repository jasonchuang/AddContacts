/* 介面：90 年代策略遊戲風格（原創）。視窗堆疊、游標選單、表格選擇、軍師訊息、像素戰鬥。 */
(function (TK) {
  'use strict';
  const E = TK.Engine, SND = TK.Sound, MV = TK.MapView, PT = TK.Portrait;
  const AUTO_KEY = 'zhanguo.auto.v1';
  const SLOT_KEY = (n) => `zhanguo.slot${n}.v1`;
  const $ = (id) => document.getElementById(id);
  const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const SEASON = (m) => ['春', '夏', '秋', '冬'][Math.floor((m - 1) / 3)];
  const UK = ['spear', 'cav', 'xbow'];

  let S = null;
  let selected = null;
  let hovered = null;
  let busy = false;
  let blink = false;
  let rootKey = null;
  let battleKey = null;
  let rootMenu = null;

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
  const fmt = (n) => String(Math.round(n));
  function fmtW(n) {
    n = Math.round(n);
    if (Math.abs(n) >= 10000) return `${(n / 10000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, '')}萬`;
    return String(n);
  }
  function color(fid) {
    if (fid && S && S.factions[fid]) return S.factions[fid].color;
    const f = fid && TK.SCENARIO.factions.find((x) => x.id === fid);
    return f ? f.color : '#9a948a';
  }
  const sealChar = (name) => (name ? name.slice(-1) : '空');
  const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); return true; } catch (e) { return null; } };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- 畫面縮放 ----------
  // 手機直向：改用直式版面（地圖在上、指令在下），不再整張縮放
  const isMobile = () => innerWidth < innerHeight && innerWidth <= 820;
  function fit() {
    const mobile = isMobile();
    const was = document.body.classList.contains('mobile');
    document.body.classList.toggle('mobile', mobile);
    if (mobile) $('app').style.transform = 'none';
    else {
      const s = Math.min(innerWidth / 1280, innerHeight / 800);
      $('app').style.transform = `translate(-50%, -50%) scale(${s})`;
    }
    if (was !== mobile && S) render();
  }

  // ---------- 像素頭像 ----------
  const faceCache = new Map();
  // 頭像網址：有插畫就直接用插畫（JPG），否則用程式繪製的 SVG。
  // 不再經過 canvas 轉成 PNG：手機（尤其 iPhone Safari）同時解碼大量大圖時會超過記憶體上限而變成空白。
  // 裁切交給 CSS 的 object-fit: cover。
  function faceURL(g, mode) {
    const col = color(g.faction || g.formerFaction);
    const key = `${g.id}|${col}|${mode}|${g.ruler ? 1 : 0}`; // 繼位成為君主時換成君主頭像
    if (!faceCache.has(key)) {
      const art = PT.art && PT.art(g, mode);
      faceCache.set(key, Promise.resolve(art || 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(PT.svg(g, col, mode))));
    }
    return faceCache.get(key);
  }
  function face(g, mode, w, hgt, cls) {
    const img = h('img', { class: 'face ' + (cls || ''), alt: g ? g.name : '' });
    if (g) faceURL(g, mode || 'head').then((u) => { if (u) img.src = u; });
    return img;
  }

  // ---------- 軍師訊息視窗 ----------
  const msgQ = [];
  let typing = false;
  let waitResolve = null;
  let currentMsg = null;
  function say(speaker, text, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      msgQ.push({ speaker, text, wait: !!opts.wait, resolve });
      if (!typing && !waitResolve) nextMsg();
    });
  }
  function nextMsg() {
    const m = msgQ.shift();
    if (!m) { typing = false; currentMsg = null; return; }
    typing = true;
    currentMsg = m;
    const g = typeof m.speaker === 'string' ? (S && S.generals[m.speaker]) : m.speaker;
    const faceEl = $('msg-face');
    if (g) {
      faceEl.classList.remove('hidden');
      faceEl.removeAttribute('src');
      faceURL(g, 'head').then((u) => { if (u && currentMsg === m) faceEl.src = u; });
      $('msg-name').textContent = g.name;
    } else {
      faceEl.classList.add('hidden');
      $('msg-name').textContent = typeof m.speaker === 'string' ? m.speaker : '';
    }
    const el = $('msg-text');
    el.textContent = '';
    $('msg-more').classList.add('hidden');
    const chars = Array.from(m.text || '');
    let i = 0;
    m.skip = () => { i = chars.length; };
    const tick = () => {
      if (i < chars.length) {
        el.textContent += chars[i];
        if (i % 2 === 0) SND.type();
        i++;
        setTimeout(tick, 22);
        return;
      }
      el.textContent = m.text || '';
      typing = false;
      if (m.wait || msgQ.length) {
        $('msg-more').classList.remove('hidden');
        waitResolve = () => { waitResolve = null; $('msg-more').classList.add('hidden'); m.resolve(); nextMsg(); };
      } else {
        m.resolve();
        nextMsg();
      }
    };
    tick();
  }
  function advanceMsg() {
    if (typing && currentMsg && currentMsg.skip) { currentMsg.skip(); return true; }
    if (waitResolve) { SND.cursor(); waitResolve(); return true; }
    return false;
  }

  // ---------- 視窗堆疊 ----------
  const stack = [];
  function pushWin(win, opts) {
    opts = opts || {};
    const depth = stack.length;
    if (opts.shade) {
      win.shade = h('div', { class: 'shade', onclick: () => { if (win.onKey) win.onKey({ key: 'Escape' }); } });
      $('layer').append(win.shade);
    }
    const el = win.el;
    if (!el.querySelector(':scope > .win-x')) {
      el.prepend(h('button', { class: 'win-x', title: '關閉（Esc）', onclick: (e) => { e.stopPropagation(); if (win.onKey) win.onKey({ key: 'Escape' }); else { SND.cancel(); popWin(); } } }, '✕'));
    }
    if (opts.full) {
      el.style.inset = '0';
    } else if (opts.center) {
      el.style.left = '50%'; el.style.top = '50%'; el.style.transform = 'translate(-50%, -50%)';
    } else {
      el.style.left = `${(opts.x != null ? opts.x : 420) + depth * 24}px`;
      el.style.top = `${(opts.y != null ? opts.y : 96) + depth * 24}px`;
    }
    if (opts.width) el.style.width = `${opts.width}px`;
    $('layer').append(el);
    stack.push(win);
    return win;
  }
  function popWin() {
    const w = stack.pop();
    if (!w) return;
    w.el.remove();
    if (w.shade) w.shade.remove();
  }
  function closeAll() { while (stack.length) popWin(); }

  // 選單圖示：依項目名稱自動配上彩色圖示（也可在項目上指定 icon / unit）
  const MENU_ICON = {
    內政: 'domestic', 軍事: 'military', 人事: 'personnel', 外交: 'diplo', 情報: 'info', 系統: 'system', 結束本月: 'endturn',
    開墾: 'farm', 商業: 'commerce', 巡察: 'order', 築城: 'defense', 訓練: 'train',
    徵兵: 'draft', 出征: 'attack', 移動: 'move', 搜索: 'search', 登用: 'recruit', 賞賜: 'reward', 俘虜: 'prisoner', 任命: 'appoint', 軍師: 'info', 太守: 'city', 襲擾: 'order', 封君: 'appoint', 反間: 'search',
  };
  const UNIT_BY_NAME = { 槍兵: 'spear', 騎兵: 'cav', 弩兵: 'xbow' };
  function svgNode(str) {
    const t = document.createElement('template');
    t.innerHTML = str.trim();
    return t.content.firstChild;
  }
  function menuIcon(it) {
    const unit = it.unit || UNIT_BY_NAME[it.label];
    if (unit && S) return h('span', { class: 'mi unit' }, svgNode(TK.Icons.unit(unit, color(S.player))));
    const name = it.icon || MENU_ICON[it.label];
    return name && TK.Icons.ICONS[name] ? h('span', { class: 'mi' }, svgNode(TK.Icons.icon(name))) : null;
  }

  // 游標選單
  function makeMenu(items, onChoose, opts) {
    opts = opts || {};
    const ul = h('ul', { class: 'menu' + (opts.cols ? ' menu-cols' : '') });
    const m = { ul, items, index: Math.max(0, items.findIndex((x) => !x.off)) };
    m.render = () => {
      ul.replaceChildren(...items.map((it, i) => h('li', {
        class: (i === m.index ? 'sel ' : '') + (it.off ? 'off' : ''),
        onmouseenter: () => { if (m.index !== i) { m.index = i; m.render(); } },
        onclick: () => { m.index = i; m.choose(); },
      }, menuIcon(it), h('span', { class: 'lbl' }, it.label), it.hint ? h('span', { class: 'hint' }, it.hint) : null)));
    };
    m.choose = () => {
      const it = items[m.index];
      if (!it || it.off) { SND.error(); if (it && it.why) say(null, it.why); return; }
      SND.ok();
      onChoose(it, m.index);
    };
    m.onKey = (e) => {
      const step = opts.cols === true ? 2 : opts.cols || 1;
      if (e.key === 'ArrowDown') { m.index = (m.index + step) % items.length; SND.cursor(); m.render(); }
      else if (e.key === 'ArrowUp') { m.index = (m.index - step + items.length) % items.length; SND.cursor(); m.render(); }
      else if (opts.cols && e.key === 'ArrowRight') { m.index = Math.min(items.length - 1, m.index + 1); SND.cursor(); m.render(); }
      else if (opts.cols && e.key === 'ArrowLeft') { m.index = Math.max(0, m.index - 1); SND.cursor(); m.render(); }
      else if (e.key === 'Enter' || e.key === ' ') m.choose();
      else return false;
      return true;
    };
    m.render();
    return m;
  }

  function menuWin(title, items, onCancel, opts) {
    opts = opts || {};
    const el = h('div', { class: 'win pop' + (opts.cls ? ' ' + opts.cls : '') }, title ? h('h3', {}, title) : null);
    const win = { el };
    const m = makeMenu(items, (it) => it.act(), opts);
    el.append(m.ul);
    win.onKey = (e) => {
      if (e.key === 'Escape') { SND.cancel(); popWin(); if (onCancel) onCancel(); return true; }
      return m.onKey(e);
    };
    win.menu = m;
    return pushWin(win, opts);
  }

  // 表格選擇；multi 時可勾選多列
  function tableWin(title, cols, rows, onPick, opts) {
    opts = opts || {};
    const el = h('div', { class: 'win pop' }, h('h3', {}, title));
    const win = { el, index: Math.max(0, rows.findIndex((r) => !r.off)), marks: new Set(opts.marks || []) };
    const side = opts.side ? h('div', { class: 'side-card' }) : null;
    const table = h('table', { class: 'grid' });
    const scroller = h('div', { class: 'tscroll', style: `max-height:${opts.maxH || 500}px;overflow:auto;flex:1` }, table);
    el.append(side ? h('div', { class: 'with-side' }, scroller, side) : scroller);
    const info = opts.info ? h('div', { class: 'info' }) : null;
    if (info) el.append(info);
    // 多選時，「決定」是固定在視窗底部的按鈕
    const decide = opts.multi ? h('button', { class: 'act primary', onclick: () => { win.index = rows.length; choose(); } }) : null;
    if (decide) el.append(h('div', { class: 'win-foot' }, decide, h('button', { class: 'act', onclick: () => win.onKey({ key: 'Escape' }) }, '取消')));
    const total = rows.length + (opts.multi ? 1 : 0);
    const render = () => {
      const head = h('tr', {}, cols.map((c) => h('th', {}, c.label)));
      const trs = rows.map((r, i) => h('tr', {
        class: (i === win.index ? 'sel ' : '') + (r.off ? 'off' : ''),
        onmouseenter: () => { if (win.index !== i) { win.index = i; render(); } },
        onclick: () => { win.index = i; choose(); },
      }, r.cells.map((v, ci) => h('td', { class: (cols[ci].hl ? 'hl ' : '') + (opts.multi && ci === 0 && win.marks.has(i) ? 'mark' : '') },
        opts.multi && ci === 0 ? [win.marks.has(i) ? '●' : '○', v] : v))));
      if (decide) {
        decide.textContent = `決定（已選 ${win.marks.size}）`;
        decide.classList.toggle('sel', win.index === rows.length);
        decide.disabled = !win.marks.size;
      }
      table.replaceChildren(head, ...trs);
      const selTr = table.querySelectorAll('tr')[win.index + 1];
      if (selTr && selTr.scrollIntoView) selTr.scrollIntoView({ block: 'nearest' });
      if (side && rows[win.index]) side.replaceChildren(opts.side(rows[win.index]));
      if (info) info.textContent = rows[win.index] ? opts.info(rows[win.index], win) : '';
    };
    const choose = () => {
      if (opts.multi) {
        if (win.index === rows.length) {
          if (!win.marks.size) { SND.error(); return; }
          SND.ok();
          onPick([...win.marks].sort((a, b) => a - b).map((i) => rows[i]));
          return;
        }
        const r = rows[win.index];
        if (r.off) { SND.error(); return; }
        if (win.marks.has(win.index)) win.marks.delete(win.index);
        else if (win.marks.size < (opts.max || 99)) win.marks.add(win.index);
        else { SND.error(); say(null, `最多只能選 ${opts.max} 名。`); return; }
        SND.cursor();
        render();
        return;
      }
      const r = rows[win.index];
      if (!r || r.off) { SND.error(); if (r && r.why) say(null, r.why); return; }
      SND.ok();
      onPick(r, win.index);
    };
    win.onKey = (e) => {
      if (e.key === 'ArrowDown') { win.index = (win.index + 1) % total; SND.cursor(); render(); }
      else if (e.key === 'ArrowUp') { win.index = (win.index - 1 + total) % total; SND.cursor(); render(); }
      else if (e.key === 'PageDown') { win.index = Math.min(total - 1, win.index + 8); render(); }
      else if (e.key === 'PageUp') { win.index = Math.max(0, win.index - 8); render(); }
      else if (e.key === 'Enter' || e.key === ' ') choose();
      else if (e.key === 'Escape') { SND.cancel(); popWin(); if (opts.onCancel) opts.onCancel(); }
      else return false;
      return true;
    };
    render();
    return pushWin(win, opts);
  }

  // 數值輸入
  function numberWin(title, cfg, onOk) {
    let v = Math.max(cfg.min || 0, Math.min(cfg.max, cfg.value));
    const step = cfg.step || 100;
    const big = h('span', { class: 'big' });
    const info = h('div', { class: 'info' });
    const set = (nv) => { v = Math.max(cfg.min || 0, Math.min(cfg.max, nv)); SND.cursor(); render(); };
    const btn = (label, fn) => h('span', { class: 'btn', onclick: fn }, label);
    const ok = () => { if (v < (cfg.min || 0) || v <= 0) { SND.error(); return; } SND.ok(); onOk(v); };
    const cancel = () => { SND.cancel(); popWin(); };
    const el = h('div', { class: 'win pop' }, h('h3', {}, title), h('div', { class: 'numbox' },
      h('div', { class: 'arrows' }, '◀ ', big, ' ▶'),
      h('div', { class: 'btns' }, btn('-1000', () => set(v - step * 10)), btn('-100', () => set(v - step)), btn('+100', () => set(v + step)), btn('+1000', () => set(v + step * 10)), btn('最大', () => set(cfg.max))),
      h('div', { class: 'btns' }, btn('決定', ok), btn('取消', cancel))), info);
    const render = () => { big.textContent = fmt(v); info.textContent = cfg.info ? cfg.info(v) : `（${cfg.min || 0}～${cfg.max}）`; };
    const win = { el };
    win.onKey = (e) => {
      if (e.key === 'ArrowRight') set(v + step);
      else if (e.key === 'ArrowLeft') set(v - step);
      else if (e.key === 'ArrowUp') set(v + step * 10);
      else if (e.key === 'ArrowDown') set(v - step * 10);
      else if (e.key === 'Enter') ok();
      else if (e.key === 'Escape') cancel();
      else return false;
      return true;
    };
    render();
    return pushWin(win, Object.assign({ width: 460 }, cfg.pos || {}));
  }

  // 多列數值分配（兵種、金、糧）
  function allocWin(title, rows, info, onOk, opts) {
    opts = opts || {};
    const vals = rows.map((r) => Math.max(0, Math.min(r.max, r.init || 0)));
    const win = { index: 0 };
    const box = h('div', { class: 'alloc' });
    const infoEl = h('div', { class: 'info' });
    const okBtn = h('button', { class: 'act primary', onclick: () => ok() }, '決定');
    win.el = h('div', { class: 'win pop' }, h('h3', {}, title), box, infoEl,
      h('div', { class: 'win-foot' }, okBtn, h('button', { class: 'act', onclick: () => win.onKey({ key: 'Escape' }) }, '取消')));
    const values = () => { const o = {}; rows.forEach((r, i) => { o[r.key] = vals[i]; }); return o; };
    const adj = (i, d) => { vals[i] = Math.max(0, Math.min(rows[i].max, vals[i] + d)); SND.cursor(); render(); };
    const ok = () => { const v = values(); if (opts.validate && !opts.validate(v)) { SND.error(); if (opts.why) say(null, opts.why(v)); return; } SND.ok(); onOk(v); };
    const render = () => {
      box.replaceChildren(...rows.map((r, i) => h('div', {
        class: 'row' + (i === win.index ? ' sel' : ''),
        onmouseenter: () => { if (win.index !== i) { win.index = i; render(); } },
      }, r.icon ? h('img', { src: r.icon }) : h('span', {}, ''), h('span', {}, r.label),
      h('span', {}, h('span', { class: 'btn', onclick: () => adj(i, -(r.step || 500)) }, '◀'), ' ', h('span', { class: 'btn', onclick: () => adj(i, r.step || 500) }, '▶'), ' ',
        h('span', { class: 'btn', onclick: () => { vals[i] = vals[i] === r.max ? 0 : r.max; SND.cursor(); render(); } }, '全'), h('span', { class: 'have' }, ` /${fmt(r.max)}`)),
      h('span', { class: 'val' }, fmt(vals[i])))));
      okBtn.classList.toggle('sel', win.index === rows.length);
      infoEl.textContent = info ? info(values()) : '';
    };
    win.onKey = (e) => {
      if (e.key === 'ArrowDown') { win.index = (win.index + 1) % (rows.length + 1); SND.cursor(); render(); }
      else if (e.key === 'ArrowUp') { win.index = (win.index + rows.length) % (rows.length + 1); SND.cursor(); render(); }
      else if (e.key === 'ArrowRight' && win.index < rows.length) adj(win.index, e.shiftKey ? 100 : (rows[win.index].step || 500));
      else if (e.key === 'ArrowLeft' && win.index < rows.length) adj(win.index, -(e.shiftKey ? 100 : (rows[win.index].step || 500)));
      else if (e.key === 'Enter') { if (win.index === rows.length) ok(); else { win.index = rows.length; SND.cursor(); render(); } }
      else if (e.key === 'Escape') { SND.cancel(); popWin(); }
      else return false;
      return true;
    };
    render();
    return pushWin(win, Object.assign({ width: 640 }, opts.pos || {}));
  }

  function infoWin(title, content, opts) {
    opts = opts || {};
    const el = h('div', { class: 'win pop' }, h('h3', {}, title), content, h('div', { class: 'info', style: 'text-align:right' }, '（Enter／Esc 關閉）'));
    const win = { el };
    const close = () => { SND.cancel(); popWin(); if (opts.onClose) opts.onClose(); };
    el.addEventListener('click', close);
    win.onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { close(); return true; }
      return false;
    };
    return pushWin(win, opts);
  }

  function confirmWin(text, onYes, opts) {
    return menuWin(text, [{ label: '是', act: () => { popWin(); onYes(); } }, { label: '否', act: () => popWin() }], null, Object.assign({ width: 440 }, opts || {}));
  }

  // ---------- 鍵盤 ----------
  document.addEventListener('keydown', (e) => {
    if (e.repeat && (e.key === 'Enter' || e.key === ' ')) return;
    if (battleKey) { if (battleKey(e)) e.preventDefault(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && advanceMsg()) { e.preventDefault(); return; }
    const top = stack[stack.length - 1];
    if (top && top.onKey) { if (top.onKey(e)) e.preventDefault(); return; }
    if (rootKey && !busy && rootKey(e)) e.preventDefault();
  });

  // ---------- 標題 ----------
  function showTitle() {
    closeAll();
    S = null;
    TK.SCENARIO = TK.SCENARIOS ? TK.SCENARIOS[0] : TK.SCENARIO;
    if (TK.Music) TK.Music.play('title');
    $('game').classList.add('hidden');
    $('title').classList.remove('hidden');
    const auto = meta(AUTO_KEY);
    const items = [
      { label: '新遊戲', act: chooseScenario },
      { label: '繼續遊戲', hint: auto, off: !auto, act: () => loadKey(AUTO_KEY) },
      { label: '讀取存檔', act: () => slotMenu(false) },
      { label: `音效：${SND.isMuted() ? '關' : '開'}`, act: () => { SND.toggle(); showTitle(); } },
      { label: `音樂：${TK.Music && TK.Music.isOn() ? '開' : '關'}`, act: () => { if (TK.Music) TK.Music.toggle(); showTitle(); } },
      { label: '聲音診斷', act: soundCheck },
    ];
    const m = makeMenu(items, (it) => it.act());
    m.ul.classList.add('title-menu');
    $('title-menu').replaceChildren(m.ul);
    rootKey = (e) => m.onKey(e);
  }

  function meta(key) {
    const raw = store(key);
    if (!raw) return '';
    try {
      const d = JSON.parse(raw);
      return d && d.version === 1 ? `${E.yearText(d.year)}年${d.month}月 ${d.factions[d.player].name}` : '';
    } catch (e) { return ''; }
  }

  // 卡片選擇畫面（全畫面）：cards 為 [{ el, off, act }]，方向鍵移動、Enter 決定、Esc 返回
  function cardsWin(title, sub, cards, opts) {
    opts = opts || {};
    const cols = opts.cols || 3;
    const grid = h('div', { class: 'cards', style: `grid-template-columns:repeat(${cols},1fr)` });
    const el = h('div', { class: 'win picker' },
      h('div', { class: 'pk-head' }, h('div', { class: 'pk-title' }, title), sub ? h('div', { class: 'pk-sub' }, sub) : null),
      grid,
      h('div', { class: 'pk-foot' }, h('button', { class: 'act', onclick: (e) => { e.stopPropagation(); back(); } }, '返回')));
    const win = { el, index: Math.max(0, cards.findIndex((c) => !c.off)) };
    const render = () => cards.forEach((c, i) => c.el.classList.toggle('sel', i === win.index));
    const choose = () => { const c = cards[win.index]; if (!c || c.off) { SND.error(); return; } SND.ok(); c.act(); };
    const back = () => { SND.cancel(); popWin(); if (opts.onBack) opts.onBack(); };
    cards.forEach((c, i) => {
      c.el.classList.add('card');
      if (c.off) c.el.classList.add('off');
      c.el.addEventListener('mouseenter', () => { if (win.index !== i) { win.index = i; render(); } });
      c.el.addEventListener('click', () => { win.index = i; choose(); });
      grid.append(c.el);
    });
    win.onKey = (e) => {
      const n = cards.length;
      if (e.key === 'ArrowRight') win.index = Math.min(n - 1, win.index + 1);
      else if (e.key === 'ArrowLeft') win.index = Math.max(0, win.index - 1);
      else if (e.key === 'ArrowDown') win.index = Math.min(n - 1, win.index + cols);
      else if (e.key === 'ArrowUp') win.index = Math.max(0, win.index - cols);
      else if (e.key === 'Enter' || e.key === ' ') { choose(); return true; }
      else if (e.key === 'Escape') { back(); return true; }
      else return false;
      SND.cursor(); render();
      const sel = cards[win.index].el;
      if (sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest' });
      return true;
    };
    render();
    return pushWin(win, { full: true });
  }

  // 選擇劇本
  function chooseScenario() {
    const list = TK.SCENARIOS || [TK.SCENARIO];
    cardsWin('選擇劇本', '從長平之戰到秦滅六國，選一個時代登場', list.map((sc) => ({
      el: h('div', { class: 'scard' },
        h('div', { class: 'sc-year' }, h('b', {}, E.yearText(sc.year)), '年'),
        h('div', { class: 'sc-name' }, sc.title),
        h('div', { class: 'sc-tag' }, sc.tag || ''),
        h('div', { class: 'sc-desc' }, sc.desc || ''),
        h('div', { class: 'sc-chips' }, sc.factions.slice(0, 6).map((f) => h('span', { class: 'chip', style: `--c:${f.color}` }, f.name.replace(/軍$/, ''))))),
      act: () => { TK.SCENARIO = sc; chooseFaction(); },
    })));
  }

  // 選擇君主：勢力卡片
  function chooseFaction() {
    const sc = TK.SCENARIO;
    const cards = sc.factions.map((f) => {
      const cities = sc.cities.filter((c) => c.owner === f.id);
      const gens = sc.generals.filter((g) => g.faction === f.id).length;
      const troops = cities.reduce((a, c) => a + c.troops, 0);
      const diff = troops >= 60000 ? 1 : troops >= 40000 ? 2 : troops >= 30000 ? 3 : troops >= 15000 ? 4 : 5;
      const ruler = Object.assign({ id: f.ruler }, sc.generals.find((g) => g.id === f.ruler));
      const army = Math.max(1, Math.min(4, Math.round(troops / 15000)));
      return {
        el: h('div', { class: 'fcard', style: `--c:${f.color}` },
          face(ruler, 'head', 0, 0, 'fc-face'),
          h('div', { class: 'fc-main' },
            h('div', { class: 'fc-name' }, f.name, h('span', { class: 'seal', style: `background:${f.color}` }, sealChar(f.name))),
            h('div', { class: 'dim' }, `君主 ${f.ruler}｜${cities.map((c) => c.name).join('、') || '—'}`),
            h('div', { class: 'dim' }, `武將 ${gens} 名｜兵 ${fmtW(troops)}`),
            h('div', { class: 'fc-diff' }, '難度 ', h('span', {}, '★'.repeat(diff) + '☆'.repeat(5 - diff)))),
          h('div', { class: 'fc-army' }, Array.from({ length: army }, () => svgNode(TK.Icons.unit('spear', f.color))))),
        act: () => setupGame(f, ruler),
      };
    });
    cardsWin(`${E.yearText(sc.year)}年「${sc.title}」・選擇君主`, sc.desc, cards);
  }

  // 開局設定：模式與難易度
  function setupGame(f, ruler) {
    let mode = 'historical', diffKey = 'normal';
    const rows = [
      { key: 'mode', label: '模式', opts: [['historical', '歷史劇本', '依條件發生歷史事件與抉擇'], ['free', '自由模式', '不發生歷史事件，各勢力自由發展']] },
      { key: 'diff', label: '難易度', opts: Object.entries(E.DIFFICULTY).map(([k, d]) => [k, d.label, d.desc]) },
    ];
    let row = 0;
    const body = h('div', { class: 'setup' });
    const start = () => { SND.ok(); closeAll(); newGame(f.id, mode, diffKey); };
    const render = () => {
      body.replaceChildren(
        h('div', { class: 'su-top' }, face(ruler, 'full', 0, 0, 'su-face'),
          h('div', {}, h('div', { class: 'su-name', style: `color:${f.color}` }, f.name), h('div', { class: 'dim' }, `君主 ${f.ruler}`))),
        ...rows.map((r, ri) => {
          const val = r.key === 'mode' ? mode : diffKey;
          const cur = r.opts.find((o) => o[0] === val);
          return h('div', { class: 'su-row' + (ri === row ? ' focus' : '') },
            h('div', { class: 'su-label' }, r.label),
            h('div', { class: 'seg' }, r.opts.map(([k, label]) => h('button', {
              class: k === val ? 'on' : '',
              onclick: (e) => { e.stopPropagation(); row = ri; if (r.key === 'mode') mode = k; else diffKey = k; SND.cursor(); render(); },
            }, label))),
            h('div', { class: 'su-hint dim' }, cur ? cur[2] : ''));
        }),
        h('div', { class: 'su-foot' },
          h('button', { class: 'act', onclick: (e) => { e.stopPropagation(); SND.cancel(); popWin(); } }, '返回'),
          h('button', { class: 'act primary start', onclick: (e) => { e.stopPropagation(); start(); } }, '出陣')));
    };
    const el = h('div', { class: 'win pop setup-win' }, h('h3', {}, '開局設定'), body);
    const win = { el };
    win.onKey = (e) => {
      const r = rows[row];
      const keys = r.opts.map((o) => o[0]);
      const cur = keys.indexOf(r.key === 'mode' ? mode : diffKey);
      const set = (i) => { if (r.key === 'mode') mode = keys[i]; else diffKey = keys[i]; };
      if (e.key === 'ArrowUp') row = Math.max(0, row - 1);
      else if (e.key === 'ArrowDown') row = Math.min(rows.length - 1, row + 1);
      else if (e.key === 'ArrowLeft') set(Math.max(0, cur - 1));
      else if (e.key === 'ArrowRight') set(Math.min(keys.length - 1, cur + 1));
      else if (e.key === 'Enter' || e.key === ' ') { start(); return true; }
      else if (e.key === 'Escape') { SND.cancel(); popWin(); return true; }
      else return false;
      SND.cursor(); render(); return true;
    };
    render();
    return pushWin(win, { center: true, width: 760, shade: true });
  }

  // 難易度
  function chooseDifficulty(fid, mode) {
    menuWin('難易度', Object.entries(E.DIFFICULTY).map(([k, d]) => ({
      label: d.label, hint: d.desc, act: () => { closeAll(); newGame(fid, mode, k); },
    })), null, { center: true, width: 760, shade: true });
    stack[stack.length - 1].menu.index = 1;
    stack[stack.length - 1].menu.render();
  }

  function slotMenu(saving) {
    const items = [];
    if (!saving) items.push({ label: '自動存檔', hint: meta(AUTO_KEY) || '（空）', off: !meta(AUTO_KEY), act: () => { closeAll(); loadKey(AUTO_KEY); } });
    for (let n = 1; n <= 3; n++) {
      const m = meta(SLOT_KEY(n));
      items.push({
        label: `存檔 ${n}`, hint: m || '（空）', off: !saving && !m,
        act: () => {
          closeAll();
          if (saving) say(null, store(SLOT_KEY(n), JSON.stringify(S)) ? `已存到存檔 ${n}。` : '此瀏覽器無法存檔。');
          else loadKey(SLOT_KEY(n));
        },
      });
    }
    menuWin(saving ? '存檔' : '讀檔', items, null, { center: true, width: 640, shade: true });
  }

  function loadKey(key) {
    try {
      const d = JSON.parse(store(key) || 'null');
      if (!d || d.version !== 1) throw new Error('bad');
      S = d;
      if (TK.scenarioById) TK.SCENARIO = TK.scenarioById(d.scenario);
      enterGame();
      say(null, `讀取了 ${E.dateStr(S)} 的記錄。`);
    } catch (e) { SND.error(); }
  }

  function newGame(fid, mode, difficulty) {
    S = E.newGame(fid, undefined, mode, difficulty);
    E.addLog(S, `你成為了${S.factions[fid].name}的君主。目標：統一天下！`, 'major', [fid]);
    enterGame();
    const ruler = S.generals[S.factions[fid].ruler];
    busy = true;
    renderCmd(); // 開場對話與事件播放時，指令先鎖住
    const opening = TK.Events ? TK.Events.run(S) : [];
    banner().then(async () => {
      say(ruler, '天下大亂，正是英雄用武之時。諸位，隨我平定四方！', { wait: true });
      const adv = advisor();
      // 開場對話不擋住操作（不必先點掉訊息才能下指令）
      if (adv && adv !== ruler) say(adv, '大王，請在地圖上點選城市，再按右下的指令按鈕；武將卡片可以點開看詳細資料。', { wait: true });
      await playEvents(opening);
      busy = false;
      render();
    });
  }

  function enterGame() {
    closeAll();
    if (TK.Music) TK.Music.play('domestic');
    $('title').classList.add('hidden');
    $('game').classList.remove('hidden');
    const mine = E.citiesOf(S, S.player);
    const cap = mine.find((c) => E.generalsIn(S, c.id, (g) => g.ruler && g.status === 'active').length) || mine[0];
    selected = cap ? cap.id : Object.keys(S.cities)[0];
    rootMenu = null;
    render();
    rootKey = (e) => { if (e.key === 'e' || e.key === 'E') { endMonth(); return true; } return rootMenu && rootMenu.onKey(e); };
  }

  // ---------- 主畫面繪製 ----------
  function render() {
    if (!S) return;
    renderStatus();
    renderMap();
    renderCity();
    renderCmd();
  }

  // 頂部列：日期、勢力、資源（圖示＋數字）、常用按鈕
  function renderStatus() {
    const f = S.factions[S.player];
    const p = E.powerOf(S, S.player);
    const hov = hovered && S.cities[hovered];
    const icon = (n) => svgNode(TK.Icons.icon(n));
    const res = (n, v, title) => h('span', { class: 'res', title }, icon(n), h('b', {}, v));
    const strat = E.strategistOf(S, S.player);
    const btn = (label, title, act, cls) => h('button', { class: 'tb ' + (cls || ''), title, onclick: (e) => { e.stopPropagation(); if (busy && cls !== 'snd') return; SND.ok(); act(); } }, label);
    $('status').replaceChildren(
      h('div', { class: 'brand' }, '戰國七雄'),
      h('div', { class: 'date' }, h('small', {}, `${E.yearText(S.year)}年`), h('b', {}, MONTHS[S.month - 1]), h('span', { class: 'season' }, SEASON(S.month))),
      h('div', { class: 'fac' }, h('span', { class: 'seal', style: `background:${f.color}` }, sealChar(f.name)), f.name),
      h('div', { class: 'resources' },
        res('city', p.cities, '城數'), res('troops', fmtW(p.troops), '兵力'), res('gold', fmtW(p.gold), '金'), res('food', fmtW(p.food), '糧'), res('general', p.generals, '武將')),
      h('div', { class: 'chips' },
        h('span', { class: 'chip-s' }, E.DIFFICULTY[S.difficulty || 'normal'].label),
        h('span', { class: 'chip-s', title: '軍師：在「任命」指定' }, `軍師 ${strat ? strat.name : '空缺'}`),
        hov ? h('span', { class: 'chip-s hov' }, `${hov.name}・${E.factionName(S, hov.owner)}・兵${fmtW(hov.troops)}`) : null),
      h('div', { class: 'grow' }),
      btn('存檔', '存檔', () => slotMenu(true)),
      btn('讀檔', '讀檔', () => slotMenu(false), 'snd'),
      btn('標題', '回到標題畫面', () => confirmWin('回到標題畫面？（每月會自動存檔）', showTitle), 'snd'),
      btn(TK.Music && TK.Music.isOn() ? '♪' : '♪̸', '音樂開關', () => { if (TK.Music) TK.Music.toggle(); renderStatus(); }, 'snd'),
      h('button', { class: 'tb endturn', disabled: busy || !!S.over, title: '結束本月（E）', onclick: (e) => { e.stopPropagation(); endMonth(); } }, '結束本月'));
  }

  function attackTargets() {
    const c = S.cities[selected];
    if (!c || c.owner !== S.player) return [];
    return E.neighbors(S, c.id).filter((id) => S.cities[id].owner !== S.player);
  }

  function renderMap() {
    MV.render($('map'), S, { selected, hovered, targets: attackTargets(), blink, color, player: S.player });
  }

  // 每月金收支：商業收入減軍餉
  function netGold(c) {
    const net = E.goldIncome(c, S) - E.upkeep(c);
    return h('small', { class: net >= 0 ? 'up' : 'down', title: `收入 ${E.goldIncome(c, S)}，軍餉 ${E.upkeep(c)}` }, ` ${net >= 0 ? '+' : ''}${net}/月`);
  }
  // 數值長條的評語
  function rating(v, max) {
    const r = v / max;
    return r < 0.3 ? '薄弱' : r < 0.55 ? '尚可' : r < 0.8 ? '興盛' : '繁榮';
  }
  const CITY_BARS = [['farm', '農業', 999, '#5b9a5b'], ['commerce', '商業', 999, '#c98a3a'], ['defense', '城防', 999, '#5a6b8a'], ['order', '民心', 100, '#c9a23a'], ['train', '訓練', 100, '#b8503a']];
  const STAT_COLORS = { lead: '#3d6fb0', war: '#b8403a', int: '#7a4fb0', pol: '#3d8a5a', cha: '#c08a2a', loyalty: '#7d7062' };

  // 右側面板：城市概況（長條）＋麾下武將卡片
  function renderCity() {
    const c = S.cities[selected];
    const box = $('city-win');
    if (!c) { box.replaceChildren(); return; }
    const mine = c.owner === S.player;
    const mix = E.mixOf(c);
    const gens = c.owner ? E.officers(S, c.id).slice().sort((a, b) => (b.ruler - a.ruler) || (b.lead + b.war + b.int) - (a.lead + a.war + a.int)) : [];
    const free = E.generalsIn(S, c.id, (g) => g.status === 'free' && !g.hidden);
    const pris = E.generalsIn(S, c.id, (g) => g.status === 'prisoner');
    const gov = c.owner ? E.governorOf(S, c) : null;
    const bar = ([k, label, max, col]) => h('div', { class: 'cbar' },
      svgNode(TK.Icons.icon(k)), h('span', { class: 'lbl' }, label),
      h('span', { class: 'track' }, h('i', { style: `width:${Math.min(100, 100 * c[k] / max)}%;background:${col}` })),
      h('span', { class: 'val' }, c[k]), h('span', { class: 'rate' }, rating(c[k], max)));
    const res = (icon, label, v) => h('div', { class: 'cres' }, svgNode(TK.Icons.icon(icon)), h('span', { class: 'dim' }, label), h('b', {}, v));
    box.replaceChildren(
      h('div', { class: 'city-head' }, h('span', { class: 'name' }, c.name),
        h('span', { class: 'owner', style: `background:${color(c.owner)}` }, E.factionName(S, c.owner)),
        c.owner ? h('span', { class: 'gov dim' }, `太守 ${gov ? gov.name : '空缺'}`) : null),
      h('div', { class: 'cres-row' },
        res('gold', '金', mine ? h('span', {}, fmt(c.gold), netGold(c)) : fmt(c.gold)), res('food', '糧', fmtW(c.food)),
        res('troops', '兵', mine ? h('span', { title: '可養兵力上限（人口的 12%）' }, fmtW(c.troops), h('small', { class: 'dim' }, `／${fmtW(E.troopCap(c))}`)) : fmtW(c.troops)),
        res('pop', '人口', fmtW(c.pop))),
      h('div', { class: 'mixrow' }, UK.map((k) => h('span', { class: 'mixchip' }, svgNode(TK.Icons.unit(k, color(c.owner))), E.UNITS[k].short, h('b', {}, fmtW(mix[k]))))),
      h('div', { class: 'cbars' }, CITY_BARS.map(bar)),
      h('div', { class: 'sec' }, `麾下武將（${gens.length}）`),
      gens.length ? h('div', { class: 'gcards' }, gens.map((g) => genCard(g, mine))) : h('div', { class: 'dim', style: 'padding:4px 2px' }, '無人駐守'),
      ...(free.length || pris.length ? [h('div', { class: 'sec' }, '城中人物'),
        h('div', { class: 'others' }, ...free.map((g) => h('span', { class: 'ochip', onclick: () => generalDetail(g) }, face(g, 'head', 0, 0, 'mini'), g.name, h('small', {}, '在野'))),
          ...pris.map((g) => h('span', { class: 'ochip pris', onclick: () => generalDetail(g) }, face(g, 'head', 0, 0, 'mini'), g.name, h('small', {}, '俘虜'))))] : []));
  }

  // 武將卡片：頭像、身分、能力長條（1～100）、兵種適性；點一下看詳細
  function genCard(g, mine) {
    const role = roleOf(g) || PT.classLabel(g, PT.traits(g));
    const stat = (k, label) => h('div', { class: 'gs' }, h('span', { class: 'k' }, label),
      h('span', { class: 'track' }, h('i', { style: `width:${g[k]}%;background:${STAT_COLORS[k]}` })), h('span', { class: 'v' }, g[k]));
    return h('div', { class: 'gcard' + (mine && g.acted ? ' acted' : ''), onclick: () => { SND.ok(); generalDetail(g); } },
      face(g, 'head', 0, 0, 'gc-face'),
      h('div', { class: 'gc-main' },
        h('div', { class: 'gc-name' }, g.name, h('span', { class: 'badge' + (g.ruler ? ' ruler' : '') }, role), mine && g.acted ? h('span', { class: 'done' }, '已行動') : null),
        h('div', { class: 'gstats' }, stat('lead', '統'), stat('war', '武'), stat('int', '智'), stat('pol', '政'), stat('cha', '魅'), !g.ruler && g.status === 'active' ? stat('loyalty', '忠') : h('div')),
        h('div', { class: 'apt' }, UK.map((k) => h('span', {}, E.UNITS[k].short, h('b', { class: `g-${E.aptitude(g, k)}` }, E.aptitude(g, k)))))));
  }

  // 指令按鈕：直接點，需要選武將或數量時才跳出視窗
  function renderCmd() {
    const c = S.cities[selected];
    const mine = c && c.owner === S.player && !S.over;
    const items = [];
    if (mine) {
      const idle = E.officers(S, c.id).some((g) => !g.acted);
      const why = '本城的武將本月都已行動了。';
      const adj = E.neighbors(S, c.id);
      const cand = E.generalsIn(S, c.id, (g) => (g.status === 'free' && !g.hidden) || g.status === 'prisoner');
      const pris = E.generalsIn(S, c.id, (g) => g.status === 'prisoner');
      const hasNonRuler = E.officers(S, c.id).some((g) => !g.ruler);
      for (const type of ['farm', 'commerce', 'order', 'defense', 'train']) {
        const d = E.DEV[type];
        items.push({ label: d.label, hint: d.cost ? `金${d.cost}` : '', off: busy || !idle || c.gold < d.cost, why: !idle ? why : '金不足。', act: () => devAct(c, type) });
      }
      items.push({ label: '徵兵', off: busy || !idle, why, act: () => draftFlow(c) });
      items.push({ label: '出征', off: busy || !idle || !adj.some((id) => S.cities[id].owner !== S.player), why: !idle ? why : '附近沒有可進攻的城。', act: () => attackFlow(c) });
      items.push({ label: '移動', off: busy || !idle || !adj.some((id) => S.cities[id].owner === S.player), why: !idle ? why : '沒有相鄰的我方城市。', act: () => moveFlow(c) });
      items.push({ label: '襲擾', hint: `金${E.RAID_COST}`, off: busy || !adj.some((id) => S.cities[id].owner && S.cities[id].owner !== S.player) || c.gold < E.RAID_COST,
        why: c.gold < E.RAID_COST ? '金不足。' : '附近沒有敵城。', act: () => raidFlow(c) });
      items.push({ label: '搜索', off: busy || !idle, why, act: () => pickGeneral(c, 'int', '搜索：選擇武將', (g) => run({ type: 'search', city: c.id, general: g.id }, g, searchSpeech)) });
      items.push({ label: '登用', off: busy || !idle || !cand.length, why: cand.length ? why : '城中沒有可登用的人才，先搜索看看吧。', act: () => recruitFlow(c, cand) });
      items.push({ label: '賞賜', hint: '金100', off: busy || c.gold < 100 || !hasNonRuler, why: c.gold < 100 ? '金不足。' : '沒有可以賞賜的武將。', act: () => rewardFlow(c) });
      items.push({ label: '任命', hint: '軍師・太守', off: busy, act: () => appointMenu(c) });
      items.push({ label: '封君', off: busy, act: () => enfeoffFlow(c) });
      items.push({ label: '反間', hint: `金${E.DISCORD_COST}`, off: busy || !idle || c.gold < E.DISCORD_COST, why: c.gold < E.DISCORD_COST ? '金不足。' : why, act: () => discordFlow(c) });
      items.push({ label: '俘虜', off: busy || !pris.length, why: '沒有俘虜。', act: () => prisonerFlow(c, pris) });
    }
    items.push({ label: '外交', off: busy || !!S.over, act: diplomacyFlow });
    items.push({ label: '情報', act: () => infoMenu(c) });
    items.push({ label: '系統', act: systemMenu });
    const keep = rootMenu ? rootMenu.index : 0;
    rootMenu = makeMenu(items, (it) => it.act(), { cols: 5 });
    rootMenu.index = Math.min(keep, items.length - 1);
    rootMenu.ul.classList.add('tiles');
    rootMenu.render();
    $('cmd-win').replaceChildren(h('h3', {}, mine ? `${c.name}・指令` : `${c ? c.name : ''}・他國城市`), rootMenu.ul);
    const et = document.querySelector('#status .endturn');
    if (et) et.disabled = busy || !!S.over;
  }

  // ---------- 武將表 ----------
  const STAT_COLS = [['統', 'lead'], ['武', 'war'], ['智', 'int'], ['政', 'pol'], ['魅', 'cha']];
  function genRows(list, opts) {
    opts = opts || {};
    return list.map((g) => ({
      g, off: opts.off ? opts.off(g) : false, why: opts.why,
      cells: [h('span', { class: 'gname' }, face(g, 'head', 0, 0, 'mini'), g.name + (g.ruler ? '★' : '')), ...STAT_COLS.map(([l, k]) => statCell(l, g[k])),
        g.ruler || g.status !== 'active' ? '－' : statCell('忠', g.loyalty), ...(opts.extra ? opts.extra(g) : [])],
    }));
  }
  const STAT_COLOR = { 統: '#2f6db0', 武: '#c0392b', 智: '#7b4fb0', 政: '#2e8b57', 魅: '#c9962a', 忠: '#7a6a5a' };
  function statCell(l, v) {
    return h('span', { class: 'scell' }, h('b', {}, v), h('i', {}, h('u', { style: `width:${Math.max(0, Math.min(100, v))}%;background:${STAT_COLOR[l]}` })));
  }
  function genCols(hlKey, extra) {
    return [{ label: '武將' }, ...STAT_COLS.map(([l, k]) => ({ label: l, hl: k === hlKey })), { label: '忠' }, ...(extra || []).map((l) => ({ label: l }))];
  }
  function roleOf(g) {
    if (!g || g.status !== 'active' || !g.faction) return '';
    if (g.king) return `${g.king}王`;
    if (E.strategistOf(S, g.faction) === g) return '軍師';
    const c = S.cities[g.city];
    if (c && E.governorOf(S, c) === g) return `${c.name}太守`;
    return '';
  }
  function genSide(r) {
    const g = r.g;
    const apt = UK.map((k) => h('span', { class: `g-${E.aptitude(g, k)}` }, `${E.UNITS[k].short}${E.aptitude(g, k)} `));
    const sk = g.skill && E.SKILLS[g.skill];
    return h('div', {}, face(g, 'head', 36, 36), h('div', { class: 'desc' }, g.name, h('br'), h('span', { class: 'dim' }, [...new Set([roleOf(g), PT.classLabel(g, PT.traits(g))])].filter(Boolean).join('・')), h('br'), apt,
      sk ? h('div', { class: 'skill' }, h('b', {}, `特技・${g.skill}`), h('br'), h('small', {}, sk.desc)) : null));
  }

  function pickGeneral(c, statKey, title, cb, opts) {
    opts = opts || {};
    const list = E.officers(S, c.id).filter((g) => !g.acted).sort((a, b) => b[statKey] - a[statKey]);
    if (!list.length) { SND.error(); say(null, '本城沒有可行動的武將。'); return; }
    tableWin(title, genCols(statKey), genRows(list), (r) => cb(r.g), { side: genSide, width: 800, x: 200, info: opts.info });
  }

  // ---------- 指令 ----------
  const DEV_SPEECH = {
    farm: (n) => `已帶領百姓開墾荒地，農業上升了 ${n}。`,
    commerce: (n) => `已整頓市集、招來商旅，商業上升了 ${n}。`,
    order: (n) => `已巡視城內、安撫百姓，民心上升了 ${n}。`,
    defense: (n) => `城牆已修築完畢，城防上升了 ${n}。`,
    train: (n) => `操練完成，士兵的訓練度上升了 ${n}。`,
  };

  function run(cmd, speaker, speech) {
    const r = E.exec(S, S.player, cmd);
    if (!r.ok) { SND.error(); say(null, r.msg); return null; }
    if (!r.battle && !r.live) E.addLog(S, r.msg, 'info', [S.player]);
    closeAll();
    render();
    if (r.battle) {
      playBattle(r.battle).then(() => { render(); checkOver(); });
      return r;
    }
    if (r.live) {
      const ctx = r.live;
      const view = {
        city: ctx.city.id, frames: ctx.frames, lines: ctx.lines, result: null, summary: '',
        atk: { faction: ctx.atk.faction, name: ctx.aName, commander: ctx.aCmd, generals: ctx.atk.generals.map((g) => g.name), troops: ctx.A0, units: ctx.aUnits },
        def: { faction: ctx.defOwner, name: ctx.dName, commander: ctx.dCmd, generals: ctx.defGens.map((g) => g.name), troops: ctx.D0, units: ctx.dUnits },
      };
      playBattle(view, ctx).then(() => { render(); checkOver(); });
      return r;
    }
    const gain = (r.msg.match(/\+(\d+)/) || [])[1];
    const text = speech ? speech(gain, r) : null;
    say(text ? speaker || null : null, text || r.msg);
    return r;
  }

  const SUB = { x: 600, y: 360, width: 320 };

  function devAct(c, type) {
    const d = E.DEV[type];
    pickGeneral(c, d.stat, `${d.label}：選擇武將`, (g) => run({ type, city: c.id, general: g.id }, g, (n) => DEV_SPEECH[type](n)));
  }

  // 截斷糧道：派武將燒毀相鄰敵城的軍糧
  function raidFlow(c) {
    const targets = E.neighbors(S, c.id).map((id) => S.cities[id]).filter((t) => t.owner && t.owner !== S.player);
    tableWin('襲擾：選擇敵城', [{ label: '城' }, { label: '勢力' }, { label: '兵' }, { label: '糧' }],
      targets.map((t) => ({ t, cells: [t.name, E.factionName(S, t.owner), fmtW(t.troops), fmtW(t.food)] })), (row) => {
        const t = row.t;
        pickGeneral(c, 'war', `襲擾${t.name}：選擇武將`, (g) => run({ type: 'raid', city: c.id, general: g.id, target: t.id }, g,
          (n, res) => (res.msg.includes('被擒') ? null : `遵命！${res.msg}。`)), {
          info: (r) => `被擒機率約 ${Math.round(E.raidRisk(r.g) * 100)}%（武力越高越安全${r.g.skill === '游擊' ? '；游擊特技：燒得更多、更安全' : ''}）\n糧食燒光的城，守軍會逃散。`,
        });
      }, { width: 640, x: 320 });
  }

  function searchSpeech(n, r) {
    const found = r.msg.match(/「(.+)」/);
    if (found) return `主公，在城中找到一位人才——${found[1]}！`;
    const gold = r.msg.match(/金 (\d+)/);
    if (gold) return `四處搜尋了一番，找到金 ${gold[1]}。`;
    return '四處搜尋了一番，什麼也沒找到……';
  }

  // 封君
  function enfeoffFlow(c) {
    const list = E.officers(S, c.id).filter((g) => !g.ruler && !g.king).sort((a, b) => E.ambition(b) - E.ambition(a));
    if (!list.length) { SND.error(); say(null, '本城沒有可以受封的武將。'); return; }
    tableWin(`封君：封${c.name}給誰？`, genCols(null, ['野心']), genRows(list, { extra: (g) => [Math.round(E.ambition(g))] }), (r) => {
      const g = r.g;
      confirmWin(`封${g.name}為${c.name}君？\n忠誠會立刻全滿並兼任太守；但野心 80 以上的封君忠誠每月 -1，太低時可能據城自立。`, () => {
        run({ type: 'enfeoff', city: c.id, target: g.id }, g, () => `臣${g.name}，謝大王厚恩！必為大王鎮守${c.name}。`);
      });
    }, { side: genSide, width: 860, x: 200 });
  }

  // 反間計
  function discordFlow(c) {
    const foes = Object.values(S.generals).filter((g) => g.status === 'active' && g.faction && g.faction !== S.player && !g.ruler)
      .sort((a, b) => (E.strategistOf(S, b.faction) === b) - (E.strategistOf(S, a.faction) === a) || b.int + b.lead - a.int - a.lead).slice(0, 40);
    tableWin('反間：選擇要離間的敵將', genCols('int', ['勢力', '職位']), genRows(foes, { extra: (g) => [E.factionName(S, g.faction), roleOf(g) || '—'] }), (r) => {
      const t = r.g;
      pickGeneral(c, 'int', `反間${t.name}：派誰去？`, (g) => run({ type: 'discord', city: c.id, general: g.id, target: t.id }, g, (n, res) => res.msg), {
        info: (row) => `成功率約 ${Math.round(E.discordChance(S, row.g, t) * 100)}%（智略高、對方忠誠低時容易成功${row.g.skill === '奇計' ? '；奇計特技大幅提高' : ''}）\n成功：對方忠誠 -35，軍師會被罷免，忠誠太低就離開。`,
      });
    }, { side: genSide, width: 900, x: 180 });
  }

  // 官職：軍師（全勢力一位）與太守（本城一位）
  const ROLE_TEXT = {
    strategist: '軍師：每月獻策並估計出征勝算；戰鬥時以軍師的智略施展計略。',
    governor: '太守：依政務增加本城每月金收入；魅力 60 以上時民心每月 +1。',
  };
  function appointMenu(c) {
    const st = E.strategistOf(S, S.player), gov = E.governorOf(S, c);
    const pick = (role) => {
      const list = role === 'strategist'
        ? Object.values(S.generals).filter((g) => g.faction === S.player && g.status === 'active' && !g.ruler).sort((a, b) => b.int - a.int)
        : E.officers(S, c.id).sort((a, b) => b.pol - a.pol);
      if (!list.length) { SND.error(); say(null, role === 'strategist' ? '沒有可以擔任軍師的武將。' : '本城沒有武將。'); return; }
      const title = role === 'strategist' ? '任命軍師（依智略排序）' : `任命${c.name}太守（依政務排序）`;
      tableWin(title, genCols(role === 'strategist' ? 'int' : 'pol', ['所在']), genRows(list, { extra: (g) => [g.city] }), (r) => {
        run({ type: 'appoint', role, city: c.id, target: r.g.id }, r.g, () => (role === 'strategist'
          ? `承蒙主公信任，在下必當竭盡所能，為主公運籌帷幄。`
          : `遵命，在下必定好好治理${c.name}。`));
      }, { side: genSide, width: 860, x: 200, info: () => ROLE_TEXT[role] });
    };
    menuWin('任命', [
      { label: '軍師', hint: st ? st.name : '空缺', act: () => pick('strategist') },
      { label: '太守', hint: gov ? gov.name : '空缺', act: () => pick('governor') },
      ...(st ? [{ label: '解除軍師', hint: st.name, act: () => run({ type: 'appoint', role: 'strategist', city: c.id, target: null }) }] : []),
    ], null, { x: 640, y: 300, width: 340 });
  }

  function draftFlow(c) {
    pickGeneral(c, 'cha', '徵兵：選擇武將', (g) => {
      menuWin('徵兵：選擇兵種', UK.map((k) => ({
        label: E.UNITS[k].name, hint: `金${E.UNITS[k].cost}/千　適性${E.aptitude(g, k)}`,
        act: () => {
          const max = E.maxDraft(S, c, g, k);
          if (max < 100) { SND.error(); say(g, '金錢或人口不足，無法徵兵。'); return; }
          numberWin(`徵募${E.UNITS[k].name}`, {
            min: 100, max, value: Math.min(3000, max), step: 100, pos: { x: 420, y: 240 },
            info: (v) => `花費 金${Math.ceil(v * E.UNITS[k].cost / 1000)}　民心 -${Math.ceil(v / 2000)}\n${E.UNITS[k].desc}`,
          }, (v) => run({ type: 'draft', city: c.id, general: g.id, unit: k, amount: v }, g, () => `已徵募${E.UNITS[k].name} ${v} 人，即日起開始操練。`));
        },
      })), null, { x: 400, y: 220, width: 560 });
    });
  }

  function verdictOf(u, tm) {
    const fa = E.fractions(u), fd = E.fractions(tm);
    let m = 0;
    for (const a of UK) for (const d of UK) m += fa[a] * fd[d] * E.matchup(a, d);
    return m >= 1.06 ? '兵種佔優' : m <= 0.94 ? '兵種不利' : '兵種相當';
  }

  const iconCache = {};
  function unitIcon(k) {
    const key = `${k}|${S.player}`;
    if (!iconCache[key]) {
      let svg = TK.Icons.unit(k, color(S.player));
      if (!/xmlns=/.test(svg)) svg = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
      iconCache[key] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }
    return iconCache[key];
  }

  function attackFlow(c) {
    const targets = E.neighbors(S, c.id).filter((id) => S.cities[id].owner !== S.player).map((id) => S.cities[id]);
    tableWin('出征：選擇目標', [{ label: '城' }, { label: '勢力' }, { label: '兵' }, { label: '槍' }, { label: '騎' }, { label: '弩' }, { label: '城防' }],
      targets.map((t) => { const m = E.mixOf(t); return { t, cells: [t.name, E.factionName(S, t.owner), fmtW(t.troops), fmtW(m.spear), fmtW(m.cav), fmtW(m.xbow), t.defense] }; }),
      (row) => {
        const t = row.t;
        const list = E.officers(S, c.id).filter((g) => !g.acted).sort((a, b) => (b.lead + b.war) - (a.lead + a.war));
        tableWin(`出征${t.name}：選擇武將（最多 3 名）`, genCols('lead', ['槍', '騎', '弩']), genRows(list, { extra: (g) => UK.map((k) => E.aptitude(g, k)) }), (picked) => {
          const gens = picked.map((r) => r.g);
          const mix = E.mixOf(c);
          const cmdr = gens.slice().sort((a, b) => b.lead - a.lead)[0];
          allocWin(`出征${t.name}：派遣兵力`, UK.map((k) => ({ key: k, label: E.UNITS[k].name, max: mix[k], init: Math.floor(mix[k] * 0.7 / 100) * 100, icon: unitIcon(k) })),
            (u) => {
              const n = u.spear + u.cav + u.xbow;
              const st = E.strategistOf(S, S.player);
              const est = st ? `\n軍師${st.name}：${oddsText(TK.AI.estimate(S, c, n, t))}` : '\n（任命軍師後可估計勝算）';
              return `出陣 ${n} 人（軍糧 ${Math.ceil(n / 10)}／城中 ${c.food}）主將 ${cmdr.name}\n守軍 ${fmtW(t.troops)}：${verdictOf(u, E.mixOf(t))}（槍剋騎・騎剋弩・弩剋槍）${est}`;
            },
            (u) => {
              const ids = gens.map((g) => g.id);
              SND.march();
              run({ type: 'attack', city: c.id, general: ids[0], generals: ids, target: t.id, units: u, interactive: manualBattle });
            },
            {
              validate: (u) => u.spear + u.cav + u.xbow >= 1000 && c.food >= Math.ceil((u.spear + u.cav + u.xbow) / 10),
              why: (u) => (u.spear + u.cav + u.xbow < 1000 ? '出陣兵力至少要 1000。' : '軍糧不足。'),
              pos: { x: 320, y: 200 },
            });
        }, { multi: true, max: 3, marks: [0], side: genSide, width: 940, x: 160 });
      }, { width: 760, x: 300 });
  }

  function moveFlow(c) {
    const dests = E.neighbors(S, c.id).filter((id) => S.cities[id].owner === S.player);
    menuWin('移動：目的地', dests.map((id) => ({
      label: id, hint: `兵${fmtW(S.cities[id].troops)}`,
      act: () => {
        const list = E.officers(S, c.id).filter((g) => !g.acted);
        tableWin(`移動至${id}：選擇武將`, genCols('lead'), genRows(list), (picked) => {
          const mix = E.mixOf(c);
          const rows = UK.map((k) => ({ key: k, label: E.UNITS[k].name, max: mix[k], init: 0, icon: unitIcon(k) }));
          rows.push({ key: 'gold', label: '金', max: c.gold, init: 0, step: 100 }, { key: 'food', label: '糧', max: c.food, init: 0, step: 1000 });
          allocWin(`移動至${id}：運送`, rows, (v) => `兵 ${v.spear + v.cav + v.xbow}　金 ${v.gold}　糧 ${v.food}`, (v) => {
            const ids = picked.map((r) => r.g.id);
            run({ type: 'move', city: c.id, general: ids[0], generals: ids, dest: id, units: { spear: v.spear, cav: v.cav, xbow: v.xbow }, gold: v.gold, food: v.food },
              picked[0].g, () => `遵命，${picked.map((r) => r.g.name).join('、')}已前往${id}。`);
          }, { pos: { x: 320, y: 140 } });
        }, { multi: true, marks: [0], side: genSide, width: 800, x: 220 });
      },
    })), null, SUB);
  }

  function recruitFlow(c, cand) {
    tableWin('登用：選擇對象', genCols(null, ['身分']), genRows(cand, { extra: (g) => [g.status === 'prisoner' ? '俘虜' : '在野'] }), (r) => {
      const t = r.g;
      pickGeneral(c, 'cha', `登用${t.name}：派遣使者`, (g) => run({ type: 'recruit', city: c.id, general: g.id, target: t.id }, g,
        (n, res) => (res.msg.includes('接受') ? `${t.name}答應加入我軍了！` : `${t.name}婉拒了……改天再試試吧。`)), {
        info: (row) => `成功率約 ${Math.round(E.recruitChance(S, row.g, t) * 100)}%（取決於魅力）`,
      });
    }, { side: genSide, width: 860, x: 200 });
  }

  function rewardFlow(c) {
    const list = E.officers(S, c.id).filter((g) => !g.ruler).sort((a, b) => a.loyalty - b.loyalty);
    tableWin('賞賜：選擇武將（金 100）', genCols(null), genRows(list), (r) => run({ type: 'reward', city: c.id, target: r.g.id }, r.g, () => '謝主公厚賞！在下必定盡心效力。'), { side: genSide, width: 800, x: 200 });
  }

  function prisonerFlow(c, pris) {
    tableWin('俘虜', genCols(null), genRows(pris), (r) => {
      const t = r.g;
      menuWin(`處置${t.name}`, [
        { label: '登用', off: !E.officers(S, c.id).some((g) => !g.acted), why: '沒有可派遣的武將。', act: () => recruitFlow(c, [t]) },
        { label: '釋放', act: () => run({ type: 'release', city: c.id, target: t.id }, t, () => '……這份恩情，我記下了。') },
        { label: '處斬', act: () => confirmWin(`真的要處斬${t.name}嗎？`, () => run({ type: 'execute', city: c.id, target: t.id }, null, () => `${t.name}已被處斬。`)) },
      ], null, { x: 620, y: 300, width: 300 });
    }, { side: genSide, width: 800, x: 200 });
  }

  // ---------- 情報 ----------
  function infoMenu(c) {
    const items = [];
    if (c && c.owner) items.push({ label: `${c.name}的武將`, act: () => cityGenerals(c) });
    items.push({ label: '我方武將', act: allGenerals });
    items.push({ label: '我方城市', act: myCities });
    items.push({ label: '勢力一覽', act: factionList });
    items.push({ label: '記錄', act: logWin });
    menuWin('情報', items, null, SUB);
  }

  function generalDetail(g) {
    const t = PT.traits(g);
    const stat = (label, v) => [h('span', { class: 'dim' }, label), h('span', { class: 'num' }, v), h('span', { style: 'padding-left:10px' }, h('div', { class: 'bar', style: `width:${Math.round(v * 1.7)}px` }))];
    const where = g.status === 'active' ? E.factionName(S, g.faction) : g.status === 'prisoner' ? '俘虜' : '在野';
    infoWin(`${g.name}${t.title ? `「${t.title}」` : ''}`, h('div', { class: 'detail' },
      face(g, 'full', 48, 60),
      h('div', {},
        h('div', {}, `${where}・${PT.classLabel(g, t)}・${g.city || ''}`),
        h('div', { class: 'stats' }, stat('統率', g.lead), stat('武力', g.war), stat('智略', g.int), stat('政務', g.pol), stat('魅力', g.cha), g.status === 'active' && !g.ruler ? stat('忠誠', g.loyalty) : null),
        h('div', { class: 'apt' }, UK.map((k) => h('span', {}, `${E.UNITS[k].name}`, h('b', { class: `g-${E.aptitude(g, k)}` }, E.aptitude(g, k))))),
        bioBlock(g))), { x: 220, y: 140, width: 760 });
  }

  // 列傳（js/bios.js）
  function bioBlock(g) {
    const b = TK.BIOS && TK.BIOS[g.name];
    if (!b) return null;
    const head = [b.zi ? `字${b.zi}` : '', b.home ? `${b.home}人` : '', b.life].filter(Boolean).join('・');
    return h('div', { class: 'bio' },
      h('div', { class: 'bio-head' }, h('b', {}, '列傳'), h('span', { class: 'dim' }, head)),
      h('p', {}, b.bio),
      b.tale ? h('p', { class: 'tale' }, h('b', {}, '典故'), b.tale) : null);
  }

  function cityGenerals(c) {
    const list = E.officers(S, c.id);
    tableWin(`${c.name}的武將`, genCols(null, ['槍', '騎', '弩']), genRows(list, { extra: (g) => UK.map((k) => E.aptitude(g, k)) }), (r) => generalDetail(r.g), { side: genSide, width: 940, x: 160 });
  }

  function allGenerals() {
    const list = Object.values(S.generals).filter((g) => g.faction === S.player && g.status === 'active')
      .sort((a, b) => (a.city > b.city ? 1 : a.city < b.city ? -1 : b.lead - a.lead));
    tableWin('我方武將', genCols(null, ['所在', '槍', '騎', '弩']), genRows(list, { extra: (g) => [g.city, ...UK.map((k) => E.aptitude(g, k))] }), (r) => generalDetail(r.g), { width: 1040, x: 120, maxH: 540 });
  }

  function myCities() {
    const list = E.citiesOf(S, S.player);
    tableWin('我方城市', [{ label: '城' }, { label: '兵' }, { label: '金' }, { label: '糧' }, { label: '農' }, { label: '商' }, { label: '民心' }, { label: '城防' }, { label: '將' }],
      list.map((c) => ({ c, cells: [c.name, fmtW(c.troops), c.gold, fmtW(c.food), c.farm, c.commerce, c.order, c.defense, E.officers(S, c.id).length] })),
      (r) => { closeAll(); selectCity(r.c.id); }, { width: 940, x: 160 });
  }

  function factionList() {
    const rows = Object.values(S.factions).filter((f) => f.alive).map((f) => {
      const p = E.powerOf(S, f.id);
      const rel = f.id === S.player ? '－' : TK.Diplomacy.STATE_LABEL[TK.Diplomacy.stateOf(S, S.player, f.id)];
      return { f, cells: [f.name, f.ruler, p.cities, fmtW(p.troops), p.generals, rel] };
    }).sort((a, b) => b.cells[2] - a.cells[2]);
    tableWin('勢力一覽', [{ label: '勢力' }, { label: '君主' }, { label: '城' }, { label: '兵力' }, { label: '將' }, { label: '關係' }], rows, () => popWin(),
      { width: 800, x: 240, side: (r) => h('div', {}, face(S.generals[r.f.ruler], 'head', 36, 36), h('div', { class: 'desc', style: `color:${r.f.color}` }, `■ ${r.f.name}`)) });
  }

  function logWin() {
    const list = h('div', { style: 'max-height:520px;overflow:auto;line-height:32px' },
      S.log.slice(-60).reverse().map((l) => h('div', { class: l.kind === 'major' ? 'hi' : l.factions.includes(S.player) ? '' : 'dim' }, `${l.date} ${l.text}`)));
    infoWin('記錄', list, { x: 120, y: 90, width: 1040 });
  }

  // 設定：出征時是否手動下戰鬥指令
  let manualBattle = store('zhanguo.manualBattle') !== '0';
  function systemMenu() {
    menuWin('系統', [
      { label: `戰鬥指揮：${manualBattle ? '手動' : '自動'}`, hint: '出征時逐段下指令', act: () => { manualBattle = !manualBattle; store('zhanguo.manualBattle', manualBattle ? '1' : '0'); popWin(); systemMenu(); } },
      { label: '存檔', off: busy, act: () => slotMenu(true) },
      { label: '讀檔', act: () => slotMenu(false) },
      { label: `音效：${SND.isMuted() ? '關' : '開'}`, act: () => { SND.toggle(); popWin(); } },
      { label: `音樂：${TK.Music && TK.Music.isOn() ? '開' : '關'}`, act: () => { if (TK.Music) TK.Music.toggle(); popWin(); systemMenu(); } },
      ...(TK.Voice && TK.Voice.available() ? [{ label: `事件語音：${TK.Voice.isOn() ? '開' : '關'}`, act: () => { TK.Voice.toggle(); popWin(); systemMenu(); } }] : []),
      { label: '聲音診斷', hint: '沒有聲音時用', act: soundCheck },
      { label: '回到標題', act: () => confirmWin('回到標題畫面？（每月會自動存檔）', showTitle) },
    ], null, SUB);
  }

  // 聲音診斷：顯示音訊狀態，可播放測試音、重設音訊
  function soundCheck() {
    const body = h('div', { class: 'soundcheck' });
    const render = () => {
      const a = TK.Audio ? TK.Audio.info() : { supported: false, log: [] };
      const row = (k, v, bad) => h('div', {}, h('span', { class: 'dim' }, k + '：'), h('b', { style: bad ? 'color:#b23a2c' : '' }, v));
      body.replaceChildren(
        row('瀏覽器支援', a.supported ? '是' : '否', !a.supported),
        row('音訊狀態', a.state === 'running' ? '運作中' : a.state, a.state !== 'running'),
        row('音訊類型', a.session),
        row('音效', SND.isMuted() ? '關（到系統選單打開）' : '開', SND.isMuted()),
        row('音樂', TK.Music && TK.Music.isOn() ? `開（${TK.Music.current() || '—'}）` : '關', !(TK.Music && TK.Music.isOn())),
        h('div', { class: 'dim', style: 'margin-top:8px;font-size:.85em;line-height:1.5' }, ...(a.log.length ? a.log : ['（沒有紀錄）']).map((l) => h('div', {}, l))),
        h('div', { style: 'margin-top:10px;display:flex;gap:10px;flex-wrap:wrap' },
          h('button', { class: 'act primary', onclick: (e) => { e.stopPropagation(); TK.Audio.testTone(); setTimeout(render, 300); } }, '播放測試音'),
          h('button', { class: 'act', onclick: (e) => { e.stopPropagation(); TK.Audio.unlock(true); SND.ok(); setTimeout(render, 300); } }, '重設音訊'),
          SND.isMuted() ? h('button', { class: 'act', onclick: (e) => { e.stopPropagation(); SND.toggle(); render(); } }, '打開音效') : null),
        h('div', { class: 'dim', style: 'margin-top:10px;font-size:.85em;line-height:1.6' },
          '聽不到測試音時：電腦請確認瀏覽器分頁沒有被靜音（分頁標籤上的喇叭圖示）、系統音量與輸出裝置（喇叭／耳機）；手機請確認側邊靜音開關與音量鍵。然後按「重設音訊」再試一次。'));
    };
    render();
    infoWin('聲音診斷', body, { x: 300, y: 120, width: 640 });
  }

  // ---------- 城市選擇 ----------
  function selectCity(id) {
    if (!id || !S.cities[id]) return;
    selected = id;
    SND.cursor();
    render();
  }

  // ---------- 外交 ----------
  function diplomacyFlow() {
    const D = TK.Diplomacy;
    const rows = Object.values(S.factions).filter((f) => f.alive && f.id !== S.player).map((f) => {
      const r = D.rel(S, S.player, f.id);
      const p = E.powerOf(S, f.id);
      return { f, cells: [f.name, f.ruler, p.cities, fmtW(p.troops), D.STATE_LABEL[r.state] + (r.state === 'truce' ? `${r.months}月` : ''), (r.rel > 0 ? '+' : '') + r.rel] };
    });
    if (!rows.length) { say(null, '天下已無其他勢力。'); return; }
    tableWin('外交：選擇對象', [{ label: '勢力' }, { label: '君主' }, { label: '城' }, { label: '兵力' }, { label: '關係' }, { label: '友好' }], rows, (row) => {
      const fid = row.f.id;
      const envoys = Object.values(S.generals).filter((g) => g.faction === S.player && g.status === 'active' && !g.acted);
      const best = envoys.slice().sort((a, b) => b.cha + b.int - a.cha - a.int)[0];
      menuWin(`對${row.f.name}`, Object.entries(D.ACTIONS).map(([k, a]) => {
        const p = best ? D.chance(S, S.player, fid, k, best) : 0;
        return {
          label: a.label, hint: k === 'war' ? '' : (p > 0 ? `約${Math.round(p * 100)}%　金${a.cost}` : '不可'),
          off: !best || p <= 0, why: !best ? '本月沒有可以出使的武將。' : `目前無法${a.label}。`,
          act: () => {
            if (k === 'war') { confirmWin(`真的要向${row.f.name}宣戰嗎？`, () => sendEnvoy(fid, k, best)); return; }
            tableWin(`${a.label}：選擇使者（金${a.cost}，由使者所在城支出）`, genCols('cha', ['所在', '成功率']),
              genRows(envoys.sort((x, y) => D.chance(S, S.player, fid, k, y) - D.chance(S, S.player, fid, k, x)), {
                extra: (g) => [g.city, `${Math.round(D.chance(S, S.player, fid, k, g) * 100)}%`],
                off: (g) => S.cities[g.city].gold < a.cost, why: '使者所在城的金不足。',
              }), (r2) => sendEnvoy(fid, k, r2.g), { side: genSide, width: 960, x: 160 });
          },
        };
      }), null, { x: 560, y: 260, width: 420 });
    }, { width: 860, x: 200, side: (r) => h('div', {}, face(S.generals[r.f.ruler], 'head', 36, 36), h('div', { class: 'desc', style: `color:${r.f.color}` }, `■ ${r.f.name}`)) });
  }

  function sendEnvoy(fid, action, g) {
    const r = E.exec(S, S.player, { type: 'diplo', action, target: fid, general: g.id });
    closeAll();
    render();
    if (!r.ok) { SND.error(); say(null, r.msg); return; }
    const ruler = S.generals[S.factions[fid].ruler];
    if (action === 'war') { SND.march(); say(S.generals[S.factions[S.player].ruler], `${S.factions[fid].name}，戰場上見分曉吧！`); return; }
    if (r.success) { SND.win(); say(ruler || null, action === 'surrender' ? '……罷了，我願歸順。' : action === 'alliance' ? '好，兩家就此結盟，共進退。' : '也罷，暫且休兵吧。'); }
    else { SND.lose(); say(ruler || null, action === 'surrender' ? '要我投降？笑話！' : '此事恕難從命。'); }
    say(g, r.msg);
  }

  // 依序演出歷史事件
  // 事件場景：背景插圖＋說話者立繪＋對話框（Enter／點擊前進，Esc 略過）
  function playScene(ev) {
    return new Promise((resolve) => {
      const kind = TK.Scenes ? TK.Scenes.forEvent(ev) : 'palace';
      const prevTrack = TK.Music ? TK.Music.current() : null;
      if (TK.Music) TK.Music.play(['fire', 'night', 'rain'].includes(kind) ? 'tense' : 'event');
      const bg = h('div', { class: 'scene-bg', style: TK.Scenes ? `background-image:url("${TK.Scenes.urlFor(ev)}")` : '' });
      const actors = { left: h('div', { class: 'actor left' }), right: h('div', { class: 'actor right' }) };
      const nameEl = h('div', { class: 'sc-name' }), textEl = h('div', { class: 'sc-text' });
      const root = h('div', { class: 'scene scene-' + kind }, bg, actors.left, actors.right,
        h('div', { class: 'sc-title' }, ev.title),
        h('div', { class: 'sc-box' }, nameEl, textEl, h('div', { class: 'sc-more' }, '▼')),
        h('div', { class: 'sc-skip' }, 'Enter：下一句　Esc：略過'));
      $('layer').append(root);
      const onStage = { left: null, right: null };
      let lastSide = 'right', i = -1, typingTimer = null, full = '';
      const place = (name) => {
        if (onStage.left === name) return 'left';
        if (onStage.right === name) return 'right';
        const side = !onStage.left ? 'left' : !onStage.right ? 'right' : (lastSide === 'left' ? 'right' : 'left');
        onStage[side] = name;
        const g = S.generals[name];
        actors[side].replaceChildren(g ? face(g, 'full', 0, 0, 'sc-face') : h('div', { class: 'sc-noface' }, name.slice(0, 1)));
        actors[side].classList.remove('enter'); void actors[side].offsetWidth; actors[side].classList.add('enter');
        return side;
      };
      const close = () => {
        clearInterval(typingTimer); battleKey = null; root.remove();
        if (TK.Voice) TK.Voice.stop();
        if (TK.Music) TK.Music.play(prevTrack === 'battle' || !prevTrack ? 'domestic' : prevTrack);
        resolve();
      };
      const next = () => {
        if (typingTimer) { clearInterval(typingTimer); typingTimer = null; textEl.textContent = full; return; }
        i++;
        if (i >= ev.lines.length) { close(); return; }
        const [sp, text] = ev.lines[i];
        let side = null;
        if (sp) { side = place(sp); lastSide = side; }
        for (const k of ['left', 'right']) actors[k].classList.toggle('on', k === side);
        root.classList.toggle('narration', !sp);
        nameEl.textContent = sp || '';
        nameEl.style.display = sp ? '' : 'none';
        full = text;
        if (TK.Voice) TK.Voice.speak(text, sp ? S.generals[sp] : null);
        let n = 0;
        textEl.textContent = '';
        typingTimer = setInterval(() => {
          n += 1;
          textEl.textContent = full.slice(0, n);
          if (n % 2) SND.type();
          if (n >= full.length) { clearInterval(typingTimer); typingTimer = null; }
        }, 28);
      };
      root.addEventListener('click', next);
      battleKey = (e) => {
        if (e.key === 'Enter' || e.key === ' ') { next(); return true; }
        if (e.key === 'Escape') { close(); return true; }
        return false;
      };
      SND.event();
      setTimeout(next, 450);
    });
  }

  async function playEvents(list) {
    for (const ev of list) {
      await playScene(ev);
      if (S.choices && S.choices.includes(ev.id)) await askChoice(ev);
      else say(null, `【${ev.title}】${ev.lines[ev.lines.length - 1][1]}`);
    }
    if (list.length) render();
  }
  // 抉擇事件：讓玩家選，再演出選擇後的台詞
  function askChoice(ev) {
    return new Promise((resolve) => {
      menuWin(ev.title, ev.choices.map((c, i) => ({
        label: c.label, hint: c.desc,
        act: async () => {
          closeAll();
          const picked = TK.Events.choose(S, ev.id, i);
          if (picked) await playScene({ id: ev.id + '_' + i, title: `${ev.title}・${picked.label}`, scene: picked.scene || ev.scene, lines: picked.lines });
          render();
          checkOver();
          resolve();
        },
      })), null, { center: true, width: 680, shade: true, cls: 'choice' });
      stack[stack.length - 1].onKey = ((orig) => (e) => (e.key === 'Escape' ? true : orig(e)))(stack[stack.length - 1].onKey);
    });
  }

  function proposals() {
    return new Promise((resolve) => {
      const next = () => {
        const p = (S.pending || []).shift();
        if (!p) { resolve(); return; }
        const f = S.factions[p.from];
        if (!f || !f.alive) { next(); return; }
        const label = p.kind === 'alliance' ? '同盟' : '停戰（一年）';
        SND.event();
        // 選單直接跳出，不等下方訊息被點掉（否則沒點訊息就會卡住）
        say(S.generals[f.ruler] || null, `${f.name}派使者前來，提議兩家${label}。`);
        menuWin(`${f.name}派使者前來，提議兩家${label}`, [
          { label: '接受', act: () => { popWin(); say(null, TK.Diplomacy.respond(S, p, true)); render(); next(); } },
          { label: '拒絕', act: () => { popWin(); say(null, TK.Diplomacy.respond(S, p, false)); render(); next(); } },
        ], null, { center: true, width: 520, shade: true });
      };
      next();
    });
  }

  // ---------- 換月 ----------
  function banner() {
    const b = $('banner');
    b.replaceChildren(h('div', { class: 'win' }, h('div', { class: 'y' }, `${E.yearText(S.year)}年`), h('div', { class: 'm' }, `${MONTHS[S.month - 1]}・${SEASON(S.month)}`)));
    b.classList.remove('hidden');
    SND.month();
    return wait(1400).then(() => b.classList.add('hidden'));
  }

  function advisor() {
    const st = E.strategistOf(S, S.player);
    if (st) return st;
    const gens = Object.values(S.generals).filter((g) => g.faction === S.player && g.status === 'active' && !g.ruler);
    gens.sort((a, b) => b.int - a.int);
    return gens[0] || S.generals[S.factions[S.player].ruler];
  }

  // 軍師獻策：找出勝算最高的進攻目標與最大的威脅
  function strategistAdvice() {
    const st = E.strategistOf(S, S.player);
    if (!st || !TK.AI.estimate) return [];
    const out = [];
    let best = null;
    for (const c of E.citiesOf(S, S.player)) {
      if (!E.officers(S, c.id).length || c.troops < 3000) continue;
      for (const n of E.neighbors(S, c.id)) {
        const t = S.cities[n];
        if (t.owner === S.player || (t.owner && !TK.Diplomacy.canAttack(S, S.player, t.owner))) continue;
        const r = TK.AI.estimate(S, c, c.troops * 0.85, t);
        if (!best || r > best.r) best = { r, from: c, t };
      }
    }
    // 智略越高，判斷越準：低智略的軍師估計會有偏差
    const fuzz = (r) => r * (1 + (100 - st.int) / 250 * (S.month % 2 ? 1 : -1));
    if (best) {
      const r = fuzz(best.r);
      const owner = best.t.owner ? E.factionName(S, best.t.owner) : '無主的';
      if (r >= 1.25) out.push(`依在下之見，${owner}${best.t.name}可取。自${best.from.name}出兵，${oddsText(r)}。`);
      else out.push(`眼下沒有十足把握的目標。最好的是${best.t.name}（${oddsText(r)}），不妨先從鄰城移兵到${best.from.name}集結。`);
    }
    return out;
  }
  function oddsText(r) {
    return r >= 1.6 ? '勝算極大' : r >= 1.25 ? '約有七成勝算' : r >= 1.05 ? '勝負五五波' : r >= 0.85 ? '勝算偏低' : '幾無勝算';
  }

  function tips() {
    const out = strategistAdvice();
    const mine = E.citiesOf(S, S.player);
    if (S.month === 8) out.push('秋收已過，各城的糧倉都充實了。');
    for (const c of mine) {
      if (c.troops > 0 && c.food < c.troops / TK.TUNING.economy.foodPer * 3) { out.push(`${c.name}的糧食只夠撐三個月，請盡快運糧或開墾。`); break; }
    }
    for (const c of mine) {
      if (E.goldIncome(c, S) < E.upkeep(c) && c.gold < E.upkeep(c) * 6) { out.push(`${c.name}的軍餉比收入還多，金庫快見底了。發展商業，或把兵移到別城吧。`); break; }
    }
    let warned = false;
    for (const c of mine) {
      for (const n of E.neighbors(S, c.id)) {
        const o = S.cities[n];
        if (!warned && o.owner && o.owner !== S.player && (!TK.Diplomacy || TK.Diplomacy.canAttack(S, o.owner, S.player)) && o.troops > c.troops * 1.5 && o.troops > 8000) {
          out.push(`${E.factionName(S, o.owner)}在${o.name}屯兵${fmtW(o.troops)}，${c.name}恐有危險。`);
          warned = true;
        }
      }
    }
    for (const c of mine) {
      const free = E.generalsIn(S, c.id, (g) => g.status === 'free' && !g.hidden);
      if (free.length) { out.push(`${c.name}有在野人才${free[0].name}，不妨派人登用。`); break; }
    }
    if (!out.length) out.push(['主公，請下令。', '天下局勢瞬息萬變，不可大意。', '兵貴神速，若有良機，當一鼓作氣。', '百姓安居，方能長治久安。'][S.month % 4]);
    return out.slice(0, 2);
  }

  async function endMonth() {
    if (busy || S.over) return;
    busy = true;
    closeAll();
    renderCmd();
    const battles = [];
    E.onBattle = (r) => { if (r.atk.faction === S.player || r.def.faction === S.player) battles.push(r); };
    let fired = [];
    try { fired = E.endTurn(S) || []; } finally { E.onBattle = null; }
    store(AUTO_KEY, JSON.stringify(S));
    if (S.cities[selected].owner !== S.player) {
      const c = E.citiesOf(S, S.player)[0];
      if (c) selected = c.id;
    }
    render();
    await banner();
    for (const r of battles.slice(0, 3)) await playBattle(r);
    if (battles.length > 3) say(null, `另有 ${battles.length - 3} 場戰事，詳見記錄。`);
    await playEvents(fired);
    if (!S.over) await proposals();
    busy = false;
    render();
    if (checkOver()) return;
    const adv = advisor();
    for (const t of tips()) say(adv, t);
  }

  function checkOver() {
    if (!S.over) return false;
    const win = S.over.result === 'win';
    if (win) SND.win(); else SND.lose();
    const ruler = S.generals[S.factions[S.player].ruler];
    say(ruler, win ? '天下終於平定了。從今以後，百姓可以安居樂業了。' : '……大勢已去。只恨未能完成大業。');
    menuWin(win ? '天下統一' : '勢力覆滅', [{ label: '回到標題', act: showTitle }, { label: '查看地圖', act: () => popWin() }], null, { center: true, width: 440, shade: true });
    return true;
  }

  // ---------- 戰鬥 ----------

  // ---------- 一騎討動畫：兩名武將立繪互相衝刺出招，體力條遞減，敗者倒下 ----------
  function playDuel(el, f, timers) {
    const later = (ms, fn) => timers.push(setTimeout(fn, ms));
    const ga = S.generals[f.duel[0]], gd = S.generals[f.duel[1]];
    const fighter = (g, right) => {
      const hp = h('div', { class: 'dhp-fill', style: `background:${color(g.faction)}` });
      const body = h('div', { class: 'dbody' }, face(g, 'full', 0, 0, 'dface'));
      const root = h('div', { class: 'fighter' + (right ? ' right' : '') },
        h('div', { class: 'dname' }, g.name, h('small', {}, `武${g.war}`)), h('div', { class: 'dhp' }, hp), body);
      return { root, body, hp };
    };
    const A = fighter(ga, false), D = fighter(gd, true);
    const fx = h('div', { class: 'dfx' });
    const caption = h('div', { class: 'dcap' }, '一騎討');
    el.replaceChildren(caption, h('div', { class: 'arena' }, A.root, fx, D.root));
    el.classList.remove('hidden');
    SND.march();
    const STEP = 620;
    let t = 900;
    f.bouts.forEach((b) => {
      later(t, () => {
        const atk = b.who === 'a' ? A : D, def = b.who === 'a' ? D : A;
        atk.body.classList.remove('lunge'); void atk.body.offsetWidth; atk.body.classList.add('lunge');
        later(230, () => {
          def.body.classList.remove('hit', 'dodge'); void def.body.offsetWidth;
          const pop = h('div', { class: 'dpop' + (b.dmg ? '' : ' miss') + (b.crit ? ' crit' : ''), style: b.who === 'a' ? 'right:22%' : 'left:22%' },
            b.dmg ? (b.crit ? `會心 -${b.dmg}` : `-${b.dmg}`) : '閃');
          fx.append(pop);
          later(800, () => pop.remove());
          if (b.dmg) { def.body.classList.add('hit'); SND.clash(); if (b.crit) later(90, SND.clash); }
          else { def.body.classList.add('dodge'); SND.cursor(); }
          A.hp.style.width = b.hpA + '%';
          D.hp.style.width = b.hpD + '%';
        });
      });
      t += STEP;
    });
    later(t + 150, () => {
      const win = f.winner === 'a' ? A : D, lose = f.winner === 'a' ? D : A;
      lose.root.classList.add('down');
      win.root.classList.add('victor');
      caption.textContent = `${S.generals[f.duel[f.winner === 'a' ? 0 : 1]].name} 勝！`;
      SND.win();
    });
    later(t + 1700, () => el.classList.add('hidden'));
    return t + 1800;
  }

  // 戰場背景依城市地形選擇
  const BATTLE_RIVER = ['江陵', '長沙', '吳', '會稽', '壽春', '陳', '蘭陵', '江州', '即墨'];
  const BATTLE_MOUNTAIN = ['南鄭', '隴西', '成都', '上黨', '長平', '晉陽', '代', '函谷', '上郡', '雍'];

  function playBattle(r, live) {
    return new Promise((resolve) => {
      closeAll();
      if (TK.Music) TK.Music.play('battle');
      const aCol = color(r.atk.faction), dCol = color(r.def.faction);
      const side = (info, right) => {
        const g = S.generals[info.commander];
        const num = h('div', { class: 'troops' }, fmt(info.troops));
        const bar = h('div', { style: `width:100%;background:${right ? dCol : aCol}` });
        const mix = h('div', { class: 'mixline' }, ...UK.filter((k) => (info.units || {})[k] > 0).map((k) =>
          h('span', { class: 'chip' }, svgNode(TK.Icons.unit(k, right ? dCol : aCol)), fmtW(info.units[k]))));
        const el = h('div', { class: 'side' + (right ? ' right' : '') }, g ? face(g, 'head', 36, 36) : h('div', { class: 'face guard', style: `--c:${dCol}` }, '守'),
          h('div', { style: 'flex:1' }, h('div', { class: 'hi' }, `${info.name}${right ? '（守）' : '（攻）'}`), h('div', { class: 'dim' }, info.generals.length ? info.generals.join('・') : '守軍'), mix, num, h('div', { class: 'hp' }, bar)));
        return { el, num, bar };
      };
      const A = side(r.atk, false), D = side(r.def, true);
      const resultEl = h('div', { class: 'stamp hidden' });
      const duelArt = (TK.SCENE_FILES || {})[(r.city || '').length % 2 ? 'duel_dusk' : 'duel_day'] || (TK.SCENE_FILES || {}).duel_day;
      const duelEl = h('div', { class: 'duel hidden' + (duelArt ? ' art' : ''), style: duelArt ? `--duel-bg:url("${duelArt}")` : '' });
      const duelTimers = [];
      const evEl = h('div', { class: 'bevent' });
      // 戰場：雙方士兵（騎兵在前、槍兵居中、弩兵在後），守方背後是城牆
      const big = Math.max(r.atk.troops, r.def.troops, 1);
      const army = (info, right, col) => {
        const n = Math.max(5, Math.round(32 * info.troops / big));
        const cnt = E.scaleMix(info.units || { spear: info.troops }, n);
        const list = [];
        for (const k of ['cav', 'spear', 'xbow']) for (let i = 0; i < cnt[k]; i++) list.push(k);
        const units = list.map((k, i) => {
          // 有 sprite sheet（sprites/sprites.json）就用動畫圖，否則用程式畫的士兵
          const sp = TK.Sprite && TK.Sprite.make(k, col, right);
          if (sp) return sp;
          const u = svgNode(TK.Icons.unit(k, col, { flip: right, cls: `u u-${k} march` }));
          u.style.animationDelay = `${(i % 5) * 0.12}s`;
          return u;
        });
        const wrap = h('div', { class: 'units' + (right ? ' right' : '') }, ...(right ? units.slice().reverse() : units));
        return { wrap, units, n: units.length };
      };
      const UA = army(r.atk, false, aCol), UD = army(r.def, true, dCol);
      const fx = h('div', { class: 'bfx' });
      // 戰場插圖（scenes/field_*.jpg、wall*.png；沒有時用 CSS 畫的背景）
      const art = TK.SCENE_FILES || {};
      const cityObj = S.cities[r.city];
      const terrain = [12, 1, 2].includes(S.month) ? 'snow' : BATTLE_RIVER.includes(r.city) ? 'river' : BATTLE_MOUNTAIN.includes(r.city) ? 'mountain' : 'plain';
      const fieldArt = art['field_' + terrain] || art.field_plain;
      const wallArt = cityObj && cityObj.defense < 300 ? (art.wall_damaged || art.wall) : art.wall;
      const wall = h('div', { class: 'bwall' + (wallArt ? ' art' : '') }, wallArt ? h('img', { src: wallArt, alt: '' }) : null,
        h('span', { class: 'bflag', style: `background:${r.def.faction ? dCol : '#8a7a5c'}` }, r.def.faction ? S.factions[r.def.faction].name.slice(-1) : '守'));
      const field = h('div', { class: 'battlefield' + (fieldArt ? ' art' : '') + (wallArt ? ' walled' : ''), style: fieldArt ? `background-image:url("${fieldArt}")` : '' }, h('div', { class: 'bsky' }), wall, UA.wrap, UD.wrap, fx);
      const box = h('div', { class: 'win battle' }, h('h3', { class: 'btitle' }, `${r.city || ''}攻防戰`), h('div', { class: 'top' }, A.el, h('div', { class: 'vs' }, '對'), D.el), field, evEl, resultEl, duelEl,
        h('div', { class: 'info', style: 'text-align:right' }, '點一下或 Enter：略過'));
      const shade = h('div', { class: 'shade' });
      $('layer').append(shade, box);
      box.addEventListener('click', () => { if (!done && !awaiting) finish(); });

      const apply = (f) => {
        const setSide = (U, cur, init, ui) => {
          const alive = init > 0 ? Math.ceil(U.n * cur / init) : 0;
          U.units.forEach((u, i) => {
            const fall = i >= alive;
            if (fall && !u.classList.contains('fallen') && u.dataset.k && TK.Sprite) TK.Sprite.die(u);
            u.classList.toggle('fallen', fall);
          });
          ui.num.textContent = fmt(cur);
          ui.bar.style.width = `${init ? Math.max(0, 100 * cur / init) : 0}%`;
        };
        setSide(UA, f.a, r.atk.troops, A);
        setSide(UD, f.d, r.def.troops, D);
      };
      const hit = (U) => { U.wrap.classList.remove('hit'); void U.wrap.offsetWidth; U.wrap.classList.add('hit'); };
      const volley = (dir) => {
        for (let k = 0; k < 12; k++) {
          const ar = h('i', { class: 'arrow ' + (dir > 0 ? 'r' : 'l'), style: `top:${18 + Math.random() * 62}%;animation-delay:${Math.random() * 0.25}s` });
          fx.append(ar);
          setTimeout(() => ar.remove(), 1000);
        }
      };
      const flashEv = (t) => { evEl.textContent = t; evEl.classList.remove('flash'); void evEl.offsetWidth; evEl.classList.add('flash'); };
      let advance = 0;

      let i = 1, done = false, timer = null, awaiting = false;
      // 手動指揮：每一段（最多 4 回合）開始前下指令
      const orderBar = h('div', { class: 'orders hidden' });
      box.insertBefore(orderBar, resultEl);
      const endLive = () => { if (live && !r.result) Object.assign(r, E.battleEnd(S, live)); };
      const runPhase = (order) => {
        awaiting = false;
        orderBar.classList.add('hidden');
        SND.ok();
        for (let k = 0; k < TK.TUNING.battle.phaseRounds && !live.result; k++) {
          const o = k === 0 ? order : (order === 'assault' || order === 'hold' ? order : 'normal');
          E.battleRound(S, live, o);
          if (o === 'retreat') break;
        }
        timer = setTimeout(step, 150);
      };
      const showOrders = () => {
        awaiting = true;
        const A0 = live.A0, cur = live.A.troops, foe = live.D.troops;
        const opts = ['normal', 'assault', 'hold', 'scheme', ...(live.round === 0 && live.canDuel ? ['duel'] : []), 'retreat'];
        orderBar.replaceChildren(
          h('div', { class: 'otitle' }, live.round === 0 ? '開戰！請下令' : `第 ${live.round} 回合　我軍 ${fmt(cur)}（${Math.round(100 * cur / A0)}%）・敵軍 ${fmt(foe)}`),
          h('div', { class: 'obtns' }, ...opts.map((k) => h('button', {
            class: 'obtn o-' + k, title: E.ORDERS[k].desc,
            onclick: (e) => { e.stopPropagation(); runPhase(k); },
          }, h('b', {}, k === 'duel' ? `${E.ORDERS[k].label}（${live.ahero.name}）` : E.ORDERS[k].label), h('small', {}, E.ORDERS[k].desc)))),
          h('button', { class: 'oauto', onclick: (e) => { e.stopPropagation(); finish(); } }, '交給部將（自動打完）'));
        orderBar.classList.remove('hidden');
      };
      const close = () => {
        clearTimeout(timer);
        battleKey = null;
        if (TK.Music) TK.Music.play('domestic');
        box.remove(); shade.remove();
        resolve();
      };
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        duelTimers.forEach(clearTimeout);
        duelEl.classList.add('hidden');
        orderBar.classList.add('hidden');
        if (live) { while (!live.result) E.battleRound(S, live, 'normal'); endLive(); }
        apply(r.frames[r.frames.length - 1]);
        const me = S.player, atkWon = r.result === 'win';
        let text, good = true;
        if (r.atk.faction === me) { text = atkWon ? '勝利' : r.retreated ? '撤退' : '敗退'; good = atkWon; }
        else if (r.def.faction === me) { text = atkWon ? '失守' : '守住'; good = !atkWon; }
        else text = atkWon ? '攻陷' : '擊退';
        resultEl.textContent = text;
        resultEl.className = 'stamp ' + (good ? 'win' : 'lose');
        flashEv(r.summary);
        if (good) SND.win(); else SND.lose();
        const extra = r.lines.filter((l) => /被俘|逃往|獲救/.test(l)).slice(0, 3).join('　');
        say(null, r.summary + (extra ? `\n${extra}` : ''));
        battleKey = (e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { close(); return true; } return false; };
        setTimeout(() => box.addEventListener('click', close), 200);
      };
      const step = () => {
        if (done) return;
        if (i >= r.frames.length) {
          if (live && !live.result) { showOrders(); return; }
          finish();
          return;
        }
        const prev = r.frames[i - 1], f = r.frames[i];
        apply(f);
        if (f.a < prev.a) hit(UA);
        if (f.d < prev.d) hit(UD);
        // sprite 士兵：造成傷害的一方揮兵器
        if (TK.Sprite) {
          if (f.d < prev.d) UA.units.forEach((u) => TK.Sprite.attack(u, Math.random() * 220));
          if (f.a < prev.a) UD.units.forEach((u) => TK.Sprite.attack(u, Math.random() * 220));
        }
        const fw = field.clientWidth || 1160;
        advance = Math.min(advance + fw * 0.012, fw * 0.13);
        UA.wrap.style.transform = `translateX(${advance}px)`;
        let delay = 520;
        if (f.kind === 'duel') {
          say(null, `單挑！${f.ev}`);
          delay = playDuel(duelEl, f, duelTimers) + 300;
        } else {
          if (/volley/.test(f.kind || '')) {
            SND.volley();
            volley(f.kind === 'volley-d' ? -1 : 1);
          } else if (i % 2) SND.drum(); else SND.clash();
          if (f.ev) { say(null, f.ev); flashEv(f.ev); delay = 950; }
        }
        i++;
        timer = setTimeout(step, delay);
      };
      battleKey = (e) => {
        if (awaiting) {
          const keys = { 1: 'normal', 2: 'assault', 3: 'hold', 4: 'scheme', 5: 'duel', 6: 'retreat' };
          if (keys[e.key] && (keys[e.key] !== 'duel' || (live.round === 0 && live.canDuel))) { runPhase(keys[e.key]); return true; }
          if (e.key === 'Enter' || e.key === ' ') { runPhase('normal'); return true; }
          return false;
        }
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { finish(); return true; }
        return false;
      };
      apply(r.frames[0]);
      say(null, r.lines[0]);
      timer = setTimeout(step, live ? 300 : 900);
    });
  }

  // ---------- 綁定 ----------
  function bind() {
    // 音訊的建立與喚醒在 js/audio.js；這裡只確保音樂在使用者操作後開始
    const unlock = () => { if (TK.Music) TK.Music.unlock(); };
    for (const ev of ['click', 'touchend', 'keydown']) document.addEventListener(ev, unlock);
    fit();
    addEventListener('resize', fit);
    const map = $('map');
    map.addEventListener('click', (e) => {
      if (!S || stack.length || battleKey) return;
      const id = MV.cityAt(S, map, e.clientX, e.clientY);
      if (id) selectCity(id);
    });
    map.addEventListener('mousemove', (e) => {
      if (!S) return;
      const id = MV.cityAt(S, map, e.clientX, e.clientY);
      if (id !== hovered) { hovered = id; map.style.cursor = id ? 'pointer' : 'default'; renderStatus(); renderMap(); }
    });
    $('msg-win').addEventListener('click', advanceMsg);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && S && !$('game').classList.contains('hidden') && !stack.length && !battleKey) {
        e.preventDefault();
        const list = e.altKey ? Object.values(S.cities) : E.citiesOf(S, S.player);
        if (!list.length) return;
        const idx = list.findIndex((c) => c.id === selected);
        selectCity(list[(idx + (e.shiftKey ? -1 : 1) + list.length) % list.length].id);
      }
    });
    setInterval(() => { blink = !blink; if (S && !$('game').classList.contains('hidden')) renderMap(); }, 450);
    // 首次互動時播放標題音樂（瀏覽器限制自動播放）
    let played = false;
    const firstPlay = () => { if (!played && !S) { played = true; SND.title(); } };
    addEventListener('pointerdown', firstPlay, { once: true });
    addEventListener('keydown', firstPlay, { once: true });
  }

  bind();
  // 供自動測試直接播放戰鬥畫面
  TK.UI = { playBattle, state: () => S };
  const start = () => showTitle();
  if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('24px Kai'), document.fonts.load('16px Body')]).then(start, start);
  else start();
})(globalThis.TK = globalThis.TK || {});
