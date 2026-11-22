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
      counter: 1.3, countered: 0.8, // 兵種相剋：剋制方、被剋方
      apt: { S: 1.18, A: 1.07, B: 1, C: 0.9 }, // 主將兵種適性
      cavCharge: 0.12,         // 攻方騎兵比例帶來的戰力加成
      xbowWall: 0.15,          // 守方弩兵比例帶來的戰力加成
      spearSturdy: 0.1,        // 槍兵比例減少的損失
      chargeIntoSpear: 1.25,   // 騎兵衝上槍陣時我方損失倍率
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
