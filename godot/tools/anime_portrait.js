// 原創動畫風（賽璐璐）武將半身像產生器。依外觀特徵組合 SVG，由 render_portraits.js 輸出成 PNG。
// viewBox 0 0 200 250；mode 'head' 時裁切臉部。
'use strict';

const INK = '#2b2233';
const SKIN = {
  normal: ['#ffd9b8', '#f0b48e'], fair: ['#ffe4cc', '#f2c1a0'], tan: ['#e9b07e', '#c98a5a'],
  red: ['#d9533f', '#a9382a'], dark: ['#b37a4f', '#8a5a36'],
};
const HAIR = {
  black: ['#2a2838', '#4a5070', '#151320'], brown: ['#5a3a28', '#8a6040', '#3a2418'],
  grey: ['#8a8c96', '#b8bac4', '#5a5c66'], white: ['#e8e8ee', '#ffffff', '#b8b8c4'],
};

function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgb(a) { return '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
function shade(c, k) { return rgb(hex(c).map((v) => (k < 0 ? v * (1 + k) : v + (255 - v) * k))); }
function mix(a, b, k) { const A = hex(a), B = hex(b); return rgb(A.map((v, i) => v * (1 - k) + B[i] * k)); }

function nameHash(s) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
  return h;
}

function svg(g, color, mode, t) {
  const hv = nameHash(g.name);
  const fringeStyle = t.fringe || ['spiky', 'part', 'swept'][(hv >>> 11) % 3];
  const square = t.jaw ? t.jaw === 'square' : (t.eyes === 'fierce' && t.age !== 'young' && (hv >>> 13) % 2 === 0);
  const [skin, skinS] = SKIN[t.skin] || SKIN.normal;
  const [hair, hairHi, hairS] = HAIR[t.hair] || HAIR.black;
  const cloth = t.armor ? '#e8ecf2' : color;
  const clothS = shade(cloth, -0.32), clothL = shade(cloth, 0.25);
  const O = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
  const o = `stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;
  const eyeC = t.eyeColor || (t.skin === 'red' ? '#3a2418' : '#4a2e1c');
  const old = t.age === 'old', young = t.age === 'young';
  const p = [];

  // 背景
  p.push(`<defs><radialGradient id="bg" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="#eef2f8"/><stop offset="1" stop-color="#b9c6d8"/></radialGradient></defs>`);
  p.push(`<rect width="200" height="250" fill="url(#bg)"/>`);
  p.push(`<circle cx="100" cy="118" r="86" fill="${mix(color, '#ffffff', 0.55)}" opacity=".55"/>`);

  // 長兵器（身後）
  const steel = '#e9eef4', steelS = '#a9b4c2', wood = '#8a5a33';
  const shaft = (y1) => `<path d="M168,252 L168,${y1}" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M168,252 L168,${y1}" stroke="${wood}" stroke-width="5" stroke-linecap="round"/>`;
  const blade = (d) => `<path d="${d}" fill="${steel}" ${o}/>`;
  switch (t.weapon) {
    case 'spear': p.push(shaft(30), blade('M168,0 L177,32 L159,32 Z'), `<path d="M160,34 Q168,52 176,34 Z" fill="#e0453a" ${o}/>`); break;
    case 'snake': p.push(shaft(36), `<path d="M168,38 Q180,26 168,16 Q156,6 168,-6" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M168,38 Q180,26 168,16 Q156,6 168,-6" fill="none" stroke="${steel}" stroke-width="5" stroke-linecap="round"/>`, `<path d="M160,40 Q168,56 176,40 Z" fill="#e0453a" ${o}/>`); break;
    case 'glaive': p.push(shaft(40), blade('M168,6 Q204,16 196,70 Q186,52 168,52 Z'), `<path d="M174,18 Q190,28 188,50" fill="none" stroke="#2f9e5b" stroke-width="3"/>`); break;
    case 'halberd': p.push(shaft(30), blade('M168,0 L176,28 L160,28 Z'), blade('M168,36 Q192,32 196,56 Q182,48 168,52 Z'), blade('M168,36 Q144,32 140,56 Q154,48 168,52 Z')); break;
    case 'axe': p.push(shaft(56), blade('M168,56 Q206,44 200,96 Q186,82 168,84 Z')); break;
    case 'bow': p.push(`<path d="M148,168 L170,118" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M148,168 L170,118" stroke="#7a4a22" stroke-width="8" stroke-linecap="round"/><path d="M160,120 L164,102 M168,124 L176,108 M154,118 L152,100" stroke="#e0453a" stroke-width="4" stroke-linecap="round"/>`); break;
    default: break;
  }
  if (t.weapon === 'sword' || t.weapon === 'twin') {
    p.push(`<path d="M146,196 L176,108" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M146,196 L176,108" stroke="${steel}" stroke-width="5" stroke-linecap="round"/><path d="M138,184 L158,194" stroke="#d8a93a" stroke-width="7" stroke-linecap="round"/>`);
    if (t.weapon === 'twin') p.push(`<path d="M54,196 L24,108" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M54,196 L24,108" stroke="${steel}" stroke-width="5" stroke-linecap="round"/><path d="M62,184 L42,194" stroke="#d8a93a" stroke-width="7" stroke-linecap="round"/>`);
  }

  // 後髮（長髮、髮髻）
  const capped = t.hat === 'helmet' || t.hat === 'feather' || t.hat === 'bald';
  if (!capped) p.push(`<path d="M58,104 Q50,60 100,46 Q150,60 142,104 L146,150 Q128,140 122,120 L78,120 Q72,140 54,150 Z" fill="${hairS}" ${O}/>`);

  // 身體
  const robe = t.robe;
  if (t.hat === 'crown' && !robe) p.push(`<path d="M22,252 Q24,190 70,178 L130,178 Q176,190 178,252 Z" fill="${shade(cloth, -0.45)}" ${O}/>`);
  p.push(`<path d="M30,252 Q30,198 78,184 L122,184 Q170,198 170,252 Z" fill="${cloth}" ${O}/>`);
  p.push(`<path d="M100,184 L122,184 Q170,198 170,252 L118,252 Z" fill="${clothS}" opacity=".85"/>`);
  if (robe) {
    p.push(`<path d="M80,184 L100,224 L120,184" fill="#fbf7ee" ${o}/><path d="M84,186 L112,236" stroke="${clothS}" stroke-width="5"/><path d="M58,236 L142,236" stroke="${clothS}" stroke-width="6"/>`);
    p.push(`<path d="M44,214 Q60,206 74,212" stroke="${clothL}" stroke-width="3" fill="none"/>`);
  } else {
    p.push(`<path d="M74,190 Q100,204 126,190 L126,214 Q100,226 74,214 Z" fill="${shade(cloth, -0.15)}" ${o}/>`);
    for (let y = 216; y < 250; y += 9) p.push(`<path d="M62,${y} Q100,${y + 7} 138,${y}" stroke="${clothS}" stroke-width="2" fill="none"/>`);
    p.push(`<circle cx="100" cy="206" r="10" fill="#e9eef4" ${o}/><path d="M95,201 Q99,198 103,201" stroke="#fff" stroke-width="2" fill="none"/>`);
    p.push(`<path d="M30,214 Q30,186 62,182 Q80,186 78,206 Q60,218 30,214 Z" fill="#e2b54a" ${O}/><path d="M170,214 Q170,186 138,182 Q120,186 122,206 Q140,218 170,214 Z" fill="#c8992e" ${O}/>`);
    p.push(`<path d="M40,196 Q54,188 66,192" stroke="#ffe6a0" stroke-width="3" fill="none"/>`);
  }

  // 脖子
  p.push(`<path d="M86,150 L86,186 Q100,194 114,186 L114,150 Z" fill="${skinS}" ${o}/>`);

  // 臉
  const chinY = young ? 160 : 162;
  const face = t.fat
    ? `M62,96 Q58,140 82,154 Q94,${chinY + 2} 100,${chinY + 3} Q106,${chinY + 2} 118,154 Q142,140 138,96 Q138,62 100,60 Q62,62 62,96 Z`
    : square
      ? `M66,96 Q64,138 80,152 Q90,${chinY + 1} 100,${chinY + 1} Q110,${chinY + 1} 120,152 Q136,138 134,96 Q134,62 100,60 Q66,62 66,96 Z`
      : `M66,96 Q64,132 84,150 Q94,${chinY} 100,${chinY + 1} Q106,${chinY} 116,150 Q136,132 134,96 Q134,62 100,60 Q66,62 66,96 Z`;
  p.push(`<path d="M64,104 Q56,104 58,116 Q60,126 68,126 Z" fill="${skin}" ${o}/><path d="M136,104 Q144,104 142,116 Q140,126 132,126 Z" fill="${skin}" ${o}/>`);
  p.push(`<path d="${face}" fill="${skin}" ${O}/>`);
  p.push(`<path d="M134,96 Q136,132 116,150 Q106,${chinY} 100,${chinY + 1} Q118,140 124,112 Q128,92 120,70 Q134,78 134,96 Z" fill="${skinS}" opacity=".55"/>`);
  if (old) p.push(`<path d="M80,84 Q90,80 98,84 M102,84 Q110,80 120,84 M78,128 Q82,134 86,136 M122,128 Q118,134 114,136" stroke="${skinS}" stroke-width="2" fill="none"/>`);

  // 眼睛
  const brow = old ? hair : hairS;
  const eyeY = 110;
  const eye = (cx, flip) => {
    const s = flip ? -1 : 1;
    const out = [];
    if (t.eyes === 'sly') {
      out.push(`<path d="M${cx - 11 * s},${eyeY} L${cx + 11 * s},${eyeY - 3} Q${cx},${eyeY + 8} ${cx - 11 * s},${eyeY} Z" fill="#ffffff"/>`);
      out.push(`<ellipse cx="${cx + 2 * s}" cy="${eyeY + 2}" rx="5" ry="4.5" fill="${eyeC}"/><circle cx="${cx + 2 * s}" cy="${eyeY + 2}" r="2" fill="${INK}"/>`);
      out.push(`<circle cx="${cx + 4 * s}" cy="${eyeY}" r="1.6" fill="#ffffff"/>`);
      out.push(`<path d="M${cx - 13 * s},${eyeY + 1} L${cx + 13 * s},${eyeY - 4}" stroke="${INK}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`);
      out.push(`<path d="M${cx - 7 * s},${eyeY + 6} Q${cx},${eyeY + 7} ${cx + 8 * s},${eyeY + 3}" stroke="${INK}" stroke-width="1.5" fill="none" opacity=".6"/>`);
      return out.join('');
    }
    const h = t.eyes === 'fierce' ? 8 : old ? 8 : 11;
    const w = 11;
    out.push(`<path d="M${cx - w},${eyeY} Q${cx},${eyeY - h - 3} ${cx + w},${eyeY} Q${cx},${eyeY + h} ${cx - w},${eyeY} Z" fill="#ffffff"/>`);
    out.push(`<ellipse cx="${cx + s}" cy="${eyeY + 1}" rx="${t.eyes === 'fierce' ? 5.5 : 7}" ry="${h - 1}" fill="${eyeC}"/>`);
    out.push(`<ellipse cx="${cx + s}" cy="${eyeY - h / 2 + 2}" rx="${t.eyes === 'fierce' ? 5.5 : 7}" ry="${h / 2}" fill="${shade(eyeC, -0.45)}" opacity=".7"/>`);
    out.push(`<circle cx="${cx + s}" cy="${eyeY + 2}" r="2.6" fill="${INK}"/>`);
    out.push(`<circle cx="${cx + 3 * s}" cy="${eyeY - 3}" r="2.6" fill="#ffffff"/><circle cx="${cx - 3 * s}" cy="${eyeY + 5}" r="1.3" fill="#ffffff"/>`);
    // 上眼線（較粗）與眼尾
    const lid = t.eyes === 'fierce'
      ? `M${cx - w - 2 * s},${eyeY - 1} Q${cx - 2 * s},${eyeY - h - 4} ${cx + w + 3 * s},${eyeY - 4}`
      : `M${cx - w - 2 * s},${eyeY + 1} Q${cx},${eyeY - h - 5} ${cx + w + 2 * s},${eyeY}`;
    out.push(`<path d="${lid}" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`);
    out.push(`<path d="M${cx - 6 * s},${eyeY + h - 1} Q${cx},${eyeY + h + 1} ${cx + 7 * s},${eyeY + h - 2}" stroke="${INK}" stroke-width="1.5" fill="none" opacity=".6"/>`);
    return out.join('');
  };
  if (t.eyes === 'sly') {
    p.push(`<path d="M73,96 Q84,90 96,92" stroke="${brow}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M104,92 Q116,90 127,96" stroke="${brow}" stroke-width="4" fill="none" stroke-linecap="round"/>`);
  } else if (t.eyes === 'fierce') {
    p.push(`<path d="M72,93 L96,101" stroke="${brow}" stroke-width="6" stroke-linecap="round"/><path d="M128,93 L104,101" stroke="${brow}" stroke-width="6" stroke-linecap="round"/>`);
  } else {
    p.push(`<path d="M74,95 Q84,88 95,93" stroke="${brow}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M105,93 Q116,88 126,95" stroke="${brow}" stroke-width="4" fill="none" stroke-linecap="round"/>`);
  }
  p.push(eye(85, false), eye(115, true));
  if (t.patch) p.push(`<path d="M60,88 L140,116" stroke="${INK}" stroke-width="3"/><path d="M72,102 Q85,96 98,103 Q98,118 85,120 Q72,118 72,102 Z" fill="${INK}"/>`);

  // 鼻、嘴、腮紅
  p.push(`<path d="M100,122 L97,132 L101,133" stroke="${skinS}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`);
  if (!old && t.skin !== 'red' && t.skin !== 'dark') p.push(`<ellipse cx="76" cy="128" rx="7" ry="3.5" fill="#ff8f80" opacity=".35"/><ellipse cx="124" cy="128" rx="7" ry="3.5" fill="#ff8f80" opacity=".35"/>`);
  const mouth = t.eyes === 'fierce' ? 'M90,145 Q100,140 110,145' : t.eyes === 'sly' ? 'M91,142 Q102,147 110,139' : 'M91,141 Q100,147 109,141';
  p.push(`<path d="${mouth}" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`);

  // 鬍鬚
  const bc = hair, bcS = hairS, bcH = hairHi;
  const stache = `<path d="M84,137 Q92,131 100,135 Q108,131 116,137 Q110,142 100,139 Q90,142 84,137 Z" fill="${bc}" ${o}/>`;
  switch (t.beard) {
    case 'long':
      p.push(`<path d="M76,140 Q80,160 92,170 L96,206 L100,226 L104,206 L108,170 Q120,160 124,140 Q114,154 100,154 Q86,154 76,140 Z" fill="${bc}" ${o}/>`, stache);
      p.push(`<path d="M96,172 L99,214 M104,172 L101,210" stroke="${bcH}" stroke-width="1.5" fill="none" opacity=".7"/>`);
      break;
    case 'full':
      p.push(`<path d="M62,104 Q58,150 80,166 L86,158 L90,172 L98,160 L102,174 L108,160 L114,172 L118,158 L122,166 Q142,150 138,104 Q134,140 118,150 Q100,158 82,150 Q66,140 62,104 Z" fill="${bc}" ${o}/>`, stache);
      p.push(`<path d="M76,150 Q84,156 90,154" stroke="${bcH}" stroke-width="1.5" fill="none" opacity=".6"/>`);
      break;
    case 'short':
      p.push(`<path d="M76,142 Q82,166 100,168 Q118,166 124,142 Q114,154 100,154 Q86,154 76,142 Z" fill="${bc}" ${o}/>`, stache);
      break;
    case 'goatee':
      p.push(`<path d="M94,152 Q100,176 106,152 Q100,156 94,152 Z" fill="${bc}" ${o}/>`, `<path d="M88,137 Q94,133 100,135 Q106,133 112,137" stroke="${bc}" stroke-width="3" fill="none" stroke-linecap="round"/>`);
      break;
    case 'mustache': p.push(stache); break;
    default: break;
  }

  // 瀏海（動畫風的髮束）
  const FRINGE = {
    spiky: 'M64,100 Q60,58 100,52 Q140,58 136,100 L128,82 L122,98 L114,78 L106,96 L98,76 L90,96 L82,80 L76,98 L70,84 Z',
    part: 'M64,102 Q60,56 100,52 Q140,56 136,102 L132,86 Q124,70 104,72 L100,62 L96,72 Q76,70 68,86 Z',
    swept: 'M64,102 Q58,56 104,52 Q142,58 136,100 L132,84 L126,92 Q112,70 86,80 Q74,86 66,100 Z',
  };
  const fringe = (col, colHi, colS) => [
    `<path d="${FRINGE[fringeStyle]}" fill="${col}" ${O}/>`,
    `<path d="M78,66 Q94,58 112,62" stroke="${colHi}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".9"/>`,
    `<path d="M120,64 Q132,74 134,92" stroke="${colS}" stroke-width="4" fill="none" opacity=".6"/>`,
  ].join('');

  // 帽子／頭飾
  const gold = '#e2b54a', goldS = '#b88a2a', red = '#e0453a', metal = '#8f9cac', metalL = '#c4ced8', metalS = '#5e6a78';
  switch (t.hat) {
    case 'helmet':
      p.push(`<path d="M56,106 Q52,44 100,38 Q148,44 144,106 L136,108 Q134,74 100,70 Q66,74 64,108 Z" fill="${metal}" ${O}/>`);
      p.push(`<path d="M70,56 Q100,42 130,56" stroke="${metalL}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M126,54 Q140,68 142,92" stroke="${metalS}" stroke-width="5" fill="none"/>`);
      p.push(`<path d="M58,84 Q100,62 142,84 L142,94 Q100,74 58,94 Z" fill="${gold}" ${o}/><circle cx="100" cy="78" r="5" fill="${red}" ${o}/>`);
      p.push(`<path d="M56,100 Q48,128 60,140 L68,110 Z M144,100 Q152,128 140,140 L132,110 Z" fill="${metal}" ${o}/>`);
      p.push(`<path d="M100,40 L100,22" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M100,40 L100,22" stroke="${gold}" stroke-width="3"/>`);
      p.push(`<path d="M100,24 Q84,8 92,-6 Q100,8 108,-6 Q116,8 100,24 Z" fill="${red}" ${o}/>`);
      break;
    case 'feather':
      p.push(fringe(hair, hairHi, hairS));
      p.push(`<path d="M80,60 Q46,-20 -6,-4" stroke="${INK}" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M80,60 Q46,-20 -6,-4" stroke="#d63a2a" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M78,54 Q50,-8 6,0" stroke="#ffd0a0" stroke-width="1.5" fill="none"/>`);
      p.push(`<path d="M120,60 Q154,-20 206,-4" stroke="${INK}" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M120,60 Q154,-20 206,-4" stroke="#d63a2a" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M122,54 Q150,-8 194,0" stroke="#ffd0a0" stroke-width="1.5" fill="none"/>`);
      p.push(`<path d="M64,80 Q62,44 100,40 Q138,44 136,80 Q100,62 64,80 Z" fill="${gold}" ${O}/><path d="M76,56 Q100,46 124,56" stroke="#fff2b0" stroke-width="3" fill="none"/><circle cx="100" cy="58" r="7" fill="${red}" ${o}/>`);
      break;
    case 'crown':
      p.push(fringe(hair, hairHi, hairS));
      p.push(`<path d="M84,18 L116,18 L114,52 L86,52 Z" fill="${INK}"/><path d="M80,48 L120,48 L120,58 L80,58 Z" fill="${gold}" ${o}/>`);
      p.push(`<path d="M60,32 L140,32" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M60,32 L140,32" stroke="${gold}" stroke-width="3.5" stroke-linecap="round"/><circle cx="100" cy="32" r="5" fill="${red}" ${o}/>`);
      break;
    case 'scholar':
      p.push(fringe(hair, hairHi, hairS));
      p.push(`<path d="M60,80 Q56,28 100,24 Q144,28 140,80 Q120,58 100,58 Q80,58 60,80 Z" fill="#33475b" ${O}/><path d="M80,34 L80,60 M100,28 L100,58 M120,34 L120,60" stroke="#5a7389" stroke-width="2"/>`);
      p.push(`<path d="M136,72 Q160,96 152,148" stroke="${INK}" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M136,72 Q160,96 152,148" stroke="#33475b" stroke-width="6" fill="none" stroke-linecap="round"/>`);
      break;
    case 'headband': {
      const band = t.band || shade(color, -0.05);
      p.push(`<circle cx="100" cy="36" r="15" fill="${hair}" ${O}/><path d="M92,30 Q98,26 104,28" stroke="${hairHi}" stroke-width="3" fill="none"/>`);
      p.push(fringe(hair, hairHi, hairS));
      p.push(`<path d="M62,82 Q100,62 138,82 L138,92 Q100,72 62,92 Z" fill="${band}" ${o}/>`);
      p.push(`<path d="M134,84 Q158,92 162,120 M138,88 Q164,90 172,108" stroke="${INK}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M134,84 Q158,92 162,120 M138,88 Q164,90 172,108" stroke="${band}" stroke-width="5" fill="none" stroke-linecap="round"/>`);
      break;
    }
    case 'bald':
      p.push(`<path d="M66,98 Q64,60 100,56 Q136,60 134,98" fill="${skin}" ${O}/><path d="M68,100 L132,100" stroke="${skin}" stroke-width="6"/><path d="M80,66 Q92,58 106,62" stroke="#ffffff" stroke-width="5" fill="none" opacity=".5" stroke-linecap="round"/><circle cx="100" cy="50" r="9" fill="${hair}" ${o}/>`);
      break;
    default:
      p.push(fringe(hair, hairHi, hairS));
  }

  // 手持（前景）
  const hand = (x, y) => `<path d="M${x - 9},${y - 4} Q${x - 10},${y + 9} ${x},${y + 10} Q${x + 10},${y + 9} ${x + 9},${y - 4} Q${x},${y - 10} ${x - 9},${y - 4} Z" fill="${skin}" ${o}/>`;
  switch (t.weapon) {
    case 'bow':
      p.push(`<path d="M40,60 Q-4,150 40,240" stroke="${INK}" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M40,60 Q-4,150 40,240" stroke="#a0683a" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M40,60 L40,240" stroke="#ffffff" stroke-width="1.5"/>`, hand(22, 150));
      break;
    case 'fan':
      p.push(`<path d="M136,246 L146,206" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M146,210 Q118,176 136,148 Q164,136 180,166 Q180,198 146,210 Z" fill="#ffffff" ${O}/><path d="M146,210 L134,158 M146,210 L150,146 M146,210 L168,154" stroke="#c8ccd6" stroke-width="2"/>`, hand(140, 226));
      break;
    case 'scroll':
      p.push(`<rect x="108" y="208" width="58" height="18" rx="8" fill="#f3e3b8" ${o}/><rect x="102" y="204" width="11" height="26" rx="4" fill="#a0683a" ${o}/><rect x="160" y="204" width="11" height="26" rx="4" fill="#a0683a" ${o}/>`, hand(114, 228));
      break;
    case 'spear': case 'snake': case 'glaive': case 'halberd': case 'axe':
      p.push(hand(168, 212));
      break;
    default: break;
  }

  const vb = mode === 'head' ? '44 30 112 112' : '0 0 200 250';
  const wh = mode === 'head' ? 'width="112" height="112"' : 'width="200" height="250"';
  return `<svg xmlns="http://www.w3.org/2000/svg" ${wh} viewBox="${vb}">${p.join('')}</svg>`;
}

module.exports = { svg };
