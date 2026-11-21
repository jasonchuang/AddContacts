/* 戰場士兵的 sprite sheet 動畫。圖檔與格子設定來自 sprites/sprites.json（由 build.js 轉成 TK.SPRITES）。
 * 沒有設定的兵種回傳 null，戰鬥畫面會改用程式畫的 SVG 士兵。
 * 動作：walk 行軍（必要）、attack 攻擊、die 倒下（沒有就退回 walk／淡出）。 */
(function (TK) {
  'use strict';
  const HEIGHT = { spear: 48, xbow: 48, cav: 60 }; // 桌機畫面上的預設高度（px）

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

  TK.Sprite = {
    has: (k) => !!cfgOf(k),
    make,
    play,
    attack(el, delay) {
      if (el.classList.contains('fallen') || !cfgOf(el.dataset.k) || !cfgOf(el.dataset.k).anims.attack) return;
      setTimeout(() => { if (!el.classList.contains('fallen')) play(el, 'attack', true); }, delay || 0);
    },
    // 沒有倒下動畫的兵種直接淡出
    die(el) { const ok = play(el, 'die', true); el.classList.toggle('nodie', !ok); return ok; },
  };
})(globalThis.TK = globalThis.TK || {});
