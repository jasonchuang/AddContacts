extends Control
## 主畫面：標題 ↔ 遊戲（HUD、地圖、城市面板、戰報），以及各指令表單。

const UI = preload("res://scripts/ui/theme_builder.gd")
const World = preload("res://scripts/core/world.gd")
const Rules = preload("res://scripts/core/rules.gd")
const Cmd = preload("res://scripts/core/engine.gd")
const Diplomacy = preload("res://scripts/core/diplomacy.gd")
const SaveSys = preload("res://scripts/core/save.gd")
const Modal = preload("res://scripts/ui/modal.gd")
const Screens = preload("res://scripts/ui/screens.gd")
const BattleScreen = preload("res://scripts/ui/battle_screen.gd")
const TitleScreen = preload("res://scripts/ui/title_screen.gd")
const WorldMap = preload("res://scripts/ui/world_map.gd")
const CityPanel = preload("res://scripts/ui/city_panel.gd")

const MONTHS := ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"]
const SEASONS := ["春", "春", "春", "夏", "夏", "夏", "秋", "秋", "秋", "冬", "冬", "冬"]

## 掛有自訂腳本的節點不宣告型別，才能存取腳本中的訊號與屬性
var title_screen
var game_root: Control
var overlay: Control
var map_view
var city_panel
var game_bg: ColorRect
var log_view: RichTextLabel
var hud_date: Label
var hud_faction: Label
var hud_res: Label
var end_btn: Button
var toast_label: Label
var selected := ""
var busy := false


func _ready() -> void:
	theme = UI.build()
	game_bg = ColorRect.new()
	game_bg.color = UI.PAPER
	game_bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(game_bg)
	_build_game()
	title_screen = TitleScreen.new()
	add_child(title_screen)
	title_screen.start_game.connect(_on_start)
	title_screen.load_game.connect(_on_load)
	overlay = Control.new()
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(overlay)
	toast_label = UI.label("", 18, Color("#f6eedb"))
	toast_label.add_theme_stylebox_override("normal", UI.box(Color("#2a231b"), Color(0, 0, 0, 0), 0, 4, 10))
	toast_label.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	toast_label.grow_horizontal = Control.GROW_DIRECTION_BOTH
	toast_label.grow_vertical = Control.GROW_DIRECTION_BEGIN
	toast_label.offset_bottom = -24
	toast_label.visible = false
	add_child(toast_label)
	Game.changed.connect(_refresh)
	Game.toast.connect(_toast)
	game_root.visible = false


# ---------- 版面 ----------
func _build_game() -> void:
	game_root = VBoxContainer.new()
	game_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	game_root.add_theme_constant_override("separation", 0)
	add_child(game_root)

	var hud := PanelContainer.new()
	hud.add_theme_stylebox_override("panel", UI.box(UI.HUD, UI.CINNABAR, 0, 0, 10))
	game_root.add_child(hud)
	var hrow := HBoxContainer.new()
	hrow.add_theme_constant_override("separation", 18)
	hud.add_child(hrow)
	hrow.add_child(UI.label("群雄逐鹿", 26, Color("#f6eedb"), true))
	hud_date = UI.label("", 22, Color("#f6eedb"), true)
	hrow.add_child(hud_date)
	hud_faction = UI.label("", 20, Color("#f6eedb"), true)
	hrow.add_child(hud_faction)
	hud_res = UI.label("", 17, Color("#e6d9bb"))
	hud_res.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hrow.add_child(hud_res)
	for item in [["武將", _open_generals], ["外交", _open_diplomacy], ["存檔", _open_save], ["讀檔", _open_load], ["標題", _back_to_title]]:
		var b := UI.button(item[0], item[1])
		b.add_theme_font_override("font", UI.brush())
		b.add_theme_font_size_override("font_size", 18)
		hrow.add_child(b)
	end_btn = UI.button("結束本月", _end_month, true)
	end_btn.add_theme_font_override("font", UI.brush())
	end_btn.add_theme_font_size_override("font_size", 22)
	hrow.add_child(end_btn)

	var main := HBoxContainer.new()
	main.size_flags_vertical = Control.SIZE_EXPAND_FILL
	main.add_theme_constant_override("separation", 12)
	game_root.add_child(main)
	var left := VBoxContainer.new()
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	main.add_child(left)
	map_view = WorldMap.new()
	map_view.size_flags_vertical = Control.SIZE_EXPAND_FILL
	map_view.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	map_view.city_clicked.connect(_select_city)
	left.add_child(map_view)
	var log_panel := PanelContainer.new()
	log_panel.custom_minimum_size = Vector2(0, 150)
	left.add_child(log_panel)
	log_view = RichTextLabel.new()
	log_view.bbcode_enabled = true
	log_view.scroll_following = false
	log_panel.add_child(log_view)

	var side := PanelContainer.new()
	side.custom_minimum_size = Vector2(450, 0)
	main.add_child(side)
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	side.add_child(scroll)
	city_panel = CityPanel.new()
	city_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	city_panel.command.connect(_on_command)
	city_panel.general_clicked.connect(func(n): Screens.general_detail(overlay, n))
	scroll.add_child(city_panel)


# ---------- 流程 ----------
func _on_start(fid: String, mode: String) -> void:
	Game.new_game(fid, mode)
	_enter_game()


func _on_load(slot: int) -> void:
	if Game.load_slot(slot):
		_enter_game()
		_toast("已讀取 %s" % World.date_str(Game.st), false)
	else:
		_toast("讀檔失敗", true)


func _enter_game() -> void:
	title_screen.visible = false
	game_root.visible = true
	var mine := World.cities_of(Game.st, Game.player())
	_select_city(World.capital(Game.st, Game.player()) if not mine.is_empty() else Game.st["cities"].keys()[0])
	_refresh()
	_process_queue()


func _back_to_title() -> void:
	var m = _modal("回到標題", 480)
	m.body.add_child(UI.label("每月結束時會自動存檔。要回到標題畫面嗎？", 16, UI.INK))
	m.add_button("取消", m.close)
	m.add_button("回到標題", func():
		m.close()
		game_root.visible = false
		title_screen.visible = true
		title_screen.show_menu(), true)


func _select_city(cname: String) -> void:
	selected = cname
	map_view.selected = cname
	city_panel.show_city(cname)
	map_view.refresh()


func _refresh() -> void:
	if not Game.has_game():
		return
	var st: Dictionary = Game.st
	var me := Game.player()
	var m := int(st["month"])
	hud_date.text = "%d年 %s（%s）" % [int(st["year"]), MONTHS[m - 1], SEASONS[m - 1]]
	hud_faction.text = World.faction_name(st, me)
	hud_faction.add_theme_color_override("font_color", Color(Game.color(me)).lightened(0.45))
	var troops := 0
	var gold := 0
	var food := 0
	var cs := World.cities_of(st, me)
	for c in cs:
		troops += World.troops(c)
		gold += int(c["gold"])
		food += int(c["food"])
	hud_res.text = "城 %d　兵 %s　金 %s　糧 %s　武將 %d" % [cs.size(), UI.fmt_w(troops), UI.fmt_w(gold), UI.fmt_w(food), World.faction_generals(st, me).size()]
	end_btn.disabled = busy or not st.get("over", {}).is_empty()
	city_panel.show_city(selected)
	map_view.refresh()
	_render_log()


func _render_log() -> void:
	var st: Dictionary = Game.st
	var me := Game.player()
	var lines := PackedStringArray()
	var logs: Array = st["log"]
	for i in range(logs.size() - 1, maxi(-1, logs.size() - 80), -1):
		var l: Dictionary = logs[i]
		var mine: bool = l["factions"].has(me)
		var col := "#8a2a1f" if l["kind"] == "major" else ("#1f1a14" if mine else "#7d7062")
		lines.append("[color=#9a8f80]%s[/color]　[color=%s]%s[/color]" % [l["date"], col, l["text"]])
	log_view.text = "\n".join(lines)


func _end_month() -> void:
	if busy:
		return
	busy = true
	end_btn.disabled = true
	Game.end_month()
	busy = false
	_toast("進入 %s" % World.date_str(Game.st), false)
	_process_queue()


## 依序顯示戰報、事件、外交提案
func _process_queue() -> void:
	if Game.queue.is_empty():
		_check_over()
		return
	var item: Dictionary = Game.queue.pop_front()
	match str(item["kind"]):
		"battle":
			var b = BattleScreen.new()
			overlay.add_child(b)
			b.play(item["data"])
			b.closed.connect(_process_queue)
		"event":
			Screens.event_dialog(overlay, item["data"], _process_queue)
		"proposal":
			Screens.proposal_dialog(overlay, item["data"], _process_queue)
		_:
			_process_queue()


func _check_over() -> void:
	var over: Dictionary = Game.st.get("over", {})
	if over.is_empty():
		return
	var win: bool = over.get("result", "") == "win"
	var m = _modal("天下統一！" if win else "勢力覆滅", 520)
	m.body.add_child(UI.label(("%s，%s平定四方，結束了亂世。" if win else "%s，%s的最後一座城陷落了。") % [World.date_str(Game.st), World.faction_name(Game.st, Game.player())], 18, UI.INK))
	m.add_button("查看地圖", m.close)
	m.add_button("回到標題", func():
		m.close()
		game_root.visible = false
		title_screen.visible = true
		title_screen.show_menu(), true)


func _toast(text: String, bad: bool) -> void:
	toast_label.text = text
	toast_label.add_theme_stylebox_override("normal", UI.box(UI.CINNABAR_D if bad else Color("#2a231b"), Color(0, 0, 0, 0), 0, 4, 10))
	toast_label.visible = true
	toast_label.modulate.a = 1.0
	var tw := create_tween()
	tw.tween_interval(2.2)
	tw.tween_property(toast_label, "modulate:a", 0.0, 0.4)
	tw.tween_callback(func(): toast_label.visible = false)


func _modal(title: String, width: int = 560):
	var m = Modal.new()
	overlay.add_child(m)
	m.setup(title, width)
	return m


# ---------- 存讀檔 ----------
func _open_save() -> void:
	var m = _modal("存檔", 480)
	for slot in range(1, SaveSys.SLOTS + 1):
		var meta := SaveSys.meta(slot)
		var s: int = slot
		var b := UI.button("存檔 %d：%s" % [slot, meta if meta != "" else "（空）"], func():
			if Game.save_slot(s):
				_toast("已存到存檔 %d" % s, false)
			else:
				_toast("存檔失敗", true)
			m.close())
		m.body.add_child(b)
	m.add_close("取消")


func _open_load() -> void:
	var m = _modal("讀檔", 480)
	for slot in range(0, SaveSys.SLOTS + 1):
		var meta := SaveSys.meta(slot)
		var s: int = slot
		var b := UI.button("%s：%s" % ["自動存檔" if slot == 0 else "存檔 %d" % slot, meta if meta != "" else "（空）"], func():
			m.close()
			_on_load(s))
		b.disabled = meta == ""
		m.body.add_child(b)
	m.add_close("取消")


func _open_generals() -> void:
	Screens.general_list(overlay, _refresh)


func _open_diplomacy() -> void:
	Screens.diplomacy(overlay, _refresh)


# ---------- 指令表單 ----------
func _gen_label(g: Dictionary) -> String:
	return "%s（統%d 武%d 智%d 政%d 魅%d）" % [g["name"], int(g["lead"]), int(g["war"]), int(g["int"]), int(g["pol"]), int(g["cha"])]


func _gen_picker(cname: String, sort_key: String) -> OptionButton:
	var ob := OptionButton.new()
	var gens := World.officers(Game.st, cname).filter(func(g): return not g["acted"])
	gens.sort_custom(func(a, b): return int(a[sort_key]) > int(b[sort_key]))
	for g in gens:
		ob.add_item(_gen_label(g))
		ob.set_item_metadata(ob.item_count - 1, g["name"])
	return ob


func _spin(max_v: int, value: int, step: int = 100) -> SpinBox:
	var sb := SpinBox.new()
	sb.min_value = 0
	sb.max_value = maxi(0, max_v)
	sb.step = step
	sb.value = clampi(value, 0, maxi(0, max_v))
	sb.allow_greater = false
	sb.custom_minimum_size.x = 160
	return sb


func _run(cmd: Dictionary, m) -> void:
	var r := Game.exec(cmd)
	if not r["ok"]:
		return
	m.close()
	if r.has("battle"):
		var b = BattleScreen.new()
		overlay.add_child(b)
		b.play(r["battle"])
		b.closed.connect(_check_over)
	else:
		_toast(r["msg"], false)


func _on_command(type: String) -> void:
	var st: Dictionary = Game.st
	var c: Dictionary = st["cities"][selected]
	var cname: String = c["name"]
	if Rules.DEV.has(type):
		var d: Dictionary = Rules.DEV[type]
		var m = _modal("%s・%s" % [d["label"], cname])
		var pick := _gen_picker(cname, d["stat"])
		m.field("執行武將", pick)
		m.body.add_child(UI.label("花費金 %d。效果取決於%s。" % [int(d["cost"]), Rules.STAT_LABEL[d["stat"]]], 14, UI.MUTED))
		m.add_button("取消", m.close)
		m.add_button("執行", func(): _run({"type": type, "city": cname, "general": pick.get_selected_metadata()}, m), true)
		return
	match type:
		"draft":
			_draft_form(c)
		"search":
			var m = _modal("搜尋・%s" % cname)
			var pick := _gen_picker(cname, "int")
			m.field("執行武將", pick)
			m.body.add_child(UI.label("尋找在野人才或金錢。智略越高越容易發現人才。", 14, UI.MUTED))
			m.add_button("取消", m.close)
			m.add_button("搜尋", func(): _run({"type": "search", "city": cname, "general": pick.get_selected_metadata()}, m), true)
		"recruit":
			_recruit_form(c)
		"reward", "appoint":
			var m = _modal(("賞賜" if type == "reward" else "任命太守") + "・" + cname)
			var ob := OptionButton.new()
			for g in World.officers(st, cname):
				if g["ruler"] and type == "reward":
					continue
				ob.add_item("%s（忠誠 %d，政務 %d）" % [g["name"], int(g["loyalty"]), int(g["pol"])])
				ob.set_item_metadata(ob.item_count - 1, g["name"])
			m.field("對象", ob)
			m.body.add_child(UI.label("花費金 100，提升忠誠。不消耗行動。" if type == "reward" else "太守每月依政務自動開發農業與商業，魅力高者還會安定治安。不消耗行動。", 14, UI.MUTED))
			m.add_button("取消", m.close)
			m.add_button("確定", func(): _run({"type": type, "city": cname, "target": ob.get_selected_metadata()}, m), true)
		"prisoner":
			var m = _modal("處置俘虜・%s" % cname)
			var ob := OptionButton.new()
			for g in World.generals_in(st, cname, func(x): return x["status"] == "prisoner"):
				ob.add_item(_gen_label(g))
				ob.set_item_metadata(ob.item_count - 1, g["name"])
			m.field("俘虜（想收為己用請改用「登用」）", ob)
			m.add_button("取消", m.close)
			m.add_button("處斬", func(): _run({"type": "execute", "city": cname, "target": ob.get_selected_metadata()}, m))
			m.add_button("釋放", func(): _run({"type": "release", "city": cname, "target": ob.get_selected_metadata()}, m), true)
		"move":
			_move_form(c)
		"attack":
			_attack_form(c)


func _draft_form(c: Dictionary) -> void:
	var cname: String = c["name"]
	var m = _modal("徵兵・%s" % cname, 620)
	var pick := _gen_picker(cname, "cha")
	m.field("執行武將", pick)
	var unit_pick := OptionButton.new()
	for k in Rules.UNIT_KEYS:
		unit_pick.add_item("%s（每千兵金 %d）：%s" % [Rules.UNITS[k]["name"], int(Rules.UNITS[k]["cost"]), Rules.UNITS[k]["desc"]])
		unit_pick.set_item_metadata(unit_pick.item_count - 1, k)
	m.field("兵種", unit_pick)
	var amt := _spin(0, 3000, 500)
	m.field("徵兵數", amt)
	var hint := UI.label("", 14, UI.MUTED)
	hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	m.body.add_child(hint)
	var update := func():
		if pick.item_count == 0:
			return
		var g: Dictionary = Game.st["generals"][pick.get_selected_metadata()]
		var unit: String = unit_pick.get_selected_metadata()
		var mx := Cmd.max_draft(Game.st, c, g, unit)
		amt.max_value = mx
		hint.text = "最多可徵 %d（受魅力、金、人口限制）。%s適性：%s。徵兵會降低治安，新兵訓練度較低。" % [mx, g["name"], Rules.aptitude(g, unit)]
	pick.item_selected.connect(func(_i): update.call())
	unit_pick.item_selected.connect(func(_i): update.call())
	update.call()
	m.add_button("取消", m.close)
	m.add_button("徵兵", func(): _run({"type": "draft", "city": cname, "general": pick.get_selected_metadata(), "unit": unit_pick.get_selected_metadata(), "amount": int(amt.value)}, m), true)


func _recruit_form(c: Dictionary) -> void:
	var st: Dictionary = Game.st
	var cname: String = c["name"]
	var targets := World.generals_in(st, cname, func(g): return (g["status"] == "free" and not g["hidden"]) or g["status"] == "prisoner")
	if targets.is_empty():
		_toast("城中沒有可登用的人才，先「搜尋」看看", true)
		return
	var m = _modal("登用・%s" % cname, 620)
	var pick := _gen_picker(cname, "cha")
	m.field("執行武將", pick)
	var tp := OptionButton.new()
	for g in targets:
		tp.add_item(("【俘】" if g["status"] == "prisoner" else "") + _gen_label(g))
		tp.set_item_metadata(tp.item_count - 1, g["name"])
	m.field("對象", tp)
	var hint := UI.label("", 14, UI.MUTED)
	m.body.add_child(hint)
	var update := func():
		if pick.item_count == 0:
			return
		var p := Cmd.recruit_chance(st, st["generals"][pick.get_selected_metadata()], st["generals"][tp.get_selected_metadata()])
		var has_strat: bool = st["factions"][Game.player()].get("strategist", "") != ""
		hint.text = ("軍師估計成功率約 %d%%（取決於魅力）" % int(round(p * 100))) if has_strat else "成功率取決於魅力。（任命軍師後可看到成功率）"
	pick.item_selected.connect(func(_i): update.call())
	tp.item_selected.connect(func(_i): update.call())
	update.call()
	m.add_button("取消", m.close)
	m.add_button("登用", func(): _run({"type": "recruit", "city": cname, "general": pick.get_selected_metadata(), "target": tp.get_selected_metadata()}, m), true)


## 分兵種輸入
func _unit_inputs(m, c: Dictionary, ratio: float) -> Dictionary:
	var spins := {}
	var grid := GridContainer.new()
	grid.columns = 2
	for k in Rules.UNIT_KEYS:
		var have := int(c["units"].get(k, 0))
		grid.add_child(UI.label("%s（有 %d）" % [Rules.UNITS[k]["name"], have], 15, UI.INK_2))
		var sb := _spin(have, int(floor(have * ratio / 100.0)) * 100, 100)
		sb.editable = have > 0
		grid.add_child(sb)
		spins[k] = sb
	m.body.add_child(grid)
	return spins


func _units_of(spins: Dictionary) -> Dictionary:
	var u := {}
	for k in spins:
		u[k] = int(spins[k].value)
	return u


func _gen_checks(m, cname: String, default_n: int) -> VBoxContainer:
	var box := VBoxContainer.new()
	var gens := World.officers(Game.st, cname).filter(func(g): return not g["acted"])
	gens.sort_custom(func(a, b): return int(a["lead"]) + int(a["war"]) > int(b["lead"]) + int(b["war"]))
	for i in gens.size():
		var cb := CheckBox.new()
		cb.text = _gen_label(gens[i])
		cb.set_meta("name", gens[i]["name"])
		cb.button_pressed = i < default_n
		box.add_child(cb)
	m.body.add_child(box)
	return box


func _checked(box: VBoxContainer) -> Array:
	var out := []
	for node in box.get_children():
		var cb := node as CheckBox
		if cb != null and cb.button_pressed:
			out.append(cb.get_meta("name"))
	return out


func _move_form(c: Dictionary) -> void:
	var st: Dictionary = Game.st
	var me := Game.player()
	var cname: String = c["name"]
	var dests := []
	for n in World.neighbors(st, cname):
		if st["cities"][n]["owner"] == me:
			dests.append(n)
	if dests.is_empty():
		_toast("沒有相鄰的我方城市", true)
		return
	var m = _modal("移動・%s" % cname, 640)
	var dp := OptionButton.new()
	for d in dests:
		dp.add_item(d)
		dp.set_item_metadata(dp.item_count - 1, d)
	m.field("目的地", dp)
	m.body.add_child(UI.label("移動武將", 15, UI.INK_2, true))
	var checks := _gen_checks(m, cname, 1)
	m.body.add_child(UI.label("帶兵", 15, UI.INK_2, true))
	var spins := _unit_inputs(m, c, 0.0)
	var gold := _spin(int(c["gold"]), 0, 100)
	var food := _spin(int(c["food"]), 0, 1000)
	m.field("運金（最多 %d）" % int(c["gold"]), gold)
	m.field("運糧（最多 %d）" % int(c["food"]), food)
	m.add_button("取消", m.close)
	m.add_button("移動", func():
		var ids := _checked(checks)
		if ids.is_empty():
			_toast("請至少選一名武將", true)
			return
		_run({"type": "move", "city": cname, "general": ids[0], "generals": ids, "dest": dp.get_selected_metadata(), "units": _units_of(spins), "gold": int(gold.value), "food": int(food.value)}, m), true)


func _attack_form(c: Dictionary) -> void:
	var st: Dictionary = Game.st
	var me := Game.player()
	var cname: String = c["name"]
	var targets := []
	for n in World.neighbors(st, cname):
		var o: String = st["cities"][n]["owner"]
		if o != me:
			targets.append(n)
	if targets.is_empty():
		_toast("沒有相鄰的敵城", true)
		return
	var m = _modal("出征・%s" % cname, 700)
	var tp := OptionButton.new()
	for t in targets:
		var tc: Dictionary = st["cities"][t]
		var state := ""
		if tc["owner"] != "":
			state = "，" + Diplomacy.STATE_LABEL[Diplomacy.state_of(st, me, tc["owner"])]
		tp.add_item("%s（%s%s，兵 %s%s）" % [t, World.faction_name(st, tc["owner"]), state, UI.fmt_w(World.troops(tc)), "，水路" if World.road_water(st, cname, t) else ""])
		tp.set_item_metadata(tp.item_count - 1, t)
	m.field("目標", tp)
	var intel := UI.label("", 14, UI.INK_2)
	intel.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	m.body.add_child(intel)
	m.body.add_child(UI.label("出陣武將（最多 3 名，統率最高者為主將）", 15, UI.INK_2, true))
	var checks := _gen_checks(m, cname, 1)
	m.body.add_child(UI.label("出陣兵力（軍糧消耗為兵力 ÷ 10，城中有糧 %d）" % int(c["food"]), 15, UI.INK_2, true))
	var spins := _unit_inputs(m, c, 70.0)
	var update := func():
		var tc: Dictionary = st["cities"][tp.get_selected_metadata()]
		var u := _units_of(spins)
		var fa := World.fractions(u)
		var fd := World.fractions(tc["units"])
		var mult := 0.0
		for a in Rules.UNIT_KEYS:
			for d in Rules.UNIT_KEYS:
				mult += float(fa[a]) * float(fd[d]) * Rules.matchup(a, d)
		var verdict := "兵種佔優" if mult >= 1.06 else ("兵種不利" if mult <= 0.94 else "兵種相當")
		var parts := []
		for k in Rules.UNIT_KEYS:
			if int(tc["units"].get(k, 0)) > 0:
				parts.append("%s%s" % [Rules.UNITS[k]["short"], UI.fmt_w(int(tc["units"][k]))])
		var txt := "守軍：%s　城防 %d　→ %s。槍剋騎・騎剋弓・弓剋槍；水軍沿水路作戰極強。" % ["・".join(parts), int(tc["defense"]), verdict]
		if tc["owner"] != "" and Diplomacy.state_of(st, me, tc["owner"]) != "war":
			txt += "\n注意：與%s目前%s，進攻%s。" % [World.faction_name(st, tc["owner"]), Diplomacy.STATE_LABEL[Diplomacy.state_of(st, me, tc["owner"])], "會自動開戰" if Diplomacy.can_attack(st, me, tc["owner"]) else "前必須先宣戰"]
		intel.text = txt
	tp.item_selected.connect(func(_i): update.call())
	for k in spins:
		spins[k].value_changed.connect(func(_v): update.call())
	update.call()
	m.add_button("取消", m.close)
	m.add_button("出陣！", func():
		var ids := _checked(checks)
		if ids.is_empty():
			_toast("請至少選一名武將", true)
			return
		if ids.size() > 3:
			_toast("最多 3 名武將", true)
			return
		_run({"type": "attack", "city": cname, "general": ids[0], "generals": ids, "target": tp.get_selected_metadata(), "units": _units_of(spins)}, m), true)
