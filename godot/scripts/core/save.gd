extends RefCounted
## 存檔：JSON 檔放在 user://saves/（Windows 為 %APPDATA%\Godot\app_userdata\群雄逐鹿）。

const Loader = preload("res://scripts/core/loader.gd")
const SLOTS := 3
const DIR := "user://saves"


static func path_of(slot: int) -> String:
	return "%s/slot_%d.json" % [DIR, slot]


static func save(st: Dictionary, slot: int) -> bool:
	DirAccess.make_dir_recursive_absolute(DIR)
	var f := FileAccess.open(path_of(slot), FileAccess.WRITE)
	if f == null:
		return false
	f.store_string(JSON.stringify(st))
	return true


static func load_slot(slot: int) -> Dictionary:
	if not FileAccess.file_exists(path_of(slot)):
		return {}
	var d = Loader.load_json(path_of(slot))
	if not (d is Dictionary) or int(d.get("version", 0)) != 1:
		return {}
	if not d.has("over") or not (d["over"] is Dictionary):
		d["over"] = {}
	return d


## 存檔摘要（給讀檔畫面）
static func meta(slot: int) -> String:
	var d := load_slot(slot)
	if d.is_empty():
		return ""
	var fname: String = d["factions"][d["player"]]["name"] if d["factions"].has(d["player"]) else "?"
	return "%d年%d月・%s" % [int(d["year"]), int(d["month"]), fname]
