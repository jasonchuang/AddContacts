extends RefCounted
## 歷史事件：依資料中的條件（cond）判斷是否觸發，再執行效果（effects）。
## 自由模式下只會發生非歷史事件（例如天災、豐年）。

const World = preload("res://scripts/core/world.gd")
const Rng = preload("res://scripts/core/rng.gd")
const Diplomacy = preload("res://scripts/core/diplomacy.gd")


static func _ym(v: Array) -> int:
	return int(v[0]) * 12 + int(v[1]) - 1


static func _alive(st: Dictionary, fid: String) -> bool:
	return st["factions"].has(fid) and st["factions"][fid]["alive"]


static func _near(st: Dictionary, fid: String, city: String) -> bool:
	if st["cities"][city]["owner"] == fid:
		return true
	for n in World.neighbors(st, city):
		if st["cities"][n]["owner"] == fid:
			return true
	return false


static func _adjacent_factions(st: Dictionary, a: String, b: String) -> bool:
	for c in World.cities_of(st, a):
		for n in World.neighbors(st, c["name"]):
			if st["cities"][n]["owner"] == b:
				return true
	return false


## 條件檢查（chance 最後才擲骰，避免無謂消耗亂數）
static func check_cond(st: Dictionary, cond: Dictionary) -> bool:
	var now := World.ym(st)
	if cond.has("from") and now < _ym(cond["from"]):
		return false
	if cond.has("until") and now > _ym(cond["until"]):
		return false
	if cond.has("month") and int(st["month"]) != int(cond["month"]):
		return false
	for f in cond.get("alive", []):
		if not _alive(st, f):
			return false
	var owns: Dictionary = cond.get("owns", {})
	for f in owns:
		for c in owns[f]:
			if st["cities"][c]["owner"] != f:
				return false
	if cond.has("near"):
		if not _near(st, cond["near"]["faction"], cond["near"]["city"]):
			return false
	if cond.has("neutral_city") and st["cities"][cond["neutral_city"]]["owner"] != "":
		return false
	var con: Dictionary = cond.get("city_owner_not", {})
	for c in con:
		if st["cities"][c]["owner"] == con[c]:
			return false
	var gf: Dictionary = cond.get("general_faction", {})
	for n in gf:
		var g = st["generals"].get(n)
		if g == null or g["status"] != "active" or g["faction"] != gf[n]:
			return false
	for n in cond.get("general_free", []):
		var g = st["generals"].get(n)
		if g == null or g["status"] != "free":
			return false
	var ge: Dictionary = cond.get("general_elsewhere", {})
	for n in ge:
		var g = st["generals"].get(n)
		if g == null or g["status"] == "dead" or g["status"] == "free":
			return false
		if g["status"] == "active" and g["faction"] == ge[n]:
			return false
		if g["ruler"]:
			return false
	var cal: Dictionary = cond.get("cities_at_least", {})
	for f in cal:
		if World.cities_of(st, f).size() < int(cal[f]):
			return false
	if cond.has("adjacent_factions"):
		var af: Array = cond["adjacent_factions"]
		if not _adjacent_factions(st, af[0], af[1]):
			return false
	if cond.has("chance") and not Rng.chance(st, float(cond["chance"])):
		return false
	return true


## 讓武將加入勢力，放在離他最近的該勢力城市
static func _join(st: Dictionary, name: String, fid: String, force: bool) -> bool:
	var g = st["generals"].get(name)
	if g == null or g["status"] == "dead" or not _alive(st, fid):
		return false
	if not force and g["status"] != "free":
		return false
	if g["ruler"]:
		return false
	var dest := ""
	var mine := World.cities_of(st, fid)
	if mine.is_empty():
		return false
	if st["cities"].has(g["city"]) and st["cities"][g["city"]]["owner"] == fid:
		dest = g["city"]
	else:
		var around: Array = World.neighbors(st, g["city"]) if st["cities"].has(g["city"]) else []
		for n in around:
			if st["cities"][n]["owner"] == fid:
				dest = n
				break
	if dest == "":
		dest = World.capital(st, fid)
	World._clear_roles(st, name)
	World.join_faction(g, fid, 90)
	g["city"] = dest
	return true


static func apply_effect(st: Dictionary, e: Dictionary) -> void:
	match str(e["do"]):
		"coalition_against":
			var target: String = e["faction"]
			for f in st["factions"].values():
				if f["alive"] and f["id"] != target:
					Diplomacy.set_state(st, f["id"], target, "war")
					for f2 in st["factions"].values():
						if f2["alive"] and f2["id"] != target and f2["id"] > f["id"]:
							var r := Diplomacy.rel(st, f["id"], f2["id"])
							r["rel"] = int(r["rel"]) + 20
		"loyalty":
			for g in World.faction_generals(st, e["faction"]):
				if not g["ruler"]:
					g["loyalty"] = clampi(int(g["loyalty"]) + int(e["amount"]), 0, 100)
		"loyalty_of":
			for n in e["generals"]:
				var g = st["generals"].get(n)
				if g != null and g["status"] == "active":
					g["loyalty"] = int(e["value"])
		"gold":
			var cap := World.capital(st, e["faction"])
			if cap != "":
				st["cities"][cap]["gold"] = int(st["cities"][cap]["gold"]) + int(e["amount"])
		"city_scale":
			var c: Dictionary = st["cities"][e["city"]]
			c[e["field"]] = int(round(float(c[e["field"]]) * float(e["mult"])))
		"city_add":
			var c: Dictionary = st["cities"][e["city"]]
			c[e["field"]] = int(c[e["field"]]) + int(e["amount"])
		"troops":
			var add := World.empty_units()
			add[e["unit"]] = int(e["amount"])
			World.add_units(st["cities"][e["city"]], add, 40)
		"give_city":
			var c: Dictionary = st["cities"][e["city"]]
			if c["owner"] == "" and _alive(st, e["faction"]):
				c["owner"] = e["faction"]
				c["governor"] = ""
				var u := World.empty_units()
				for k in e.get("units", {}):
					u[k] = int(e["units"][k])
				c["units"] = u
		"join":
			_join(st, e["general"], e["faction"], bool(e.get("force", false)))
		"leave":
			var g = st["generals"].get(e["general"])
			if g != null and g["status"] == "active" and not g["ruler"]:
				World.make_free(st, g)
		"ruler_dies":
			World.ruler_dies(st, e["faction"])
		"relation":
			if _alive(st, e["a"]) and _alive(st, e["b"]):
				Diplomacy.set_state(st, e["a"], e["b"], e["state"], int(e.get("months", 0)))
		"harvest_mult":
			st["harvest_mult"] = float(e["mult"])


## 每月檢查一次。回傳本月觸發的事件定義
static func check(st: Dictionary, defs: Array) -> Array:
	var fired := []
	var historical: bool = st.get("mode", "historical") == "historical"
	var now := World.ym(st)
	for ev in defs:
		if ev.get("historical", false) and not historical:
			continue
		var last = st["events_done"].get(ev["id"])
		if last != null:
			if not ev.get("repeat", false):
				continue
			if now - int(last) < int(ev.get("cooldown", 12)):
				continue
		if not check_cond(st, ev["cond"]):
			continue
		st["events_done"][ev["id"]] = now
		for e in ev["effects"]:
			apply_effect(st, e)
		World.add_log(st, "【%s】%s" % [ev["title"], ev["lines"][0]["text"] if not ev["lines"].is_empty() else ""], "major", [])
		fired.append(ev)
	return fired
