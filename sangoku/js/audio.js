/* 共用的 AudioContext：音效（sound.js）與音樂（music.js）共用同一個。
 * 手機瀏覽器（尤其 iPhone Safari）的規則：
 *  1. 只有在「使用者操作」的事件裡（click、touchend、keydown，滑鼠的 pointerdown）建立或喚醒的 AudioContext 才會出聲；
 *     touchstart、手指的 pointerdown 不算。頁面一載入就建立的會一直卡在 suspended。
 *     所以這裡「只在使用者操作時建立」，在那之前音效與音樂都先不播。
 *  2. 朗讀（speechSynthesis）、來電、切到別的 App 之後，會變成 interrupted；下一次操作時喚醒，喚醒不了就重建一個。
 *  3. 側邊靜音開關會把網頁音效關掉；iOS 16.4 起把音訊類型設成 playback（媒體播放）就不受影響。 */
(function (TK) {
  'use strict';
  const AC = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
  let ctx = null;
  const listeners = [];
  const log = []; // 給「聲音診斷」看的最近事件

  function note(s) { log.push(`${new Date().toLocaleTimeString('zh-TW', { hour12: false })} ${s}`); if (log.length > 8) log.shift(); }

  // 取得可用的 AudioContext；尚未經過使用者操作時回傳 null（不建立）
  function get() {
    if (!ctx || ctx.state === 'closed') return null;
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    return ctx;
  }

  function create() {
    try { if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {}); } catch (e) { /* 忽略 */ }
    ctx = new AC();
    note(`建立 AudioContext（${ctx.state}）`);
    ctx.onstatechange = () => note(`狀態 → ${ctx.state}`);
  }

  function playbackSession() {
    try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch (e) { /* 舊版不支援 */ }
  }

  // 在使用者操作的事件裡呼叫：建立或喚醒，並播一段極短的無聲音訊（舊版 iOS 需要這樣才算真正解鎖）
  function unlock(force) {
    if (!AC) return;
    playbackSession();
    const fresh = force || !ctx || ctx.state === 'closed' || ctx.state === 'interrupted';
    if (fresh) create();
    if (ctx.state !== 'running') ctx.resume().catch((e) => note('喚醒失敗：' + e.message));
    try {
      const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource();
      s.buffer = b; s.connect(ctx.destination); s.start(0);
    } catch (e) { /* 忽略 */ }
    if (fresh) listeners.forEach((fn) => { try { fn(ctx); } catch (e) { /* 忽略 */ } });
  }

  function onGesture(e) {
    if (e.type === 'pointerdown' && e.pointerType !== 'mouse') return; // 手指的 pointerdown 在 iPhone 不算使用者操作
    if (!ctx || ctx.state !== 'running') unlock();
  }

  if (typeof document !== 'undefined') {
    for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) document.addEventListener(ev, onGesture, true);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && ctx) ctx.resume().catch(() => {}); });
  }

  // 診斷用：直接播一聲 440Hz（需在點擊事件中呼叫）
  function testTone() {
    unlock();
    const c = ctx; if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.frequency.value = 440; g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.65);
    note('播放測試音');
  }

  TK.Audio = {
    get, unlock, testTone,
    // 新的 AudioContext 建好時通知（音樂用來重接輸出並開始播放）
    onReady(fn) { listeners.push(fn); },
    state: () => (ctx ? ctx.state : '尚未啟用（還沒點過畫面）'),
    info: () => ({
      supported: !!AC,
      state: ctx ? ctx.state : 'none',
      sampleRate: ctx ? ctx.sampleRate : 0,
      session: typeof navigator !== 'undefined' && navigator.audioSession ? navigator.audioSession.type : '不支援',
      log: log.slice(),
    }),
  };
})(globalThis.TK = globalThis.TK || {});
