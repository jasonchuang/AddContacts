// 依劇本資料產生 D 風格（日系動畫賽璐璐）武將生圖提示詞。
// 執行：node godot/tools/gen_prompts.js  → 輸出 godot/art/prompts_D.md
// 特徵推得規則與 scripts/core/portrait.gd 的 traits() 一致；資料中的 look 欄位會覆蓋預設。
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const scn = JSON.parse(fs.readFileSync(path.join(root, 'data', 'scenario_190.json'), 'utf8'));

const STYLE = 'anime cel-shaded illustration, clean bold line art, two-tone cel shading, vivid saturated colors, '
  + 'half-length portrait, body slightly turned, facing viewer, centered, head in upper part of frame, '
  + 'plain soft blue-gray gradient background, high quality character art, no text, no watermark, no logo';
const NEGATIVE = 'photorealistic, 3d render, painterly, blurry, extra fingers, deformed hands, text, watermark, signature, frame, multiple people';

const COLOR = { cao: 'deep blue', liu: 'green', sun: 'crimson red', yuans: 'golden yellow', dong: 'purple', liubiao: 'teal' };
const BAND = { '#2e7d32': 'green', '#c0392b': 'red', '#8e44ad': 'purple' };
const FNAME = Object.fromEntries(scn.factions.map((f) => [f.id, f.name]));

function hash(s) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
  return h;
}

function traits(g) {
  const h = hash(g.name);
  const pick = (arr, salt) => arr[(h >>> salt) % arr.length];
  let t;
  if (g.ruler) t = { hat: 'crown', weapon: 'sword', beard: pick(['short', 'mustache', 'long'], 3), eyes: pick(['calm', 'sly'], 5) };
  else if (g.int >= 80 && g.war < 60) t = { hat: 'scholar', robe: true, weapon: g.int >= 92 ? 'fan' : 'scroll', beard: pick(['goatee', 'long', 'mustache', 'none'], 2), eyes: pick(['calm', 'sly'], 7) };
  else if (g.war >= 80) t = { hat: pick(['helmet', 'helmet', 'headband'], 4), weapon: pick(['spear', 'glaive', 'halberd', 'axe', 'sword'], 1), beard: pick(['full', 'short', 'none', 'long'], 6), eyes: 'fierce' };
  else if (g.pol >= 75 && g.war < 50) t = { hat: 'scholar', robe: true, weapon: 'scroll', beard: pick(['mustache', 'goatee', 'short'], 2), eyes: 'calm' };
  else t = { hat: pick(['helmet', 'headband'], 3), weapon: pick(['sword', 'spear'], 5), beard: pick(['short', 'mustache', 'none'], 1), eyes: pick(['calm', 'fierce'], 8) };
  t.skin = pick(['normal', 'normal', 'fair', 'tan'], 9);
  t.hair = 'black';
  t.age = 'mid';
  Object.assign(t, g.look || {});
  if (t.age === 'old' && t.hair === 'black') t.hair = 'grey';
  return t;
}

const AGE = { young: 'young man in his twenties', mid: 'man in his thirties or forties', old: 'elderly man in his sixties' };
const HAIR = { black: 'black hair', brown: 'brown hair', grey: 'graying hair', white: 'white hair' };
const SKIN = { normal: '', fair: 'fair skin', tan: 'tanned skin', red: 'deep red complexion', dark: 'dark weathered skin' };
const HAT = {
  helmet: 'wearing an iron war helmet with a red tassel',
  crown: 'hair in a topknot with a small official cap and gold hairpin',
  scholar: 'wearing a soft dark-blue scholar headscarf',
  headband: 'hair tied up with a cloth headband',
  feather: 'wearing a golden headdress with two long pheasant-tail plumes',
  bald: 'shaved head with a small topknot',
};
const BEARD = { long: 'long flowing beard', full: 'thick bushy full beard', short: 'short trimmed beard', goatee: 'thin goatee', mustache: 'neat mustache', none: 'clean-shaven' };
const EYES = { fierce: 'fierce determined eyes, heavy eyebrows', calm: 'calm composed expression', sly: 'narrow shrewd eyes, slight smirk' };
const WEAPON = {
  bow: 'holding a longbow, quiver of arrows on his back',
  spear: 'holding a long spear upright',
  snake: 'holding a long spear with a wavy serpent-shaped blade',
  glaive: 'holding a long-handled crescent-bladed glaive',
  halberd: 'holding a halberd with crescent side blades',
  axe: 'holding a large battle axe',
  sword: 'hand resting on a sword hilt',
  twin: 'two swords on his back',
  fan: 'holding a white feather fan',
  scroll: 'holding a bamboo scroll',
};

function prompt(g) {
  const t = traits(g);
  const col = COLOR[g.faction] || 'muted brown and gray';
  const outfit = t.robe
    ? `wearing layered scholar robes in ${col}`
    : `wearing lamellar armor with ${t.armor ? 'silver-white' : col} cloth and shoulder guards`;
  const parts = [
    // 不放人名：避免模型模仿既有作品中的人物造型，只以外觀特徵描述原創角色
    `original character, a Three Kingdoms era Chinese ${t.robe ? 'strategist' : g.ruler ? 'warlord' : 'general'}`,
    AGE[t.age], HAIR[t.hair], SKIN[t.skin], HAT[t.hat], BEARD[t.beard], EYES[t.eyes],
    t.patch ? 'black eyepatch over his left eye' : '', t.eyeColor ? 'striking blue-green eyes' : '',
    t.band ? `${BAND[t.band] || 'colored'} headband` : '', outfit, WEAPON[t.weapon] || '',
  ].filter(Boolean);
  return `${parts.join(', ')}, ${STYLE}`;
}

const order = ['劉備', '關羽', '諸葛亮'];
const firstBatch = ['曹操', '孫堅', '袁紹', '董卓', '劉表', '張飛', '趙雲', '呂布', '周瑜', '夏侯惇', '典韋', '黃忠', '馬超', '孫策', '孫權', '郭嘉', '張遼'];
const byName = Object.fromEntries(scn.generals.map((g) => [g.name, g]));
const rest = scn.generals.map((g) => g.name).filter((n) => !order.includes(n) && !firstBatch.includes(n));

let md = '# D 風格武將提示詞\n\n由 `tools/gen_prompts.js` 依遊戲資料自動產生，請勿手動編輯；要調整人物外觀請改 `tools/gen_data.js` 的 LOOK 表後重新產生。\n\n'
  + '提示詞刻意不含人名，只描述外觀特徵，避免生圖工具模仿既有作品中的人物造型。\n\n'
  + `**負面提示詞**：\`${NEGATIVE}\`\n\n`
  + '輸出 800×1000 PNG，檔名為武將名稱（例如 `關羽.png`），放進 `art/portraits/`。\n\n';
const section = (title, names) => {
  md += `## ${title}\n\n`;
  for (const n of names) {
    const g = byName[n];
    if (!g) continue;
    md += `### ${n}（${g.faction ? FNAME[g.faction] : '在野'}）\n\n\`\`\`\n${prompt(g)}\n\`\`\`\n\n`;
  }
};
section('樣張（先做這 3 張）', order);
section('第一批', firstBatch);
section('其餘武將', rest);

const out = path.join(root, 'art', 'prompts_D.md');
fs.writeFileSync(out, md);
console.log(`已輸出 ${path.relative(process.cwd(), out)}（${scn.generals.length} 名武將）`);
console.log('\n--- 樣張預覽 ---');
for (const n of order) console.log(`\n${n}：\n${prompt(byName[n])}`);
