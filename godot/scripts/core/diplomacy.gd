extends RefCounted
## 外交：同盟、停戰、宣戰、勸降。關係存在 st["relations"]["a|b"] = {state, months, rel}
## state：neutral（互不侵犯但可開戰）、war、truce（停戰中，不能攻擊）、alliance（同盟，不能攻擊）

const World = preload("res://scripts/core/world.gd")
const Rng = preload("res://scripts/core/rng.gd")

const STATE_LABEL := {"neutral": "中立", "war": "交戰", "truce": "停戰", "alliance": "同盟"}
const ACTIONS := {
	"alliance": {"label": "同盟", "cost": 300},
	"truce": {"label": "停戰", "cost": 200},
	"war": {"label": "宣戰", "cost": 0},
	"surrender": {"label": "勸降", "cost": 100},
}


static func key(a: String, b: String) -> String:
	return a + "|" + b if a < b else b + "|" + a


static func rel(st: Dictionary, a: String, b: String) -> Dictionary:
	var k := key(a, b)
	if not st["relations"].has(k):
		st["relations"][k] = {"state": "neutral", "months": 0, "rel": 0}
	return st["relations"][k]


static func set_state(st: Dictionary, a: String, b: String, state: String, months: int = 0) -> void:
	var r := rel(st, a, b)
	r["state"] = state
	r["months"] = months
	if state == "alliance":
		r["rel"] = maxi(int(r["rel"]), 40)
	elif state == "war":
		r["rel"] = mini(int(r["rel"]), -20)


static func state_of(st: Dictionary, a: String, b: String) -> String:
	if a == "" or b == "" or a == b:
		return "neutral"
	return str(rel(st, a, b)["state"])


## 可否攻擊：同盟與停戰中不可
static func can_attack(st: Dictionary, a: String, b: String) -> bool:
	if b == "" or a == b:
		return a != b
	var s := state_of(st, a, b)
	return s != "alliance" and s != "truce"


## 攻擊中立勢力時自動開戰
static func on_attack(st: Dictionary, a: String, b: String) -> void:
	if b == "":
		return
	var r := rel(st, a, b)
	if r["state"] == "neutral":
		r["state"] = "war"
		r["rel"] = int(r["rel"]) - 30
		World.add_log(st, "%s向%s開戰！" % [World.faction_name(st, a), World.faction_name(st, b)], "major", [a, b])


static func at_war_with(st: Dictionary, fid: String) -> Array:
	var out := []
	for f in st["factions"].values():
		if f["alive"] and f["id"] != fid and state_of(st, fid, f["id"]) == "war":
			out.append(f["id"])
	return out


## 外交成功率。envoy 為使者武將
static func chance(st: Dictionary, fid: String, target: String, action: String, envoy: Dictionary) -> float:
	var r := rel(st, fid, target)
	var my_p := float(World.faction_power(st, fid))
	var their_p := float(maxi(1, World.faction_power(st, target)))
	var ratio := my_p / their_p
	var strat_bonus := 0.05 if st["factions"][fid].get("strategist", "") != "" else 0.0
	var cha := float(envoy["cha"])
	var intel := float(envoy["int"])
	var p := 0.0
	match action:
		"alliance":
			if r["state"] == "war" or r["state"] == "alliance":
				return 0.0
			p = 0.08 + cha / 220.0 + float(r["rel"]) / 200.0
			# 有共同敵人時更容易
			for e in at_war_with(st, target):
				if e != fid and state_of(st, fid, e) == "war":
					p += 0.15
					break
			if ratio < 0.4:
				p -= 0.1
		"truce":
			if r["state"] != "war":
				return 0.0
			p = 0.12 + intel / 260.0 + float(r["rel"]) / 300.0
			if ratio > 1.3:
				p += 0.15
			elif ratio < 0.7:
				p -= 0.08
		"war":
			return 1.0 if r["state"] != "war" else 0.0
		"surrender":
			if ratio < 3.0:
				return 0.0
			p = clampf((ratio - 3.0) / 6.0, 0.0, 0.45) + cha / 400.0 - 0.05
			if r["state"] == "alliance":
				p -= 0.1
	return clampf(p + strat_bonus, 0.02, 0.85)


## 執行外交指令 {type:"diplo", action, target, general, city}
static func exec(st: Dictionary, fid: String, cmd: Dictionary) -> Dictionary:
	var action: String = cmd.get("action", "")
	var target: String = cmd.get("target", "")
	if not ACTIONS.has(action):
		return {"ok": false, "msg": "未知的外交行動"}
	if target == fid or not st["factions"].has(target) or not st["factions"][target]["alive"]:
		return {"ok": false, "msg": "對象不正確"}
	var g = st["generals"].get(cmd.get("general", ""))
	if g == null or g["faction"] != fid or g["status"] != "active":
		return {"ok": false, "msg": "使者不正確"}
	if g["acted"]:
		return {"ok": false, "msg": "%s本月已行動" % g["name"]}
	var city = st["cities"][g["city"]]
	var cost: int = ACTIONS[action]["cost"]
	if int(city["gold"]) < cost:
		return {"ok": false, "msg": "金不足（需 %d）" % cost}
	var p := chance(st, fid, target, action, g)
	if p <= 0.0:
		return {"ok": false, "msg": "目前無法%s" % ACTIONS[action]["label"]}
	city["gold"] = int(city["gold"]) - cost
	g["acted"] = true
	var fname := World.faction_name(st, fid)
	var tname := World.faction_name(st, target)
	var r := rel(st, fid, target)
	if action == "war":
		var betrayal: bool = r["state"] == "alliance" or r["state"] == "truce"
		set_state(st, fid, target, "war")
		if betrayal:
			for x in World.faction_generals(st, fid):
				if not x["ruler"]:
					x["loyalty"] = maxi(0, int(x["loyalty"]) - 5)
		var msg := "%s向%s宣戰！%s" % [fname, tname, "（背棄盟約，部下忠誠下降）" if betrayal else ""]
		World.add_log(st, msg, "major", [fid, target])
		return {"ok": true, "msg": msg}
	if not Rng.chance(st, p):
		r["rel"] = int(r["rel"]) - 5
		var fail_msg := "%s出使%s，%s遭到拒絕。" % [g["name"], tname, ACTIONS[action]["label"]]
		World.add_log(st, fail_msg, "info", [fid, target])
		return {"ok": true, "msg": fail_msg, "success": false}
	match action:
		"alliance":
			set_state(st, fid, target, "alliance")
		"truce":
			set_state(st, fid, target, "truce", 12)
		"surrender":
			absorb(st, fid, target)
	var ok_msg := "%s出使%s，%s成功！" % [g["name"], tname, ACTIONS[action]["label"]]
	World.add_log(st, ok_msg, "major", [fid, target])
	return {"ok": true, "msg": ok_msg, "success": true}


## 勸降成功：對方城池與武將全部歸順
static func absorb(st: Dictionary, fid: String, target: String) -> void:
	for c in World.cities_of(st, target):
		c["owner"] = fid
		c["governor"] = ""
	for g in World.faction_generals(st, target):
		g["ruler"] = false
		World.join_faction(g, fid, 60 + Rng.range_i(st, 0, 15))
	st["factions"][target]["alive"] = false
	World.add_log(st, "%s歸順了%s。" % [st["factions"][target]["name"], World.faction_name(st, fid)], "major", [fid, target])


## 每月：停戰倒數、關係回歸
static func month_tick(st: Dictionary) -> void:
	for k in st["relations"].keys():
		var r = st["relations"][k]
		if r["state"] == "truce":
			r["months"] = int(r["months"]) - 1
			if int(r["months"]) <= 0:
				r["state"] = "neutral"
				var ids: PackedStringArray = k.split("|")
				World.add_log(st, "%s與%s的停戰期滿。" % [World.faction_name(st, ids[0]), World.faction_name(st, ids[1])], "info", Array(ids))
		var v := int(r["rel"])
		if v > 0:
			r["rel"] = v - 1
		elif v < 0:
			r["rel"] = v + 1


## 電腦勢力的外交判斷。對玩家的提案放入 st["pending"]
static func ai_consider(st: Dictionary, fid: String) -> void:
	var player: String = st.get("player", "")
	var my_p := float(World.faction_power(st, fid))
	for f in st["factions"].values():
		if not f["alive"] or f["id"] == fid:
			continue
		var other: String = f["id"]
		var s := state_of(st, fid, other)
		var their_p := float(maxi(1, World.faction_power(st, other)))
		var kind := ""
		if s == "war" and my_p / their_p < 0.6 and Rng.chance(st, 0.12):
			kind = "truce"
		elif s == "neutral" and Rng.chance(st, 0.04):
			# 對付共同的強敵
			for e in at_war_with(st, fid):
				if state_of(st, other, e) == "war" and float(World.faction_power(st, e)) > my_p:
					kind = "alliance"
					break
		if kind == "":
			continue
		if other == player:
			for p in st["pending"]:
				if p.get("type", "") == "proposal" and p["from"] == fid:
					kind = ""
			if kind != "":
				st["pending"].append({"type": "proposal", "from": fid, "kind": kind})
		else:
			if Rng.chance(st, 0.5):
				set_state(st, fid, other, kind, 12 if kind == "truce" else 0)
				World.add_log(st, "%s與%s%s。" % [World.faction_name(st, fid), World.faction_name(st, other), "締結同盟" if kind == "alliance" else "停戰"], "info", [fid, other])


static func respond(st: Dictionary, proposal: Dictionary, accept: bool) -> String:
	var fid: String = proposal["from"]
	var player: String = st["player"]
	if not st["factions"][fid]["alive"]:
		return ""
	var label: String = "同盟" if proposal["kind"] == "alliance" else "停戰"
	if accept:
		set_state(st, fid, player, proposal["kind"], 12 if proposal["kind"] == "truce" else 0)
		var msg := "接受了%s的%s提議。" % [World.faction_name(st, fid), label]
		World.add_log(st, msg, "major", [fid, player])
		return msg
	rel(st, fid, player)["rel"] = int(rel(st, fid, player)["rel"]) - 10
	return "拒絕了%s的%s提議。" % [World.faction_name(st, fid), label]
