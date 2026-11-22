// 依 js/portraits.js 的特徵表，產生每位武將的繪製說明（給畫師或 AI 生圖使用）
// 執行：node sangoku/tools/portrait-briefs.js  → 產生 sangoku/art/portrait-briefs.md
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
for (const f of ['data.js', 'icons.js', 'portraits.js']) require(path.join(root, 'js', f));
const { SCENARIO: sc, Portrait: P } = globalThis.TK;

const ZH = {
  hat: { helmet: '戰盔（紅纓）', crown: '冠冕・髮髻', scholar: '綸巾（文士頭巾）', headband: '束髮頭巾', feather: '金冠插雙雉尾翎', bald: '光頭小髻' },
  beard: { long: '長鬚', full: '虯髯（濃密絡腮鬍）', short: '短鬚', goatee: '山羊鬍', mustache: '八字鬍', none: '無鬚' },
  eyes: { fierce: '怒目、濃眉', calm: '沉穩、目光平和', sly: '細長眼、神情深沉' },
  skin: { normal: '一般膚色', fair: '白皙', tan: '黝黑', red: '赤紅（面如重棗）', dark: '深黑' },
  age: { young: '青年', mid: '壯年', old: '老年' },
};
const EN = {
  hat: { helmet: 'iron war helmet with red tassel', crown: 'Han-dynasty official crown cap over topknot', scholar: 'soft scholar headscarf', headband: 'cloth headband tied behind', feather: 'golden headdress with two long pheasant tail plumes', bald: 'shaved head with small topknot' },
  beard: { long: 'long flowing beard', full: 'thick bushy full beard', short: 'short trimmed beard', goatee: 'thin goatee', mustache: 'mustache', none: 'clean-shaven' },
  eyes: { fierce: 'fierce glaring eyes, heavy brows', calm: 'calm composed gaze', sly: 'narrow shrewd eyes' },
  weapon: { bow: 'holding a longbow, quiver of arrows on back', spear: 'holding a spear', snake: 'holding a serpent-blade spear', glaive: 'holding a long-handled crescent glaive', halberd: 'holding a crescent-bladed halberd', axe: 'holding a great axe', sword: 'sword at shoulder', twin: 'two swords crossed on back', fan: 'holding a white feather fan', scroll: 'holding a bamboo scroll', none: '' },
  age: { young: 'young man', mid: 'middle-aged man', old: 'elderly man with white hair' },
};

const STYLE = 'half-length portrait, three-quarter view, East Asian ink-wash painting with light mineral colors on aged rice paper, '
  + 'visible brush strokes, soft ink gradients, muted palette, plain paper background, no text, no watermark';

let md = '# 武將繪製說明\n\n由 `tools/portrait-briefs.js` 依遊戲內的肖像特徵自動產生。\n'
  + '交給畫師時使用「特徵」欄；用 AI 生圖時以「提示詞」為起點，並統一套用相同的風格描述與構圖。\n\n'
  + `**統一風格描述（英文）**：${STYLE}\n\n`;

const byFaction = {};
for (const g of sc.generals) (byFaction[g.faction || 'free'] = byFaction[g.faction || 'free'] || []).push(g);
const groups = sc.factions.map((f) => [f.name, f.color, byFaction[f.id] || []]).concat([['在野', '#8d857a', byFaction.free || []]]);

for (const [fname, color, list] of groups) {
  md += `## ${fname}（主色 ${color}）\n\n`;
  for (const g of list) {
    const t = P.traits(g);
    const cls = P.classLabel(g, t);
    const zh = [ZH.age[t.age], ZH.skin[t.skin], ZH.hat[t.hat], ZH.beard[t.beard], ZH.eyes[t.eyes],
      t.robe ? '長袍（文官）' : '鎧甲', `武器：${P.WEAPON_NAME[t.weapon]}`, t.patch ? '左眼戴眼罩' : null, t.eyeColor ? '碧眼' : null].filter(Boolean);
    const en = [EN.age[t.age], EN.hat[t.hat], EN.beard[t.beard], EN.eyes[t.eyes],
      t.skin === 'red' ? 'deep red complexion' : t.skin === 'dark' || t.skin === 'tan' ? 'dark tanned skin' : null,
      t.robe ? 'wearing layered scholar robes' : 'wearing lamellar armor with shoulder guards',
      `accent color ${color}`, EN.weapon[t.weapon], t.patch ? 'eyepatch over left eye' : null, t.eyeColor ? 'blue-green eyes' : null].filter(Boolean);
    md += `### ${g.name}　${cls}${t.title ? `「${t.title}」` : ''}\n`
      + `- 特徵：${zh.join('、')}\n`
      + `- 提示詞：${g.name} (Three Kingdoms era ${t.robe ? 'strategist' : 'general'}), ${en.join(', ')}, ${STYLE}\n\n`;
  }
}

const out = path.join(root, 'art', 'portrait-briefs.md');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, md);
console.log(`已輸出 ${path.relative(process.cwd(), out)}（${sc.generals.length} 名武將）`);
