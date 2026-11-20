/* 晶片音樂風音效：以方波、三角波與雜訊即時合成（無外部音檔，旋律為原創）。 */
(function (TK) {
  'use strict';
  let ctx = null;
  let muted = false;
  try { muted = localStorage.getItem('qunxiong.mute') === '1'; } catch (e) { /* 無法存取時用預設值 */ }

  function ac() {
    if (muted || !TK.Audio) return null;
    return (ctx = TK.Audio.get());
  }

  function tone(freq, dur, type, vol, delay, slideTo) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.linearRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.05, t);
    g.gain.setValueAtTime(vol || 0.05, t + dur * 0.8);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, delay, hp) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + (delay || 0);
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    // 低解析度雜訊，模仿早期音源
    let v = 0;
    for (let i = 0; i < len; i++) { if (i % 8 === 0) v = Math.random() * 2 - 1; d[i] = v * (1 - i / len); }
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = buf; f.type = hp ? 'highpass' : 'lowpass'; f.frequency.value = hp || 900;
    g.gain.value = vol || 0.12;
    src.connect(f).connect(g).connect(c.destination);
    src.start(t);
  }

  // 音名轉頻率
  const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
  function seq(notes, step, type, vol, delay) {
    notes.forEach((n, i) => { if (n) tone(N(n), step * 0.9, type, vol, (delay || 0) + i * step); });
  }

  const S = {
    cursor() { tone(1320, 0.025, 'square', 0.025); },
    ok() { tone(988, 0.05, 'square', 0.04); tone(1319, 0.07, 'square', 0.04, 0.05); },
    cancel() { tone(784, 0.05, 'square', 0.035); tone(523, 0.07, 'square', 0.035, 0.05); },
    error() { tone(147, 0.18, 'square', 0.05); },
    type() { tone(1760, 0.012, 'square', 0.012); },
    drum(delay) { noise(0.09, 0.16, delay || 0, 0); tone(110, 0.08, 'triangle', 0.15, delay || 0, 55); },
    clash() { noise(0.08, 0.1, 0, 2500); tone(1500, 0.05, 'square', 0.02); },
    volley() { for (let i = 0; i < 5; i++) noise(0.04, 0.06, i * 0.05, 3000); },
    // 換月：簡短上行琶音
    month() { seq([72, 76, 79, 84], 0.09, 'square', 0.035); seq([48, 0, 55, 0], 0.09, 'triangle', 0.08); },
    // 出陣：戰鼓與號角
    march() { [0, 0.16, 0.32, 0.4].forEach((d) => S.drum(d)); seq([67, 0, 67, 72, 0, 74, 76], 0.1, 'square', 0.035, 0.5); },
    win() { seq([72, 76, 79, 84, 0, 79, 84], 0.11, 'square', 0.04); seq([48, 0, 55, 0, 60, 0, 60], 0.11, 'triangle', 0.09); },
    lose() { seq([69, 0, 65, 0, 62, 0, 57], 0.16, 'square', 0.035); seq([45, 0, 41, 0, 38, 0, 33], 0.16, 'triangle', 0.08); },
    title() { seq([62, 0, 69, 67, 69, 0, 74, 72, 69, 0, 67, 69], 0.15, 'square', 0.03); seq([38, 0, 0, 0, 45, 0, 0, 0, 43, 0, 0, 0], 0.15, 'triangle', 0.08); },
    event() { seq([79, 0, 76, 79, 84], 0.1, 'square', 0.03); },
    isMuted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem('qunxiong.mute', muted ? '1' : '0'); } catch (e) { /* 忽略 */ }
      if (!muted) S.ok();
      return muted;
    },
  };
  TK.Sound = S;
})(globalThis.TK = globalThis.TK || {});
