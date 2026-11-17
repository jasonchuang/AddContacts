/* 以 WebAudio 即時合成的簡單音效（無外部音檔）。 */
(function (TK) {
  'use strict';
  let ctx = null;
  let muted = false;
  try { muted = localStorage.getItem('qunxiong.mute') === '1'; } catch (e) { /* 無法存取時用預設值 */ }

  function ac() {
    if (muted) return null;
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }

  function tone(freq, dur, type, vol, delay, slide) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, delay, lp) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + (delay || 0);
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = buf; f.type = 'lowpass'; f.frequency.value = lp || 800;
    g.gain.value = vol || 0.3;
    src.connect(f).connect(g).connect(c.destination);
    src.start(t);
  }

  const S = {
    click() { tone(660, 0.06, 'triangle', 0.08); },
    error() { tone(200, 0.15, 'square', 0.05); },
    drum(delay) { tone(110, 0.25, 'sine', 0.35, delay, 50); noise(0.12, 0.15, delay, 400); },
    clash() { noise(0.18, 0.25, 0, 3500); tone(1200, 0.12, 'square', 0.03, 0, 600); },
    gong() { [196, 247, 294].forEach((f, i) => tone(f, 2.2, 'sine', 0.12, i * 0.01)); },
    win() { [392, 494, 587, 784].forEach((f, i) => tone(f, 0.35, 'triangle', 0.12, i * 0.12)); },
    lose() { [330, 294, 247, 196].forEach((f, i) => tone(f, 0.45, 'sine', 0.12, i * 0.18)); },
    month() { S.drum(0); S.drum(0.25); S.drum(0.5); },
    isMuted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem('qunxiong.mute', muted ? '1' : '0'); } catch (e) { /* 忽略 */ }
      if (!muted) S.click();
      return muted;
    },
  };
  TK.Sound = S;
})(globalThis.TK = globalThis.TK || {});
