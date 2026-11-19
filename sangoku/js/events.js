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
      lines: [['曹操', '董卓廢立天子、焚掠百姓，天下共憤。各路諸侯，願同舉義兵！'], ['袁紹', '我袁家四世三公，願為盟主，號令諸軍討賊。'], ['', '十八路諸侯會盟於酸棗。董卓派大將華雄出關迎戰，聯軍接連折損數員大將。'], ['關羽', '小將願往，斬華雄之頭，獻於帳下！'], ['袁術', '一個弓手也敢在這裡亂說？給我打出去！'], ['曹操', '公路息怒。此人既出大言，必有勇略。……來，先飲一杯熱酒再上馬。'], ['關羽', '酒且斟下，某去便來。'], ['', '帳外鼓聲大振，喊聲大舉，如天摧地塌。不一會兒，鸞鈴響處，關羽提著華雄的首級擲於地上——那杯酒還是溫的。']],
    },
    {
      id: 'oath', title: '桃園之誓', historical: true,
      cond: { from: [190, 1], until: [190, 3], alive: ['liu'], general_faction: { 關羽: 'liu', 張飛: 'liu' } },
      effects: [{ do: 'loyalty_of', generals: ['關羽', '張飛'], value: 100 }, { do: 'loyalty', faction: 'liu', amount: 5 }],
      lines: [['', '涿郡的桃園裡，桃花盛開。三人備下烏牛白馬，焚香再拜。'], ['劉備', '念劉備、關羽、張飛，雖然異姓，既結為兄弟，則同心協力，救困扶危；上報國家，下安黎庶。'], ['關羽', '不求同年同月同日生——'], ['張飛', '只願同年同月同日死！皇天后土，實鑒此心，背義忘恩，天人共戮！'], ['劉備', '從今以後，我為兄，雲長次之，翼德為弟。']],
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
      lines: [['', '董卓專橫殘暴，朝野敢怒不敢言。司徒王允暗中與呂布結交。'], ['', '呂布曾因小事觸怒董卓，董卓拔出手戟擲向他，呂布閃過才保住性命；又與董卓的侍婢私通，日夜擔心事情敗露。'], ['呂布', '我與董卓是父子之情啊……'], ['', '王允：「君自姓呂，本非骨肉。如今憂死不暇，還談什麼父子？擲戟之時，他可有父子之情？」'], ['', '四月，天子病癒，在未央殿大會群臣。董卓入宮時，被埋伏的兵士以戟刺之。'], ['董卓', '呂布何在？！'], ['呂布', '有詔討賊臣！'], ['', '呂布一矛刺死董卓。長安士民歡騰，賣掉珠玉衣裝買酒肉慶祝，塞滿了街道。']],
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
      lines: [['曹操', '（指著青梅煮的酒）玄德，你遊歷四方，當世英雄是誰？'], ['劉備', '淮南袁術，兵糧足備，可為英雄？'], ['曹操', '冢中枯骨，我早晚擒之。'], ['劉備', '河北袁紹，四世三公？'], ['曹操', '色厲膽薄，好謀無斷，幹大事而惜身，見小利而忘命，不是英雄。'], ['曹操', '今天下英雄，唯使君與操耳。'], ['', '劉備大吃一驚，手中的筷子掉在地上。這時正好天上打雷。'], ['劉備', '（拾起筷子）聖人說「迅雷風烈必變」，一聲雷竟嚇成這樣……']],
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
      lines: [['張遼', '雲長，曹公待你如此之厚，你為何還念著要走？'], ['關羽', '我深知曹公待我厚。然而我受劉將軍厚恩，誓以共死，不可背之。我終究不會留下，但要立功報答曹公之後才去。'], ['', '關羽封存所有賞賜，掛印留書，護著兩位嫂嫂，一路過五關、斬六將，千里尋兄。'], ['曹操', '各為其主，勿追也。'], ['關羽', '大哥！關某總算找到你了。']],
    },
    {
      id: 'three_visits', title: '三顧茅廬', historical: true,
      cond: { from: [195, 1], alive: ['liu'], general_free: ['諸葛亮'], near: ['liu', '襄陽'] },
      effects: [{ do: 'join', general: '諸葛亮', faction: 'liu' }],
      lines: [['徐庶', '諸葛孔明，臥龍也。將軍可願見他？此人只可親自去見，不可召他前來。'], ['', '劉備冒著風雪，三次來到隆中草廬。前兩次都沒見到，第三次諸葛亮在午睡，劉備就站在階下等候。'], ['諸葛亮', '（醒來）……將軍久等了。'], ['劉備', '漢室傾頹，奸臣竊命。我不自量力，想伸張大義於天下，然而智術短淺，至今一事無成。請先生指教。'], ['諸葛亮', '曹操擁百萬之眾，挾天子以令諸侯，不可與爭鋒；孫權據有江東已歷三世，可以為援而不可圖。'], ['諸葛亮', '荊州用武之國，益州天府之土。將軍若跨有荊、益，保其巖阻，西和諸戎，南撫夷越，外結孫權，內修政理——則霸業可成，漢室可興。'], ['劉備', '善！……孤之有孔明，猶魚之有水也。']],
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
    for (const [c, n] of Object.entries(cond.troops_below || {})) if (s.cities[c].troops >= n) return false;
    // 某些事件發生之後才會觸發；某些武將已經死亡
    for (const id of cond.after || []) if (!(s.events_done || {})[id] && (s.events_done || {})[id] !== 0) return false;
    for (const n of cond.general_dead || []) if (!s.generals[n] || s.generals[n].status !== 'dead') return false;
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
      case 'relocate': {
        const g = s.generals[e.general];
        if (!g || g.status !== 'active') break;
        const dest = s.cities[e.city] && s.cities[e.city].owner === g.faction ? e.city : (E().citiesOf(s, g.faction)[0] || {}).id;
        if (dest) g.city = dest;
        break;
      }
      case 'troops_scale': {
        const c = s.cities[e.city];
        c.troops = Math.round(c.troops * e.mult);
        E().mixOf(c);
        break;
      }
      case 'die': {
        const g = s.generals[e.general];
        if (!g || g.status === 'dead') break;
        if (g.ruler && g.status === 'active') E().rulerDies(s, g.faction);
        else Object.assign(g, { status: 'dead', city: null, ruler: false });
        break;
      }
      case 'absorb': if (alive(s, e.faction) && alive(s, e.into)) D().absorb(s, e.into, e.faction); break;
      case 'seize': {
        // 城池易主：原守將退往本國其他城
        const c = s.cities[e.city], old = c.owner;
        if (!alive(s, e.faction) || old === e.faction) break;
        c.owner = e.faction;
        if (old) {
          const back = E().citiesOf(s, old).find((x) => x.id !== c.id);
          for (const g of Object.values(s.generals)) {
            if (g.city === c.id && g.faction === old && g.status === 'active') {
              if (back) g.city = back.id; else Object.assign(g, { status: 'free', faction: null });
            }
          }
          if (!back) E().destroyFaction(s, old);
        }
        break;
      }
      default: break;
    }
  }

  // 每月檢查一次，回傳觸發的事件
  function run(s) {
    s.events_done = s.events_done || {};
    const historical = (s.mode || 'historical') === 'historical';
    const now = ym(s.year, s.month);
    const fired = [];
    // 190 劇本的歷史事件只在 190 劇本發生；其他劇本有各自的事件
    const sid = s.scenario || '190';
    const own = TK.scenarioById ? TK.scenarioById(sid).events || [] : [];
    for (const ev of EVENTS.concat(own)) {
      if (ev.historical && !historical) continue;
      if (ev.historical && sid !== '190' && !own.includes(ev)) continue;
      const last = s.events_done[ev.id];
      if (last !== undefined && (!ev.repeat || now - last < (ev.cooldown || 12))) continue;
      if (!check(s, ev.cond)) continue;
      s.events_done[ev.id] = now;
      for (const e of ev.effects || []) apply(s, e);
      // 抉擇事件：由玩家決定（存入 s.choices，畫面詢問後呼叫 choose）；電腦勢力依 aiChoice 自動選
      if (ev.choices) {
        if (ev.chooser === s.player) { s.choices = s.choices || []; s.choices.push(ev.id); }
        else choose(s, ev.id, ev.aiChoice || 0, true);
      }
      E().addLog(s, `【${ev.title}】${ev.lines[0][1]}`, 'major', []);
      fired.push(ev);
    }
    return fired;
  }

  function findEvent(s, id) {
    const own = TK.scenarioById ? TK.scenarioById(s.scenario).events || [] : [];
    return EVENTS.concat(own).find((e) => e.id === id) || null;
  }
  // 套用抉擇；回傳所選的選項（含要演出的台詞）
  function choose(s, id, idx, auto) {
    const ev = findEvent(s, id);
    if (!ev || !ev.choices || !ev.choices[idx]) return null;
    if (!auto) s.choices = (s.choices || []).filter((x) => x !== id);
    const c = ev.choices[idx];
    for (const e of c.effects || []) apply(s, e);
    E().addLog(s, `【${ev.title}】${c.label}：${c.lines[c.lines.length - 1][1]}`, 'major', []);
    return c;
  }

  TK.Events = { EVENTS, run, check, choose, findEvent };
})(globalThis.TK = globalThis.TK || {});
