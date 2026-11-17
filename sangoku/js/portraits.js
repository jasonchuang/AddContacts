/* 武將肖像：以特徵參數組合繪製的原創 SVG 半身像。
 * 特徵依身分與能力自動決定；部分人物依史書／演義中的公有領域描述加上特徵（例如老將、紅臉、眼罩）。
 */
(function (TK) {
  'use strict';

  const SKIN = { normal: '#f1c99a', fair: '#f6d7b4', tan: '#d9a877', red: '#b4483a', dark: '#9c6a45' };
  const HAIR = { black: '#231710', brown: '#4a3020', grey: '#8c8c8c', white: '#ece8e0' };

  const WEAPON_NAME = {
    bow: '弓', spear: '槍', snake: '蛇矛', glaive: '大刀', halberd: '戟', axe: '大斧',
    sword: '劍', twin: '雙劍', fan: '羽扇', scroll: '書卷', none: '—',
  };

  // 個別人物特徵（依公有領域的史書、演義描述，造型為本作原創）
  const OVERRIDE = {
    '黃忠': { age: 'old', hair: 'white', beard: 'long', hat: 'helmet', weapon: 'bow', eyes: 'fierce', title: '老當益壯' },
    '關羽': { skin: 'red', beard: 'long', hat: 'headband', band: '#2e7d32', weapon: 'glaive', eyes: 'calm', title: '美髯公' },
    '張飛': { skin: 'dark', beard: 'full', hat: 'helmet', weapon: 'snake', eyes: 'fierce', title: '萬人之敵' },
    '趙雲': { age: 'young', beard: 'none', hat: 'helmet', armor: '#dfe6ea', weapon: 'spear', eyes: 'calm', title: '一身是膽' },
    '呂布': { beard: 'none', hat: 'feather', weapon: 'halberd', eyes: 'fierce', title: '飛將' },
    '諸葛亮': { beard: 'long', hat: 'scholar', robe: true, weapon: 'fan', eyes: 'calm', title: '臥龍' },
    '龐統': { beard: 'full', hat: 'scholar', robe: true, weapon: 'scroll', eyes: 'sly', title: '鳳雛' },
    '夏侯惇': { beard: 'short', hat: 'helmet', weapon: 'spear', eyes: 'fierce', patch: true, title: '獨眼將軍' },
    '典韋': { skin: 'tan', beard: 'full', hat: 'headband', weapon: 'axe', eyes: 'fierce', title: '古之惡來' },
    '許褚': { skin: 'tan', beard: 'full', hat: 'bald', weapon: 'axe', eyes: 'fierce', title: '虎痴' },
    '曹操': { beard: 'short', hat: 'crown', weapon: 'sword', eyes: 'sly', title: '治世能臣' },
    '劉備': { beard: 'short', hat: 'crown', weapon: 'twin', eyes: 'calm', title: '仁德之君' },
    '孫堅': { beard: 'short', hat: 'headband', band: '#c0392b', weapon: 'sword', eyes: 'fierce', title: '江東猛虎' },
    '孫策': { age: 'young', beard: 'none', hat: 'helmet', weapon: 'spear', eyes: 'fierce', title: '小霸王' },
    '孫權': { age: 'young', beard: 'mustache', hat: 'crown', weapon: 'sword', eyes: 'calm', title: '碧眼兒', eyeColor: '#2e86c1' },
    '周瑜': { age: 'young', beard: 'none', hat: 'crown', weapon: 'sword', eyes: 'calm', title: '美周郎' },
    '董卓': { fat: true, beard: 'full', hat: 'crown', weapon: 'sword', eyes: 'sly', title: '魔王' },
    '馬超': { age: 'young', beard: 'none', hat: 'helmet', armor: '#dfe6ea', weapon: 'spear', eyes: 'fierce', title: '錦馬超' },
    '太史慈': { beard: 'short', hat: 'helmet', weapon: 'bow', eyes: 'fierce', title: '神射' },
    '甘寧': { beard: 'mustache', hat: 'headband', band: '#8e44ad', weapon: 'sword', eyes: 'fierce', title: '錦帆賊' },
    '嚴顏': { age: 'old', hair: 'white', beard: 'long', hat: 'helmet', weapon: 'glaive', eyes: 'fierce', title: '老將' },
    '程普': { age: 'old', hair: 'grey', beard: 'long', hat: 'helmet', weapon: 'spear', eyes: 'calm' },
    '黃蓋': { age: 'old', hair: 'grey', beard: 'full', hat: 'helmet', weapon: 'axe', eyes: 'fierce' },
    '魏延': { skin: 'tan', beard: 'short', hat: 'helmet', weapon: 'glaive', eyes: 'fierce' },
    '張遼': { beard: 'short', hat: 'helmet', weapon: 'glaive', eyes: 'fierce', title: '威震逍遙' },
    '顏良': { beard: 'full', hat: 'helmet', weapon: 'glaive', eyes: 'fierce' },
    '文醜': { beard: 'full', hat: 'helmet', weapon: 'spear', eyes: 'fierce' },
    '華雄': { beard: 'full', hat: 'helmet', weapon: 'glaive', eyes: 'fierce' },
    '郭嘉': { age: 'young', beard: 'none', hat: 'scholar', robe: true, weapon: 'scroll', eyes: 'sly', title: '鬼才' },
    '賈詡': { beard: 'goatee', hat: 'scholar', robe: true, weapon: 'scroll', eyes: 'sly', title: '毒士' },
    '公孫瓚': { beard: 'short', hat: 'helmet', armor: '#ecf0f1', weapon: 'spear', eyes: 'fierce', title: '白馬將軍' },
    '袁紹': { beard: 'mustache', hat: 'crown', weapon: 'sword', eyes: 'calm' },
    '袁術': { beard: 'mustache', hat: 'crown', weapon: 'sword', eyes: 'sly' },
    '馬騰': { beard: 'long', hat: 'helmet', weapon: 'spear', eyes: 'calm' },
    '劉表': { age: 'old', hair: 'grey', beard: 'long', hat: 'crown', weapon: 'scroll', robe: true, eyes: 'calm' },
  };

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  // 依身分與能力推得預設特徵
  function traits(g) {
    const h = hash(g.name);
    const pick = (arr, salt) => arr[(h >>> (salt || 0)) % arr.length];
    let t;
    if (g.ruler) {
      t = { hat: 'crown', weapon: 'sword', beard: pick(['short', 'mustache', 'long'], 3), eyes: pick(['calm', 'sly'], 5) };
    } else if (g.int >= 80 && g.war < 60) {
      t = { hat: 'scholar', robe: true, weapon: g.int >= 92 ? 'fan' : 'scroll', beard: pick(['goatee', 'long', 'mustache', 'none'], 2), eyes: pick(['calm', 'sly'], 7) };
    } else if (g.war >= 80) {
      t = { hat: pick(['helmet', 'helmet', 'headband'], 4), weapon: pick(['spear', 'glaive', 'halberd', 'axe', 'sword'], 1), beard: pick(['full', 'short', 'none', 'long'], 6), eyes: 'fierce' };
    } else if (g.pol >= 75 && g.war < 50) {
      t = { hat: 'scholar', robe: true, weapon: 'scroll', beard: pick(['mustache', 'goatee', 'short'], 2), eyes: 'calm' };
    } else {
      t = { hat: pick(['helmet', 'headband'], 3), weapon: pick(['sword', 'spear'], 5), beard: pick(['short', 'mustache', 'none'], 1), eyes: pick(['calm', 'fierce'], 8) };
    }
    t.skin = pick(['normal', 'normal', 'fair', 'tan'], 9);
    t.hair = 'black';
    t.age = 'mid';
    t.band = null;
    Object.assign(t, OVERRIDE[g.name] || {});
    if (t.age === 'old' && t.hair === 'black') t.hair = 'grey';
    return t;
  }

  function classLabel(g, t) {
    if (g.ruler) return '君主';
    if (t.weapon === 'bow') return '弓將';
    if (g.int >= 90 && g.war < 70) return '軍師';
    if (g.war >= 90 && g.lead >= 85) return '名將';
    if (g.war >= 85) return '猛將';
    if (g.int >= 80 && g.lead >= 80) return '智將';
    if (g.pol >= 80) return '文官';
    return '武官';
  }

  function shade(hex, amt) { return TK.Icons.shade(hex, amt); }
  // 與紙色混合，讓顏色像礦物顏料而非螢幕純色
  function mute(hex, k) {
    const a = parseInt(hex.slice(1), 16), b = 0xe8dcc0;
    const m = (sh) => Math.round(((a >> sh) & 255) * (1 - k) + ((b >> sh) & 255) * k);
    return '#' + ((1 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)).toString(16).slice(1);
  }
  const INK = '#2a1d14';

  // 回傳 SVG 字串。mode: 'full'（半身大圖）或 'head'（頭像裁切）
  function svgInk(g, color, mode) {
    const t = traits(g);
    const skin = SKIN[t.skin] || SKIN.normal, skinD = shade(skin, -0.15);
    const hair = HAIR[t.hair] || HAIR.black;
    const armor = mute(t.armor || color, 0.18);
    const armorD = shade(armor, -0.28), armorL = shade(armor, 0.15);
    const metal = '#6b7884', metalD = '#3e4851';
    const fat = t.fat ? 4 : 0;
    const p = [];

    // 背景
    const bg = [];
    bg.push(`<rect x="-10" y="-10" width="140" height="170" fill="#efe5cf"/>`);
    bg.push(`<circle cx="62" cy="60" r="54" fill="${mute(color, 0.35)}" opacity=".42" filter="url(#ink-wash)"/>`);
    bg.push(`<circle cx="60" cy="56" r="34" fill="url(#p-halo)"/>`);
    bg.push(`<path d="M-10,128 Q30,112 60,124 T130,118 L130,160 L-10,160 Z" fill="#3b332a" opacity=".10" filter="url(#ink-wash)"/>`);

    // 長柄武器（在身後）
    const shaft = (x, y1) => `<line x1="${x}" y1="150" x2="${x}" y2="${y1}" stroke="#6b4423" stroke-width="3.2"/>`;
    const blade = 'fill="#d5dde2" stroke="#59646d" stroke-width="1"';
    if (t.weapon === 'spear') {
      p.push(shaft(100, 14), `<path d="M100,0 L104.5,15 L95.5,15 Z" ${blade}/>`, `<path d="M96,16 Q100,26 104,16" fill="#c0392b"/>`);
    } else if (t.weapon === 'snake') {
      p.push(shaft(100, 20), `<path d="M100,20 Q106,14 100,8 Q94,2 100,-4" fill="none" stroke="#d5dde2" stroke-width="4" stroke-linecap="round"/>`, `<path d="M96,21 Q100,30 104,21" fill="#c0392b"/>`);
    } else if (t.weapon === 'glaive') {
      p.push(shaft(100, 18), `<path d="M100,4 Q122,10 117,42 Q110,30 100,30 Z" ${blade}/>`, `<path d="M104,12 Q114,16 113,30" fill="none" stroke="#2e7d32" stroke-width="1.6"/>`, `<rect x="96" y="28" width="8" height="5" fill="#e2b54a"/>`);
    } else if (t.weapon === 'halberd') {
      p.push(shaft(100, 14), `<path d="M100,0 L104,16 L96,16 Z" ${blade}/>`,
        `<path d="M100,20 Q115,18 118,32 Q109,28 100,30 Z" ${blade}/>`, `<path d="M100,20 Q85,18 82,32 Q91,28 100,30 Z" ${blade}/>`,
        `<path d="M95,34 Q100,44 105,34" fill="#c0392b"/>`);
    } else if (t.weapon === 'axe') {
      p.push(shaft(98, 30), `<path d="M98,32 Q124,24 120,58 Q110,48 98,50 Z" ${blade}/>`, `<path d="M98,24 L101,32 L95,32 Z" ${blade}/>`);
    }
    // 箭筒（弓將）
    if (t.weapon === 'bow') {
      p.push(`<g transform="rotate(18 92 96)"><rect x="86" y="68" width="13" height="44" rx="3" fill="#7a4a22" stroke="#3a2412"/>`
        + `<line x1="89" y1="68" x2="88" y2="56" stroke="#6b4423" stroke-width="1.4"/><line x1="93" y1="68" x2="93" y2="54" stroke="#6b4423" stroke-width="1.4"/><line x1="97" y1="68" x2="98" y2="57" stroke="#6b4423" stroke-width="1.4"/>`
        + `<path d="M86,57 L90,52 L91,59 Z M90,55 L94,49 L96,56 Z M95,58 L99,52 L100,59 Z" fill="#c0392b"/></g>`);
    }
    // 雙劍／單劍（背在肩後）
    if (t.weapon === 'sword' || t.weapon === 'twin') {
      p.push(`<line x1="84" y1="110" x2="106" y2="54" stroke="#d5dde2" stroke-width="4" stroke-linecap="round"/><line x1="80" y1="100" x2="92" y2="105" stroke="#e2b54a" stroke-width="3"/><line x1="84" y1="110" x2="80" y2="120" stroke="#5e3b20" stroke-width="4"/>`);
      if (t.weapon === 'twin') p.push(`<line x1="36" y1="110" x2="14" y2="54" stroke="#d5dde2" stroke-width="4" stroke-linecap="round"/><line x1="40" y1="100" x2="28" y2="105" stroke="#e2b54a" stroke-width="3"/><line x1="36" y1="110" x2="40" y2="120" stroke="#5e3b20" stroke-width="4"/>`);
    }

    // 披風（君主）
    if (t.hat === 'crown' && !t.robe) p.push(`<path d="M4,150 Q6,104 34,98 L86,98 Q114,104 116,150 Z" fill="${shade(color, -0.35)}"/>`);

    // 身體
    if (t.robe) {
      p.push(`<path d="M6,150 Q8,110 40,103 L52,97 L68,97 L80,103 Q112,110 114,150 Z" fill="${armorL}" stroke="${armorD}" stroke-width="1"/>`);
      p.push(`<path d="M50,98 L60,124 L70,98" fill="#f4efe2" stroke="${armorD}" stroke-width="1"/>`);
      p.push(`<path d="M50,98 L66,130 M70,98 L56,128" stroke="${armorD}" stroke-width="2" fill="none"/>`);
      p.push(`<path d="M20,150 Q24,124 34,116 M100,150 Q96,124 86,116" stroke="${armorD}" stroke-width="1" fill="none" opacity=".6"/>`);
    } else {
      p.push(`<path d="M6,150 Q8,110 40,103 L52,97 L68,97 L80,103 Q112,110 114,150 Z" fill="${armor}" stroke="${armorD}" stroke-width="1.2"/>`);
      for (let y = 118; y < 150; y += 7) p.push(`<path d="M30,${y} Q60,${y + 5} 90,${y}" stroke="${armorD}" stroke-width="1" fill="none" opacity=".55"/>`);
      p.push(`<circle cx="60" cy="128" r="9" fill="#cfd8dc" stroke="${metalD}" stroke-width="1.2"/><circle cx="57" cy="125" r="3" fill="#fff" opacity=".6"/>`);
      p.push(`<ellipse cx="26" cy="112" rx="19" ry="12" fill="#b8862b" stroke="#6e4f17" stroke-width="1.2"/><ellipse cx="94" cy="112" rx="19" ry="12" fill="#b8862b" stroke="#6e4f17" stroke-width="1.2"/>`);
      p.push(`<path d="M12,112 Q26,104 40,112 M80,112 Q94,104 108,112" stroke="#f2d27a" stroke-width="1.2" fill="none"/>`);
      p.push(`<path d="M46,99 Q60,108 74,99 L72,96 L48,96 Z" fill="${armorD}"/>`);
    }

    p.push(`<path d="M60,98 L80,103 Q112,110 114,150 L60,150 Z" fill="${INK}" opacity=".12"/>`);
    p.push(`<path d="M6,150 Q8,110 40,103 L52,97 L68,97 L80,103 Q112,110 114,150" fill="none" stroke="${INK}" stroke-width="1.6" stroke-opacity=".75"/>`);
    // 脖子、頭
    p.push(`<rect x="51" y="78" width="18" height="22" fill="${skinD}"/>`);
    // 頭髮（在頭後）
    if (t.hat !== 'helmet' && t.hat !== 'bald') p.push(`<ellipse cx="60" cy="54" rx="${24 + fat}" ry="25" fill="${hair}"/>`);
    p.push(`<ellipse cx="${37 - fat}" cy="62" rx="4" ry="6" fill="${skinD}"/><ellipse cx="${83 + fat}" cy="62" rx="4" ry="6" fill="${skinD}"/>`);
    p.push(`<ellipse cx="60" cy="60" rx="${22 + fat}" ry="${26 + fat / 2}" fill="${skin}" stroke="${INK}" stroke-width="1.1" stroke-opacity=".7"/>`);
    p.push(`<path d="M62,35 Q${84 + fat},40 ${82 + fat},62 Q80,82 60,86 Q75,72 73,58 Q71,42 62,35 Z" fill="#6b4a2a" opacity=".13"/>`);
    p.push(`<ellipse cx="${46 - fat / 2}" cy="70" rx="5" ry="3" fill="#e08a7a" opacity=".35"/><ellipse cx="${74 + fat / 2}" cy="70" rx="5" ry="3" fill="#e08a7a" opacity=".35"/>`);
    if (t.age === 'old') p.push(`<path d="M49,44 Q60,41 71,44 M51,48 Q60,46 69,48 M44,66 Q47,68 50,66 M70,66 Q73,68 76,66" stroke="${skinD}" stroke-width="1" fill="none"/>`);

    // 眉毛與眼睛
    const browC = t.age === 'old' ? HAIR[t.hair] : '#231710';
    const eyeC = t.eyeColor || '#1c120b';
    if (t.eyes === 'fierce') {
      p.push(`<path d="M42,49 L56,54" stroke="${browC}" stroke-width="3.6" stroke-linecap="round"/><path d="M78,49 L64,54" stroke="${browC}" stroke-width="3.6" stroke-linecap="round"/>`);
      p.push(`<ellipse cx="50" cy="59" rx="4.6" ry="3.6" fill="#fff"/><circle cx="51" cy="59" r="2.3" fill="${eyeC}"/>`);
      p.push(`<ellipse cx="70" cy="59" rx="4.6" ry="3.6" fill="#fff"/><circle cx="69" cy="59" r="2.3" fill="${eyeC}"/>`);
      p.push(`<path d="M45,56 L55,57 M75,56 L65,57" stroke="#1c120b" stroke-width="1.2"/>`);
    } else if (t.eyes === 'sly') {
      p.push(`<path d="M43,51 Q49,47 56,51" stroke="${browC}" stroke-width="2" fill="none"/><path d="M64,51 Q71,47 77,51" stroke="${browC}" stroke-width="2" fill="none"/>`);
      p.push(`<path d="M45,59 Q50,56 55,58 Q50,61 45,59 Z" fill="${eyeC}"/><path d="M65,58 Q70,56 75,59 Q70,61 65,58 Z" fill="${eyeC}"/>`);
    } else {
      p.push(`<path d="M43,52 Q49,48 56,51" stroke="${browC}" stroke-width="2.4" fill="none"/><path d="M64,51 Q71,48 77,52" stroke="${browC}" stroke-width="2.4" fill="none"/>`);
      p.push(`<path d="M45,59 Q50,55.5 55,59 Q50,61.5 45,59 Z" fill="#fff"/><circle cx="50" cy="59" r="1.9" fill="${eyeC}"/>`);
      p.push(`<path d="M65,59 Q70,55.5 75,59 Q70,61.5 65,59 Z" fill="#fff"/><circle cx="70" cy="59" r="1.9" fill="${eyeC}"/>`);
    }
    if (t.patch) p.push(`<path d="M36,48 L84,62" stroke="#111" stroke-width="2"/><ellipse cx="50" cy="59" rx="7" ry="6" fill="#111"/>`);

    // 鼻、嘴
    p.push(`<path d="M60,60 Q57,69 61,71 Q63,71 64,70" stroke="${skinD}" stroke-width="1.6" fill="none"/>`);
    const mouth = t.eyes === 'fierce' ? 'M53,78 Q60,75 67,78' : t.eyes === 'sly' ? 'M53,77 Q61,79 67,75' : 'M54,77 Q60,80 66,77';
    p.push(`<path d="${mouth}" stroke="#7a3b2e" stroke-width="2" fill="none" stroke-linecap="round"/>`);

    // 鬍鬚
    const bc = HAIR[t.hair] || HAIR.black;
    const stache = `<path d="M49,74 Q55,70 60,72.5 Q65,70 71,74 Q65,76.5 60,74.5 Q55,76.5 49,74 Z" fill="${bc}"/>`;
    if (t.beard === 'long') {
      p.push(`<path d="M43,70 Q45,90 53,103 Q58,124 60,134 Q62,124 67,103 Q75,90 77,70 Q71,84 60,84 Q49,84 43,70 Z" fill="${bc}"/>`, stache);
      p.push(`<path d="M56,92 Q59,110 60,126 M64,92 Q61,110 60,126" stroke="${shade(bc, t.hair === 'white' ? -0.2 : 0.15)}" stroke-width=".8" fill="none"/>`);
    } else if (t.beard === 'full') {
      p.push(`<path d="M${37 - fat},58 Q${37 - fat},92 49,101 L52,94 L55,103 L60,96 L65,103 L68,94 L71,101 Q${83 + fat},92 ${83 + fat},58 Q79,80 70,83 Q60,87 50,83 Q41,80 ${37 - fat},58 Z" fill="${bc}"/>`, stache);
    } else if (t.beard === 'short') {
      p.push(`<path d="M44,72 Q46,90 60,93 Q74,90 76,72 Q70,85 60,85 Q50,85 44,72 Z" fill="${bc}"/>`, stache);
    } else if (t.beard === 'goatee') {
      p.push(`<path d="M55,82 Q60,100 65,82 Q60,85 55,82 Z" fill="${bc}"/>`, `<path d="M51,74 Q56,71 60,73 Q64,71 69,74" stroke="${bc}" stroke-width="2" fill="none"/>`);
    } else if (t.beard === 'mustache') {
      p.push(stache);
    }

    // 帽子／頭盔
    if (t.hat === 'helmet') {
      p.push(`<path d="M${34 - fat},64 Q${32 - fat},28 60,24 Q${88 + fat},28 ${86 + fat},64 L${82 + fat},66 Q${82 + fat},46 60,44 Q${38 - fat},46 ${38 - fat},66 Z" fill="${metal}" stroke="${metalD}" stroke-width="1.2"/>`);
      p.push(`<path d="M${36 - fat},48 Q60,38 ${84 + fat},48 L${84 + fat},52 Q60,43 ${36 - fat},52 Z" fill="#e2b54a"/>`);
      p.push(`<path d="M44,30 Q60,22 76,30" stroke="#9aa5b1" stroke-width="2" fill="none"/>`);
      p.push(`<line x1="60" y1="24" x2="60" y2="12" stroke="#e2b54a" stroke-width="2.5"/><path d="M60,13 Q52,4 56,-2 Q60,6 64,-2 Q68,4 60,13 Z" fill="#c0392b"/>`);
      p.push(`<path d="M${34 - fat},58 L${32 - fat},78 L${40 - fat},74 Z M${86 + fat},58 L${88 + fat},78 L${80 + fat},74 Z" fill="${metal}" stroke="${metalD}"/>`);
    } else if (t.hat === 'feather') {
      p.push(`<path d="M48,30 Q30,-6 2,2" stroke="#b03a2e" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M72,30 Q90,-6 118,2" stroke="#b03a2e" stroke-width="3" fill="none" stroke-linecap="round"/>`);
      p.push(`<path d="M48,30 Q32,0 10,4 M72,30 Q88,0 110,4" stroke="#f2d27a" stroke-width="1" fill="none"/>`);
      p.push(`<path d="M36,56 Q34,30 60,27 Q86,30 84,56 Q60,42 36,56 Z" fill="#e2b54a" stroke="#8a6a2c" stroke-width="1.2"/>`);
      p.push(`<circle cx="60" cy="38" r="4" fill="#c0392b" stroke="#fff3df"/><path d="M40,50 Q60,40 80,50" stroke="#8a6a2c" stroke-width="1.5" fill="none"/>`);
    } else if (t.hat === 'crown') {
      p.push(`<path d="M37,56 Q37,32 60,32 Q83,32 83,56 Q72,42 60,42 Q48,42 37,56 Z" fill="${hair}"/>`);
      p.push(`<rect x="50" y="16" width="20" height="18" rx="3" fill="#1c120b"/><rect x="48" y="30" width="24" height="5" rx="2" fill="#e2b54a"/>`);
      p.push(`<line x1="40" y1="24" x2="80" y2="24" stroke="#e2b54a" stroke-width="2.4" stroke-linecap="round"/><circle cx="60" cy="24" r="3" fill="#c0392b"/>`);
    } else if (t.hat === 'scholar') {
      p.push(`<path d="M36,54 Q34,26 60,24 Q86,26 84,54 Q72,42 60,42 Q48,42 36,54 Z" fill="#2c3e50" stroke="#17202a"/>`);
      p.push(`<path d="M44,28 L44,44 M52,25 L52,42 M60,24 L60,42 M68,25 L68,42 M76,28 L76,44" stroke="#4a6378" stroke-width="1"/>`);
      p.push(`<path d="M80,48 Q94,62 90,90 M83,46 Q100,58 98,84" stroke="#2c3e50" stroke-width="3" fill="none" stroke-linecap="round"/>`);
    } else if (t.hat === 'headband') {
      p.push(`<path d="M37,54 Q37,30 60,30 Q83,30 83,54 Q72,42 60,42 Q48,42 37,54 Z" fill="${hair}"/>`);
      p.push(`<ellipse cx="60" cy="24" rx="8" ry="7" fill="${hair}"/>`);
      const band = t.band || shade(color, -0.1);
      p.push(`<path d="M36,49 Q60,38 84,49 L84,54 Q60,44 36,54 Z" fill="${band}"/><path d="M82,50 Q94,56 96,70 M84,52 Q98,54 102,64" stroke="${band}" stroke-width="3" fill="none" stroke-linecap="round"/>`);
    } else if (t.hat === 'bald') {
      p.push(`<path d="M42,40 Q60,30 78,40" stroke="${skinD}" stroke-width="1.4" fill="none"/><ellipse cx="60" cy="34" rx="6" ry="5" fill="${hair}"/>`);
    }

    // 手持（前景）
    const hand = (x, y) => `<circle cx="${x}" cy="${y}" r="6" fill="${skin}" stroke="${skinD}"/>`;
    if (t.weapon === 'bow') {
      p.push(`<path d="M22,26 Q-6,88 22,148" stroke="#7a4a22" stroke-width="4.5" fill="none" stroke-linecap="round"/>`);
      p.push(`<path d="M22,26 Q-6,88 22,148" stroke="#c49a5a" stroke-width="1.5" fill="none"/>`);
      p.push(`<line x1="22" y1="26" x2="22" y2="148" stroke="#eee" stroke-width=".8"/>`);
      p.push(`<line x1="44" y1="88" x2="-6" y2="88" stroke="#6b4423" stroke-width="2"/><path d="M-8,88 L0,84 L0,92 Z" fill="#d5dde2"/><path d="M40,88 L46,83 M40,88 L46,93" stroke="#c0392b" stroke-width="2"/>`);
      p.push(hand(10, 88));
    } else if (t.weapon === 'fan') {
      p.push(`<line x1="78" y1="142" x2="84" y2="118" stroke="#6b4423" stroke-width="3"/>`);
      p.push(`<path d="M84,120 Q66,98 78,82 Q94,76 104,92 Q104,112 84,120 Z" fill="#f7f4ec" stroke="#9aa5b1"/>`);
      p.push(`<path d="M84,120 L76,88 M84,120 L84,82 M84,120 L93,82 M84,120 L101,92" stroke="#c8ccd0" stroke-width="1"/>`);
      p.push(hand(80, 132));
    } else if (t.weapon === 'scroll') {
      p.push(`<rect x="62" y="122" width="34" height="10" rx="4" fill="#e9dcb8" stroke="#8a6a2c"/><rect x="60" y="120" width="5" height="14" rx="2" fill="#7a4a22"/><rect x="93" y="120" width="5" height="14" rx="2" fill="#7a4a22"/>`);
      p.push(hand(66, 134));
    } else if (['spear', 'snake', 'glaive', 'halberd', 'axe'].includes(t.weapon)) {
      p.push(hand(100, 124));
    }

    const vb = mode === 'head' ? '30 18 60 60' : '0 0 120 150';
    const grain = '<rect x="-10" y="-10" width="140" height="170" filter="url(#paper-grain)"/><rect x="-10" y="-10" width="140" height="170" filter="url(#paper-fiber)"/>';
    const fade = mode === 'head' ? '' : '<rect x="0" y="0" width="120" height="150" fill="url(#p-fade)"/>';
    return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" class="portrait-svg" aria-hidden="true" preserveAspectRatio="xMidYMid slice">`
      + bg.join('') + `<g filter="url(#ink-rough)">${p.join('')}</g>` + fade + grain + '</svg>';
  }

  // ---------- Q 版肖像（原創大頭造型，沿用同一套人物特徵） ----------
  function svgChibi(g, color, mode) {
    const t = traits(g);
    const skin = SKIN[t.skin] || SKIN.normal, skinD = shade(skin, -0.14);
    const hair = HAIR[t.hair] || HAIR.black;
    const cloth = mute(t.armor || color, 0.12), clothD = shade(cloth, -0.25), clothL = shade(cloth, 0.2);
    const metal = '#7d8a96', metalL = '#a9b4be';
    const O = `stroke="${INK}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"`;
    const o = `stroke="${INK}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"`;
    const bc = HAIR[t.hair] || HAIR.black;
    const p = [];

    // 背景
    p.push(`<rect x="-10" y="-10" width="140" height="170" fill="#f6eedb"/>`);
    p.push(`<circle cx="60" cy="64" r="56" fill="${mute(color, 0.55)}" opacity=".55"/>`);
    for (const [x, y, r] of [[14, 22, 3], [104, 30, 2.5], [18, 120, 2], [108, 112, 3]]) p.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity=".7"/>`);

    // 長兵器（身後）
    const shaft = (y1) => `<line x1="102" y1="152" x2="102" y2="${y1}" stroke="${INK}" stroke-width="6.5" stroke-linecap="round"/><line x1="102" y1="152" x2="102" y2="${y1}" stroke="#8a5a33" stroke-width="3.5" stroke-linecap="round"/>`;
    const blade = `fill="#e3e9ec" ${o}`;
    if (t.weapon === 'spear') p.push(shaft(26), `<path d="M102,8 L109,28 L95,28 Z" ${blade}/>`, `<path d="M96,30 Q102,42 108,30 Z" fill="#d6453a" ${o}/>`);
    if (t.weapon === 'snake') p.push(shaft(30), `<path d="M102,30 Q110,22 102,14 Q94,6 102,-2" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M102,30 Q110,22 102,14 Q94,6 102,-2" fill="none" stroke="#e3e9ec" stroke-width="4" stroke-linecap="round"/>`, `<path d="M96,32 Q102,44 108,32 Z" fill="#d6453a" ${o}/>`);
    if (t.weapon === 'glaive') p.push(shaft(30), `<path d="M102,8 Q126,14 120,48 Q112,36 102,36 Z" ${blade}/>`, `<path d="M106,16 Q116,22 115,36" fill="none" stroke="#3d7a4c" stroke-width="2"/>`);
    if (t.weapon === 'halberd') p.push(shaft(20), `<path d="M102,4 L108,22 L96,22 Z" ${blade}/>`, `<path d="M102,26 Q118,24 121,40 Q111,34 102,36 Z" ${blade}/>`, `<path d="M102,26 Q86,24 83,40 Q93,34 102,36 Z" ${blade}/>`);
    if (t.weapon === 'axe') p.push(shaft(40), `<path d="M102,40 Q128,32 124,66 Q114,56 102,58 Z" ${blade}/>`);
    if (t.weapon === 'sword' || t.weapon === 'twin') {
      p.push(`<path d="M86,112 L106,62" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M86,112 L106,62" stroke="#e3e9ec" stroke-width="4" stroke-linecap="round"/><path d="M80,104 L94,110" stroke="#d8a93a" stroke-width="5" stroke-linecap="round"/>`);
      if (t.weapon === 'twin') p.push(`<path d="M34,112 L14,62" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M34,112 L14,62" stroke="#e3e9ec" stroke-width="4" stroke-linecap="round"/><path d="M40,104 L26,110" stroke="#d8a93a" stroke-width="5" stroke-linecap="round"/>`);
    }
    if (t.weapon === 'bow') p.push(`<path d="M86,104 L100,72" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M86,104 L100,72" stroke="#8a5a33" stroke-width="6" stroke-linecap="round"/><path d="M95,74 L98,64 M99,76 L104,67" stroke="#d6453a" stroke-width="3" stroke-linecap="round"/>`);
    if (t.hat === 'crown' && !t.robe) p.push(`<path d="M28,152 Q26,112 60,104 Q94,112 92,152 Z" fill="${shade(cloth, -0.35)}" ${O}/>`);

    // 身體
    p.push(`<path d="M34,152 Q32,112 60,106 Q88,112 86,152 Z" fill="${cloth}" ${O}/>`);
    if (t.robe) {
      p.push(`<path d="M50,108 L60,128 L70,108" fill="#fbf6ea" ${o}/>`, `<path d="M52,108 L66,134" stroke="${clothD}" stroke-width="3"/>`);
      p.push(`<rect x="40" y="136" width="40" height="5" rx="2" fill="${clothD}"/>`);
    } else {
      p.push(`<circle cx="60" cy="128" r="8" fill="#e3e9ec" ${o}/><circle cx="58" cy="126" r="2.4" fill="#fff"/>`);
      p.push(`<circle cx="36" cy="116" r="10" fill="#d8a93a" ${o}/><circle cx="84" cy="116" r="10" fill="#d8a93a" ${o}/>`);
      p.push(`<path d="M44,140 Q60,146 76,140" stroke="${clothD}" stroke-width="2" fill="none"/>`);
    }

    // 頭髮（頭後）
    const noHairBack = t.hat === 'helmet' || t.hat === 'bald' || t.hat === 'feather';
    if (!noHairBack) p.push(`<ellipse cx="60" cy="58" rx="40" ry="36" fill="${hair}" ${O}/>`);
    // 臉
    p.push(`<ellipse cx="24" cy="70" rx="6" ry="8" fill="${skinD}" ${O}/><ellipse cx="96" cy="70" rx="6" ry="8" fill="${skinD}" ${O}/>`);
    p.push(`<ellipse cx="60" cy="66" rx="36" ry="34" fill="${skin}" ${O}/>`);
    // 瀏海
    if (t.hat === 'crown' || t.hat === 'headband' || t.hat === 'scholar') {
      p.push(`<path d="M25,62 Q24,30 60,28 Q96,30 95,62 Q88,46 74,48 Q68,40 60,48 Q52,40 46,48 Q32,46 25,62 Z" fill="${hair}" ${O}/>`);
    }
    if (t.age === 'old') p.push(`<path d="M44,50 Q52,47 58,50 M62,50 Q68,47 76,50" stroke="${skinD}" stroke-width="1.6" fill="none"/>`);

    // 眼睛與眉
    const brow = t.age === 'old' ? HAIR[t.hair] : INK;
    const eyeC = t.eyeColor || INK;
    const roundEye = (x) => `<ellipse cx="${x}" cy="69" rx="5.6" ry="6.8" fill="${eyeC}"/><circle cx="${x + 1.8}" cy="66.4" r="2" fill="#fff"/><circle cx="${x - 1.6}" cy="71.5" r=".9" fill="#fff"/>`;
    if (t.eyes === 'fierce') {
      p.push(`<path d="M37,55 L53,61" stroke="${brow}" stroke-width="5" stroke-linecap="round"/><path d="M83,55 L67,61" stroke="${brow}" stroke-width="5" stroke-linecap="round"/>`);
      p.push(roundEye(47), roundEye(73));
      p.push(`<path d="M41,64 L53,66 M79,64 L67,66" stroke="${skin}" stroke-width="3"/>`);
    } else if (t.eyes === 'sly') {
      p.push(`<path d="M39,57 Q46,53 53,57 M67,57 Q74,53 81,57" stroke="${brow}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`);
      p.push(`<path d="M40,70 Q47,64 54,70 M66,70 Q73,64 80,70" stroke="${eyeC}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`);
    } else {
      p.push(`<path d="M39,57 Q46,53 53,56 M67,56 Q74,53 81,57" stroke="${brow}" stroke-width="3" fill="none" stroke-linecap="round"/>`);
      p.push(roundEye(47), roundEye(73));
    }
    if (t.patch) p.push(`<path d="M24,54 L96,68" stroke="${INK}" stroke-width="2.4"/><ellipse cx="47" cy="69" rx="9" ry="8.5" fill="${INK}"/>`);
    // 腮紅、嘴
    p.push(`<ellipse cx="38" cy="80" rx="6" ry="3.5" fill="#f08a7a" opacity=".45"/><ellipse cx="82" cy="80" rx="6" ry="3.5" fill="#f08a7a" opacity=".45"/>`);
    const mouth = t.eyes === 'fierce' ? 'M54,86 Q60,82 66,86' : t.eyes === 'sly' ? 'M54,84 Q61,88 67,82' : 'M54,83 Q60,89 66,83';
    if (t.beard === 'none' || t.beard === 'goatee') p.push(`<path d="${mouth}" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`);

    // 鬍鬚
    const stache = `<path d="M48,84 Q54,79 60,82.5 Q66,79 72,84 Q66,88 60,85.5 Q54,88 48,84 Z" fill="${bc}" ${o}/>`;
    if (t.beard === 'long') p.push(`<path d="M44,88 Q46,104 54,116 Q59,128 60,132 Q62,126 66,116 Q74,104 76,88 Q68,97 60,97 Q52,97 44,88 Z" fill="${bc}" ${o}/>`, stache);
    else if (t.beard === 'full') p.push(`<path d="M26,70 Q24,100 42,106 L46,100 L50,110 L56,102 L60,112 L64,102 L70,110 L74,100 L78,106 Q96,100 94,70 Q90,92 74,96 Q60,100 46,96 Q30,92 26,70 Z" fill="${bc}" ${o}/>`, stache);
    else if (t.beard === 'short') p.push(`<path d="M42,90 Q46,104 60,105 Q74,104 78,90 Q70,98 60,98 Q50,98 42,90 Z" fill="${bc}" ${o}/>`, stache);
    else if (t.beard === 'goatee') p.push(`<path d="M56,92 Q60,108 64,92 Q60,95 56,92 Z" fill="${bc}" ${o}/>`);
    else if (t.beard === 'mustache') p.push(stache);

    // 帽子
    if (t.hat === 'helmet') {
      p.push(`<path d="M20,64 Q18,20 60,18 Q102,20 100,64 L94,66 Q92,40 60,38 Q28,40 26,66 Z" fill="${metal}" ${O}/>`);
      p.push(`<path d="M30,34 Q60,22 90,34" stroke="${metalL}" stroke-width="3" fill="none"/>`);
      p.push(`<path d="M22,52 Q60,34 98,52 L98,58 Q60,42 22,58 Z" fill="#d8a93a" ${o}/>`);
      p.push(`<line x1="60" y1="20" x2="60" y2="8" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><line x1="60" y1="20" x2="60" y2="8" stroke="#d8a93a" stroke-width="2.5"/>`);
      p.push(`<path d="M60,10 Q48,0 55,-8 Q60,2 65,-8 Q72,0 60,10 Z" fill="#d6453a" ${o}/>`);
      p.push(`<path d="M20,58 Q14,82 24,90 L30,66 Z M100,58 Q106,82 96,90 L90,66 Z" fill="${metal}" ${o}/>`);
    } else if (t.hat === 'feather') {
      p.push(`<path d="M46,30 Q22,-14 -6,-2" stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M46,30 Q22,-14 -6,-2" stroke="#c0392b" stroke-width="4.5" fill="none" stroke-linecap="round"/>`);
      p.push(`<path d="M74,30 Q98,-14 126,-2" stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M74,30 Q98,-14 126,-2" stroke="#c0392b" stroke-width="4.5" fill="none" stroke-linecap="round"/>`);
      p.push(`<path d="M26,56 Q24,22 60,20 Q96,22 94,56 Q60,38 26,56 Z" fill="#e2b54a" ${O}/><circle cx="60" cy="34" r="5" fill="#d6453a" ${o}/>`);
    } else if (t.hat === 'crown') {
      p.push(`<rect x="47" y="8" width="26" height="22" rx="5" fill="${INK}"/><rect x="43" y="26" width="34" height="7" rx="3" fill="#d8a93a" ${o}/>`);
      p.push(`<line x1="34" y1="18" x2="86" y2="18" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><line x1="34" y1="18" x2="86" y2="18" stroke="#d8a93a" stroke-width="2.6" stroke-linecap="round"/><circle cx="60" cy="18" r="3.5" fill="#d6453a"/>`);
    } else if (t.hat === 'scholar') {
      p.push(`<path d="M22,56 Q20,14 60,12 Q100,14 98,56 Q82,38 60,38 Q38,38 22,56 Z" fill="#33475b" ${O}/>`);
      p.push(`<path d="M40,20 L40,40 M52,15 L52,38 M68,15 L68,38 M80,20 L80,40" stroke="#5a7389" stroke-width="1.5"/>`);
      p.push(`<path d="M94,50 Q110,64 106,96" stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M94,50 Q110,64 106,96" stroke="#33475b" stroke-width="4" fill="none" stroke-linecap="round"/>`);
    } else if (t.hat === 'headband') {
      p.push(`<circle cx="60" cy="20" r="11" fill="${hair}" ${O}/>`);
      const band = t.band || shade(color, -0.05);
      p.push(`<path d="M24,50 Q60,32 96,50 L96,58 Q60,40 24,58 Z" fill="${band}" ${o}/>`);
      p.push(`<path d="M94,52 Q110,58 114,78 M96,56 Q114,58 120,72" stroke="${band}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`);
    } else if (t.hat === 'bald') {
      p.push(`<ellipse cx="50" cy="42" rx="10" ry="5" fill="#fff" opacity=".45"/><circle cx="60" cy="30" r="7" fill="${hair}" ${o}/>`);
    }

    // 手持
    const hand = (x, y) => `<circle cx="${x}" cy="${y}" r="7" fill="${skin}" ${o}/>`;
    if (t.weapon === 'bow') {
      p.push(`<path d="M26,40 Q-2,96 26,150" stroke="${INK}" stroke-width="7.5" fill="none" stroke-linecap="round"/><path d="M26,40 Q-2,96 26,150" stroke="#a0683a" stroke-width="4.5" fill="none" stroke-linecap="round"/>`);
      p.push(`<line x1="26" y1="40" x2="26" y2="150" stroke="#fff" stroke-width="1.2"/>`);
      p.push(hand(14, 96));
    } else if (t.weapon === 'fan') {
      p.push(`<line x1="84" y1="146" x2="90" y2="124" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`);
      p.push(`<path d="M90,126 Q72,104 84,88 Q102,80 112,98 Q112,118 90,126 Z" fill="#fff" ${O}/><path d="M90,126 L82,94 M90,126 L92,86 M90,126 L104,92" stroke="#c8ccd0" stroke-width="1.4"/>`);
      p.push(hand(86, 138));
    } else if (t.weapon === 'scroll') {
      p.push(`<rect x="64" y="124" width="36" height="12" rx="5" fill="#f3e3b8" ${o}/><rect x="61" y="121" width="7" height="18" rx="3" fill="#a0683a" ${o}/><rect x="96" y="121" width="7" height="18" rx="3" fill="#a0683a" ${o}/>`);
      p.push(hand(70, 138));
    } else if (['spear', 'snake', 'glaive', 'halberd', 'axe'].includes(t.weapon)) {
      p.push(hand(102, 126));
    }

    const vb = mode === 'head' ? '16 10 88 88' : '0 0 120 150';
    return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" class="portrait-svg chibi" aria-hidden="true" preserveAspectRatio="xMidYMid slice">${p.join('')}</svg>`;
  }

  // 畫風：'ink'（水墨）或 'chibi'（Q 版），記在瀏覽器
  let STYLE = 'ink';
  try { STYLE = (globalThis.localStorage && localStorage.getItem('qunxiong.pstyle')) || 'ink'; } catch (e) { /* 忽略 */ }
  function setStyle(v) {
    STYLE = v === 'chibi' ? 'chibi' : 'ink';
    try { localStorage.setItem('qunxiong.pstyle', STYLE); } catch (e) { /* 忽略 */ }
  }
  function getStyle() { return STYLE; }
  // 遊戲固定使用 Q 版；水墨版保留給美術參考
  // 遊戲使用動畫風肖像（js/anime.js）；Q 版與水墨版保留作參考
  function svg(g, color, mode) { return TK.Anime ? TK.Anime.svg(g, color, mode, traits(g)) : svgChibi(g, color, mode); }

  // 若 portraits/ 中有該武將的插畫，回傳其網址
  function art(g) {
    const files = TK.PORTRAIT_FILES || {};
    return files[g.name] || null;
  }

  TK.Portrait = { svg, svgInk, svgChibi, setStyle, getStyle, traits, classLabel, art, mute, WEAPON_NAME };
})(globalThis.TK = globalThis.TK || {});
