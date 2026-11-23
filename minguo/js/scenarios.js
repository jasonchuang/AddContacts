/* 《民國 群雄並起》的劇本（1915～1928）。
 * 人物、地名與事件取自公開史料；能力值、兵力與對話皆為本作自行設定。
 * 語氣以史實為本、保持中性，不美化或醜化任何人物。 */
(function (TK) {
  'use strict';
  const W = TK.WORLD;

  const COL = { duan: '#2e6fd8', zhi: '#2fa84a', feng: '#d4a017', jin: '#8a6a3a', kmt: '#c0392b', gui: '#16a085',
    dian: '#8e44ad', chuan: '#d35400', qian: '#7f8c8d', ma: '#b0703a', guomin: '#5a7a9a', sun: '#e67ea8', xun: '#4a4a4a' };

  /* 劇本定義：
   *  factions: [id, 名稱, 首領, 繼承人...]
   *  cities:   { 城: [勢力, 兵力] }（未列出的城為無主，守軍 6000）
   *  people:   { 勢力: { 城: '人物 人物 …' } }；free：在野人物 { 城: '…' }
   *  relations: [[甲, 乙, 狀態, 月數]]
   *  events:   歷史事件（只在歷史劇本模式發生） */
  const DEFS = [
    {
      id: '1915', title: '護國戰爭', year: 1915, month: 12, tag: '洪憲帝制・雲南起義',
      desc: '袁世凱解散國會、修改約法，最後接受「推戴」，準備在 1916 年改元洪憲、登基稱帝。遠在昆明的蔡鍔、唐繼堯決定起兵護國；各省督軍則在觀望。',
      factions: [['duan', '北洋政府', '袁世凱', '段祺瑞'], ['zhi', '馮國璋', '馮國璋'], ['dian', '護國軍', '唐繼堯', '蔡鍔'], ['qian', '黔軍', '劉顯世'],
        ['gui', '桂系', '陸榮廷'], ['feng', '奉天', '張作霖'], ['jin', '山西', '閻錫山'], ['xun', '定武軍', '張勳'], ['ma', '西北馬家', '馬福祥']],
      cities: { 北京: ['duan', 45000], 天津: ['duan', 20000], 保定: ['duan', 25000], 濟南: ['duan', 18000], 鄭州: ['duan', 18000], 洛陽: ['duan', 12000],
        西安: ['duan', 15000], 武漢: ['duan', 30000], 宜昌: ['duan', 12000], 重慶: ['duan', 25000], 成都: ['duan', 22000], 長沙: ['duan', 18000],
        廣州: ['duan', 22000], 福州: ['duan', 12000], 上海: ['duan', 15000], 杭州: ['duan', 14000], 合肥: ['duan', 15000], 張家口: ['duan', 10000],
        南京: ['zhi', 35000], 南昌: ['zhi', 18000], 徐州: ['xun', 20000],
        昆明: ['dian', 20000], 貴陽: ['qian', 12000], 南寧: ['gui', 22000], 桂林: ['gui', 15000],
        瀋陽: ['feng', 30000], 承德: ['feng', 10000], 太原: ['jin', 22000], 大同: ['jin', 10000], 蘭州: ['ma', 15000] },
      people: {
        duan: { 北京: '袁世凱 段祺瑞 徐樹錚 王士珍 段芝貴', 天津: '張懷芝', 保定: '王懷慶 曹銳', 重慶: '曹錕 吳佩孚 張敬堯', 成都: '陳宧 劉存厚',
          長沙: '湯薌銘', 廣州: '龍濟光', 武漢: '王占元 吳光新', 合肥: '倪嗣沖', 上海: '盧永祥 何豐林', 福州: '李厚基', 鄭州: '趙倜',
          濟南: '靳雲鵬 田中玉', 西安: '陳樹藩' },
        zhi: { 南京: '馮國璋 齊燮元', 南昌: '李純 陳光遠' }, xun: { 徐州: '張勳' },
        dian: { 昆明: '唐繼堯 蔡鍔 李烈鈞 顧品珍 龍雲 范石生 楊希閔 胡若愚' }, qian: { 貴陽: '劉顯世 袁祖銘' },
        gui: { 南寧: '陸榮廷 沈鴻英', 桂林: '李宗仁 白崇禧 黃紹竑' },
        feng: { 瀋陽: '張作霖 張作相 吳俊升 孫烈臣 張景惠 湯玉麟' }, jin: { 太原: '閻錫山 商震 徐永昌' }, ma: { 蘭州: '馬福祥 馬麒' },
      },
      free: { 上海: '孫中山 黃興 胡漢民 廖仲愷 陳炯明 蔣介石 岑春煊', 天津: '梁啟超 黎元洪', 長沙: '趙恆惕 譚延闓 程潛', 成都: '熊克武' },
      loyalty: { 陳宧: 55, 湯薌銘: 55, 龍濟光: 60, 劉存厚: 50 },
      strategists: { duan: '徐樹錚', dian: '蔡鍔' },
      relations: [['dian', 'duan', 'war'], ['dian', 'qian', 'alliance', 24], ['duan', 'zhi', 'alliance', 12], ['duan', 'xun', 'alliance', 24],
        ['duan', 'feng', 'alliance', 12], ['duan', 'jin', 'alliance', 12], ['duan', 'ma', 'alliance', 12]],
      events: [
        {
          id: 'hongxian', title: '洪憲帝制', scene: 'palace',
          cond: { from: [1915, 12], alive: ['duan'], general_faction: { 袁世凱: 'duan' } },
          effects: [{ do: 'loyalty', faction: 'duan', amount: -8 }],
          lines: [['', '參政院以「國民代表大會」全票推戴，袁世凱接受帝位，宣布明年改元「洪憲」。'],
            ['段祺瑞', '（稱病不出）共和是北洋將士打出來的，如今又要回到帝制……'], ['馮國璋', '（在南京）大總統當面跟我說過不會稱帝的。']],
        },
        {
          id: 'yunnan_rising', title: '雲南起義', scene: 'camp',
          cond: { from: [1915, 12], alive: ['dian', 'duan'], after: ['hongxian'] },
          effects: [{ do: 'loyalty', faction: 'dian', amount: 15 }],
          lines: [['蔡鍔', '我們這次是為四萬萬人爭人格。'], ['唐繼堯', '雲南宣布獨立，組織護國軍，討伐帝制！'],
            ['', '蔡鍔率第一軍出四川，李烈鈞率第二軍向兩廣，唐繼堯坐鎮昆明。']],
        },
        {
          id: 'qian_joins', title: '貴州響應', scene: 'camp',
          cond: { from: [1916, 1], alive: ['qian', 'duan'], after: ['yunnan_rising'] },
          effects: [{ do: 'relation', a: 'qian', b: 'duan', state: 'war' }],
          lines: [['劉顯世', '貴州宣布獨立，與雲南同進退。']],
        },
        {
          id: 'gui_joins', title: '廣西響應', scene: 'camp',
          cond: { from: [1916, 3], alive: ['gui', 'duan'], after: ['yunnan_rising'] },
          effects: [{ do: 'relation', a: 'gui', b: 'duan', state: 'war' }, { do: 'relation', a: 'gui', b: 'dian', state: 'alliance', months: 24 },
            { do: 'loyalty_of', generals: ['龍濟光', '陳宧', '湯薌銘'], value: 40 }],
          lines: [['陸榮廷', '廣西宣布獨立，出兵討袁！'], ['', '西南諸省接連獨立，北洋軍在四川前線也陷入苦戰。']],
        },
        {
          id: 'abolish', title: '撤銷帝制', scene: 'palace',
          cond: { from: [1916, 3], alive: ['duan'], after: ['gui_joins'], general_faction: { 袁世凱: 'duan' } },
          effects: [{ do: 'loyalty', faction: 'duan', amount: -10 }, { do: 'relation', a: 'zhi', b: 'duan', state: 'neutral' }],
          lines: [['', '馮國璋等五位將軍聯名密電，勸袁世凱取消帝制。'], ['袁世凱', '……撤銷帝制，仍稱大總統。'],
            ['', '洪憲年號只用了八十三天。但護國軍要求他下台，戰事仍未停止。']],
        },
        {
          id: 'yuan_dies', title: '袁世凱病逝', scene: 'palace',
          cond: { from: [1916, 6], alive: ['duan'], general_faction: { 袁世凱: 'duan' } },
          effects: [{ do: 'die', general: '袁世凱' }, { do: 'rename', faction: 'duan', name: '皖系' }, { do: 'rename', faction: 'zhi', name: '直系' },
            { do: 'relation', a: 'duan', b: 'dian', state: 'truce', months: 12 }, { do: 'relation', a: 'duan', b: 'gui', state: 'truce', months: 12 },
            { do: 'relation', a: 'duan', b: 'qian', state: 'truce', months: 12 }, { do: 'join', general: '曹錕', faction: 'zhi', force: true },
            { do: 'join', general: '吳佩孚', faction: 'zhi', force: true }],
          lines: [['', '1916 年 6 月 6 日，袁世凱在眾叛親離中病逝。'], ['', '黎元洪繼任大總統，段祺瑞以國務總理掌握實權。'],
            ['', '北洋失去共主，從此分裂：段祺瑞一派稱皖系，馮國璋、曹錕一派稱直系。']],
        },
        {
          id: 'huangxing_dies', title: '黃興病逝', scene: 'palace',
          cond: { from: [1916, 10], until: [1916, 12] },
          effects: [{ do: 'die', general: '黃興' }],
          lines: [['', '1916 年 10 月 31 日，革命元勳黃興在上海病逝，年僅四十二歲。'], ['', '孫中山痛失多年的戰友。「孫黃」並稱的時代結束了。']],
        },
        {
          id: 'cai_dies', title: '蔡鍔病逝', scene: 'river',
          cond: { from: [1916, 11], general_faction: { 蔡鍔: 'dian' } },
          effects: [{ do: 'die', general: '蔡鍔' }, { do: 'loyalty', faction: 'dian', amount: -5 }],
          lines: [['', '蔡鍔喉疾日重，東渡日本就醫。'], ['', '1916 年 11 月 8 日，蔡鍔在福岡病逝，年僅三十四歲。']],
        },
      ],
    },
    {
      id: '1917', title: '府院之爭', year: 1917, month: 8, tag: '北洋分裂・護法運動',
      desc: '袁世凱死後，北洋集團一分為二：段祺瑞的皖系掌握北京政府，馮國璋的直系盤據長江。張勳復辟鬧劇剛剛落幕，孫中山南下廣州護法，南北從此對峙。',
      factions: [['duan', '皖系', '段祺瑞'], ['zhi', '直系', '馮國璋', '曹錕'], ['feng', '奉系', '張作霖', '張學良'], ['jin', '晉系', '閻錫山'],
        ['kmt', '護法軍政府', '孫中山'], ['gui', '桂系', '陸榮廷'], ['dian', '滇系', '唐繼堯'], ['chuan', '川軍', '熊克武'], ['ma', '西北馬家', '馬福祥']],
      cities: { 北京: ['duan', 40000], 天津: ['duan', 20000], 合肥: ['duan', 15000], 杭州: ['duan', 18000], 上海: ['duan', 14000], 西安: ['duan', 16000], 濟南: ['duan', 18000],
        保定: ['zhi', 25000], 南京: ['zhi', 30000], 武漢: ['zhi', 30000], 南昌: ['zhi', 18000], 鄭州: ['zhi', 15000], 徐州: ['zhi', 14000],
        瀋陽: ['feng', 45000], 承德: ['feng', 12000], 太原: ['jin', 25000], 大同: ['jin', 12000],
        廣州: ['kmt', 18000], 福州: ['kmt', 10000], 南寧: ['gui', 22000], 桂林: ['gui', 18000], 長沙: ['gui', 15000],
        昆明: ['dian', 25000], 貴陽: ['dian', 14000], 成都: ['chuan', 22000], 重慶: ['chuan', 16000], 蘭州: ['ma', 18000] },
      people: {
        duan: { 北京: '段祺瑞 徐樹錚 段芝貴 靳雲鵬', 杭州: '盧永祥 何豐林', 合肥: '吳光新', 西安: '陳樹藩' },
        zhi: { 南京: '馮國璋 李純 齊燮元', 保定: '曹錕 吳佩孚 王承斌 彭壽莘', 武漢: '王占元 蕭耀南', 南昌: '孫傳芳', 鄭州: '馮玉祥 張之江 鹿鍾麟' },
        feng: { 瀋陽: '張作霖 張學良 楊宇霆 張作相 吳俊升 郭松齡 湯玉麟', 承德: '姜登選' },
        jin: { 太原: '閻錫山 商震 徐永昌' }, kmt: { 廣州: '孫中山 胡漢民 廖仲愷 汪精衛 許崇智', 福州: '陳炯明 蔣介石' },
        gui: { 南寧: '陸榮廷 沈鴻英', 桂林: '李宗仁 白崇禧 黃紹竑', 長沙: '程潛' }, dian: { 昆明: '唐繼堯 顧品珍 龍雲', 貴陽: '劉顯世' },
        chuan: { 成都: '熊克武 劉存厚', 重慶: '劉湘 楊森' }, ma: { 蘭州: '馬福祥' },
      },
      free: { 天津: '張勳 黎元洪', 長沙: '唐生智' },
      strategists: { duan: '徐樹錚', feng: '楊宇霆', kmt: '廖仲愷', gui: '白崇禧' },
      relations: [['duan', 'kmt', 'war'], ['duan', 'zhi', 'truce', 12], ['kmt', 'gui', 'alliance', 24], ['kmt', 'dian', 'alliance', 24]],
      events: [
        {
          id: 'fubi', title: '張勳復辟', scene: 'palace',
          cond: { from: [1917, 8] },
          effects: [],
          lines: [['', '（兩個月前・北京）辮子軍統帥張勳率兵入京，擁立溥儀復辟，龍旗重新掛上城頭。'],
            ['段祺瑞', '共和不容倒退。我在馬廠誓師，討伐叛逆！'],
            ['', '十二天後，復辟失敗，張勳逃入荷蘭使館。段祺瑞以「再造共和」之功重掌政權。'],
            ['孫中山', '北京的國會已被解散，《臨時約法》形同廢紙。我們南下廣州，護法！']],
        },
        {
          id: 'wuli', title: '武力統一', scene: 'camp',
          cond: { from: [1917, 10], alive: ['duan', 'kmt'] },
          effects: [{ do: 'relation', a: 'duan', b: 'gui', state: 'war' }, { do: 'loyalty', faction: 'zhi', amount: -5 }],
          lines: [['段祺瑞', '南方不服北京號令，唯有以武力統一全國。'], ['徐樹錚', '日本願意借款，軍費不成問題。'],
            ['馮國璋', '（在南京）又要打仗……直系的兵，可不是替皖系賣命的。']],
        },
      ],
    },
    {
      id: '1920', title: '直皖戰爭', year: 1920, month: 7, tag: '直系＋奉系 對 皖系',
      desc: '段祺瑞的「武力統一」耗盡民心，直系吳佩孚從湖南前線撤兵北上，與奉系張作霖聯手，要把皖系趕出北京。',
      factions: [['duan', '皖系', '段祺瑞'], ['zhi', '直系', '曹錕', '吳佩孚'], ['feng', '奉系', '張作霖', '張學良'], ['jin', '晉系', '閻錫山'],
        ['gui', '桂系', '陸榮廷'], ['kmt', '粵軍', '陳炯明', '孫中山'], ['dian', '滇系', '唐繼堯'], ['chuan', '川軍', '熊克武'], ['ma', '西北馬家', '馬福祥']],
      cities: { 北京: ['duan', 35000], 天津: ['duan', 15000], 合肥: ['duan', 12000], 杭州: ['duan', 22000], 上海: ['duan', 18000], 西安: ['duan', 14000], 濟南: ['duan', 16000],
        保定: ['zhi', 35000], 南京: ['zhi', 30000], 武漢: ['zhi', 30000], 南昌: ['zhi', 18000], 鄭州: ['zhi', 20000], 徐州: ['zhi', 15000], 洛陽: ['zhi', 12000],
        瀋陽: ['feng', 50000], 承德: ['feng', 15000], 張家口: ['feng', 10000], 太原: ['jin', 28000], 大同: ['jin', 12000],
        廣州: ['gui', 25000], 南寧: ['gui', 22000], 桂林: ['gui', 18000], 長沙: ['gui', 14000], 福州: ['kmt', 20000],
        昆明: ['dian', 25000], 貴陽: ['dian', 14000], 成都: ['chuan', 24000], 重慶: ['chuan', 18000], 蘭州: ['ma', 18000] },
      people: {
        duan: { 北京: '段祺瑞 徐樹錚 段芝貴 靳雲鵬', 杭州: '盧永祥 何豐林', 合肥: '吳光新', 西安: '陳樹藩' },
        zhi: { 保定: '曹錕 吳佩孚 王承斌 彭壽莘 張福來', 南京: '李純 齊燮元', 武漢: '王占元 蕭耀南', 南昌: '孫傳芳', 洛陽: '馮玉祥 張之江 鹿鍾麟' },
        feng: { 瀋陽: '張作霖 張學良 楊宇霆 張作相 吳俊升 郭松齡 湯玉麟 韓麟春', 承德: '姜登選', 張家口: '李景林' },
        jin: { 太原: '閻錫山 商震 徐永昌 傅作義' }, gui: { 廣州: '陸榮廷 沈鴻英', 桂林: '李宗仁 白崇禧 黃紹竑', 長沙: '程潛' },
        kmt: { 福州: '陳炯明 孫中山 許崇智 蔣介石 廖仲愷 胡漢民 汪精衛' }, dian: { 昆明: '唐繼堯 顧品珍 龍雲', 貴陽: '劉顯世' },
        chuan: { 成都: '熊克武 劉存厚 劉文輝', 重慶: '劉湘 楊森' }, ma: { 蘭州: '馬福祥' },
      },
      free: { 長沙: '唐生智', 天津: '黎元洪' },
      strategists: { duan: '徐樹錚', zhi: '吳佩孚', feng: '楊宇霆', kmt: '廖仲愷', gui: '白崇禧' },
      relations: [['duan', 'zhi', 'war'], ['duan', 'feng', 'war'], ['zhi', 'feng', 'alliance', 18], ['kmt', 'gui', 'war']],
      events: [
        {
          id: 'zhiwan', title: '直皖戰爭', scene: 'field',
          cond: { from: [1920, 7], alive: ['duan', 'zhi'], general_faction: { 吳佩孚: 'zhi' } },
          effects: [{ do: 'troops_scale', city: '北京', mult: 0.5 }, { do: 'troops_scale', city: '天津', mult: 0.6 }, { do: 'loyalty', faction: 'duan', amount: -15 }],
          lines: [['吳佩孚', '皖系借日款、賣國權，天下共憤。我軍北上，只為清君側！'],
            ['', '直軍兵分兩路，在涿州、高碑店一帶與皖軍激戰。奉軍入關，從側面夾擊。'],
            ['', '五天之內，皖軍主力潰散。段祺瑞通電下野。'],
            ['徐樹錚', '（逃入日本使館）……大勢已去。']],
        },
        {
          id: 'yuejun', title: '粵軍回粵', scene: 'camp',
          cond: { from: [1920, 10], alive: ['kmt', 'gui'], owns: { gui: ['廣州'] }, general_faction: { 陳炯明: 'kmt' } },
          effects: [{ do: 'seize', city: '廣州', faction: 'kmt' }, { do: 'relocate', general: '孫中山', city: '廣州' }],
          lines: [['陳炯明', '粵人治粵！把桂軍趕出廣東！'], ['', '粵軍從閩南回師，一路勢如破竹，桂軍撤出廣州。'],
            ['孫中山', '廣州光復了。護法大業，可以重新開始。']],
        },
      ],
    },
    {
      id: '1924', title: '直奉大戰', year: 1924, month: 9, tag: '第二次直奉戰爭・北京政變',
      desc: '曹錕以賄選登上大總統，吳佩孚坐鎮洛陽，直系如日中天。張作霖整軍經武兩年，誓雪前恥；而直系內部，馮玉祥的心思已經不在吳佩孚身上……',
      factions: [['zhi', '直系', '曹錕', '吳佩孚'], ['feng', '奉系', '張作霖', '張學良'], ['jin', '晉系', '閻錫山'], ['duan', '浙江盧永祥', '盧永祥'],
        ['sun', '孫傳芳', '孫傳芳'], ['kmt', '國民黨', '孫中山', '蔣介石'], ['gui', '新桂系', '李宗仁', '白崇禧'], ['dian', '滇系', '唐繼堯'], ['chuan', '川軍', '劉湘'],
        ['guomin', '陝西國民軍', '胡景翼'], ['ma', '西北馬家', '馬福祥']],
      cities: { 北京: ['zhi', 40000], 天津: ['zhi', 20000], 保定: ['zhi', 25000], 洛陽: ['zhi', 30000], 鄭州: ['zhi', 20000], 武漢: ['zhi', 30000], 南京: ['zhi', 25000],
        徐州: ['zhi', 15000], 濟南: ['zhi', 15000], 長沙: ['zhi', 15000], 張家口: ['zhi', 15000],
        瀋陽: ['feng', 60000], 承德: ['feng', 20000], 太原: ['jin', 30000], 大同: ['jin', 15000], 包頭: ['jin', 8000],
        杭州: ['duan', 20000], 上海: ['duan', 22000], 福州: ['sun', 22000], 南昌: ['sun', 18000],
        廣州: ['kmt', 25000], 南寧: ['gui', 22000], 桂林: ['gui', 18000], 昆明: ['dian', 28000], 貴陽: ['dian', 14000],
        成都: ['chuan', 25000], 重慶: ['chuan', 22000], 宜昌: ['chuan', 10000], 西安: ['guomin', 18000], 蘭州: ['ma', 18000] },
      people: {
        zhi: { 北京: '曹錕 馮玉祥 王承斌 孫岳 張之江 鹿鍾麟 宋哲元', 洛陽: '吳佩孚 彭壽莘 張福來', 武漢: '蕭耀南', 南京: '齊燮元', 張家口: '韓復榘 石友三' },
        feng: { 瀋陽: '張作霖 張學良 楊宇霆 郭松齡 張作相 吳俊升 張宗昌 李景林 韓麟春', 承德: '姜登選 湯玉麟' },
        jin: { 太原: '閻錫山 商震 徐永昌 傅作義' }, duan: { 杭州: '盧永祥 何豐林' }, sun: { 福州: '孫傳芳' },
        kmt: { 廣州: '孫中山 蔣介石 汪精衛 胡漢民 廖仲愷 許崇智 何應欽 陳誠 葉挺 李濟深 張發奎' },
        gui: { 南寧: '李宗仁 白崇禧 黃紹竑' }, dian: { 昆明: '唐繼堯 龍雲 顧品珍', 貴陽: '劉顯世' },
        chuan: { 重慶: '劉湘 楊森', 成都: '劉文輝' }, guomin: { 西安: '胡景翼' }, ma: { 蘭州: '馬福祥' },
      },
      free: { 天津: '段祺瑞 徐樹錚 黎元洪', 長沙: '唐生智 程潛' },
      loyalty: { 馮玉祥: 45, 孫岳: 55 },
      strategists: { zhi: '吳佩孚', feng: '楊宇霆', kmt: '廖仲愷', gui: '白崇禧' },
      relations: [['zhi', 'feng', 'war'], ['zhi', 'duan', 'war'], ['feng', 'duan', 'alliance', 24], ['feng', 'kmt', 'alliance', 24], ['sun', 'duan', 'war']],
      events: [
        {
          id: 'shanhaiguan', title: '山海關之戰', scene: 'field',
          cond: { from: [1924, 9], alive: ['zhi', 'feng'] },
          effects: [{ do: 'relocate', general: '吳佩孚', city: '北京' }],
          lines: [['張作霖', '兩年前輸給吳佩孚，這次奉軍全軍入關！'], ['吳佩孚', '（從洛陽趕到北京）我親自坐鎮山海關前線，必破奉軍。'],
            ['', '雙方投入數十萬兵力，在山海關、九門口一帶反覆爭奪。']],
        },
        {
          id: 'beijing_coup', title: '北京政變', scene: 'palace',
          cond: { from: [1924, 10], alive: ['zhi', 'feng'], general_faction: { 馮玉祥: 'zhi' } },
          effects: [{ do: 'join', general: '馮玉祥', faction: 'guomin', force: true }, { do: 'join', general: '孫岳', faction: 'guomin', force: true },
            { do: 'join', general: '張之江', faction: 'guomin', force: true }, { do: 'join', general: '鹿鍾麟', faction: 'guomin', force: true },
            ...['宋哲元', '孫良誠', '吉鴻昌', '張自忠', '佟麟閣', '孫連仲', '劉汝明', '劉郁芬'].map((g) => ({ do: 'join', general: g, faction: 'guomin', force: true })),
            { do: 'seize', city: '北京', faction: 'guomin' }, { do: 'troops_scale', city: '保定', mult: 0.6 }, { do: 'loyalty', faction: 'zhi', amount: -15 },
            { do: 'relation', a: 'guomin', b: 'zhi', state: 'war' }, { do: 'relation', a: 'guomin', b: 'feng', state: 'truce', months: 12 }],
          lines: [['', '吳佩孚在前線與奉軍苦戰之際，奉命出古北口的馮玉祥暗中回師北京。'],
            ['馮玉祥', '直系窮兵黷武、賄選總統，國人皆曰可殺。我軍回京，停止內戰！'],
            ['', '馮軍控制北京，軟禁曹錕。直軍腹背受敵，全線崩潰。吳佩孚率殘部從海路南逃。'],
            ['', '馮玉祥將所部改稱「國民軍」。']],
        },
        {
          id: 'sun_dies', title: '孫中山逝世', scene: 'palace',
          cond: { from: [1925, 3], alive: ['kmt'], general_faction: { 孫中山: 'kmt' } },
          effects: [{ do: 'die', general: '孫中山' }, { do: 'loyalty', faction: 'kmt', amount: 10 }],
          lines: [['', '孫中山應邀北上共商國是，卻在北京病重。'], ['孫中山', '現在革命尚未成功，凡我同志，務須依照余所著……繼續努力。'],
            ['', '1925 年 3 月 12 日，孫中山在北京逝世。']],
        },
      ],
    },
    {
      id: '1926', title: '國民革命軍北伐', year: 1926, month: 7, tag: '國民政府 對 吳佩孚・孫傳芳・奉系',
      desc: '廣州國民政府統一兩廣，以黃埔軍校學生為骨幹組成國民革命軍。蔣介石在廣州誓師北伐，第一個目標是盤據湖南、湖北的吳佩孚。',
      factions: [['kmt', '國民政府', '蔣介石'], ['zhi', '吳佩孚', '吳佩孚'], ['sun', '五省聯軍', '孫傳芳'], ['feng', '奉系', '張作霖', '張學良'],
        ['jin', '晉系', '閻錫山'], ['guomin', '國民軍', '馮玉祥'], ['dian', '滇系', '唐繼堯'], ['chuan', '川軍', '劉湘'], ['ma', '西北馬家', '馬福祥']],
      cities: { 廣州: ['kmt', 40000], 南寧: ['kmt', 20000], 桂林: ['kmt', 25000], 長沙: ['kmt', 20000],
        武漢: ['zhi', 40000], 鄭州: ['zhi', 25000], 洛陽: ['zhi', 25000], 宜昌: ['zhi', 15000],
        南京: ['sun', 40000], 上海: ['sun', 30000], 杭州: ['sun', 25000], 南昌: ['sun', 30000], 福州: ['sun', 20000], 合肥: ['sun', 18000], 徐州: ['sun', 20000],
        北京: ['feng', 40000], 天津: ['feng', 30000], 保定: ['feng', 25000], 瀋陽: ['feng', 50000], 承德: ['feng', 15000], 濟南: ['feng', 30000], 青島: ['feng', 15000], 張家口: ['feng', 15000],
        太原: ['jin', 30000], 大同: ['jin', 15000], 包頭: ['guomin', 15000], 西安: ['guomin', 20000], 蘭州: ['ma', 18000],
        昆明: ['dian', 28000], 貴陽: ['dian', 15000], 成都: ['chuan', 25000], 重慶: ['chuan', 25000] },
      people: {
        kmt: { 廣州: '蔣介石 汪精衛 胡漢民 何應欽 陳誠 李濟深 朱培德 程潛', 桂林: '李宗仁 白崇禧 黃紹竑', 長沙: '唐生智 葉挺 張發奎' },
        zhi: { 武漢: '吳佩孚 蕭耀南 彭壽莘', 鄭州: '張福來' }, sun: { 南京: '孫傳芳 齊燮元', 南昌: '何豐林' },
        feng: { 北京: '張作霖 楊宇霆 張作相 韓麟春', 瀋陽: '張學良 吳俊升 湯玉麟', 濟南: '張宗昌', 天津: '李景林 姜登選' },
        jin: { 太原: '閻錫山 商震 徐永昌 傅作義' }, guomin: { 包頭: '馮玉祥 張之江 鹿鍾麟 宋哲元 韓復榘 石友三', 西安: '孫岳' },
        dian: { 昆明: '唐繼堯 龍雲' }, chuan: { 重慶: '劉湘 楊森', 成都: '劉文輝' }, ma: { 蘭州: '馬福祥' },
      },
      free: { 天津: '段祺瑞 徐樹錚' },
      strategists: { kmt: '白崇禧', feng: '楊宇霆' },
      relations: [['kmt', 'zhi', 'war'], ['kmt', 'sun', 'truce', 3], ['kmt', 'guomin', 'alliance', 36], ['guomin', 'feng', 'war'], ['zhi', 'feng', 'alliance', 12]],
      events: [
        {
          id: 'beifa', title: '北伐誓師', scene: 'camp',
          cond: { from: [1926, 7], alive: ['kmt'] },
          effects: [{ do: 'loyalty', faction: 'kmt', amount: 10 }],
          lines: [['蔣介石', '國民革命軍今日誓師北伐。打倒列強，除軍閥！'],
            ['白崇禧', '先打吳佩孚，再打孫傳芳，最後打張作霖。各個擊破。'],
            ['', '葉挺獨立團擔任先鋒，率先攻入湖南。']],
        },
        {
          id: 'tingsi', title: '汀泗橋之戰', scene: 'field',
          cond: { from: [1926, 8], alive: ['kmt', 'zhi'], owns: { kmt: ['長沙'], zhi: ['武漢'] } },
          effects: [{ do: 'troops_scale', city: '武漢', mult: 0.6 }, { do: 'loyalty', faction: 'zhi', amount: -10 }],
          lines: [['吳佩孚', '汀泗橋三面環水，易守難攻。守住這裡，北伐軍就到不了武漢。'],
            ['葉挺', '正面強攻不下，就從小路夜襲側後！'],
            ['', '北伐軍連下汀泗橋、賀勝橋，吳佩孚的主力潰敗，武漢門戶大開。']],
        },
        {
          id: 'longtan', title: '龍潭之戰', scene: 'river',
          cond: { from: [1927, 8], alive: ['kmt', 'sun'] },
          effects: [{ do: 'troops_scale', city: '南京', mult: 0.6 }, { do: 'troops_scale', city: '徐州', mult: 0.7 }],
          lines: [['孫傳芳', '渡江！奪回南京！'], ['', '孫傳芳率軍強渡長江，在龍潭與北伐軍血戰六晝夜。'],
            ['李宗仁', '孫傳芳背水而戰，我們也沒有退路。'], ['', '孫軍渡江部隊幾乎全軍覆沒，從此一蹶不振。']],
        },
      ],
    },
    {
      id: '1928', title: '東北易幟', year: 1928, month: 4, tag: '二次北伐・統一',
      desc: '國民政府定都南京，蔣介石聯合馮玉祥、閻錫山、李宗仁四大集團軍，向盤據華北的奉系發動最後的北伐。',
      factions: [['kmt', '國民政府', '蔣介石'], ['guomin', '第二集團軍', '馮玉祥'], ['jin', '第三集團軍', '閻錫山'], ['gui', '第四集團軍', '李宗仁', '白崇禧'],
        ['feng', '奉系', '張作霖', '張學良'], ['dian', '雲南', '龍雲'], ['chuan', '四川', '劉湘'], ['ma', '西北馬家', '馬福祥']],
      cities: { 南京: ['kmt', 40000], 上海: ['kmt', 30000], 杭州: ['kmt', 22000], 福州: ['kmt', 18000], 南昌: ['kmt', 22000], 合肥: ['kmt', 18000], 徐州: ['kmt', 35000], 廣州: ['kmt', 30000],
        武漢: ['gui', 40000], 長沙: ['gui', 25000], 桂林: ['gui', 22000], 南寧: ['gui', 18000], 宜昌: ['gui', 12000],
        鄭州: ['guomin', 35000], 洛陽: ['guomin', 25000], 西安: ['guomin', 25000], 包頭: ['guomin', 12000],
        太原: ['jin', 35000], 大同: ['jin', 18000], 張家口: ['jin', 15000],
        北京: ['feng', 45000], 天津: ['feng', 35000], 保定: ['feng', 30000], 濟南: ['feng', 30000], 青島: ['feng', 15000], 瀋陽: ['feng', 50000], 承德: ['feng', 18000],
        昆明: ['dian', 25000], 貴陽: ['dian', 14000], 成都: ['chuan', 25000], 重慶: ['chuan', 25000], 蘭州: ['ma', 18000] },
      people: {
        kmt: { 南京: '蔣介石 汪精衛 胡漢民 何應欽 李濟深', 徐州: '陳誠 朱培德 張發奎 葉挺', 廣州: '程潛' },
        gui: { 武漢: '李宗仁 白崇禧 黃紹竑', 長沙: '唐生智' }, guomin: { 鄭州: '馮玉祥 鹿鍾麟 張之江 宋哲元', 洛陽: '韓復榘 石友三', 西安: '孫岳' },
        jin: { 太原: '閻錫山 商震 徐永昌', 張家口: '傅作義' },
        feng: { 北京: '張作霖 楊宇霆 張作相', 天津: '張學良 韓麟春 李景林', 濟南: '張宗昌', 瀋陽: '吳俊升 湯玉麟', 保定: '姜登選' },
        dian: { 昆明: '龍雲' }, chuan: { 重慶: '劉湘 楊森', 成都: '劉文輝' }, ma: { 蘭州: '馬福祥' },
      },
      free: { 天津: '段祺瑞' },
      strategists: { kmt: '何應欽', gui: '白崇禧', feng: '楊宇霆' },
      relations: [['kmt', 'feng', 'war'], ['guomin', 'feng', 'war'], ['jin', 'feng', 'war'], ['gui', 'feng', 'war'],
        ['kmt', 'guomin', 'alliance', 24], ['kmt', 'jin', 'alliance', 24], ['kmt', 'gui', 'alliance', 24], ['guomin', 'jin', 'alliance', 24], ['guomin', 'gui', 'alliance', 24], ['jin', 'gui', 'alliance', 24]],
      events: [
        {
          id: 'huanggutun', title: '皇姑屯事件', scene: 'night',
          cond: { from: [1928, 6], alive: ['feng'], general_faction: { 張作霖: 'feng' } },
          effects: [{ do: 'die', general: '張作霖' }, { do: 'relocate', general: '張學良', city: '瀋陽' }, { do: 'loyalty', faction: 'feng', amount: -10 }],
          lines: [['張作霖', '北伐軍逼近北京，不能再打了。退回關外，保住東北。'],
            ['', '1928 年 6 月 4 日清晨，張作霖乘坐的專車行經瀋陽皇姑屯附近的鐵路橋時，橋上預埋的炸藥爆炸。'],
            ['', '張作霖重傷不治。事後證實是日本關東軍所為。'],
            ['張學良', '（秘密趕回瀋陽）……父親。']],
        },
        {
          id: 'yizhi', title: '東北易幟', scene: 'palace',
          cond: { from: [1928, 12], alive: ['feng', 'kmt'], general_faction: { 張學良: 'feng' }, general_dead: ['張作霖'] },
          effects: [],
          chooser: 'feng', aiChoice: 0,
          lines: [['張學良', '日本人殺了我父親，又不准東北歸順中央。'], ['楊宇霆', '少帥，此事關係東北存亡，請三思。'],
            ['張學良', '國家不統一，東北遲早被日本吞併。']],
          choices: [
            { label: '易幟歸順', desc: '依照史實：東北改掛青天白日滿地紅旗，全國名義上統一',
              effects: [{ do: 'absorb', faction: 'feng', into: 'kmt' }],
              lines: [['', '1928 年 12 月 29 日，東北各地同時改掛青天白日滿地紅旗。'], ['蔣介石', '自此全國統一，北伐完成。']] },
            { label: '堅持自主', desc: '不易幟，東北繼續與南京對峙',
              effects: [{ do: 'loyalty_of', generals: ['張學良'], value: 100 }, { do: 'relation', a: 'feng', b: 'kmt', state: 'truce', months: 12 }],
              lines: [['張學良', '東北的事，由東北人自己決定。'], ['', '南北暫時休兵，但統一仍待完成。']] },
          ],
        },
      ],
    },
  ];

  /* 擴充人物：依劇本補到各勢力與在野（在 build 時合併進 people／free） */
  const MORE = {
    1917: {
      people: { duan: { 北京: '王士珍 張敬堯', 合肥: '倪嗣沖', 濟南: '張懷芝 田中玉', 上海: '李厚基' }, zhi: { 保定: '曹銳 王懷慶', 南昌: '陳光遠', 鄭州: '趙倜' },
        feng: { 瀋陽: '孫烈臣 張景惠 萬福麟' }, kmt: { 廣州: '鄧鏗 李烈鈞 岑春煊' }, dian: { 昆明: '范石生 楊希閔 胡若愚' },
        chuan: { 成都: '鄧錫侯 田頌堯', 重慶: '王陵基' }, ma: { 蘭州: '馬麒 馬鴻逵' } },
      free: { 天津: '梁啟超', 長沙: '趙恆惕 譚延闓' },
    },
    1920: {
      people: { duan: { 北京: '張敬堯', 合肥: '倪嗣沖', 濟南: '田中玉', 上海: '李厚基' }, zhi: { 保定: '曹銳 王懷慶', 南昌: '陳光遠', 鄭州: '趙倜', 武漢: '于學忠' },
        feng: { 瀋陽: '孫烈臣 張景惠 萬福麟' }, kmt: { 福州: '鄧鏗 陳銘樞 蔣光鼐 薛岳' }, dian: { 昆明: '范石生 楊希閔 胡若愚' },
        chuan: { 成都: '鄧錫侯 田頌堯', 重慶: '王陵基' }, ma: { 蘭州: '馬麒 馬鴻逵' } },
      free: { 天津: '梁啟超 王士珍', 長沙: '趙恆惕 譚延闓' },
    },
    1924: {
      people: { zhi: { 北京: '曹銳 王懷慶 孫良誠 吉鴻昌 張自忠 佟麟閣 孫連仲 劉汝明 劉郁芬', 洛陽: '于學忠', 長沙: '趙恆惕 葉開鑫 賀耀組' },
        feng: { 瀋陽: '萬福麟 張景惠 褚玉璞' }, guomin: { 西安: '楊虎城' },
        kmt: { 廣州: '鄧演達 胡宗南 杜聿明 關麟徵 顧祝同 劉峙 蔣鼎文 陳銘樞 蔣光鼐 蔡廷鍇 薛岳 譚延闓 楊希閔 范石生 戴季陶 宋子文' },
        sun: { 福州: '周蔭人 盧香亭 陳調元', 南昌: '方本仁 鄧如琢' }, gui: { 南寧: '黃旭初' }, dian: { 昆明: '胡若愚', 貴陽: '袁祖銘' },
        chuan: { 重慶: '王陵基 李家鈺', 成都: '鄧錫侯 田頌堯' }, ma: { 蘭州: '馬麒 馬鴻逵' } },
      free: { 長沙: '李品仙 廖磊', 天津: '梁啟超' },
    },
    1926: {
      people: { kmt: { 廣州: '胡宗南 杜聿明 關麟徵 顧祝同 劉峙 蔣鼎文 薛岳 陳銘樞 蔣光鼐 蔡廷鍇 鄧演達 譚延闓 戴季陶 宋子文 范石生', 桂林: '黃旭初', 長沙: '李品仙 廖磊 賀耀組 魯滌平' },
        zhi: { 武漢: '于學忠 葉開鑫' }, sun: { 南京: '盧香亭 陳調元', 南昌: '鄧如琢', 福州: '周蔭人' },
        feng: { 瀋陽: '萬福麟 張景惠', 濟南: '褚玉璞 孫殿英' },
        guomin: { 包頭: '孫良誠 吉鴻昌 張自忠 佟麟閣 孫連仲 劉汝明 劉郁芬', 西安: '楊虎城' },
        dian: { 昆明: '胡若愚', 貴陽: '周西成 袁祖銘' }, chuan: { 重慶: '王陵基 李家鈺', 成都: '鄧錫侯 田頌堯' }, ma: { 蘭州: '馬麒 馬鴻逵 馬步芳' } },
      free: { 武漢: '趙恆惕', 南昌: '方本仁' },
    },
    1928: {
      people: { kmt: { 南京: '胡宗南 顧祝同 劉峙 蔣鼎文 戴季陶 宋子文 譚延闓', 徐州: '杜聿明 關麟徵 薛岳 陳調元 方本仁', 廣州: '陳銘樞 蔣光鼐 蔡廷鍇 范石生' },
        gui: { 南寧: '黃旭初', 長沙: '李品仙 廖磊 魯滌平' },
        guomin: { 鄭州: '孫良誠 吉鴻昌 張自忠', 洛陽: '佟麟閣 孫連仲 劉汝明', 西安: '楊虎城 劉郁芬' },
        feng: { 瀋陽: '萬福麟 張景惠', 天津: '于學忠', 濟南: '褚玉璞 孫殿英' },
        dian: { 貴陽: '周西成' }, chuan: { 重慶: '王陵基 李家鈺', 成都: '鄧錫侯 田頌堯' }, ma: { 蘭州: '馬麒 馬鴻逵 馬步芳' } },
      free: { 昆明: '胡若愚', 上海: '鄧演達' },
    },
  };

  /* 地方事件：每個劇本都會加入，依日期觸發（from／until 限定在當月前後，晚開局的劇本不會補發）。
   * 只影響民心等數值，以文字演出，不做成可以操作的戰鬥。 */
  const LOCAL = [
    {
      id: 'may4', title: '五四運動', scene: 'palace',
      cond: { from: [1919, 5], until: [1919, 6] },
      effects: [{ do: 'city_add', city: '北京', field: 'order', amount: -12 }, { do: 'city_add', city: '上海', field: 'order', amount: -8 }],
      lines: [['', '巴黎和會決定把德國在山東的權益轉交日本，消息傳回國內。'],
        ['', '5 月 4 日，北京學生上街遊行，喊出「外爭主權，內除國賊」。上海工人罷工、商人罷市聲援。'],
        ['', '北京政府最後罷免了三名官員，中國代表團也拒絕在和約上簽字。']],
    },
    {
      id: 'lincheng', title: '臨城劫車案', scene: 'night',
      cond: { from: [1923, 5], until: [1923, 6] },
      effects: [{ do: 'city_add', city: '濟南', field: 'order', amount: -10 }],
      lines: [['', '津浦鐵路的特快列車在山東臨城附近遭土匪攔截，三百多名中外旅客被擄上山。'],
        ['', '列強向北京政府嚴重交涉，經過一個多月談判，人質才陸續獲釋，山東督軍因此去職。']],
    },
    {
      id: 'may30', title: '五卅運動', scene: 'palace',
      cond: { from: [1925, 5], until: [1925, 7] },
      effects: [{ do: 'city_add', city: '上海', field: 'order', amount: -15 }, { do: 'loyalty', faction: 'kmt', amount: 5 }],
      lines: [['', '上海日資紗廠的工人顧正紅在衝突中被槍殺，引發學生與市民聲援。'],
        ['', '5 月 30 日，租界巡捕向南京路上的示威群眾開槍，造成多人死傷。'],
        ['', '全國各地罷工、罷課、罷市，反帝國主義的浪潮席捲各大城市。']],
    },
    {
      id: 'jinan_incident', title: '濟南事件', scene: 'night',
      cond: { from: [1928, 5], until: [1928, 6], alive: ['kmt'] },
      effects: [{ do: 'city_add', city: '濟南', field: 'order', amount: -15 }],
      lines: [['', '北伐軍進入濟南時，日本以保護僑民為名出兵山東，雙方爆發衝突。'],
        ['', '國民政府交涉員蔡公時等人遇害，城中軍民傷亡慘重。'],
        ['蔣介石', '（日記）此恥何時可雪……北伐要緊，大軍繞道渡河，繼續北上。']],
    },
    {
      id: 'wushe', title: '霧社事件', scene: 'night',
      cond: { from: [1930, 10], until: [1930, 11] },
      effects: [],
      lines: [['', '在日本統治下的臺灣，霧社地區的賽德克族長年受到強迫勞役與歧視。'],
        ['', '1930 年 10 月 27 日，馬赫坡社頭目莫那・魯道率領族人起事，襲擊運動會會場與駐在所。'],
        ['', '臺灣總督府調動軍警，並動用飛機、火砲與毒氣鎮壓，參與起事的部落死傷慘重。'],
        ['', '這是日治時期規模最大的原住民抗日事件，至今仍被人們紀念。']],
    },
  ];

  function build(d) {
    const owner = {};
    const cities = W.cities.map((c0) => {
      const c = JSON.parse(JSON.stringify(c0));
      // 金門沒有特別指定時，跟著福州的勢力（兵力較少）
      const fz = d.cities['福州'];
      const o = d.cities[c.id] || (c.id === '金門' && fz && fz[0] ? [fz[0], Math.round(fz[1] * 0.3)] : null);
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
      return { id, name, ruler, color: COL[id], heirs: heirs.filter((h) => generals.some((g) => g.name === h && g.faction === id)), strategist: (d.strategists || {})[id] || null };
    });
    for (const f of factions) if (!cities.some((c) => c.owner === f.id)) throw new Error(`劇本 ${d.title}：${f.name} 沒有城`);
    return { id: d.id, tag: d.tag, title: d.title, year: d.year, month: d.month, desc: d.desc, aptitude: W.aptitude,
      factions, cities, roads: W.roads, generals, relations: d.relations || [], events: (d.events || []).concat(LOCAL).map((e) => Object.assign({ historical: true }, e)) };
  }

  TK.SCENARIOS = DEFS.map(build);
  TK.SCENARIO = TK.SCENARIOS[0];
  TK.scenarioById = (id) => TK.SCENARIOS.find((s) => s.id === id) || TK.SCENARIOS[0];
})(globalThis.TK = globalThis.TK || {});
