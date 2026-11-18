/* 三國一騎討：畫面與操作（手機直向優先，全部可用點按操作）。 */
(function (TK) {
  'use strict';
  const D = TK.Duel, R = TK.ROSTER, SND = TK.Sound;
  const app = document.getElementById('app');
  const byName = Object.fromEntries(R.map((g) => [g.name, g]));
  const RANK = Object.fromEntries(D.ranking(R).map((g, i) => [g.name, i + 1]));
  const START = ['關羽', '張飛', '趙雲', '夏侯惇', '孫策', '太史慈', '黃忠', '諸葛亮'];
  const STAGES = 10;

  // ---------- 小工具 ----------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : String(c));
    return el;
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms * speed));
  let speed = 1;
  const imgCache = new Map();
  // mode：'head' 頭像、'full' 半身、'cut' 去背半身（戰鬥與對峙畫面）
  function portraitURL(g, mode) {
    const key = g.name + mode;
    const look = mode === 'cut' ? Object.assign({}, g.look, { noBg: true }) : g.look;
    if (!imgCache.has(key)) imgCache.set(key, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(TK.Anime.svg(g, g.color, mode === 'cut' ? 'full' : mode, look)));
    return imgCache.get(key);
  }
  const face = (g, mode, cls) => h('img', { class: 'pt ' + (cls || ''), src: portraitURL(g, mode || 'head'), alt: g.name, draggable: 'false' });
  function btn(label, on, cls, sub) {
    return h('button', { class: 'btn ' + (cls || ''), onclick: (e) => { SND.ok(); on(e); } }, h('span', {}, label), sub ? h('small', {}, sub) : null);
  }
  function screen(cls, ...kids) { app.replaceChildren(h('div', { class: 'screen ' + cls }, ...kids)); window.scrollTo(0, 0); }

  // ---------- 存檔 ----------
  const KEY = 'yiqitao.save.v1';
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    s = s || {};
    s.unlocked = Array.isArray(s.unlocked) ? s.unlocked.filter((n) => byName[n]) : [];
    START.forEach((n) => { if (!s.unlocked.includes(n)) s.unlocked.push(n); });
    s.cleared = s.cleared || {};
    return s;
  }
  let save = load();
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* 無法存檔時照常遊玩 */ } }
  const unlocked = (g) => save.unlocked.includes(g.name);

  // ---------- 標題 ----------
  function title() {
    const a = byName['關羽'], b = byName['呂布'];
    screen('title',
      h('div', { class: 'logo' }, h('div', { class: 'logo-sub' }, '三國'), h('div', { class: 'logo-main' }, '一騎討')),
      h('div', { class: 'title-vs' }, face(a, 'cut', 'tl'), h('div', { class: 'tvs' }, '對'), face(b, 'cut', 'tr')),
      h('div', { class: 'menu' },
        btn('過關挑戰', () => pick('arcade'), 'primary', '連破十將，最後迎戰天下第一'),
        btn('雙人對戰', () => pick('vs'), '', '同一支手機，兩人輪流出招'),
        btn('武將排名', () => gallery(), '', '100 位武將的武力排行與必殺技'),
        btn('玩法說明', () => help(), '')),
      h('div', { class: 'foot' },
        h('button', { class: 'chip', onclick: (e) => { const m = SND.toggle(); e.currentTarget.textContent = m ? '音效：關' : '音效：開'; } }, SND.isMuted() ? '音效：關' : '音效：開'),
        h('span', {}, `已解鎖 ${save.unlocked.length}／${R.length}`)));
  }

  function help() {
    const M = D.MOVES;
    screen('help',
      header('玩法說明', title),
      h('div', { class: 'paper' },
        h('p', {}, '每回合雙方同時出招，三招互相剋制：'),
        h('div', { class: 'rps' }, ...['atk', 'tech', 'guard'].map((k) => h('div', { class: 'rps-i' }, h('b', {}, M[k].icon), M[k].name, h('small', {}, M[k].desc)))),
        h('ul', {},
          h('li', {}, '猛攻 剋 技巧、技巧 剋 架擋、架擋 剋 猛攻（反擊）。同招互拚則兩敗俱傷。'),
          h('li', {}, '蓄氣：氣力＋1，但這回合毫無防備，被打會受到加重傷害。'),
          h('li', {}, '出招命中也會累積氣力。氣力集滿 3 格（黃忠只要 2 格）可發動必殺技。'),
          h('li', {}, '必殺技無法閃避，只有「架擋」能把傷害減半。看到對手氣力滿了，要小心！'),
          h('li', {}, '武力決定攻擊力，統率決定體力與防禦，智力越高越容易「看穿」對手的下一招。'),
          h('li', {}, '過關挑戰中擊敗的武將會解鎖，之後可以選用。'))),
      h('div', { class: 'menu' }, btn('返回', title)));
  }

  function header(text, back, extra) {
    return h('div', { class: 'bar' }, h('button', { class: 'back', onclick: () => { SND.cancel(); back(); } }, '‹'), h('div', { class: 'bar-t' }, text), extra || h('span'));
  }

  // ---------- 武將排名 ----------
  function gallery(sortKey) {
    sortKey = sortKey || 'war';
    const list = D.ranking(R, sortKey);
    const tabs = h('div', { class: 'tabs' }, ...[['war', '武力'], ['lead', '統率'], ['int', '智力']].map(([k, l]) =>
      h('button', { class: 'tab' + (k === sortKey ? ' on' : ''), onclick: () => { SND.cursor(); gallery(k); } }, l)));
    screen('gallery', header('武將排名', title), tabs,
      h('div', { class: 'rank-list' }, ...list.map((g, i) => h('div', { class: 'rank-row' + (i < 10 ? ' top' : ''), onclick: () => detail(g, null) },
        h('div', { class: 'rk' }, i + 1), face(g, 'head'),
        h('div', { class: 'rk-n' }, h('b', {}, g.name, unlocked(g) ? null : h('i', { class: 'lock' }, '未解鎖')), h('small', {}, `${g.sp}・${D.SP_TYPES[g.type].label}`)),
        h('div', { class: 'rk-s' }, statCell('武', g.war, sortKey === 'war'), statCell('統', g.lead, sortKey === 'lead'), statCell('智', g.int, sortKey === 'int'))))));
  }
  const statCell = (l, v, on) => h('div', { class: 'sc' + (on ? ' on' : '') }, h('small', {}, l), v);

  // 武將詳情（底部彈出）
  function detail(g, onPick, pickLabel) {
    SND.cursor();
    const close = () => sheet.remove();
    const sp = D.SP_TYPES[g.type];
    const bar = (l, v, c) => h('div', { class: 'stat' }, h('span', {}, l), h('div', { class: 'track' }, h('div', { style: `width:${v}%;background:${c}` })), h('b', {}, v));
    const can = unlocked(g);
    const sheet = h('div', { class: 'sheet-wrap', onclick: (e) => { if (e.target === sheet) close(); } },
      h('div', { class: 'sheet' },
        h('div', { class: 'sh-top' },
          h('div', { class: 'sh-pt', style: `--c:${g.color}` }, face(g, 'full')),
          h('div', { class: 'sh-info' },
            h('div', { class: 'sh-rank' }, `武力第 ${RANK[g.name]} 名`),
            h('div', { class: 'sh-name' }, g.name, g.look.title ? h('small', {}, g.look.title) : null),
            bar('武力', g.war, '#c0392b'), bar('統率', g.lead, '#2f6db0'), bar('智力', g.int, '#7b4fb0'),
            h('div', { class: 'sh-sp' }, h('b', {}, `必殺・${g.sp}`), h('small', {}, `${sp.label}：${sp.desc}`)))),
        h('div', { class: 'sh-btns' },
          btn('關閉', close, 'ghost'),
          onPick ? (can ? btn(pickLabel || '出陣', () => { close(); onPick(g); }, 'primary') : h('div', { class: 'locked-note' }, '在過關挑戰中擊敗他即可解鎖')) : null)));
    app.append(sheet);
  }

  // ---------- 選將 ----------
  function pick(mode, p1) {
    const title2 = mode === 'arcade' ? '選擇武將' : (p1 ? '玩家二 選擇武將' : '玩家一 選擇武將');
    const list = D.ranking(R);
    const cards = list.map((g) => {
      const can = unlocked(g);
      return h('div', { class: 'card' + (can ? '' : ' locked') + (p1 && p1.name === g.name ? ' taken' : ''), style: `--c:${g.color}`,
        onclick: () => detail(g, (sel) => {
          if (mode === 'arcade') arcadeStart(sel);
          else if (!p1) pick('vs', sel);
          else versus({ mode: 'vs', p1, p2: sel });
        }, mode === 'arcade' ? '出陣' : '決定') },
      face(g, 'head'), h('div', { class: 'cn' }, can ? g.name : '？？'), h('div', { class: 'cw' }, `武${g.war}`));
    });
    screen('pick', header(title2, p1 ? () => pick('vs') : title, h('span', { class: 'bar-r' }, `${save.unlocked.length}/${R.length}`)),
      h('div', { class: 'grid' }, ...cards));
  }

  // ---------- 過關 ----------
  let run = null;
  function arcadeStart(g) {
    run = { player: g, stage: 0, ladder: D.ladder(R, g.name) };
    ladderView();
  }
  function ladderView() {
    const { player, stage, ladder } = run;
    screen('ladder', header('過關挑戰', title),
      h('div', { class: 'ld-me' }, face(player, 'head'), h('div', {}, h('b', {}, player.name), h('small', {}, `必殺・${player.sp}`))),
      h('div', { class: 'ld-list' }, ...ladder.map((g, i) => h('div', { class: 'ld-row' + (i < stage ? ' done' : i === stage ? ' now' : '') },
        h('div', { class: 'ld-no' }, i === STAGES - 1 ? '終' : i + 1),
        i <= stage ? face(g, 'head') : h('div', { class: 'pt q' }, '？'),
        h('div', { class: 'ld-n' }, i <= stage ? g.name : '？？？', i <= stage ? h('small', {}, `武${g.war}`) : null),
        h('div', { class: 'ld-st' }, i < stage ? '勝' : i === stage ? '下一戰' : '')))),
      h('div', { class: 'menu' }, btn(`第 ${stage + 1} 戰・開戰`, () => versus({ mode: 'arcade', p1: player, p2: ladder[stage], stage }), 'primary')));
  }

  // ---------- 對戰前的對峙畫面 ----------
  async function versus(ctx) {
    screen('versus',
      h('div', { class: 'vs-side top', style: `--c:${ctx.p2.color}` }, face(ctx.p2, 'cut'), h('div', { class: 'vs-name' }, ctx.p2.name, h('small', {}, ctx.mode === 'vs' ? '玩家二' : `武${ctx.p2.war}`))),
      h('div', { class: 'vs-mid' }, ctx.mode === 'arcade' ? (ctx.stage === STAGES - 1 ? '最終戰' : `第 ${ctx.stage + 1} 戰`) : '對戰', h('b', {}, '一騎討')),
      h('div', { class: 'vs-side bot', style: `--c:${ctx.p1.color}` }, face(ctx.p1, 'cut'), h('div', { class: 'vs-name' }, ctx.p1.name, h('small', {}, ctx.mode === 'vs' ? '玩家一' : '你'))));
    SND.march();
    await wait(1600);
    fight(ctx);
  }

  // ---------- 戰鬥 ----------
  function fight(ctx) {
    const m = D.newMatch(ctx.p1, ctx.p2);
    const level = ctx.mode === 'arcade' ? ctx.stage + 1 : 0;
    const two = ctx.mode === 'vs';
    const hud = (k, g) => {
      const hp = h('div', { class: 'hp-fill', style: `background:${g.color}` });
      const hpTxt = h('span', { class: 'hp-t' });
      const pips = h('div', { class: 'pips' }, ...Array.from({ length: D.MAX_EN }, (_, i) => h('i', { class: i >= D.cost(g) ? 'x' : '' })));
      const st = h('span', { class: 'st' });
      const el = h('div', { class: 'hud ' + k },
        h('div', { class: 'hud-n' }, h('b', {}, g.name), h('small', {}, two ? (k === 'a' ? '玩家一' : '玩家二') : (k === 'a' ? '你' : `武${g.war}`)), st),
        h('div', { class: 'hp' }, hp, hpTxt), pips);
      return { el, hp, hpTxt, pips, st };
    };
    const H = { a: hud('a', ctx.p1), b: hud('b', ctx.p2) };
    const mk = (k, g) => {
      const body = h('div', { class: 'body' }, face(g, 'cut'));
      const bubble = h('div', { class: 'bubble' });
      const root = h('div', { class: 'ftr ' + k, style: `--c:${g.color}` }, bubble, body, h('div', { class: 'shadow' }));
      return { root, body, bubble };
    };
    const FT = { a: mk('a', ctx.p1), b: mk('b', ctx.p2) };
    const fx = h('div', { class: 'fx' });
    const banner = h('div', { class: 'banner hidden' });
    const arena = h('div', { class: 'arena' }, FT.b.root, FT.a.root, fx, banner);
    const hintEl = h('div', { class: 'hint' });
    const turnEl = h('div', { class: 'turn-who' });
    const moveBtns = {};
    for (const k of ['atk', 'tech', 'guard', 'charge']) {
      const M = D.MOVES[k];
      moveBtns[k] = h('button', { class: 'mv mv-' + k, onclick: () => choose(k) }, h('b', {}, M.icon), h('span', {}, M.name), h('small', {}, M.desc));
    }
    moveBtns.special = h('button', { class: 'mv mv-sp', onclick: () => choose('special') }, h('span', { class: 'sp-n' }), h('small', { class: 'sp-d' }));
    const pad = h('div', { class: 'pad' }, turnEl, h('div', { class: 'mv-grid' }, moveBtns.atk, moveBtns.tech, moveBtns.guard, moveBtns.charge), moveBtns.special);
    const skip = h('button', { class: 'chip ff', onclick: () => { speed = speed === 1 ? 0.45 : 1; skip.textContent = speed === 1 ? '▶▶ 快轉' : '▶ 正常'; } }, speed === 1 ? '▶▶ 快轉' : '▶ 正常');
    const quit = h('button', { class: 'chip', onclick: () => { if (confirm('放棄這場對戰？')) title(); } }, '離開');
    screen('fight' + (two ? ' two' : ''),
      h('div', { class: 'fbar' }, quit, h('div', { class: 'fbar-t' }, two ? '雙人對戰' : (ctx.stage === STAGES - 1 ? '最終戰' : `第 ${ctx.stage + 1}／${STAGES} 戰`)), skip),
      H.b.el, arena, H.a.el, hintEl, pad);

    let shownHp = { a: m.a.hp, b: m.b.hp };
    function drawHud(k) {
      const f = m[k], hd = H[k];
      hd.hp.style.width = (100 * shownHp[k] / f.maxHp) + '%';
      hd.hpTxt.textContent = `${shownHp[k]}／${f.maxHp}`;
      [...hd.pips.children].forEach((p, i) => p.classList.toggle('on', i < f.en));
      hd.el.classList.toggle('full', D.canSpecial(f));
      hd.st.textContent = f.stun > 0 ? '暈眩' : '';
    }
    const drawAll = () => { drawHud('a'); drawHud('b'); };

    let side = 'a';          // 雙人模式：目前出招者
    let pending = {};         // 已決定的招式
    let foeMove = null;
    let busy = false;
    function setPad(k) {
      const f = m[k];
      const g = f.g;
      moveBtns.special.querySelector('.sp-n').textContent = `必殺・${g.sp}`;
      moveBtns.special.querySelector('.sp-d').textContent = D.canSpecial(f) ? `${D.SP_TYPES[g.type].label}：${D.SP_TYPES[g.type].desc}` : `氣力 ${f.en}／${D.cost(g)}`;
      moveBtns.special.disabled = !D.canSpecial(f);
      moveBtns.special.classList.toggle('ready', D.canSpecial(f));
      pad.style.setProperty('--c', g.color);
      turnEl.textContent = two ? `${k === 'a' ? '玩家一' : '玩家二'}（${g.name}）請出招` : '請選擇招式';
      if (f.stun > 0) turnEl.textContent = `${g.name} 暈眩中，本回合無法行動`;
    }
    function startTurn() {
      busy = false;
      pending = {};
      side = 'a';
      pad.classList.remove('locked');
      hintEl.textContent = '';
      hintEl.className = 'hint';
      if (!two) {
        foeMove = D.aiMove(m, 'b', level);
        const hm = m.a.stun > 0 ? null : D.hint(m, 'a', foeMove === 'special' ? 'special' : foeMove);
        if (hm) {
          hintEl.textContent = hm === 'special' ? `看穿！${m.b.g.name}正在凝聚氣勢，準備發動必殺技` : `看穿！${m.b.g.name}似乎想「${D.MOVES[hm].name}」`;
          hintEl.className = 'hint on';
        } else if (D.canSpecial(m.b)) {
          hintEl.textContent = `${m.b.g.name}氣力已滿，小心必殺技！`;
          hintEl.className = 'hint warn';
        }
      }
      setPad('a');
      if (m.a.stun > 0) { setTimeout(() => choose('atk'), 700); }
    }
    function choose(k) {
      if (busy) return;
      SND.cursor();
      if (!two) { busy = true; play(k, foeMove); return; }
      pending[side] = k;
      if (side === 'a') {
        busy = true;
        // 換手：蓋住畫面，讓玩家二看不到玩家一出了什麼
        const cover = h('div', { class: 'cover' }, h('div', {}, h('b', {}, '玩家一已出招'), h('p', {}, '請把手機交給玩家二'),
          btn('玩家二 準備好了', () => { cover.remove(); side = 'b'; busy = false; setPad('b'); if (m.b.stun > 0) setTimeout(() => choose('atk'), 600); }, 'primary')));
        app.append(cover);
      } else { busy = true; play(pending.a, pending.b); }
    }

    async function play(ma, mb) {
      pad.classList.add('locked');
      const before = { a: m.a.hp, b: m.b.hp };
      const r = D.resolve(m, ma, mb);
      shownHp = before;
      // 1. 亮招
      for (const k of ['a', 'b']) {
        const mv = r.moves[k];
        const txt = mv === 'special' ? '必殺' : mv === 'stunned' ? '暈眩' : D.MOVES[mv].name;
        FT[k].bubble.textContent = txt;
        FT[k].bubble.className = 'bubble show mv-' + mv;
      }
      hintEl.textContent = ''; hintEl.className = 'hint';
      await wait(650);
      // 2. 依序播放事件
      for (const e of r.events) await playEvent(e);
      FT.a.bubble.className = 'bubble'; FT.b.bubble.className = 'bubble';
      shownHp = { a: m.a.hp, b: m.b.hp };
      drawAll();
      if (m.over) { await ending(m.over); return; }
      await wait(250);
      startTurn();
    }
    function pop(k, text, cls) {
      const p = h('div', { class: 'pop ' + (cls || '') + ' at-' + k }, text);
      fx.append(p);
      setTimeout(() => p.remove(), 1000);
    }
    function anim(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
    async function playEvent(e) {
      if (e.type === 'special') {
        const g = m[e.who].g;
        banner.replaceChildren(h('small', {}, `${g.name}・必殺`), h('b', {}, g.sp));
        banner.style.setProperty('--c', g.color);
        banner.className = 'banner show ' + e.who;
        arena.classList.add('flash');
        SND.march();
        await wait(1000);
        banner.className = 'banner hidden';
        arena.classList.remove('flash');
        if (e.guarded) { pop(e.who === 'a' ? 'b' : 'a', '架擋！傷害減半', 'info'); await wait(400); }
      } else if (e.type === 'hit') {
        anim(FT[e.who].body, 'lunge');
        await wait(e.sp && e.n != null ? 140 : 200);
        anim(FT[e.to].body, e.big ? 'hit-big' : 'hit');
        shownHp[e.to] = Math.max(0, shownHp[e.to] - e.dmg);
        drawHud(e.to);
        const label = e.counter ? `反擊 -${e.dmg}` : e.open ? `破綻 -${e.dmg}` : `-${e.dmg}`;
        pop(e.to, label, e.big ? 'big' : e.sp ? 'sp' : '');
        SND.clash(); if (e.big) setTimeout(SND.clash, 80);
        if (e.big) anim(arena, 'shake');
        await wait(e.sp && e.n != null ? 300 : 520);
      } else if (e.type === 'clash') {
        anim(FT.a.body, 'lunge'); anim(FT.b.body, 'lunge');
        await wait(180);
        pop('mid', '交鋒！', 'info'); SND.clash(); setTimeout(SND.clash, 90);
        await wait(250);
      } else if (e.type === 'charge') {
        anim(FT[e.who].body, 'aura');
        m[e.who] && drawHud(e.who);
        pop(e.who, '氣力＋1', 'charge'); SND.ok();
        await wait(420);
      } else if (e.type === 'heal') {
        shownHp[e.to] = Math.min(m[e.to].maxHp, shownHp[e.to] + e.amount);
        drawHud(e.to);
        pop(e.to, `+${e.amount}`, 'heal'); SND.event();
        await wait(450);
      } else if (e.type === 'stun') {
        pop(e.to, '暈眩！', 'info');
        await wait(420);
      } else if (e.type === 'idle') {
        pop('mid', e.text, 'info');
        await wait(560);
      }
    }

    async function ending(winner) {
      const loser = winner === 'a' ? 'b' : 'a';
      FT[loser].root.classList.add('down');
      FT[winner].root.classList.add('victor');
      const wg = m[winner].g;
      banner.replaceChildren(h('b', {}, `${wg.name} 勝！`));
      banner.style.setProperty('--c', wg.color);
      banner.className = 'banner show end';
      const won = winner === 'a';
      if (two || won) SND.win(); else SND.lose();
      await wait(1500);
      result(won);
    }
    function result(won) {
      let title2, msg = [], btns = [];
      if (two) {
        title2 = `${m[won ? 'a' : 'b'].g.name} 獲勝`;
        msg.push(won ? '玩家一勝利！' : '玩家二勝利！');
        btns = [btn('再戰一場', () => versus(ctx), 'primary'), btn('重新選將', () => pick('vs')), btn('回標題', title, 'ghost')];
      } else if (won) {
        const foe = ctx.p2;
        if (!save.unlocked.includes(foe.name)) { save.unlocked.push(foe.name); msg.push(`解鎖新武將：${foe.name}`); }
        const best = Math.max(save.cleared[ctx.p1.name] || 0, ctx.stage + 1);
        save.cleared[ctx.p1.name] = best;
        store();
        if (ctx.stage === STAGES - 1) {
          title2 = '天下無敵';
          msg.unshift(`${ctx.p1.name} 連破十將，威震天下！`);
          btns = [btn('再挑戰一次', () => arcadeStart(ctx.p1), 'primary'), btn('換武將', () => pick('arcade')), btn('回標題', title, 'ghost')];
        } else {
          title2 = '勝利';
          msg.unshift(`擊敗了${foe.name}！`);
          run.stage = ctx.stage + 1;
          btns = [btn('下一戰', () => ladderView(), 'primary'), btn('回標題', title, 'ghost')];
        }
      } else {
        title2 = '敗北';
        msg.push(`敗給了${ctx.p2.name}……`, '換個出招節奏再試一次吧。');
        btns = [btn('再戰', () => versus(ctx), 'primary'), btn('回到路線', () => ladderView()), btn('回標題', title, 'ghost')];
      }
      app.append(h('div', { class: 'cover result ' + (won || two ? 'win' : 'lose') },
        h('div', {}, h('b', { class: 'res-t' }, title2), ...msg.map((t) => h('p', {}, t)), h('div', { class: 'menu' }, ...btns))));
    }

    drawAll();
    startTurn();
  }

  // 供自動測試使用
  TK.UI = { title, pick, gallery, fight, versus, arcadeStart, reset() { try { localStorage.removeItem(KEY); } catch (e) { /* 忽略 */ } save = load(); } };
  const start = () => title();
  if (document.fonts && document.fonts.load) document.fonts.load('24px Pixel12').then(start, start);
  else start();
})(globalThis.TK = globalThis.TK || {});
