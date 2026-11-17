extends Node
## 全域遊戲控制（autoload：Game）。持有狀態、轉送指令、管理 UI 要依序顯示的戰報與事件。

const Loader = preload("res://scripts/core/loader.gd")
const SaveSys = preload("res://scripts/core/save.gd")
const Cmd = preload("res://scripts/core/engine.gd")
const Turn = preload("res://scripts/core/turn.gd")
const World = preload("res://scripts/core/world.gd")
const Battle = preload("res://scripts/core/battle.gd")
const Diplomacy = preload("res://scripts/core/diplomacy.gd")
const Events = preload("res://scripts/core/events.gd")

signal changed
signal toast(text: String, bad: bool)

const NEUTRAL_COLOR := "#a39a8a"

var scenario: Dictionary = {}
var st: Dictionary = {}
## UI 依序顯示：{kind: "battle"/"event"/"proposal", data}
var queue: Array = []


func _ready() -> void:
	scenario = Loader.load_scenario()
	if scenario.is_empty():
		push_error("劇本資料讀取失敗")


func has_game() -> bool:
	return not st.is_empty()


func new_game(fid: String, mode: String) -> void:
	st = Loader.new_game(scenario, fid, mode)
	queue.clear()
	World.add_log(st, "你成為了%s的君主。目標：統一天下！" % st["factions"][fid]["name"], "major", [fid])
	for ev in Events.check(st, scenario.get("events", [])):
		queue.append({"kind": "event", "data": ev})
	changed.emit()


func player() -> String:
	return st.get("player", "")


func color(fid: String) -> String:
	if fid != "" and st.has("factions") and st["factions"].has(fid):
		return st["factions"][fid]["color"]
	for f in scenario.get("factions", []):
		if f["id"] == fid:
			return f["color"]
	return NEUTRAL_COLOR


func exec(cmd: Dictionary) -> Dictionary:
	var r := Cmd.exec(st, player(), cmd)
	if r["ok"]:
		if not r.has("battle") and cmd.get("type", "") != "diplo":
			World.add_log(st, r["msg"], "info", [player()])
		World.check_end(st)
		changed.emit()
	else:
		toast.emit(r["msg"], true)
	return r


func end_month() -> void:
	if st.is_empty() or not st.get("over", {}).is_empty():
		return
	var battles := []
	var me := player()
	Battle.listener = func(res: Dictionary):
		if res["atk"]["faction"] == me or res["def"]["faction"] == me:
			battles.append(res)
	var fired := Turn.end_month(st, scenario.get("events", []))
	Battle.listener = Callable()
	for b in battles:
		queue.append({"kind": "battle", "data": b})
	for ev in fired:
		queue.append({"kind": "event", "data": ev})
	for p in st["pending"]:
		queue.append({"kind": "proposal", "data": p})
	st["pending"] = []
	SaveSys.save(st, 0)
	changed.emit()


func respond_proposal(p: Dictionary, accept: bool) -> void:
	var msg := Diplomacy.respond(st, p, accept)
	if msg != "":
		toast.emit(msg, false)
	changed.emit()


func save_slot(slot: int) -> bool:
	return SaveSys.save(st, slot)


func load_slot(slot: int) -> bool:
	var d := SaveSys.load_slot(slot)
	if d.is_empty():
		return false
	st = d
	queue.clear()
	changed.emit()
	return true
