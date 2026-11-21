/* 背景音樂：以 WebAudio 即時合成的原創中國風配樂（五聲音階：宮商角徵羽）。
 * 不使用任何外部音檔；旋律由各曲固定的種子依規則生成，每次播放都一樣。
 * 曲目：title 標題、domestic 內政、battle 戰鬥、event 事件、tense 緊張（火攻、夜襲、暴雨等場面）。 */
(function (TK) {
  'use strict';
  let ctx = null, master = null, on = true, current = null, timer = null;
  try { on = localStorage.getItem('zhanguo.music') !== '0'; } catch (e) { /* 用預設值 */ }

  // 取得共用的 AudioContext（js/audio.js）；換了新的 context 就重接輸出節點
  function ac() {
    const c = TK.Audio && TK.Audio.get();
    if (!c) return null; // 使用者還沒點過畫面
    if (c !== ctx) {
      ctx = c;
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
    }
    return ctx;
  }

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const PENTA = [0, 2, 4, 7, 9]; // 宮商角徵羽
  function scaleNote(root, deg) { const o = Math.floor(deg / 5), i = ((deg % 5) + 5) % 5; return root + o * 12 + PENTA[i]; }
  function rng(seed) { let x = seed >>> 0 || 1; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); }

  // ---------- 樂器 ----------
  // 撥弦（似古箏）：三角波＋快速衰減，略帶泛音
  function pluck(t, note, dur, vol) {
    const c = ctx, f = midi(note);
    for (const [mult, v] of [[1, 1], [2, 0.25], [3, 0.08]]) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = mult === 1 ? 'triangle' : 'sine';
      o.frequency.setValueAtTime(f * mult, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol * v, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.25, dur * 1.6));
      o.connect(g).connect(master);
      o.start(t); o.stop(t + dur * 1.7 + 0.05);
    }
  }
  // 笛：正弦波＋顫音，緩起緩收
  function flute(t, note, dur, vol) {
    const c = ctx, o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(midi(note), t);
    lfo.frequency.value = 5.2; lg.gain.value = midi(note) * 0.008;
    lfo.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.12, dur * 0.3));
    g.gain.setValueAtTime(vol, t + dur * 0.75);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
  }
  // 低音持續音
  function drone(t, note, dur, vol) {
    const c = ctx, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(midi(note), t);
    f.type = 'lowpass'; f.frequency.value = 380;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.4);
    g.gain.setValueAtTime(vol, t + dur - 0.4);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  // 戰鼓：低頻正弦掃頻＋短雜訊
  let noiseBuf = null;
  function drum(t, vol, low) {
    const c = ctx;
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(low ? 90 : 150, t);
    o.frequency.exponentialRampToValueAtTime(low ? 40 : 70, t + 0.25);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + 0.4);
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate * 0.2, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    }
    const n = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain();
    n.buffer = noiseBuf; nf.type = 'lowpass'; nf.frequency.value = 1200; ng.gain.value = vol * 0.35;
    n.connect(nf).connect(ng).connect(master);
    n.start(t);
  }
  // 鑼：金屬感的持續音
  function gong(t, vol) {
    const c = ctx;
    for (const [f, v] of [[110, 1], [163, 0.6], [247, 0.35], [331, 0.2]]) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * 0.97, t + 2.5);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol * v, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
      o.connect(g).connect(master);
      o.start(t); o.stop(t + 3.1);
    }
  }

  // ---------- 曲目 ----------
  // 每首曲：速度（每拍秒數）、調（MIDI 根音）、每小節拍數、主奏樂器、伴奏型態
  const TRACKS = {
    title: { beat: 0.42, root: 62, seed: 11, lead: 'flute', bars: 8, drone: true, pluck: 'arp', drum: 'slow', gongEvery: 8 },
    domestic: { beat: 0.38, root: 67, seed: 23, lead: 'pluck', bars: 8, drone: true, pluck: 'none', drum: 'none', rest: 0.35 },
    battle: { beat: 0.22, root: 57, seed: 37, lead: 'flute', bars: 4, drone: true, pluck: 'ostinato', drum: 'march', gongEvery: 4 },
    event: { beat: 0.5, root: 64, seed: 41, lead: 'flute', bars: 4, drone: true, pluck: 'arp', drum: 'none', rest: 0.25 },
    tense: { beat: 0.3, root: 56, seed: 53, lead: 'pluck', bars: 4, drone: true, pluck: 'ostinato', drum: 'heart', rest: 0.2 },
  };

  // 依種子生成一段旋律（每小節 4 拍；音符為 [音階度數, 拍數]，null 代表休止）
  function compose(tr) {
    const r = rng(tr.seed);
    const phrase = [];
    let deg = 5 + Math.floor(r() * 3);
    for (let bar = 0; bar < tr.bars; bar++) {
      let left = 4;
      while (left > 0) {
        const len = Math.min(left, [0.5, 1, 1, 1, 2, 1.5][Math.floor(r() * 6)]);
        if (r() < (tr.rest || 0.12)) phrase.push([null, len]);
        else {
          deg += [-2, -1, -1, 0, 1, 1, 2, 3][Math.floor(r() * 8)];
          deg = Math.max(2, Math.min(11, deg));
          // 每兩小節結尾回到宮或徵，聽起來比較完整
          if (left === len && bar % 2 === 1) deg = r() < 0.5 ? 5 : 8;
          phrase.push([deg, len]);
        }
        left -= len;
      }
    }
    return phrase;
  }

  // 排程器：每 50ms 檢查一次，提前 0.3 秒排入下一批音符
  function start(name) {
    const tr = TRACKS[name];
    if (!tr || !ac()) return;
    clearInterval(timer);
    const phrase = compose(tr);
    const barLen = tr.beat * 4;
    let nextBar = ctx.currentTime + 0.15, barIdx = 0, noteIdx = 0, noteTime = nextBar;
    const leadVol = tr.lead === 'flute' ? 0.09 : 0.14;
    timer = setInterval(() => {
      if (!ctx) return;
      const ahead = ctx.currentTime + 0.3;
      // 伴奏：以小節為單位
      while (nextBar < ahead) {
        const t = nextBar, b = barIdx;
        if (tr.drone && b % 2 === 0) drone(t, tr.root - 12, barLen * 2, 0.035);
        if (tr.pluck === 'arp') [0, 2, 4, 2].forEach((d, k) => pluck(t + k * tr.beat, scaleNote(tr.root - 12, d + (b % 4 === 3 ? 1 : 0)), tr.beat, 0.06));
        if (tr.pluck === 'ostinato') for (let k = 0; k < 8; k++) pluck(t + k * tr.beat / 2, scaleNote(tr.root - 12, [0, 0, 3, 0, 0, 4, 3, 1][k]), tr.beat / 2, 0.05);
        if (tr.drum === 'march') [0, 1, 2, 2.5, 3].forEach((k, i) => drum(t + k * tr.beat, i === 0 ? 0.32 : 0.18, i === 0));
        if (tr.drum === 'slow' && b % 2 === 0) drum(t, 0.18, true);
        if (tr.drum === 'heart') { drum(t, 0.2, true); drum(t + tr.beat * 0.6, 0.12, true); drum(t + tr.beat * 2, 0.2, true); drum(t + tr.beat * 2.6, 0.12, true); }
        if (tr.gongEvery && b % tr.gongEvery === 0) gong(t, 0.05);
        nextBar += barLen; barIdx++;
      }
      // 主旋律
      while (noteTime < ahead) {
        const [deg, len] = phrase[noteIdx];
        const dur = len * tr.beat;
        if (deg !== null) {
          const n = scaleNote(tr.root, deg);
          if (tr.lead === 'flute') flute(noteTime, n, dur * 0.95, leadVol);
          else pluck(noteTime, n, dur, leadVol);
        }
        noteTime += dur;
        noteIdx = (noteIdx + 1) % phrase.length;
      }
    }, 50);
  }

  function stop() {
    clearInterval(timer); timer = null;
    if (master && ctx && ctx.state !== 'closed') {
      try {
        // 淡出後換新的輸出節點，避免已排程的音符繼續響
        const old = master, t = ctx.currentTime;
        old.gain.setValueAtTime(old.gain.value, t);
        old.gain.linearRampToValueAtTime(0.0001, t + 0.4);
        setTimeout(() => old.disconnect(), 500);
        master = ctx.createGain();
        master.gain.value = 0.55;
        master.connect(ctx.destination);
      } catch (e) { /* 舊的 context 已失效，下次 ac() 會重接 */ }
    }
  }

  const M = {
    TRACKS: Object.keys(TRACKS),
    play(name) {
      if (current === name && timer) return;
      current = name;
      stop();
      if (on) start(name);
    },
    // 說話時壓低音樂
    duck(down) { if (master && ctx) master.gain.setTargetAtTime(down ? 0.18 : 0.55, ctx.currentTime, 0.15); },
    current: () => current,
    isOn: () => on,
    toggle() {
      on = !on;
      try { localStorage.setItem('zhanguo.music', on ? '1' : '0'); } catch (e) { /* 忽略 */ }
      if (on && current) { const c = current; current = null; M.play(c); } else stop();
      return on;
    },
    // 手機瀏覽器要在使用者點擊後才能發聲
    unlock() { if (on && current && !timer) { const c = current; current = null; M.play(c); } else ac(); },
  };
  // 使用者第一次點畫面（或音訊被中斷後重建）時，開始播放目前該播的曲子
  if (TK.Audio) TK.Audio.onReady(() => { if (on && current) { clearInterval(timer); timer = null; const c = current; current = null; M.play(c); } });
  TK.Music = M;
})(globalThis.TK = globalThis.TK || {});
