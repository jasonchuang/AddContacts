// 產生劇本資料 data/scenario_190.json 並做完整性檢查。
// 執行：node godot/tools/gen_data.js
// 人物、城市取自公有領域的史實；能力值、公式與事件文字皆為本作原創。
'use strict';
const fs = require('fs');
const path = require('path');

const factions = [
  { id: 'cao', name: '曹操軍', ruler: '曹操', color: '#2f5f8f', heirs: [] },
  { id: 'liu', name: '劉備軍', ruler: '劉備', color: '#3d7a4c', heirs: [] },
  { id: 'sun', name: '孫堅軍', ruler: '孫堅', color: '#b23a2c', heirs: ['孫策', '孫權'] },
  { id: 'yuans', name: '袁紹軍', ruler: '袁紹', color: '#b8892c', heirs: [] },
  { id: 'dong', name: '董卓軍', ruler: '董卓', color: '#5e4280', heirs: ['李傕'] },
  { id: 'liubiao', name: '劉表軍', ruler: '劉表', color: '#2b7a78', heirs: ['蔡瑁'] },
];

const UNITS = ['infantry', 'spear', 'cav', 'archer', 'navy'];
// 勢力兵種傾向（比例）
const MIX = {
  cao: { infantry: 0.3, spear: 0.25, cav: 0.2, archer: 0.25, navy: 0 },
  liu: { infantry: 0.35, spear: 0.3, cav: 0.15, archer: 0.2, navy: 0 },
  sun: { infantry: 0.25, spear: 0.2, cav: 0.05, archer: 0.25, navy: 0.25 },
  yuans: { infantry: 0.3, spear: 0.2, cav: 0.2, archer: 0.3, navy: 0 },
  dong: { infantry: 0.25, spear: 0.2, cav: 0.4, archer: 0.15, navy: 0 },
  liubiao: { infantry: 0.25, spear: 0.2, cav: 0.05, archer: 0.2, navy: 0.3 },
  neutral: { infantry: 0.45, spear: 0.25, cav: 0.05, archer: 0.25, navy: 0 },
  neutral_south: { infantry: 0.35, spear: 0.2, cav: 0, archer: 0.25, navy: 0.2 },
  neutral_west: { infantry: 0.3, spear: 0.2, cav: 0.35, archer: 0.15, navy: 0 },
};

// 城市：名, x, y, 勢力, 兵, 金, 糧, 人口, 農業, 商業, 治安, 城防, 地區
const C = (name, x, y, owner, troops, gold, food, pop, farm, commerce, order, defense, region) =>
  ({ name, x, y, owner, troops, gold, food, pop, farm, commerce, order, defense, region: region || 'central' });
const cities = [
  C('北平', 800, 70, null, 14000, 700, 9000, 260000, 420, 360, 65, 420, 'north'),
  C('南皮', 760, 165, 'yuans', 18000, 900, 12000, 300000, 480, 420, 70, 380),
  C('鄴', 655, 200, 'yuans', 25000, 1500, 18000, 480000, 620, 600, 75, 560),
  C('晉陽', 540, 120, null, 8000, 500, 6000, 220000, 380, 300, 60, 400, 'north'),
  C('平原', 805, 255, 'liu', 9000, 600, 8000, 230000, 400, 340, 80, 300),
  C('北海', 900, 300, null, 6000, 500, 6000, 250000, 420, 380, 60, 300),
  C('濮陽', 705, 305, 'cao', 14000, 800, 10000, 280000, 460, 420, 70, 380),
  C('陳留', 640, 345, 'cao', 18000, 1000, 12000, 320000, 500, 480, 75, 420),
  C('小沛', 772, 338, null, 5000, 400, 5000, 160000, 360, 300, 60, 260),
  C('洛陽', 535, 330, 'dong', 40000, 2000, 25000, 500000, 600, 700, 50, 720),
  C('長安', 375, 340, 'dong', 25000, 1500, 18000, 450000, 580, 620, 55, 680),
  C('天水', 225, 315, null, 10000, 500, 8000, 200000, 380, 300, 65, 380, 'west'),
  C('武威', 130, 195, null, 12000, 500, 8000, 150000, 320, 240, 70, 320, 'west'),
  C('漢中', 330, 450, null, 9000, 600, 9000, 230000, 480, 300, 65, 520, 'west'),
  C('上庸', 425, 470, null, 5000, 400, 5000, 120000, 340, 220, 60, 360),
  C('成都', 195, 580, null, 15000, 1200, 16000, 450000, 720, 520, 65, 600, 'west'),
  C('永安', 325, 570, null, 6000, 400, 6000, 140000, 360, 260, 60, 440, 'south'),
  C('許昌', 640, 420, null, 6000, 600, 7000, 300000, 520, 460, 60, 360),
  C('汝南', 665, 495, null, 9000, 600, 8000, 300000, 520, 400, 55, 380),
  C('壽春', 775, 485, null, 12000, 1000, 11000, 380000, 560, 560, 55, 480),
  C('下邳', 835, 385, null, 9000, 700, 8000, 300000, 480, 460, 60, 420),
  C('宛', 530, 445, null, 7000, 600, 8000, 300000, 520, 420, 60, 380),
  C('襄陽', 515, 540, 'liubiao', 20000, 1300, 16000, 400000, 620, 580, 80, 600, 'south'),
  C('江陵', 430, 615, 'liubiao', 12000, 900, 12000, 300000, 600, 440, 75, 480, 'south'),
  C('江夏', 605, 570, null, 8000, 600, 8000, 220000, 440, 380, 60, 420, 'south'),
  C('長沙', 555, 670, 'sun', 20000, 900, 12000, 260000, 480, 380, 80, 420, 'south'),
  C('柴桑', 690, 620, null, 7000, 500, 7000, 200000, 420, 360, 60, 360, 'south'),
  C('廬江', 748, 560, null, 6000, 500, 7000, 200000, 440, 360, 60, 340, 'south'),
  C('建業', 845, 560, null, 9000, 800, 9000, 320000, 520, 560, 60, 460, 'south'),
  C('會稽', 900, 665, null, 6000, 500, 7000, 220000, 440, 380, 60, 300, 'south'),
];

// 道路：[a, b, 是否水路]
const roads = [
  ['北平', '南皮'], ['南皮', '鄴'], ['南皮', '平原'], ['鄴', '晉陽'], ['鄴', '濮陽'], ['晉陽', '洛陽'],
  ['平原', '北海'], ['平原', '濮陽'], ['北海', '下邳'], ['濮陽', '陳留'], ['濮陽', '小沛'], ['小沛', '下邳'],
  ['陳留', '小沛'], ['陳留', '洛陽'], ['陳留', '許昌'], ['洛陽', '長安'], ['洛陽', '宛'], ['長安', '天水'],
  ['長安', '漢中'], ['天水', '武威'], ['天水', '漢中'], ['漢中', '成都'], ['漢中', '上庸'], ['上庸', '宛'],
  ['上庸', '襄陽'], ['成都', '永安', true], ['永安', '江陵', true], ['許昌', '汝南'], ['許昌', '宛'],
  ['汝南', '壽春'], ['汝南', '江夏'], ['壽春', '下邳'], ['壽春', '廬江'], ['廬江', '柴桑', true],
  ['廬江', '建業', true], ['宛', '襄陽'], ['襄陽', '江陵', true], ['襄陽', '江夏', true], ['江陵', '長沙', true],
  ['江夏', '長沙', true], ['江夏', '柴桑', true], ['長沙', '柴桑'], ['柴桑', '建業', true], ['建業', '會稽'],
  ['下邳', '建業', true],
].map(([a, b, w]) => ({ a, b, water: !!w }));

// 武將：名, 勢力, 城, 統, 武, 智, 政, 魅, 忠
const generals = [];
const G = (name, faction, city, lead, war, int, pol, cha, loyalty) =>
  generals.push({ name, faction, city, lead, war, int, pol, cha, loyalty: faction ? loyalty : 0 });

// 曹操軍
G('曹操', 'cao', '陳留', 92, 72, 90, 92, 94, 100); G('荀彧', 'cao', '陳留', 50, 18, 94, 97, 88, 92);
G('典韋', 'cao', '陳留', 58, 95, 32, 25, 50, 95); G('樂進', 'cao', '陳留', 77, 82, 50, 40, 60, 88);
G('李典', 'cao', '陳留', 75, 72, 70, 65, 68, 86); G('程昱', 'cao', '陳留', 70, 40, 90, 82, 50, 88);
G('夏侯惇', 'cao', '濮陽', 88, 89, 58, 67, 76, 100); G('夏侯淵', 'cao', '濮陽', 87, 90, 54, 52, 70, 100);
G('曹仁', 'cao', '濮陽', 86, 85, 63, 60, 72, 100); G('曹洪', 'cao', '濮陽', 72, 78, 45, 48, 60, 98);
G('于禁', 'cao', '濮陽', 80, 75, 60, 50, 55, 85);
// 劉備軍
G('劉備', 'liu', '平原', 76, 74, 76, 80, 98, 100); G('關羽', 'liu', '平原', 95, 96, 76, 64, 92, 100);
G('張飛', 'liu', '平原', 86, 97, 30, 22, 46, 100); G('簡雍', 'liu', '平原', 30, 30, 65, 72, 80, 95);
G('孫乾', 'liu', '平原', 30, 30, 70, 76, 82, 92);
// 孫堅軍
G('孫堅', 'sun', '長沙', 92, 90, 72, 70, 88, 100); G('孫策', 'sun', '長沙', 92, 94, 70, 66, 92, 100);
G('孫權', 'sun', '長沙', 76, 66, 80, 88, 94, 100); G('程普', 'sun', '長沙', 82, 77, 72, 63, 76, 95);
G('黃蓋', 'sun', '長沙', 79, 82, 66, 58, 70, 96); G('韓當', 'sun', '長沙', 78, 82, 50, 46, 62, 94);
G('朱治', 'sun', '長沙', 70, 66, 62, 70, 70, 92); G('祖茂', 'sun', '長沙', 60, 70, 40, 38, 50, 92);
// 袁紹軍
G('袁紹', 'yuans', '鄴', 80, 68, 72, 74, 88, 100); G('田豐', 'yuans', '鄴', 70, 30, 92, 85, 60, 80);
G('沮授', 'yuans', '鄴', 75, 35, 90, 82, 72, 85); G('審配', 'yuans', '鄴', 74, 60, 72, 78, 62, 90);
G('逢紀', 'yuans', '鄴', 40, 30, 78, 70, 46, 82); G('郭圖', 'yuans', '鄴', 40, 30, 76, 66, 40, 80);
G('顏良', 'yuans', '南皮', 80, 93, 40, 32, 55, 90); G('文醜', 'yuans', '南皮', 79, 92, 30, 30, 50, 90);
G('張郃', 'yuans', '南皮', 88, 87, 68, 54, 64, 72); G('高覽', 'yuans', '南皮', 72, 81, 45, 40, 50, 78);
// 董卓軍
G('董卓', 'dong', '洛陽', 82, 86, 64, 30, 38, 100); G('呂布', 'dong', '洛陽', 96, 100, 26, 16, 40, 60);
G('李儒', 'dong', '洛陽', 40, 30, 88, 70, 30, 95); G('華雄', 'dong', '洛陽', 78, 89, 40, 30, 40, 85);
G('張遼', 'dong', '洛陽', 92, 91, 76, 60, 78, 65); G('徐榮', 'dong', '洛陽', 80, 76, 62, 50, 52, 78);
G('高順', 'dong', '洛陽', 86, 86, 50, 40, 66, 70); G('胡軫', 'dong', '洛陽', 64, 70, 30, 30, 34, 80);
G('李傕', 'dong', '長安', 70, 78, 32, 22, 30, 80); G('郭汜', 'dong', '長安', 68, 76, 30, 20, 28, 80);
G('賈詡', 'dong', '長安', 82, 48, 97, 80, 56, 70); G('牛輔', 'dong', '長安', 60, 66, 30, 30, 30, 90);
// 劉表軍
G('劉表', 'liubiao', '襄陽', 66, 42, 72, 82, 84, 100); G('蔡瑁', 'liubiao', '襄陽', 74, 64, 66, 60, 50, 80);
G('蒯良', 'liubiao', '襄陽', 40, 30, 84, 82, 70, 88); G('蒯越', 'liubiao', '襄陽', 50, 40, 86, 80, 66, 86);
G('張允', 'liubiao', '襄陽', 62, 58, 50, 46, 40, 78); G('黃祖', 'liubiao', '江陵', 70, 70, 50, 48, 46, 88);
G('文聘', 'liubiao', '江陵', 82, 82, 60, 62, 70, 90); G('王威', 'liubiao', '江陵', 64, 66, 56, 50, 56, 86);
// 在野
G('郭嘉', null, '許昌', 60, 20, 98, 80, 70); G('荀攸', null, '宛', 70, 20, 94, 82, 70);
G('許褚', null, '汝南', 66, 96, 30, 22, 48); G('李通', null, '汝南', 72, 76, 56, 50, 66);
G('張勳', null, '汝南', 68, 70, 50, 48, 52); G('徐晃', null, '晉陽', 88, 88, 64, 50, 62);
G('滿寵', null, '小沛', 76, 60, 82, 80, 60); G('臧霸', null, '小沛', 78, 80, 52, 48, 64);
G('張繡', null, '宛', 80, 82, 62, 50, 64); G('胡車兒', null, '宛', 50, 80, 30, 20, 36);
G('徐庶', null, '宛', 72, 64, 92, 82, 80); G('陳宮', null, '下邳', 74, 54, 88, 78, 60);
G('陳登', null, '下邳', 76, 60, 84, 82, 70); G('糜竺', null, '下邳', 30, 30, 60, 84, 80);
G('孔融', null, '北海', 30, 20, 76, 70, 84); G('太史慈', null, '北海', 82, 93, 66, 50, 74);
G('公孫瓚', null, '北平', 84, 84, 60, 52, 72); G('趙雲', null, '北平', 92, 96, 76, 64, 82);
G('袁術', null, '壽春', 66, 62, 60, 50, 60);
G('紀靈', null, '壽春', 76, 83, 50, 42, 56); G('閻象', null, '壽春', 40, 30, 76, 70, 60);
G('周瑜', null, '廬江', 96, 72, 96, 86, 92); G('魯肅', null, '廬江', 80, 54, 92, 90, 86);
G('呂蒙', null, '廬江', 84, 82, 88, 70, 76); G('張昭', null, '建業', 30, 20, 82, 94, 80);
G('張紘', null, '建業', 30, 20, 80, 88, 78); G('周泰', null, '會稽', 72, 90, 38, 30, 58);
G('蔣欽', null, '會稽', 74, 82, 50, 46, 60); G('陸遜', null, '會稽', 92, 70, 96, 88, 86);
G('甘寧', null, '江夏', 82, 92, 66, 32, 56); G('黃忠', null, '長沙', 86, 94, 60, 54, 68);
G('魏延', null, '襄陽', 82, 92, 64, 40, 44); G('諸葛亮', null, '襄陽', 92, 38, 100, 96, 92);
G('龐統', null, '江陵', 70, 34, 97, 84, 60); G('馬騰', null, '武威', 82, 84, 50, 52, 82);
G('馬超', null, '武威', 88, 97, 40, 30, 82); G('韓遂', null, '武威', 76, 74, 72, 66, 64);
G('龐德', null, '天水', 82, 92, 66, 60, 72); G('馬岱', null, '天水', 74, 80, 50, 46, 62);
G('劉璋', null, '成都', 40, 30, 50, 58, 66); G('法正', null, '成都', 76, 50, 94, 80, 50);
G('張任', null, '成都', 84, 84, 72, 50, 60); G('黃權', null, '成都', 74, 58, 82, 76, 70);
G('李嚴', null, '永安', 82, 76, 78, 80, 56); G('嚴顏', null, '永安', 80, 82, 66, 56, 70);
G('王平', null, '漢中', 80, 76, 70, 50, 60);

// 兵種適性（未列者由規則依能力推得）。依史書、演義中的公有領域描述設定。
const APT = {
  趙雲: { spear: 'S', cav: 'A' }, 張飛: { spear: 'S', cav: 'A' }, 關羽: { cav: 'S', spear: 'A', navy: 'B' },
  馬超: { cav: 'S', spear: 'A' }, 呂布: { cav: 'S', spear: 'A' }, 張遼: { cav: 'S', spear: 'A' },
  公孫瓚: { cav: 'S', archer: 'B' }, 馬騰: { cav: 'A' }, 龐德: { cav: 'A', spear: 'A' }, 韓遂: { cav: 'A' }, 馬岱: { cav: 'A' },
  夏侯淵: { cav: 'S', archer: 'A' }, 夏侯惇: { spear: 'A', cav: 'A' }, 曹仁: { infantry: 'S', spear: 'A' },
  曹操: { cav: 'A', archer: 'A', spear: 'A', infantry: 'A' }, 典韋: { infantry: 'S', spear: 'A' }, 許褚: { infantry: 'S', spear: 'A' },
  樂進: { infantry: 'A', spear: 'A' }, 于禁: { infantry: 'S' }, 徐晃: { spear: 'A', cav: 'A' }, 高順: { infantry: 'S', spear: 'A' },
  黃忠: { archer: 'S', spear: 'A' }, 太史慈: { archer: 'S', cav: 'A' }, 諸葛亮: { archer: 'S', infantry: 'A' },
  周瑜: { navy: 'S', archer: 'A' }, 甘寧: { navy: 'S', archer: 'A' }, 黃蓋: { navy: 'A', infantry: 'A' },
  程普: { navy: 'A', spear: 'A' }, 韓當: { navy: 'A', cav: 'A' }, 呂蒙: { navy: 'S', infantry: 'A' }, 陸遜: { navy: 'S', archer: 'S' },
  周泰: { navy: 'A', infantry: 'A' }, 蔣欽: { navy: 'A' }, 魯肅: { navy: 'A' },
  孫堅: { infantry: 'A', spear: 'A', navy: 'A' }, 孫策: { cav: 'S', spear: 'A', navy: 'A' }, 孫權: { navy: 'A' },
  蔡瑁: { navy: 'S' }, 張允: { navy: 'A' }, 文聘: { navy: 'A', archer: 'A' }, 黃祖: { navy: 'A', archer: 'A' },
  顏良: { cav: 'A', spear: 'A' }, 文醜: { cav: 'A' }, 張郃: { spear: 'S', archer: 'A' }, 高覽: { spear: 'A' },
  袁紹: { archer: 'A' }, 華雄: { cav: 'A' }, 董卓: { cav: 'A' }, 徐榮: { cav: 'A' }, 李傕: { cav: 'A' }, 郭汜: { cav: 'A' },
  紀靈: { spear: 'A' }, 魏延: { spear: 'A', infantry: 'A' }, 嚴顏: { archer: 'A', spear: 'A' }, 張任: { archer: 'A' },
  李嚴: { infantry: 'A' }, 王平: { infantry: 'A', archer: 'A' }, 張繡: { cav: 'A', spear: 'A' }, 臧霸: { infantry: 'A' },
};

// 肖像特徵（Q 版）。依史書、演義描述；造型為原創。
const LOOK = {
  黃忠: { age: 'old', hair: 'white', beard: 'long', hat: 'helmet', weapon: 'bow', eyes: 'fierce', title: '老當益壯' },
  關羽: { skin: 'red', beard: 'long', hat: 'headband', band: '#2e7d32', weapon: 'glaive', eyes: 'calm', title: '美髯公' },
  張飛: { skin: 'dark', beard: 'full', hat: 'helmet', weapon: 'snake', eyes: 'fierce', title: '萬人之敵' },
  趙雲: { age: 'young', beard: 'none', hat: 'helmet', armor: '#dfe6ea', weapon: 'spear', eyes: 'calm', title: '一身是膽' },
  呂布: { beard: 'none', hat: 'feather', weapon: 'halberd', eyes: 'fierce', title: '飛將' },
  諸葛亮: { beard: 'long', hat: 'scholar', robe: true, weapon: 'fan', eyes: 'calm', title: '臥龍' },
  龐統: { beard: 'full', hat: 'scholar', robe: true, weapon: 'scroll', eyes: 'sly', title: '鳳雛' },
  夏侯惇: { beard: 'short', hat: 'helmet', weapon: 'spear', eyes: 'fierce', patch: true, title: '獨眼將軍' },
  典韋: { skin: 'tan', beard: 'full', hat: 'headband', weapon: 'axe', eyes: 'fierce', title: '古之惡來' },
  許褚: { skin: 'tan', beard: 'full', hat: 'bald', weapon: 'axe', eyes: 'fierce', title: '虎痴' },
  曹操: { beard: 'short', hat: 'crown', weapon: 'sword', eyes: 'sly', title: '治世能臣' },
  劉備: { beard: 'short', hat: 'crown', weapon: 'twin', eyes: 'calm', title: '仁德之君' },
  孫堅: { beard: 'short', hat: 'headband', band: '#c0392b', weapon: 'sword', eyes: 'fierce', title: '江東猛虎' },
  孫策: { age: 'young', beard: 'none', hat: 'helmet', weapon: 'spear', eyes: 'fierce', title: '小霸王' },
  孫權: { age: 'young', beard: 'mustache', hat: 'crown', weapon: 'sword', eyes: 'calm', eyeColor: '#2e86c1', title: '碧眼兒' },
  周瑜: { age: 'young', beard: 'none', hat: 'crown', weapon: 'sword', eyes: 'calm', title: '美周郎' },
  陸遜: { age: 'young', beard: 'none', hat: 'scholar', weapon: 'sword', eyes: 'calm', title: '書生都督' },
  呂蒙: { beard: 'short', hat: 'helmet', weapon: 'glaive', eyes: 'calm', title: '士別三日' },
  董卓: { fat: true, beard: 'full', hat: 'crown', weapon: 'sword', eyes: 'sly', title: '魔王' },
  馬超: { age: 'young', beard: 'none', hat: 'helmet', armor: '#dfe6ea', weapon: 'spear', eyes: 'fierce', title: '錦馬超' },
  太史慈: { beard: 'short', hat: 'helmet', weapon: 'bow', eyes: 'fierce', title: '神射' },
  甘寧: { beard: 'mustache', hat: 'headband', band: '#8e44ad', weapon: 'sword', eyes: 'fierce', title: '錦帆賊' },
  嚴顏: { age: 'old', hair: 'white', beard: 'long', hat: 'helmet', weapon: 'glaive', eyes: 'fierce', title: '老將' },
  程普: { age: 'old', hair: 'grey', beard: 'long', hat: 'helmet', weapon: 'spear', eyes: 'calm' },
  黃蓋: { age: 'old', hair: 'grey', beard: 'full', hat: 'helmet', weapon: 'axe', eyes: 'fierce' },
  魏延: { skin: 'tan', beard: 'short', hat: 'helmet', weapon: 'glaive', eyes: 'fierce' },
  張遼: { beard: 'short', hat: 'helmet', weapon: 'glaive', eyes: 'fierce', title: '威震逍遙' },
  郭嘉: { age: 'young', beard: 'none', hat: 'scholar', robe: true, weapon: 'scroll', eyes: 'sly', title: '鬼才' },
  賈詡: { beard: 'goatee', hat: 'scholar', robe: true, weapon: 'scroll', eyes: 'sly', title: '毒士' },
  公孫瓚: { beard: 'short', hat: 'helmet', armor: '#ecf0f1', weapon: 'spear', eyes: 'fierce', title: '白馬將軍' },
  袁紹: { beard: 'mustache', hat: 'crown', weapon: 'sword', eyes: 'calm' },
  袁術: { beard: 'mustache', hat: 'crown', weapon: 'sword', eyes: 'sly' },
  馬騰: { beard: 'long', hat: 'helmet', weapon: 'spear', eyes: 'calm' },
  劉表: { age: 'old', hair: 'grey', beard: 'long', hat: 'crown', weapon: 'scroll', robe: true, eyes: 'calm' },
  高順: { beard: 'short', hat: 'helmet', weapon: 'spear', eyes: 'calm', title: '陷陣' },
  張昭: { age: 'old', hair: 'white', beard: 'long', hat: 'scholar', robe: true, weapon: 'scroll', eyes: 'calm' },
};

const SOUTH = new Set(cities.filter((c) => c.region === 'south').map((c) => c.name));
for (const g of generals) {
  g.apt = Object.assign({}, APT[g.name] || {});
  // 南方出身者預設水軍 B
  if (!g.apt.navy && (g.faction === 'sun' || g.faction === 'liubiao' || (!g.faction && SOUTH.has(g.city)))) g.apt.navy = 'B';
  if (LOOK[g.name]) g.look = LOOK[g.name];
  g.ruler = factions.some((f) => f.ruler === g.name);
  g.status = g.faction ? 'active' : 'free';
  g.hidden = !g.faction;
}

// 城市兵種組成
function splitTroops(c) {
  const key = c.owner || (c.region === 'south' ? 'neutral_south' : c.region === 'west' ? 'neutral_west' : 'neutral');
  const r = MIX[key];
  const out = {};
  let acc = 0;
  for (const u of UNITS) { out[u] = Math.floor(c.troops * r[u] / 100) * 100; acc += out[u]; }
  out.infantry += c.troops - acc;
  return out;
}
for (const c of cities) { c.units = splitTroops(c); delete c.troops; c.train = c.owner ? 50 : 40; }

// ---------- 歷史事件 ----------
// cond：所有條件須成立。effects：依序執行。lines：事件對話（原創文字）。
const events = [
  {
    id: 'coalition', title: '反董卓聯盟', historical: true,
    cond: { from: [190, 1], until: [190, 3], alive: ['dong'] },
    effects: [{ do: 'coalition_against', faction: 'dong' }],
    lines: [
      { speaker: '曹操', text: '董卓廢立天子、焚掠百姓，天下共憤。各路諸侯，願同舉義兵！' },
      { speaker: '袁紹', text: '我袁家四世三公，願為盟主，號令諸軍討賊。' },
    ],
  },
  {
    id: 'oath', title: '桃園之誓', historical: true,
    cond: { from: [190, 1], until: [190, 3], alive: ['liu'], general_faction: { 關羽: 'liu', 張飛: 'liu' } },
    effects: [{ do: 'loyalty_of', generals: ['關羽', '張飛'], value: 100 }, { do: 'loyalty', faction: 'liu', amount: 5 }],
    lines: [
      { speaker: '劉備', text: '你我三人雖非同姓，願結為兄弟，同心協力，上報國家，下安黎民。' },
      { speaker: '關羽', text: '此生願隨兄長，絕無二心。' },
      { speaker: '張飛', text: '哈哈！從今以後，誰欺負大哥，就是跟我張飛過不去！' },
    ],
  },
  {
    id: 'capital_move', title: '遷都長安', historical: true,
    cond: { from: [190, 3], until: [191, 12], alive: ['dong'], owns: { dong: ['洛陽', '長安'] } },
    effects: [
      { do: 'city_scale', city: '洛陽', field: 'commerce', mult: 0.5 },
      { do: 'city_scale', city: '洛陽', field: 'pop', mult: 0.6 },
      { do: 'city_add', city: '長安', field: 'gold', amount: 1500 },
    ],
    lines: [
      { speaker: '李儒', text: '關東諸侯勢大，洛陽難守。不如遷都長安，依山河之險。' },
      { speaker: '董卓', text: '好！把洛陽的財寶全運走，百姓也一併遷去！' },
    ],
  },
  {
    id: 'seal', title: '傳國玉璽', historical: true,
    cond: { from: [190, 6], alive: ['sun'], near: { faction: 'sun', city: '洛陽' }, city_owner_not: { 洛陽: 'dong' }, chance: 0.3 },
    effects: [{ do: 'gold', faction: 'sun', amount: 500 }, { do: 'loyalty', faction: 'sun', amount: 5 }],
    lines: [
      { speaker: '程普', text: '主公，在宮中井裡撈出一方玉印，上面刻著篆字……' },
      { speaker: '孫堅', text: '這是傳國玉璽！此事萬萬不可外傳。' },
    ],
  },
  {
    id: 'dong_falls', title: '董卓之死', historical: true,
    cond: { from: [192, 4], alive: ['dong'], general_faction: { 董卓: 'dong', 呂布: 'dong' } },
    effects: [{ do: 'ruler_dies', faction: 'dong' }, { do: 'leave', general: '呂布' }, { do: 'leave', general: '張遼' }, { do: 'leave', general: '高順' }],
    lines: [
      { speaker: '呂布', text: '義父？哼……我奉詔討賊，今日便是你的死期！' },
      { speaker: '董卓', text: '奉先，你竟敢——！' },
    ],
  },
  {
    id: 'qingzhou', title: '收編青州兵', historical: true,
    cond: { from: [192, 1], until: [193, 12], alive: ['cao'], owns: { cao: ['濮陽'] } },
    effects: [{ do: 'troops', city: '濮陽', unit: 'infantry', amount: 12000 }],
    lines: [
      { speaker: '荀彧', text: '黃巾餘黨數十萬已歸降，可挑選精壯編為一軍。' },
      { speaker: '曹操', text: '就稱他們為「青州兵」吧，好好操練。' },
    ],
  },
  {
    id: 'xuzhou', title: '陶謙讓徐州', historical: true,
    cond: { from: [194, 1], until: [196, 12], alive: ['liu'], neutral_city: '下邳', near: { faction: 'liu', city: '下邳' } },
    effects: [
      { do: 'give_city', city: '下邳', faction: 'liu', units: { infantry: 5000, spear: 3000, archer: 2000 } },
      { do: 'join', general: '糜竺', faction: 'liu' }, { do: 'join', general: '陳登', faction: 'liu' },
    ],
    lines: [
      { speaker: '糜竺', text: '陶使君臨終前再三囑咐，徐州非劉玄德不能保全。' },
      { speaker: '劉備', text: '既然百姓相託，劉備只能勉力承擔。' },
    ],
  },
  {
    id: 'sun_ce', title: '孫策渡江', historical: true,
    cond: { from: [195, 1], alive: ['sun'], general_faction: { 孫策: 'sun' }, general_free: ['周瑜'] },
    effects: [{ do: 'join', general: '周瑜', faction: 'sun' }, { do: 'gold', faction: 'sun', amount: 500 }],
    lines: [
      { speaker: '周瑜', text: '伯符，江東之地正待英雄。我願率部相助！' },
      { speaker: '孫策', text: '有公瑾在，何愁大事不成！' },
    ],
  },
  {
    id: 'emperor', title: '奉迎天子', historical: true,
    cond: { from: [196, 1], alive: ['cao'], owns: { cao: ['許昌'] } },
    effects: [{ do: 'gold', faction: 'cao', amount: 1000 }, { do: 'loyalty', faction: 'cao', amount: 8 }],
    lines: [
      { speaker: '荀彧', text: '天子流離在外，主公若能迎奉至許昌，便可號令天下。' },
      { speaker: '曹操', text: '正合我意。即刻派兵迎駕！' },
    ],
  },
  {
    id: 'zhang_xiu', title: '張繡歸降', historical: true,
    cond: { from: [197, 1], alive: ['cao'], general_free: ['張繡'], near: { faction: 'cao', city: '宛' } },
    effects: [{ do: 'join', general: '張繡', faction: 'cao' }, { do: 'join', general: '胡車兒', faction: 'cao' }],
    lines: [{ speaker: '張繡', text: '過去多有得罪……今日願率部歸順曹公。' }, { speaker: '曹操', text: '前事不提。將軍來得正好！' }],
  },
  {
    id: 'heroes', title: '煮酒論英雄', historical: true,
    cond: { from: [197, 1], until: [199, 12], alive: ['cao', 'liu'], adjacent_factions: ['cao', 'liu'], chance: 0.4 },
    effects: [{ do: 'relation', a: 'cao', b: 'liu', state: 'truce', months: 6 }, { do: 'gold', faction: 'liu', amount: 300 }],
    lines: [
      { speaker: '曹操', text: '當今天下，誰可稱英雄？依我看，只有你我二人。' },
      { speaker: '劉備', text: '（手中筷子掉落）……方才雷聲大作，嚇了一跳，讓丞相見笑了。' },
    ],
  },
  {
    id: 'guandu', title: '官渡對峙', historical: true,
    cond: { from: [199, 6], alive: ['cao', 'yuans'], adjacent_factions: ['cao', 'yuans'] },
    effects: [{ do: 'relation', a: 'cao', b: 'yuans', state: 'war' }, { do: 'gold', faction: 'yuans', amount: 800 }],
    lines: [
      { speaker: '袁紹', text: '曹阿瞞不過一介宦官之後，我率十萬大軍南下，定叫他灰飛煙滅！' },
      { speaker: '沮授', text: '主公，曹軍糧少而精，宜持久消耗，不可急戰。' },
    ],
  },
  {
    id: 'return', title: '千里尋兄', historical: true,
    cond: { from: [190, 6], alive: ['liu'], general_elsewhere: { 關羽: 'liu' } },
    effects: [{ do: 'join', general: '關羽', faction: 'liu', force: true }],
    lines: [
      { speaker: '關羽', text: '受人之恩，已經報答。如今得知兄長下落，縱有千里，也要前去相會！' },
    ],
  },
  {
    id: 'three_visits', title: '三顧茅廬', historical: true,
    cond: { from: [195, 1], alive: ['liu'], general_free: ['諸葛亮'], near: { faction: 'liu', city: '襄陽' } },
    effects: [{ do: 'join', general: '諸葛亮', faction: 'liu' }],
    lines: [
      { speaker: '劉備', text: '劉備三度登門，只盼先生出山，共扶漢室。' },
      { speaker: '諸葛亮', text: '將軍誠意至此，亮願效犬馬之勞。依我之見，天下大勢可三分……' },
    ],
  },
  {
    id: 'zilong', title: '子龍來投', historical: true,
    cond: { from: [191, 6], alive: ['liu'], general_free: ['趙雲'], chance: 0.25 },
    effects: [{ do: 'join', general: '趙雲', faction: 'liu' }],
    lines: [{ speaker: '趙雲', text: '常山趙子龍，久仰劉使君仁德，特來投效！' }, { speaker: '劉備', text: '得子龍相助，如虎添翼！' }],
  },
  {
    id: 'liubiao_dies', title: '劉表病逝', historical: true,
    cond: { from: [207, 1], alive: ['liubiao'], general_faction: { 劉表: 'liubiao' }, chance: 0.15 },
    effects: [{ do: 'ruler_dies', faction: 'liubiao' }],
    lines: [{ speaker: '蒯越', text: '主公病重不起……荊州今後該何去何從？' }],
  },
  {
    id: 'alliance', title: '孫劉同盟', historical: true,
    cond: { from: [205, 1], alive: ['cao', 'sun', 'liu'], cities_at_least: { cao: 10 } },
    effects: [{ do: 'relation', a: 'sun', b: 'liu', state: 'alliance' }],
    lines: [
      { speaker: '魯肅', text: '北方強敵壓境，孫劉兩家唯有聯手，方能自保。' },
      { speaker: '諸葛亮', text: '正是。兩家同心，必能以少勝多。' },
    ],
  },
  {
    id: 'taishi', title: '太史慈歸吳', historical: true,
    cond: { from: [194, 1], alive: ['sun'], general_free: ['太史慈'], general_faction: { 孫策: 'sun' }, chance: 0.3 },
    effects: [{ do: 'join', general: '太史慈', faction: 'sun' }],
    lines: [{ speaker: '孫策', text: '你我一場惡戰不分勝負，正是英雄相惜。可願助我？' }, { speaker: '太史慈', text: '大丈夫生於亂世，當帶三尺劍立不世之功。願隨將軍！' }],
  },
  {
    id: 'locusts', title: '蝗災', historical: false, repeat: true, cooldown: 24,
    cond: { month: 6, chance: 0.1 },
    effects: [{ do: 'harvest_mult', mult: 0.5 }],
    lines: [{ speaker: '', text: '各地蝗蟲蔽天，今年秋收恐怕只有往年的一半。' }],
  },
  {
    id: 'bumper', title: '豐年', historical: false, repeat: true, cooldown: 24,
    cond: { month: 6, chance: 0.1 },
    effects: [{ do: 'harvest_mult', mult: 1.4 }],
    lines: [{ speaker: '', text: '風調雨順，今年各地可望豐收。' }],
  },
];

// ---------- 地形（地圖繪製用，座標系 1000×720） ----------
const terrain = {
  coast: [[930, -10], [950, 70], [985, 150], [952, 228], [990, 296], [958, 352], [978, 420], [938, 472], [962, 525], [992, 596], [958, 655], [985, 730]],
  rivers: [
    { name: '黃河', label: [455, 300], points: [[-10, 252], [60, 238], [120, 232], [180, 244], [230, 262], [290, 276], [330, 284], [380, 298], [430, 310], [470, 312], [520, 295], [560, 270], [610, 252], [660, 242], [700, 238], [750, 250], [790, 258], [840, 252], [900, 242], [940, 230], [960, 222]] },
    { name: '長江', label: [250, 600], points: [[40, 515], [100, 530], [150, 548], [210, 568], [270, 590], [330, 594], [380, 592], [430, 598], [480, 606], [520, 612], [570, 606], [610, 598], [660, 584], [720, 560], [760, 554], [800, 552], [860, 548], [920, 550], [975, 552]] },
    { name: '', label: null, points: [[330, 450], [390, 480], [450, 520], [520, 545], [600, 568]] },
  ],
  mountains: [
    [600, 160, 60, 46], [628, 128, 44, 34], [585, 252, 40, 30], [470, 205, 52, 38], [445, 250, 40, 30],
    [295, 400, 70, 52], [350, 392, 52, 40], [440, 405, 50, 40], [262, 480, 58, 44], [292, 528, 46, 34],
    [110, 470, 56, 42], [88, 545, 62, 46], [95, 330, 64, 48], [65, 120, 60, 44], [250, 120, 56, 40],
    [300, 160, 40, 28], [700, 112, 46, 32], [640, 650, 46, 30], [470, 690, 40, 26],
  ],
};

const scenario = {
  id: 'y190', title: '群雄割據', year: 190, month: 1,
  description: '董卓專權，關東諸侯起兵。群雄各據一方，天下即將大亂。',
  factions, cities, roads, generals, events, terrain,
};

// ---------- 完整性檢查 ----------
const errors = [];
const cityNames = new Set(cities.map((c) => c.name));
const genNames = new Set();
const fids = new Set(factions.map((f) => f.id));
for (const g of generals) {
  if (genNames.has(g.name)) errors.push(`武將重複：${g.name}`);
  genNames.add(g.name);
  if (!cityNames.has(g.city)) errors.push(`${g.name} 所在城不存在：${g.city}`);
  if (g.faction && !fids.has(g.faction)) errors.push(`${g.name} 勢力不存在`);
  if (g.faction) {
    const c = cities.find((x) => x.name === g.city);
    if (c.owner !== g.faction) errors.push(`${g.name} 不在己方城`);
  }
  for (const k of ['lead', 'war', 'int', 'pol', 'cha']) if (!(g[k] >= 1 && g[k] <= 100)) errors.push(`${g.name}.${k}`);
  for (const [u, v] of Object.entries(g.apt)) if (!UNITS.includes(u) || !'SABC'.includes(v)) errors.push(`${g.name} 適性錯誤 ${u}=${v}`);
}
for (const f of factions) {
  const r = generals.find((g) => g.name === f.ruler);
  if (!r || r.faction !== f.id) errors.push(`${f.id} 君主錯誤`);
  for (const h of f.heirs) if (!genNames.has(h)) errors.push(`${f.id} 繼承人不存在：${h}`);
  if (!cities.some((c) => c.owner === f.id)) errors.push(`${f.id} 沒有城`);
}
for (const r of roads) for (const k of ['a', 'b']) if (!cityNames.has(r[k])) errors.push(`道路城市不存在：${r[k]}`);
const adj = {};
for (const r of roads) { (adj[r.a] = adj[r.a] || []).push(r.b); (adj[r.b] = adj[r.b] || []).push(r.a); }
// 連通性
const seen = new Set([cities[0].name]); const q = [cities[0].name];
while (q.length) { for (const n of adj[q.shift()] || []) if (!seen.has(n)) { seen.add(n); q.push(n); } }
if (seen.size !== cities.length) errors.push(`地圖不連通：${cities.filter((c) => !seen.has(c.name)).map((c) => c.name)}`);
// 事件引用
const COND_KEYS = new Set(['from', 'until', 'month', 'alive', 'owns', 'near', 'neutral_city', 'city_owner_not', 'general_faction', 'general_free', 'general_elsewhere', 'cities_at_least', 'adjacent_factions', 'chance']);
const DO_KEYS = new Set(['coalition_against', 'loyalty_of', 'loyalty', 'city_scale', 'city_add', 'gold', 'ruler_dies', 'leave', 'troops', 'give_city', 'join', 'relation', 'harvest_mult']);
const checkGen = (n, ev) => { if (!genNames.has(n)) errors.push(`事件 ${ev} 引用不存在的武將 ${n}`); };
const checkCity = (n, ev) => { if (!cityNames.has(n)) errors.push(`事件 ${ev} 引用不存在的城 ${n}`); };
const checkF = (n, ev) => { if (!fids.has(n)) errors.push(`事件 ${ev} 引用不存在的勢力 ${n}`); };
for (const e of events) {
  for (const k of Object.keys(e.cond)) if (!COND_KEYS.has(k)) errors.push(`事件 ${e.id} 未知條件 ${k}`);
  (e.cond.alive || []).forEach((f) => checkF(f, e.id));
  for (const [f, cs] of Object.entries(e.cond.owns || {})) { checkF(f, e.id); cs.forEach((c) => checkCity(c, e.id)); }
  if (e.cond.near) { checkF(e.cond.near.faction, e.id); checkCity(e.cond.near.city, e.id); }
  if (e.cond.neutral_city) checkCity(e.cond.neutral_city, e.id);
  for (const [c, f] of Object.entries(e.cond.city_owner_not || {})) { checkCity(c, e.id); checkF(f, e.id); }
  for (const [g, f] of Object.entries(e.cond.general_faction || {})) { checkGen(g, e.id); checkF(f, e.id); }
  for (const [g, f] of Object.entries(e.cond.general_elsewhere || {})) { checkGen(g, e.id); checkF(f, e.id); }
  (e.cond.general_free || []).forEach((g) => checkGen(g, e.id));
  (e.cond.adjacent_factions || []).forEach((f) => checkF(f, e.id));
  for (const f of Object.keys(e.cond.cities_at_least || {})) checkF(f, e.id);
  for (const x of e.effects) {
    if (!DO_KEYS.has(x.do)) errors.push(`事件 ${e.id} 未知效果 ${x.do}`);
    if (x.faction) checkF(x.faction, e.id);
    if (x.a) checkF(x.a, e.id);
    if (x.b) checkF(x.b, e.id);
    if (x.city) checkCity(x.city, e.id);
    if (x.general) checkGen(x.general, e.id);
    (x.generals || []).forEach((g) => checkGen(g, e.id));
    for (const u of Object.keys(x.units || {})) if (!UNITS.includes(u)) errors.push(`事件 ${e.id} 兵種錯誤 ${u}`);
    if (x.unit && !UNITS.includes(x.unit)) errors.push(`事件 ${e.id} 兵種錯誤 ${x.unit}`);
  }
  for (const l of e.lines) if (l.speaker && !genNames.has(l.speaker)) errors.push(`事件 ${e.id} 說話者不存在 ${l.speaker}`);
}

const expect = { cities: 30, factions: 6, generals: 100, events: 20 };
const got = { cities: cities.length, factions: factions.length, generals: generals.length, events: events.length };
for (const k of Object.keys(expect)) if (expect[k] !== got[k]) errors.push(`${k} 數量應為 ${expect[k]}，實際 ${got[k]}`);

if (errors.length) { console.error('資料錯誤：\n' + errors.join('\n')); process.exit(1); }
const out = path.join(__dirname, '..', 'data', 'scenario_190.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(scenario, null, 1));
console.log(`已輸出 ${path.relative(process.cwd(), out)}：城 ${got.cities}、勢力 ${got.factions}、武將 ${got.generals}（在野 ${generals.filter((g) => !g.faction).length}）、道路 ${roads.length}（水路 ${roads.filter((r) => r.water).length}）、事件 ${got.events}`);
