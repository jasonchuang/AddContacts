// 自動試玩：讓「玩家機器人」（與電腦勢力相同的 AI）代替玩家，從開局打到結束，統計各劇本、各勢力的結果。
// 執行：node sangoku/tools/playtest.js [劇本id] [每個勢力的局數，預設 3] [最多年數，預設 60]
// 難易度：DIFF=easy|normal|hard node sangoku/tools/playtest.js …
'use strict';
const path = require('path');
global.TK = {};
for (const f of ['tuning.js', 'data.js', 'scenarios.js', 'engine.js', 'ai.js', 'diplomacy.js', 'events.js']) require(path.join(__dirname, '..', 'js', f));
const E = TK.Engine, D = TK.Diplomacy;

const only = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2] : null;
const RUNS = +(process.argv[3] || 3);
const MAXY = +(process.argv[4] || 60);

function playOne(sc, fid, seed, mode) {
  TK.SCENARIO = sc;
  const s = E.newGame(fid, seed, mode || 'historical', process.env.DIFF || 'normal');
  const issues = [];
  let months = 0, peak = 0, stuck = 0, lastCities = -1;
  TK.Events.run(s);
  while (!s.over && months < MAXY * 12) {
    // 玩家機器人：接受停戰／同盟提議，然後照電腦的策略行動
    for (const p of (s.pending || []).splice(0)) if (p.type === 'proposal') D.respond(s, p, true);
    TK.AI.run(s, fid);
    E.endTurn(s);
    months++;
    const mine = E.citiesOf(s, fid).length;
    peak = Math.max(peak, mine);
    stuck = mine === lastCities ? stuck + 1 : 0;
    lastCities = mine;
    // 健全性檢查
    for (const c of Object.values(s.cities)) {
      if (!Number.isFinite(c.troops) || c.troops < 0 || !Number.isFinite(c.gold) || !Number.isFinite(c.food)) issues.push(`${s.year}/${s.month} ${c.name} 數值異常`);
      if (c.owner && !s.factions[c.owner].alive) issues.push(`${s.year}/${s.month} ${c.name} 屬於已滅亡的${c.owner}`);
    }
    for (const g of Object.values(s.generals)) {
      if (g.status === 'active' && (!g.faction || !s.factions[g.faction].alive)) issues.push(`${g.name} active 但無勢力`);
      if (g.status === 'active' && s.cities[g.city] && s.cities[g.city].owner !== g.faction) issues.push(`${s.year}/${s.month} ${g.name} 在他國城 ${g.city}`);
    }
    if (issues.length > 5) break;
  }
  const alive = Object.values(s.factions).filter((f) => f.alive).length;
  return { result: s.over ? s.over.result : 'timeout', years: +(months / 12).toFixed(1), peak, cities: E.citiesOf(s, fid).length, alive, stuck, issues: [...new Set(issues)].slice(0, 5), s };
}

function main() {
  const rows = [];
  const allIssues = new Set();
  for (const sc of TK.SCENARIOS) {
    if (only && sc.id !== only) continue;
    for (const f of sc.factions) {
      const res = [];
      for (let r = 0; r < RUNS; r++) res.push(playOne(sc, f.id, 1000 + r * 7919));
      res.forEach((x) => x.issues.forEach((i) => allIssues.add(`[${sc.id} ${f.name}] ${i}`)));
      const win = res.filter((x) => x.result === 'win');
      const lose = res.filter((x) => x.result === 'lose');
      rows.push({
        劇本: `${sc.year} ${sc.title}`, 勢力: f.name,
        勝: win.length, 敗: lose.length, 超時: res.length - win.length - lose.length,
        統一年數: win.length ? (win.reduce((a, x) => a + x.years, 0) / win.length).toFixed(1) : '-',
        敗亡年數: lose.length ? (lose.reduce((a, x) => a + x.years, 0) / lose.length).toFixed(1) : '-',
        最多城: Math.max(...res.map((x) => x.peak)),
        超時剩餘勢力: res.filter((x) => x.result === 'timeout').map((x) => x.alive).join(',') || '-',
      });
    }
  }
  console.table(rows);
  if (allIssues.size) { console.log('問題：'); for (const i of [...allIssues].slice(0, 40)) console.log('  ' + i); } else console.log('沒有發現數值或歸屬異常。');
}

if (require.main === module) main();
module.exports = { playOne };
