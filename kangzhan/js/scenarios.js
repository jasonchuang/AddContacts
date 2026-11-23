/* 《烽火 十四年》的劇本（1931～1945）。
 * 人物、地名與事件取自公開史料；能力值、兵力與對話皆為本作自行設定。
 * 語氣以史實為本、保持中性，不美化或醜化任何人物。 */
(function (TK) {
  'use strict';
  const W = TK.WORLD;

  // 日方陣營（side: 'axis'）由電腦控制、不能選，也不能與之外交
  const COL = { japan: '#4d4d4d', ccp: '#c8102e', song: '#6b8e23', dongbei: '#4682b4', usa: '#4a90d9', manchu: '#b8a07a', wang: '#9a9a6a', duan: '#2e6fd8', zhi: '#2fa84a', feng: '#d4a017', jin: '#8a6a3a', kmt: '#1f4fa0', gui: '#16a085',
    dian: '#8e44ad', chuan: '#d35400', qian: '#7f8c8d', ma: '#b0703a', guomin: '#5a7a9a', sun: '#e67ea8', xun: '#4a4a4a' };

  /* 劇本定義：
   *  factions: [id, 名稱, 首領, 繼承人...]
   *  cities:   { 城: [勢力, 兵力] }（未列出的城為無主，守軍 6000）
   *  people:   { 勢力: { 城: '人物 人物 …' } }；free：在野人物 { 城: '…' }
   *  relations: [[甲, 乙, 狀態, 月數]]
   *  events:   歷史事件（只在歷史劇本模式發生） */
  const DEFS = [
    {
      id: '1937', title: '七七事變', year: 1937, month: 7, tag: '盧溝橋・全面抗戰',
      desc: '1937 年 7 月 7 日夜，日軍在北平西南的盧溝橋附近演習，藉口一名士兵失蹤，要求進入宛平縣城搜查，遭到拒絕後開砲。蔣介石在廬山發表談話：「地無分南北，年無分老幼，皆有守土抗戰之責。」全面抗戰開始。',
      factions: [['kmt', '國民政府', '蔣介石', '陳誠'], ['ccp', '中共', '毛澤東', '周恩來'], ['song', '第二十九軍', '宋哲元', '張自忠'], ['jin', '晉綏軍', '閻錫山', '傅作義'],
        ['gui', '桂系', '李宗仁', '白崇禧'], ['chuan', '川軍', '劉湘', '鄧錫侯'], ['dian', '滇軍', '龍雲', '盧漢'], ['ma', '西北馬家', '馬步芳', '馬鴻逵'],
        ['japan', '日軍', '支那駐屯軍司令官', '關東軍司令官'], ['usa', '美軍', '羅斯福', '史迪威']],
      npc: ['japan'],
      dormant: ['usa'],
      coop: 70,
      axisPlan: [[1937, 7, '北京 天津 保定 上海'], [1937, 10, '南京 太原 濟南 張家口 大同'], [1938, 3, '徐州 合肥 青島'], [1938, 6, '武漢 廣州 南昌 鄭州 杭州 福州'],
        [1939, 9, '長沙 宜昌'], [1944, 4, '洛陽 衡陽 桂林 長沙 南寧 芷江']],
      cities: { 南京: ['kmt', 50000], 上海: ['kmt', 45000], 杭州: ['kmt', 20000], 南昌: ['kmt', 20000], 武漢: ['kmt', 35000], 長沙: ['kmt', 20000],
        福州: ['kmt', 15000], 合肥: ['kmt', 15000], 徐州: ['kmt', 30000], 鄭州: ['kmt', 25000], 洛陽: ['kmt', 15000], 西安: ['kmt', 25000],
        宜昌: ['kmt', 12000], 衡陽: ['kmt', 12000], 芷江: ['kmt', 8000], 貴陽: ['kmt', 12000], 廣州: ['kmt', 30000], 濟南: ['kmt', 25000], 青島: ['kmt', 12000],
        延安: ['ccp', 25000], 北京: ['song', 30000], 天津: ['song', 15000], 保定: ['song', 20000], 張家口: ['song', 10000],
        太原: ['jin', 35000], 大同: ['jin', 15000], 包頭: ['jin', 12000], 桂林: ['gui', 25000], 南寧: ['gui', 20000],
        成都: ['chuan', 30000], 重慶: ['chuan', 30000], 昆明: ['dian', 30000], 蘭州: ['ma', 20000],
        瀋陽: ['japan', 60000], 長春: ['japan', 40000], 哈爾濱: ['japan', 35000], 錦州: ['japan', 60000], 承德: ['japan', 80000],
        臺北: ['japan', 40000], 臺南: ['japan', 30000], 沖繩: ['japan', 90000], 臘戌: [null, 6000], 列多: ['usa', 30000], 塞班: ['japan', 30000] },
      people: {
        kmt: { 南京: '蔣介石 宋美齡 何應欽 陳誠 白崇禧 戴笠 宋子文 顧祝同 陳納德', 上海: '張治中 謝晉元 孫元良 宋希濂 王耀武 張靈甫', 杭州: '高志航',
          徐州: '湯恩伯 王銘章 孫連仲', 西安: '胡宗南 杜聿明', 鄭州: '衛立煌 劉峙', 武漢: '薛岳 孫立人 關麟徵', 長沙: '鄭洞國 方先覺',
          南昌: '蔣鼎文 胡璉', 濟南: '韓復榘', 青島: '沈鴻烈', 廣州: '余漢謀 戴安瀾', 洛陽: '孫蔚如', 合肥: '于學忠 萬福麟' },
        ccp: { 延安: '毛澤東 周恩來 朱德 彭德懷 劉伯承 林彪 賀龍 聶榮臻 徐向前 葉劍英 左權' },
        song: { 北京: '宋哲元 張自忠 佟麟閣', 天津: '劉汝明', 保定: '吉鴻昌' },
        jin: { 太原: '閻錫山 傅作義 商震 徐永昌' }, gui: { 桂林: '李宗仁 廖磊 李品仙', 南寧: '黃旭初 黃紹竑' },
        chuan: { 重慶: '劉湘 王陵基 楊森', 成都: '鄧錫侯 劉文輝 李家鈺 田頌堯' }, dian: { 昆明: '龍雲 盧漢 范石生' }, ma: { 蘭州: '馬步芳 馬鴻逵' },
        usa: { 列多: '羅斯福 史迪威 魏德邁 麥克阿瑟 尼米茲' },
        japan: { 瀋陽: '關東軍司令官 第二師團長', 長春: '第十四師團長', 錦州: '第十師團長', 承德: '支那駐屯軍司令官 第五師團長 第六師團長',
          臺北: '臺灣軍司令官', 塞班: '第三十二軍司令官', 沖繩: '上海派遣軍司令官 聯合艦隊司令長官 第十六師團長', 哈爾濱: '華北方面軍司令官' },
      },
      free: { 上海: '陳毅 粟裕 項英 葉挺' },
      loyalty: { 韓復榘: 50 },
      strategists: { kmt: '白崇禧', ccp: '周恩來', japan: '關東軍司令官' },
      relations: [['japan', 'kmt', 'war'], ['japan', 'song', 'war'], ['japan', 'jin', 'war'], ['japan', 'ccp', 'war'], ['japan', 'gui', 'war'],
        ['japan', 'chuan', 'war'], ['japan', 'dian', 'war'], ['japan', 'ma', 'war'],
        ['kmt', 'ccp', 'alliance', 48], ['kmt', 'song', 'alliance', 48], ['kmt', 'jin', 'alliance', 48], ['kmt', 'gui', 'alliance', 48],
        ['kmt', 'chuan', 'alliance', 48], ['kmt', 'dian', 'alliance', 48], ['kmt', 'ma', 'alliance', 48], ['ccp', 'jin', 'alliance', 36]],
      events: [
        {
          id: 'lugouqiao', title: '盧溝橋事變', scene: 'night',
          cond: { from: [1937, 7], alive: ['song', 'japan'] },
          effects: [{ do: 'loyalty', faction: 'song', amount: 10 }],
          lines: [['', '7 月 7 日深夜，日軍藉口一名士兵失蹤，要求進入宛平縣城搜查，遭守軍拒絕後開砲攻擊。'],
            ['張自忠', '（盧溝橋守軍回電）寸土不讓，與城共存亡。'], ['', '第二十九軍在盧溝橋頭奮起抵抗，全面抗戰的序幕就此揭開。']],
        },
        {
          id: 'lushan', title: '廬山談話', scene: 'palace',
          cond: { from: [1937, 7], alive: ['kmt'], after: ['lugouqiao'] },
          effects: [{ do: 'loyalty', faction: 'kmt', amount: 10 }],
          lines: [['蔣介石', '如果放棄尺寸土地與主權，便是中華民族的千古罪人。'],
            ['蔣介石', '地無分南北，年無分老幼，無論何人，皆有守土抗戰之責。']],
        },
        {
          id: 'nanyuan', title: '南苑之戰', scene: 'field',
          cond: { from: [1937, 8], alive: ['song', 'japan'], general_faction: { 佟麟閣: 'song' } },
          effects: [{ do: 'die', general: '佟麟閣' }, { do: 'troops_scale', city: '北京', mult: 0.6 }],
          lines: [['', '日軍集中飛機、大砲猛攻北平南苑。'], ['', '第二十九軍副軍長佟麟閣、師長趙登禹相繼殉國，北平、天津先後失守。']],
        },
        {
          id: 'songhu', title: '淞滬會戰', scene: 'fire',
          cond: { from: [1937, 8], alive: ['kmt', 'japan'], owns: { kmt: ['上海'] } },
          effects: [{ do: 'relation', a: 'japan', b: 'kmt', state: 'war' }],
          lines: [['', '8 月 13 日，戰火燒到上海。國軍精銳逐次投入，與日軍在市區與郊外反覆爭奪。'],
            ['張治中', '把日軍趕下黃浦江！'], ['', '這場會戰持續三個月，打破了日方「三個月滅亡中國」的盤算。']],
        },
        {
          id: 'sihang', title: '四行倉庫', scene: 'night',
          cond: { from: [1937, 10], alive: ['kmt'], general_faction: { 謝晉元: 'kmt' } },
          effects: [{ do: 'loyalty', faction: 'kmt', amount: 8 }],
          lines: [['', '國軍撤出上海之際，謝晉元率領約四百名官兵留守蘇州河北岸的四行倉庫。'],
            ['謝晉元', '我們的身後就是租界，全世界都在看著。'], ['', '女童軍楊惠敏冒險送來一面國旗，倉庫頂上升起青天白日旗，對岸的上海市民歡聲雷動。']],
        },
        {
          id: 'pingxingguan', title: '平型關', scene: 'field',
          cond: { from: [1937, 9], alive: ['ccp', 'japan'], general_faction: { 林彪: 'ccp' } },
          effects: [{ do: 'loyalty', faction: 'ccp', amount: 10 }],
          lines: [['', '紅軍改編為國民革命軍第八路軍，開赴山西前線。'],
            ['林彪', '日軍輜重部隊會經過平型關的山溝，我們在兩側高地設伏。'], ['', '八路軍第一一五師伏擊日軍後勤部隊，是全面抗戰以來的一次重要勝仗。']],
        },
        {
          id: 'xinsijun', title: '新四軍成立', scene: 'camp',
          cond: { from: [1937, 10], alive: ['ccp'] },
          effects: ['葉挺', '項英', '陳毅', '粟裕'].map((g) => ({ do: 'join', general: g, faction: 'ccp', force: true })).concat([{ do: 'coop', amount: 5 }]),
          lines: [['', '南方各省的紅軍游擊隊改編為國民革命軍新編第四軍，由葉挺任軍長、項英任副軍長。'],
            ['陳毅', '大江南北，到處都是我們的游擊區。']],
        },
        {
          id: 'nanjing_falls', title: '南京失守', scene: 'night',
          cond: { from: [1937, 12], alive: ['kmt', 'japan'] },
          effects: [{ do: 'city_add', city: '南京', field: 'order', amount: -30 }, { do: 'loyalty', faction: 'kmt', amount: 5 }],
          lines: [['', '12 月，日軍攻向首都南京，國民政府宣布遷都重慶，長期抗戰。'],
            ['', '南京失陷後，日軍在城內外對放下武器的士兵與平民進行大規模屠殺，死難者數以十萬計。'],
            ['', '這段歷史至今仍被銘記。']],
        },
        {
          id: 'wuhan_falls', title: '武漢會戰', scene: 'river',
          cond: { from: [1938, 10], alive: ['japan'], owns: { japan: ['武漢'] } },
          effects: [{ do: 'loyalty', faction: 'kmt', amount: 5 }],
          lines: [['', '經過四個多月的激戰，國軍撤出武漢。日軍雖然攻下華中重鎮，卻也付出慘重代價。'],
            ['蔣介石', '以空間換取時間，積小勝為大勝。抗戰進入相持階段。']],
        },
        {
          id: 'baituan', title: '百團大戰', scene: 'night',
          cond: { from: [1940, 8], until: [1940, 12], alive: ['ccp', 'japan'], general_faction: { 彭德懷: 'ccp' } },
          effects: [{ do: 'loyalty', faction: 'ccp', amount: 8 }, { do: 'coop', amount: 5 }],
          lines: [['彭德懷', '破襲正太鐵路，打斷日軍的交通線！'], ['', '八路軍一百多個團在華北各地同時出擊，破壞鐵路、公路與據點。']],
        },
        {
          id: 'wannan', title: '皖南事變', scene: 'night',
          cond: { from: [1941, 1], alive: ['kmt', 'ccp'], general_faction: { 項英: 'ccp' }, coop_below: 40 },
          effects: [{ do: 'die', general: '項英' }, { do: 'coop', amount: -20 }, { do: 'loyalty', faction: 'ccp', amount: -5 }],
          lines: [['', '國共摩擦日益嚴重。新四軍軍部奉命北移途中，在皖南茂林一帶遭國軍包圍。'],
            ['', '激戰七晝夜，新四軍軍部大部損失，軍長葉挺被扣押，副軍長項英遇害。'],
            ['周恩來', '千古奇冤，江南一葉；同室操戈，相煎何急！']],
        },
        {
          id: 'pearl_harbor', title: '珍珠港事件', scene: 'river',
          cond: { from: [1941, 12], alive: ['japan', 'usa'] },
          effects: [{ do: 'activate', faction: 'usa', side: 'allies' }, { do: 'relation', a: 'usa', b: 'japan', state: 'war' },
            { do: 'relation', a: 'usa', b: 'kmt', state: 'alliance', months: 48 }, { do: 'relation', a: 'usa', b: 'ccp', state: 'alliance', months: 48 },
            { do: 'loyalty', faction: 'kmt', amount: 10 }],
          lines: [['', '1941 年 12 月 7 日，日本海軍偷襲美國夏威夷珍珠港。'], ['羅斯福', '這是一個永遠活在恥辱中的日子。'],
            ['', '美國對日宣戰，國民政府也正式對日宣戰。中國不再孤軍奮戰。']],
        },
        {
          id: 'burma', title: '滇緬戰役', scene: 'field',
          cond: { from: [1942, 3], alive: ['japan'], after: ['pearl_harbor'] },
          effects: [{ do: 'unlock', cities: ['臘戌', '列多'] }, { do: 'seize', city: '臘戌', faction: 'japan' }, { do: 'troops', city: '臘戌', unit: 'inf', amount: 40000 }],
          lines: [['', '日軍攻入英屬緬甸，截斷滇緬公路。中國遠征軍入緬作戰。'],
            ['戴安瀾', '（同古）全師死守，掩護友軍。'], ['', '滇緬路斷後，物資只能靠飛越喜馬拉雅山的「駝峰航線」運進中國。']],
        },
        {
          id: 'saipan', title: '塞班島登陸', scene: 'river',
          cond: { from: [1944, 6], alive: ['japan', 'usa'], after: ['pearl_harbor'] },
          effects: [{ do: 'seize', city: '塞班', faction: 'usa' }, { do: 'troops', city: '塞班', unit: 'navy', amount: 40000 }, { do: 'troops', city: '塞班', unit: 'air', amount: 20000 },
            { do: 'relocate', general: '尼米茲', city: '塞班' }, { do: 'relocate', general: '麥克阿瑟', city: '塞班' }],
          lines: [['尼米茲', '太平洋艦隊一路跳島西進，拿下塞班，轟炸機就能直接飛到日本本土。'], ['', '美軍攻佔塞班島，日本的「絕對國防圈」被突破。']],
        },
        {
          id: 'surrender', title: '日本投降', scene: 'palace',
          cond: { from: [1945, 8], alive: ['japan'] },
          effects: [{ do: 'axis_surrender' }],
          lines: [['', '1945 年 8 月，美國在廣島、長崎投下原子彈，蘇聯對日宣戰。'],
            ['', '8 月 15 日，日本宣布無條件投降。9 月 9 日，中國戰區受降典禮在南京舉行。'],
            ['', '10 月 25 日，臺灣省受降典禮在臺北舉行，臺灣重歸中國。'],
            ['', '十四年的抗戰，軍民死傷數以千萬計，終於迎來勝利。']],
        },
      ],
    },
  ];

  const MORE = {};
  const LOCAL = [];

  function build(d) {
    const owner = {};
    const cities = W.cities.map((c0) => {
      const c = JSON.parse(JSON.stringify(c0));
      const o = d.cities[c.id];
      c.owner = o ? o[0] : null;
      c.troops = o ? o[1] : 6000;
      if (o && o[2]) Object.assign(c, o[2]);
      c.train = c.owner ? 55 : 40;
      c.gold = c.owner ? Math.max(800, Math.round(c.troops / 250 * 12)) : 400;
      c.food = Math.max(6000, Math.round(c.troops * 0.5));
      owner[c.id] = c.owner;
      return c;
    });
    const generals = [];
    const add = (name, faction, city, status) => {
      const st = W.STATS[name];
      if (!st) throw new Error(`劇本 ${d.title}：找不到人物 ${name}`);
      if (!W.cities.some((c) => c.id === city)) throw new Error(`劇本 ${d.title}：找不到城市 ${city}`);
      if (generals.some((g) => g.name === name)) throw new Error(`劇本 ${d.title}：人物重複 ${name}`);
      const loy = (d.loyalty && d.loyalty[name]) || 82;
      generals.push({ id: name, name, faction, city, lead: st[0], war: st[1], int: st[2], pol: st[3], cha: st[4],
        loyalty: faction ? loy : 0, status, hidden: status === 'free', ruler: false });
    };
    const split = (s) => (s || '').split(/\s+/).filter(Boolean);
    const more = MORE[d.id] || {};
    const people = JSON.parse(JSON.stringify(d.people));
    for (const [fid, byCity] of Object.entries(more.people || {})) {
      for (const [city, names] of Object.entries(byCity)) {
        people[fid] = people[fid] || {};
        people[fid][city] = `${people[fid][city] || ''} ${names}`;
      }
    }
    const free = Object.assign({}, d.free);
    for (const [city, names] of Object.entries(more.free || {})) free[city] = `${free[city] || ''} ${names}`;
    for (const [fid, byCity] of Object.entries(people)) {
      for (const [city, names] of Object.entries(byCity)) {
        for (const n of split(names)) {
          if (owner[city] !== fid) throw new Error(`劇本 ${d.title}：${n} 所在的 ${city} 不屬於 ${fid}`);
          add(n, fid, city, 'active');
        }
      }
    }
    for (const [city, names] of Object.entries(free)) for (const n of split(names)) add(n, null, city, 'free');
    const factions = d.factions.map(([id, name, ruler, ...heirs]) => {
      const r = generals.find((g) => g.name === ruler);
      if (!r || r.faction !== id) throw new Error(`劇本 ${d.title}：${name} 的首領 ${ruler} 不在勢力中`);
      r.ruler = true;
      r.loyalty = 100;
      return { id, name, ruler, color: COL[id], npc: (d.npc || []).includes(id), dormant: (d.dormant || []).includes(id) || undefined,
        side: (d.npc || []).includes(id) || ['manchu', 'wang'].includes(id) ? 'axis' : (d.dormant || []).includes(id) ? 'neutral' : 'allies', heirs: heirs.filter((h) => generals.some((g) => g.name === h && g.faction === id)), strategist: (d.strategists || {})[id] || null };
    });
    for (const f of factions) if (!cities.some((c) => c.owner === f.id)) throw new Error(`劇本 ${d.title}：${f.name} 沒有城`);
    return { id: d.id, tag: d.tag, title: d.title, year: d.year, month: d.month, desc: d.desc, aptitude: W.aptitude,
      factions, cities, roads: W.roads, sea: W.sea || [], axisPlan: d.axisPlan || [], coop: d.coop, generals, relations: d.relations || [], events: (d.events || []).concat(LOCAL).map((e) => Object.assign({ historical: true }, e)) };
  }

  TK.SCENARIOS = DEFS.map(build);
  TK.SCENARIO = TK.SCENARIOS[0];
  TK.scenarioById = (id) => TK.SCENARIOS.find((s) => s.id === id) || TK.SCENARIOS[0];
})(globalThis.TK = globalThis.TK || {});
