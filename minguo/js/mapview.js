/* 地圖（與 Godot 版 world_map.gd 相同畫法）：紙底、海岸、勢力領土、河流、山脈、道路、城池與名牌。
 * 世界座標 1000×720，畫布以 2 倍解析度繪製。地形為本作原創。 */
(function (TK) {
  'use strict';

  // 海岸線（由北往南再往西）：遼東半島、渤海灣、山東半島、江浙閩沿海、廣東沿海（珠江口）；線的右下側是海
  const COAST = [[1015, -10], [1008, 40], [985, 80], [960, 110], [935, 140], [912, 170], [892, 196], [884, 186], [896, 150], [888, 128],
    [862, 130], [836, 134], [818, 150], [822, 172], [828, 200], [836, 222], [870, 232], [910, 236], [950, 240], [972, 252], [955, 272],
    [920, 296], [900, 322], [905, 345], [912, 400], [925, 450], [945, 490], [962, 525], [948, 566], [928, 610], [905, 652], [882, 694], [852, 712], [800, 722], [745, 728], [712, 734],
    [690, 724], [672, 716], [658, 724], [640, 736], [590, 744], [540, 752], [500, 764], [470, 790]];
  // 臺灣（1895～1945 日本統治）：只畫出島嶼與標示，不是可以爭奪的城
  const KINMEN = [[850, 718], [860, 714], [868, 720], [862, 728], [852, 727]];
  const TAIWAN = [[946, 628], [956, 640], [962, 664], [960, 690], [950, 712], [938, 724], [928, 708], [926, 682], [932, 654]];
  const RIVERS = [
    { name: '黃河', label: [455, 302], pts: [[-10, 252], [60, 238], [120, 232], [180, 244], [230, 262], [290, 276], [330, 284], [380, 298], [430, 310], [470, 312], [520, 295], [560, 270], [610, 252], [660, 242], [700, 238], [750, 250], [790, 258], [815, 242], [836, 222]] },
    { name: '長江', label: [262, 622], pts: [[40, 515], [100, 530], [150, 548], [210, 568], [270, 590], [330, 594], [380, 592], [430, 598], [480, 606], [520, 612], [570, 606], [610, 598], [660, 584], [720, 560], [760, 554], [800, 552], [860, 548], [920, 550], [975, 552]] },
    { name: '', pts: [[330, 450], [390, 480], [450, 520], [520, 545], [600, 568]] },
    { name: '', pts: [[535, 330], [575, 365], [640, 410]] },
  ];
  const MOUNTAINS = [
    [600, 160, 60, 46], [628, 128, 44, 34], [585, 252, 40, 30], [470, 205, 52, 38], [445, 250, 40, 30],
    [295, 400, 70, 52], [350, 392, 52, 40], [425, 405, 62, 46], [262, 480, 58, 44], [292, 528, 46, 34],
    [110, 470, 56, 42], [88, 545, 62, 46], [95, 330, 64, 48], [65, 120, 60, 44], [250, 120, 56, 40], [300, 160, 40, 28],
    [700, 112, 46, 32], [640, 650, 46, 30], [780, 640, 44, 30], [470, 690, 40, 26],
  ];
  const PAPER = '#efe5cf', INK = '#1f1a14', INK2 = '#3b332a', RIVER = '61,134,166', GOLD = '#b8892c', RED = '#b23a2c';
  const FONT = '"Kai", "Body", "Kaiti TC", "DFKai-SB", serif';

  // 姓氏（印章、旗號用）：複姓取兩字，其餘取第一個字
  const COMPOUND = ['夏侯', '諸葛', '司馬', '太史', '公孫', '皇甫', '令狐', '歐陽', '上官', '淳于', '東方', '慕容', '尉遲'];
  TK.surname = (n) => (!n ? '' : COMPOUND.find((x) => n.startsWith(x)) || n.slice(0, 1));

  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  function darken(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - k))).join(',')})`;
  }

  let view = { s: 1, ox: 0, oy: 0, W: 0, H: 0 };
  const P = (p) => [view.ox + p[0] * view.s, view.oy + p[1] * view.s];

  function smooth(ctx, pts) {
    const q = pts.map(P);
    ctx.beginPath();
    ctx.moveTo(q[0][0], q[0][1]);
    for (let i = 0; i < q.length - 1; i++) {
      const p0 = q[Math.max(i - 1, 0)], p1 = q[i], p2 = q[i + 1], p3 = q[Math.min(i + 2, q.length - 1)];
      ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
  }

  // opts: {selected, hovered, targets, blink, color(fid), legend, player}
  function render(canvas, state, opts) {
    const r = canvas.getBoundingClientRect();
    const dpr = 2;
    const W = Math.max(400, Math.round((r.width || 838) * dpr)), H = Math.max(300, Math.round((r.height || 592) * dpr));
    if (canvas.width !== W) canvas.width = W;
    if (canvas.height !== H) canvas.height = H;
    // 世界座標 1000×720，上下各留一點邊（下方多留，避免最下排城名被切掉）
    const s = Math.min(W / 1000, H / 795);
    view = { s, ox: (W - 1000 * s) / 2, oy: (H - 795 * s) / 2 + 12 * s, W, H };
    const ctx = canvas.getContext('2d');
    const color = opts.color;
    const cities = Object.values(state.cities);
    const byId = state.cities;

    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);

    // 海
    smooth(ctx, COAST);
    ctx.lineTo(W + 10, H + 10); ctx.lineTo(W + 10, -10); ctx.closePath();
    ctx.fillStyle = '#9fb6b4'; ctx.fill();
    smooth(ctx, COAST);
    ctx.strokeStyle = 'rgba(41,36,26,.55)'; ctx.lineWidth = 2.5 * s + 1; ctx.stroke();

    // 勢力領土：同一勢力相鄰（有道路相連）的城，領土連成一整片。
    // 先在離屏畫布上用不透明色畫出聯集，再一次以半透明疊上去，重疊處才不會變深。
    const owners = [...new Set(cities.map((c) => c.owner).filter(Boolean))];
    const off = render.off || (render.off = document.createElement('canvas'));
    off.width = canvas.width; off.height = canvas.height;
    const o = off.getContext('2d');
    for (const fid of owners) {
      const col = color(fid);
      o.clearRect(0, 0, off.width, off.height);
      o.fillStyle = col; o.strokeStyle = col; o.lineCap = 'round'; o.lineJoin = 'round';
      const mine = cities.filter((c) => c.owner === fid);
      for (const c of mine) { const [x, y] = P([c.x, c.y]); o.beginPath(); o.arc(x, y, 60 * s, 0, 7); o.fill(); }
      o.lineWidth = 96 * s;
      for (const [a, b] of state.roads) {
        const A = byId[a], B = byId[b];
        if (A.owner === fid && B.owner === fid) { o.beginPath(); o.moveTo(...P([A.x, A.y])); o.lineTo(...P([B.x, B.y])); o.stroke(); }
      }
      // 領土：柔邊的淡色塊＋外圍再淡一圈
      ctx.save();
      ctx.globalAlpha = 0.13;
      if ('filter' in ctx) ctx.filter = 'blur(10px)';
      ctx.drawImage(off, 0, 0);
      ctx.filter = 'none';
      ctx.globalAlpha = 0.2;
      ctx.drawImage(off, 0, 0);
      ctx.restore();
    }

    // 海面蓋在領土色塊上（領土只留在陸地）
    smooth(ctx, COAST);
    ctx.lineTo(W + 10, H + 10); ctx.lineTo(W + 10, -10); ctx.closePath();
    ctx.fillStyle = '#9fb6b4'; ctx.fill();
    smooth(ctx, COAST);
    ctx.strokeStyle = 'rgba(41,36,26,.55)'; ctx.lineWidth = 2.5 * s + 1; ctx.stroke();
    ctx.strokeStyle = 'rgba(61,89,96,.45)'; ctx.lineWidth = 1.2 * s;
    for (let i = 0; i < 24; i++) {
      const [x, y] = P([985 - ((i * 37) % 26), 270 + i * 18]);
      ctx.beginPath(); ctx.arc(x + 6 * s, y, 6 * s, Math.PI, 2 * Math.PI); ctx.stroke();
    }

    // 金門
    smooth(ctx, KINMEN); ctx.closePath();
    ctx.fillStyle = '#e4dcc6'; ctx.fill();
    ctx.strokeStyle = 'rgba(41,36,26,.55)'; ctx.lineWidth = 1.5 * s + 1; ctx.stroke();
    // 臺灣
    smooth(ctx, TAIWAN); ctx.closePath();
    ctx.fillStyle = '#e4dcc6'; ctx.fill();
    ctx.strokeStyle = 'rgba(41,36,26,.55)'; ctx.lineWidth = 2 * s + 1; ctx.stroke();
    {
      const [x, y] = P([944, 676]);
      ctx.font = `${Math.round(13 * s + 5)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(59,51,42,.75)';
      ctx.fillText('臺灣', x, y - 9 * s);
      ctx.font = `${Math.round(9 * s + 4)}px ${FONT}`;
      ctx.fillText('（日治）', x, y + 10 * s);
    }

    // 河流
    for (const rv of RIVERS) {
      const main = !!rv.name;
      for (const [st, w] of [[`rgba(${RIVER},.25)`, main ? 16 : 7], [`rgba(${RIVER},.9)`, main ? 5 : 2.6], ['rgba(199,230,240,.9)', main ? 1.4 : 0.8]]) {
        smooth(ctx, rv.pts); ctx.strokeStyle = st; ctx.lineWidth = w * s; ctx.stroke();
      }
      if (main && rv.label) {
        const [x, y] = P(rv.label);
        ctx.font = `bold ${Math.round(22 * s + 6)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 6; ctx.strokeStyle = PAPER; ctx.strokeText(rv.name, x, y);
        ctx.fillStyle = '#2c6f8c'; ctx.fillText(rv.name, x, y);
      }
    }

    // 山脈
    for (const [x, y, w, hh] of MOUNTAINS) {
      for (const [k, f] of [[-0.32, 0.65], [0, 1], [0.3, 0.72]]) {
        const px = x + w * k, ph = hh * f, pw = w * 0.45;
        const a = P([px - pw, y]), t = P([px, y - ph]), b = P([px + pw, y]);
        ctx.fillStyle = 'rgba(92,82,69,.38)'; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...t); ctx.lineTo(...b); ctx.fill();
        ctx.fillStyle = 'rgba(51,43,36,.22)'; ctx.beginPath(); ctx.moveTo(...t); ctx.lineTo(...b); ctx.lineTo(...P([px + pw * 0.1, y])); ctx.fill();
        ctx.fillStyle = 'rgba(245,237,217,.85)'; ctx.beginPath(); ctx.moveTo(...P([px - pw * 0.25, y - ph * 0.72])); ctx.lineTo(...t); ctx.lineTo(...P([px + pw * 0.25, y - ph * 0.72])); ctx.fill();
        ctx.strokeStyle = 'rgba(41,33,26,.5)'; ctx.lineWidth = 1.2 * s; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...t); ctx.lineTo(...b); ctx.stroke();
      }
    }

    // 道路
    ctx.setLineDash([2 * s, 6 * s + 2]);
    ctx.lineCap = 'butt';
    for (const [a, b] of state.roads) {
      ctx.strokeStyle = 'rgba(107,90,69,.6)'; ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.moveTo(...P([byId[a].x, byId[a].y])); ctx.lineTo(...P([byId[b].x, byId[b].y])); ctx.stroke();
    }
    ctx.setLineDash([]);

    // 城市
    const S2 = Math.max(0.8, s);
    const rulerCity = {};
    for (const g of Object.values(state.generals)) if (g.ruler && g.status === 'active') rulerCity[g.city] = true;
    for (const c of cities) {
      const [x, y] = P([c.x, c.y]);
      const fc = c.owner ? color(c.owner) : '#a39a8a';
      const ink = c.owner ? darken(fc, 0.55) : '#7d756a';
      const Q = (dx, dy) => [x + dx * S2, y + dy * S2];
      if (c.id === opts.hovered) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(x, y, 26 * S2, 0, 7); ctx.fill(); }
      if (c.id === opts.selected) {
        ctx.strokeStyle = opts.blink ? RED : '#e0604c'; ctx.lineWidth = 3 * S2;
        ctx.beginPath(); ctx.arc(x, y, 30 * S2, 0, 7); ctx.stroke();
      }
      // 城池剪影
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.moveTo(...Q(-19, 13)); ctx.lineTo(...Q(-16, -1)); ctx.lineTo(...Q(16, -1)); ctx.lineTo(...Q(19, 13)); ctx.fill();
      for (const bx of [-16, -8, 4, 12]) ctx.fillRect(...Q(bx, -5), 4 * S2, 4 * S2);
      ctx.fillRect(...Q(-8, -12), 16 * S2, 9 * S2);
      ctx.beginPath(); ctx.moveTo(...Q(-15, -11)); ctx.lineTo(...Q(0, -19)); ctx.lineTo(...Q(15, -11)); ctx.fill();
      if (rulerCity[c.id] && c.owner) {
        ctx.fillRect(...Q(-5, -25), 10 * S2, 7 * S2);
        ctx.beginPath(); ctx.moveTo(...Q(-11, -24)); ctx.lineTo(...Q(0, -31)); ctx.lineTo(...Q(11, -24)); ctx.fill();
      }
      ctx.fillStyle = PAPER; ctx.fillRect(...Q(-4, 6), 8 * S2, 7 * S2);
      // 勢力印章
      if (c.owner) {
        const [sx, sy] = Q(13, -33);
        ctx.fillStyle = fc; ctx.fillRect(sx, sy, 18 * S2, 18 * S2);
        ctx.strokeStyle = 'rgba(245,237,217,.95)'; ctx.lineWidth = 1.2 * S2; ctx.strokeRect(sx + 2 * S2, sy + 2 * S2, 14 * S2, 14 * S2);
        const ruler = state.factions[c.owner].ruler;
        const sn = TK.surname(ruler);
        ctx.fillStyle = '#f6eedb'; ctx.font = `bold ${Math.round((sn.length > 1 ? 7.5 : 12) * S2)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(sn, sx + 9 * S2, sy + 9.5 * S2);
      }
      // 名牌
      ctx.font = `bold ${Math.round(15 * S2)}px ${FONT}`;
      const w = ctx.measureText(c.name).width + 14 * S2;
      const [px, py] = Q(0, 17);
      const mine = c.owner && c.owner === opts.player;
      ctx.fillStyle = c.owner ? fc : 'rgba(242,235,214,.95)';
      ctx.fillRect(px - w / 2, py, w, 22 * S2);
      ctx.strokeStyle = mine ? GOLD : c.owner ? 'rgba(245,237,217,.95)' : '#7d756a';
      ctx.lineWidth = (mine ? 2.5 : 1) * S2;
      ctx.strokeRect(px - w / 2, py, w, 22 * S2);
      ctx.fillStyle = c.owner ? '#fcf7ea' : INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(c.name, px, py + 11.5 * S2);
      // 可進攻目標
      if (opts.targets.includes(c.id)) {
        const [tx, ty] = Q(0, -44);
        ctx.strokeStyle = opts.blink ? RED : '#e0604c'; ctx.lineWidth = 3.5 * S2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(tx - 7 * S2, ty - 7 * S2); ctx.lineTo(tx + 7 * S2, ty + 7 * S2);
        ctx.moveTo(tx + 7 * S2, ty - 7 * S2); ctx.lineTo(tx - 7 * S2, ty + 7 * S2); ctx.stroke();
      }
    }

    // 圖例
    if (opts.legend !== false) {
      // 左上角圖例（加紙底，避免蓋住城名）
      const alive = Object.values(state.factions).filter((f) => f.alive);
      ctx.font = `${Math.round(14 * 2)}px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      const total = alive.reduce((a, f) => a + 46 + ctx.measureText(f.name).width, 0);
      ctx.fillStyle = 'rgba(248,241,223,.85)'; ctx.fillRect(10, 10, total + 22, 50);
      ctx.strokeStyle = 'rgba(59,51,42,.3)'; ctx.lineWidth = 2; ctx.strokeRect(10, 10, total + 22, 50);
      let lx = 12 * 2;
      const ly = 10 + 42;
      for (const f of alive) {
        if (!f.alive) continue;
        ctx.fillStyle = f.color; ctx.fillRect(lx, ly - 22, 22, 22);
        ctx.fillStyle = f.id === opts.player ? '#8a2a1f' : INK2;
        ctx.fillText(f.name, lx + 30, ly - 3);
        lx += 46 + ctx.measureText(f.name).width;
      }
    }
  }

  function cityAt(state, canvas, clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const x = (clientX - r.left) * canvas.width / r.width, y = (clientY - r.top) * canvas.height / r.height;
    let best = null, bd = 30 * Math.max(0.8, view.s);
    for (const c of Object.values(state.cities)) {
      const [cx, cy] = P([c.x, c.y + 4]);
      const d = Math.hypot(cx - x, cy - y);
      if (d < bd) { bd = d; best = c.id; }
    }
    return best;
  }

  TK.MapView = { render, cityAt };
})(globalThis.TK = globalThis.TK || {});
