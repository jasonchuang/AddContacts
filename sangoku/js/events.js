/* 歷史事件：依條件觸發，執行效果並以對話演出。事件文字為本作原創。
 * 自由模式只會發生非歷史事件（蝗災、豐年）。 */
(function (TK) {
  'use strict';
  const E = () => TK.Engine;
  const D = () => TK.Diplomacy;

  const EVENTS = [
    {
      id: 'coalition', title: '反董卓聯盟', historical: true,
      cond: { from: [190, 1], until: [190, 3], alive: ['dong'] },
      effects: [{ do: 'coalition_against', faction: 'dong' }],
      lines: [['曹操', '董卓廢立天子、焚掠百姓，天下共憤。各路諸侯，願同舉義兵！'], ['袁紹', '我袁家四世三公，願為盟主，號令諸軍討賊。']],
    },
    {
      id: 'oath', title: '桃園之誓', historical: true,
      cond: { from: [190, 1], until: [190, 3], alive: ['liu'], general_faction: { 關羽: 'liu', 張飛: 'liu' } },
      effects: [{ do: 'loyalty_of', generals: ['關羽', '張飛'], value: 100 }, { do: 'loyalty', faction: 'liu', amount: 5 }],
      lines: [['劉備', '你我三人雖非同姓，願結為兄弟，同心協力，上報國家，下安黎民。'], ['關羽', '此生願隨兄長，絕無二心。'], ['張飛', '哈哈！從今以後，誰欺負大哥，就是跟我張飛過不去！']],
    },
    {
      id: 'capital_move', title: '遷都長安', historical: true,
      cond: { from: [190, 3], until: [191, 12], alive: ['dong'], owns: { dong: ['洛陽', '長安'] } },
      effects: [{ do: 'city_scale', city: '洛陽', field: 'commerce', mult: 0.5 }, { do: 'city_scale', city: '洛陽', field: 'pop', mult: 0.6 }, { do: 'city_add', city: '長安', field: 'gold', amount: 1500 }],
      lines: [['李儒', '關東諸侯勢大，洛陽難守。不如遷都長安，依山河之險。'], ['董卓', '好！把洛陽的財寶全運走，百姓也一併遷去！']],
    },
    {
      id: 'seal', title: '傳國玉璽', historical: true,
      cond: { from: [190, 6], alive: ['sun'], near: ['sun', '洛陽'], city_owner_not: { 洛陽: 'dong' }, chance: 0.3 },
      effects: [{ do: 'gold', faction: 'sun', amount: 500 }, { do: 'loyalty', faction: 'sun', amount: 5 }],
      lines: [['程普', '主公，在宮中井裡撈出一方玉印，上面刻著篆字……'], ['孫堅', '這是傳國玉璽！此事萬萬不可外傳。']],
    },
    {
      id: 'dong_falls', title: '董卓之死', historical: true,
      cond: { from: [192, 4], alive: ['dong'], general_faction: { 董卓: 'dong', 呂布: 'dong' } },
      effects: [{ do: 'ruler_dies', faction: 'dong' }, { do: 'leave', general: '呂布' }, { do: 'leave', general: '張遼' }],
      lines: [['呂布', '義父？哼……我奉詔討賊，今日便是你的死期！'], ['董卓', '奉先，你竟敢——！']],
    },
    {
      id: 'qingzhou', title: '收編青州兵', historical: true,
      cond: { from: [192, 1], until: [193, 12], alive: ['cao'], owns: { cao: ['濮陽'] } },
      effects: [{ do: 'troops', city: '濮陽', unit: 'spear', amount: 12000 }],
      lines: [['荀彧', '黃巾餘黨數十萬已歸降，可挑選精壯編為一軍。'], ['曹操', '就稱他們為「青州兵」吧，好好操練。']],
    },
    {
      id: 'xuzhou', title: '陶謙讓徐州', historical: true,
      cond: { from: [194, 1], until: [196, 12], alive: ['liu'], neutral_city: '下邳', near: ['liu', '下邳'] },
      effects: [{ do: 'give_city', city: '下邳', faction: 'liu', units: { spear: 5000, xbow: 3000 } }, { do: 'join', general: '糜竺', faction: 'liu' }],
      lines: [['糜竺', '陶使君臨終前再三囑咐，徐州非劉玄德不能保全。'], ['劉備', '既然百姓相託，劉備只能勉力承擔。']],
    },
    {
      id: 'sun_ce', title: '孫策渡江', historical: true,
      cond: { from: [195, 1], alive: ['sun'], general_faction: { 孫策: 'sun' }, general_free: ['周瑜'] },
      effects: [{ do: 'join', general: '周瑜', faction: 'sun' }, { do: 'gold', faction: 'sun', amount: 500 }],
      lines: [['周瑜', '伯符，江東之地正待英雄。我願率部相助！'], ['孫策', '有公瑾在，何愁大事不成！']],
    },
    {
      id: 'emperor', title: '奉迎天子', historical: true,
      cond: { from: [196, 1], alive: ['cao'], owns: { cao: ['許昌'] } },
      effects: [{ do: 'gold', faction: 'cao', amount: 1000 }, { do: 'loyalty', faction: 'cao', amount: 8 }],
      lines: [['荀彧', '天子流離在外，主公若能迎奉至許昌，便可號令天下。'], ['曹操', '正合我意。即刻派兵迎駕！']],
    },
    {
      id: 'heroes', title: '煮酒論英雄', historical: true,
      cond: { from: [197, 1], until: [199, 12], alive: ['cao', 'liu'], adjacent_factions: ['cao', 'liu'], chance: 0.4 },
      effects: [{ do: 'relation', a: 'cao', b: 'liu', state: 'truce', months: 6 }, { do: 'gold', faction: 'liu', amount: 300 }],
      lines: [['曹操', '當今天下，誰可稱英雄？依我看，只有你我二人。'], ['劉備', '（手中筷子掉落）……方才雷聲大作，嚇了一跳，讓您見笑了。']],
    },
    {
      id: 'guandu', title: '官渡對峙', historical: true,
      cond: { from: [199, 6], alive: ['cao', 'yuans'], adjacent_factions: ['cao', 'yuans'] },
      effects: [{ do: 'relation', a: 'cao', b: 'yuans', state: 'war' }, { do: 'gold', faction: 'yuans', amount: 800 }],
      lines: [['袁紹', '曹阿瞞不過一介宦官之後，我率大軍南下，定叫他灰飛煙滅！'], ['沮授', '主公，曹軍糧少而精，宜持久消耗，不可急戰。']],
    },
    {
      id: 'return', title: '千里尋兄', historical: true,
      cond: { from: [190, 6], alive: ['liu'], general_elsewhere: { 關羽: 'liu' } },
      effects: [{ do: 'join', general: '關羽', faction: 'liu', force: true }],
      lines: [['關羽', '受人之恩，已經報答。如今得知兄長下落，縱有千里，也要前去相會！']],
    },
    {
      id: 'three_visits', title: '三顧茅廬', historical: true,
      cond: { from: [195, 1], alive: ['liu'], general_free: ['諸葛亮'], near: ['liu', '襄陽'] },
      effects: [{ do: 'join', general: '諸葛亮', faction: 'liu' }],
      lines: [['劉備', '劉備三度登門，只盼先生出山，共扶漢室。'], ['諸葛亮', '將軍誠意至此，亮願效犬馬之勞。依我之見，天下大勢可三分……']],
    },
    {
      id: 'zilong', title: '子龍來投', historical: true,
      cond: { from: [191, 6], alive: ['liu'], general_free: ['趙雲'], chance: 0.25 },
      effects: [{ do: 'join', general: '趙雲', faction: 'liu' }],
      lines: [['趙雲', '常山趙子龍，久仰劉使君仁德，特來投效！'], ['劉備', '得子龍相助，如虎添翼！']],
    },
    {
      id: 'taishi', title: '太史慈歸吳', historical: true,
      cond: { from: [194, 1], alive: ['sun'], general_free: ['太史慈'], general_faction: { 孫策: 'sun' }, chance: 0.3 },
      effects: [{ do: 'join', general: '太史慈', faction: 'sun' }],
      lines: [['孫策', '你我一場惡戰不分勝負，正是英雄相惜。可願助我？'], ['太史慈', '大丈夫生於亂世，當立不世之功。願隨將軍！']],
    },
    {
      id: 'liubiao_dies', title: '劉表病逝', historical: true,
      cond: { from: [207, 1], alive: ['liubiao'], general_faction: { 劉表: 'liubiao' }, chance: 0.15 },
      effects: [{ do: 'ruler_dies', faction: 'liubiao' }],
      lines: [['蒯越', '主公病重不起……荊州今後該何去何從？']],
    },
    {
      id: 'alliance', title: '孫劉同盟', historical: true,
      cond: { from: [205, 1], alive: ['cao', 'sun', 'liu'], cities_at_least: { cao: 9 } },
      effects: [{ do: 'relation', a: 'sun', b: 'liu', state: 'alliance' }],
      lines: [['魯肅', '北方強敵壓境，孫劉兩家唯有聯手，方能自保。'], ['諸葛亮', '正是。兩家同心，必能以少勝多。']],
    },
    {
      id: 'locusts', title: '蝗災', historical: false, repeat: true, cooldown: 24,
      cond: { month: 6, chance: 0.1 },
      effects: [{ do: 'harvest_mult', mult: 0.5 }],
      lines: [['', '各地蝗蟲蔽天，今年秋收恐怕只有往年的一半。']],
    },
    {
      id: 'bumper', title: '豐年', historical: false, repeat: true, cooldown: 24,
      cond: { month: 6, chance: 0.1 },
      effects: [{ do: 'harvest_mult', mult: 1.4 }],
      lines: [['', '風調雨順，今年各地可望豐收。']],
    },
  ];

  const ym = (y, m) => y * 12 + m - 1;
  const alive = (s, f) => s.factions[f] && s.factions[f].alive;
  function near(s, fid, city) {
    if (s.cities[city].owner === fid) return true;
    return E().neighbors(s, city).some((n) => s.cities[n].owner === fid);
  }
  function adjacent(s, a, b) {
    return E().citiesOf(s, a).some((c) => E().neighbors(s, c.id).some((n) => s.cities[n].owner === b));
  }

  function check(s, cond) {
    const now = ym(s.year, s.month);
    if (cond.from && now < ym(...cond.from)) return false;
    if (cond.until && now > ym(...cond.until)) return false;
    if (cond.month && s.month !== cond.month) return false;
    if ((cond.alive || []).some((f) => !alive(s, f))) return false;
    for (const [f, cs] of Object.entries(cond.owns || {})) if (cs.some((c) => s.cities[c].owner !== f)) return false;
    if (cond.near && !near(s, cond.near[0], cond.near[1])) return false;
    if (cond.neutral_city && s.cities[cond.neutral_city].owner) return false;
    for (const [c, f] of Object.entries(cond.city_owner_not || {})) if (s.cities[c].owner === f) return false;
    for (const [n, f] of Object.entries(cond.general_faction || {})) {
      const g = s.generals[n];
      if (!g || g.status !== 'active' || g.faction !== f) return false;
    }
    for (const n of cond.general_free || []) {
      const g = s.generals[n];
      if (!g || g.status !== 'free') return false;
    }
    for (const [n, f] of Object.entries(cond.general_elsewhere || {})) {
      const g = s.generals[n];
      if (!g || g.status === 'dead' || g.status === 'free' || g.ruler) return false;
      if (g.status === 'active' && g.faction === f) return false;
    }
    for (const [f, n] of Object.entries(cond.cities_at_least || {})) if (E().citiesOf(s, f).length < n) return false;
    if (cond.adjacent_factions && !adjacent(s, cond.adjacent_factions[0], cond.adjacent_factions[1])) return false;
    if (cond.chance && E().rand(s) >= cond.chance) return false;
    return true;
  }

  function capital(s, fid) {
    const r = s.generals[s.factions[fid].ruler];
    if (r && r.status === 'active' && s.cities[r.city] && s.cities[r.city].owner === fid) return r.city;
    const cs = E().citiesOf(s, fid);
    return cs.length ? cs[0].id : null;
  }

  function join(s, name, fid, force) {
    const g = s.generals[name];
    if (!g || g.status === 'dead' || g.ruler || !alive(s, fid)) return;
    if (!force && g.status !== 'free') return;
    let dest = null;
    if (s.cities[g.city] && s.cities[g.city].owner === fid) dest = g.city;
    else if (s.cities[g.city]) dest = E().neighbors(s, g.city).find((n) => s.cities[n].owner === fid) || null;
    dest = dest || capital(s, fid);
    if (!dest) return;
    Object.assign(g, { faction: fid, status: 'active', hidden: false, loyalty: 90, formerFaction: null, city: dest });
  }

  function apply(s, e) {
    switch (e.do) {
      case 'coalition_against':
        for (const f of Object.values(s.factions)) if (f.alive && f.id !== e.faction) D().setState(s, f.id, e.faction, 'war');
        break;
      case 'loyalty':
        for (const g of Object.values(s.generals)) if (g.faction === e.faction && g.status === 'active' && !g.ruler) g.loyalty = Math.max(0, Math.min(100, g.loyalty + e.amount));
        break;
      case 'loyalty_of':
        for (const n of e.generals) if (s.generals[n] && s.generals[n].status === 'active') s.generals[n].loyalty = e.value;
        break;
      case 'gold': {
        const cap = capital(s, e.faction);
        if (cap) s.cities[cap].gold += e.amount;
        break;
      }
      case 'city_scale': s.cities[e.city][e.field] = Math.round(s.cities[e.city][e.field] * e.mult); break;
      case 'city_add': s.cities[e.city][e.field] += e.amount; break;
      case 'troops': {
        const c = s.cities[e.city];
        const m = E().mixOf(c);
        m[e.unit] += e.amount;
        c.troops += e.amount;
        break;
      }
      case 'give_city': {
        const c = s.cities[e.city];
        if (!c.owner && alive(s, e.faction)) {
          c.owner = e.faction;
          c.mix = Object.assign({ spear: 0, cav: 0, xbow: 0 }, e.units);
          c.troops = c.mix.spear + c.mix.cav + c.mix.xbow;
        }
        break;
      }
      case 'join': join(s, e.general, e.faction, e.force); break;
      case 'leave': {
        const g = s.generals[e.general];
        if (g && g.status === 'active' && !g.ruler) Object.assign(g, { faction: null, status: 'free', hidden: false });
        break;
      }
      case 'ruler_dies': E().rulerDies(s, e.faction); break;
      case 'relation': if (alive(s, e.a) && alive(s, e.b)) D().setState(s, e.a, e.b, e.state, e.months); break;
      case 'harvest_mult': s.harvest_mult = e.mult; break;
      default: break;
    }
  }

  // 每月檢查一次，回傳觸發的事件
  function run(s) {
    s.events_done = s.events_done || {};
    const historical = (s.mode || 'historical') === 'historical';
    const now = ym(s.year, s.month);
    const fired = [];
    for (const ev of EVENTS) {
      if (ev.historical && !historical) continue;
      const last = s.events_done[ev.id];
      if (last !== undefined && (!ev.repeat || now - last < (ev.cooldown || 12))) continue;
      if (!check(s, ev.cond)) continue;
      s.events_done[ev.id] = now;
      for (const e of ev.effects) apply(s, e);
      E().addLog(s, `【${ev.title}】${ev.lines[0][1]}`, 'major', []);
      fired.push(ev);
    }
    return fired;
  }

  TK.Events = { EVENTS, run, check };
})(globalThis.TK = globalThis.TK || {});
