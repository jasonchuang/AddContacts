/* 勢力旗幟：用當時的國旗代替文字印章。
 * 國民政府與名義上隸屬國民政府的各地方軍：青天白日滿地紅（外框用勢力色區分）
 * 中共：紅底黃星；日方：日章旗；美軍：四十八星旗（縮小時簡化）。
 * 同一份圖形同時提供畫布（地圖）與 SVG（介面）兩種畫法。 */
(function (TK) {
  'use strict';

  function kind(fid) {
    if (fid === 'japan') return 'jp';
    if (fid === 'usa') return 'us';
    if (fid === 'ccp') return 'ccp';
    return 'roc';
  }

  // 青天白日的太陽：十二道光芒的三角形 + 藍環 + 白日
  function sunPath(cx, cy, r) {
    const pts = [];
    for (let i = 0; i < 24; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 12;
      const rr = i % 2 === 0 ? r : r * 0.53;
      pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
    return pts;
  }
  function starPath(cx, cy, r) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const rr = i % 2 === 0 ? r : r * 0.4;
      pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
    return pts;
  }

  // ---------- 畫布 ----------
  function poly(ctx, pts) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); }
  function draw(ctx, x, y, w, h, fid, border) {
    const k = kind(fid);
    ctx.save();
    if (k === 'jp') {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#bc002d'; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, h * 0.3, 0, 7); ctx.fill();
    } else if (k === 'us') {
      for (let i = 0; i < 13; i++) { ctx.fillStyle = i % 2 ? '#ffffff' : '#b22234'; ctx.fillRect(x, y + h * i / 13, w, h / 13 + 0.5); }
      ctx.fillStyle = '#3c3b6e'; ctx.fillRect(x, y, w * 0.4, h * 7 / 13);
      ctx.fillStyle = '#ffffff';
      for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) ctx.fillRect(x + w * 0.4 * (c + 0.5) / 5 - 0.5, y + h * 7 / 13 * (r + 0.5) / 4 - 0.5, 1.2, 1.2);
    } else if (k === 'ccp') {
      ctx.fillStyle = '#d0021b'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#ffd200'; poly(ctx, starPath(x + w * 0.25, y + h * 0.3, h * 0.22));
    } else {
      ctx.fillStyle = '#fe0000'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#000095'; ctx.fillRect(x, y, w / 2, h / 2);
      const cx = x + w / 4, cy = y + h / 4, r = h * 0.2;
      ctx.fillStyle = '#ffffff'; poly(ctx, sunPath(cx, cy, r));
      ctx.fillStyle = '#000095'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.42, 0, 7); ctx.fill();
    }
    if (border) { ctx.strokeStyle = border; ctx.lineWidth = Math.max(1.5, h * 0.12); ctx.strokeRect(x, y, w, h); }
    ctx.restore();
  }

  // ---------- SVG（30×20）----------
  const P = (pts) => pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  function svg(fid, border) {
    const k = kind(fid);
    let body = '';
    if (k === 'jp') body = '<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#bc002d"/>';
    else if (k === 'us') {
      for (let i = 0; i < 13; i++) body += `<rect y="${(20 * i / 13).toFixed(2)}" width="30" height="${(20 / 13 + 0.05).toFixed(2)}" fill="${i % 2 ? '#fff' : '#b22234'}"/>`;
      body += '<rect width="12" height="10.77" fill="#3c3b6e"/>';
      for (let r = 0; r < 6; r++) for (let c = 0; c < 8; c++) body += `<circle cx="${(0.75 + c * 1.5).toFixed(2)}" cy="${(0.9 + r * 1.8).toFixed(2)}" r=".35" fill="#fff"/>`;
    } else if (k === 'ccp') body = `<rect width="30" height="20" fill="#d0021b"/><polygon points="${P(starPath(7.5, 6, 4.4))}" fill="#ffd200"/>`;
    else body = `<rect width="30" height="20" fill="#fe0000"/><rect width="15" height="10" fill="#000095"/><polygon points="${P(sunPath(7.5, 5, 4))}" fill="#fff"/>`
      + '<circle cx="7.5" cy="5" r="2" fill="#000095"/><circle cx="7.5" cy="5" r="1.7" fill="#fff"/>';
    const frame = border ? `<rect x=".6" y=".6" width="28.8" height="18.8" fill="none" stroke="${border}" stroke-width="1.2"/>` : '';
    return `<svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" class="flag-svg" aria-hidden="true">${body}${frame}</svg>`;
  }

  TK.Flags = { kind, draw, svg };
})(globalThis.TK = globalThis.TK || {});
