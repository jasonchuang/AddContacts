/* 手感數值表：遊戲平衡相關的數字集中在這裡，改這個檔就能調整手感。
 * 每個數值的意義與調整建議見 SPEC.md「手感數值」一節。
 * 改完請跑：node test/engine.test.js 與 node tools/playtest.js all 2（看勝率、統一年數有沒有跑掉）。 */
(function (TK) {
  'use strict';
  TK.TUNING = {
    // ---------- 戰鬥 ----------
    battle: {
      lossRate: 0.08,          // 每回合基本傷害係數（越大，戰鬥越快結束）
      wallPerDefense: 2500,    // 城防加成：守方戰力 ×(1 + 城防/此值)；城防 500 ≈ +20%
      wallWearMin: 3, wallWearMax: 12, // 每回合城防損耗
      maxRounds: 20,           // 超過即「久攻不下」
      routDefender: 0.2,       // 守軍剩不到開戰時的 20%，且少於攻方一半 → 城破
      routAttacker: 0.3,       // 攻方剩不到開戰時的 30%，且少於守方 → 敗退
      retreatLoss: 0.08,       // 撤退時殿後損失
      phaseRounds: 4,          // 手動指揮時，每下一次指令打幾回合
    },
    orders: {
      assault: { dealt: 1.35, taken: 1.25 }, // 突擊：對敵傷害、我方損失倍率
      hold: { dealt: 0.75, taken: 0.65 },    // 穩守
      schemeSuccess: 1.9,      // 主動計略成功時對敵傷害倍率
      schemeFail: 1.2,         // 主動計略失敗時我方損失倍率
      schemeMin: 0.15, schemeMax: 0.85, // 主動計略成功率上下限
      passiveScheme: 1.5,      // 智略 75 以上自動用計（或識破反擊）時的倍率
    },
    units: {
      counter: 1.3, countered: 0.8, // 陸軍相剋（步剋砲、砲剋坦克、坦克剋步）：剋制方、被剋方
      apt: { S: 1.18, A: 1.07, B: 1, C: 0.9 }, // 主將兵種適性
      tankPower: 1.4,          // 坦克每兵戰力倍率
      artPower: 1.15,          // 砲兵每兵戰力倍率
      airPower: 1.5,           // 空軍每兵戰力倍率
      airWinter: 0.5,          // 冬季（12～2 月）空軍戰力與轟炸再乘此值
      airStrike: 3,            // 開戰轟炸：敵方損失 ×(1＋空軍比例×此值)
      navyPort: 1.6,           // 海軍攻守沿海、沿江城時的每兵戰力倍率
      navyInland: 0.3,         // 海軍攻守內陸城時的每兵戰力倍率
      navalGun: 2,             // 開戰艦砲：敵方損失 ×(1＋海軍比例×此值)，只限港口城
      infSturdy: 0.1,          // 步兵比例減少的損失
      airSturdy: 0.4,          // 空軍比例減少的損失（地面部隊打不到飛機）
      tankIntoArt: 1.25,       // 坦克衝上砲兵陣地（守方砲兵 ≥ 35%）時我方損失倍率
      artWall: 15,             // 攻方砲兵比例 ×此值，每回合額外削減城防
    },
    // ---------- 抗戰規則 ----------
    war: {
      axisPower: 1.5,          // 日方部隊的裝備與訓練優勢（戰力倍率）
      seaNavy: 0.2,            // 渡海進攻時，出陣部隊中海軍至少要佔的比例
      axisReinforce: 10000,     // 日方每月從本土增援到前線的兵力
      axisAggro: 0.8,          // 日方出兵門檻倍率（越小越積極）
      fullWarYear: 1937, fullWarMonth: 7, // 全面抗戰開始；之前日方只攻打年度攻勢目標
      preWarReinforce: 0.5,    // 全面抗戰前，日方增援再乘此值
      axisMid: 0.6,            // 1939 年起（相持階段）日方增援再乘此值
      axisLate: 0.35,          // 1943 年起（太平洋戰線吃緊）日方增援再乘此值
      supplyFree: 18,          // 日方佔領城數在此以內，補給不受影響
      supplyPer: 0.05,         // 每多佔一城，日方戰力降低的比例
      supplyMin: 0.5,         // 補給線拉長後，日方戰力最低只降到此倍率
      guerrillaRate: 0.04,     // 游擊戰：中共城兵力 × 此值，為每月削弱鄰近日佔城的兵力
      guerrillaMax: 1500,      // 游擊戰：每座日佔城每月最多削弱的兵力
      guerrillaRecruit: 300,   // 敵後根據地：每座鄰近的日佔城，每月為中共帶來的新兵
      coopDrift: 0.5,          // 國共合作度每月自然下降
      coopCcp: 3,              // 中共超過此城數後，每多一城合作度每月再降 0.5
      coopAlliance: 50,        // 合作度達此值，國共同盟自動延續、不會互攻
      coopFriction: 25,        // 合作度低於此值，國共同盟破裂（可能爆發衝突）
      coopPerGift: 2,          // 國共之間每送 100 金，合作度上升多少
      evacCommerce: 0.4,       // 大後方遷移：搬走的商業比例
      evacPop: 0.15,           // 大後方遷移：一起撤退的人口比例
      usAidGold: 300,          // 美國參戰後，每月援助國民政府的金
      usAidAir: 600,
      inflationPerYear: 0.12,  // 國共內戰：國府收入每年因通貨膨脹減少的比例（從 1946 年中起算）
      inflationMin: 0.4,       // 通膨最多讓國府收入降到此倍率
      landReform: 3000,
      kmtMoralePerYear: 0.15,  // 國共內戰：國軍士氣每年下降（戰力倍率），最低到 kmtMoraleMin
      kmtMoraleMin: 0.6,
      ccpPower: 1.25,          // 國共內戰：中共部隊的戰力倍率（機動、民心）        // 國共內戰：中共每座城每月因土地改革吸收的新兵
      infiltrate: 0.02,        // 國共內戰：中共城兵力 × 此值，每月削弱相鄰的國府城（每城上限 1000）           // 1942 年起（駝峰航線），每月送到昆明或重慶的空軍
    },
    // ---------- 單挑 ----------
    duel: {
      autoChance: 0.6,         // 電腦戰鬥中，雙方猛將夠強時自動單挑的機率
      moraleLoss: 0.15,        // 單挑落敗方兵力損失
      hitBase: 0.6, hitMin: 0.35, hitMax: 0.9, // 命中率 = 基礎 + 武力差/60
      critBase: 0.12,          // 會心一擊基本機率（武力 85 以上再加）
      critMult: 1.8,
    },
    // ---------- 內政與經濟 ----------
    economy: {
      commerceGold: 0.35,      // 每點商業的月收入
      harvestPerFarm: 30,      // 七月秋收：每點農業的糧
      upkeepPer: 250,          // 每多少兵每月付 1 金軍餉
      foodPer: 40,             // 每多少兵每月吃 1 糧
      troopCapPop: 0.12,       // 一城可養兵力＝人口 × 此值
      troopCapMin: 15000,
      desertUnpaid: 0.05,      // 欠餉時逃兵比例
      desertStarve: 0.1,       // 缺糧時逃兵比例
    },
    // ---------- 交易與送禮 ----------
    trade: {
      minCommerce: 200,        // 商業達到此值的城才能交易
      buyPrice: 12,            // 買 100 糧要多少金（基準）
      sellPrice: 8,            // 賣 100 糧得多少金（基準，比買價低，避免來回套利）
      harvestMult: 0.8,        // 秋收後（7～9 月）糧價倍率：便宜
      springMult: 1.25,        // 青黃不接（3～5 月）糧價倍率：貴
      polBonus: 0.004,         // 武將政務每高於 50 一點，價格好 0.4%
      maxPerCommerce: 20,      // 單次最多交易糧＝商業 × 此值
    },
    gift: {
      relPer100: 4,            // 每送 100 金，友好度上升（上限見 relMax）
      foodPerGold: 10,         // 送糧時 10 糧折算 1 金
      relMax: 60,              // 送禮最多把友好度提到此值
      chaBonus: 0.005,         // 使者魅力每高於 50 一點，效果 +0.5%
    },
    // ---------- 登用 ----------
    recruit: {
      freeBase: 0.15, freeCha: 0.55, freeMax: 0.85,         // 在野武將：基礎＋魅力/100×係數
      prisonerBase: 0.05, prisonerCha: 0.45, prisonerMax: 0.6, // 俘虜
    },
    // ---------- 難易度 ----------
    difficulty: {
      easy: { label: '容易', playerIncome: 1.2, aiIncome: 0.8, playerPower: 1.1, aiPower: 1, aiAggro: 1.15, recruit: 0.1 },
      normal: { label: '中等', playerIncome: 1, aiIncome: 1, playerPower: 1, aiPower: 1, aiAggro: 1, recruit: 0 },
      hard: { label: '困難', playerIncome: 1, aiIncome: 1.25, playerPower: 1, aiPower: 1.1, aiAggro: 0.92, recruit: 0 },
    },
  };
})(globalThis.TK = globalThis.TK || {});
