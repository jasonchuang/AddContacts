extends RefCounted
## 城市指令與每月結算。所有指令經由 exec()，玩家與電腦勢力遵守相同規則。

const Rules = preload("res://scripts/core/rules.gd")
const Rng = preload("res://scripts/core/rng.gd")
const World = preload("res://scripts/core/world.gd")
const Battle = preload("res://scripts/core/battle.gd")
const Diplomacy = preload("res://scripts/core/diplomacy.gd")

## 不需要執行武將的指令
const NO_EXEC := ["reward", "release", "execute", "appoint", "strategist"]


static func ok(msg: String, extra: Dictionary = {}) -> Dictionary:
	var r := {"ok": true, "msg": msg}
	r.merge(extra)
	return r


static func fail(msg: String) -> Dictionary:
	return {"ok": false, "msg": msg}


static func max_draft(st: Dictionary, city: Dictionary, g: Dictionary, unit: String) -> int:
	var cost: int = Rules.UNITS[unit]["cost"]
	return maxi(0, mini(mini(int(g["cha"]) * 100, int(floor(float(city["gold"]) * 1000.0 / cost))), mini(int(city["pop"]) / 5, Rules.MAX_TROOPS - World.troops(city))))


static func recruit_chance(st: Dictionary, g: Dictionary, target: Dictionary) -> float:
	if target.get("ruler", false):
		return 0.0
	if target["status"] == "free":
		return clampf(0.15 + float(g["cha"]) / 100.0 * 0.55, 0.0, 0.75)
	if target["status"] == "prisoner":
		return clampf(0.05 + float(g["cha"]) / 100.0 * 0.45 - (float(target["loyalty"]) - 50.0) / 200.0, 0.02, 0.6)
	return 0.0


## 指令可給 units（分兵種）或 troops（依城內比例）
static func units_from_cmd(city: Dictionary, cmd: Dictionary):
	if cmd.has("units"):
		var u := World.empty_units()
		for k in Rules.UNIT_KEYS:
			u[k] = int(cmd["units"].get(k, 0))
			if u[k] < 0 or u[k] > int(city["units"].get(k, 0)):
				return null
		return u
	var n := int(cmd.get("troops", 0))
	if n < 0 or n > World.troops(city):
		return null
	return World.scale_units(city["units"], n)


static func exec(st: Dictionary, fid: String, cmd: Dictionary) -> Dictionary:
	if not st.get("over", {}).is_empty():
		return fail("遊戲已結束")
	var type: String = cmd.get("type", "")
	if type == "diplo":
		return Diplomacy.exec(st, fid, cmd)
	var city = st["cities"].get(cmd.get("city", ""))
	if city == null or city["owner"] != fid:
		return fail("不是我方城市")
	var g = null
	if not NO_EXEC.has(type):
		g = st["generals"].get(cmd.get("general", ""))
		if g == null or g["faction"] != fid or g["status"] != "active" or g["city"] != city["name"]:
			return fail("武將不在此城")
		if g["acted"]:
			return fail("%s本月已行動" % g["name"])

	if Rules.DEV.has(type):
		var d: Dictionary = Rules.DEV[type]
		if int(city["gold"]) < int(d["cost"]):
			return fail("金不足")
		if int(city[d["key"]]) >= int(Rules.MAX[d["key"]]):
			return fail("%s已達上限" % d["label"])
		city["gold"] = int(city["gold"]) - int(d["cost"])
		var stat := int(g[d["stat"]])
		var gain := 0
		if type == "order" or type == "train":
			gain = int(round(stat / 20.0 + Rng.range_i(st, 1, 4)))
		else:
			gain = int(round(stat / 10.0 + Rng.range_i(st, 0, 5)))
		city[d["key"]] = mini(int(Rules.MAX[d["key"]]), int(city[d["key"]]) + gain)
		g["acted"] = true
		return ok("%s於%s%s，%s +%d" % [g["name"], city["name"], d["label"], Rules.FIELD_LABEL[d["key"]], gain])

	match type:
		"draft":
			var unit: String = cmd.get("unit", "infantry")
			if not Rules.UNITS.has(unit):
				return fail("兵種不正確")
			var amt := int(cmd.get("amount", 0))
			var mx := max_draft(st, city, g, unit)
			if amt < 100:
				return fail("徵兵數至少 100")
			if amt > mx:
				return fail("最多可徵 %d" % mx)
			city["gold"] = int(city["gold"]) - int(ceil(amt * int(Rules.UNITS[unit]["cost"]) / 1000.0))
			city["pop"] = int(city["pop"]) - amt
			var add := World.empty_units()
			add[unit] = amt
			World.add_units(city, add, 20)
			city["order"] = maxi(0, int(city["order"]) - int(ceil(amt / 2000.0)))
			g["acted"] = true
			return ok("%s於%s徵募%s %d" % [g["name"], city["name"], Rules.UNITS[unit]["name"], amt])
		"search":
			g["acted"] = true
			var hidden := World.generals_in(st, city["name"], func(x): return x["status"] == "free" and x["hidden"])
			if not hidden.is_empty() and Rng.chance(st, 0.25 + float(g["int"]) / 200.0):
				var f = Rng.pick(st, hidden)
				f["hidden"] = false
				return ok("%s在%s發現了人才「%s」！" % [g["name"], city["name"], f["name"]], {"found": f["name"]})
			if Rng.chance(st, 0.4):
				var gold := Rng.range_i(st, 30, 120)
				city["gold"] = int(city["gold"]) + gold
				return ok("%s在%s搜尋，得到金 %d" % [g["name"], city["name"], gold])
			return ok("%s在%s搜尋，一無所獲" % [g["name"], city["name"]])
		"recruit":
			var t = st["generals"].get(cmd.get("target", ""))
			if t == null or t["city"] != city["name"] or not (t["status"] == "prisoner" or (t["status"] == "free" and not t["hidden"])):
				return fail("找不到登用對象")
			g["acted"] = true
			if Rng.chance(st, recruit_chance(st, g, t)):
				World.join_faction(t, fid, Rng.range_i(st, 60, 80))
				t["acted"] = true
				return ok("%s接受了%s的邀請，加入%s！" % [t["name"], g["name"], World.faction_name(st, fid)], {"joined": t["name"]})
			return ok("%s拒絕了%s的登用" % [t["name"], g["name"]])
		"reward":
			var t = st["generals"].get(cmd.get("target", ""))
			if t == null or t["faction"] != fid or t["status"] != "active" or t["city"] != city["name"]:
				return fail("找不到武將")
			if t["ruler"]:
				return fail("不能賞賜君主")
			if int(city["gold"]) < 100:
				return fail("金不足")
			if int(t["loyalty"]) >= 100:
				return fail("忠誠已滿")
			city["gold"] = int(city["gold"]) - 100
			var gain := Rng.range_i(st, 5, 10)
			t["loyalty"] = mini(100, int(t["loyalty"]) + gain)
			return ok("賞賜%s，忠誠 +%d" % [t["name"], gain])
		"release", "execute":
			var t = st["generals"].get(cmd.get("target", ""))
			if t == null or t["city"] != city["name"] or t["status"] != "prisoner":
				return fail("找不到俘虜")
			if type == "release":
				t["status"] = "free"
				t["hidden"] = false
				return ok("釋放了%s" % t["name"])
			t["status"] = "dead"
			t["city"] = ""
			return ok("處斬了%s" % t["name"])
		"appoint":
			# 任命太守：每月依政務自動發展
			var t = st["generals"].get(cmd.get("target", ""))
			if t == null or t["faction"] != fid or t["status"] != "active" or t["city"] != city["name"]:
				return fail("找不到武將")
			World._clear_roles(st, t["name"])
			city["governor"] = t["name"]
			return ok("任命%s為%s太守" % [t["name"], city["name"]])
		"strategist":
			# 任命軍師：外交成功率提升，並可看到各項成功率
			var t = st["generals"].get(cmd.get("target", ""))
			if t == null or t["faction"] != fid or t["status"] != "active":
				return fail("找不到武將")
			World._clear_roles(st, t["name"])
			st["factions"][fid]["strategist"] = t["name"]
			return ok("任命%s為軍師" % t["name"])
		"move":
			var dest = st["cities"].get(cmd.get("dest", ""))
			if dest == null or dest["owner"] != fid or not World.neighbors(st, city["name"]).has(dest["name"]):
				return fail("目的地不正確")
			var ids := [g["name"]]
			for id in cmd.get("generals", []):
				if not ids.has(id):
					ids.append(id)
			var movers := []
			for id in ids:
				var m = st["generals"].get(id)
				if m == null or m["faction"] != fid or m["city"] != city["name"] or m["status"] != "active" or m["acted"]:
					return fail("有武將無法移動")
				movers.append(m)
			var units = units_from_cmd(city, cmd)
			var gold := int(cmd.get("gold", 0))
			var food := int(cmd.get("food", 0))
			if units == null or gold < 0 or gold > int(city["gold"]) or food < 0 or food > int(city["food"]):
				return fail("兵、金或糧數量不正確")
			World.take_units(city, units)
			World.add_units(dest, units, int(city["train"]))
			city["gold"] = int(city["gold"]) - gold
			dest["gold"] = int(dest["gold"]) + gold
			city["food"] = int(city["food"]) - food
			dest["food"] = int(dest["food"]) + food
			var names := []
			for m in movers:
				m["city"] = dest["name"]
				m["acted"] = true
				if city.get("governor", "") == m["name"]:
					city["governor"] = ""
				names.append(m["name"])
			return ok("%s率兵 %d 移動至%s" % ["、".join(names), World.units_total(units), dest["name"]])
		"attack":
			var target = st["cities"].get(cmd.get("target", ""))
			if target == null or target["owner"] == fid or not World.neighbors(st, city["name"]).has(target["name"]):
				return fail("無法進攻該城")
			if not Diplomacy.can_attack(st, fid, target["owner"]):
				return fail("與%s處於%s，不能進攻" % [World.faction_name(st, target["owner"]), Diplomacy.STATE_LABEL[Diplomacy.state_of(st, fid, target["owner"])]])
			var ids := [g["name"]]
			for id in cmd.get("generals", []):
				if not ids.has(id):
					ids.append(id)
			ids = ids.slice(0, 3)
			var army := []
			for id in ids:
				var m = st["generals"].get(id)
				if m == null or m["faction"] != fid or m["city"] != city["name"] or m["status"] != "active" or m["acted"]:
					return fail("有武將無法出陣")
				army.append(m)
			var units = units_from_cmd(city, cmd)
			if units == null:
				return fail("兵力不足")
			var n := World.units_total(units)
			if n < Rules.MIN_ATTACK:
				return fail("出陣兵力至少 %d" % Rules.MIN_ATTACK)
			var food_need := int(ceil(n / 10.0))
			if int(city["food"]) < food_need:
				return fail("軍糧不足（需 %d）" % food_need)
			city["food"] = int(city["food"]) - food_need
			World.take_units(city, units)
			for m in army:
				m["acted"] = true
				if city.get("governor", "") == m["name"]:
					city["governor"] = ""
			Diplomacy.on_attack(st, fid, target["owner"])
			var res := Battle.resolve(st, {"faction": fid, "generals": army, "units": units, "train": int(city["train"]), "from": city["name"]}, target["name"])
			return ok(res["summary"], {"battle": res})
	return fail("未知指令")


# ---------- 每月結算 ----------
static func month_end(st: Dictionary) -> void:
	var player: String = st.get("player", "")
	for c in st["cities"].values():
		if c["owner"] == "":
			# 無主城緩慢補充守軍
			if World.troops(c) < 12000:
				var add := World.empty_units()
				add["infantry"] = 100
				World.add_units(c, add)
			continue
		var ord := 0.5 + float(c["order"]) / 200.0
		c["gold"] = int(c["gold"]) + int(round(float(c["commerce"]) * 0.35 * ord + float(c["pop"]) / 10000.0))
		if int(st["month"]) == 7:
			var harvest := int(round(float(c["farm"]) * 30.0 * ord * float(st.get("harvest_mult", 1.0))))
			c["food"] = int(c["food"]) + harvest
			if c["owner"] == player:
				World.add_log(st, "%s秋收，得糧 %d" % [c["name"], harvest], "info", [player])
		c["food"] = int(c["food"]) - int(ceil(World.troops(c) / 40.0))
		if int(c["food"]) < 0:
			c["food"] = 0
			var lost := int(World.troops(c) * 0.1)
			World.lose_troops(c, lost)
			c["order"] = maxi(0, int(c["order"]) - 5)
			World.add_log(st, "%s缺糧，%d 兵逃散" % [c["name"], lost], "warn", [c["owner"]])
		c["pop"] = maxi(10000, int(round(float(c["pop"]) * (1.0 + (float(c["order"]) - 40.0) / 20000.0))))
		if int(c["train"]) > 50 and World.troops(c) > 0 and Rng.chance(st, 0.3):
			c["train"] = int(c["train"]) - 1
		# 太守：依政務自動發展，魅力高者安定民心
		var gov = st["generals"].get(c.get("governor", ""))
		if gov != null and gov["status"] == "active" and gov["faction"] == c["owner"] and gov["city"] == c["name"]:
			var dev := maxi(1, int(gov["pol"]) / 40)
			c["farm"] = mini(999, int(c["farm"]) + dev)
			c["commerce"] = mini(999, int(c["commerce"]) + dev)
			if int(gov["cha"]) >= 70:
				c["order"] = mini(100, int(c["order"]) + 1)
		elif c.get("governor", "") != "":
			c["governor"] = ""
	if int(st["month"]) == 7:
		st["harvest_mult"] = 1.0
	_loyalty_tick(st)
	Diplomacy.month_tick(st)
	for g in st["generals"].values():
		g["acted"] = false
	st["month"] = int(st["month"]) + 1
	if int(st["month"]) > 12:
		st["month"] = 1
		st["year"] = int(st["year"]) + 1


## 忠誠：低忠誠者可能出奔
static func _loyalty_tick(st: Dictionary) -> void:
	for g in st["generals"].values():
		if g["status"] != "active" or g["ruler"]:
			continue
		var fid: String = g["faction"]
		var ruler = st["generals"].get(st["factions"][fid]["ruler"])
		var rcha := int(ruler["cha"]) if ruler != null else 60
		if rcha < 70 and Rng.chance(st, 0.12):
			g["loyalty"] = maxi(0, int(g["loyalty"]) - 1)
		var loy := int(g["loyalty"])
		if loy < 40 and Rng.chance(st, (40.0 - loy) / 250.0):
			var city: String = g["city"]
			var dests := []
			for n in World.neighbors(st, city):
				var o: String = st["cities"][n]["owner"]
				if o != "" and o != fid:
					dests.append(n)
			World.make_free(st, g)
			if not dests.is_empty() and Rng.chance(st, 0.6):
				var d: String = Rng.pick(st, dests)
				g["city"] = d
				World.join_faction(g, st["cities"][d]["owner"], 60)
				World.add_log(st, "%s離開%s，投奔%s！" % [g["name"], World.faction_name(st, fid), World.faction_name(st, st["cities"][d]["owner"])], "warn", [fid])
			else:
				World.add_log(st, "%s不滿待遇，離開了%s。" % [g["name"], World.faction_name(st, fid)], "warn", [fid])
