// 武將外觀特徵（帽子、鬍鬚、膚色、眼神、武器）。規則與 scripts/core/portrait.gd 的 traits() 一致；
// 資料中的 look 欄位會覆蓋預設。gen_prompts.js 與 render_portraits.js 共用。
'use strict';

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

module.exports = { traits, hash };
