/* 像素風地圖：以格子分類地形（平原、乾地、森林、山、河、海），疊上勢力領土與城池。
 * 內部解析度 500×360（世界座標 1000×720 的一半），顯示時放大並保持像素銳利。地形為本作原創。 */
(function (TK) {
  'use strict';

  const W = 500, H = 360, CELL = 4, CW = W / CELL, CH = H / CELL;
  const WS = 0.5; // 世界座標 → 內部像素

  // 地形資料（世界座標）
  const COAST = [[930, -10], [950, 70], [985, 150], [952, 228], [990, 296], [958, 352], [978, 420], [938, 472], [962, 525], [992, 596], [958, 655], [985, 730]];
  const RIVERS = [
    { name: '黃河', main: true, label: [455, 312], pts: [[-10, 252], [60, 238], [120, 232], [180, 244], [230, 262], [290, 276], [330, 284], [380, 298], [430, 310], [470, 312], [520, 295], [560, 270], [610, 252], [660, 242], [700, 238], [750, 250], [790, 258], [840, 252], [900, 242], [940, 230], [960, 222]] },
    { name: '長江', main: true, label: [300, 608], pts: [[40, 515], [100, 530], [150, 548], [210, 568], [270, 590], [330, 594], [380, 592], [430, 598], [480, 606], [520, 612], [570, 606], [610, 598], [660, 584], [720, 560], [760, 554], [800, 552], [860, 548], [920, 550], [975, 552]] },
    { name: '', main: false, pts: [[330, 450], [390, 480], [450, 520], [520, 545], [600, 568]] },
    { name: '', main: false, pts: [[535, 330], [575, 365], [640, 410]] },
  ];
  const MOUNTAINS = [
    [600, 160, 60, 46], [628, 128, 44, 34], [585, 252, 40, 30], [470, 205, 52, 38], [445, 250, 40, 30],
    [295, 400, 70, 52], [350, 392, 52, 40], [425, 405, 62, 46], [462, 388, 40, 30], [262, 480, 58, 44], [292, 528, 46, 34],
    [110, 470, 56, 42], [88, 545, 62, 46], [95, 330, 64, 48], [65, 120, 60, 44], [250, 120, 56, 40], [300, 160, 40, 28],
    [700, 112, 46, 32], [640, 650, 46, 30], [780, 640, 44, 30], [470, 690, 40, 26],
  ];
  const FORESTS = [[380, 560, 34], [300, 640, 30], [870, 470, 26], [150, 640, 34], [720, 520, 22], [560, 600, 22], [420, 470, 22], [760, 300, 20], [180, 420, 28], [620, 140, 22], [860, 620, 26], [480, 650, 24]];

  // 調色盤（原創）
  const P = {
    sea: '#25418a', sea2: '#3a62b0', sea3: '#5d8ad0',
    sand: '#d9c58a', grass: '#5c9a3f', grass2: '#4d8834', grass3: '#73ad4f',
    dry: '#b8a25a', dry2: '#a28c48', river: '#3b78d0', river2: '#8cc0f0',
    forest: '#2d6a2a', forest2: '#1f4f1f', trunk: '#5a3a1a',
    mtn: '#8a6a44', mtnL: '#b8956a', mtnD: '#5e4429', snow: '#f0eee6',
    road: '#e8d49a', roadD: '#9a7a4a', outline: '#1a1424',
    wall: '#b0aab8', wallD: '#6a6478', gate: '#20182a', roof: '#c03028', white: '#fbf7ee',
  };

  function hash(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function coastX(wy) {
    for (let i = 0; i < COAST.length - 1; i++) {
      const [x0, y0] = COAST[i], [x1, y1] = COAST[i + 1];
      if (wy >= y0 && wy <= y1) return x0 + (x1 - x0) * (wy - y0) / (y1 - y0 || 1);
    }
    return 990;
  }

  function distSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
    const qx = ax + dx * t - px, qy = ay + dy * t - py;
    return Math.sqrt(qx * qx + qy * qy);
  }

  // ---------- 地形格 ----------
  let grid = null;
  function terrainGrid() {
    if (grid) return grid;
    grid = [];
    for (let cy = 0; cy < CH; cy++) {
      const row = [];
      for (let cx = 0; cx < CW; cx++) {
        const wx = (cx + 0.5) * CELL / WS, wy = (cy + 0.5) * CELL / WS;
        let t = 'grass';
        const cxs = coastX(wy);
        if (wx > cxs) t = 'sea';
        else if (wx > cxs - 9) t = 'sand';
        else {
          // 西北乾地（隨雜訊漸變）
          const dryness = (330 - wx) / 160 + (300 - wy) / 220 + (hash(cx, cy) - 0.5) * 0.6;
          if (dryness > 1.1) t = 'dry';
          for (const [fx, fy, r] of FORESTS) {
            const d = Math.hypot(wx - fx, (wy - fy) * 1.3);
            if (d < r * (0.75 + hash(cx * 7, cy * 3) * 0.5)) t = 'forest';
          }
        }
        row.push(t);
      }
      grid.push(row);
    }
    return grid;
  }

  // ---------- 像素繪圖工具 ----------
  function px(ctx, x, y, c, w, h) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w || 1, h || 1); }

  function pixelLine(ctx, x0, y0, x1, y1, c, thick, dash) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, i = 0;
    ctx.fillStyle = c;
    for (;;) {
      if (!dash || (i % dash[0]) < dash[1]) ctx.fillRect(x0 - (thick >> 1), y0 - (thick >> 1), thick, thick);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
      i++;
    }
  }

  function mountainSprite(ctx, cx, by, w, h) {
    // 像素三角山：左亮右暗，山頂積雪
    for (let r = 0; r < h; r++) {
      const half = Math.round((r + 1) * w / (2 * h));
      const y = by - h + r;
      px(ctx, cx - half, y, P.mtnL, half, 1);
      px(ctx, cx, y, P.mtn, half, 1);
      if (r > h * 0.55) px(ctx, cx + Math.round(half * 0.4), y, P.mtnD, Math.max(1, half - Math.round(half * 0.4)), 1);
      px(ctx, cx - half - 1, y, P.outline);
      px(ctx, cx + half, y, P.outline);
      if (r < h * 0.28) px(ctx, cx - half, y, P.snow, half * 2, 1);
    }
    px(ctx, cx, by - h - 1, P.outline);
  }

  function treeSprite(ctx, x, y) {
    px(ctx, x + 1, y, P.forest, 2, 1);
    px(ctx, x, y + 1, P.forest, 4, 2);
    px(ctx, x + 1, y + 1, P.grass3, 1, 1);
    px(ctx, x + 3, y + 2, P.forest2, 1, 1);
    px(ctx, x + 1, y + 3, P.forest2, 2, 1);
    px(ctx, x + 1, y + 4, P.trunk, 1, 1);
  }

  // ---------- 地形底圖（快取） ----------
  let baseCanvas = null;
  function baseLayer() {
    if (baseCanvas) return baseCanvas;
    const g = terrainGrid();
    baseCanvas = document.createElement('canvas');
    baseCanvas.width = W; baseCanvas.height = H;
    const ctx = baseCanvas.getContext('2d');
    for (let cy = 0; cy < CH; cy++) {
      for (let cx = 0; cx < CW; cx++) {
        const t = g[cy][cx], x = cx * CELL, y = cy * CELL, h = hash(cx, cy);
        if (t === 'sea') {
          px(ctx, x, y, P.sea, CELL, CELL);
          if (h < 0.12) px(ctx, x + 1, y + 2, P.sea2, 2, 1);
          else if (h > 0.94) px(ctx, x, y + 1, P.sea3, 3, 1);
        } else if (t === 'sand') {
          px(ctx, x, y, P.sand, CELL, CELL);
          if (h < 0.3) px(ctx, x + 2, y + 1, P.dry, 1, 1);
        } else if (t === 'dry') {
          px(ctx, x, y, P.dry, CELL, CELL);
          if (h < 0.35) px(ctx, x + (h * 40 | 0) % 4, y + 2, P.dry2, 1, 1);
        } else {
          px(ctx, x, y, h < 0.5 ? P.grass : P.grass2, CELL, CELL);
          if (h > 0.85) px(ctx, x + 1, y + 1, P.grass3, 1, 1);
        }
      }
    }
    // 森林
    for (let cy = 0; cy < CH; cy++) {
      for (let cx = 0; cx < CW; cx++) {
        if (g[cy][cx] === 'forest' && (cx + cy) % 2 === 0) treeSprite(ctx, cx * CELL, cy * CELL - 1);
      }
    }
    // 河流（兩層：深藍主體＋淺色水光）
    for (const r of RIVERS) {
      const pts = r.pts.map(([x, y]) => [x * WS, y * WS]);
      for (let i = 0; i < pts.length - 1; i++) {
        pixelLine(ctx, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], P.river, r.main ? 4 : 2);
      }
      if (r.main) {
        for (let i = 0; i < pts.length - 1; i++) {
          pixelLine(ctx, pts[i][0], pts[i][1] - 1, pts[i + 1][0], pts[i + 1][1] - 1, P.river2, 1, [7, 3]);
        }
      }
    }
    // 山脈
    const sorted = MOUNTAINS.slice().sort((a, b) => a[1] - b[1]);
    for (const [mx, my, mw, mh] of sorted) {
      const x = mx * WS, y = my * WS, w = mw * WS, h = mh * WS;
      mountainSprite(ctx, Math.round(x - w * 0.3), Math.round(y), Math.round(w * 0.7), Math.round(h * 0.75));
      mountainSprite(ctx, Math.round(x + w * 0.25), Math.round(y + 1), Math.round(w * 0.6), Math.round(h * 0.6));
      mountainSprite(ctx, Math.round(x), Math.round(y + 2), Math.round(w * 0.8), Math.round(h));
    }
    return baseCanvas;
  }

  // ---------- 勢力領土 ----------
  function territory(state) {
    const g = terrainGrid();
    const owned = Object.values(state.cities);
    const own = [];
    for (let cy = 0; cy < CH; cy++) {
      const row = [];
      for (let cx = 0; cx < CW; cx++) {
        if (g[cy][cx] === 'sea') { row.push(null); continue; }
        const wx = (cx + 0.5) * CELL / WS, wy = (cy + 0.5) * CELL / WS;
        let best = null, bd = 95;
        for (const c of owned) {
          const d = Math.hypot(c.x - wx, c.y - wy);
          if (d < bd) { bd = d; best = c; }
        }
        row.push(best ? best.owner || '' : null);
      }
      own.push(row);
    }
    return own;
  }

  // ---------- 城池 ----------
  function castle(ctx, x, y, color, capital, neutral) {
    const wall = neutral ? '#9a948a' : P.wall, wallD = neutral ? '#6a655c' : P.wallD;
    // 陰影
    px(ctx, x - 7, y + 4, 'rgba(0,0,0,.35)', 15, 1);
    // 城牆
    px(ctx, x - 7, y - 3, P.outline, 15, 8);
    px(ctx, x - 6, y - 2, wall, 13, 6);
    px(ctx, x - 6, y + 2, wallD, 13, 2);
    for (let i = -6; i <= 6; i += 2) px(ctx, x + i, y - 4, P.outline, 1, 1);
    for (let i = -6; i <= 6; i += 2) px(ctx, x + i, y - 3, wall, 1, 1);
    px(ctx, x - 1, y + 1, P.gate, 3, 3);
    // 城樓
    const th = capital ? 6 : 4;
    px(ctx, x - 4, y - 3 - th, P.outline, 9, th + 1);
    px(ctx, x - 3, y - 2 - th, wall, 7, th);
    px(ctx, x - 1, y - th, P.gate, 1, 1); px(ctx, x + 1, y - th, P.gate, 1, 1);
    // 屋頂
    const roof = capital ? P.roof : (neutral ? '#7a6a5a' : '#5a4a6a');
    px(ctx, x - 5, y - 4 - th, P.outline, 11, 1);
    px(ctx, x - 4, y - 5 - th, roof, 9, 1);
    px(ctx, x - 3, y - 6 - th, roof, 7, 1);
    px(ctx, x - 1, y - 7 - th, roof, 3, 1);
    // 旗
    if (color) {
      px(ctx, x + 5, y - 12 - th, P.outline, 1, 9);
      px(ctx, x + 6, y - 12 - th, P.outline, 6, 5);
      px(ctx, x + 6, y - 11 - th, color, 5, 3);
    }
  }

  function textOutline(ctx, s, x, y, fill, size) {
    ctx.font = `${size || 12}px Pixel12, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = P.outline;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) ctx.fillText(s, x + dx, y + dy);
    ctx.fillStyle = fill;
    ctx.fillText(s, x, y);
  }

  // ---------- 主繪製 ----------
  // opts: {selected, hovered, targets:[], blink:boolean, color(fid)}
  function render(canvas, state, opts) {
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(baseLayer(), 0, 0);

    // 領土上色與邊界
    const own = territory(state);
    for (let cy = 0; cy < CH; cy++) {
      for (let cx = 0; cx < CW; cx++) {
        const o = own[cy][cx];
        if (!o) continue;
        const col = opts.color(o);
        ctx.globalAlpha = 0.34;
        px(ctx, cx * CELL, cy * CELL, col, CELL, CELL);
        ctx.globalAlpha = 1;
        const right = cx + 1 < CW ? own[cy][cx + 1] : o, down = cy + 1 < CH ? own[cy + 1][cx] : o;
        if (right !== null && right !== o) px(ctx, cx * CELL + CELL - 1, cy * CELL, col, 1, CELL);
        if (down !== null && down !== o) px(ctx, cx * CELL, cy * CELL + CELL - 1, col, CELL, 1);
      }
    }

    // 道路
    for (const [a, b] of state.roads) {
      const A = state.cities[a], B = state.cities[b];
      pixelLine(ctx, A.x * WS, A.y * WS + 1, B.x * WS, B.y * WS + 1, P.roadD, 2, [5, 3]);
      pixelLine(ctx, A.x * WS, A.y * WS, B.x * WS, B.y * WS, P.road, 1, [5, 3]);
    }

    // 河名
    for (const r of RIVERS) if (r.label) textOutline(ctx, r.name, r.label[0] * WS, r.label[1] * WS, P.river2, 12);

    // 城池
    for (const c of Object.values(state.cities)) {
      const x = Math.round(c.x * WS), y = Math.round(c.y * WS);
      const capital = c.owner && Object.values(state.generals).some((g) => g.ruler && g.status === 'active' && g.city === c.id);
      if (c.id === opts.hovered) { ctx.globalAlpha = 0.35; px(ctx, x - 11, y - 18, '#ffffff', 23, 26); ctx.globalAlpha = 1; }
      castle(ctx, x, y, c.owner ? opts.color(c.owner) : null, capital, !c.owner);
      const mine = c.owner && c.owner === state.player;
      textOutline(ctx, c.name, x, y + 6, mine ? '#ffe070' : P.white, 12);
      if (opts.targets.includes(c.id) && opts.blink) {
        const tx = x, ty = y - 22;
        for (let i = -3; i <= 3; i++) { px(ctx, tx + i, ty + i, '#ff3020', 2, 2); px(ctx, tx + i, ty - i, '#ff3020', 2, 2); }
      }
      if (c.id === opts.selected) {
        const col = opts.blink ? '#ffe040' : '#ffffff';
        const L = x - 12, R = x + 11, T = y - 20, B = y + 20;
        for (const [ax, ay, sx, sy] of [[L, T, 1, 1], [R, T, -1, 1], [L, B, 1, -1], [R, B, -1, -1]]) {
          px(ctx, Math.min(ax, ax + sx * 4), ay, col, 5, 1);
          px(ctx, ax, Math.min(ay, ay + sy * 4), col, 1, 5);
        }
      }
    }
  }

  function cityAt(state, canvas, clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const x = (clientX - r.left) * W / r.width, y = (clientY - r.top) * H / r.height;
    let best = null, bd = 14;
    for (const c of Object.values(state.cities)) {
      const d = Math.hypot(c.x * WS - x, c.y * WS - 2 - y);
      if (d < bd) { bd = d; best = c.id; }
    }
    return best;
  }

  TK.PixelMap = { W, H, render, cityAt, baseLayer, pixelLine, px, textOutline, P };
})(globalThis.TK = globalThis.TK || {});
