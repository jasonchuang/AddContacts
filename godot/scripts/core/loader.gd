extends RefCounted
## 讀取劇本 JSON、建立新遊戲狀態、JSON 數字整數化。

const World = preload("res://scripts/core/world.gd")
const Diplomacy = preload("res://scripts/core/diplomacy.gd")

const SCENARIO_PATH := "res://data/scenario_190.json"


## JSON 讀進來的數字都是 float，整數值轉回 int；null 轉成空字串
static func intify(v):
	match typeof(v):
		TYPE_FLOAT:
			if is_equal_approx(v, floor(v)) and abs(v) < 9.0e15:
				return int(v)
			return v
		TYPE_DICTIONARY:
			var d := {}
			for k in v:
				d[k] = intify(v[k])
			return d
		TYPE_ARRAY:
			var a := []
			for x in v:
				a.append(intify(x))
			return a
		TYPE_NIL:
			return ""
	return v


static func load_json(path: String):
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		push_error("無法開啟 %s" % path)
		return null
	var data = JSON.parse_string(f.get_as_text())
	if data == null:
		push_error("JSON 格式錯誤：%s" % path)
		return null
	return intify(data)


static func load_scenario(path: String = SCENARIO_PATH) -> Dictionary:
	var d = load_json(path)
	return d if d is Dictionary else {}


## 建立新遊戲。mode："historical"（歷史事件）或 "free"（自由發展）
static func new_game(scn: Dictionary, player: String, mode: String = "historical", seed_value: int = -1) -> Dictionary:
	var st := {
		"version": 1,
		"scenario": scn["id"],
		"year": int(scn["year"]),
		"month": int(scn["month"]),
		"seed": seed_value if seed_value >= 0 else int(Time.get_unix_time_from_system()) & 0x7FFFFFFF,
		"player": player,
		"mode": mode,
		"factions": {},
		"cities": {},
		"generals": {},
		"roads": scn["roads"].duplicate(true),
		"relations": {},
		"events_done": {},
		"harvest_mult": 1.0,
		"pending": [],
		"log": [],
		"over": {},
	}
	for f in scn["factions"]:
		var fd: Dictionary = f.duplicate(true)
		fd["alive"] = true
		fd["strategist"] = ""
		st["factions"][f["id"]] = fd
	for c in scn["cities"]:
		var cd: Dictionary = c.duplicate(true)
		cd["owner"] = str(c.get("owner", ""))
		cd["governor"] = ""
		st["cities"][c["name"]] = cd
	for g in scn["generals"]:
		var gd: Dictionary = g.duplicate(true)
		gd["id"] = g["name"]
		gd["faction"] = str(g.get("faction", ""))
		gd["acted"] = false
		gd["former"] = ""
		if not gd.has("apt"):
			gd["apt"] = {}
		st["generals"][g["name"]] = gd
	World.add_log(st, "%d年，%s" % [int(scn["year"]), scn.get("description", "")], "sys")
	return st
