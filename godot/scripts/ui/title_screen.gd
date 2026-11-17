extends Control
## 標題畫面：新遊戲（選勢力與模式）、讀取存檔。

const UI = preload("res://scripts/ui/theme_builder.gd")
const Portrait = preload("res://scripts/core/portrait.gd")
const SaveSys = preload("res://scripts/core/save.gd")

signal start_game(fid: String, mode: String)
signal load_game(slot: int)

var content: VBoxContainer
var mode := "historical"


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	var bg := ColorRect.new()
	bg.color = UI.PAPER
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var hills := Control.new()
	hills.set_anchors_preset(Control.PRESET_FULL_RECT)
	hills.draw.connect(func(): _draw_hills(hills))
	hills.resized.connect(hills.queue_redraw)
	add_child(hills)
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(center)
	content = VBoxContainer.new()
	content.alignment = BoxContainer.ALIGNMENT_CENTER
	content.add_theme_constant_override("separation", 14)
	center.add_child(content)
	show_menu()


## 水墨遠山與紅日（原創）
func _draw_hills(c: Control) -> void:
	var s := c.size
	c.draw_circle(Vector2(s.x * 0.74, s.y * 0.24), s.y * 0.08, Color("#b23a2c", 0.8))
	var layers := [[0.66, 0.16, 0.18], [0.74, 0.2, 0.3], [0.84, 0.18, 0.5], [0.95, 0.12, 0.8]]
	for li in layers.size():
		var L: Array = layers[li]
		var pts := PackedVector2Array([Vector2(0, s.y)])
		var steps := 24
		for i in steps + 1:
			var x := s.x * i / steps
			var k := sin(x * 0.006 * (li + 1) + li) * 0.5 + sin(x * 0.017 + li * 3) * 0.5
			pts.append(Vector2(x, s.y * float(L[0]) - maxf(0.0, k) * s.y * float(L[1])))
		pts.append(Vector2(s.x, s.y))
		c.draw_colored_polygon(pts, Color(0.23, 0.2, 0.16, float(L[2]) * 0.6))


func _clear() -> void:
	for ch in content.get_children():
		ch.queue_free()


func show_menu() -> void:
	_clear()
	var t := UI.label("群雄逐鹿", 110, UI.INK, true)
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	content.add_child(t)
	var sub := UI.label("烽煙四起・英雄並立・誰能一統天下", 20, UI.INK_2, true)
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	content.add_child(sub)
	content.add_child(Control.new())
	for item in [["新遊戲", show_factions, true], ["讀取存檔", show_load, false], ["離開", func(): get_tree().quit(), false]]:
		var b := UI.button(item[0], item[1], item[2])
		b.custom_minimum_size = Vector2(280, 48)
		b.add_theme_font_override("font", UI.brush())
		b.add_theme_font_size_override("font_size", 22)
		b.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		content.add_child(b)


func show_factions() -> void:
	_clear()
	var t := UI.label("190年「群雄割據」・選擇君主", 34, UI.INK, true)
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	content.add_child(t)
	var mode_row := HBoxContainer.new()
	mode_row.alignment = BoxContainer.ALIGNMENT_CENTER
	mode_row.add_child(UI.label("模式：", 16, UI.INK_2))
	var mode_pick := OptionButton.new()
	mode_pick.add_item("歷史劇本（依條件發生歷史事件）")
	mode_pick.add_item("自由模式（各勢力自由發展）")
	mode_pick.select(0 if mode == "historical" else 1)
	mode_pick.item_selected.connect(func(i): mode = "historical" if i == 0 else "free")
	mode_row.add_child(mode_pick)
	content.add_child(mode_row)
	var grid := GridContainer.new()
	grid.columns = 3
	grid.add_theme_constant_override("h_separation", 12)
	grid.add_theme_constant_override("v_separation", 12)
	var scn: Dictionary = Game.scenario
	for f in scn.get("factions", []):
		var cities := []
		var troops := 0
		for c in scn["cities"]:
			if c.get("owner", "") == f["id"]:
				cities.append(c["name"])
				for k in c["units"]:
					troops += int(c["units"][k])
		var gens := 0
		var ruler = null
		for g in scn["generals"]:
			if g.get("faction", "") == f["id"]:
				gens += 1
			if g["name"] == f["ruler"]:
				ruler = g
		var diff := 1 if troops >= 60000 else (2 if troops >= 40000 else (3 if troops >= 30000 else (4 if troops >= 15000 else 5)))
		var card := Button.new()
		card.custom_minimum_size = Vector2(380, 120)
		card.add_theme_stylebox_override("normal", UI.box(Color("#fbf5e6"), Color(f["color"]), 3, 4, 10))
		card.add_theme_stylebox_override("hover", UI.box(Color("#fffaf0"), Color(f["color"]).darkened(0.2), 4, 4, 10))
		var fid: String = f["id"]
		card.pressed.connect(func(): start_game.emit(fid, mode))
		var row := HBoxContainer.new()
		row.set_anchors_preset(Control.PRESET_FULL_RECT)
		row.offset_left = 10
		row.offset_top = 8
		row.offset_right = -10
		row.offset_bottom = -8
		row.mouse_filter = Control.MOUSE_FILTER_IGNORE
		row.add_theme_constant_override("separation", 12)
		var pic := TextureRect.new()
		if ruler != null:
			pic.texture = Portrait.texture(ruler, f["color"], "head", 1.0)
		pic.custom_minimum_size = Vector2(96, 96)
		pic.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		pic.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		pic.mouse_filter = Control.MOUSE_FILTER_IGNORE
		row.add_child(pic)
		var col := VBoxContainer.new()
		col.mouse_filter = Control.MOUSE_FILTER_IGNORE
		col.add_child(UI.label(f["name"], 24, Color(f["color"]).darkened(0.25), true))
		col.add_child(UI.label("君主 %s｜%s" % [f["ruler"], "、".join(cities)], 13, UI.INK_2))
		col.add_child(UI.label("武將 %d 名｜兵 %s" % [gens, UI.fmt_w(troops)], 13, UI.INK_2))
		col.add_child(UI.label("難度 " + "★".repeat(diff) + "☆".repeat(5 - diff), 14, UI.CINNABAR))
		row.add_child(col)
		card.add_child(row)
		grid.add_child(card)
	content.add_child(grid)
	var back := UI.button("返回", show_menu)
	back.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	content.add_child(back)


func show_load() -> void:
	_clear()
	var t := UI.label("讀取存檔", 34, UI.INK, true)
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	content.add_child(t)
	for slot in range(0, SaveSys.SLOTS + 1):
		var meta := SaveSys.meta(slot)
		var label := "%s：%s" % ["自動存檔" if slot == 0 else "存檔 %d" % slot, meta if meta != "" else "（空）"]
		var s: int = slot
		var b := UI.button(label, func(): load_game.emit(s))
		b.disabled = meta == ""
		b.custom_minimum_size = Vector2(420, 44)
		b.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		content.add_child(b)
	var back := UI.button("返回", show_menu)
	back.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	content.add_child(back)
