/* 楚漢相爭的劇本。年份以「負數」表示西元前（-206 = 西元前 206 年），畫面上顯示為「前206年」。
 * 人物、地名與事件取自《史記》《漢書》等公有領域史料；能力值、兵力與對話皆為本作自行設定。 */
(function (TK) {
  'use strict';
  const D = TK.CHUHAN;

  const COL = { han: '#e8382c', chu: '#3a3a8a', yong: '#8a6a3a', sai: '#b0703a', zhai: '#c8a050', wei: '#9a48e0', henan: '#6a9a5a',
    hann: '#1cc0c8', zhao: '#e8c020', dai: '#c8b060', yan: '#e858b0', qi: '#3a6ee8', jiujiang: '#2fb84a', linjiang: '#2b7a78' };

  const DEFS = [
    {
      id: '-206', title: '漢王之國', year: -206, month: 4, tag: '劉邦 對 項羽・三秦',
      desc: '鴻門宴後，項羽分封十八諸侯，把劉邦封到偏遠的漢中，又讓秦降將章邯等三人據守關中，堵住漢軍的出路。蕭何月下追回了韓信，漢王拜他為大將。',
      factions: [['han', '漢', '劉邦'], ['chu', '西楚', '項羽'], ['yong', '雍', '章邯'], ['sai', '塞', '司馬欣'], ['zhai', '翟', '董翳'],
        ['wei', '西魏', '魏豹'], ['henan', '河南', '申陽'], ['hann', '韓', '鄭昌'], ['zhao', '趙', '趙歇'], ['yan', '燕', '臧荼'],
        ['qi', '齊', '田榮', '田橫'], ['jiujiang', '九江', '英布'], ['linjiang', '臨江', '共敖']],
      cities: { 南鄭: ['han', 30000], 江州: ['han', 12000], 成都: ['han', 20000],
        廢丘: ['yong', 30000], 隴西: ['yong', 14000], 櫟陽: ['sai', 22000], 高奴: ['zhai', 15000],
        彭城: ['chu', 60000], 定陶: ['chu', 30000], 吳: ['chu', 25000], 會稽: ['chu', 14000], 宛: ['chu', 20000], 陽翟: ['hann', 15000],
        安邑: ['wei', 25000], 洛陽: ['henan', 20000], 函谷: ['henan', 8000], 邯鄲: ['zhao', 30000], 晉陽: ['zhao', 18000], 井陘: ['zhao', 8000], 鉅鹿: ['zhao', 16000],
        薊: ['yan', 25000], 無終: ['yan', 10000], 臨淄: ['qi', 35000], 歷下: ['qi', 20000], 即墨: ['qi', 15000],
        六: ['jiujiang', 30000], 江陵: ['linjiang', 18000] },
      people: {
        han: { 南鄭: '劉邦 韓信 張良 樊噲 曹參 周勃 夏侯嬰 灌嬰 酈商 靳歙 盧綰 紀信 傅寬', 成都: '蕭何 周苛', 江州: '王陵' },
        chu: { 彭城: '項羽 范增 龍且 季布 項莊 項伯 項聲 虞子期', 定陶: '鍾離昧 曹咎 丁公', 吳: '周殷 桓楚', 宛: '周蘭' },
        yong: { 廢丘: '章邯 章平' }, sai: { 櫟陽: '司馬欣' }, zhai: { 高奴: '董翳' },
        wei: { 安邑: '魏豹 柏直 馮敬 項它' }, henan: { 洛陽: '申陽' }, hann: { 陽翟: '鄭昌' },
        zhao: { 邯鄲: '趙歇 陳餘 李左車', 晉陽: '夏說' }, yan: { 薊: '臧荼 韓廣' },
        qi: { 臨淄: '田榮 田橫 田廣', 歷下: '田既 田解' }, jiujiang: { 六: '英布' }, linjiang: { 江陵: '共敖' },
      },
      free: { 滎陽: '陳平 酈食其', 鉅鹿: '張耳', 定陶: '彭越', 臨淄: '蒯通', 陽翟: '隨何 陸賈' },
      loyalty: { 英布: 70, 魏豹: 80 },
      strategists: { han: '張良', chu: '范增', zhao: '李左車' },
      relations: [['chu', 'qi', 'war'], ['han', 'chu', 'truce', 4]],
      events: [
        {
          id: 'hongmen', title: '鴻門宴', scene: 'palace',
          cond: { from: [-206, 4], alive: ['han', 'chu'] },
          effects: [],
          lines: [['', '（數月前・鴻門）'], ['范增', '（三度舉起玉玦，示意項王動手。）'], ['項羽', '……'],
            ['項莊', '軍中無以為樂，請以劍舞助興！'], ['項伯', '一人舞劍不好看，我也來。（以身體護住沛公）'],
            ['樊噲', '（持盾闖入帳中）秦王有虎狼之心，殺人如不能舉，天下皆叛之。沛公先入咸陽，秋毫不敢有所近，還軍霸上以待大王來——'],
            ['張良', '沛公已經走了。留下白璧一雙獻給大王，玉斗一雙獻給亞父。'], ['范增', '唉！豎子不足與謀！奪項王天下者，必沛公也！']],
        },
        {
          id: 'baijiang', title: '拜將', scene: 'camp',
          cond: { from: [-206, 4], alive: ['han'], general_faction: { 韓信: 'han' } },
          effects: [{ do: 'loyalty_of', generals: ['韓信'], value: 100 }],
          lines: [['蕭何', '諸將易得耳。至如信者，國士無雙。大王若要爭天下，非信無可與計事者。'], ['劉邦', '好！擇良辰、設壇場，拜韓信為大將！'],
            ['韓信', '項王雖霸天下，卻不能任屬賢將，此匹夫之勇；三秦之民怨章邯入骨。大王東進，三秦可傳檄而定。']],
        },
        {
          id: 'chencang', title: '暗渡陳倉', scene: 'field',
          cond: { from: [-206, 8], alive: ['han', 'yong'], general_faction: { 韓信: 'han' }, owns: { han: ['南鄭'] } },
          effects: [{ do: 'troops_scale', city: '廢丘', mult: 0.5 }, { do: 'troops_scale', city: '隴西', mult: 0.6 }, { do: 'relation', a: 'han', b: 'yong', state: 'war' }],
          lines: [['韓信', '派人大張旗鼓修復棧道，讓章邯以為我軍要從棧道出兵。'], ['韓信', '主力卻從故道悄悄繞到陳倉。'], ['章邯', '什麼？漢軍已到陳倉？棧道明明還沒修好！']],
        },
        {
          id: 'pengcheng', title: '彭城之戰', scene: 'fire',
          cond: { from: [-205, 4], alive: ['han', 'chu'], owns: { han: ['彭城'] }, chance: 0.5 },
          effects: [{ do: 'troops_scale', city: '彭城', mult: 0.3 }, { do: 'relation', a: 'han', b: 'chu', state: 'war' }],
          lines: [['項羽', '劉邦趁我北擊齊國，竟敢取我彭城！三萬精騎，隨我回師！'], ['', '楚軍黎明突襲，漢軍大亂，睢水為之不流。'], ['劉邦', '撤！快撤！']],
        },
      ],
    },
    {
      id: '-205', title: '韓信北伐', year: -205, month: 8, tag: '韓信 橫掃 魏・趙・燕・齊',
      desc: '彭城大敗後，漢王在滎陽與項羽相持。魏王豹叛漢歸楚，趙、代、燕、齊各據一方。漢王撥兵給韓信，命他從北路開闢第二戰場——國士無雙的傳奇就此展開。',
      factions: [['han', '漢', '劉邦'], ['chu', '西楚', '項羽'], ['wei', '西魏', '魏豹'], ['dai', '代', '夏說'], ['zhao', '趙', '趙歇'],
        ['yan', '燕', '臧荼'], ['qi', '齊', '田廣', '田橫'], ['jiujiang', '九江', '英布'], ['linjiang', '臨江', '共敖']],
      cities: { 南鄭: ['han', 12000], 江州: ['han', 10000], 成都: ['han', 18000], 隴西: ['han', 10000], 廢丘: ['han', 12000],
        櫟陽: ['han', 38000], 高奴: ['han', 12000], 函谷: ['han', 10000], 洛陽: ['han', 20000], 滎陽: ['han', 40000], 陽翟: ['han', 15000],
        彭城: ['chu', 60000], 定陶: ['chu', 40000], 宛: ['chu', 22000], 吳: ['chu', 22000], 會稽: ['chu', 12000],
        安邑: ['wei', 32000], 晉陽: ['dai', 22000], 井陘: ['zhao', 20000], 邯鄲: ['zhao', 36000], 鉅鹿: ['zhao', 16000],
        薊: ['yan', 28000], 無終: ['yan', 10000], 臨淄: ['qi', 40000], 歷下: ['qi', 26000], 即墨: ['qi', 15000],
        六: ['jiujiang', 30000], 江陵: ['linjiang', 18000] },
      people: {
        han: { 櫟陽: '韓信 曹參 灌嬰 傅寬 靳歙 蕭何', 滎陽: '劉邦 張良 陳平 樊噲 周勃 夏侯嬰 紀信 周苛 酈食其', 洛陽: '王陵 酈商', 南鄭: '盧綰', 函谷: '隨何', 成都: '陸賈' },
        chu: { 彭城: '項羽 范增 季布 項莊 項伯 虞子期', 定陶: '鍾離昧 曹咎 丁公 項聲', 宛: '周殷', 吳: '桓楚', 會稽: '周蘭' },
        wei: { 安邑: '魏豹 柏直 馮敬 項它' }, dai: { 晉陽: '夏說' }, zhao: { 邯鄲: '趙歇 陳餘', 井陘: '李左車' },
        yan: { 薊: '臧荼', 無終: '韓廣' }, qi: { 臨淄: '田廣 田橫 蒯通', 歷下: '田既 田解' },
        jiujiang: { 六: '英布' }, linjiang: { 江陵: '共敖' },
      },
      free: { 定陶: '彭越', 鉅鹿: '張耳', 彭城: '龍且' },
      loyalty: { 英布: 60 },
      strategists: { han: '張良', chu: '范增', zhao: '李左車', qi: '蒯通' },
      relations: [['han', 'chu', 'war'], ['han', 'wei', 'war'], ['han', 'zhao', 'war'], ['zhao', 'dai', 'alliance'], ['chu', 'wei', 'alliance'], ['chu', 'qi', 'truce', 12]],
      events: [
        {
          id: 'mufou', title: '木罌渡河', scene: 'river',
          cond: { from: [-205, 9], alive: ['han', 'wei'], general_faction: { 韓信: 'han' }, owns: { han: ['櫟陽'], wei: ['安邑'] } },
          effects: [{ do: 'troops_scale', city: '安邑', mult: 0.45 }, { do: 'loyalty', faction: 'wei', amount: -20 }],
          lines: [['韓信', '魏軍重兵守在臨晉渡口。我們在對岸排滿船隻，裝作要從這裡渡河。'], ['曹參', '那主力呢？'],
            ['韓信', '用木罌綁成筏子，從夏陽偷渡，直取安邑。'], ['魏豹', '漢軍怎麼會從背後殺出來？！']],
        },
        {
          id: 'beishui', title: '背水一戰', scene: 'river',
          cond: { from: [-204, 10], alive: ['han', 'zhao'], general_faction: { 韓信: 'han', 陳餘: 'zhao' }, adjacent_factions: ['han', 'zhao'] },
          effects: [{ do: 'troops_scale', city: '井陘', mult: 0.35 }, { do: 'troops_scale', city: '邯鄲', mult: 0.6 }, { do: 'die', general: '陳餘' }],
          lines: [['李左車', '井陘道路狹窄，車不能並行。給我三萬兵從小路截斷漢軍糧道，不出十日，韓信的首級就能送到麾下。'],
            ['陳餘', '我們是義兵，不用詐謀奇計。韓信兵少又疲憊，正面擊破就是。'],
            ['韓信', '派兩千輕騎，每人帶一面漢軍赤旗，埋伏在山中。其餘一萬人，背水列陣。'], ['曹參', '背水列陣？這是兵家大忌啊！'],
            ['韓信', '置之死地而後生。士卒無路可退，人人都會死戰。'], ['', '趙軍傾營出擊，久攻不下；回頭一看，營壘上已插滿兩千面漢軍赤旗。趙軍大亂。']],
        },
        {
          id: 'guangwu', title: '師事廣武君', scene: 'palace',
          cond: { from: [-204, 11], alive: ['han'], owns: { han: ['邯鄲'] }, general_faction: { 韓信: 'han' } },
          effects: [{ do: 'join', general: '李左車', faction: 'han', force: true }, { do: 'loyalty_of', generals: ['李左車'], value: 95 }],
          lines: [['韓信', '有誰能生擒廣武君，賞千金。……先生請上座，韓信願以師禮相待。'], ['李左車', '敗軍之將，不可以言勇；亡國之大夫，不可以圖存。'],
            ['韓信', '若當初成安君聽先生之計，今日被擒的就是我了。請先生指教：北攻燕、東伐齊，該怎麼做？'],
            ['李左車', '將軍連戰之兵已疲。不如按兵休士，派一名辯士帶書信去燕國，燕必不敢不聽。']],
        },
        {
          id: 'yan_surrender', title: '燕國歸降', scene: 'castle',
          cond: { from: [-204, 12], alive: ['han', 'yan'], owns: { han: ['邯鄲'] }, general_faction: { 李左車: 'han' } },
          effects: [{ do: 'absorb', faction: 'yan', into: 'han' }],
          lines: [['臧荼', '趙國二十萬大軍一日之間就敗了……燕國豈能抵擋？'], ['臧荼', '傳令下去，燕國歸附漢王。']],
        },
        {
          id: 'weishui', title: '濰水之戰', scene: 'rain',
          cond: { from: [-203, 10], alive: ['han', 'qi'], general_faction: { 韓信: 'han' }, adjacent_factions: ['han', 'qi'] },
          effects: [{ do: 'die', general: '龍且' }, { do: 'troops_scale', city: '臨淄', mult: 0.45 },
            { do: 'troops_scale', city: '歷下', mult: 0.5 }],
          lines: [['龍且', '我素知韓信為人，容易對付。他曾受胯下之辱，有什麼可怕的？'],
            ['韓信', '連夜做一萬多個沙囊，堵住濰水上游。'], ['韓信', '明日佯敗渡河退走。等龍且追到河中，就把沙囊挖開。'],
            ['', '大水奔騰而下，楚軍過河的不到一半。龍且戰死，齊楚聯軍潰散。']],
        },
        {
          id: 'qiwang', title: '假齊王', scene: 'palace',
          cond: { from: [-203, 2], alive: ['han'], owns: { han: ['臨淄'] }, general_faction: { 韓信: 'han' } },
          effects: [{ do: 'loyalty_of', generals: ['韓信'], value: 80 }, { do: 'troops', city: '臨淄', unit: 'spear', amount: 15000 }],
          lines: [['韓信', '齊國多變詐、反覆無常，南邊又鄰楚國。請立臣為假齊王，以鎮撫齊地。'], ['劉邦', '我被困在這裡，日夜盼他來助我，他倒想自立為王——'],
            ['張良', '（低聲）大王，我軍不利，難道能禁止韓信稱王嗎？不如順勢立他，讓他好好守齊。'],
            ['劉邦', '……大丈夫平定諸侯，要做就做真王，做什麼假王！立韓信為齊王！'], ['蒯通', '（將軍，如今天下之勢，在你一念之間……）']],
        },
        {
          id: 'gaixia', title: '四面楚歌', scene: 'night',
          cond: { from: [-202, 10], alive: ['han', 'chu'], general_faction: { 韓信: 'han', 項羽: 'chu' }, cities_at_least: { han: 18 } },
          effects: [{ do: 'loyalty', faction: 'chu', amount: -25 }, { do: 'troops_scale', city: '彭城', mult: 0.6 }],
          lines: [['韓信', '在垓下佈下十面埋伏。夜裡讓漢軍四面唱楚歌。'], ['項羽', '漢軍已經全部攻佔楚地了嗎？為什麼楚人這麼多？'],
            ['項羽', '力拔山兮氣蓋世，時不利兮騅不逝……'], ['虞子期', '大王……']],
        },
      ],
    },
  ];

  function build(d) {
    const owner = {};
    const cities = D.cities.map((c0) => {
      const c = JSON.parse(JSON.stringify(c0));
      const o = d.cities[c.id];
      c.owner = o ? o[0] : null;
      c.troops = o ? o[1] : 6000;
      c.train = c.owner ? 55 : 40;
      c.gold = c.owner ? Math.max(800, Math.round(c.troops / 250 * 12)) : 400;
      c.food = Math.max(6000, Math.round(c.troops * 0.5));
      owner[c.id] = c.owner;
      return c;
    });
    const generals = [];
    const add = (name, faction, city, status) => {
      const st = D.STATS[name];
      if (!st) throw new Error(`劇本 ${d.title}：找不到武將 ${name}`);
      if (!D.cities.some((c) => c.id === city)) throw new Error(`劇本 ${d.title}：找不到城市 ${city}`);
      if (generals.some((g) => g.name === name)) throw new Error(`劇本 ${d.title}：武將重複 ${name}`);
      const loy = (d.loyalty && d.loyalty[name]) || 88;
      generals.push({ id: name, name, faction, city, lead: st[0], war: st[1], int: st[2], pol: st[3], cha: st[4],
        loyalty: faction ? loy : 0, status, hidden: status === 'free', ruler: false, skill: D.skills[name] || null });
    };
    const split = (s) => (s || '').split(/\s+/).filter(Boolean);
    for (const [fid, byCity] of Object.entries(d.people)) {
      for (const [city, names] of Object.entries(byCity)) {
        for (const n of split(names)) {
          if (owner[city] !== fid) throw new Error(`劇本 ${d.title}：${n} 所在的 ${city} 不屬於 ${fid}`);
          add(n, fid, city, 'active');
        }
      }
    }
    for (const [city, names] of Object.entries(d.free || {})) for (const n of split(names)) add(n, null, city, 'free');
    const factions = d.factions.map(([id, name, ruler, ...heirs]) => {
      const r = generals.find((g) => g.name === ruler);
      if (!r || r.faction !== id) throw new Error(`劇本 ${d.title}：${name} 的君主 ${ruler} 不在勢力中`);
      r.ruler = true;
      r.loyalty = 100;
      const st = (d.strategists || {})[id];
      return { id, name: `${name}`, ruler, color: COL[id], heirs, strategist: st || null };
    });
    for (const f of factions) if (!cities.some((c) => c.owner === f.id)) throw new Error(`劇本 ${d.title}：${f.name} 沒有城`);
    return { id: d.id, tag: d.tag, title: d.title, year: d.year, month: d.month, desc: d.desc, aptitude: D.aptitude,
      factions, cities, roads: D.roads, generals, relations: d.relations || [], events: (d.events || []).map((e) => Object.assign({ historical: true }, e)) };
  }

  TK.SCENARIOS = DEFS.map(build);
  TK.SCENARIO = TK.SCENARIOS[0];
  TK.scenarioById = (id) => TK.SCENARIOS.find((s) => s.id === id) || TK.SCENARIOS[0];
})(globalThis.TK = globalThis.TK || {});
