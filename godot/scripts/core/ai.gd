extends RefCounted
## 電腦勢力：規則式 AI，只透過 Cmd.exec() 下指令，與玩家遵守相同規則。

const Rules = preload("res://scripts/core/rules.gd")
const Rng = preload("res://scripts/core/rng.gd")
const World = preload("res://scripts/core/world.gd")
const Cmd = preload("res://scripts/core/engine.gd")
const Diplomacy = preload("res://scripts/core/diplomacy.gd")


static func _idle(st: Dictionary, cid: String) -> Array:
	return World.officers(st, cid).filter(func(g): return not g["acted"])


static func threat_to(st: Dictionary, city: Dictionary) -> int:
	var t := 0
	for n in World.neighbors(st, city["name"]):
		var c: Dictionary = st["cities"][n]
		if c["owner"] != "" and c["owner"] != city["owner"] and Diplomacy.can_attack(st, c["owner"], city["owner"]):
			t = maxi(t, World.troops(c))
	return t


static func is_frontier(st: Dictionary, city: Dictionary) -> bool:
	for n in World.neighbors(st, city["name"]):
		if st["cities"][n]["owner"] != city["owner"]:
			return true
	return false


static func run(st: Dictionary, fid: String) -> void:
	Diplomacy.ai_consider(st, fid)
	_appoint(st, fid)
	for city in World.cities_of(st, fid):
		if city["owner"] != fid:
			continue
		_handle_prisoners(st, fid, city)
		_try_attack(st, fid, city)
		_domestic(st, fid, city)
	_reinforce(st, fid)


## 任命軍師（智略最高）與各城太守（政務最高的閒置武將）
static func _appoint(st: Dictionary, fid: String) -> void:
	var f: Dictionary = st["factions"][fid]
	if f.get("strategist", "") == "":
		var cands := World.faction_generals(st, fid).filter(func(g): return not g["ruler"])
		cands.sort_custom(func(a, b): return int(a["int"]) > int(b["int"]))
		if not cands.is_empty() and int(cands[0]["int"]) >= 70:
			Cmd.exec(st, fid, {"type": "strategist", "city": World.capital(st, fid), "target": cands[0]["name"]})
	for city in World.cities_of(st, fid):
		if city.get("governor", "") != "":
			continue
		var gens := World.officers(st, city["name"]).filter(func(g): return not g["ruler"] and g["name"] != f.get("strategist", ""))
		gens.sort_custom(func(a, b): return int(a["pol"]) > int(b["pol"]))
		if not gens.is_empty():
			Cmd.exec(st, fid, {"type": "appoint", "city": city["name"], "target": gens[0]["name"]})


static func _handle_prisoners(st: Dictionary, fid: String, city: Dictionary) -> void:
	for p in World.generals_in(st, city["name"], func(g): return g["status"] == "prisoner"):
		var rec := _idle(st, city["name"])
		rec.sort_custom(func(a, b): return int(a["cha"]) > int(b["cha"]))
		if not rec.is_empty() and Cmd.recruit_chance(st, rec[0], p) > 0.15:
			Cmd.exec(st, fid, {"type": "recruit", "city": city["name"], "general": rec[0]["name"], "target": p["name"]})
		elif p["ruler"] or Rng.chance(st, 0.3):
			Cmd.exec(st, fid, {"type": "release", "city": city["name"], "target": p["name"]})


static func _try_attack(st: Dictionary, fid: String, city: Dictionary) -> void:
	var avail := _idle(st, city["name"])
	var all := World.officers(st, city["name"])
	if avail.is_empty() or World.troops(city) < 8000:
		return
	avail.sort_custom(func(a, b): return int(a["lead"]) + int(a["war"]) > int(b["lead"]) + int(b["war"]))
	var n_army := 1 if all.size() <= 1 else mini(3, mini(avail.size(), all.size() - 1))
	var army := avail.slice(0, n_army)
	var send := int(World.troops(city) * 0.75)
	var lead := int(army[0]["lead"])
	var war := 0
	for g in army:
		war = maxi(war, int(g["war"]))
	var my_pow := send * (0.6 * lead + 0.4 * war) / 100.0 * (0.7 + float(city["train"]) / 100.0 * 0.6)
	var best = null
	var best_ratio := 0.0
	for n in World.neighbors(st, city["name"]):
		var t: Dictionary = st["cities"][n]
		if t["owner"] == fid or not Diplomacy.can_attack(st, fid, t["owner"]):
			continue
		# 不主動攻擊中立勢力，除非對方很弱
		var neutral_rel: bool = t["owner"] != "" and Diplomacy.state_of(st, fid, t["owner"]) == "neutral"
		var defs := World.officers(st, n) if t["owner"] != "" else []
		var tl := 45
		var tw := 45
		for g in defs:
			tl = maxi(tl, int(g["lead"]))
			tw = maxi(tw, int(g["war"]))
		var d_pow := maxf(1.0, World.troops(t) * (0.6 * tl + 0.4 * tw) / 100.0 * (0.7 + float(t["train"]) / 100.0 * 0.6) * (1.0 + float(t["defense"]) / 800.0))
		var ratio := my_pow / d_pow * (1.15 if t["owner"] == "" else 1.0)
		if neutral_rel:
			ratio *= 0.6
		if ratio > best_ratio:
			best_ratio = ratio
			best = t
	var remain := World.troops(city) - send
	if best != null and best_ratio > 1.6 and (remain >= threat_to(st, city) * 0.4 or Rng.chance(st, 0.2)) and int(city["food"]) > send / 10 + 1000:
		var names := []
		for g in army:
			names.append(g["name"])
		Cmd.exec(st, fid, {"type": "attack", "city": city["name"], "general": names[0], "generals": names, "target": best["name"], "troops": send})


## 選擇徵募兵種：剋制鄰近敵軍，參考適性與水路
static func _draft_unit(st: Dictionary, city: Dictionary, g: Dictionary) -> String:
	var enemy := World.empty_units()
	var water := false
	for n in World.neighbors(st, city["name"]):
		var c: Dictionary = st["cities"][n]
		if c["owner"] == city["owner"]:
			continue
		if World.road_water(st, city["name"], n):
			water = true
		for k in Rules.UNIT_KEYS:
			enemy[k] += int(c["units"].get(k, 0))
	var best := "infantry"
	var best_score := -1.0
	for k in Rules.UNIT_KEYS:
		var score := 0.0
		for d in Rules.UNIT_KEYS:
			score += enemy[d] * Rules.matchup(k, d)
		score *= Rules.APT_MULT[Rules.aptitude(g, k)]
		if k == "navy":
			score *= 1.3 if water else 0.5
		if int(city["gold"]) < int(Rules.UNITS[k]["cost"]) * 3:
			score *= 0.5
		score *= 0.9 + Rng.next(st) * 0.2
		if score > best_score:
			best_score = score
			best = k
	return best


static func _domestic(st: Dictionary, fid: String, city: Dictionary) -> void:
	var threat := threat_to(st, city)
	for g in _idle(st, city["name"]):
		if g["acted"]:
			continue
		var cid: String = city["name"]
		var free := World.generals_in(st, cid, func(x): return x["status"] == "free" and not x["hidden"])
		if not free.is_empty() and int(g["cha"]) >= 60:
			Cmd.exec(st, fid, {"type": "recruit", "city": cid, "general": g["name"], "target": free[0]["name"]})
			continue
		var want := maxi(int(threat * 1.1), 8000) if threat > 0 else 8000
		var unit := _draft_unit(st, city, g)
		var mx := Cmd.max_draft(st, city, g, unit)
		if World.troops(city) < want and mx >= 1000 and int(city["gold"]) > 300 and int(city["food"]) > World.troops(city) / 40 * 6:
			Cmd.exec(st, fid, {"type": "draft", "city": cid, "general": g["name"], "unit": unit, "amount": mini(mx, mini(want - World.troops(city) + 1000, 5000))})
			continue
		if int(city["train"]) < 70 and World.troops(city) > 3000:
			Cmd.exec(st, fid, {"type": "train", "city": cid, "general": g["name"]})
			continue
		if Rng.chance(st, 0.15) and not World.generals_in(st, cid, func(x): return x["status"] == "free" and x["hidden"]).is_empty():
			Cmd.exec(st, fid, {"type": "search", "city": cid, "general": g["name"]})
			continue
		var opts := []
		if int(city["order"]) < 90:
			opts.append(["order", 3 if int(city["order"]) < 60 else 1])
		if int(city["farm"]) < 999:
			opts.append(["farm", 2])
		if int(city["commerce"]) < 999:
			opts.append(["commerce", 2])
		if int(city["defense"]) < 999:
			opts.append(["defense", 2 if threat > 0 else 0.5])
		if opts.is_empty():
			Cmd.exec(st, fid, {"type": "train", "city": cid, "general": g["name"]})
			continue
		var total := 0.0
		for o in opts:
			total += o[1]
		var r := Rng.next(st) * total
		var choice: String = opts[0][0]
		for o in opts:
			r -= o[1]
			if r <= 0.0:
				choice = o[0]
				break
		Cmd.exec(st, fid, {"type": choice, "city": cid, "general": g["name"]})


## 後方兵力與武將往前線移動
static func _reinforce(st: Dictionary, fid: String) -> void:
	for city in World.cities_of(st, fid):
		if is_frontier(st, city):
			continue
		var fronts := []
		for n in World.neighbors(st, city["name"]):
			if st["cities"][n]["owner"] == fid:
				fronts.append(st["cities"][n])
		if fronts.is_empty():
			continue
		fronts.sort_custom(func(a, b): return threat_to(st, a) > threat_to(st, b))
		var movers := _idle(st, city["name"])
		var all := World.officers(st, city["name"])
		if movers.is_empty() or all.size() < 2:
			continue
		movers.sort_custom(func(a, b): return int(a["lead"]) > int(b["lead"]))
		var extra := [movers[1]["name"]] if all.size() >= 4 and movers.size() >= 2 else []
		Cmd.exec(st, fid, {
			"type": "move", "city": city["name"], "general": movers[0]["name"], "dest": fronts[0]["name"], "generals": extra,
			"troops": int(World.troops(city) * 0.6), "gold": int(int(city["gold"]) * 0.3), "food": int(int(city["food"]) * 0.3),
		})
