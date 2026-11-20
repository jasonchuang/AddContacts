/* 共用的 AudioContext：音效（sound.js）與音樂（music.js）共用同一個，避免手機上兩個互相搶音訊。
 * iPhone 的幾個坑：
 *  1. AudioContext 必須在使用者點擊時 resume，否則一直是 suspended。
 *  2. 朗讀（speechSynthesis）或來電後會變成 interrupted，要再 resume。
 *  3. 側邊靜音開關打開時 WebAudio 會被靜音；把音訊類型設成 playback（媒體播放）就不受靜音開關影響。 */
(function (TK) {
  'use strict';
  let ctx = null;

  function get() {
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      return ctx;
    } catch (e) { return null; }
  }

  // iOS 16.4+：音訊類型設為 playback，靜音開關不會把遊戲聲音關掉
  function playbackSession() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* 舊版不支援 */ }
  }

  // 每次點擊或按鍵都檢查一次（處理第一次啟用、朗讀後、切回 App 後被中斷的情況）
  function unlock() {
    playbackSession();
    const c = get();
    if (!c) return;
    // iOS 舊版：播一段極短的無聲音訊才算真正解鎖
    if (!unlock.done) {
      try {
        const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource();
        s.buffer = b; s.connect(c.destination); s.start(0);
        unlock.done = true;
      } catch (e) { /* 忽略 */ }
    }
  }

  if (typeof document !== 'undefined') {
    for (const ev of ['pointerdown', 'touchend', 'keydown']) document.addEventListener(ev, unlock, true);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && ctx) ctx.resume().catch(() => {}); });
  }

  TK.Audio = { get, unlock, state: () => (ctx ? ctx.state : 'none') };
})(globalThis.TK = globalThis.TK || {});
