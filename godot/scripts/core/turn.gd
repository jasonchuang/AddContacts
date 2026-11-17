extends RefCounted
## 回合流程：電腦勢力行動 → 每月結算 → 歷史事件。

const World = preload("res://scripts/core/world.gd")
const Rng = preload("res://scripts/core/rng.gd")
const Cmd = preload("res://scripts/core/engine.gd")
const AI = preload("res://scripts/core/ai.gd")
const Events = preload("res://scripts/core/events.gd")


## 結束本月。回傳本月觸發的事件定義
static func end_month(st: Dictionary, event_defs: Array) -> Array:
	if not st.get("over", {}).is_empty():
		return []
	var order := []
	for f in st["factions"].values():
		if f["alive"] and f["id"] != st.get("player", ""):
			order.append(f["id"])
	Rng.shuffle(st, order)
	for fid in order:
		if st["factions"][fid]["alive"] and st.get("over", {}).is_empty():
			AI.run(st, fid)
		World.check_end(st)
	Cmd.month_end(st)
	var fired := Events.check(st, event_defs)
	World.check_end(st)
	return fired
