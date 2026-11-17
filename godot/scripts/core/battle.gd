extends RefCounted
## 簡化戰鬥：依武將能力、兵力、兵種組成、相剋、適性、城防與水路自動結算。
## 回傳 frames 給戰鬥畫面逐格播放。公式為本作原創。

const Rules = preload("res://scripts/core/rules.gd")
const Rng = preload("res://scripts/core/rng.gd")
const World = preload("res://scripts/core/world.gd")

## 戰鬥發生時呼叫（UI 用來收集與玩家有關的戰鬥）
static var listener: Callable = Callable()

const NEUTRAL_STATS := {"lead": 45, "war": 45, "int": 40}


static func _side(gens: Array) -> Dictionary:
	if gens.is_empty():
		return {"lead": NEUTRAL_STATS["lead"], "war": NEUTRAL_STATS["war"], "int": NEUTRAL_STATS["int"], "cmdr": null}
	var sorted := gens.duplicate()
	sorted.sort_custom(func(a, b): return int(a["lead"]) > int(b["lead"]))
	var war := 0
	var intel := 0
	for g in gens:
		war = maxi(war, int(g["war"]))
		intel = maxi(intel, int(g["int"]))
	return {"lead": int(sorted[0]["lead"]), "war": war, "int": intel, "cmdr": sorted[0]}


## 無主城的守將：城中能力最好的在野武將（例如獨立的地方豪強）
static func defenders(st: Dictionary, city: Dictionary) -> Array:
	var gens := []
	if city["owner"] != "":
		gens = World.officers(st, city["name"])
	else:
		gens = World.generals_in(st, city["name"], func(g): return g["status"] == "free")
	gens.sort_custom(func(a, b): return int(a["lead"]) + int(a["war"]) > int(b["lead"]) + int(b["war"]))
	return gens.slice(0, 3)


## 兵種、適性、水路綜合加成
static func _bonus(fa: Dictionary, fd: Dictionary, cmdr, water: bool, attacking: bool) -> float:
	var m := 0.0
	var apt := 0.0
	for a in Rules.UNIT_KEYS:
		for d in Rules.UNIT_KEYS:
			m += fa[a] * fd[d] * Rules.matchup(a, d)
		var am: float = Rules.APT_MULT[Rules.aptitude(cmdr, a)] if cmdr != null else 1.0
		apt += fa[a] * am
	var navy_mult: float = 1.0 + float(fa["navy"]) * (0.5 if water else -0.3)
	var special := 1.0
	if attacking:
		special += 0.12 * fa["cav"]
	else:
		special += 0.15 * fa["infantry"] + 0.1 * fa["archer"]
	return m * apt * navy_mult * special


## atk = {faction, generals:[dict], units, train, from}
static func resolve(st: Dictionary, atk: Dictionary, target_id: String) -> Dictionary:
	var city: Dictionary = st["cities"][target_id]
	var def_owner: String = city["owner"]
	var def_gens := defenders(st, city)
	var A := _side(atk["generals"])
	var D := _side(def_gens)
	var a_units: Dictionary = atk["units"].duplicate()
	var d_units: Dictionary = city["units"].duplicate()
	var a_t := World.units_total(a_units)
	var d_t := World.units_total(d_units)
	var A0 := a_t
	var D0 := d_t
	var fa := World.fractions(a_units)
	var fd := World.fractions(d_units)
	var water := World.road_water(st, atk["from"], target_id)
	var bonus_a := _bonus(fa, fd, A["cmdr"], water, true)
	var bonus_d := _bonus(fd, fa, D["cmdr"], water, false)
	var sturdy_a: float = 1.0 - 0.1 * fa["spear"]
	var sturdy_d: float = 1.0 - 0.1 * fd["spear"]
	var a_name := World.faction_name(st, atk["faction"])
	var d_name := World.faction_name(st, def_owner) if def_owner != "" else "%s守軍" % city["name"]
	var a_cmd: String = A["cmdr"]["name"] if A["cmdr"] != null else "無名"
	var d_cmd: String = D["cmdr"]["name"] if D["cmdr"] != null else "守將"
	var lines := []
	var frames := [{"a": a_t, "d": d_t, "ev": "", "kind": ""}]
	lines.append("%s（%s，%d兵）自%s進攻%s（%s，%s，%d兵）" % [a_name, a_cmd, A0, atk["from"], city["name"], d_name, d_cmd, D0])
	if water:
		lines.append("沿水路進軍，水軍將大顯身手")

	# 單挑
	if A["war"] >= 80 and D["war"] >= 80 and not def_gens.is_empty() and Rng.chance(st, 0.3):
		var ah = atk["generals"].duplicate()
		ah.sort_custom(func(x, y): return int(x["war"]) > int(y["war"]))
		var dh = def_gens.duplicate()
		dh.sort_custom(func(x, y): return int(x["war"]) > int(y["war"]))
		var ar := int(ah[0]["war"]) + Rng.range_i(st, 0, 25)
		var dr := int(dh[0]["war"]) + Rng.range_i(st, 0, 25)
		var winner = ah[0] if ar >= dr else dh[0]
		if ar >= dr:
			d_t = int(d_t * 0.9)
		else:
			a_t = int(a_t * 0.9)
		var duel_txt := "%s 對 %s，%s勝！" % [ah[0]["name"], dh[0]["name"], winner["name"]]
		lines.append("單挑！" + duel_txt)
		frames.append({"a": a_t, "d": d_t, "ev": duel_txt, "kind": "duel", "duel": [ah[0]["name"], dh[0]["name"]], "winner": "a" if ar >= dr else "d"})

	var result := ""
	var schemes := 0
	for round_i in range(1, 21):
		var pow_a: float = a_t * (0.6 * float(A["lead"]) + 0.4 * float(A["war"])) / 100.0 * (0.7 + float(atk["train"]) / 100.0 * 0.6) * bonus_a
		var pow_d: float = d_t * (0.6 * float(D["lead"]) + 0.4 * float(D["war"])) / 100.0 * (0.7 + float(city["train"]) / 100.0 * 0.6) * (1.0 + float(city["defense"]) / 800.0) * bonus_d
		var loss_d := int(round(pow_a * 0.08 * (0.85 + Rng.next(st) * 0.3) * sturdy_d))
		var loss_a := int(round(pow_d * 0.08 * (0.85 + Rng.next(st) * 0.3) * sturdy_a))
		var ev := ""
		var kind := ""
		if round_i == 1:
			if fa["archer"] >= 0.3:
				loss_d = int(loss_d * (1.0 + fa["archer"]))
				ev = "%s弓兵齊射！" % a_name
				kind = "volley"
			if fd["archer"] >= 0.3:
				loss_a = int(loss_a * (1.0 + fd["archer"]))
				ev = "城上箭如雨下！"
				kind = "volley"
			if fa["cav"] >= 0.3:
				if fd["spear"] >= 0.4:
					loss_a = int(loss_a * 1.25)
					ev = "騎兵衝鋒，撞上槍陣！"
					kind = "charge_fail"
				else:
					loss_d = int(loss_d * (1.0 + fa["cav"] * 0.8))
					ev = "%s騎兵衝鋒！" % a_name
					kind = "charge"
			if water and fa["navy"] >= 0.3:
				loss_d = int(loss_d * 1.2)
				ev = "%s水軍順流突擊！" % a_name
				kind = "navy"
			if ev != "":
				lines.append(ev)
		if A["int"] >= 75 and Rng.chance(st, (A["int"] - 60) / 200.0):
			loss_d = int(loss_d * 1.5)
			ev = "%s施展計略，守軍大亂" % a_name
			kind = "scheme"
			if schemes < 2:
				lines.append(ev)
			schemes += 1
		if D["int"] >= 75 and Rng.chance(st, (D["int"] - 60) / 200.0):
			loss_a = int(loss_a * 1.5)
			ev = "%s識破計策，反擊得手" % d_name
			kind = "scheme"
			if schemes < 2:
				lines.append(ev)
			schemes += 1
		a_t = maxi(0, a_t - loss_a)
		d_t = maxi(0, d_t - loss_d)
		city["defense"] = maxi(0, int(city["defense"]) - Rng.range_i(st, 3, 12))
		frames.append({"a": a_t, "d": d_t, "ev": ev, "kind": kind})
		if d_t <= 0:
			result = "win"
		elif a_t <= 0:
			result = "lose"
		elif d_t < D0 * 0.2 and d_t < a_t * 0.5:
			result = "win"
			d_t = 0
		elif a_t < A0 * 0.3 and a_t < d_t:
			result = "lose"
		if result != "":
			break
	if result == "":
		result = "lose"
		lines.append("久攻不下，撤兵")
	frames[frames.size() - 1]["a"] = a_t
	frames[frames.size() - 1]["d"] = d_t

	var a_left := World.scale_units(a_units, a_t)
	city["units"] = World.scale_units(d_units, d_t)
	var summary := ""
	if result == "win":
		World.conquer(st, city, atk["faction"], atk["generals"], a_left, int(atk["train"]), lines)
		summary = "%s攻陷了%s！（剩餘 %d 兵）" % [a_name, city["name"], a_t]
	else:
		var home: Dictionary = st["cities"][atk["from"]]
		if home["owner"] == atk["faction"]:
			World.add_units(home, a_left, int(atk["train"]))
		summary = "%s進攻%s失敗（我損 %d，敵損 %d）" % [a_name, city["name"], A0 - a_t, D0 - d_t]
	lines.append(summary)
	var parties := [atk["faction"]]
	if def_owner != "":
		parties.append(def_owner)
	for l in lines:
		World.add_log(st, l, "battle", parties)
	var gen_names := []
	for g in atk["generals"]:
		gen_names.append(g["name"])
	var def_names := []
	for g in def_gens:
		def_names.append(g["name"])
	var res := {
		"result": result, "summary": summary, "lines": lines, "frames": frames,
		"city": city["name"], "from": atk["from"], "water": water,
		"atk_loss": A0 - a_t, "def_loss": D0 - d_t,
		"atk": {"faction": atk["faction"], "name": a_name, "commander": a_cmd, "generals": gen_names, "troops": A0, "units": a_units},
		"def": {"faction": def_owner, "name": d_name, "commander": d_cmd, "generals": def_names, "troops": D0, "units": d_units},
	}
	if listener.is_valid():
		listener.call(res)
	return res
