/* 事件場景背景：全部以 SVG 程式繪製的原創插圖（1280×800）。
 * 種類：palace 宮殿、camp 軍營、garden 桃園、cottage 草廬、field 原野、river 江上、fire 火攻、night 夜營、rain 暴雨洪水、castle 城下。
 * 若 art/scenes/<種類>.jpg 之後有外部插圖，可在 build 時以 TK.SCENE_FILES 覆蓋。 */
(function (TK) {
  'use strict';
  const W = 1280, H = 800;

  // 簡單的可重現亂數，讓同一種場景每次長得一樣
  function rng(seed) { let x = seed >>> 0 || 1; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); }

  const sky = (id, top, bottom) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`;

  function mountains(r, y, color, n, hmin, hmax) {
    let d = `M0 ${H} L0 ${y}`;
    const step = W / n;
    for (let i = 0; i <= n; i++) {
      const x = i * step;
      d += ` L${x - step / 2} ${y - (hmin + r() * (hmax - hmin))} L${x} ${y - r() * hmin * 0.4}`;
    }
    return `<path d="${d} L${W} ${H} Z" fill="${color}"/>`;
  }
  function clouds(r, n, color, ymax) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = 40 + r() * ymax, w = 120 + r() * 220;
      s += `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${18 + r() * 16}" fill="${color}" opacity="${0.35 + r() * 0.35}"/>`;
    }
    return s;
  }
  function banner(x, y, color, ch, h) {
    h = h || 200;
    return `<g><rect x="${x - 3}" y="${y}" width="6" height="${h + 120}" fill="#5e3b20"/><path d="M${x + 3} ${y + 8} h70 v${h * 0.55} l-35 -18 l-35 18 Z" fill="${color}" stroke="rgba(0,0,0,.25)" stroke-width="2"/>`
      + (ch ? `<text x="${x + 38}" y="${y + 8 + h * 0.3}" font-size="40" text-anchor="middle" fill="#fff" font-family="Kai, serif">${ch}</text>` : '') + `</g>`;
  }
  function tent(x, y, s, color) {
    return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-90 0 L0 -110 L90 0 Z" fill="${color}" stroke="#5a4a32" stroke-width="3"/><path d="M-20 0 L0 -60 L20 0 Z" fill="#3a2a1e"/><line x1="0" y1="-110" x2="0" y2="-140" stroke="#5e3b20" stroke-width="4"/><path d="M0 -140 l30 8 l-30 8 Z" fill="#c0392b"/></g>`;
  }
  function wall(y, color) {
    let s = `<rect x="0" y="${y}" width="${W}" height="${H - y}" fill="${color}"/>`;
    for (let x = 0; x < W; x += 48) s += `<rect x="${x}" y="${y - 22}" width="30" height="24" fill="${color}"/>`;
    for (let yy = y + 30; yy < H; yy += 34) s += `<line x1="0" y1="${yy}" x2="${W}" y2="${yy}" stroke="rgba(0,0,0,.15)" stroke-width="2"/>`;
    return s;
  }
  function blossoms(r, n) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = r() * 520, rr = 4 + r() * 7;
      s += `<circle cx="${x}" cy="${y}" r="${rr}" fill="${r() < 0.5 ? '#f7b6c8' : '#fbd3df'}" opacity="${0.6 + r() * 0.4}"/>`;
    }
    return s;
  }
  function waves(y, color, n) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const yy = y + i * 34;
      s += `<path d="M0 ${yy} q40 -14 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0" fill="none" stroke="${color}" stroke-width="3" opacity="${0.5 - i * 0.05}"/>`;
    }
    return s;
  }
  function boat(x, y, s, sail) {
    return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-120 0 Q0 40 120 0 L100 30 Q0 50 -100 30 Z" fill="#6b4423" stroke="#3a2412" stroke-width="3"/><line x1="0" y1="0" x2="0" y2="-170" stroke="#3a2412" stroke-width="6"/><path d="M5 -160 Q70 -100 5 -30 Z" fill="${sail}" stroke="#5a4a32" stroke-width="2"/></g>`;
  }
  function flames(r, n, y0) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = r() * W, h = 80 + r() * 200, w = 30 + r() * 50, y = y0 + r() * 120;
      s += `<path d="M${x - w} ${y} Q${x - w * 0.4} ${y - h * 0.5} ${x} ${y - h} Q${x + w * 0.4} ${y - h * 0.5} ${x + w} ${y} Z" fill="${r() < 0.5 ? '#ff7a1a' : '#ffb02e'}" opacity="${0.6 + r() * 0.35}"/>`;
    }
    return s;
  }
  function rain(r, n) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = r() * (W + 200), y = r() * H;
      s += `<line x1="${x}" y1="${y}" x2="${x - 18}" y2="${y + 46}" stroke="#cfdbe6" stroke-width="2" opacity=".55"/>`;
    }
    return s;
  }
  function pillars(color) {
    let s = '';
    for (const x of [140, 420, 860, 1140]) s += `<rect x="${x - 26}" y="120" width="52" height="560" fill="${color}" stroke="#5a1a12" stroke-width="3"/><rect x="${x - 40}" y="660" width="80" height="30" fill="#8a6a3a"/>`;
    return s;
  }

  const SCENES = {
    palace() {
      return `<defs>${sky('g', '#3a1e14', '#7a3a24')}</defs><rect width="${W}" height="${H}" fill="url(#g)"/>
        <rect x="0" y="0" width="${W}" height="120" fill="#5a1a12"/><path d="M0 120 H${W}" stroke="#d9a640" stroke-width="6"/>
        <path d="M0 0 Q160 160 0 330 Z M${W} 0 Q${W - 160} 160 ${W} 330 Z" fill="#9a2a1e" opacity=".9"/>
        ${pillars('#b8392a')}<rect x="0" y="680" width="${W}" height="120" fill="#4a2a1a"/>
        <path d="M0 690 H${W}" stroke="#d9a640" stroke-width="3"/><rect x="500" y="300" width="280" height="200" fill="#d9a640" opacity=".18"/>
        <path d="M540 300 h200 v40 h-200 Z" fill="#d9a640" opacity=".5"/>`;
    },
    camp() {
      const r = rng(7);
      return `<defs>${sky('g', '#9fc1d8', '#f2e2c0')}</defs><rect width="${W}" height="${H}" fill="url(#g)"/>${clouds(r, 6, '#fff', 200)}
        ${mountains(r, 470, '#8aa0a8', 8, 60, 160)}<rect x="0" y="470" width="${W}" height="330" fill="#c9b07a"/>
        ${tent(260, 560, 1.1, '#e6dcc4')}${tent(640, 520, 0.8, '#d8ccb0')}${tent(1020, 580, 1.2, '#e6dcc4')}
        ${banner(90, 300, '#c0392b', '帥')}${banner(1160, 320, '#2f6db0', '令')}<rect x="0" y="700" width="${W}" height="100" fill="#a88a58"/>`;
    },
    garden() {
      const r = rng(11);
      return `<defs>${sky('g', '#bfe0f2', '#fdf2e6')}</defs><rect width="${W}" height="${H}" fill="url(#g)"/>${clouds(r, 5, '#fff', 160)}
        ${mountains(r, 520, '#9cc0a0', 9, 40, 120)}<rect x="0" y="520" width="${W}" height="280" fill="#9cc47a"/>
        <path d="M120 800 Q160 520 120 300 M120 420 Q40 380 10 300 M120 380 Q220 330 260 260" stroke="#6a4a2a" stroke-width="22" fill="none" stroke-linecap="round"/>
        <path d="M1160 800 Q1120 540 1170 320 M1160 440 Q1250 400 1280 330 M1160 400 Q1060 340 1020 280" stroke="#6a4a2a" stroke-width="22" fill="none" stroke-linecap="round"/>
        ${blossoms(r, 220)}<ellipse cx="640" cy="690" rx="230" ry="40" fill="#7a5a3a"/><rect x="560" y="610" width="160" height="70" rx="10" fill="#8a6a3a"/>`;
    },
    cottage() {
      const r = rng(13);
      return `<defs>${sky('g', '#d6e6ee', '#f6f2ea')}</defs><rect width="${W}" height="${H}" fill="url(#g)"/>
        ${mountains(r, 500, '#b8c8c8', 7, 120, 260)}${mountains(r, 560, '#9ab0a8', 9, 50, 120)}<rect x="0" y="560" width="${W}" height="240" fill="#eef2f0"/>
        <path d="M780 560 L900 450 L1020 560 Z" fill="#c9a86a" stroke="#6a4a2a" stroke-width="4"/><rect x="800" y="560" width="200" height="110" fill="#d8c08a" stroke="#6a4a2a" stroke-width="4"/>
        <rect x="870" y="600" width="60" height="70" fill="#5a3a20"/>${(() => { let s = ''; for (let i = 0; i < 160; i++) s += `<circle cx="${r() * W}" cy="${r() * H}" r="${2 + r() * 3}" fill="#fff" opacity=".8"/>`; return s; })()}
        <path d="M100 800 L180 520 L260 800 M200 800 L260 600 L320 800" fill="#3a5a3a"/>`;
    },
    field() {
      const r = rng(17);
      return `<defs>${sky('g', '#8fbfe0', '#efe6cc')}</defs><rect width="${W}" height="${H}" fill="url(#g)"/>${clouds(r, 7, '#fff', 220)}
        ${mountains(r, 480, '#9aa88c', 10, 50, 150)}<rect x="0" y="480" width="${W}" height="320" fill="#b9c27a"/>
        <path d="M0 640 Q640 560 1280 660 L1280 800 L0 800 Z" fill="#a4ad66"/>${banner(180, 330, '#c0392b', '')}${banner(1060, 350, '#2f6db0', '')}`;
    },
    river() {
      const r = rng(19);
      return `<defs>${sky('g', '#9cc4dc', '#e9eef0')}</defs><rect width="${W}" height="${H}" fill="url(#g)"/>${clouds(r, 5, '#fff', 180)}
        ${mountains(r, 430, '#8aa6a8', 9, 90, 230)}<rect x="0" y="430" width="${W}" height="370" fill="#5f8ea6"/>${waves(470, '#d8ecf4', 9)}
        ${boat(320, 560, 1, '#e6dcc4')}${boat(900, 520, 0.7, '#d8ccb0')}`;
    },
    fire() {
      const r = rng(23);
      return `<defs>${sky('g', '#2a0e0a', '#c2401e')}</defs><rect width="${W}" height="${H}" fill="url(#g)"/>
        ${mountains(r, 430, '#3a1a14', 9, 80, 200)}<rect x="0" y="430" width="${W}" height="370" fill="#4a2a2a"/>${waves(470, '#ff9a4a', 9)}
        ${boat(260, 560, 0.9, '#8a3a1a')}${boat(700, 540, 0.8, '#8a3a1a')}${boat(1100, 570, 1, '#8a3a1a')}${flames(r, 40, 380)}
        <rect width="${W}" height="${H}" fill="#ff6a1a" opacity=".12"/>`;
    },
    night() {
      const r = rng(29);
      let stars = '';
      for (let i = 0; i < 120; i++) stars += `<circle cx="${r() * W}" cy="${r() * 380}" r="${1 + r() * 1.6}" fill="#fff" opacity="${0.4 + r() * 0.6}"/>`;
      return `<defs>${sky('g', '#0c1424', '#2a3450')}</defs><rect width="${W}" height="${H}" fill="url(#g)"/>${stars}
        <circle cx="1040" cy="150" r="60" fill="#f4ecc8"/><circle cx="1062" cy="138" r="56" fill="#16203a"/>
        ${mountains(r, 500, '#1a2238', 9, 60, 160)}<rect x="0" y="500" width="${W}" height="300" fill="#22283a"/>
        ${tent(300, 600, 1, '#3a4058')}${tent(900, 580, 0.9, '#3a4058')}<circle cx="600" cy="640" r="30" fill="#ff9a2a" opacity=".8"/><circle cx="600" cy="640" r="80" fill="#ff9a2a" opacity=".15"/>`;
    },
    rain() {
      const r = rng(31);
      return `<defs>${sky('g', '#3a4250', '#7a8490')}</defs><rect width="${W}" height="${H}" fill="url(#g)"/>${clouds(r, 9, '#2a303a', 220)}
        ${mountains(r, 460, '#4a5460', 9, 70, 180)}<rect x="0" y="440" width="${W}" height="360" fill="#5a6a6a"/>${waves(470, '#aabcc4', 10)}
        ${boat(420, 580, 1.1, '#2e7d32')}<path d="M760 800 L820 560 L900 800 Z" fill="#3a3a3a" opacity=".4"/>${rain(r, 260)}`;
    },
    castle() {
      const r = rng(37);
      return `<defs>${sky('g', '#a8cce0', '#f4ead2')}</defs><rect width="${W}" height="${H}" fill="url(#g)"/>${clouds(r, 6, '#fff', 200)}
        ${wall(380, '#a49a8c')}<rect x="520" y="300" width="240" height="90" fill="#8a3a2a"/><path d="M490 300 L640 220 L790 300 Z" fill="#5a2a1e"/>
        <path d="M570 800 V560 a70 70 0 0 1 140 0 V800 Z" fill="#3a2a1e"/>${banner(330, 220, '#c0392b', '', 160)}${banner(930, 220, '#c0392b', '', 160)}`;
    },
  };

  // 事件 → 場景
  const BY_EVENT = {
    coalition: 'camp', oath: 'garden', capital_move: 'palace', seal: 'palace', dong_falls: 'palace', qingzhou: 'camp', xuzhou: 'palace',
    sun_ce: 'river', emperor: 'palace', heroes: 'garden', guandu: 'field', return: 'field', three_visits: 'cottage', zilong: 'field',
    taishi: 'field', liubiao_dies: 'palace', alliance: 'palace', locusts: 'field', bumper: 'field',
    wancheng: 'night', yuanshu_emperor: 'palace', zhangxiu_surrender: 'palace', baima: 'field', guandu_return: 'field', sunce_dies: 'field',
    wuchao: 'fire', yuanshao_dies: 'palace', kurou: 'camp', chibi_fire: 'fire', jingnan: 'castle', pangtong_joins: 'palace',
    flood: 'rain', baiyi: 'river', maicheng: 'night', caocao_dies: 'palace', eastern: 'camp', lianying: 'fire', baidi: 'palace',
  };

  const cache = {};
  function url(kind) {
    if ((TK.SCENE_FILES || {})[kind]) return TK.SCENE_FILES[kind];
    if (!cache[kind]) {
      const body = (SCENES[kind] || SCENES.palace)();
      cache[kind] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${body}</svg>`);
    }
    return cache[kind];
  }
  function forEvent(ev) { return ev.scene || BY_EVENT[ev.id] || 'palace'; }
  // 事件背景：有專屬插圖（scenes/<事件id>.jpg）就用，否則用該種類的內建背景
  // 抉擇後的演出 id 是「事件id_選項序號」：沒有該選項專屬的圖時，沿用原事件的插圖
  function fileFor(ev) {
    const F = TK.SCENE_FILES || {};
    return F[ev.id] || (ev.id && F[String(ev.id).replace(/_\d+$/, '')]) || null;
  }
  function urlFor(ev) { return fileFor(ev) || url(forEvent(ev)); }

  TK.Scenes = { url, urlFor, fileFor, forEvent, KINDS: Object.keys(SCENES) };
})(globalThis.TK = globalThis.TK || {});
