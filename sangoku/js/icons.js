/* 自繪 SVG 圖示：士兵、騎兵、資源、指令。全部為本作原創的簡單向量圖。 */
(function (TK) {
  'use strict';

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
    const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  // 步兵：頭盔、長槍、盾牌、衣甲為勢力色
  function soldier(color, opts) {
    opts = opts || {};
    const dark = shade(color, -0.25), light = shade(color, 0.18);
    const flip = opts.flip ? ' transform="translate(24 0) scale(-1 1)"' : '';
    return `<svg viewBox="0 0 24 32" class="${opts.cls || ''}" aria-hidden="true"><g${flip}>
      <line x1="19" y1="2" x2="19" y2="31" stroke="#7a4a22" stroke-width="1.6"/>
      <path d="M19 0 L21 5 L17 5 Z" fill="#dfe6ea" stroke="#5b6670" stroke-width=".5"/>
      <rect x="8" y="24" width="3" height="7" rx="1" fill="#3a2a1e"/>
      <rect x="12.5" y="24" width="3" height="7" rx="1" fill="#3a2a1e"/>
      <path d="M7 13 Q11.5 11 16 13 L16.5 25 L6.5 25 Z" fill="${color}" stroke="${dark}" stroke-width=".8"/>
      <rect x="6.6" y="19" width="9.8" height="2" fill="#e2b54a"/>
      <line x1="15.5" y1="15" x2="19" y2="17" stroke="#f1c99a" stroke-width="2" stroke-linecap="round"/>
      <circle cx="11.5" cy="8.5" r="3.6" fill="#f1c99a"/>
      <path d="M7.4 8.2 Q11.5 1.5 15.6 8.2 Z" fill="${light}" stroke="${dark}" stroke-width=".7"/>
      <path d="M11.5 3 Q12.5 0 14.5 0.6" fill="none" stroke="#d63a2a" stroke-width="1.6" stroke-linecap="round"/>
      <ellipse cx="6.5" cy="18" rx="4" ry="5.5" fill="${dark}" stroke="#e2b54a" stroke-width="1"/>
      <circle cx="6.5" cy="18" r="1.3" fill="#e2b54a"/>
    </g></svg>`;
  }

  // 騎兵：用於戰鬥畫面的主將
  function cavalry(color, opts) {
    opts = opts || {};
    const dark = shade(color, -0.25), light = shade(color, 0.18);
    const flip = opts.flip ? ' transform="translate(40 0) scale(-1 1)"' : '';
    return `<svg viewBox="0 0 40 36" class="${opts.cls || ''}" aria-hidden="true"><g${flip}>
      <path d="M6 22 Q8 15 18 15 L28 15 Q33 12 35 8 L38 10 Q37 15 33 18 L32 24 Q30 27 26 26 L12 26 Q7 27 6 22 Z" fill="#8a5a33" stroke="#4a2e18" stroke-width=".8"/>
      <rect x="10" y="25" width="2.6" height="10" fill="#5e3b20"/><rect x="15" y="25" width="2.6" height="10" fill="#5e3b20"/>
      <rect x="24" y="25" width="2.6" height="10" fill="#5e3b20"/><rect x="29" y="24" width="2.6" height="11" fill="#5e3b20"/>
      <path d="M5 21 Q1 23 2 29" stroke="#3a2412" stroke-width="2" fill="none"/>
      <path d="M33 9 L35 4 L36.5 9" fill="#3a2412"/>
      <rect x="14" y="14" width="12" height="4" rx="1" fill="${color}"/>
      <path d="M16 15 L17 6 Q20 4 23 6 L24 15 Z" fill="${color}" stroke="${dark}" stroke-width=".8"/>
      <circle cx="20" cy="3.8" r="3" fill="#f1c99a"/>
      <path d="M16.8 3.6 Q20 -2 23.2 3.6 Z" fill="${light}" stroke="${dark}" stroke-width=".6"/>
      <line x1="25" y1="1" x2="31" y2="20" stroke="#7a4a22" stroke-width="1.4"/>
      <path d="M24.4 -1 L26.5 2.8 L23.6 2.6 Z" fill="#dfe6ea"/>
    </g></svg>`;
  }

  // 旗幟
  function flag(color, text) {
    return `<svg viewBox="0 0 28 36" aria-hidden="true">
      <line x1="3" y1="1" x2="3" y2="35" stroke="#5e3b20" stroke-width="2"/>
      <path d="M4 3 L26 3 L22 11 L26 19 L4 19 Z" fill="${color}" stroke="${shade(color, -0.3)}" stroke-width="1"/>
      <text x="14" y="15" font-size="11" text-anchor="middle" fill="#fff" font-weight="700">${text || ''}</text>
    </svg>`;
  }

  // 資源與指令圖示（每個都有自己的配色）
  const ICONS = {
    gold: `<svg viewBox="0 0 24 24"><ellipse cx="12" cy="17" rx="9" ry="4" fill="#b8860b"/><ellipse cx="12" cy="15" rx="9" ry="4" fill="#f2c94c" stroke="#b8860b"/><ellipse cx="12" cy="10" rx="7" ry="3.2" fill="#f7d76b" stroke="#b8860b"/><rect x="10" y="8.6" width="4" height="2.8" fill="#b8860b"/></svg>`,
    food: `<svg viewBox="0 0 24 24"><path d="M5 9 Q12 5 19 9 L20 20 Q12 23 4 20 Z" fill="#c9a26b" stroke="#7a5a2c"/><path d="M6 9 Q12 12 18 9" fill="none" stroke="#7a5a2c"/><path d="M12 9 Q10 3 12 1 Q14 3 12 9" fill="#e9c46a"/><path d="M12 9 Q7 5 6 2 Q10 3 12 9" fill="#f4d58d"/><path d="M12 9 Q17 5 18 2 Q14 3 12 9" fill="#f4d58d"/><text x="12" y="19" font-size="7" text-anchor="middle" fill="#5a3d16" font-weight="700">米</text></svg>`,
    troops: `<svg viewBox="0 0 24 24"><line x1="17" y1="1" x2="17" y2="23" stroke="#7a4a22" stroke-width="1.6"/><path d="M17 0 L19 4 L15 4 Z" fill="#dfe6ea"/><circle cx="10" cy="7" r="3.2" fill="#f1c99a"/><path d="M6.6 6.6 Q10 1 13.4 6.6 Z" fill="#c0392b"/><path d="M6 11 Q10 9.5 14 11 L14.5 20 L5.5 20 Z" fill="#c0392b"/><ellipse cx="5.5" cy="15" rx="3.2" ry="4.5" fill="#7b241c" stroke="#f2c94c"/></svg>`,
    city: `<svg viewBox="0 0 24 24"><path d="M2 21 V11 H4.5 V8 H7 V11 H9.5 V8 H14.5 V11 H17 V8 H19.5 V11 H22 V21 Z" fill="#9aa5b1" stroke="#4a5560"/><path d="M9.5 21 V16 a2.5 2.5 0 0 1 5 0 V21 Z" fill="#3a2a1e"/><path d="M7 8 L12 3 L17 8 Z" fill="#c0392b"/></svg>`,
    general: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#8e44ad" stroke="#f2c94c" stroke-width="1.5"/><text x="12" y="16.5" font-size="12" text-anchor="middle" fill="#fff" font-weight="700">將</text></svg>`,
    pop: `<svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="3.2" fill="#e0a96d"/><path d="M3 20 Q3 12 8 12 Q13 12 13 20 Z" fill="#2e86c1"/><circle cx="16" cy="9" r="3" fill="#f1c99a"/><path d="M11.5 20 Q11.5 13 16 13 Q20.5 13 20.5 20 Z" fill="#27ae60"/></svg>`,
    farm: `<svg viewBox="0 0 24 24"><rect x="1" y="15" width="22" height="7" rx="2" fill="#8d6e3f"/><path d="M4 15 V8 M8 15 V6 M12 15 V7 M16 15 V5 M20 15 V8" stroke="#2ecc71" stroke-width="2" stroke-linecap="round"/><circle cx="4" cy="7" r="1.6" fill="#f1c40f"/><circle cx="8" cy="5" r="1.6" fill="#f1c40f"/><circle cx="12" cy="6" r="1.6" fill="#f1c40f"/><circle cx="16" cy="4" r="1.6" fill="#f1c40f"/><circle cx="20" cy="7" r="1.6" fill="#f1c40f"/></svg>`,
    commerce: `<svg viewBox="0 0 24 24"><path d="M3 9 L5 3 H19 L21 9 Z" fill="#e74c3c"/><path d="M3 9 Q5 11 7 9 Q9 11 12 9 Q15 11 17 9 Q19 11 21 9" fill="#fff" stroke="#e74c3c"/><rect x="4" y="10" width="16" height="11" fill="#f5deb3" stroke="#8b5a2b"/><rect x="9" y="14" width="6" height="7" fill="#8b5a2b"/><circle cx="18" cy="17" r="3" fill="#f2c94c" stroke="#b8860b"/></svg>`,
    defense: `<svg viewBox="0 0 24 24"><path d="M2 22 V10 H5 V7 H8 V10 H10 V7 H14 V10 H16 V7 H19 V10 H22 V22 Z" fill="#95a5a6" stroke="#4d5656"/><path d="M2 14 H22 M2 18 H22 M7 10 V14 M12 14 V18 M17 10 V14 M7 18 V22 M17 18 V22" stroke="#4d5656" stroke-width=".8"/><path d="M12 1 L13 4 H11 Z" fill="#e67e22"/></svg>`,
    order: `<svg viewBox="0 0 24 24"><rect x="10.5" y="9" width="3" height="14" rx="1" fill="#8b5a2b"/><path d="M12 1 Q17 5 15 9 Q12 11 9 9 Q7 5 12 1 Z" fill="#e67e22"/><path d="M12 4 Q14.5 6.5 13.5 8.5 Q12 9.5 10.5 8.5 Q9.5 6.5 12 4 Z" fill="#f9e79f"/></svg>`,
    train: `<svg viewBox="0 0 24 24"><ellipse cx="12" cy="7" rx="9" ry="3.5" fill="#f5cba7" stroke="#8b4513"/><path d="M3 7 V17 Q12 22 21 17 V7" fill="#c0392b" stroke="#8b4513"/><path d="M3 11 L21 11 M7 8 L5 17 M17 8 L19 17 M12 10 V19" stroke="#f2c94c" stroke-width=".9"/><line x1="16" y1="1" x2="21" y2="5" stroke="#5e3b20" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    draft: `<svg viewBox="0 0 24 24"><path d="M3 21 V3" stroke="#5e3b20" stroke-width="2"/><path d="M4 3 H20 L17 8 L20 13 H4 Z" fill="#27ae60" stroke="#145a32"/><text x="11.5" y="11" font-size="7" text-anchor="middle" fill="#fff" font-weight="700">募</text><circle cx="15" cy="17" r="2" fill="#f1c99a"/><path d="M12 23 Q12 19 15 19 Q18 19 18 23 Z" fill="#2980b9"/></svg>`,
    search: `<svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6.5" fill="#d6eaf8" stroke="#2c3e50" stroke-width="2"/><path d="M7 8 Q9 6 11 7" stroke="#fff" stroke-width="1.5" fill="none"/><line x1="15" y1="15" x2="22" y2="22" stroke="#8b5a2b" stroke-width="3" stroke-linecap="round"/></svg>`,
    recruit: `<svg viewBox="0 0 24 24"><path d="M2 13 L7 9 L12 12 L17 9 L22 13 L15 19 Q12 21 9 19 Z" fill="#f1c99a" stroke="#a0522d"/><path d="M2 13 L6 9 L2 7 Z M22 13 L18 9 L22 7 Z" fill="#2980b9"/><circle cx="12" cy="4" r="3" fill="#f2c94c" stroke="#b8860b"/></svg>`,
    reward: `<svg viewBox="0 0 24 24"><rect x="3" y="10" width="18" height="12" rx="1" fill="#c0392b" stroke="#7b241c"/><rect x="2" y="7" width="20" height="4" rx="1" fill="#e74c3c" stroke="#7b241c"/><rect x="10.5" y="7" width="3" height="15" fill="#f2c94c"/><path d="M12 7 Q7 1 6 5 Q6 7 12 7 Q18 7 18 5 Q17 1 12 7" fill="#f2c94c" stroke="#b8860b"/></svg>`,
    move: `<svg viewBox="0 0 24 24"><path d="M2 15 Q5 9 11 10 L15 10 Q18 7 19 4 L21 5 Q21 9 18 12 L17 16 L5 16 Q2 17 2 15 Z" fill="#a0522d"/><rect x="5" y="15" width="2" height="7" fill="#6e3b1f"/><rect x="9" y="15" width="2" height="7" fill="#6e3b1f"/><rect x="13" y="15" width="2" height="7" fill="#6e3b1f"/><rect x="16" y="15" width="2" height="7" fill="#6e3b1f"/><path d="M8 9 L8 4 L13 4" stroke="#27ae60" stroke-width="2" fill="none"/><path d="M12 2 L15 4 L12 6 Z" fill="#27ae60"/></svg>`,
    attack: `<svg viewBox="0 0 24 24"><line x1="4" y1="4" x2="19" y2="19" stroke="#bdc3c7" stroke-width="2.6" stroke-linecap="round"/><line x1="20" y1="4" x2="5" y2="19" stroke="#bdc3c7" stroke-width="2.6" stroke-linecap="round"/><line x1="15" y1="18" x2="19" y2="14" stroke="#c0392b" stroke-width="3" stroke-linecap="round"/><line x1="9" y1="18" x2="5" y2="14" stroke="#c0392b" stroke-width="3" stroke-linecap="round"/><circle cx="12" cy="12" r="2" fill="#f2c94c"/></svg>`,
    prisoner: `<svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="5" fill="none" stroke="#7f8c8d" stroke-width="2.4"/><circle cx="16" cy="12" r="5" fill="none" stroke="#95a5a6" stroke-width="2.4"/><circle cx="12" cy="4" r="2" fill="#f1c99a"/></svg>`,
  };

  function icon(name, cls) {
    return (ICONS[name] || '').replace('<svg ', `<svg class="ico ${cls || ''}" aria-hidden="true" `);
  }

  TK.Icons = { soldier, cavalry, flag, icon, shade, ICONS };
})(globalThis.TK = globalThis.TK || {});
