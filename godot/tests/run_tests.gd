extends SceneTree
## 核心規則測試（不需開啟編輯器）：
##   godot --headless --path godot --import          # 第一次需要匯入專案
##   godot --headless --path godot --script res://tests/run_tests.gd

const Loader = preload("res://scripts/core/loader.gd")
const World = preload("res://scripts/core/world.gd")
const Rules = preload("res://scripts/core/rules.gd")
const Cmd = preload("res://scripts/core/engine.gd")
const Battle = preload("res://scripts/core/battle.gd")
const Diplomacy = preload("res://scripts/core/diplomacy.gd")
const Events = preload("res://scripts/core/events.gd")
const Turn = preload("res://scripts/core/turn.gd")
const Portrait = preload("res://scripts/core/portrait.gd")
const Icons = preload("res://scripts/core/icons.gd")

var scn: Dictionary
var passed := 0
var failed := 0
var current := ""


func _init() -> void:
	scn = Loader.load_scenario()
	var tests := [
		"test_scenario_size", "test_new_game", "test_dev_command", "test_draft_costs", "test_move_units",
		"test_attack_neutral", "test_matchup", "test_water_navy", "test_diplomacy_rules", "test_surrender",
		"test_events_start", "test_free_mode", "test_event_join", "test_succession", "test_save_roundtrip",
		"test_portraits", "test_ai_simulation",
	]
	for t in tests:
		current = t
		var before := failed
		call(t)
		print(("ok   " if failed == before else "FAIL ") + t)
	print("\n%d 項通過，%d 項失敗" % [passed, failed])
	quit(1 if failed > 0 else 0)


func check(cond: bool, msg: String) -> void:
	if cond:
		passed += 1
	else:
		failed += 1
		printerr("  [%s] %s" % [current, msg])


func game(player: String = "cao", seed_value: int = 1, mode: String = "historical") -> Dictionary:
	return Loader.new_game(scn, player, mode, seed_value)


func invariants(st: Dictionary) -> void:
	for c in st["cities"].values():
		for k in Rules.UNIT_KEYS:
			var v = c["units"][k]
			check(typeof(v) == TYPE_INT and v >= 0, "%s.%s = %s" % [c["name"], k, v])
		for f in ["gold", "food", "pop", "farm", "commerce", "order", "defense", "train"]:
			check(int(c[f]) >= 0, "%s.%s < 0" % [c["name"], f])
		if c["owner"] != "":
			check(st["factions"][c["owner"]]["alive"], "%s 屬於已滅亡勢力" % c["name"])
	for g in st["generals"].values():
		if g["status"] == "dead":
			continue
		check(st["cities"].has(g["city"]), "%s 所在城不存在" % g["name"])
		if g["status"] == "active":
			check(st["factions"][g["faction"]]["alive"], "%s 的勢力已滅亡" % g["name"])
			check(st["cities"][g["city"]]["owner"] == g["faction"], "%s 不在己方城" % g["name"])


# ---------- 測試 ----------
func test_scenario_size() -> void:
	check(scn["cities"].size() == 30, "城市應為 30")
	check(scn["factions"].size() == 6, "勢力應為 6")
	check(scn["generals"].size() == 100, "武將應為 100")
	check(scn["events"].size() == 20, "事件應為 20")
	check(Rules.UNIT_KEYS.size() == 5, "兵種應為 5")


func test_new_game() -> void:
	var st := game()
	check(World.cities_of(st, "cao").size() == 2, "曹操應有 2 城")
	check(st["generals"]["曹操"]["ruler"], "曹操是君主")
	check(typeof(st["cities"]["陳留"]["gold"]) == TYPE_INT, "數字已整數化")
	invariants(st)


func test_dev_command() -> void:
	var st := game()
	var before := int(st["cities"]["陳留"]["farm"])
	var r := Cmd.exec(st, "cao", {"type": "farm", "city": "陳留", "general": "荀彧"})
	check(r["ok"], r["msg"])
	check(int(st["cities"]["陳留"]["farm"]) > before, "農業應增加")
	check(not Cmd.exec(st, "cao", {"type": "commerce", "city": "陳留", "general": "荀彧"})["ok"], "同一武將不能重複行動")
	check(not Cmd.exec(st, "cao", {"type": "farm", "city": "鄴", "general": "袁紹"})["ok"], "不能操作他國城市")


func test_draft_costs() -> void:
	var st := game()
	var c: Dictionary = st["cities"]["陳留"]
	var gold := int(c["gold"])
	var cav := int(c["units"]["cav"])
	check(Cmd.exec(st, "cao", {"type": "draft", "city": "陳留", "general": "典韋", "unit": "cav", "amount": 2000})["ok"], "徵騎兵")
	check(int(c["gold"]) == gold - 400, "騎兵每千 200 金")
	check(int(c["units"]["cav"]) == cav + 2000, "騎兵增加")
	check(not Cmd.exec(st, "cao", {"type": "draft", "city": "陳留", "general": "荀彧", "unit": "cav", "amount": 999999})["ok"], "超過上限")


func test_move_units() -> void:
	var st := game()
	var a: Dictionary = st["cities"]["濮陽"]
	var b: Dictionary = st["cities"]["陳留"]
	var ai := int(a["units"]["infantry"])
	var bi := int(b["units"]["infantry"])
	var r := Cmd.exec(st, "cao", {"type": "move", "city": "濮陽", "general": "曹洪", "dest": "陳留", "units": {"infantry": 1000}})
	check(r["ok"], r["msg"])
	check(int(a["units"]["infantry"]) == ai - 1000 and int(b["units"]["infantry"]) == bi + 1000, "步兵移動")
	check(st["generals"]["曹洪"]["city"] == "陳留", "武將移動")
	invariants(st)


func test_attack_neutral() -> void:
	var st := game()
	var t: Dictionary = st["cities"]["許昌"]
	t["units"] = World.scale_units(t["units"], 300)
	var r := Cmd.exec(st, "cao", {"type": "attack", "city": "陳留", "general": "曹操", "generals": ["典韋"], "target": "許昌", "troops": 12000})
	check(r["ok"], r["msg"])
	check(t["owner"] == "cao", "應攻下許昌")
	check(st["generals"]["典韋"]["city"] == "許昌", "出征武將入城")
	invariants(st)


func _siege_loss(def_unit: String) -> int:
	var total := 0
	for seed_value in range(1, 21):
		var st := game("cao", seed_value)
		var t: Dictionary = st["cities"]["許昌"]
		t["units"] = World.empty_units()
		t["units"][def_unit] = 8000
		t["defense"] = 300
		var c: Dictionary = st["cities"]["陳留"]
		c["units"]["cav"] = 6000
		var r := Cmd.exec(st, "cao", {"type": "attack", "city": "陳留", "general": "樂進", "target": "許昌", "units": {"cav": 5000}})
		check(r["ok"], r["msg"])
		total += int(r["battle"]["atk_loss"])
	return total


func test_matchup() -> void:
	check(Rules.matchup("spear", "cav") > 1.0 and Rules.matchup("cav", "archer") > 1.0 and Rules.matchup("archer", "spear") > 1.0, "相剋循環")
	check(_siege_loss("spear") > _siege_loss("archer"), "騎兵攻打槍兵應比攻打弓兵損失多")


func test_water_navy() -> void:
	check(World.road_water(game(), "江陵", "長沙"), "江陵—長沙是水路")
	var navy_loss := 0
	var inf_loss := 0
	for seed_value in range(1, 16):
		for unit in ["navy", "infantry"]:
			var st := game("liubiao", seed_value)
			var t: Dictionary = st["cities"]["長沙"]
			t["units"] = World.empty_units()
			t["units"]["infantry"] = 9000
			var c: Dictionary = st["cities"]["江陵"]
			c["units"][unit] = 10000
			var r := Cmd.exec(st, "liubiao", {"type": "attack", "city": "江陵", "general": "文聘", "target": "長沙", "units": {unit: 9000}})
			check(r["ok"], r["msg"])
			if unit == "navy":
				navy_loss += int(r["battle"]["atk_loss"])
			else:
				inf_loss += int(r["battle"]["atk_loss"])
	check(navy_loss < inf_loss, "水路上水軍應比步兵損失少")


func test_diplomacy_rules() -> void:
	var st := game()
	Diplomacy.set_state(st, "cao", "yuans", "alliance")
	check(not Cmd.exec(st, "cao", {"type": "attack", "city": "濮陽", "general": "夏侯惇", "target": "鄴", "troops": 3000})["ok"], "同盟不能攻擊")
	var r := Diplomacy.exec(st, "cao", {"type": "diplo", "action": "war", "target": "yuans", "general": "荀彧"})
	check(r["ok"] and Diplomacy.state_of(st, "cao", "yuans") == "war", "宣戰")
	Diplomacy.set_state(st, "cao", "liu", "truce", 2)
	Diplomacy.month_tick(st)
	Diplomacy.month_tick(st)
	check(Diplomacy.state_of(st, "cao", "liu") == "neutral", "停戰期滿回到中立")
	var r2 := Cmd.exec(st, "cao", {"type": "attack", "city": "濮陽", "general": "夏侯淵", "target": "平原", "troops": 2000})
	check(r2["ok"], r2.get("msg", ""))
	check(Diplomacy.state_of(st, "cao", "liu") == "war", "攻擊中立勢力自動開戰")


func test_surrender() -> void:
	var st := game()
	var g: Dictionary = st["generals"]["荀彧"]
	check(Diplomacy.chance(st, "cao", "liu", "surrender", g) >= 0.0, "勸降成功率可計算")
	Diplomacy.absorb(st, "cao", "liu")
	check(st["cities"]["平原"]["owner"] == "cao", "城池歸順")
	check(st["generals"]["關羽"]["faction"] == "cao", "武將歸順")
	check(not st["factions"]["liu"]["alive"], "勢力消失")
	invariants(st)


func test_events_start() -> void:
	var st := game("liu")
	var fired := Events.check(st, scn["events"])
	var ids := []
	for e in fired:
		ids.append(e["id"])
	check(ids.has("coalition"), "開局觸發反董卓聯盟")
	check(ids.has("oath"), "開局觸發桃園之誓")
	check(Diplomacy.state_of(st, "cao", "dong") == "war", "諸侯與董卓交戰")
	check(int(st["generals"]["關羽"]["loyalty"]) == 100, "關羽忠誠 100")
	for e in Events.check(st, scn["events"]):
		check(e["id"] != "coalition", "聯盟事件不應重複")


func test_free_mode() -> void:
	var st := game("liu", 1, "free")
	for e in Events.check(st, scn["events"]):
		check(not e.get("historical", false), "自由模式不觸發歷史事件")


func test_event_join() -> void:
	var st := game("liu")
	st["year"] = 196
	# 讓劉備擁有襄陽旁的城：把宛交給劉備
	st["cities"]["宛"]["owner"] = "liu"
	var fired := Events.check(st, scn["events"])
	var ids := []
	for e in fired:
		ids.append(e["id"])
	check(ids.has("three_visits"), "三顧茅廬觸發")
	check(st["generals"]["諸葛亮"]["faction"] == "liu", "諸葛亮加入劉備軍")
	check(st["cities"][st["generals"]["諸葛亮"]["city"]]["owner"] == "liu", "諸葛亮在劉備的城")


func test_succession() -> void:
	var st := game()
	World.ruler_dies(st, "sun")
	check(st["generals"]["孫堅"]["status"] == "dead", "孫堅去世")
	check(st["factions"]["sun"]["ruler"] == "孫策", "孫策繼位")
	check(st["generals"]["孫策"]["ruler"], "孫策成為君主")


func test_save_roundtrip() -> void:
	var st := game("sun", 7)
	Turn.end_month(st, scn["events"])
	var back = Loader.intify(JSON.parse_string(JSON.stringify(st)))
	check(back is Dictionary, "可序列化")
	check(int(back["month"]) == int(st["month"]) and back["seed"] == st["seed"], "月份與亂數一致")
	var a := Turn.end_month(st, scn["events"]).size()
	var b := Turn.end_month(back, scn["events"]).size()
	check(a == b and World.troops(st["cities"]["長沙"]) == World.troops(back["cities"]["長沙"]), "讀檔後結果可重現")


func test_portraits() -> void:
	var st := game()
	var bad := 0
	for g in st["generals"].values():
		var img := Image.new()
		if img.load_svg_from_string(Portrait.svg(g, "#2f5f8f", "head"), 0.5) != OK:
			bad += 1
	check(bad == 0, "%d 張肖像無法產生" % bad)
	for k in Rules.UNIT_KEYS:
		check(Icons.unit_texture(k, "#b23a2c", 1.0) != null, "%s 圖示" % k)


func test_ai_simulation() -> void:
	for seed_value in [11, 22, 33]:
		var st := game("", seed_value)
		st["player"] = ""
		for i in 120:
			Turn.end_month(st, scn["events"])
			if i % 12 == 11:
				invariants(st)
		var alive := []
		for f in st["factions"].values():
			if f["alive"]:
				alive.append("%s(%d)" % [f["name"], World.cities_of(st, f["id"]).size()])
		var owned := 0
		for c in st["cities"].values():
			if c["owner"] != "":
				owned += 1
		print("     seed %d：%s 存活 %s，佔城 %d/30" % [seed_value, World.date_str(st), " ".join(alive), owned])
		check(owned >= 15, "十年後應有多數城被佔領")
