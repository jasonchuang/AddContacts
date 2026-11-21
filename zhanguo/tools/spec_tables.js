// 由 js/tuning.js 產生 SPEC.md「手感數值」一節的表格，數值永遠以 tuning.js 為準，文件不會跟程式對不上。
// 執行：node sangoku/tools/spec_tables.js          → 更新 SPEC.md
//       node sangoku/tools/spec_tables.js --check  → 只檢查（不一致或有數值沒寫說明時，結束碼為 1）
// build.js 每次打包都會自動執行更新；單元測試會執行檢查。
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const SPEC = path.join(root, 'SPEC.md');
const START = '<!-- tuning:start（以下由 tools/spec_tables.js 依 js/tuning.js 產生，請改 tuning.js 或本工具的說明，不要直接改表格） -->';
const END = '<!-- tuning:end -->';

// 每一列：[數值名稱（可多個，用 / 相連）, 意義, 調大會怎樣（可省略）]
const DOCS = [
  { key: 'battle', title: '戰鬥', effect: true, rows: [
    [['lossRate'], '每回合基本傷害係數', '戰鬥更快結束、雙方損失更重'],
    [['wallPerDefense'], '守方戰力 ×(1＋城防/此值)；城防 999 約 ×1.4', '**調小**守城更強'],
    [['wallWearMin', 'wallWearMax'], '每回合城防損耗', '長期圍城更容易破城'],
    [['maxRounds'], '超過即「久攻不下」撤兵', '允許更長的攻城戰'],
    [['routDefender'], '守軍剩不到此比例且少於攻方一半就城破', '城更容易破'],
    [['routAttacker'], '攻方剩不到此比例且少於守方就敗退', '進攻方更早放棄'],
    [['retreatLoss'], '撤退時殿後損失', '撤退代價更高'],
    [['phaseRounds'], '手動指揮時，每下一次指令打幾回合', '下指令的次數變少'],
  ] },
  { key: 'orders', title: '戰鬥指令', rows: [
    [['assault.dealt', 'assault.taken'], '突擊：對敵傷害、我方損失倍率'],
    [['hold.dealt', 'hold.taken'], '穩守：對敵傷害、我方損失倍率'],
    [['schemeSuccess'], '主動計略成功時對敵傷害倍率'],
    [['schemeFail'], '主動計略失敗時我方損失倍率'],
    [['schemeMin', 'schemeMax'], '主動計略成功率上下限（智略越高越容易成功）'],
    [['passiveScheme'], '智略 75 以上自動用計，或守方識破反擊時的倍率'],
  ] },
  { key: 'units', title: '兵種', rows: [
    [['counter', 'countered'], '兵種相剋（槍剋騎、騎剋弩、弩剋槍）：剋制方、被剋方'],
    [['apt'], '主將對該兵種的適性'],
    [['cavCharge'], '攻方騎兵比例帶來的戰力加成'],
    [['xbowWall'], '守方弩兵比例帶來的戰力加成'],
    [['spearSturdy'], '槍兵比例減少的損失'],
    [['chargeIntoSpear'], '騎兵衝上槍陣（守方槍兵 ≥ 40%）時我方損失倍率'],
  ] },
  { key: 'duel', title: '單挑', rows: [
    [['autoChance'], '電腦戰鬥中，雙方猛將（武力 ≥ 70 與 ≥ 50）自動單挑的機率'],
    [['moraleLoss'], '單挑落敗方的兵力損失'],
    [['hitBase', 'hitMin', 'hitMax'], '命中率＝基礎＋武力差/60，限制在上下限之間'],
    [['critBase', 'critMult'], '會心一擊機率（武力 85 以上再加）與傷害倍率'],
  ] },
  { key: 'economy', title: '經濟', rows: [
    [['commerceGold'], '每點商業的月收入（再乘民心；太守依政務加成）'],
    [['harvestPerFarm'], '七月秋收：每點農業的糧（再乘民心）'],
    [['upkeepPer'], '每多少兵每月付 1 金軍餉'],
    [['foodPer'], '每多少兵每月吃 1 糧'],
    [['troopCapPop', 'troopCapMin'], '一城可養兵力＝人口 × 此值（有最低值）'],
    [['desertUnpaid', 'desertStarve'], '欠餉、缺糧時的逃兵比例'],
  ] },
  { key: 'recruit', title: '登用', rows: [
    [['freeBase', 'freeCha', 'freeMax'], '在野武將：成功率＝基礎＋魅力/100×係數，上限'],
    [['prisonerBase', 'prisonerCha', 'prisonerMax'], '俘虜（再扣忠誠）'],
  ] },
];

function get(obj, p) { return p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj); }
function fmt(v) {
  if (v && typeof v === 'object') return Object.entries(v).map(([k, x]) => `${k} ${x}`).join('、');
  return String(v);
}
function leaves(obj, prefix) {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    // 適性表（S/A/B/C）當成一個數值
    if (v && typeof v === 'object' && !('S' in v)) out.push(...leaves(v, p)); else out.push(p);
  }
  return out;
}

function generate(T) {
  const lines = [START, ''];
  const documented = new Set();
  for (const sec of DOCS) {
    lines.push(`### ${sec.title} \`${sec.key}\``, '');
    lines.push(sec.effect ? '| 名稱 | 目前 | 意義 | 調大會怎樣 |' : '| 名稱 | 目前 | 意義 |');
    lines.push(sec.effect ? '|---|---|---|---|' : '|---|---|---|');
    for (const [paths, meaning, effect] of sec.rows) {
      paths.forEach((p) => documented.add(`${sec.key}.${p}`));
      const vals = paths.map((p) => {
        const v = get(T[sec.key], p);
        if (v === undefined) throw new Error(`tuning.js 沒有 ${sec.key}.${p}`);
        return fmt(v);
      });
      const cells = [paths.join(' / '), vals.join(' / '), meaning];
      if (sec.effect) cells.push(effect || '');
      lines.push(`| ${cells.join(' | ')} |`);
    }
    lines.push('');
  }
  // 難易度
  lines.push('### 難易度 `difficulty`', '');
  lines.push('| | 玩家收入 | 玩家戰力 | 電腦收入 | 電腦戰力 | 電腦出兵門檻 aiAggro | 登用加成 |', '|---|---|---|---|---|---|---|');
  for (const [k, d] of Object.entries(T.difficulty)) {
    ['label', 'playerIncome', 'playerPower', 'aiIncome', 'aiPower', 'aiAggro', 'recruit'].forEach((f) => documented.add(`difficulty.${k}.${f}`));
    const aggro = d.aiAggro > 1 ? '（較保守）' : d.aiAggro < 1 ? '（較積極）' : '';
    lines.push(`| ${d.label} | ×${d.playerIncome} | ×${d.playerPower} | ×${d.aiIncome} | ×${d.aiPower} | ${d.aiAggro}${aggro} | ${d.recruit ? `+${Math.round(d.recruit * 100)}%` : '0'} |`);
  }
  lines.push('', '難易度選單的說明文字由數值自動產生，改數值不用另外改說明。', '', END);
  // 沒寫說明的數值
  const missing = leaves(T).filter((p) => !documented.has(p));
  return { text: lines.join('\n'), missing };
}

function load() {
  global.TK = global.TK || {};
  delete require.cache[require.resolve(path.join(root, 'js', 'tuning.js'))];
  require(path.join(root, 'js', 'tuning.js'));
  return global.TK.TUNING;
}

// 回傳 { ok, changed, missing, text }
function run(check) {
  const { text, missing } = generate(load());
  const spec = fs.readFileSync(SPEC, 'utf8');
  const a = spec.indexOf(START), b = spec.indexOf(END);
  if (a < 0 || b < 0) throw new Error('SPEC.md 找不到 tuning:start / tuning:end 標記');
  const next = spec.slice(0, a) + text + spec.slice(b + END.length);
  const changed = next !== spec;
  if (!check && changed) fs.writeFileSync(SPEC, next);
  return { ok: !missing.length && (!check || !changed), changed, missing };
}

if (require.main === module) {
  const check = process.argv.includes('--check');
  const r = run(check);
  if (r.missing.length) console.log('以下數值在 tools/spec_tables.js 沒有說明：' + r.missing.join('、'));
  if (check) console.log(r.changed ? 'SPEC.md 的數值表與 tuning.js 不一致，請執行 node sangoku/tools/spec_tables.js' : 'SPEC.md 與 tuning.js 一致');
  else console.log(r.changed ? '已更新 SPEC.md 的數值表' : 'SPEC.md 數值表已是最新');
  process.exit(r.ok ? 0 : 1);
}
module.exports = { run };
