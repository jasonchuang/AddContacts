/* 事件台詞的人聲：使用瀏覽器內建的語音合成（Web Speech API），不需要網路或音檔。
 * 聲音品質取決於裝置（iPhone、Android、Windows、Mac 都內建中文語音）。
 * 依人物調整音高與語速：老將較低沉、年輕人較高、旁白平穩。 */
(function (TK) {
  'use strict';
  const synth = typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis : null;
  let on = true, voice = null;
  try { on = localStorage.getItem('minguo.voice') !== '0'; } catch (e) { /* 用預設值 */ }

  // 優先使用台灣中文語音，其次香港、中國
  function pickVoice() {
    if (!synth) return null;
    const vs = synth.getVoices() || [];
    const by = (re) => vs.find((v) => re.test(v.lang));
    voice = by(/^zh[-_]TW/i) || by(/^zh[-_]HK/i) || by(/^cmn|^zh[-_]CN/i) || by(/^zh/i) || null;
    return voice;
  }
  if (synth) {
    pickVoice();
    if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', pickVoice);
  }

  // 依武將特徵決定音高（0.6～1.4）與語速
  function tone(g) {
    if (!g) return { pitch: 1, rate: 0.95 };
    const t = TK.Portrait && TK.Portrait.traits ? TK.Portrait.traits(g) : {};
    let pitch = 1, rate = 1.02;
    if (t.age === 'old') { pitch = 0.75; rate = 0.92; }
    else if (t.age === 'young') { pitch = 1.15; rate = 1.06; }
    if (g.war >= 90 && t.age !== 'young') pitch -= 0.1; // 猛將聲音粗一點
    if (g.int >= 90) rate -= 0.04;                     // 謀士說話慢一點
    return { pitch: Math.max(0.6, Math.min(1.4, pitch)), rate };
  }

  const V = {
    available: () => !!synth,
    isOn: () => on && !!synth,
    toggle() {
      on = !on;
      try { localStorage.setItem('minguo.voice', on ? '1' : '0'); } catch (e) { /* 忽略 */ }
      if (!on) V.stop();
      return on;
    },
    // 朗讀一句；g 為武將（旁白傳 null）；回傳朗讀結束的 Promise
    speak(text, g) {
      if (!V.isOn() || !text) return Promise.resolve();
      V.stop();
      const clean = text.replace(/[（(][^）)]*[）)]/g, '').replace(/[「」『』]/g, '');
      if (!clean.trim()) return Promise.resolve();
      return new Promise((resolve) => {
        const u = new SpeechSynthesisUtterance(clean);
        u.lang = (voice && voice.lang) || 'zh-TW';
        if (voice) u.voice = voice;
        const t = tone(g);
        u.pitch = t.pitch; u.rate = t.rate; u.volume = 1;
        if (TK.Music) TK.Music.duck(true);
        // 朗讀完 iPhone 會把 WebAudio 中斷，要叫回來，不然音效、音樂都會沒聲音
        const done = () => { if (TK.Audio) TK.Audio.get(); if (TK.Music) TK.Music.duck(false); resolve(); };
        u.onend = done; u.onerror = done;
        synth.speak(u);
      });
    },
    stop() { if (synth) synth.cancel(); if (TK.Music) TK.Music.duck(false); },
  };
  TK.Voice = V;
})(globalThis.TK = globalThis.TK || {});
