// 產生 duel/js/roster.js：100 位武將的能力、外觀與必殺技。
// 執行：node duel/tools/gen_roster.js <Godot 版 godot/data/scenario_190.json 的路徑>
// 能力與外觀取自 Godot 版劇本（claude/sanguo-godot 分支）；勢力顏色取自網頁版 sangoku/js/data.js。
'use strict';
const fs = require('fs');
const path = require('path');
const { traits } = require('./portrait_traits.js');

const src = process.argv[2];
if (!src) { console.error('用法：node duel/tools/gen_roster.js <scenario_190.json>'); process.exit(1); }
const scn = JSON.parse(fs.readFileSync(src, 'utf8'));

global.TK = {};
require(path.join(__dirname, '../../sangoku/js/data.js'));
const web = TK.SCENARIO;
const FCOL = Object.fromEntries(web.factions.map((f) => [f.id, f.color]));
const webFaction = Object.fromEntries(web.generals.map((g) => [g.name, g.faction]));
const NEUTRAL = '#8a7a5c';

// 必殺技類型：
//  power 重擊（傷害 ×2.4）  combo 連擊（三連擊）  stun 震懾（傷害並令對手下回合無法行動）
//  drain 鼓舞（傷害並回復體力）  trick 計略（以智力造成傷害、清空對手氣力並令其停一回合）
//  arrow 神射（只需 2 格氣）
const NAMED = {
  呂布: ['天下無雙', 'power'], 張飛: ['燕人怒吼', 'stun'], 馬超: ['錦馬突擊', 'combo'], 關羽: ['青龍偃月斬', 'power'],
  許褚: ['虎痴裸衣', 'power'], 趙雲: ['七進七出', 'combo'], 典韋: ['雙戟護主', 'power'], 孫策: ['小霸王', 'combo'],
  黃忠: ['百步穿楊', 'arrow'], 顏良: ['河北之刃', 'power'], 文醜: ['河北之槍', 'stun'], 太史慈: ['神亭酣鬥', 'combo'],
  甘寧: ['百騎劫營', 'combo'], 魏延: ['子午奇兵', 'power'], 夏侯惇: ['拔矢啖睛', 'drain'], 夏侯淵: ['三日五百', 'combo'],
  張遼: ['威震逍遙', 'stun'], 龐德: ['抬櫬決死', 'power'], 孫堅: ['江東猛虎', 'power'], 華雄: ['關前斬將', 'power'],
  周泰: ['身被十二創', 'drain'], 徐晃: ['長驅直入', 'stun'], 張郃: ['巧變', 'combo'], 高順: ['陷陣', 'stun'],
  諸葛亮: ['八陣圖', 'trick'], 周瑜: ['赤壁之火', 'trick'], 龐統: ['連環計', 'trick'], 郭嘉: ['十勝十敗', 'trick'],
  賈詡: ['亂武', 'trick'], 司馬懿: ['鷹視狼顧', 'trick'], 陸遜: ['火燒連營', 'trick'], 荀彧: ['王佐之才', 'trick'],
  曹操: ['奸雄', 'drain'], 劉備: ['仁德', 'drain'], 孫權: ['坐斷東南', 'drain'], 董卓: ['暴虐', 'power'],
  袁紹: ['四世三公', 'drain'], 呂蒙: ['白衣渡江', 'trick'], 徐庶: ['擊劍任俠', 'combo'], 黃蓋: ['苦肉計', 'drain'],
};
const DEFAULT_NAME = { power: '猛擊', combo: '連斬', stun: '怒喝', drain: '鼓舞', trick: '奇策', arrow: '神射' };

function hash(s) { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0; return h; }

const roster = scn.generals.map((g) => {
  let sp = NAMED[g.name];
  if (!sp) {
    let type;
    if (g.int >= 85 && g.war < 70) type = 'trick';
    else if (g.war >= 80) type = ['power', 'combo', 'stun'][hash(g.name) % 3];
    else if (g.cha >= 80) type = 'drain';
    else type = ['power', 'combo', 'drain', 'stun'][hash(g.name) % 4];
    sp = [DEFAULT_NAME[type], type];
  }
  const fid = webFaction[g.name] || g.faction || null;
  return {
    name: g.name, war: g.war, lead: g.lead, int: g.int, cha: g.cha,
    color: (fid && FCOL[fid]) || NEUTRAL,
    sp: sp[0], type: sp[1],
    look: traits(g),
  };
});

const out = `/* 由 tools/gen_roster.js 產生，請勿手改。100 位武將的能力、外觀特徵與必殺技。 */
(function (TK) {
  TK.ROSTER = ${JSON.stringify(roster)};
})(globalThis.TK = globalThis.TK || {});
`;
fs.writeFileSync(path.join(__dirname, '../js/roster.js'), out);
console.log(`武將 ${roster.length} 位，具名必殺技 ${roster.filter((r) => NAMED[r.name]).length} 個`);
