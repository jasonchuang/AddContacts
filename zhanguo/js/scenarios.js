/* 戰國七雄的劇本。年份以「負數」表示西元前（-260 = 西元前 260 年），畫面上顯示為「前260年」。
 * 人物、地名與事件取自《史記》《戰國策》等公有領域史料；能力值、兵力與對話皆為本作自行設定。 */
(function (TK) {
  'use strict';
  const D = TK.WORLD;

  const COL = { qin: '#2f3540', zhao: '#d4a017', wei: '#8e44ad', hann: '#16a085', chu: '#c0392b', yan: '#e67ea8', qi: '#2e6fd8', dai: '#b0703a' };

  const DEFS = [
    {
      id: '-260', title: '長平之戰', year: -260, month: 4, tag: '秦 對 趙・四十萬大軍對峙',
      desc: '韓國的上黨郡不願降秦，郡守馮亭把十七座城獻給趙國。秦國大怒，王齕率軍攻打上黨，老將廉頗在長平築壘死守。兩國傾全國之兵對峙——戰國最慘烈的一戰即將到來。',
      factions: [['qin', '秦', '嬴稷'], ['zhao', '趙', '趙丹'], ['wei', '魏', '魏圉'], ['hann', '韓', '韓然'], ['chu', '楚', '熊完'], ['yan', '燕', '姬喜'], ['qi', '齊', '田建']],
      cities: { 咸陽: ['qin', 60000], 雍: ['qin', 20000], 隴西: ['qin', 15000], 上郡: ['qin', 18000], 南鄭: ['qin', 18000], 成都: ['qin', 25000],
        江州: ['qin', 14000], 函谷: ['qin', 15000], 宛: ['qin', 25000], 江陵: ['qin', 22000], 安邑: ['qin', 45000],
        邯鄲: ['zhao', 40000], 長平: ['zhao', 50000], 上黨: ['zhao', 25000], 晉陽: ['zhao', 20000], 代: ['zhao', 25000],
        新鄭: ['hann', 30000], 大梁: ['wei', 40000], 陶: ['wei', 15000],
        陳: ['chu', 40000], 壽春: ['chu', 25000], 吳: ['chu', 20000], 會稽: ['chu', 12000], 長沙: ['chu', 15000], 蘭陵: ['chu', 15000],
        薊: ['yan', 35000], 武陽: ['yan', 15000], 遼東: ['yan', 12000], 臨淄: ['qi', 45000], 即墨: ['qi', 18000], 莒: ['qi', 15000], 歷下: ['qi', 20000] },
      people: {
        qin: { 咸陽: '嬴稷 范雎', 安邑: '白起 王齕 蒙驁' },
        zhao: { 邯鄲: '趙丹 趙括 藺相如 平原君 虞卿', 長平: '廉頗 樂乘', 上黨: '馮亭', 代: '李牧' },
        wei: { 大梁: '魏圉 信陵君 晉鄙 侯嬴 朱亥' }, hann: { 新鄭: '韓然 張平' },
        chu: { 陳: '熊完 春申君 景陽', 壽春: '項燕' }, yan: { 薊: '姬喜 劇辛 樂閒 將渠' }, qi: { 臨淄: '田建 后勝', 即墨: '田單' },
      },
      free: { 邯鄲: '呂不韋', 陳: '李斯', 新鄭: '韓非' },
      strategists: { qin: '范雎', zhao: '藺相如', wei: '侯嬴', chu: '春申君', qi: '田單' },
      relations: [['qin', 'zhao', 'war'], ['qin', 'hann', 'war'], ['qin', 'qi', 'truce', 24], ['qin', 'yan', 'truce', 24]],
      events: [
        {
          id: 'shangdang', title: '上黨之爭', scene: 'palace',
          cond: { from: [-260, 4], alive: ['qin', 'zhao'] },
          effects: [],
          lines: [['', '（兩年前）秦軍切斷了上黨與韓國本土的聯繫。上黨郡守馮亭不願降秦，派人把上黨十七城獻給趙國。'],
            ['平陽君', '聖人視無故之利為大禍。秦國費盡力氣，趙國卻坐收其利，秦怎肯罷休？'],
            ['平原君', '發百萬之軍攻打一年都得不到一座城，如今不費一兵就得十七城，這是大利，不可失！'],
            ['趙丹', '好，接受上黨。命廉頗領兵駐守長平。'],
            ['范雎', '大王，趙國吞下了上黨，就等於吞下了戰爭。']],
        },
        {
          id: 'huanjiang', title: '臨陣換將', scene: 'palace',
          cond: { from: [-260, 7], alive: ['qin', 'zhao'], general_faction: { 廉頗: 'zhao', 趙括: 'zhao' }, owns: { zhao: ['長平'] } },
          effects: [],
          chooser: 'zhao', aiChoice: 0,
          lines: [['', '廉頗堅壁不出，秦軍屢次挑戰，趙軍就是不應。長平的對峙已經三年。'],
            ['', '邯鄲城中開始流傳一句話：「秦國不怕廉頗，只怕馬服君之子趙括當將軍。」'],
            ['趙丹', '廉頗老了，只會守。趙括熟讀兵書，談起用兵連他父親都難不倒他……'],
            ['藺相如', '大王只憑名聲用趙括，就像把琴柱黏死了再去彈琴。趙括只會讀他父親的兵書，不懂得臨機應變。']],
          choices: [
            { label: '以趙括代廉頗', desc: '依照史實：秦國暗中改派白起為將，趙軍四十萬將陷入重圍',
              effects: [{ do: 'relocate', general: '廉頗', city: '邯鄲' }, { do: 'relocate', general: '趙括', city: '長平' },
                { do: 'troops_scale', city: '長平', mult: 0.25 }, { do: 'die', general: '趙括' }, { do: 'troops_scale', city: '邯鄲', mult: 0.8 },
                { do: 'loyalty', faction: 'zhao', amount: -15 }],
              lines: [['趙括', '廉頗的壁壘不必守了，全軍出擊！'], ['白起', '（秦軍中，誰也不許洩漏我已到長平的消息。）佯敗，把趙軍引出營壘。'],
                ['', '趙軍追到秦壁之下，兩支秦軍奇兵切斷了退路與糧道。趙軍被圍困四十六日，士卒自相殘食。'],
                ['', '趙括親自率精兵突圍，被秦軍射殺。四十萬趙卒投降——白起只放回二百四十名年紀小的，其餘全數坑殺。'],
                ['', '趙國從此元氣大傷。']] },
            { label: '堅持用廉頗', desc: '不中反間計，繼續堅壁固守',
              effects: [{ do: 'loyalty_of', generals: ['廉頗'], value: 100 }, { do: 'loyalty', faction: 'zhao', amount: 5 }],
              lines: [['趙丹', '寡人不換將。廉將軍，長平就交給你了。'], ['廉頗', '老臣在，長平就在。'],
                ['范雎', '（趙王竟然不上當……只好另想辦法。）']] },
          ],
        },
        {
          id: 'qiehu', title: '竊符救趙', scene: 'night',
          cond: { from: [-258, 9], alive: ['qin', 'zhao', 'wei'], general_faction: { 信陵君: 'wei', 晉鄙: 'wei' } },
          effects: [{ do: 'die', general: '晉鄙' }, { do: 'troops', city: '邯鄲', unit: 'spear', amount: 20000 }, { do: 'troops_scale', city: '安邑', mult: 0.7 },
            { do: 'relation', a: 'wei', b: 'qin', state: 'war' }, { do: 'relation', a: 'wei', b: 'zhao', state: 'alliance', months: 36 }],
          lines: [['', '秦軍圍攻邯鄲。魏王派晉鄙率十萬大軍救趙，卻因為畏懼秦國，讓大軍停在鄴城觀望。'],
            ['平原君', '（寫信給信陵君）當初與魏結親，是看重公子的義氣。如今邯鄲旦暮將降，公子的姊姊也在城中，公子不憐惜嗎？'],
            ['侯嬴', '晉鄙的兵符放在魏王臥室，如姬能夠取得。公子拿到兵符，晉鄙若不肯交出兵權，就讓朱亥擊殺他。'],
            ['朱亥', '（袖中藏著四十斤的鐵椎）臣不過是市井屠夫，承蒙公子屢次相訪——今天就是報答的時候了。'],
            ['', '晉鄙驗符起疑，朱亥一椎擊殺了他。信陵君率八萬精兵直擊秦軍，邯鄲之圍遂解。']],
        },
        {
          id: 'duyou', title: '杜郵賜劍', scene: 'palace',
          cond: { from: [-257, 11], alive: ['qin'], general_faction: { 白起: 'qin' } },
          effects: [{ do: 'die', general: '白起' }],
          lines: [['', '邯鄲之戰失利後，秦王命白起出征，白起稱病不肯。秦王大怒，把他貶為士卒，趕出咸陽。'],
            ['', '走到杜郵，使者送來了秦王賜的劍。'],
            ['白起', '我何罪於天，而落到這個地步？'],
            ['白起', '……長平之戰，趙卒降者數十萬人，我騙了他們，全部坑殺。這就足以死了。'],
            ['', '武安君白起自刎於杜郵。']],
        },
        {
          id: 'zhouwang', title: '周室滅亡', scene: 'palace',
          cond: { from: [-256, 3], alive: ['qin'], neutral_city: '洛陽' },
          effects: [{ do: 'give_city', city: '洛陽', faction: 'qin', units: { spear: 8000, cav: 2000, xbow: 2000 } }],
          lines: [['', '周赧王聯合諸侯伐秦失敗，秦軍攻入王畿。周王獻出三十六邑與三萬人口。'],
            ['', '傳承八百年的周王室，至此終結。九鼎被運往咸陽。']],
        },
        {
          id: 'qihuo', title: '奇貨可居', scene: 'palace',
          cond: { from: [-259, 1], alive: ['qin'], general_free: ['呂不韋'] },
          effects: [{ do: 'join', general: '呂不韋', faction: 'qin', force: true }, { do: 'relocate', general: '呂不韋', city: '咸陽' }],
          lines: [['', '邯鄲城中，大商人呂不韋遇見了在趙國當人質、窮困潦倒的秦國王孫異人。'],
            ['呂不韋', '此奇貨可居。'],
            ['呂不韋', '種田的利潤是十倍，買賣珠玉是百倍；扶立一國之君呢？是無數倍。我要讓你成為秦國的太子。']],
        },
      ],
    },
    {
      id: '-247', title: '信陵君合縱', year: -247, month: 5, tag: '五國合縱 對 秦',
      desc: '秦國滅了東周、奪取上黨，十三歲的嬴政剛即位，由相國呂不韋主政。秦將蒙驁連破魏國城池，魏王急忙請回流亡趙國十年的信陵君——六國能否再次合縱抗秦？',
      factions: [['qin', '秦', '嬴政'], ['zhao', '趙', '趙丹'], ['wei', '魏', '魏圉'], ['hann', '韓', '韓然'], ['chu', '楚', '熊完'], ['yan', '燕', '姬喜'], ['qi', '齊', '田建']],
      cities: { 咸陽: ['qin', 60000], 雍: ['qin', 20000], 隴西: ['qin', 15000], 上郡: ['qin', 18000], 南鄭: ['qin', 18000], 成都: ['qin', 25000],
        江州: ['qin', 14000], 函谷: ['qin', 15000], 宛: ['qin', 25000], 江陵: ['qin', 22000], 安邑: ['qin', 40000], 洛陽: ['qin', 25000],
        上黨: ['qin', 30000], 長平: ['qin', 15000], 晉陽: ['qin', 20000],
        邯鄲: ['zhao', 40000], 代: ['zhao', 30000], 新鄭: ['hann', 28000], 大梁: ['wei', 45000], 陶: ['wei', 18000],
        陳: ['chu', 40000], 壽春: ['chu', 30000], 吳: ['chu', 20000], 會稽: ['chu', 12000], 長沙: ['chu', 15000], 蘭陵: ['chu', 18000],
        薊: ['yan', 30000], 武陽: ['yan', 15000], 遼東: ['yan', 12000], 臨淄: ['qi', 45000], 即墨: ['qi', 18000], 莒: ['qi', 15000], 歷下: ['qi', 20000] },
      people: {
        qin: { 咸陽: '嬴政 呂不韋 李斯 王翦', 安邑: '蒙驁 王齕', 洛陽: '麃公' },
        zhao: { 邯鄲: '趙丹 廉頗 龐煖 樂乘 虞卿', 代: '李牧' },
        wei: { 大梁: '魏圉 信陵君 朱亥 侯嬴' }, hann: { 新鄭: '韓然 韓非 張平' },
        chu: { 陳: '熊完 春申君 景陽 李園', 壽春: '項燕' }, yan: { 薊: '姬喜 劇辛 樂閒 將渠 太子丹' }, qi: { 臨淄: '田建 后勝', 即墨: '田單' },
      },
      strategists: { qin: '李斯', zhao: '龐煖', wei: '侯嬴', chu: '春申君', qi: '田單' },
      relations: [['qin', 'wei', 'war'], ['qin', 'zhao', 'war'], ['qin', 'hann', 'war']],
      events: [
        {
          id: 'hezong', title: '五國合縱', scene: 'camp',
          cond: { from: [-247, 5], alive: ['qin', 'wei'], general_faction: { 信陵君: 'wei' } },
          effects: [{ do: 'coalition_against', faction: 'qin' }, { do: 'relation', a: 'wei', b: 'zhao', state: 'alliance', months: 36 },
            { do: 'relation', a: 'wei', b: 'hann', state: 'alliance', months: 36 }, { do: 'relation', a: 'wei', b: 'chu', state: 'alliance', months: 36 },
            { do: 'relation', a: 'wei', b: 'yan', state: 'alliance', months: 36 }, { do: 'troops_scale', city: '安邑', mult: 0.6 }, { do: 'loyalty', faction: 'qin', amount: -5 }],
          lines: [['魏圉', '公子，寡人錯了。秦軍日夜攻魏，魏國只能靠你了。'],
            ['信陵君', '我在趙國十年，不是不想回來，是怕回來連累魏國。如今國家危急，無忌怎敢推辭？'],
            ['', '各國聽說信陵君為魏將，紛紛派兵相助。五國聯軍在河外大破蒙驁，一路追擊到函谷關下，秦軍閉關不敢出。']],
        },
        {
          id: 'fanjian_xinling', title: '萬金離間', scene: 'palace',
          cond: { from: [-245, 3], alive: ['qin', 'wei'], general_faction: { 信陵君: 'wei' } },
          effects: [],
          chooser: 'wei', aiChoice: 0,
          lines: [['', '秦國用萬金在魏國四處散布流言：「公子在外十年，如今是五國的大將，諸侯只知有信陵君，不知有魏王。」'],
            ['', '秦國還一再派使者來祝賀：「聽說公子已經當上魏王了吧？」'],
            ['魏圉', '……']],
          choices: [
            { label: '收回兵權', desc: '依照史實：信陵君失勢，四年後鬱鬱而終',
              effects: [{ do: 'die', general: '信陵君' }, { do: 'loyalty', faction: 'wei', amount: -10 }],
              lines: [['魏圉', '公子辛苦了，兵權就交給別人吧。'], ['信陵君', '（從此稱病不朝，日夜飲酒，親近女色。）'],
                ['', '四年後，信陵君因飲酒過度而死。十八年後，秦滅魏。']] },
            { label: '信任公子', desc: '不中反間計',
              effects: [{ do: 'loyalty_of', generals: ['信陵君'], value: 100 }],
              lines: [['魏圉', '秦人越是說你的壞話，越證明他們怕你。寡人不疑公子。'], ['信陵君', '無忌必不負大王。']] },
          ],
        },
        {
          id: 'lianpo_ben', title: '廉頗奔魏', scene: 'field',
          cond: { from: [-245, 6], alive: ['zhao', 'wei'], general_faction: { 廉頗: 'zhao' } },
          effects: [{ do: 'join', general: '廉頗', faction: 'wei', force: true }],
          lines: [['', '趙孝成王去世，新即位的趙悼襄王派樂乘取代廉頗。'],
            ['廉頗', '我為趙國征戰一生，竟落得如此！'], ['', '廉頗怒而攻走樂乘，自己也出奔魏國。'],
            ['', '（後來趙王想再起用他，派使者去看他是否還能用。廉頗一頓飯吃了一斗米、十斤肉，披甲上馬，表示自己還能打仗。使者卻回報：「廉將軍雖老，尚善飯，然與臣坐，頃之三遺矢矣。」）']],
        },
        {
          id: 'qinzheng', title: '秦王親政', scene: 'palace',
          cond: { from: [-238, 4], alive: ['qin'], general_faction: { 嬴政: 'qin', 呂不韋: 'qin' } },
          effects: [{ do: 'die', general: '呂不韋' }, { do: 'loyalty', faction: 'qin', amount: 10 }],
          lines: [['', '秦王政二十二歲，在雍城舉行冠禮，正式親政。長信侯嫪毐趁機作亂，被秦王迅速平定。'],
            ['嬴政', '嫪毐是呂不韋引進宮的。相國，你還有什麼話說？'],
            ['', '呂不韋被免去相位、遷往蜀地。他自知難免一死，飲鴆自盡。'],
            ['李斯', '（上〈諫逐客書〉）泰山不讓土壤，故能成其大；河海不擇細流，故能就其深。'],
            ['嬴政', '說得好。從今天起，秦國只看才能，不問出身。']],
        },
      ],
    },
    {
      id: '-233', title: '李牧守趙', year: -233, month: 1, tag: '秦 對 趙・北境之盾',
      desc: '秦國已是天下最強，王翦、桓齮、楊端和等名將連年東進。趙國能依靠的，只剩下長年鎮守北方、讓匈奴十年不敢靠近的李牧。而在邯鄲宮中，寵臣郭開正收下秦國送來的黃金……',
      factions: [['qin', '秦', '嬴政'], ['zhao', '趙', '趙遷'], ['wei', '魏', '魏增'], ['hann', '韓', '韓安'], ['chu', '楚', '熊悍'], ['yan', '燕', '姬喜'], ['qi', '齊', '田建']],
      cities: { 咸陽: ['qin', 60000], 雍: ['qin', 20000], 隴西: ['qin', 15000], 上郡: ['qin', 20000], 南鄭: ['qin', 18000], 成都: ['qin', 25000],
        江州: ['qin', 14000], 函谷: ['qin', 15000], 宛: ['qin', 25000], 江陵: ['qin', 22000], 安邑: ['qin', 30000], 洛陽: ['qin', 30000],
        上黨: ['qin', 35000], 長平: ['qin', 40000], 晉陽: ['qin', 40000], 陶: ['qin', 20000],
        邯鄲: ['zhao', 45000], 代: ['zhao', 40000], 新鄭: ['hann', 22000], 大梁: ['wei', 40000],
        陳: ['chu', 40000], 壽春: ['chu', 35000], 吳: ['chu', 20000], 會稽: ['chu', 12000], 長沙: ['chu', 15000], 蘭陵: ['chu', 18000],
        薊: ['yan', 30000], 武陽: ['yan', 15000], 遼東: ['yan', 12000], 臨淄: ['qi', 45000], 即墨: ['qi', 18000], 莒: ['qi', 15000], 歷下: ['qi', 20000] },
      people: {
        qin: { 咸陽: '嬴政 李斯 尉繚 頓弱 姚賈 昌平君', 長平: '桓齮 楊端和', 晉陽: '王翦 王賁 羌瘣', 洛陽: '蒙武 蒙恬 李信 內史騰' },
        zhao: { 邯鄲: '趙遷 郭開 顏聚 趙蔥 趙嘉', 代: '李牧 司馬尚' },
        wei: { 大梁: '魏增' }, hann: { 新鄭: '韓安 韓非' },
        chu: { 陳: '熊悍 李園', 壽春: '項燕' }, yan: { 薊: '姬喜 太子丹 鞠武 將渠' }, qi: { 臨淄: '田建 后勝' },
      },
      free: { 薊: '荊軻' },
      loyalty: { 郭開: 60 },
      strategists: { qin: '尉繚', zhao: '司馬尚', yan: '鞠武' },
      relations: [['qin', 'zhao', 'war'], ['qin', 'hann', 'war'], ['qin', 'qi', 'alliance', 60], ['zhao', 'yan', 'war']],
      events: [
        {
          id: 'feizhi', title: '肥之戰', scene: 'field',
          cond: { from: [-233, 3], alive: ['qin', 'zhao'], general_faction: { 李牧: 'zhao', 桓齮: 'qin' } },
          effects: [{ do: 'troops_scale', city: '長平', mult: 0.45 }, { do: 'leave', general: '桓齮' }, { do: 'loyalty', faction: 'zhao', amount: 10 }],
          lines: [['', '秦將桓齮攻破趙國的平陽、武城，斬首十萬，又深入趙地攻打赤麗、宜安。趙王急召李牧南下。'],
            ['李牧', '秦軍連勝，銳氣正盛，不可與之爭鋒。堅守營壘，不許出戰。'],
            ['', '桓齮見趙軍不出，分兵去攻肥下。李牧等的就是這一刻——趁秦軍分兵、營中空虛，一舉襲取秦營，再回頭夾擊救援的秦軍。'],
            ['', '秦軍大敗，桓齮逃亡他國。趙王封李牧為武安君。']],
        },
        {
          id: 'hanfei_si', title: '韓非之死', scene: 'palace',
          cond: { from: [-233, 6], alive: ['qin', 'hann'], general_faction: { 韓非: 'hann' } },
          effects: [{ do: 'die', general: '韓非' }],
          lines: [['嬴政', '（讀了〈孤憤〉〈五蠹〉）寡人若能見到寫這書的人，和他交往，死而無憾！'],
            ['李斯', '這是韓非寫的。秦若攻韓，韓國必定派他來。'], ['', '韓王派韓非出使秦國。'],
            ['姚賈', '韓非是韓國的公子，終究會為韓不為秦。不用他，又放他回去，是留下後患，不如依法誅殺。'],
            ['', '韓非被下獄。李斯派人送來毒藥。等秦王後悔想赦免他時，韓非已經死了。']],
        },
        {
          id: 'fanwu', title: '番吾之戰', scene: 'field',
          cond: { from: [-232, 4], alive: ['qin', 'zhao'], general_faction: { 李牧: 'zhao' }, after: ['feizhi'] },
          effects: [{ do: 'troops_scale', city: '晉陽', mult: 0.7 }],
          lines: [['', '秦軍分兩路攻趙，一路攻鄴，一路攻太原、番吾。'], ['李牧', '先破北路，再回師南下。'],
            ['', '李牧在番吾擊退秦軍，又南下擋住另一路。秦國一時無法再攻趙——六國之中，只有李牧能讓秦軍兩度敗退。']],
        },
        {
          id: 'guokai', title: '郭開讒言', scene: 'palace',
          cond: { from: [-229, 6], alive: ['qin', 'zhao'], general_faction: { 李牧: 'zhao', 郭開: 'zhao' } },
          effects: [],
          chooser: 'zhao', aiChoice: 0,
          lines: [['', '王翦率大軍攻趙，李牧、司馬尚率軍抵禦，秦軍一年無法前進。'],
            ['頓弱', '（帶著黃金拜訪郭開）趙國若能少一個李牧，大人就多一份富貴。'],
            ['郭開', '大王，李牧、司馬尚手握重兵，暗中與秦國往來，打算謀反！']],
          choices: [
            { label: '聽信讒言', desc: '依照史實：李牧被殺，三個月後邯鄲陷落',
              effects: [{ do: 'die', general: '李牧' }, { do: 'leave', general: '司馬尚' }, { do: 'troops_scale', city: '代', mult: 0.6 },
                { do: 'loyalty', faction: 'zhao', amount: -20 }],
              lines: [['趙遷', '派趙蔥、顏聚去接替他們。'], ['李牧', '我不受命。'],
                ['', '趙王派人暗中逮捕李牧，將他斬殺；司馬尚被罷免。'],
                ['', '三個月後，王翦大破趙軍，趙蔥戰死，邯鄲陷落，趙王遷被俘。']] },
            { label: '斬殺郭開', desc: '不中反間計，李牧繼續守趙',
              effects: [{ do: 'die', general: '郭開' }, { do: 'loyalty_of', generals: ['李牧', '司馬尚'], value: 100 }, { do: 'loyalty', faction: 'zhao', amount: 10 }],
              lines: [['趙遷', '李牧為趙國擋住秦軍多年，你卻要寡人殺他？來人，把郭開拖下去！'],
                ['李牧', '只要李牧還在，秦軍就別想踏進邯鄲一步。'], ['王翦', '（趙王竟然沒有上當……這仗難打了。）']] },
          ],
        },
        {
          id: 'jingke', title: '荊軻刺秦', scene: 'palace',
          cond: { from: [-227, 10], alive: ['qin', 'yan'], general_faction: { 太子丹: 'yan' } },
          effects: [{ do: 'join', general: '荊軻', faction: 'yan', force: true }, { do: 'die', general: '荊軻' }, { do: 'relation', a: 'qin', b: 'yan', state: 'war' },
            { do: 'troops_scale', city: '薊', mult: 0.85 }],
          lines: [['太子丹', '秦國吞併天下的野心永無止境。燕國弱小，只能讓一位勇士劫持秦王。'],
            ['荊軻', '（易水邊，高漸離擊筑，荊軻和歌）風蕭蕭兮易水寒，壯士一去兮不復還！'],
            ['', '咸陽宮中，荊軻獻上督亢地圖。圖窮匕見——荊軻抓住秦王的衣袖，舉起匕首刺去。'],
            ['', '秦王掙斷衣袖，繞著柱子奔逃，終於拔出長劍砍傷荊軻。荊軻倚柱而笑：「事情不成，是因為我想活捉你、逼你立約。」'],
            ['嬴政', '……發兵，伐燕！']],
        },
      ],
    },
    {
      id: '-224', title: '王翦滅楚', year: -224, month: 1, tag: '秦六十萬大軍 對 楚',
      desc: '韓、趙、魏都已滅亡，燕王逃到遼東，趙公子嘉在代地稱王。年輕的李信率二十萬秦軍伐楚，卻被項燕大敗於城父。秦王只好親自去請已經告老的王翦——要滅楚，非六十萬人不可。',
      factions: [['qin', '秦', '嬴政'], ['chu', '楚', '熊負芻'], ['yan', '燕', '姬喜'], ['dai', '代', '趙嘉'], ['qi', '齊', '田建']],
      cities: { 咸陽: ['qin', 50000], 雍: ['qin', 15000], 隴西: ['qin', 12000], 上郡: ['qin', 15000], 南鄭: ['qin', 15000], 成都: ['qin', 25000],
        江州: ['qin', 12000], 函谷: ['qin', 10000], 宛: ['qin', 30000], 江陵: ['qin', 25000], 安邑: ['qin', 20000], 洛陽: ['qin', 25000],
        上黨: ['qin', 15000], 長平: ['qin', 10000], 晉陽: ['qin', 25000], 邯鄲: ['qin', 30000], 新鄭: ['qin', 25000], 大梁: ['qin', 40000],
        陶: ['qin', 20000], 薊: ['qin', 35000], 武陽: ['qin', 15000],
        陳: ['chu', 40000], 壽春: ['chu', 50000], 吳: ['chu', 25000], 會稽: ['chu', 15000], 長沙: ['chu', 18000], 蘭陵: ['chu', 20000],
        遼東: ['yan', 15000], 代: ['dai', 20000], 臨淄: ['qi', 50000], 即墨: ['qi', 18000], 莒: ['qi', 15000], 歷下: ['qi', 22000] },
      people: {
        qin: { 咸陽: '嬴政 李斯 尉繚 頓弱 王翦', 大梁: '李信 蒙恬 蒙武', 薊: '王賁 羌瘣', 邯鄲: '楊端和 內史騰' },
        chu: { 壽春: '熊負芻 李園', 陳: '項燕 昌平君' }, yan: { 遼東: '姬喜 鞠武' }, dai: { 代: '趙嘉' }, qi: { 臨淄: '田建 后勝' },
      },
      strategists: { qin: '尉繚' },
      relations: [['qin', 'chu', 'war'], ['qin', 'yan', 'war'], ['qin', 'dai', 'war'], ['qin', 'qi', 'alliance', 36], ['chu', 'dai', 'alliance', 36]],
      events: [
        {
          id: 'lixin', title: '李信伐楚', scene: 'field',
          cond: { from: [-224, 1], alive: ['qin', 'chu'], general_faction: { 李信: 'qin', 項燕: 'chu' } },
          effects: [{ do: 'troops_scale', city: '大梁', mult: 0.55 }, { do: 'loyalty_of', generals: ['李信'], value: 70 }],
          lines: [['', '（數月前）'], ['嬴政', '寡人想攻取楚國，將軍估計要多少人？'], ['李信', '不過二十萬。'], ['王翦', '非六十萬人不可。'],
            ['嬴政', '王將軍老了，膽子也小了。李將軍果然壯勇。'], ['', '王翦稱病，告老回到頻陽。'],
            ['', '李信、蒙恬攻破平輿與寢，楚軍卻在後面緊追三天三夜不休息。項燕在城父大破秦軍，攻破兩座營壘，殺了七名都尉。']],
        },
        {
          id: 'wangjian_qing', title: '王翦出山', scene: 'palace',
          cond: { from: [-224, 2], alive: ['qin', 'chu'], general_faction: { 王翦: 'qin' }, after: ['lixin'] },
          effects: [{ do: 'relocate', general: '王翦', city: '大梁' }, { do: 'troops', city: '大梁', unit: 'spear', amount: 40000 }, { do: 'loyalty_of', generals: ['王翦'], value: 100 }],
          lines: [['嬴政', '（親自到頻陽）寡人沒有聽將軍的話，李信果然辱沒了秦軍。將軍雖然病了，難道忍心拋下寡人嗎？'],
            ['王翦', '大王一定要用臣，非六十萬人不可。'], ['嬴政', '就聽將軍的。'],
            ['王翦', '（出征前）請大王多賜良田美宅、園池，給子孫置產。'], ['嬴政', '將軍要出征了，還擔心貧窮嗎？'],
            ['王翦', '（對部下）秦王疑心重。我把全國的兵都帶走了，不多要些田宅表示沒有野心，大王反而會懷疑我。']],
        },
        {
          id: 'xiangyan', title: '項燕之死', scene: 'field',
          cond: { from: [-223, 3], alive: ['qin', 'chu'], general_faction: { 項燕: 'chu', 王翦: 'qin' } },
          effects: [{ do: 'die', general: '項燕' }, { do: 'die', general: '昌平君' }, { do: 'troops_scale', city: '陳', mult: 0.4 }, { do: 'loyalty', faction: 'chu', amount: -20 }],
          lines: [['', '王翦率六十萬大軍入楚，卻只是築起堅固的營壘，每天讓士卒洗浴、吃飽，自己也與士卒同食。'],
            ['王翦', '軍中在玩什麼遊戲？'], ['', '「在比投石、跳遠。」'], ['王翦', '好，可以用了。'],
            ['', '楚軍屢次挑戰不成，只好向東撤退。王翦趁機追擊，大破楚軍於蘄南。'],
            ['項燕', '楚國……不會就這樣亡的。'], ['', '項燕與昌平君戰死。後來楚地流傳一句話：「楚雖三戶，亡秦必楚。」']],
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
      if (o && o[2]) Object.assign(c, o[2]);
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
    for (const [n, city] of Object.entries(d.kings || {})) {
      const g = generals.find((x) => x.name === n);
      if (!g || owner[city] !== g.faction) throw new Error(`劇本 ${d.title}：${n} 不能封於 ${city}`);
      g.king = city;
    }
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
