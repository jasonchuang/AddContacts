/* 劇本：190 群雄割據（data.js）之外，再加五場名戰。
 * 人物、城市與事件取自公有領域的史實與演義；能力值、兵力與對話皆為本作自行設定。
 * 地圖沿用 26 城，名戰地點以最近的城市代表（官渡≈許昌／濮陽、赤壁≈江夏、樊城≈襄陽、夷陵≈江陵）。 */
(function (TK) {
  'use strict';
  const BASE = TK.SCENARIO;

  // data.js 沒有的武將：統率, 武力, 智略, 政務, 魅力
  const EXTRA = {
    于禁: [80, 75, 60, 50, 55], 孫乾: [30, 30, 70, 76, 82], 逢紀: [40, 30, 78, 70, 46], 郭圖: [40, 30, 76, 66, 40],
    高順: [86, 86, 50, 40, 66], 張允: [62, 58, 50, 46, 40], 滿寵: [76, 60, 82, 80, 60], 臧霸: [78, 80, 52, 48, 64],
    張繡: [80, 82, 62, 50, 64], 胡車兒: [50, 80, 30, 20, 36], 陳登: [76, 60, 84, 82, 70], 呂蒙: [84, 82, 88, 70, 76],
    張昭: [30, 20, 82, 94, 80], 張紘: [30, 20, 80, 88, 78], 蔣欽: [74, 82, 50, 46, 60], 陸遜: [92, 70, 96, 88, 86],
    馬岱: [74, 80, 50, 46, 62], 劉璋: [40, 30, 50, 58, 66], 黃權: [74, 58, 82, 76, 70], 李嚴: [82, 76, 78, 80, 56],
    王平: [80, 76, 70, 50, 60],
    許攸: [40, 30, 82, 60, 40], 淳于瓊: [66, 70, 40, 36, 40], 袁譚: [68, 66, 50, 48, 58], 袁尚: [66, 64, 52, 50, 70],
    袁熙: [58, 56, 50, 52, 56], 張魯: [60, 40, 70, 78, 80], 閻圃: [40, 30, 78, 72, 60], 張衛: [66, 70, 40, 36, 40],
    曹昂: [62, 60, 62, 64, 82], 曹丕: [74, 68, 84, 86, 78], 司馬懿: [96, 64, 98, 92, 80], 曹真: [86, 80, 66, 60, 72],
    曹休: [80, 76, 64, 60, 66], 蔣幹: [30, 30, 66, 60, 50], 劉琦: [50, 40, 60, 62, 70], 關平: [78, 82, 64, 60, 72],
    周倉: [60, 82, 30, 20, 56], 廖化: [72, 74, 60, 52, 62], 馬良: [60, 30, 88, 82, 82], 糜芳: [56, 54, 40, 50, 46],
    傅士仁: [54, 56, 36, 40, 36], 凌統: [78, 86, 54, 46, 70], 徐盛: [82, 80, 72, 60, 70], 丁奉: [80, 82, 66, 52, 66],
    潘璋: [76, 80, 46, 40, 52], 朱然: [82, 76, 70, 64, 66], 孫桓: [70, 72, 60, 52, 66], 諸葛瑾: [60, 40, 84, 86, 84],
    步騭: [66, 50, 80, 82, 74], 張苞: [72, 86, 46, 40, 62], 關興: [76, 85, 60, 50, 66], 吳班: [72, 74, 50, 44, 50],
    馮習: [70, 70, 52, 46, 50], 張南: [66, 70, 40, 36, 46], 程畿: [50, 40, 70, 70, 66], 沙摩柯: [66, 88, 26, 20, 50],
    劉禪: [30, 20, 40, 50, 70], 曹安民: [50, 56, 40, 40, 50], 楊松: [30, 20, 60, 50, 30],
  };
  const STATS = {};
  for (const g of BASE.generals) STATS[g.name] = [g.lead, g.war, g.int, g.pol, g.cha];
  for (const [n, v] of Object.entries(EXTRA)) STATS[n] = v;

  const COL = { cao: '#3a6ee8', liu: '#2fb84a', sun: '#e8382c', yuans: '#e8c020', yuanshu: '#f08a1e', liubiao: '#1cc0c8',
    ma: '#b0703a', gongsun: '#e858b0', liuzhang: '#8a8f3a', zhanglu: '#7a6ad0', lubu: '#9a48e0', zhangxiu: '#5aa08a', lijue: '#6a5a8a' };

  /* 劇本定義：
   *  factions: [id, 名稱, 君主, 繼承人...]
   *  cities:   { 城: [勢力, 兵力] }（未列出的城為無主，兵力取原劇本六成）
   *  people:   { 勢力: { 城: '武將 武將 …' } }；free：在野武將 { 城: '…' }
   *  loyalty:  特別的忠誠（例如身在曹營的關羽）
   *  relations: [[甲, 乙, 狀態, 月數]]
   *  events:   本劇本專屬的歷史事件（只在歷史劇本模式發生） */
  const DEFS = [
    {
      id: '197', tag: '曹操 對 張繡', title: '宛城之戰', year: 197, month: 1,
      desc: '張繡獻宛城歸降，曹操入城宴飲。賈詡暗中獻策，一場夜襲即將到來。',
      factions: [['cao', '曹操軍', '曹操'], ['zhangxiu', '張繡軍', '張繡'], ['lubu', '呂布軍', '呂布'], ['yuanshu', '袁術軍', '袁術'],
        ['yuans', '袁紹軍', '袁紹', '袁尚', '袁譚'], ['gongsun', '公孫瓚軍', '公孫瓚'], ['liu', '劉備軍', '劉備'], ['sun', '孫策軍', '孫策', '孫權'],
        ['liubiao', '劉表軍', '劉表', '蔡瑁'], ['lijue', '李傕軍', '李傕', '郭汜'], ['ma', '馬騰軍', '馬騰', '馬超'], ['liuzhang', '劉璋軍', '劉璋'], ['zhanglu', '張魯軍', '張魯']],
      cities: { 許昌: ['cao', 30000], 陳留: ['cao', 18000], 濮陽: ['cao', 15000], 宛: ['zhangxiu', 16000], 下邳: ['lubu', 24000], 北海: ['liu', 9000],
        壽春: ['yuanshu', 30000], 汝南: ['yuanshu', 16000], 鄴: ['yuans', 40000], 南皮: ['yuans', 25000], 平原: ['yuans', 16000], 晉陽: ['yuans', 12000],
        北平: ['gongsun', 22000], 建業: ['sun', 22000], 會稽: ['sun', 12000], 襄陽: ['liubiao', 28000], 江陵: ['liubiao', 16000], 江夏: ['liubiao', 12000],
        長沙: ['liubiao', 10000], 長安: ['lijue', 25000], 天水: ['ma', 18000], 武威: ['ma', 12000], 成都: ['liuzhang', 28000], 漢中: ['zhanglu', 15000] },
      people: {
        cao: { 許昌: '曹操 曹昂 曹安民 典韋 許褚 于禁 荀彧 荀攸 郭嘉 程昱 樂進', 陳留: '夏侯惇 李典 曹洪', 濮陽: '夏侯淵 曹仁' },
        zhangxiu: { 宛: '張繡 賈詡 胡車兒' },
        lubu: { 下邳: '呂布 陳宮 張遼 高順 臧霸 陳登' },
        liu: { 北海: '劉備 關羽 張飛 簡雍 孫乾 糜竺' },
        yuanshu: { 壽春: '袁術 閻象 張勳', 汝南: '紀靈 橋蕤' },
        yuans: { 鄴: '袁紹 田豐 沮授 審配 逢紀 郭圖 許攸 袁尚', 南皮: '顏良 文醜 張郃 高覽', 平原: '袁譚', 晉陽: '淳于瓊' },
        gongsun: { 北平: '公孫瓚 趙雲 田楷 嚴綱' },
        sun: { 建業: '孫策 周瑜 張昭 張紘 程普 黃蓋 韓當 太史慈 呂蒙', 會稽: '孫權 周泰 蔣欽' },
        liubiao: { 襄陽: '劉表 蔡瑁 蒯良 蒯越 張允 文聘', 江夏: '黃祖', 長沙: '黃忠' },
        lijue: { 長安: '李傕 郭汜' },
        ma: { 天水: '馬騰 馬超 龐德 馬岱', 武威: '韓遂' },
        liuzhang: { 成都: '劉璋 張任 嚴顏 黃權 法正' },
        zhanglu: { 漢中: '張魯 閻圃 張衛 楊松' },
      },
      free: { 襄陽: '諸葛亮 徐庶', 江陵: '龐統 魏延', 江夏: '甘寧', 柴桑: '魯肅' },
      relations: [['cao', 'zhangxiu', 'truce', 3], ['yuanshu', 'lubu', 'war'], ['yuanshu', 'sun', 'war'], ['yuans', 'gongsun', 'war'], ['liu', 'lubu', 'truce', 12]],
      events: [
        {
          id: 'wancheng', title: '宛城之變',
          cond: { from: [197, 2], alive: ['cao', 'zhangxiu'], general_faction: { 典韋: 'cao', 張繡: 'zhangxiu' } },
          effects: [{ do: 'relation', a: 'cao', b: 'zhangxiu', state: 'war' }, { do: 'die', general: '典韋' }, { do: 'die', general: '曹昂' }, { do: 'die', general: '曹安民' },
            { do: 'troops_scale', city: '許昌', mult: 0.75 }, { do: 'troops', city: '宛', unit: 'spear', amount: 4000 }],
          lines: [['賈詡', '曹操入城後日夜宴飲，營中防備鬆懈。今夜正是動手之時。'], ['張繡', '好！胡車兒，先去把典韋的雙戟偷出來！'],
            ['典韋', '主公快走！典韋在此，一個也別想過這道門！'], ['曹操', '典韋……我失去長子，都不如失去你這般心痛。']],
        },
        {
          id: 'yuanshu_emperor', title: '袁術稱帝',
          cond: { from: [197, 3], alive: ['yuanshu'] },
          effects: [{ do: 'relation', a: 'yuanshu', b: 'cao', state: 'war' }, { do: 'relation', a: 'yuanshu', b: 'liu', state: 'war' }, { do: 'loyalty', faction: 'yuanshu', amount: -10 }],
          lines: [['袁術', '玉璽在我手中，天命所歸！自今日起，國號為仲！'], ['閻象', '主公……此舉必招天下群起而攻之啊。']],
        },
        {
          id: 'zhangxiu_surrender', title: '張繡再降',
          cond: { from: [199, 6], alive: ['cao', 'zhangxiu'], adjacent_factions: ['cao', 'zhangxiu'], cities_at_least: { cao: 5 } },
          effects: [{ do: 'absorb', faction: 'zhangxiu', into: 'cao' }],
          lines: [['賈詡', '曹公志在天下，必不記私仇。此時歸順，正是時候。'], ['曹操', '過去的事就讓它過去。張將軍，以後同心協力吧。']],
        },
      ],
    },
    {
      id: '200', tag: '曹操 對 袁紹', title: '官渡之戰', year: 200, month: 1,
      desc: '袁紹統一河北，率十萬大軍南下；曹操據官渡以寡敵眾。身在曹營的關羽，心仍向著兄長。',
      factions: [['cao', '曹操軍', '曹操', '曹丕'], ['yuans', '袁紹軍', '袁紹', '袁尚', '袁譚'], ['liu', '劉備軍', '劉備'], ['sun', '孫策軍', '孫策', '孫權'],
        ['liubiao', '劉表軍', '劉表', '蔡瑁'], ['ma', '馬騰軍', '馬騰', '馬超'], ['liuzhang', '劉璋軍', '劉璋'], ['zhanglu', '張魯軍', '張魯']],
      cities: { 許昌: ['cao', 35000], 陳留: ['cao', 25000], 濮陽: ['cao', 20000], 下邳: ['cao', 14000], 宛: ['cao', 12000], 洛陽: ['cao', 14000], 長安: ['cao', 12000],
        鄴: ['yuans', 60000], 南皮: ['yuans', 30000], 平原: ['yuans', 22000], 北海: ['yuans', 15000], 北平: ['yuans', 20000], 晉陽: ['yuans', 15000],
        汝南: ['liu', 12000], 建業: ['sun', 28000], 會稽: ['sun', 14000], 柴桑: ['sun', 15000],
        襄陽: ['liubiao', 30000], 江陵: ['liubiao', 18000], 江夏: ['liubiao', 15000], 長沙: ['liubiao', 12000],
        天水: ['ma', 20000], 武威: ['ma', 15000], 成都: ['liuzhang', 30000], 漢中: ['zhanglu', 16000] },
      people: {
        cao: { 許昌: '曹操 曹丕 荀彧 荀攸 郭嘉 程昱 賈詡 許褚 關羽', 陳留: '夏侯惇 張遼 徐晃 于禁', 濮陽: '樂進 李典 曹洪', 下邳: '臧霸 陳登', 宛: '張繡 曹仁', 洛陽: '夏侯淵', 長安: '滿寵' },
        yuans: { 鄴: '袁紹 田豐 沮授 審配 逢紀 郭圖 許攸 袁尚 淳于瓊', 南皮: '顏良 文醜 張郃 高覽', 平原: '袁譚', 北平: '袁熙' },
        liu: { 汝南: '劉備 張飛 趙雲 簡雍 孫乾 糜竺' },
        sun: { 建業: '孫策 孫權 周瑜 張昭 張紘 程普 黃蓋 韓當', 柴桑: '太史慈 呂蒙 周泰', 會稽: '蔣欽' },
        liubiao: { 襄陽: '劉表 蔡瑁 蒯良 蒯越 張允 文聘 劉琦', 江夏: '黃祖 甘寧', 長沙: '黃忠' },
        ma: { 天水: '馬騰 馬超 龐德 馬岱', 武威: '韓遂' },
        liuzhang: { 成都: '劉璋 張任 嚴顏 黃權 法正' },
        zhanglu: { 漢中: '張魯 閻圃 張衛 楊松' },
      },
      free: { 襄陽: '諸葛亮 徐庶', 江陵: '龐統 魏延 馬良', 下邳: '魯肅', 壽春: '陸遜' },
      loyalty: { 關羽: 35, 張繡: 70 },
      relations: [['cao', 'yuans', 'war'], ['cao', 'liu', 'war'], ['liu', 'yuans', 'alliance']],
      events: [
        {
          id: 'baima', title: '白馬解圍',
          cond: { from: [200, 2], alive: ['cao', 'yuans'], general_faction: { 關羽: 'cao', 顏良: 'yuans' } },
          effects: [{ do: 'die', general: '顏良' }, { do: 'troops_scale', city: '南皮', mult: 0.85 }, { do: 'loyalty_of', generals: ['關羽'], value: 45 }],
          lines: [['曹操', '顏良圍白馬，勇不可當。雲長可願出陣？'], ['關羽', '關某願往。斬他首級，以報曹公厚待之恩。'], ['', '關羽策馬直入萬軍之中，一刀斬顏良於馬下，袁軍大亂。']],
        },
        {
          id: 'guandu_return', title: '千里尋兄',
          cond: { from: [200, 4], alive: ['liu'], general_elsewhere: { 關羽: 'liu' } },
          effects: [{ do: 'join', general: '關羽', faction: 'liu', force: true }],
          lines: [['關羽', '恩已報，兄長下落已明。關某封金掛印，就此告辭！'], ['曹操', '各為其主，不必追了。……雲長真義士也。']],
        },
        {
          id: 'sunce_dies', title: '孫策遇刺',
          cond: { from: [200, 4], alive: ['sun'], general_faction: { 孫策: 'sun' }, chance: 0.35 },
          effects: [{ do: 'die', general: '孫策' }],
          lines: [['孫策', '仲謀……臨陣決機、爭衡天下，你不如我；舉賢任能、保守江東，我不如你。'], ['孫權', '兄長！江東就交給我吧。']],
        },
        {
          id: 'wuchao', title: '火燒烏巢',
          cond: { from: [200, 9], alive: ['cao', 'yuans'], general_faction: { 許攸: 'yuans' }, adjacent_factions: ['cao', 'yuans'] },
          effects: [{ do: 'join', general: '許攸', faction: 'cao', force: true }, { do: 'city_scale', city: '鄴', field: 'food', mult: 0.3 },
            { do: 'troops_scale', city: '鄴', mult: 0.7 }, { do: 'join', general: '張郃', faction: 'cao', force: true }, { do: 'join', general: '高覽', faction: 'cao', force: true }],
          lines: [['許攸', '孟德，袁紹的軍糧全囤在烏巢，守將淳于瓊嗜酒無備。'], ['曹操', '子遠此來，大事成矣！我親率五千精兵，今夜就去燒糧！'], ['張郃', '烏巢已失，袁公不聽良言……罷了，我與高覽投曹公。']],
        },
        {
          id: 'yuanshao_dies', title: '袁紹病逝',
          cond: { from: [202, 5], alive: ['yuans'], general_faction: { 袁紹: 'yuans' } },
          effects: [{ do: 'die', general: '袁紹' }, { do: 'loyalty', faction: 'yuans', amount: -15 }],
          lines: [['審配', '主公嘔血而亡，立三公子袁尚為嗣……大公子恐怕不服。']],
        },
      ],
    },
    {
      id: '208', tag: '孫劉聯軍 對 曹操', title: '赤壁之戰', year: 208, month: 9,
      desc: '曹操平定河北、取得荊州，號稱八十萬大軍順江而下。孫權與劉備聯手，在赤壁迎戰。',
      factions: [['cao', '曹操軍', '曹操', '曹丕'], ['sun', '孫權軍', '孫權'], ['liu', '劉備軍', '劉備'], ['ma', '馬騰軍', '馬騰', '馬超'],
        ['liuzhang', '劉璋軍', '劉璋'], ['zhanglu', '張魯軍', '張魯']],
      cities: { 許昌: ['cao', 40000], 陳留: ['cao', 20000], 濮陽: ['cao', 18000], 鄴: ['cao', 45000], 南皮: ['cao', 20000], 平原: ['cao', 15000], 北海: ['cao', 15000],
        北平: ['cao', 18000], 晉陽: ['cao', 15000], 洛陽: ['cao', 20000], 下邳: ['cao', 16000], 壽春: ['cao', 18000], 汝南: ['cao', 15000], 宛: ['cao', 18000],
        襄陽: ['cao', 45000], 江陵: ['cao', 60000],
        建業: ['sun', 25000], 會稽: ['sun', 15000], 柴桑: ['sun', 40000], 江夏: ['liu', 20000],
        長安: ['ma', 18000], 天水: ['ma', 20000], 武威: ['ma', 15000], 成都: ['liuzhang', 32000], 漢中: ['zhanglu', 18000] },
      people: {
        cao: { 江陵: '曹操 曹仁 張遼 徐晃 許褚 于禁 樂進 蔡瑁 張允 蔣幹 程昱 荀攸 賈詡', 襄陽: '文聘 曹洪 李典 滿寵', 許昌: '荀彧 夏侯惇 曹丕 司馬懿',
          鄴: '張郃 高覽', 洛陽: '夏侯淵', 宛: '張繡', 壽春: '臧霸', 下邳: '陳登', 汝南: '李通', 北平: '曹真', 南皮: '曹休' },
        sun: { 柴桑: '孫權 周瑜 魯肅 程普 黃蓋 韓當 甘寧 太史慈 周泰 呂蒙 凌統 蔣欽', 建業: '張昭 張紘 陸遜 徐盛 丁奉', 會稽: '朱然 潘璋 諸葛瑾' },
        liu: { 江夏: '劉備 關羽 張飛 趙雲 諸葛亮 簡雍 孫乾 糜竺 劉琦 關平 周倉 糜芳' },
        ma: { 長安: '馬騰 馬超 龐德 馬岱', 武威: '韓遂' },
        liuzhang: { 成都: '劉璋 張任 嚴顏 黃權 法正 李嚴' },
        zhanglu: { 漢中: '張魯 閻圃 張衛 楊松' },
      },
      free: { 長沙: '黃忠 魏延', 江陵: '龐統 馬良', 襄陽: '徐庶 廖化' },
      relations: [['sun', 'liu', 'alliance'], ['cao', 'sun', 'war'], ['cao', 'liu', 'war']],
      events: [
        {
          id: 'kurou', title: '苦肉計',
          cond: { from: [208, 10], alive: ['cao', 'sun'], general_faction: { 黃蓋: 'sun', 周瑜: 'sun' } },
          effects: [{ do: 'loyalty_of', generals: ['黃蓋'], value: 100 }],
          lines: [['黃蓋', '曹軍勢大，不可力敵。蓋願受杖刑詐降，好讓火船靠近曹營。'], ['周瑜', '老將軍……此計若成，功在你一人。'], ['蔣幹', '（周瑜醉了……桌上這封信，得帶回去給丞相看看。）']],
        },
        {
          id: 'chibi_fire', title: '火燒赤壁',
          cond: { from: [208, 11], alive: ['cao', 'sun'], general_faction: { 黃蓋: 'sun', 周瑜: 'sun' }, owns: { cao: ['江陵'] }, chance: 0.6 },
          effects: [{ do: 'troops_scale', city: '江陵', mult: 0.35 }, { do: 'troops_scale', city: '襄陽', mult: 0.8 }, { do: 'die', general: '蔡瑁' }, { do: 'die', general: '張允' },
            { do: 'troops', city: '柴桑', unit: 'xbow', amount: 6000 }, { do: 'troops', city: '江夏', unit: 'xbow', amount: 4000 }],
          lines: [['諸葛亮', '東南風起了。'], ['黃蓋', '點火！二十艘火船，全部衝向曹營！'], ['', '曹軍戰船以鐵索相連，避無可避。烈焰映紅長江，曹軍死傷無數。'], ['曹操', '撤！撤回江陵、襄陽！']],
        },
        {
          id: 'jingnan', title: '平定荊南',
          cond: { from: [209, 1], alive: ['liu'], neutral_city: '長沙', near: ['liu', '長沙'] },
          effects: [{ do: 'give_city', city: '長沙', faction: 'liu', units: { spear: 6000, xbow: 4000 } }, { do: 'join', general: '黃忠', faction: 'liu' }, { do: 'join', general: '魏延', faction: 'liu' }],
          lines: [['黃忠', '老夫雖年過六旬，弓馬仍不輸少年。願隨劉皇叔！'], ['魏延', '韓玄不仁，我等獻城歸降！']],
        },
        {
          id: 'pangtong_joins', title: '鳳雛來投',
          cond: { from: [209, 6], alive: ['liu'], general_free: ['龐統'], chance: 0.3 },
          effects: [{ do: 'join', general: '龐統', faction: 'liu' }],
          lines: [['諸葛亮', '主公，士元之才不在亮之下，切莫以貌取人。'], ['劉備', '臥龍、鳳雛，得一可安天下——今日兩人都在我帳下了！']],
        },
      ],
    },
    {
      id: '219', tag: '關羽 對 曹仁、呂蒙', title: '水淹七軍', year: 219, month: 7,
      desc: '劉備取漢中、稱漢中王；關羽自江陵北伐，圍曹仁於樊城。秋雨連綿，漢水將漲。而江東的呂蒙，正盯著空虛的江陵。',
      factions: [['cao', '曹操軍', '曹操', '曹丕'], ['liu', '劉備軍', '劉備', '劉禪'], ['sun', '孫權軍', '孫權']],
      cities: { 許昌: ['cao', 40000], 陳留: ['cao', 20000], 濮陽: ['cao', 18000], 鄴: ['cao', 45000], 南皮: ['cao', 20000], 平原: ['cao', 16000], 北海: ['cao', 15000],
        北平: ['cao', 18000], 晉陽: ['cao', 16000], 洛陽: ['cao', 25000], 長安: ['cao', 30000], 天水: ['cao', 20000], 武威: ['cao', 15000],
        下邳: ['cao', 16000], 壽春: ['cao', 30000], 汝南: ['cao', 18000], 宛: ['cao', 25000], 襄陽: ['cao', 30000],
        成都: ['liu', 30000], 漢中: ['liu', 30000], 江陵: ['liu', 40000],
        建業: ['sun', 30000], 會稽: ['sun', 15000], 柴桑: ['sun', 30000], 江夏: ['sun', 22000], 長沙: ['sun', 18000] },
      people: {
        cao: { 襄陽: '曹仁 于禁 龐德 滿寵', 宛: '徐晃 曹操', 許昌: '曹丕 司馬懿 賈詡 程昱 許褚 夏侯惇', 長安: '張郃 曹真 郭淮', 壽春: '張遼 臧霸 曹休', 汝南: '文聘', 洛陽: '曹洪' },
        liu: { 江陵: '關羽 關平 周倉 廖化 馬良 糜芳 傅士仁 王甫', 成都: '劉備 諸葛亮 法正 黃權 李嚴 劉禪 馬岱', 漢中: '魏延 張飛 趙雲 馬超 黃忠 王平 吳班' },
        sun: { 柴桑: '孫權 呂蒙 陸遜 甘寧 周泰 蔣欽 潘璋 朱然', 建業: '張昭 諸葛瑾 步騭 徐盛 丁奉 韓當', 江夏: '凌統', 長沙: '孫桓' },
      },
      free: {},
      relations: [['cao', 'liu', 'war'], ['sun', 'liu', 'alliance'], ['cao', 'sun', 'truce', 12]],
      events: [
        {
          id: 'flood', title: '水淹七軍',
          cond: { from: [219, 8], alive: ['liu', 'cao'], general_faction: { 關羽: 'liu', 于禁: 'cao', 龐德: 'cao' }, owns: { liu: ['江陵'], cao: ['襄陽'] } },
          effects: [{ do: 'troops_scale', city: '襄陽', mult: 0.45 }, { do: 'join', general: '于禁', faction: 'liu', force: true }, { do: 'die', general: '龐德' },
            { do: 'loyalty', faction: 'cao', amount: -5 }],
          lines: [['關羽', '秋雨連下十餘日，漢水必漲。于禁屯兵低地，此乃天助我也！'], ['', '漢水暴漲，于禁七軍盡數淹沒。關羽乘大船來攻，于禁投降。'],
            ['龐德', '我寧為國家鬼，不為賊將！'], ['曹操', '于禁跟隨我三十年，臨危竟不如龐德……']],
        },
        {
          id: 'baiyi', title: '白衣渡江',
          cond: { from: [219, 10], alive: ['liu', 'sun'], owns: { liu: ['江陵'] }, general_faction: { 呂蒙: 'sun' }, troops_below: { 江陵: 30000 }, chance: 0.5 },
          effects: [{ do: 'relation', a: 'sun', b: 'liu', state: 'war' }, { do: 'relation', a: 'sun', b: 'cao', state: 'alliance' },
            { do: 'seize', city: '江陵', faction: 'sun' }, { do: 'join', general: '糜芳', faction: 'sun', force: true }, { do: 'join', general: '傅士仁', faction: 'sun', force: true }],
          lines: [['呂蒙', '關羽主力北上，江陵空虛。精兵扮作商人，白衣搖櫓，今夜渡江。'], ['陸遜', '沿江烽火台的守兵，一個都不能放走。'], ['糜芳', '……開城吧。']],
        },
        {
          id: 'maicheng', title: '敗走麥城',
          cond: { from: [219, 11], alive: ['sun'], owns: { sun: ['江陵'] }, general_faction: { 關羽: 'liu' } },
          effects: [{ do: 'die', general: '關羽' }, { do: 'die', general: '關平' }, { do: 'die', general: '周倉' }, { do: 'loyalty', faction: 'liu', amount: 5 }],
          lines: [['關羽', '玉可碎而不可改其白，竹可焚而不可毀其節。'], ['劉備', '雲長——！此仇不報，誓不為人！']],
        },
        {
          id: 'caocao_dies', title: '曹操病逝',
          cond: { from: [220, 1], alive: ['cao'], general_faction: { 曹操: 'cao' } },
          effects: [{ do: 'die', general: '曹操' }],
          lines: [['曹操', '天下尚未安定……子桓，好自為之。'], ['司馬懿', '（魏王去世了……往後的路，還長得很。）']],
        },
      ],
    },
    {
      id: '221', tag: '劉備 對 陸遜', title: '夷陵之戰', year: 221, month: 7,
      desc: '曹丕篡漢稱帝，劉備在成都即位。為報關羽之仇，劉備不顧群臣勸阻，親率大軍東征孫吳；孫權拜陸遜為大都督迎戰。',
      factions: [['cao', '魏', '曹丕'], ['liu', '蜀漢', '劉備', '劉禪'], ['sun', '吳', '孫權']],
      cities: { 許昌: ['cao', 40000], 陳留: ['cao', 22000], 濮陽: ['cao', 18000], 鄴: ['cao', 45000], 南皮: ['cao', 20000], 平原: ['cao', 16000], 北海: ['cao', 15000],
        北平: ['cao', 18000], 晉陽: ['cao', 16000], 洛陽: ['cao', 35000], 長安: ['cao', 30000], 天水: ['cao', 22000], 武威: ['cao', 15000],
        下邳: ['cao', 16000], 壽春: ['cao', 30000], 汝南: ['cao', 18000], 宛: ['cao', 22000], 襄陽: ['cao', 30000],
        成都: ['liu', 70000], 漢中: ['liu', 30000],
        江陵: ['sun', 45000], 江夏: ['sun', 25000], 長沙: ['sun', 18000], 柴桑: ['sun', 28000], 建業: ['sun', 30000], 會稽: ['sun', 15000] },
      people: {
        cao: { 洛陽: '曹丕 司馬懿 賈詡 許褚', 許昌: '曹真 陳群', 長安: '張郃 郭淮', 宛: '曹仁 徐晃', 襄陽: '滿寵 文聘', 壽春: '張遼 臧霸 曹休', 鄴: '于禁' },
        liu: { 成都: '劉備 諸葛亮 李嚴 劉禪 黃權 馬良 關興 張苞 吳班 馮習 張南 程畿 沙摩柯 廖化', 漢中: '魏延 馬超 馬岱 王平 趙雲' },
        sun: { 江陵: '陸遜 朱然 潘璋 韓當 徐盛 孫桓', 柴桑: '孫權 諸葛瑾 步騭 周泰', 建業: '張昭 丁奉', 江夏: '糜芳 傅士仁' },
      },
      free: {},
      relations: [['liu', 'sun', 'war'], ['cao', 'liu', 'war'], ['cao', 'sun', 'truce', 12]],
      events: [
        {
          id: 'eastern', title: '劉備東征',
          cond: { from: [221, 7], alive: ['liu', 'sun'] },
          effects: [{ do: 'loyalty', faction: 'liu', amount: 5 }, { do: 'troops', city: '成都', unit: 'spear', amount: 8000 }],
          lines: [['趙雲', '國賊是曹丕，不是孫權。陛下若先伐吳，只怕正中魏人下懷。'], ['劉備', '雲長、翼德接連遇害，朕若不報此仇，有何面目立於天地之間！'], ['諸葛亮', '（法孝直若還在，或許能勸住陛下……）']],
        },
        {
          id: 'lianying', title: '火燒連營',
          cond: { from: [222, 6], alive: ['liu', 'sun'], general_faction: { 陸遜: 'sun', 劉備: 'liu' }, chance: 0.5 },
          effects: [{ do: 'troops_scale', city: '成都', mult: 0.5 }, { do: 'die', general: '馮習' }, { do: 'die', general: '張南' }, { do: 'die', general: '程畿' }, { do: 'die', general: '沙摩柯' },
            { do: 'join', general: '黃權', faction: 'cao', force: true }, { do: 'relation', a: 'liu', b: 'sun', state: 'truce', months: 12 }],
          lines: [['陸遜', '蜀軍連營七百里，正值盛夏，營寨皆依林木而立。是時候了——火攻！'], ['', '一夜之間，蜀軍數十座營寨陷入火海。'], ['劉備', '朕竟敗給了陸遜這個書生……豈非天意！']],
        },
        {
          id: 'baidi', title: '白帝託孤',
          cond: { from: [223, 4], alive: ['liu'], general_faction: { 劉備: 'liu', 諸葛亮: 'liu' } },
          effects: [{ do: 'die', general: '劉備' }, { do: 'loyalty_of', generals: ['諸葛亮', '趙雲'], value: 100 }],
          lines: [['劉備', '君才十倍曹丕，必能安國，終定大事。若嗣子可輔，輔之；如其不才，君可自取。'], ['諸葛亮', '臣敢不竭股肱之力，效忠貞之節，繼之以死！']],
        },
      ],
    },
  ];

  // 其他補充武將
  Object.assign(STATS, { 李通: [72, 76, 56, 50, 66], 陳群: [50, 30, 86, 92, 76], 郭淮: [84, 74, 76, 66, 66], 王甫: [56, 50, 72, 70, 64] });

  function build(d) {
    const owner = {};
    const cities = BASE.cities.map((c0) => {
      const c = JSON.parse(JSON.stringify(c0));
      const o = d.cities[c.id];
      c.owner = o ? o[0] : null;
      c.troops = o ? o[1] : Math.round(c0.troops * 0.6 / 1000) * 1000;
      c.train = c.owner ? 55 : 40;
      delete c.mix;
      owner[c.id] = c.owner;
      return c;
    });
    const generals = [];
    const add = (name, faction, city, status) => {
      const st = STATS[name];
      if (!st) throw new Error(`劇本 ${d.title}：找不到武將 ${name}`);
      if (!BASE.cities.some((c) => c.id === city)) throw new Error(`劇本 ${d.title}：找不到城市 ${city}`);
      if (generals.some((g) => g.name === name)) throw new Error(`劇本 ${d.title}：武將重複 ${name}`);
      const loy = (d.loyalty && d.loyalty[name]) || 88;
      generals.push({ id: name, name, faction, city, lead: st[0], war: st[1], int: st[2], pol: st[3], cha: st[4],
        loyalty: faction ? loy : 0, status, hidden: status === 'free', ruler: false });
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
      return { id, name, ruler, color: COL[id], heirs };
    });
    for (const f of factions) if (!cities.some((c) => c.owner === f.id)) throw new Error(`劇本 ${d.title}：${f.name} 沒有城`);
    return { id: d.id, tag: d.tag, title: d.title, year: d.year, month: d.month, desc: d.desc, aptitude: BASE.aptitude,
      factions, cities, roads: BASE.roads, generals, relations: d.relations || [], events: (d.events || []).map((e) => Object.assign({ historical: true }, e)) };
  }

  BASE.id = '190';
  BASE.tag = '諸侯討伐董卓';
  BASE.desc = '董卓專權，關東諸侯起兵討伐。群雄割據，天下大亂的開端。';
  BASE.relations = BASE.relations || [];
  BASE.events = [];
  TK.SCENARIOS = [BASE, ...DEFS.map(build)];
  TK.scenarioById = (id) => TK.SCENARIOS.find((s) => s.id === (id || '190')) || BASE;
})(globalThis.TK = globalThis.TK || {});
