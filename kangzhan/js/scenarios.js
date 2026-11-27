/* 《烽火 十四年》的劇本（1931～1945）。
 * 人物、地名與事件取自公開史料；能力值、兵力與對話皆為本作自行設定。
 * 語氣以史實為本、保持中性，不美化或醜化任何人物。 */
(function (TK) {
  'use strict';
  const W = TK.WORLD;

  // 日方陣營（side: 'axis'）由電腦控制、不能選，也不能與之外交
  const COL = { japan: '#4d4d4d', ccp: '#c8102e', song: '#6b8e23', dongbei: '#b8860b', xibei: '#708090', yue: '#c71585', usa: '#4a90d9', manchu: '#b8a07a', wang: '#9a9a6a', duan: '#2e6fd8', zhi: '#2fa84a', feng: '#d4a017', jin: '#8a6a3a', kmt: '#1f4fa0', gui: '#16a085',
    dian: '#8e44ad', chuan: '#d35400', qian: '#7f8c8d', ma: '#b0703a', guomin: '#5a7a9a', sun: '#e67ea8', xun: '#4a4a4a' };

  /* 劇本定義：
   *  factions: [id, 名稱, 首領, 繼承人...]
   *  cities:   { 城: [勢力, 兵力] }（未列出的城為無主，守軍 6000）
   *  people:   { 勢力: { 城: '人物 人物 …' } }；free：在野人物 { 城: '…' }
   *  relations: [[甲, 乙, 狀態, 月數]]
   *  events:   歷史事件（只在歷史劇本模式發生） */
  // 日方的年度攻勢目標（1937 年 7 月以前只會攻打這些城；見 ai.js）
  const AXIS_PLAN = [[1931, 9, '長春 哈爾濱 錦州'], [1933, 1, '承德'], [1935, 6, '張家口'],
    [1937, 7, '北京 天津 保定 上海'], [1937, 10, '南京 太原 濟南 大同 金門'], [1938, 3, '徐州 合肥 青島'], [1938, 6, '武漢 廣州 南昌 鄭州 杭州 福州'],
    [1939, 9, '長沙 宜昌 南寧'], [1944, 4, '洛陽 衡陽 桂林 長沙 南寧 芷江']];
  const ISLANDS = { 臺北: ['japan', 30000], 臺南: ['japan', 20000], 沖繩: ['japan', 40000], 塞班: ['japan', 15000] };
  const BURMA_LOCKED = { 臘戌: [null, 6000], 列多: ['usa', 30000] };
  const CHINA = ['kmt', 'ccp', 'song', 'dongbei', 'xibei', 'yue', 'jin', 'gui', 'chuan', 'dian', 'ma'];
  // 日方與所有中方勢力交戰；中方之間依劇本另外設定
  const vsJapan = (ids) => ids.filter((x) => CHINA.includes(x)).map((x) => ['japan', x, 'war']);
  const USA = ['usa', '美軍', '羅斯福', '史迪威'];
  const US_PEOPLE = { 列多: '羅斯福 史迪威 魏德邁 麥克阿瑟 尼米茲' };

  const DEFS = [
    {
      id: '1931', title: '九一八事變', year: 1931, month: 9, tag: '東北淪陷・十四年抗戰之始',
      desc: '1931 年 9 月 18 日夜，日本關東軍炸毀瀋陽北郊柳條湖附近的南滿鐵路，反誣中國軍隊所為，隨即進攻北大營。東北軍主力遠在關內，奉命避免衝突。中國正陷於內戰與剿共，日本則一步步把手伸向東北。',
      factions: [['kmt', '國民政府', '蔣介石', '陳誠'], ['dongbei', '東北軍', '張學良', '于學忠'], ['ccp', '中共', '毛澤東', '周恩來'], ['jin', '晉綏軍', '閻錫山', '傅作義'],
        ['xibei', '西北軍', '楊虎城', '孫蔚如'], ['yue', '粵系', '陳濟棠', '余漢謀'], ['gui', '桂系', '李宗仁', '白崇禧'], ['chuan', '川軍', '劉湘', '鄧錫侯'],
        ['dian', '滇軍', '龍雲', '盧漢'], ['ma', '西北馬家', '馬步芳', '馬鴻逵'], ['japan', '日軍', '裕仁'], USA],
      npc: ['japan'], dormant: ['usa'],
      cities: Object.assign({ 瀋陽: ['japan', 50000],
        長春: ['dongbei', 30000], 哈爾濱: ['dongbei', 30000], 錦州: ['dongbei', 40000], 承德: ['dongbei', 20000], 北京: ['dongbei', 60000], 天津: ['dongbei', 30000],
        保定: ['dongbei', 25000], 張家口: ['dongbei', 15000], 太原: ['jin', 35000], 大同: ['jin', 15000], 包頭: ['jin', 12000],
        南京: ['kmt', 60000], 上海: ['kmt', 30000], 杭州: ['kmt', 20000], 合肥: ['kmt', 15000], 徐州: ['kmt', 25000], 鄭州: ['kmt', 20000], 洛陽: ['kmt', 15000],
        武漢: ['kmt', 35000], 南昌: ['kmt', 45000], 長沙: ['kmt', 25000], 宜昌: ['kmt', 12000], 衡陽: ['kmt', 12000], 芷江: ['kmt', 8000], 福州: ['kmt', 15000],
        濟南: ['kmt', 25000], 青島: ['kmt', 12000], 貴陽: ['kmt', 12000], 西安: ['xibei', 25000], 延安: ['xibei', 8000], 瑞金: ['ccp', 40000], 廣州: ['yue', 40000],
        桂林: ['gui', 25000], 南寧: ['gui', 20000], 重慶: ['chuan', 30000], 成都: ['chuan', 30000], 昆明: ['dian', 25000], 蘭州: ['ma', 20000] }, ISLANDS, BURMA_LOCKED),
      people: {
        japan: { 瀋陽: '本庄繁 板垣征四郎 石原莞爾 土肥原賢二', 沖繩: '裕仁 山本五十六' },
        dongbei: { 北京: '張學良 于學忠 萬福麟 張作相', 哈爾濱: '馬占山', 承德: '湯玉麟', 張家口: '宋哲元 張自忠 佟麟閣 趙登禹 劉汝明' },
        jin: { 太原: '閻錫山 傅作義 商震 徐永昌' },
        kmt: { 南京: '蔣介石 宋美齡 何應欽 陳誠 戴笠 宋子文 顧祝同 汪精衛 黃紹竑 張治中 高志航 孫立人', 上海: '蔡廷鍇 蔣光鼐 陳銘樞 謝晉元 孫元良',
          南昌: '劉峙 蔣鼎文 胡宗南 衛立煌 湯恩伯 薛岳', 濟南: '韓復榘', 青島: '沈鴻烈', 鄭州: '孫連仲', 武漢: '杜聿明 關麟徵 王耀武 戴安瀾 張靈甫 胡璉 宋希濂', 長沙: '方先覺 鄭洞國' },
        xibei: { 西安: '楊虎城 孫蔚如' },
        ccp: { 瑞金: '毛澤東 周恩來 朱德 彭德懷 林彪 劉伯承 葉劍英 聶榮臻 項英 陳毅 粟裕 左權 賀龍 徐向前' },
        yue: { 廣州: '陳濟棠 余漢謀' }, gui: { 南寧: '李宗仁 白崇禧 黃旭初 廖磊 李品仙' },
        chuan: { 重慶: '劉湘 王陵基 楊森', 成都: '劉文輝 鄧錫侯 田頌堯 李家鈺' }, dian: { 昆明: '龍雲 盧漢' }, ma: { 蘭州: '馬步芳 馬鴻逵 馬麒' },
        usa: US_PEOPLE,
      },
      free: { 延安: '劉志丹', 天津: '馮玉祥 吉鴻昌', 上海: '葉挺' },
      strategists: { kmt: '何應欽', ccp: '周恩來', japan: '石原莞爾' },
      relations: vsJapan(['kmt', 'dongbei', 'ccp', 'jin', 'xibei', 'yue', 'gui', 'chuan', 'dian', 'ma']).concat([['kmt', 'ccp', 'truce', 38], ['kmt', 'dongbei', 'alliance', 24]]),
    },
    {
      id: '1933', title: '長城抗戰', year: 1933, month: 2, tag: '熱河・喜峰口・大刀隊',
      desc: '東北淪陷一年多，日本扶植的「滿洲國」已經成立。1933 年初，日軍進犯熱河，兵鋒直指長城各口。宋哲元的第二十九軍在喜峰口夜襲日軍，大刀隊威名傳遍全國。',
      factions: [['kmt', '國民政府', '蔣介石', '陳誠'], ['dongbei', '東北軍', '張學良', '于學忠'], ['song', '第二十九軍', '宋哲元', '張自忠'], ['ccp', '中共', '毛澤東', '周恩來'],
        ['jin', '晉綏軍', '閻錫山', '傅作義'], ['xibei', '西北軍', '楊虎城', '孫蔚如'], ['yue', '粵系', '陳濟棠', '余漢謀'], ['gui', '桂系', '李宗仁', '白崇禧'],
        ['chuan', '川軍', '劉湘', '鄧錫侯'], ['dian', '滇軍', '龍雲', '盧漢'], ['ma', '西北馬家', '馬步芳', '馬鴻逵'], ['japan', '日軍', '裕仁'], USA],
      npc: ['japan'], dormant: ['usa'],
      cities: Object.assign({ 瀋陽: ['japan', 60000], 長春: ['japan', 40000], 哈爾濱: ['japan', 30000], 錦州: ['japan', 70000],
        承德: ['dongbei', 25000], 北京: ['dongbei', 50000], 天津: ['dongbei', 25000], 保定: ['song', 25000], 張家口: ['song', 20000],
        太原: ['jin', 35000], 大同: ['jin', 15000], 包頭: ['jin', 12000],
        南京: ['kmt', 60000], 上海: ['kmt', 30000], 杭州: ['kmt', 20000], 合肥: ['kmt', 15000], 徐州: ['kmt', 25000], 鄭州: ['kmt', 20000], 洛陽: ['kmt', 15000],
        武漢: ['kmt', 35000], 南昌: ['kmt', 50000], 長沙: ['kmt', 25000], 宜昌: ['kmt', 12000], 衡陽: ['kmt', 12000], 芷江: ['kmt', 8000], 福州: ['kmt', 25000],
        濟南: ['kmt', 25000], 青島: ['kmt', 12000], 貴陽: ['kmt', 12000], 西安: ['xibei', 25000], 延安: ['xibei', 8000], 瑞金: ['ccp', 45000], 廣州: ['yue', 40000],
        桂林: ['gui', 25000], 南寧: ['gui', 20000], 重慶: ['chuan', 30000], 成都: ['chuan', 30000], 昆明: ['dian', 25000], 蘭州: ['ma', 20000] }, ISLANDS, BURMA_LOCKED),
      people: {
        japan: { 錦州: '武藤信義 板垣征四郎', 瀋陽: '土肥原賢二 石原莞爾', 長春: '東條英機', 沖繩: '裕仁 山本五十六' },
        dongbei: { 北京: '張學良 于學忠 萬福麟 張作相', 承德: '湯玉麟' }, song: { 保定: '宋哲元 張自忠 佟麟閣 趙登禹', 張家口: '劉汝明' },
        jin: { 太原: '閻錫山 傅作義 商震 徐永昌' },
        kmt: { 南京: '蔣介石 宋美齡 何應欽 陳誠 戴笠 宋子文 顧祝同 汪精衛 黃紹竑 張治中 高志航 孫立人', 福州: '蔡廷鍇 蔣光鼐 陳銘樞', 上海: '謝晉元 孫元良',
          南昌: '劉峙 蔣鼎文 胡宗南 衛立煌 湯恩伯 薛岳', 濟南: '韓復榘', 青島: '沈鴻烈', 鄭州: '孫連仲', 武漢: '杜聿明 關麟徵 王耀武 戴安瀾 張靈甫 胡璉 宋希濂', 長沙: '方先覺 鄭洞國' },
        xibei: { 西安: '楊虎城 孫蔚如' },
        ccp: { 瑞金: '毛澤東 周恩來 朱德 彭德懷 林彪 劉伯承 葉劍英 聶榮臻 項英 陳毅 粟裕 左權 賀龍 徐向前' },
        yue: { 廣州: '陳濟棠 余漢謀' }, gui: { 南寧: '李宗仁 白崇禧 黃旭初 廖磊 李品仙' },
        chuan: { 重慶: '劉湘 王陵基 楊森', 成都: '劉文輝 鄧錫侯 田頌堯 李家鈺' }, dian: { 昆明: '龍雲 盧漢' }, ma: { 蘭州: '馬步芳 馬鴻逵 馬麒' },
        usa: US_PEOPLE,
      },
      free: { 延安: '劉志丹', 天津: '馮玉祥 吉鴻昌 馬占山', 上海: '葉挺' },
      strategists: { kmt: '何應欽', ccp: '周恩來', japan: '石原莞爾' },
      relations: vsJapan(['kmt', 'dongbei', 'song', 'ccp', 'jin', 'xibei', 'yue', 'gui', 'chuan', 'dian', 'ma']).concat([['kmt', 'ccp', 'truce', 20], ['kmt', 'dongbei', 'alliance', 24], ['dongbei', 'song', 'alliance', 24]]),
    },
    {
      id: '1936', title: '西安事變', year: 1936, month: 12, tag: '兵諫・第二次國共合作',
      desc: '紅軍長征抵達陝北，張學良的東北軍與楊虎城的西北軍奉命「剿共」，卻屢戰不利，又思念淪陷的家鄉。1936 年 12 月，蔣介石飛抵西安督戰。張學良、楊虎城決定兵諫……',
      factions: [['kmt', '國民政府', '蔣介石', '陳誠'], ['dongbei', '東北軍・西北軍', '張學良', '于學忠', '楊虎城'], ['ccp', '中共', '毛澤東', '周恩來'], ['song', '第二十九軍', '宋哲元', '張自忠'],
        ['jin', '晉綏軍', '閻錫山', '傅作義'], ['gui', '桂系', '李宗仁', '白崇禧'], ['chuan', '川軍', '劉湘', '鄧錫侯'], ['dian', '滇軍', '龍雲', '盧漢'],
        ['ma', '西北馬家', '馬步芳', '馬鴻逵'], ['japan', '日軍', '裕仁'], USA],
      npc: ['japan'], dormant: ['usa'],
      cities: Object.assign({ 瀋陽: ['japan', 60000], 長春: ['japan', 40000], 哈爾濱: ['japan', 35000], 錦州: ['japan', 60000], 承德: ['japan', 70000],
        北京: ['song', 30000], 天津: ['song', 15000], 保定: ['song', 20000], 張家口: ['song', 12000], 西安: ['dongbei', 40000], 洛陽: ['dongbei', 20000], 延安: ['ccp', 25000],
        太原: ['jin', 35000], 大同: ['jin', 15000], 包頭: ['jin', 15000],
        南京: ['kmt', 60000], 上海: ['kmt', 40000], 杭州: ['kmt', 20000], 合肥: ['kmt', 15000], 徐州: ['kmt', 30000], 鄭州: ['kmt', 25000], 武漢: ['kmt', 35000],
        南昌: ['kmt', 25000], 長沙: ['kmt', 20000], 宜昌: ['kmt', 12000], 衡陽: ['kmt', 12000], 芷江: ['kmt', 8000], 福州: ['kmt', 15000], 瑞金: ['kmt', 10000],
        濟南: ['kmt', 25000], 青島: ['kmt', 12000], 貴陽: ['kmt', 12000], 廣州: ['kmt', 30000],
        桂林: ['gui', 25000], 南寧: ['gui', 20000], 重慶: ['chuan', 30000], 成都: ['chuan', 30000], 昆明: ['dian', 30000], 蘭州: ['ma', 20000] }, ISLANDS, BURMA_LOCKED),
      people: {
        japan: { 承德: '板垣征四郎 土肥原賢二', 瀋陽: '植田謙吉 東條英機', 錦州: '石原莞爾', 沖繩: '裕仁 山本五十六' },
        dongbei: { 西安: '張學良 楊虎城 于學忠 孫蔚如', 洛陽: '萬福麟' }, song: { 北京: '宋哲元 張自忠 佟麟閣 趙登禹', 天津: '劉汝明' },
        ccp: { 延安: '毛澤東 周恩來 朱德 彭德懷 林彪 劉伯承 葉劍英 聶榮臻 賀龍 徐向前 左權' },
        jin: { 太原: '閻錫山 傅作義 商震 徐永昌' },
        kmt: { 南京: '蔣介石 宋美齡 何應欽 陳誠 戴笠 宋子文 顧祝同 汪精衛 黃紹竑 張治中 高志航 孫立人', 上海: '蔡廷鍇 謝晉元 孫元良 宋希濂 王耀武 張靈甫',
          南昌: '蔣鼎文 胡璉', 濟南: '韓復榘', 青島: '沈鴻烈', 鄭州: '衛立煌 劉峙', 徐州: '湯恩伯 孫連仲', 武漢: '薛岳 杜聿明 關麟徵 戴安瀾', 長沙: '方先覺 鄭洞國', 廣州: '余漢謀', 西安: '' },
        gui: { 南寧: '李宗仁 白崇禧 黃旭初 廖磊 李品仙' }, chuan: { 重慶: '劉湘 王陵基 楊森', 成都: '劉文輝 鄧錫侯 田頌堯 李家鈺' }, dian: { 昆明: '龍雲 盧漢' },
        ma: { 蘭州: '馬步芳 馬鴻逵' }, usa: US_PEOPLE,
      },
      free: { 上海: '陳毅 粟裕 項英 葉挺', 南京: '胡宗南', 廣州: '陳濟棠' },
      strategists: { kmt: '何應欽', ccp: '周恩來', japan: '石原莞爾' },
      relations: vsJapan(['kmt', 'dongbei', 'song', 'ccp', 'jin', 'gui', 'chuan', 'dian', 'ma']).concat([['kmt', 'ccp', 'truce', 3], ['dongbei', 'ccp', 'truce', 12]]),
    },
    {
      id: '1937', title: '七七事變', year: 1937, month: 7, tag: '盧溝橋・全面抗戰',
      desc: '1937 年 7 月 7 日夜，日軍在北平西南的盧溝橋附近演習，藉口一名士兵失蹤，要求進入宛平縣城搜查，遭到拒絕後開砲。蔣介石在廬山發表談話：「地無分南北，年無分老幼，皆有守土抗戰之責。」全面抗戰開始。',
      factions: [['kmt', '國民政府', '蔣介石', '陳誠'], ['ccp', '中共', '毛澤東', '周恩來'], ['song', '第二十九軍', '宋哲元', '張自忠'], ['jin', '晉綏軍', '閻錫山', '傅作義'],
        ['gui', '桂系', '李宗仁', '白崇禧'], ['chuan', '川軍', '劉湘', '鄧錫侯'], ['dian', '滇軍', '龍雲', '盧漢'], ['ma', '西北馬家', '馬步芳', '馬鴻逵'],
        ['japan', '日軍', '裕仁'], USA],
      npc: ['japan'], dormant: ['usa'], coop: 70,
      cities: Object.assign({ 南京: ['kmt', 50000], 上海: ['kmt', 45000], 杭州: ['kmt', 20000], 南昌: ['kmt', 20000], 武漢: ['kmt', 35000], 長沙: ['kmt', 20000],
        福州: ['kmt', 15000], 合肥: ['kmt', 15000], 徐州: ['kmt', 30000], 鄭州: ['kmt', 25000], 洛陽: ['kmt', 15000], 西安: ['kmt', 25000], 瑞金: ['kmt', 8000],
        宜昌: ['kmt', 12000], 衡陽: ['kmt', 12000], 芷江: ['kmt', 8000], 貴陽: ['kmt', 12000], 廣州: ['kmt', 30000], 濟南: ['kmt', 25000], 青島: ['kmt', 12000],
        延安: ['ccp', 25000], 北京: ['song', 30000], 天津: ['song', 15000], 保定: ['song', 20000], 張家口: ['song', 10000],
        太原: ['jin', 35000], 大同: ['jin', 15000], 包頭: ['jin', 12000], 桂林: ['gui', 25000], 南寧: ['gui', 20000],
        成都: ['chuan', 30000], 重慶: ['chuan', 30000], 昆明: ['dian', 30000], 蘭州: ['ma', 20000],
        瀋陽: ['japan', 60000], 長春: ['japan', 40000], 哈爾濱: ['japan', 35000], 錦州: ['japan', 60000], 承德: ['japan', 80000] },
        ISLANDS, { 沖繩: ['japan', 90000], 塞班: ['japan', 30000] }, BURMA_LOCKED),
      people: {
        kmt: { 南京: '蔣介石 宋美齡 何應欽 陳誠 白崇禧 戴笠 宋子文 顧祝同 陳納德', 上海: '張治中 謝晉元 孫元良 宋希濂 王耀武 張靈甫', 杭州: '高志航',
          徐州: '湯恩伯 王銘章 孫連仲', 西安: '胡宗南 杜聿明', 鄭州: '衛立煌 劉峙', 武漢: '薛岳 孫立人 關麟徵', 長沙: '鄭洞國 方先覺',
          南昌: '蔣鼎文 胡璉', 濟南: '韓復榘', 青島: '沈鴻烈', 廣州: '余漢謀 戴安瀾', 洛陽: '孫蔚如', 合肥: '于學忠 萬福麟' },
        ccp: { 延安: '毛澤東 周恩來 朱德 彭德懷 劉伯承 林彪 賀龍 聶榮臻 徐向前 葉劍英 左權' },
        song: { 北京: '宋哲元 張自忠 佟麟閣 趙登禹', 天津: '劉汝明', 保定: '吉鴻昌' },
        jin: { 太原: '閻錫山 傅作義 商震 徐永昌' }, gui: { 桂林: '李宗仁 廖磊 李品仙', 南寧: '黃旭初 黃紹竑' },
        chuan: { 重慶: '劉湘 王陵基 楊森', 成都: '鄧錫侯 劉文輝 李家鈺 田頌堯' }, dian: { 昆明: '龍雲 盧漢 范石生' }, ma: { 蘭州: '馬步芳 馬鴻逵' },
        usa: { 列多: '羅斯福 史迪威 魏德邁 麥克阿瑟 尼米茲' },
        japan: { 承德: '香月清司 板垣征四郎 土肥原賢二', 瀋陽: '植田謙吉 東條英機', 錦州: '磯谷廉介', 哈爾濱: '寺內壽一', 沖繩: '裕仁 松井石根 谷壽夫 中島今朝吾 山本五十六' },
      },
      free: { 上海: '陳毅 粟裕 項英 葉挺' },
      loyalty: { 韓復榘: 50 },
      strategists: { kmt: '白崇禧', ccp: '周恩來', japan: '石原莞爾' },
      relations: vsJapan(['kmt', 'song', 'jin', 'ccp', 'gui', 'chuan', 'dian', 'ma']).concat([
        ['kmt', 'ccp', 'alliance', 48], ['kmt', 'song', 'alliance', 48], ['kmt', 'jin', 'alliance', 48], ['kmt', 'gui', 'alliance', 48],
        ['kmt', 'chuan', 'alliance', 48], ['kmt', 'dian', 'alliance', 48], ['kmt', 'ma', 'alliance', 48], ['ccp', 'jin', 'alliance', 36]]),
    },
    {
      id: '1938', title: '台兒莊與武漢', year: 1938, month: 3, tag: '台兒莊大捷・花園口・武漢會戰',
      desc: '南京失守後，國民政府移駐武漢。日軍南北夾擊，要打通津浦鐵路、會師徐州。李宗仁坐鎮徐州，在台兒莊布下口袋陣。武漢、廣州也將是下一個目標。',
      factions: [['kmt', '國民政府', '蔣介石', '陳誠'], ['gui', '桂系・第五戰區', '李宗仁', '白崇禧'], ['ccp', '中共', '毛澤東', '周恩來'], ['jin', '晉綏軍', '閻錫山', '傅作義'],
        ['chuan', '川軍', '鄧錫侯', '劉文輝'], ['dian', '滇軍', '龍雲', '盧漢'], ['ma', '西北馬家', '馬步芳', '馬鴻逵'], ['japan', '日軍', '裕仁'], USA],
      npc: ['japan'], dormant: ['usa'], coop: 65,
      cities: Object.assign({ 瀋陽: ['japan', 50000], 長春: ['japan', 30000], 哈爾濱: ['japan', 30000], 錦州: ['japan', 30000], 承德: ['japan', 25000],
        北京: ['japan', 50000], 天津: ['japan', 40000], 保定: ['japan', 40000], 張家口: ['japan', 20000], 大同: ['japan', 25000], 太原: ['japan', 40000],
        濟南: ['japan', 60000], 青島: ['japan', 20000], 上海: ['japan', 50000], 南京: ['japan', 70000], 杭州: ['japan', 30000], 金門: ['japan', 10000],
        徐州: ['gui', 60000], 桂林: ['gui', 25000], 南寧: ['gui', 20000], 包頭: ['jin', 20000], 延安: ['ccp', 35000],
        合肥: ['kmt', 25000], 鄭州: ['kmt', 35000], 洛陽: ['kmt', 20000], 西安: ['kmt', 30000], 武漢: ['kmt', 60000], 南昌: ['kmt', 30000], 長沙: ['kmt', 30000],
        宜昌: ['kmt', 15000], 衡陽: ['kmt', 15000], 芷江: ['kmt', 10000], 福州: ['kmt', 15000], 瑞金: ['kmt', 8000], 廣州: ['kmt', 30000], 貴陽: ['kmt', 12000],
        重慶: ['chuan', 30000], 成都: ['chuan', 30000], 昆明: ['dian', 30000], 蘭州: ['ma', 20000] }, ISLANDS, BURMA_LOCKED),
      people: {
        japan: { 北京: '寺內壽一 板垣征四郎', 濟南: '磯谷廉介', 南京: '畑俊六 中島今朝吾', 上海: '岡村寧次', 瀋陽: '植田謙吉', 太原: '土肥原賢二', 天津: '香月清司', 沖繩: '裕仁 東條英機 山本五十六' },
        kmt: { 武漢: '蔣介石 宋美齡 何應欽 陳誠 戴笠 宋子文 顧祝同 汪精衛 張治中 陳納德', 合肥: '張自忠 劉汝明', 鄭州: '衛立煌 劉峙 宋哲元', 西安: '胡宗南',
          南昌: '薛岳 王耀武 張靈甫', 長沙: '方先覺 鄭洞國 杜聿明 戴安瀾 孫立人', 廣州: '余漢謀', 宜昌: '胡璉 宋希濂', 衡陽: '孫元良', 洛陽: '孫蔚如 于學忠 萬福麟' },
        gui: { 徐州: '李宗仁 白崇禧 孫連仲 湯恩伯', 桂林: '黃旭初 廖磊 李品仙 黃紹竑' },
        ccp: { 延安: '毛澤東 周恩來 朱德 彭德懷 劉伯承 林彪 賀龍 聶榮臻 徐向前 葉劍英 左權 葉挺 項英 陳毅 粟裕' },
        jin: { 包頭: '閻錫山 傅作義 商震 徐永昌' }, chuan: { 成都: '鄧錫侯 劉文輝 李家鈺 田頌堯', 重慶: '王陵基 楊森' }, dian: { 昆明: '龍雲 盧漢' },
        ma: { 蘭州: '馬步芳 馬鴻逵' }, usa: US_PEOPLE,
      },
      free: {},
      strategists: { kmt: '何應欽', gui: '白崇禧', ccp: '周恩來', japan: '板垣征四郎' },
      relations: vsJapan(['kmt', 'gui', 'ccp', 'jin', 'chuan', 'dian', 'ma']).concat([['kmt', 'ccp', 'alliance', 48], ['kmt', 'gui', 'alliance', 48], ['kmt', 'jin', 'alliance', 48],
        ['kmt', 'chuan', 'alliance', 48], ['kmt', 'dian', 'alliance', 48], ['kmt', 'ma', 'alliance', 48], ['gui', 'ccp', 'alliance', 36], ['jin', 'ccp', 'alliance', 36]]),
    },
    {
      id: '1940', title: '相持階段', year: 1940, month: 5, tag: '棗宜會戰・百團大戰・皖南事變',
      desc: '武漢、廣州失守後，國民政府退守重慶，日軍則困於廣大的佔領區。汪精衛在南京另立政權。正面戰場與敵後游擊並行，國共之間的摩擦卻也日益加深。',
      factions: [['kmt', '國民政府', '蔣介石', '陳誠'], ['ccp', '中共', '毛澤東', '周恩來'], ['gui', '桂系', '李宗仁', '白崇禧'], ['jin', '晉綏軍', '閻錫山', '傅作義'],
        ['chuan', '川軍', '鄧錫侯', '劉文輝'], ['dian', '滇軍', '龍雲', '盧漢'], ['ma', '西北馬家', '馬步芳', '馬鴻逵'], ['japan', '日軍', '裕仁'], USA],
      npc: ['japan'], dormant: ['usa'], coop: 50,
      cities: Object.assign({ 瀋陽: ['japan', 50000], 長春: ['japan', 30000], 哈爾濱: ['japan', 30000], 錦州: ['japan', 25000], 承德: ['japan', 20000],
        北京: ['japan', 50000], 天津: ['japan', 30000], 保定: ['japan', 30000], 張家口: ['japan', 20000], 大同: ['japan', 20000], 太原: ['japan', 40000],
        濟南: ['japan', 40000], 青島: ['japan', 20000], 徐州: ['japan', 40000], 合肥: ['japan', 30000], 上海: ['japan', 40000], 南京: ['japan', 50000], 杭州: ['japan', 25000],
        南昌: ['japan', 35000], 金門: ['japan', 10000], 武漢: ['japan', 70000], 廣州: ['japan', 45000], 南寧: ['japan', 25000],
        重慶: ['kmt', 60000], 西安: ['kmt', 40000], 洛陽: ['kmt', 35000], 鄭州: ['kmt', 30000], 長沙: ['kmt', 50000], 衡陽: ['kmt', 25000], 芷江: ['kmt', 15000],
        貴陽: ['kmt', 25000], 福州: ['kmt', 15000], 瑞金: ['kmt', 10000], 宜昌: ['kmt', 35000],
        桂林: ['gui', 35000], 包頭: ['jin', 25000], 延安: ['ccp', 50000], 成都: ['chuan', 35000], 昆明: ['dian', 35000], 蘭州: ['ma', 20000] }, ISLANDS, BURMA_LOCKED),
      people: {
        japan: { 南京: '畑俊六', 北京: '岡村寧次', 武漢: '阿南惟幾', 廣州: '安藤利吉', 瀋陽: '梅津美治郎', 沖繩: '裕仁 東條英機 山本五十六' },
        kmt: { 重慶: '蔣介石 宋美齡 何應欽 陳誠 戴笠 宋子文 顧祝同 張治中 陳納德', 宜昌: '張自忠 胡璉 宋希濂', 長沙: '薛岳 王耀武 張靈甫 方先覺', 西安: '胡宗南',
          洛陽: '衛立煌 湯恩伯 孫連仲', 鄭州: '劉峙 劉汝明', 貴陽: '杜聿明 戴安瀾 鄭洞國 孫立人', 芷江: '孫元良', 福州: '蔣鼎文', 衡陽: '余漢謀' },
        gui: { 桂林: '李宗仁 白崇禧 黃旭初 廖磊 李品仙' },
        ccp: { 延安: '毛澤東 周恩來 朱德 彭德懷 劉伯承 林彪 賀龍 聶榮臻 徐向前 葉劍英 左權 葉挺 項英 陳毅 粟裕' },
        jin: { 包頭: '閻錫山 傅作義 商震 徐永昌' }, chuan: { 成都: '鄧錫侯 劉文輝 王陵基 楊森 李家鈺 田頌堯' }, dian: { 昆明: '龍雲 盧漢' },
        ma: { 蘭州: '馬步芳 馬鴻逵' }, usa: US_PEOPLE,
      },
      free: {},
      strategists: { kmt: '白崇禧', ccp: '周恩來', japan: '東條英機' },
      relations: vsJapan(['kmt', 'gui', 'ccp', 'jin', 'chuan', 'dian', 'ma']).concat([['kmt', 'ccp', 'alliance', 24], ['kmt', 'gui', 'alliance', 48], ['kmt', 'jin', 'alliance', 48],
        ['kmt', 'chuan', 'alliance', 48], ['kmt', 'dian', 'alliance', 48], ['kmt', 'ma', 'alliance', 48]]),
    },
    {
      id: '1944', title: '反攻', year: 1944, month: 4, tag: '豫湘桂・滇緬反攻・日本投降',
      desc: '太平洋戰爭進入第三年，美軍節節進逼。日軍在中國發動規模最大的「一號作戰」，想打通從華北到越南的大陸交通線；中國遠征軍與美軍則在滇緬發動反攻。勝利已在望，但最後一段路最艱難。',
      factions: [['kmt', '國民政府', '蔣介石', '陳誠'], USA, ['ccp', '中共', '毛澤東', '周恩來'], ['gui', '桂系', '李宗仁', '白崇禧'], ['jin', '晉綏軍', '閻錫山', '傅作義'],
        ['chuan', '川軍', '鄧錫侯', '劉文輝'], ['dian', '滇軍', '龍雲', '盧漢'], ['ma', '西北馬家', '馬步芳', '馬鴻逵'], ['japan', '日軍', '裕仁']],
      npc: ['japan'], coop: 35,
      cities: Object.assign({ 瀋陽: ['japan', 50000], 長春: ['japan', 30000], 哈爾濱: ['japan', 30000], 錦州: ['japan', 25000], 承德: ['japan', 20000],
        北京: ['japan', 50000], 天津: ['japan', 30000], 保定: ['japan', 30000], 張家口: ['japan', 20000], 大同: ['japan', 20000], 太原: ['japan', 40000],
        濟南: ['japan', 40000], 青島: ['japan', 20000], 徐州: ['japan', 40000], 合肥: ['japan', 30000], 上海: ['japan', 40000], 南京: ['japan', 50000], 杭州: ['japan', 25000],
        南昌: ['japan', 35000], 金門: ['japan', 10000], 武漢: ['japan', 90000], 廣州: ['japan', 45000], 南寧: ['japan', 25000], 宜昌: ['japan', 35000],
        重慶: ['kmt', 60000], 西安: ['kmt', 40000], 洛陽: ['kmt', 35000], 鄭州: ['kmt', 30000], 長沙: ['kmt', 45000], 衡陽: ['kmt', 25000], 芷江: ['kmt', 25000],
        貴陽: ['kmt', 25000], 福州: ['kmt', 15000], 瑞金: ['kmt', 10000],
        桂林: ['gui', 35000], 包頭: ['jin', 25000], 延安: ['ccp', 60000], 成都: ['chuan', 35000], 昆明: ['dian', 35000], 蘭州: ['ma', 20000] },
        ISLANDS, { 臘戌: ['japan', 40000, { locked: false }], 列多: ['usa', 60000, { locked: false }], 香港: ['japan', 20000, { locked: false }] }),
      people: {
        japan: { 南京: '岡村寧次', 武漢: '橫山勇', 北京: '畑俊六', 臘戌: '河邊正三 牟田口廉也', 瀋陽: '山田乙三', 臺北: '安藤利吉', 臺南: '山下奉文', 沖繩: '裕仁 東條英機 牛島滿' },
        kmt: { 重慶: '蔣介石 宋美齡 何應欽 陳誠 戴笠 宋子文 顧祝同 張治中', 長沙: '薛岳 王耀武 張靈甫', 衡陽: '方先覺', 西安: '胡宗南', 洛陽: '湯恩伯 劉峙',
          鄭州: '孫連仲 劉汝明', 芷江: '胡璉 宋希濂 孫立人', 貴陽: '杜聿明 鄭洞國 衛立煌', 福州: '蔣鼎文 孫元良' },
        usa: { 列多: '羅斯福 史迪威 陳納德 魏德邁 麥克阿瑟 尼米茲' },
        gui: { 桂林: '李宗仁 白崇禧 黃旭初 李品仙' },
        ccp: { 延安: '毛澤東 周恩來 朱德 彭德懷 劉伯承 林彪 賀龍 聶榮臻 徐向前 葉劍英 陳毅 粟裕' },
        jin: { 包頭: '閻錫山 傅作義 商震 徐永昌' }, chuan: { 成都: '鄧錫侯 劉文輝 王陵基 楊森 李家鈺 田頌堯' }, dian: { 昆明: '龍雲 盧漢' },
        ma: { 蘭州: '馬步芳 馬鴻逵' },
      },
      free: {},
      strategists: { kmt: '何應欽', usa: '魏德邁', ccp: '周恩來', japan: '東條英機' },
      relations: vsJapan(['kmt', 'gui', 'ccp', 'jin', 'chuan', 'dian', 'ma']).concat([['usa', 'japan', 'war'], ['usa', 'kmt', 'alliance', 48], ['usa', 'ccp', 'alliance', 48],
        ['kmt', 'ccp', 'alliance', 24], ['kmt', 'gui', 'alliance', 48], ['kmt', 'jin', 'alliance', 48], ['kmt', 'chuan', 'alliance', 48], ['kmt', 'dian', 'alliance', 48], ['kmt', 'ma', 'alliance', 48]]),
    },
    {
      id: '1946', title: '國共內戰', year: 1946, month: 6, tag: '遼瀋・淮海・平津・古寧頭', civil: true,
      desc: '抗戰勝利不到一年，重慶談判與停戰協定相繼破裂。國民政府握有大城、交通線與美式裝備；中共在東北與華北農村擁有根據地與民心。1946 年 6 月，全面內戰爆發。',
      factions: [['kmt', '國民政府', '蔣介石', '陳誠'], ['ccp', '中共', '毛澤東', '周恩來'], ['jin', '晉綏軍', '閻錫山', '徐永昌'],
        ['ma', '西北馬家', '馬步芳', '馬鴻逵'], ['dian', '雲南', '盧漢']],
      coop: null,
      cities: { 南京: ['kmt', 80000], 上海: ['kmt', 60000], 杭州: ['kmt', 30000], 合肥: ['kmt', 30000], 徐州: ['kmt', 80000], 濟南: ['kmt', 60000], 青島: ['kmt', 30000],
        鄭州: ['kmt', 50000], 洛陽: ['kmt', 30000], 西安: ['kmt', 70000], 武漢: ['kmt', 60000], 宜昌: ['kmt', 20000], 長沙: ['kmt', 40000], 衡陽: ['kmt', 20000],
        芷江: ['kmt', 15000], 南昌: ['kmt', 30000], 福州: ['kmt', 25000], 瑞金: ['kmt', 10000], 廣州: ['kmt', 50000], 桂林: ['kmt', 30000], 南寧: ['kmt', 20000],
        重慶: ['kmt', 50000], 成都: ['kmt', 40000], 貴陽: ['kmt', 20000], 北京: ['kmt', 60000], 天津: ['kmt', 50000], 保定: ['kmt', 30000],
        瀋陽: ['kmt', 90000], 長春: ['kmt', 50000], 錦州: ['kmt', 50000], 包頭: ['kmt', 30000], 臺北: ['kmt', 30000], 臺南: ['kmt', 20000], 金門: ['kmt', 10000],
        延安: ['ccp', 60000], 哈爾濱: ['ccp', 150000], 張家口: ['ccp', 60000], 承德: ['ccp', 50000], 大同: ['ccp', 30000],
        太原: ['jin', 60000], 蘭州: ['ma', 40000], 昆明: ['dian', 40000],
        沖繩: [null, 6000, { locked: true }], 塞班: [null, 6000, { locked: true }] },
      people: {
        kmt: { 南京: '蔣介石 宋美齡 陳誠 何應欽 顧祝同 宋子文 張治中', 徐州: '薛岳 黃百韜 邱清泉 劉峙', 濟南: '王耀武', 瀋陽: '杜聿明 廖耀湘 孫立人 衛立煌',
          長春: '鄭洞國 曾澤生', 錦州: '范漢傑', 北京: '李宗仁 孫連仲', 包頭: '傅作義', 西安: '胡宗南', 武漢: '白崇禧 黃維 李品仙', 上海: '湯恩伯 張靈甫',
          長沙: '程潛', 廣州: '余漢謀', 重慶: '王陵基 楊森', 成都: '劉文輝 鄧錫侯', 鄭州: '宋希濂', 南昌: '胡璉 方先覺', 福州: '李良榮 高魁元', 臺北: '黃旭初' },
        ccp: { 延安: '毛澤東 周恩來 朱德 劉少奇 彭德懷 賀龍', 哈爾濱: '林彪 羅榮桓', 張家口: '聶榮臻 徐向前 葉劍英', 承德: '劉伯承 鄧小平 陳賡', 大同: '陳毅 粟裕 許世友 葉飛' },
        jin: { 太原: '閻錫山 徐永昌 商震' }, ma: { 蘭州: '馬步芳 馬鴻逵' }, dian: { 昆明: '盧漢 龍雲' },
      },
      free: {},
      strategists: { kmt: '白崇禧', ccp: '周恩來' },
      relations: [['kmt', 'ccp', 'war'], ['kmt', 'jin', 'alliance', 48], ['kmt', 'ma', 'alliance', 48], ['kmt', 'dian', 'alliance', 48], ['ccp', 'jin', 'war']],
    },
  ];

  /* 歷史事件庫：每個劇本自動帶入「開局當月以後」的事件（歷史劇本模式才發生）。
   * until 限定在史實前後，晚開局或劇情走向不同時就不會發生。 */
  const LIB = [
    {
      id: 'mukden', title: '九一八事變', scene: 'night',
      cond: { from: [1931, 9], until: [1931, 10], alive: ['japan'] },
      effects: [{ do: 'loyalty', faction: 'dongbei', amount: -5 }, { do: 'seize', city: '長春', faction: 'japan', if_owner: 'dongbei' }, { do: 'troops_scale', city: '長春', mult: 0.5 }, { do: 'troops', city: '長春', unit: 'inf', amount: 25000, if_owner: 'japan' }],
      lines: [['', '9 月 18 日深夜，柳條湖附近的鐵路發生爆炸。關東軍反誣中國軍隊破壞，隨即砲轟北大營、攻入瀋陽。'],
        ['張學良', '（在北平）……避免衝突，交由國聯處理。'], ['', '不到半年，東北三省相繼淪陷，三千萬同胞淪於日軍統治之下。']],
    },
    {
      id: 'jiangqiao', title: '江橋抗戰', scene: 'field',
      cond: { from: [1931, 11], until: [1932, 1], general_faction: { 馬占山: 'dongbei' } },
      effects: [{ do: 'loyalty', faction: 'dongbei', amount: 10 }],
      lines: [['馬占山', '守土有責，我軍不退！'], ['', '黑龍江代理主席馬占山在嫩江橋率部抵抗日軍，是九一八事變後第一場有組織的抵抗，舉國振奮。']],
    },
    {
      id: 'jinzhou', title: '錦州失守', scene: 'field',
      cond: { from: [1932, 1], until: [1932, 3], alive: ['japan'] },
      effects: [{ do: 'seize', city: '錦州', faction: 'japan', if_owner: 'dongbei' }, { do: 'troops_scale', city: '錦州', mult: 0.5 }, { do: 'troops', city: '錦州', unit: 'inf', amount: 25000, if_owner: 'japan' }],
      lines: [['', '東北軍奉命撤入關內，日軍佔領遼西重鎮錦州。']],
    },
    {
      id: 'harbin', title: '哈爾濱淪陷', scene: 'field',
      cond: { from: [1932, 2], until: [1932, 4], alive: ['japan'] },
      effects: [{ do: 'seize', city: '哈爾濱', faction: 'japan', if_owner: 'dongbei' }, { do: 'troops_scale', city: '哈爾濱', mult: 0.5 }, { do: 'troops', city: '哈爾濱', unit: 'inf', amount: 25000, if_owner: 'japan' }],
      lines: [['', '日軍攻入哈爾濱，東北三省全部淪陷。'], ['', '各地的東北義勇軍仍在白山黑水間堅持抵抗。']],
    },
    {
      id: 'yierba', title: '一二八淞滬抗戰', scene: 'fire',
      cond: { from: [1932, 1], until: [1932, 3], alive: ['kmt', 'japan'], owns: { kmt: ['上海'] } },
      effects: [{ do: 'loyalty', faction: 'kmt', amount: 5 }, { do: 'troops_scale', city: '上海', mult: 0.85 }],
      lines: [['', '1932 年 1 月 28 日夜，日軍進攻上海閘北。'], ['蔡廷鍇', '十九路軍守土有責，誓與上海共存亡！'],
        ['', '第十九路軍與第五軍苦戰一個多月，日軍數度增兵、三易主帥。5 月雙方簽訂停戰協定。']],
    },
    {
      id: 'manchukuo', title: '偽滿洲國', scene: 'palace',
      cond: { from: [1932, 3], until: [1932, 6], owns: { japan: ['長春'] } },
      effects: [],
      lines: [['', '日本在長春扶植清遜帝溥儀，成立「滿洲國」，以掩飾對東北的佔領。'], ['', '國際聯盟的李頓調查團隨後認定此舉違反國際條約，日本憤而退出國聯。']],
    },
    {
      id: 'rehe', title: '熱河失守', scene: 'field',
      cond: { from: [1933, 3], until: [1933, 6], alive: ['japan'], city_owner_not: { 承德: 'japan' } },
      effects: [{ do: 'seize', city: '承德', faction: 'japan' }, { do: 'troops_scale', city: '承德', mult: 0.5 }, { do: 'troops', city: '承德', unit: 'inf', amount: 30000, if_owner: 'japan' }, { do: 'loyalty', faction: 'dongbei', amount: -10 }],
      lines: [['', '日軍以一百多名騎兵先頭部隊長驅直入，熱河省主席棄城而走，承德不戰而失。'], ['', '全國輿論譁然，張學良引咎辭職，出國考察。']],
    },
    {
      id: 'xifengkou', title: '喜峰口大刀隊', scene: 'night',
      cond: { from: [1933, 3], until: [1933, 5], general_faction: { 宋哲元: 'song' } },
      effects: [{ do: 'loyalty', faction: 'song', amount: 10 }],
      lines: [['趙登禹', '槍砲不如人，就趁夜摸進敵營，用大刀砍！'], ['', '第二十九軍大刀隊夜襲喜峰口外的日軍砲兵陣地，消息傳開，《大刀進行曲》傳唱全國。']],
    },
    {
      id: 'changzheng', title: '長征', scene: 'field',
      cond: { from: [1934, 10], until: [1935, 10], alive: ['ccp'], owns: { ccp: ['瑞金'] } },
      effects: [{ do: 'seize', city: '延安', faction: 'ccp' }, { do: 'troops_scale', city: '延安', mult: 0.3 }, { do: 'troops', city: '延安', unit: 'inf', amount: 20000 },
        { do: 'gather', faction: 'ccp', city: '延安' }, { do: 'seize', city: '瑞金', faction: 'kmt' }, { do: 'troops_scale', city: '瑞金', mult: 0.3 },
        { do: 'relation', a: 'kmt', b: 'ccp', state: 'truce', months: 30 }],
      lines: [['', '第五次「圍剿」失利後，中央紅軍撤出江西瑞金，開始長征。'], ['毛澤東', '（遵義會議後）紅軍是播種機……'],
        ['', '一年間轉戰十一省、行程兩萬多里，抵達陝北時只剩數千人。']],
    },
    {
      id: 'yierjiu', title: '一二九運動', scene: 'palace',
      cond: { from: [1935, 12], until: [1936, 1] },
      effects: [{ do: 'city_add', city: '北京', field: 'order', amount: -10 }],
      lines: [['', '日本策動「華北自治」，北平學生走上街頭。'], ['', '「華北之大，已經安放不得一張平靜的書桌了！」']],
    },
    {
      id: 'xian', title: '西安事變', scene: 'night',
      cond: { from: [1936, 12], until: [1937, 2], alive: ['kmt', 'dongbei'], general_faction: { 張學良: 'dongbei' } },
      chooser: 'dongbei', aiChoice: 0,
      lines: [['', '1936 年 12 月 12 日凌晨，張學良、楊虎城發動兵諫，在華清池扣留了前來督戰的蔣介石。'],
        ['張學良', '停止內戰，一致抗日——這是我們唯一的要求。'], ['楊虎城', '人已經扣下了，接下來怎麼辦？'], ['', '宋美齡、宋子文、周恩來先後抵達西安，展開談判。']],
      choices: [
        { label: '和平解決，聯合抗日', desc: '釋放蔣介石，國共停止內戰（國共合作度 60）；張學良親送蔣介石回南京，此後遭長期軟禁',
          effects: [{ do: 'coop', set: 60 }, { do: 'relation', a: 'kmt', b: 'ccp', state: 'alliance', months: 48 }, { do: 'relation', a: 'kmt', b: 'dongbei', state: 'alliance', months: 48 },
            { do: 'relation', a: 'dongbei', b: 'ccp', state: 'alliance', months: 48 }, { do: 'united_front' }, { do: 'retire', general: '張學良' }],
          lines: [['張學良', '我陪委員長回南京，一切責任由我承擔。'], ['', '西安事變和平解決，內戰停止，第二次國共合作逐步成形。'],
            ['', '張學良抵達南京後隨即遭到軟禁，此後半個多世紀失去自由。']] },
        { label: '堅持兵諫，不放人', desc: '（改寫歷史）談判破裂，東北軍、西北軍與國民政府開戰，國共合作不會出現',
          effects: [{ do: 'relation', a: 'kmt', b: 'dongbei', state: 'war' }, { do: 'loyalty', faction: 'kmt', amount: -10 }],
          lines: [['', '談判破裂。南京方面調集大軍準備討伐西安，內戰一觸即發……'], ['', '遠在東北的日軍，冷眼看著這一切。']] },
      ],
    },
        {
          id: 'lugouqiao', title: '盧溝橋事變', scene: 'night',
          cond: { from: [1937, 7], until: [1937, 8], alive: ['japan'] },
          effects: [{ do: 'loyalty', faction: 'song', amount: 10 }, { do: 'united_front' }],
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
          cond: { from: [1937, 8], until: [1937, 10], alive: ['song', 'japan'], general_faction: { 佟麟閣: 'song' } },
          effects: [{ do: 'die', general: '佟麟閣' }, { do: 'troops_scale', city: '北京', mult: 0.6 }],
          lines: [['', '日軍集中飛機、大砲猛攻北平南苑。'], ['', '第二十九軍副軍長佟麟閣、師長趙登禹相繼殉國，北平、天津先後失守。']],
        },
        {
          id: 'songhu', title: '淞滬會戰', scene: 'fire',
          cond: { from: [1937, 8], until: [1937, 11], alive: ['kmt', 'japan'], owns: { kmt: ['上海'] } },
          effects: [{ do: 'relation', a: 'japan', b: 'kmt', state: 'war' }],
          lines: [['', '8 月 13 日，戰火燒到上海。國軍精銳逐次投入，與日軍在市區與郊外反覆爭奪。'],
            ['張治中', '把日軍趕下黃浦江！'], ['', '這場會戰持續三個月，打破了日方「三個月滅亡中國」的盤算。']],
        },
        {
          id: 'sihang', title: '四行倉庫', scene: 'night',
          cond: { from: [1937, 10], until: [1937, 12], alive: ['kmt'], general_faction: { 謝晉元: 'kmt' } },
          effects: [{ do: 'loyalty', faction: 'kmt', amount: 8 }],
          lines: [['', '國軍撤出上海之際，謝晉元率領約四百名官兵留守蘇州河北岸的四行倉庫。'],
            ['謝晉元', '我們的身後就是租界，全世界都在看著。'], ['', '女童軍楊惠敏冒險送來一面國旗，倉庫頂上升起青天白日旗，對岸的上海市民歡聲雷動。']],
        },
        {
          id: 'pingxingguan', title: '平型關', scene: 'field',
          cond: { from: [1937, 9], until: [1937, 12], alive: ['ccp', 'japan'], general_faction: { 林彪: 'ccp' } },
          effects: [{ do: 'loyalty', faction: 'ccp', amount: 10 }],
          lines: [['', '紅軍改編為國民革命軍第八路軍，開赴山西前線。'],
            ['林彪', '日軍輜重部隊會經過平型關的山溝，我們在兩側高地設伏。'], ['', '八路軍第一一五師伏擊日軍後勤部隊，是全面抗戰以來的一次重要勝仗。']],
        },
        {
          id: 'xinsijun', title: '新四軍成立', scene: 'camp',
          cond: { from: [1937, 10], until: [1938, 3], alive: ['ccp'] },
          effects: ['葉挺', '項英', '陳毅', '粟裕'].map((g) => ({ do: 'join', general: g, faction: 'ccp', force: true })).concat([{ do: 'coop', amount: 5 }]),
          lines: [['', '南方各省的紅軍游擊隊改編為國民革命軍新編第四軍，由葉挺任軍長、項英任副軍長。'],
            ['陳毅', '大江南北，到處都是我們的游擊區。']],
        },
        {
          id: 'nanjing_falls', title: '南京失守', scene: 'night',
          cond: { from: [1937, 12], until: [1938, 6], alive: ['kmt', 'japan'], owns: { japan: ['南京'] } },
          effects: [{ do: 'city_add', city: '南京', field: 'order', amount: -30 }, { do: 'loyalty', faction: 'kmt', amount: 5 }],
          lines: [['', '12 月，日軍攻向首都南京，國民政府宣布遷都重慶，長期抗戰。'],
            ['', '南京失陷後，日軍在城內外對放下武器的士兵與平民進行大規模屠殺，死難者數以十萬計。'],
            ['', '這段歷史至今仍被銘記。']],
        },
        {
          id: 'wuhan_falls', title: '武漢會戰', scene: 'river',
          cond: { from: [1938, 10], until: [1939, 6], alive: ['japan'], owns: { japan: ['武漢'] } },
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
          id: 'hongkong', title: '香港淪陷', scene: 'fire',
          cond: { from: [1941, 12], until: [1942, 2], alive: ['japan'], after: ['pearl_harbor'] },
          effects: [{ do: 'unlock', city: '香港' }, { do: 'seize', city: '香港', faction: 'japan' }, { do: 'troops', city: '香港', unit: 'inf', amount: 20000, if_owner: 'japan' }],
          lines: [['', '珍珠港事件同一天，日軍從廣州方向進攻英屬香港。'], ['', '守軍苦戰十八天後投降，香港進入「三年零八個月」的日佔時期。']],
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
    {
      id: 'quanmian', title: '日軍大舉增兵', scene: 'river',
      cond: { from: [1937, 7], until: [1937, 9], alive: ['japan'], before_scenario: 1937 },
      effects: [{ do: 'troops', city: '承德', unit: 'inf', amount: 60000, if_owner: 'japan' }, { do: 'troops', city: '承德', unit: 'tank', amount: 10000, if_owner: 'japan' },
        { do: 'troops', city: '錦州', unit: 'inf', amount: 40000, if_owner: 'japan' }, { do: 'troops', city: '沖繩', unit: 'inf', amount: 50000, if_owner: 'japan' },
        { do: 'troops', city: '沖繩', unit: 'navy', amount: 20000, if_owner: 'japan' }],
      lines: [['', '盧溝橋的槍聲之後，日本內閣決定向華北、上海大舉增兵。'], ['', '數十萬日軍經由東北與海路源源而來，全面侵華戰爭開始了。']],
    },
    {
      id: 'liuxiang_dies', title: '劉湘病逝', scene: 'palace',
      cond: { from: [1938, 1], until: [1938, 3], general_faction: { 劉湘: 'chuan' } },
      effects: [{ do: 'die', general: '劉湘' }],
      lines: [['', '率川軍出川抗戰的劉湘在漢口病逝。'], ['劉湘', '（遺言）抗戰到底，始終不渝。']],
    },
    {
      id: 'taierzhuang', title: '台兒莊大捷', scene: 'fire',
      cond: { from: [1938, 3], until: [1938, 5], alive: ['japan'], city_owner_not: { 徐州: 'japan' } },
      effects: [{ do: 'troops_scale', city: '濟南', mult: 0.8, if_owner: 'japan' }, { do: 'loyalty', faction: 'gui', amount: 10 }, { do: 'loyalty', faction: 'kmt', amount: 5 }],
      lines: [['李宗仁', '放日軍進來台兒莊，再從外圍合圍。'], ['孫連仲', '台兒莊守軍打到只剩一營，也絕不後退！'],
        ['', '湯恩伯軍團從外線包抄，日軍兩個師團的精銳在台兒莊遭到重創。這是全面抗戰以來的第一場大捷。']],
    },
    {
      id: 'huayuankou', title: '花園口決堤', scene: 'rain',
      cond: { from: [1938, 6], until: [1938, 9], alive: ['kmt', 'japan'], city_owner_not: { 鄭州: 'japan' } },
      chooser: 'kmt', aiChoice: 0,
      lines: [['', '1938 年 6 月，開封失守，日軍機械化部隊沿隴海鐵路西進，鄭州危急。'], ['', '有人提議：掘開黃河花園口大堤，以洪水阻擋日軍。']],
      choices: [
        { label: '掘堤阻敵', desc: '日軍西進受阻；但黃河改道，鄭州一帶農業、人口與民心大減，數十萬民眾罹難',
          effects: [{ do: 'troops_scale', city: '徐州', mult: 0.75, if_owner: 'japan' }, { do: 'troops_scale', city: '合肥', mult: 0.85, if_owner: 'japan' },
            { do: 'city_scale', city: '鄭州', field: 'farm', mult: 0.5 }, { do: 'city_scale', city: '鄭州', field: 'pop', mult: 0.75 }, { do: 'city_add', city: '鄭州', field: 'order', amount: -30 }],
          lines: [['', '6 月 9 日，花園口大堤被掘開。黃河改道南流，日軍西進受阻。'],
            ['', '洪水淹沒豫、皖、蘇三省四十多個縣，數十萬民眾罹難，上千萬人流離失所。黃泛區的傷痕，要很多年才能平復。']] },
        { label: '不掘堤', desc: '保住豫東百姓；日軍增兵西進，鄭州與武漢的壓力大增',
          effects: [{ do: 'troops', city: '徐州', unit: 'inf', amount: 30000, if_owner: 'japan' }, { do: 'troops', city: '合肥', unit: 'tank', amount: 8000, if_owner: 'japan' }],
          lines: [['', '黃河大堤得以保全。日軍增兵沿隴海、平漢鐵路推進，中原戰況吃緊。']] },
      ],
    },
    {
      id: 'changsha_fire', title: '長沙大火', scene: 'fire',
      cond: { from: [1938, 11], until: [1939, 1], owns: { kmt: ['長沙'] } },
      effects: [{ do: 'city_scale', city: '長沙', field: 'commerce', mult: 0.6 }, { do: 'city_scale', city: '長沙', field: 'pop', mult: 0.85 }],
      lines: [['', '武漢失守後，長沙城內誤傳日軍將至，守軍執行「焦土抗戰」計畫，提前縱火。'], ['', '大火燒了三天兩夜，全城大半被毀，事後追究，三名官員被處決。']],
    },
    {
      id: 'wang_regime', title: '汪精衛政權', scene: 'palace',
      cond: { from: [1940, 3], until: [1940, 6], alive: ['japan'] },
      effects: [{ do: 'loyalty', faction: 'kmt', amount: -3 }],
      lines: [['', '1940 年 3 月，汪精衛在日本扶植下於南京成立政權，與重慶的國民政府分庭抗禮。'], ['', '重慶方面明令通緝；此後他的名字與「漢奸」二字連在一起。']],
    },
    {
      id: 'zaoyi', title: '棗宜會戰', scene: 'field',
      cond: { from: [1940, 5], until: [1940, 8], alive: ['japan'], general_faction: { 張自忠: 'kmt' } },
      effects: [{ do: 'die', general: '張自忠' }, { do: 'seize', city: '宜昌', faction: 'japan', if_owner: 'kmt' }, { do: 'loyalty', faction: 'kmt', amount: 8 }],
      lines: [['張自忠', '（手諭）國家到了如此地步，除我等為其死，毫無其他辦法。'], ['', '張自忠率部渡過襄河截擊日軍，在南瓜店力戰殉國。'],
        ['', '日軍隨後攻陷宜昌，直接威脅重慶的門戶。']],
    },
    {
      id: 'dai_anlan', title: '戴安瀾殉國', scene: 'field',
      cond: { from: [1942, 5], until: [1942, 8], after: ['burma'], general_faction: { 戴安瀾: 'kmt' } },
      effects: [{ do: 'die', general: '戴安瀾' }],
      lines: [['', '遠征軍第二〇〇師在緬北突圍途中遭日軍伏擊，師長戴安瀾重傷。'], ['', '5 月 26 日，戴安瀾在緬甸茅邦村殉國，年僅三十八歲。']],
    },
    {
      id: 'ichigo', title: '一號作戰（豫湘桂）', scene: 'fire',
      cond: { from: [1944, 4], until: [1944, 6], alive: ['japan'] },
      effects: [{ do: 'troops', city: '武漢', unit: 'inf', amount: 40000, if_owner: 'japan' }, { do: 'troops', city: '武漢', unit: 'tank', amount: 10000, if_owner: 'japan' }],
      lines: [['', '日軍集結五十萬兵力發動「一號作戰」，要打通從華北經湖南、廣西到越南的交通線，並摧毀美軍在華的機場。'],
        ['', '河南、湖南、廣西的國軍節節敗退，大片國土再度淪陷。']],
    },
    {
      id: 'hengyang', title: '衡陽保衛戰', scene: 'fire',
      cond: { from: [1944, 6], until: [1944, 9], general_faction: { 方先覺: 'kmt' }, owns: { kmt: ['衡陽'] } },
      effects: [{ do: 'troops', city: '衡陽', unit: 'inf', amount: 15000, if_owner: 'kmt' }, { do: 'city_add', city: '衡陽', field: 'defense', amount: 200 }],
      lines: [['方先覺', '第十軍誓與衡陽共存亡。'], ['', '方先覺率孤軍死守衡陽四十七天，日軍傷亡慘重，是抗戰後期最壯烈的守城戰之一。']],
    },
    {
      id: 'myitkyina', title: '滇緬反攻', scene: 'field',
      cond: { from: [1944, 8], until: [1945, 2], alive: ['usa', 'japan'], owns: { japan: ['臘戌'] } },
      effects: [{ do: 'troops', city: '列多', unit: 'inf', amount: 40000, if_owner: 'usa' }, { do: 'troops', city: '列多', unit: 'air', amount: 10000, if_owner: 'usa' }],
      lines: [['史迪威', '駐印軍和美軍一起打通中印公路，把物資從陸路送進中國。'], ['', '中國駐印軍與美軍攻克密支那，滇西的遠征軍也渡過怒江反攻。']],
    },
    {
      id: 'okinawa', title: '沖繩戰役', scene: 'river',
      cond: { from: [1945, 4], until: [1945, 7], alive: ['usa', 'japan'], owns: { japan: ['沖繩'] } },
      effects: [{ do: 'seize', city: '沖繩', faction: 'usa' }, { do: 'troops', city: '沖繩', unit: 'navy', amount: 30000, if_owner: 'usa' }],
      lines: [['尼米茲', '沖繩是進攻日本本土前的最後一站。'], ['', '美軍登陸沖繩，激戰近三個月才佔領全島，軍民傷亡極為慘重。']],
    },
    {
      id: 'zhijiang', title: '芷江會戰', scene: 'field',
      cond: { from: [1945, 4], until: [1945, 6], owns: { kmt: ['芷江'] } },
      effects: [{ do: 'loyalty', faction: 'kmt', amount: 5 }, { do: 'troops', city: '芷江', unit: 'air', amount: 3000, if_owner: 'kmt' }],
      lines: [['', '日軍進攻湘西，想奪取美軍的芷江機場。'], ['王耀武', '中美空軍聯手，地面部隊全線反擊！'], ['', '國軍在湘西擊退日軍，這是抗戰中最後一場大規模會戰。']],
    },

    // ---------- 國共內戰（只在內戰篇：1946 劇本或抗戰勝利後選「繼續」） ----------
    {
      id: 'neizhan', title: '全面內戰', scene: 'field',
      cond: { from: [1946, 6], until: [1946, 9], civil: true, alive: ['kmt', 'ccp'] },
      effects: [{ do: 'relation', a: 'kmt', b: 'ccp', state: 'war' }],
      lines: [['', '重慶談判的《雙十協定》與停戰令相繼失效。國軍大舉進攻中原解放區，全面內戰爆發。'],
        ['蔣介石', '三個月到六個月之內，解決關內的共軍。'], ['毛澤東', '一切反動派都是紙老虎。']],
    },
    {
      id: 'menglianggu', title: '孟良崮戰役', scene: 'fire',
      cond: { from: [1947, 5], until: [1947, 7], civil: true, general_faction: { 張靈甫: 'kmt' } },
      effects: [{ do: 'die', general: '張靈甫' }, { do: 'troops_scale', city: '濟南', mult: 0.85, if_owner: 'kmt' }, { do: 'loyalty', faction: 'ccp', amount: 5 }],
      lines: [['粟裕', '整編七十四師孤軍突出，正是殲滅的好機會。'], ['', '號稱「五大主力」之一的整編第七十四師在山東孟良崮被圍殲，師長張靈甫陣亡。']],
    },
    {
      id: 'dabieshan', title: '挺進大別山', scene: 'field',
      cond: { from: [1947, 8], until: [1947, 10], civil: true, alive: ['ccp', 'kmt'] },
      effects: [{ do: 'troops_scale', city: '合肥', mult: 0.85, if_owner: 'kmt' }, { do: 'troops_scale', city: '武漢', mult: 0.9, if_owner: 'kmt' }],
      lines: [['劉伯承', '千里躍進，直插國軍的腹地。'], ['鄧小平', '大別山是插向南京與武漢之間的一把尖刀。'], ['', '劉鄧大軍南渡黃河、躍進大別山，戰爭的重心開始南移。']],
    },
    {
      id: 'jinan_zhanyi', title: '濟南戰役', scene: 'fire',
      cond: { from: [1948, 9], until: [1948, 11], civil: true, alive: ['ccp', 'kmt'] },
      effects: [{ do: 'seize', city: '濟南', faction: 'ccp', if_owner: 'kmt' }, { do: 'troops_scale', city: '濟南', mult: 0.5 }, { do: 'retire', general: '王耀武' }],
      lines: [['許世友', '八天之內拿下濟南！'], ['', '華東野戰軍攻克有重兵把守的濟南，守將王耀武被俘，這是內戰中第一次攻下有堅固城防的大城。']],
    },
    {
      id: 'liaoshen', title: '遼瀋戰役', scene: 'fire',
      cond: { from: [1948, 9], until: [1948, 12], civil: true, alive: ['ccp', 'kmt'] },
      effects: [{ do: 'seize', city: '錦州', faction: 'ccp', if_owner: 'kmt' }, { do: 'seize', city: '瀋陽', faction: 'ccp', if_owner: 'kmt' },
        { do: 'seize', city: '長春', faction: 'ccp', if_owner: 'kmt' }, { do: 'troops_scale', city: '錦州', mult: 0.5 }, { do: 'troops_scale', city: '瀋陽', mult: 0.5 }, { do: 'join', general: '曾澤生', faction: 'ccp', force: true },
        { do: 'troops', city: '哈爾濱', unit: 'inf', amount: 80000, if_owner: 'ccp' }, { do: 'retire', general: '廖耀湘' }],
      lines: [['林彪', '先打錦州，關上東北的大門。'], ['', '東北野戰軍攻克錦州，長春守軍曾澤生部起義；被圍半年的長春城中，平民餓死者甚眾。'],
        ['', '廖耀湘兵團在遼西被殲，廖耀湘被俘。五十二天的戰役後，國軍在東北的主力幾乎全部覆沒。']],
    },
    {
      id: 'huaihai', title: '淮海戰役', scene: 'fire',
      cond: { from: [1948, 11], until: [1949, 2], civil: true, alive: ['ccp', 'kmt'] },
      effects: [{ do: 'seize', city: '徐州', faction: 'ccp', if_owner: 'kmt' }, { do: 'troops_scale', city: '徐州', mult: 0.5 }, { do: 'troops_scale', city: '合肥', mult: 0.6, if_owner: 'kmt' },
        { do: 'die', general: '黃百韜' }, { do: 'die', general: '邱清泉' }, { do: 'retire', general: '黃維' }, { do: 'retire', general: '杜聿明' }],
      lines: [['粟裕', '先吃掉黃百韜兵團，再圍黃維、杜聿明。'], ['', '華東、中原兩大野戰軍在徐州以東的平原上會戰六十六天，動員的民工以百萬計。'],
        ['', '黃百韜、邱清泉兵敗身亡，黃維、杜聿明被俘。長江以北的國軍主力損失殆盡，南京門戶大開。']],
    },
    {
      id: 'pingjin', title: '平津戰役', scene: 'palace',
      cond: { from: [1948, 12], until: [1949, 3], civil: true, alive: ['ccp', 'kmt'] },
      effects: [{ do: 'seize', city: '天津', faction: 'ccp', if_owner: 'kmt' }, { do: 'seize', city: '北京', faction: 'ccp', if_owner: 'kmt' },
        { do: 'join', general: '傅作義', faction: 'ccp', force: true }],
      lines: [['', '解放軍攻克天津。困守北平的傅作義，面對古城可能毀於戰火的局面。'], ['傅作義', '北平是幾百年的古都，不能讓它毀在我手裡。'],
        ['', '1949 年 1 月，傅作義接受和平改編，北平未經戰火易手。']],
    },
    {
      id: 'dujiang', title: '渡江戰役', scene: 'river',
      cond: { from: [1949, 4], until: [1949, 6], civil: true, alive: ['ccp', 'kmt'], city_owner_not: { 徐州: 'kmt' } },
      effects: [{ do: 'troops_scale', city: '南京', mult: 0.4, if_owner: 'kmt' }, { do: 'troops_scale', city: '上海', mult: 0.6, if_owner: 'kmt' },
        { do: 'troops_scale', city: '杭州', mult: 0.6, if_owner: 'kmt' }, { do: 'seize', city: '南京', faction: 'ccp', if_owner: 'kmt' }, { do: 'seize', city: '杭州', faction: 'ccp', if_owner: 'kmt' },
        { do: 'troops', city: '南京', unit: 'inf', amount: 40000, if_owner: 'ccp' }, { do: 'relocate', general: '劉伯承', city: '南京' }],
      lines: [['', '和談破裂。4 月 21 日，百萬解放軍在千里江面上強渡長江。'], ['', '23 日，南京易手，國民政府南遷廣州。']],
    },
    {
      id: 'hunan_qiyi', title: '湖南和平起義', scene: 'palace',
      cond: { from: [1949, 8], until: [1949, 10], civil: true, general_faction: { 程潛: 'kmt' } },
      effects: [{ do: 'seize', city: '長沙', faction: 'ccp', if_owner: 'kmt' }, { do: 'join', general: '程潛', faction: 'ccp', force: true }],
      lines: [['程潛', '湖南父老已經受夠了戰火。'], ['', '程潛與陳明仁在長沙通電起義，湖南和平易手。']],
    },
    {
      id: 'fuzhou_zhanyi', title: '福州戰役', scene: 'camp',
      cond: { from: [1949, 8], until: [1949, 9], civil: true, alive: ['ccp', 'kmt'], city_owner_not: { 徐州: 'kmt' } },
      effects: [{ do: 'seize', city: '福州', faction: 'ccp', if_owner: 'kmt' }, { do: 'troops_scale', city: '福州', mult: 0.5 },
        { do: 'troops', city: '福州', unit: 'inf', amount: 40000, if_owner: 'ccp' }, { do: 'relocate', general: '葉飛', city: '福州' },
        { do: 'seize', city: '上海', faction: 'ccp', if_owner: 'kmt' }, { do: 'troops_scale', city: '上海', mult: 0.5 },
        { do: 'troops', city: '上海', unit: 'inf', amount: 30000, if_owner: 'ccp' }, { do: 'relocate', general: '陳毅', city: '上海' }],
      lines: [['葉飛', '第十兵團入閩，福州已經拿下。下一步，渡海取金門、廈門！'], ['', '上海也在 5 月易手，國軍沿海據點只剩下舟山、金門與臺灣。']],
    },
    {
      id: 'guningtou', title: '古寧頭戰役', scene: 'night',
      cond: { from: [1949, 10], until: [1949, 12], civil: true, alive: ['kmt', 'ccp'], owns: { kmt: ['金門'] }, city_owner_not: { 徐州: 'kmt' } },
      effects: [{ do: 'troops', city: '金門', unit: 'inf', amount: 25000, if_owner: 'kmt' }, { do: 'relocate', general: '胡璉', city: '金門' },
        { do: 'troops_scale', city: '福州', mult: 0.85, if_owner: 'ccp' }],
      lines: [['', '10 月 24 日深夜，解放軍第十兵團的先頭部隊約九千人分乘木船，在金門古寧頭一帶搶灘。'],
        ['', '船隻不足、潮水退去，後續部隊無法增援。守軍與剛抵達的胡璉兵團合力反擊。'],
        ['', '激戰三晝夜，登陸部隊全軍覆沒。金門守住了，此後成為臺海對峙的前線。']],
    },
    {
      id: 'qiantai', title: '國府遷臺', scene: 'river',
      cond: { from: [1949, 12], until: [1950, 3], civil: true, alive: ['kmt'], city_owner_not: { 徐州: 'kmt' }, owns: { kmt: ['臺北'] } },
      effects: [{ do: 'gather', faction: 'kmt', city: '臺北' }, { do: 'troops', city: '臺北', unit: 'inf', amount: 100000, if_owner: 'kmt' }],
      lines: [['', '1949 年 12 月，中華民國政府遷往臺北，大批軍民隨之渡海來臺。'], ['', '海峽兩岸從此分治。']],
    },
    {
      id: 'yunnan_qiyi', title: '雲南起義', scene: 'palace',
      cond: { from: [1949, 12], until: [1950, 2], civil: true, alive: ['dian', 'ccp'] },
      effects: [{ do: 'absorb', faction: 'dian', into: 'ccp' }],
      lines: [['盧漢', '雲南不再為內戰流血。'], ['', '盧漢在昆明宣布起義，雲南歸入中共。']],
    },
    {
      id: 'civil_end', title: '海峽對峙', scene: 'river',
      cond: { from: [1950, 6], civil: true },
      effects: [{ do: 'civil_settle' }],
      lines: [['', '1950 年 6 月，韓戰爆發，美國第七艦隊駛入臺灣海峽。'], ['', '國共雙方隔海對峙的局面就此固定下來。']],
    },
  ];
  const MORE = {};
  // 事件依開始年月排序（同月份的保持原順序）
  const ym = (y, m) => y * 12 + m - 1;
  const fromOf = (e) => (e.cond && e.cond.from ? ym(e.cond.from[0], e.cond.from[1]) : 0);

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
      return { id, name, ruler, color: COL[id], npc: (d.npc || []).includes(id), dormant: (d.dormant || []).includes(id) || undefined,
        side: (d.npc || []).includes(id) || ['manchu', 'wang'].includes(id) ? 'axis' : (d.dormant || []).includes(id) ? 'neutral' : 'allies', heirs: heirs.filter((h) => generals.some((g) => g.name === h && g.faction === id)), strategist: (d.strategists || {})[id] || null };
    });
    for (const f of factions) if (!cities.some((c) => c.owner === f.id)) throw new Error(`劇本 ${d.title}：${f.name} 沒有城`);
    return { id: d.id, tag: d.tag, title: d.title, year: d.year, month: d.month, desc: d.desc, aptitude: W.aptitude,
      factions, cities, roads: W.roads, sea: W.sea || [], axisPlan: d.axisPlan || [], coop: d.coop, civil: !!d.civil, generals, relations: d.relations || [], events: (d.events || []).concat(LIB.filter((e) => fromOf(e) >= ym(d.year, d.month))).map((e) => Object.assign({ historical: true }, e)) };
  }

  TK.SCENARIOS = DEFS.map(build);
  TK.SCENARIO = TK.SCENARIOS[0];
  TK.scenarioById = (id) => TK.SCENARIOS.find((s) => s.id === id) || TK.SCENARIOS[0];
})(globalThis.TK = globalThis.TK || {});
