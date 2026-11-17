extends RefCounted
## 世界狀態的查詢與共用操作（城市、武將、兵力、紀錄、勢力存亡）。
## 狀態 st 是純 Dictionary，可直接存成 JSON。

const Rules = preload("res://scripts/core/rules.gd")
const Rng = preload("res://scripts/core/rng.gd")

static var _adj: Dictionary = {}
static var _adj_src: Array = []


# ---------- 地圖 ----------
static func _build_adj(st: Dictionary) -> void:
	if is_same(_adj_src, st["roads"]) and not _adj.is_empty():
		return
	_adj = {}
	for r in st["roads"]:
		if not _adj.has(r["a"]):
			_adj[r["a"]] = []
		if not _adj.has(r["b"]):
			_adj[r["b"]] = []
		_adj[r["a"]].append(r["b"])
		_adj[r["b"]].append(r["a"])
	_adj_src = st["roads"]


static func neighbors(st: Dictionary, cid: String) -> Array:
	_build_adj(st)
	return _adj.get(cid, [])


static func road_water(st: Dictionary, a: String, b: String) -> bool:
	for r in st["roads"]:
		if (r["a"] == a and r["b"] == b) or (r["a"] == b and r["b"] == a):
			return bool(r.get("water", false))
	return false


static func cities_of(st: Dictionary, fid: String) -> Array:
	var out := []
	for c in st["cities"].values():
		if c["owner"] == fid:
			out.append(c)
	return out


static func generals_in(st: Dictionary, cid: String, filter = null) -> Array:
	var out := []
	for g in st["generals"].values():
		if g["city"] == cid and (filter == null or filter.call(g)):
			out.append(g)
	return out


## 城內屬於城主勢力、可行動的武將
static func officers(st: Dictionary, cid: String) -> Array:
	var owner: String = st["cities"][cid]["owner"]
	if owner == "":
		return []
	return generals_in(st, cid, func(g): return g["status"] == "active" and g["faction"] == owner)


static func faction_generals(st: Dictionary, fid: String) -> Array:
	var out := []
	for g in st["generals"].values():
		if g["status"] == "active" and g["faction"] == fid:
			out.append(g)
	return out


static func faction_name(st: Dictionary, fid: String) -> String:
	if fid == "" or not st["factions"].has(fid):
		return "無主"
	return st["factions"][fid]["name"]


static func capital(st: Dictionary, fid: String) -> String:
	var f = st["factions"].get(fid)
	if f == null:
		return ""
	var r = st["generals"].get(f["ruler"])
	if r != null and r["status"] == "active" and st["cities"].has(r["city"]) and st["cities"][r["city"]]["owner"] == fid:
		return r["city"]
	var cs := cities_of(st, fid)
	return cs[0]["name"] if not cs.is_empty() else ""


# ---------- 兵力 ----------
static func troops(c: Dictionary) -> int:
	var t := 0
	for k in Rules.UNIT_KEYS:
		t += int(c["units"].get(k, 0))
	return t


static func units_total(u: Dictionary) -> int:
	var t := 0
	for k in Rules.UNIT_KEYS:
		t += int(u.get(k, 0))
	return t


static func empty_units() -> Dictionary:
	var u := {}
	for k in Rules.UNIT_KEYS:
		u[k] = 0
	return u


## 依比例把 total 分配到各兵種，總和精確
static func scale_units(units: Dictionary, total: int) -> Dictionary:
	var out := empty_units()
	if total <= 0:
		return out
	var sum := units_total(units)
	if sum <= 0:
		out["infantry"] = total
		return out
	var acc := 0
	var big := "infantry"
	for k in Rules.UNIT_KEYS:
		out[k] = int(floor(float(units.get(k, 0)) * total / sum))
		acc += out[k]
		if int(units.get(k, 0)) > int(units.get(big, 0)):
			big = k
	out[big] += total - acc
	return out


static func add_units(c: Dictionary, units: Dictionary, train: int = -1) -> void:
	var n := units_total(units)
	if n <= 0:
		return
	var cur := troops(c)
	if train >= 0:
		c["train"] = int(round((float(c["train"]) * cur + train * n) / float(cur + n)))
	for k in Rules.UNIT_KEYS:
		c["units"][k] = int(c["units"].get(k, 0)) + int(units.get(k, 0))


static func take_units(c: Dictionary, units: Dictionary) -> void:
	for k in Rules.UNIT_KEYS:
		c["units"][k] = max(0, int(c["units"].get(k, 0)) - int(units.get(k, 0)))


## 依比例扣除 n 兵（缺糧逃兵、戰損）
static func lose_troops(c: Dictionary, n: int) -> void:
	var left := maxi(0, troops(c) - n)
	c["units"] = scale_units(c["units"], left)


static func fractions(u: Dictionary) -> Dictionary:
	var t := float(maxi(1, units_total(u)))
	var out := {}
	for k in Rules.UNIT_KEYS:
		out[k] = float(u.get(k, 0)) / t
	return out


static func faction_power(st: Dictionary, fid: String) -> int:
	var p := 0
	for c in cities_of(st, fid):
		p += troops(c) + 2000
	return p


# ---------- 時間與紀錄 ----------
static func ym(st: Dictionary) -> int:
	return int(st["year"]) * 12 + int(st["month"]) - 1


static func date_str(st: Dictionary) -> String:
	return "%d年%d月" % [int(st["year"]), int(st["month"])]


static func add_log(st: Dictionary, text: String, kind: String = "info", factions: Array = []) -> void:
	st["log"].append({"date": date_str(st), "text": text, "kind": kind, "factions": factions})
	if st["log"].size() > 300:
		st["log"] = st["log"].slice(st["log"].size() - 300)


# ---------- 武將與勢力 ----------
static func join_faction(g: Dictionary, fid: String, loyalty: int) -> void:
	g["faction"] = fid
	g["status"] = "active"
	g["hidden"] = false
	g["loyalty"] = loyalty
	g["former"] = ""


static func make_free(st: Dictionary, g: Dictionary) -> void:
	g["faction"] = ""
	g["status"] = "free"
	g["hidden"] = false
	g["loyalty"] = 0
	_clear_roles(st, g["name"])


static func _clear_roles(st: Dictionary, name: String) -> void:
	for c in st["cities"].values():
		if c.get("governor", "") == name:
			c["governor"] = ""
	for f in st["factions"].values():
		if f.get("strategist", "") == name:
			f["strategist"] = ""


static func destroy_faction(st: Dictionary, fid: String) -> void:
	var f = st["factions"][fid]
	f["alive"] = false
	for g in st["generals"].values():
		if g["faction"] == fid and g["status"] == "active":
			make_free(st, g)
	add_log(st, "%s滅亡了。" % f["name"], "major", [fid])


## 君主去世：由繼承人（資料指定，否則魅力最高者）接任
static func ruler_dies(st: Dictionary, fid: String) -> void:
	var f = st["factions"][fid]
	if not f["alive"]:
		return
	var old = st["generals"].get(f["ruler"])
	if old != null:
		old["status"] = "dead"
		old["ruler"] = false
		_clear_roles(st, old["name"])
		add_log(st, "%s去世了。" % old["name"], "major", [fid])
	var heir = null
	for h in f.get("heirs", []):
		var hg = st["generals"].get(h)
		if hg != null and hg["status"] == "active" and hg["faction"] == fid:
			heir = hg
			break
	if heir == null:
		var cands := faction_generals(st, fid)
		cands.sort_custom(func(a, b): return int(a["cha"]) > int(b["cha"]))
		heir = cands[0] if not cands.is_empty() else null
	if heir == null:
		destroy_faction(st, fid)
		return
	heir["ruler"] = true
	heir["loyalty"] = 100
	f["ruler"] = heir["name"]
	f["name"] = "%s軍" % heir["name"]
	_clear_roles(st, heir["name"])
	add_log(st, "%s繼承大業，勢力改稱%s。" % [heir["name"], f["name"]], "major", [fid])


## 城池易主
static func conquer(st: Dictionary, city: Dictionary, atk_fid: String, atk_gens: Array, left: Dictionary, train: int, lines: Array) -> void:
	var old_owner: String = city["owner"]
	var defenders := []
	if old_owner != "":
		defenders = generals_in(st, city["name"], func(g): return g["status"] == "active" and g["faction"] == old_owner)
	city["owner"] = atk_fid
	city["units"] = left.duplicate()
	city["train"] = train
	city["order"] = maxi(10, int(city["order"]) - 15)
	city["governor"] = ""
	for g in atk_gens:
		g["city"] = city["name"]
	if old_owner != "":
		var escapes := []
		for n in neighbors(st, city["name"]):
			if st["cities"][n]["owner"] == old_owner:
				escapes.append(n)
		for g in defenders:
			if not escapes.is_empty() and (g["ruler"] or Rng.next(st) < 0.5 + float(g["war"]) / 400.0):
				g["city"] = Rng.pick(st, escapes)
				lines.append("%s逃往%s" % [g["name"], g["city"]])
			else:
				g["status"] = "prisoner"
				g["former"] = old_owner
				g["faction"] = ""
				_clear_roles(st, g["name"])
				lines.append("%s被俘" % g["name"])
	# 城中關押的我方武將獲救
	for p in generals_in(st, city["name"], func(g): return g["status"] == "prisoner" and g.get("former", "") == atk_fid):
		join_faction(p, atk_fid, maxi(int(p["loyalty"]), 70))
		lines.append("%s獲救歸隊" % p["name"])
	if old_owner != "" and cities_of(st, old_owner).is_empty():
		destroy_faction(st, old_owner)


static func check_end(st: Dictionary) -> Dictionary:
	if not st.get("over", {}).is_empty():
		return st["over"]
	var p: String = st.get("player", "")
	if p != "" and st["factions"].has(p):
		if not st["factions"][p]["alive"]:
			st["over"] = {"result": "lose"}
			add_log(st, "我軍覆滅……", "major", [p])
		else:
			var all_mine := true
			for c in st["cities"].values():
				if c["owner"] != p:
					all_mine = false
					break
			if all_mine:
				st["over"] = {"result": "win"}
				add_log(st, "%s統一天下！" % st["factions"][p]["name"], "major", [p])
	return st.get("over", {})
