/* 戰場士兵的 sprite sheet 動畫。圖檔與格子設定來自 sprites/sprites.json（由 build.js 轉成 TK.SPRITES）。
 * 沒有設定的兵種回傳 null，戰鬥畫面會改用程式畫的 SVG 士兵。
 * 動作：walk 行軍（必要）、attack 攻擊、die 倒下（沒有就退回 walk／淡出）。 */
(function (TK) {
  'use strict';
  const HEIGHT = { inf: 48, art: 48, tank: 44, air: 34, navy: 40 }; // 桌機畫面上的預設高度（px）

  function cfgOf(k) {
    const u = TK.SPRITES && TK.SPRITES[k];
    return u && u.frame && u.anims && u.anims.walk ? u : null;
  }

  // 播放某個動作；once＝只播一次並停在最後一格（die），或播完回到 walk（attack）
  function play(el, name, once) {
    const u = cfgOf(el.dataset.k);
    if (!u) return false;
    const a = u.anims[name];
    if (!a) return false;
    const sp = el.firstChild;
    const [fw, fh] = u.frame;
    const size = a.size || u.size;
    sp.style.backgroundImage = `url("${a.file || u.file}")`;
    sp.style.setProperty('--W', size[0]);
    sp.style.setProperty('--H', size[1]);
    sp.style.setProperty('--fw', fw);
    sp.style.setProperty('--fh', fh);
    sp.style.setProperty('--row', a.row || 0);
    sp.style.setProperty('--c0', a.col || 0);
    sp.style.setProperty('--n', a.frames);
    sp.style.setProperty('--dur', `${(a.frames / (a.fps || 10)).toFixed(3)}s`);
    sp.classList.toggle('once', !!once);
    el.dataset.anim = name;
    // 重新開始動畫
    sp.style.animation = 'none';
    void sp.offsetWidth;
    sp.style.animation = '';
    return true;
  }

  function make(k, col, flip) {
    const u = cfgOf(k);
    if (!u) return null;
    const [fw, fh] = u.frame;
    const z = (u.height || HEIGHT[k] || 48) / fh;
    const el = document.createElement('div');
    el.className = `u u-${k} spr march`;
    el.dataset.k = k;
    el.style.setProperty('--z0', z);
    el.style.setProperty('--fw', fw);
    el.style.setProperty('--fh', fh);
    el.style.setProperty('--c', col);
    const sp = document.createElement('div');
    sp.className = 'sp' + ((u.facing === 'left') !== !!flip ? ' flip' : '') + (u.pixel === false ? ' smooth' : '');
    el.append(sp);
    // attack 播完回到 walk
    sp.addEventListener('animationend', () => { if (el.dataset.anim === 'attack') play(el, 'walk'); });
    play(el, 'walk');
    return el;
  }

  // ---------- 姿勢圖模式（sprites.json 的 poses：idle 行軍、attack 攻擊、fall 倒下；masks：換色遮罩） ----------
  // 動作由程式做：行軍上下輕晃、攻擊往前一衝、倒下後淡出；遮罩區塗上勢力色。
  function poseCfg(k) {
    const u = TK.SPRITES && TK.SPRITES[k];
    return u && u.poses && u.poses.idle ? u : null;
  }
  const imgCache = {}, tintCache = {};
  function loadImg(src) {
    if (!imgCache[src]) imgCache[src] = new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
    return imgCache[src];
  }
  // 把遮罩區塗上勢力色，回傳 data URL（同一組合只算一次）
  function tinted(u, pose, col) {
    const key = `${u.poses[pose]}|${col}`;
    if (!tintCache[key]) {
      tintCache[key] = Promise.all([loadImg(u.poses[pose]), u.masks && u.masks[pose] ? loadImg(u.masks[pose]) : null]).then(([base, mask]) => {
        if (!base) return u.poses[pose];
        if (!mask || typeof document === 'undefined') return u.poses[pose];
        try {
          const w = base.naturalWidth, h = base.naturalHeight;
          const color = document.createElement('canvas'); color.width = w; color.height = h;
          const c = color.getContext('2d');
          c.fillStyle = col; c.fillRect(0, 0, w, h);
          c.globalCompositeOperation = 'destination-in'; c.drawImage(mask, 0, 0, w, h);
          const out = document.createElement('canvas'); out.width = w; out.height = h;
          const o = out.getContext('2d');
          o.drawImage(base, 0, 0);
          o.globalAlpha = 0.92; o.drawImage(color, 0, 0);
          return out.toDataURL('image/png');
        } catch (e) { return u.poses[pose]; }
      });
    }
    return tintCache[key];
  }
  function setPose(el, pose) {
    const u = poseCfg(el.dataset.k);
    if (!u || !u.poses[pose]) return false;
    el.dataset.pose = pose;
    tinted(u, pose, el.dataset.col).then((url) => { if (el.dataset.pose === pose) el.firstChild.src = url; });
    return true;
  }
  function makePose(k, col, flip) {
    const u = poseCfg(k);
    const el = document.createElement('div');
    el.className = `u u-${k} pose march`;
    el.dataset.k = k;
    el.dataset.col = col;
    const [w, h] = u.size || [180, 180];
    el.style.setProperty('--ph', u.height || HEIGHT[k] || 48);
    el.style.setProperty('--pr', (w / h).toFixed(3));
    el.style.setProperty('--c', col);
    el.style.animationDelay = `${(Math.random() * 0.5).toFixed(2)}s`;
    const img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    if ((u.facing === 'left') !== !!flip) img.className = 'flip';
    el.append(img);
    setPose(el, 'idle');
    return el;
  }

  TK.Sprite = {
    has: (k) => !!cfgOf(k) || !!poseCfg(k),
    hasPose: (k) => !!poseCfg(k),
    setPose,
    make: (k, col, flip) => (poseCfg(k) ? makePose(k, col, flip) : make(k, col, flip)),
    play,
    attack(el, delay) {
      if (el.classList.contains('fallen')) return;
      if (poseCfg(el.dataset.k)) {
        setTimeout(() => {
          if (el.classList.contains('fallen')) return;
          setPose(el, 'attack');
          el.classList.remove('lunge'); void el.offsetWidth; el.classList.add('lunge');
          clearTimeout(el._back);
          el._back = setTimeout(() => { if (!el.classList.contains('fallen')) { setPose(el, 'idle'); el.classList.remove('lunge'); } }, 520);
        }, delay || 0);
        return;
      }
      if (!cfgOf(el.dataset.k) || !cfgOf(el.dataset.k).anims.attack) return;
      setTimeout(() => { if (!el.classList.contains('fallen')) play(el, 'attack', true); }, delay || 0);
    },
    // 沒有倒下動畫的兵種直接淡出
    die(el) {
      if (poseCfg(el.dataset.k)) { clearTimeout(el._back); el.classList.remove('lunge'); return setPose(el, 'fall'); }
      const ok = play(el, 'die', true); el.classList.toggle('nodie', !ok); return ok;
    },
  };
})(globalThis.TK = globalThis.TK || {});
