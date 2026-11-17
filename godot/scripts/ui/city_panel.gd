extends VBoxContainer
## 城市管理面板：資源、兵種組成、發展度、武將、指令。

const World = preload("res://scripts/core/world.gd")
const Rules = preload("res://scripts/core/rules.gd")
const Portrait = preload("res://scripts/core/portrait.gd")
const Icons = preload("res://scripts/core/icons.gd")
const UI = preload("res://scripts/ui/theme_builder.gd")

signal command(type: String)
signal general_clicked(gname: String)

const COMMANDS := [
	["farm", "開墾"], ["commerce", "商業"], ["order", "治安"], ["defense", "築城"],
	["train", "訓練"], ["draft", "徵兵"], ["search", "搜尋"], ["recruit", "登用"],
	["reward", "賞賜"], ["appoint", "任命"], ["move", "移動"], ["attack", "出征"],
	["prisoner", "俘虜"],
]

var city_name := ""


func _ready() -> void:
	add_theme_constant_override("separation", 8)


func show_city(cname: String) -> void:
	city_name = cname
	refresh()


func _level(r: float) -> String:
	if r >= 0.85:
		return "極盛"
	if r >= 0.65:
		return "繁榮"
	if r >= 0.45:
		return "尚可"
	if r >= 0.25:
		return "薄弱"
	return "荒蕪"


func refresh() -> void:
	for ch in get_children():
		ch.queue_free()
	if not Game.has_game() or not Game.st["cities"].has(city_name):
		add_child(UI.label("點選地圖上的城市", 16, UI.MUTED))
		return
	var st: Dictionary = Game.st
	var c: Dictionary = st["cities"][city_name]
	var mine: bool = c["owner"] == Game.player()
	var fcol := Color(Game.color(c["owner"]))

	# 標題列
	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 10)
	var sw := ColorRect.new()
	sw.color = fcol
	sw.custom_minimum_size = Vector2(10, 36)
	head.add_child(sw)
	head.add_child(UI.label(c["name"], 32, UI.INK, true))
	var own := UI.label(World.faction_name(st, c["owner"]), 15, fcol.darkened(0.2))
	own.size_flags_vertical = Control.SIZE_SHRINK_END
	head.add_child(own)
	add_child(head)
	var gov: String = c.get("governor", "")
	add_child(UI.label("太守：%s" % (gov if gov != "" else "未任命"), 14, UI.MUTED))

	# 資源
	var grid := GridContainer.new()
	grid.columns = 4
	grid.add_theme_constant_override("h_separation", 14)
	for pair in [["兵", World.troops(c)], ["金", int(c["gold"])], ["糧", int(c["food"])], ["人口", int(c["pop"])]]:
		var cell := VBoxContainer.new()
		cell.add_child(UI.label(pair[0], 12, UI.MUTED))
		cell.add_child(UI.label(UI.fmt_w(int(pair[1])), 20, UI.INK, true))
		grid.add_child(cell)
	add_child(grid)

	# 兵種組成
	var mix := HFlowContainer.new()
	mix.add_theme_constant_override("h_separation", 10)
	for k in Rules.UNIT_KEYS:
		var n := int(c["units"].get(k, 0))
		if n <= 0:
			continue
		var it := HBoxContainer.new()
		var tr := TextureRect.new()
		tr.texture = Icons.unit_texture(k, Game.color(c["owner"]))
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.custom_minimum_size = Vector2(22, 26)
		it.add_child(tr)
		it.add_child(UI.label("%s %s" % [Rules.UNITS[k]["name"], UI.fmt_w(n)], 14, UI.INK_2))
		it.tooltip_text = "%s %d：%s" % [Rules.UNITS[k]["name"], n, Rules.UNITS[k]["desc"]]
		mix.add_child(it)
	add_child(mix)

	# 發展度
	for f in [["farm", "農業", 999, "#3d7a4c"], ["commerce", "商業", 999, "#c06a2e"], ["order", "治安", 100, "#b8892c"], ["defense", "城防", 999, "#4a5560"], ["train", "訓練", 100, "#b23a2c"]]:
		var row := HBoxContainer.new()
		var l := UI.label(f[1], 14, UI.INK_2)
		l.custom_minimum_size.x = 40
		row.add_child(l)
		var bar := ProgressBar.new()
		bar.max_value = f[2]
		bar.value = int(c[f[0]])
		bar.show_percentage = false
		bar.custom_minimum_size = Vector2(0, 8)
		bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		bar.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		bar.add_theme_stylebox_override("fill", UI.box(Color(f[3]), Color(0, 0, 0, 0), 0, 3, 0))
		bar.tooltip_text = "%s %d / %d" % [f[1], int(c[f[0]]), f[2]]
		row.add_child(bar)
		var lv := UI.label(_level(float(c[f[0]]) / float(f[2])), 14, UI.INK_2)
		lv.custom_minimum_size.x = 44
		lv.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		row.add_child(lv)
		add_child(row)

	# 武將
	add_child(_section("麾下武將"))
	var gens := World.officers(st, city_name)
	gens.sort_custom(func(a, b): return (1 if a["ruler"] else 0) > (1 if b["ruler"] else 0) or ((a["ruler"] == b["ruler"]) and int(a["lead"]) + int(a["war"]) + int(a["int"]) > int(b["lead"]) + int(b["war"]) + int(b["int"])))
	if gens.is_empty():
		add_child(UI.label("無人駐守", 14, UI.MUTED))
	for g in gens:
		add_child(_general_row(g, mine))

	var free := World.generals_in(st, city_name, func(g): return g["status"] == "free" and not g["hidden"])
	if not free.is_empty():
		add_child(_section("在野人才"))
		add_child(_people(free))
	var prisoners := World.generals_in(st, city_name, func(g): return g["status"] == "prisoner")
	if not prisoners.is_empty():
		add_child(_section("俘虜"))
		add_child(_people(prisoners))

	if mine and st.get("over", {}).is_empty():
		add_child(_section("指令"))
		var cmds := GridContainer.new()
		cmds.columns = 4
		cmds.add_theme_constant_override("h_separation", 6)
		cmds.add_theme_constant_override("v_separation", 6)
		var has_idle := false
		for g in gens:
			if not g["acted"]:
				has_idle = true
		for pair in COMMANDS:
			var b := Button.new()
			b.text = pair[1]
			b.custom_minimum_size = Vector2(88, 38)
			b.add_theme_font_override("font", UI.brush())
			b.add_theme_font_size_override("font_size", 18)
			var t: String = pair[0]
			match t:
				"reward", "appoint":
					b.disabled = gens.is_empty()
				"prisoner":
					b.disabled = prisoners.is_empty()
				_:
					b.disabled = not has_idle
			b.pressed.connect(func(): command.emit(t))
			cmds.add_child(b)
		add_child(cmds)


func _section(text: String) -> Control:
	var box := HBoxContainer.new()
	var dot := ColorRect.new()
	dot.color = UI.CINNABAR
	dot.custom_minimum_size = Vector2(6, 6)
	dot.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	box.add_child(dot)
	box.add_child(UI.label(text, 18, UI.INK_2, true))
	return box


func _people(list: Array) -> Control:
	var flow := HFlowContainer.new()
	for g in list:
		var b := Button.new()
		b.text = g["name"]
		b.icon = Portrait.texture(g, Game.color(str(g.get("former", ""))), "head", 0.4)
		b.pressed.connect(func(): general_clicked.emit(g["name"]))
		flow.add_child(b)
	return flow


func _general_row(g: Dictionary, mine: bool) -> Control:
	var card := PanelContainer.new()
	card.add_theme_stylebox_override("panel", UI.box(Color(1, 0.98, 0.93, 0.7), Color(0.23, 0.2, 0.16, 0.2), 1, 3, 6))
	if g["acted"] and mine:
		card.modulate = Color(1, 1, 1, 0.6)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	card.add_child(row)
	var pb := TextureButton.new()
	pb.texture_normal = Portrait.texture(g, Game.color(g["faction"]), "head", 0.7)
	pb.ignore_texture_size = true
	pb.stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_CENTERED
	pb.custom_minimum_size = Vector2(56, 56)
	pb.tooltip_text = "查看列傳"
	pb.pressed.connect(func(): general_clicked.emit(g["name"]))
	row.add_child(pb)
	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 1)
	var top := HBoxContainer.new()
	top.add_child(UI.label(g["name"], 18, UI.INK, true))
	var tag := "君主" if g["ruler"] else Portrait.class_label(g)
	top.add_child(UI.label(tag, 12, UI.CINNABAR if g["ruler"] else UI.MUTED))
	if g["acted"] and mine:
		top.add_child(UI.label("已行動", 12, UI.CINNABAR))
	if Game.st["cities"][g["city"]].get("governor", "") == g["name"]:
		top.add_child(UI.label("太守", 12, UI.GOLD))
	if Game.st["factions"][g["faction"]].get("strategist", "") == g["name"]:
		top.add_child(UI.label("軍師", 12, UI.GOLD))
	col.add_child(top)
	var stats := GridContainer.new()
	stats.columns = 2
	stats.add_theme_constant_override("h_separation", 10)
	for k in ["lead", "war", "int", "pol", "cha"]:
		stats.add_child(UI.stat_bar(Rules.STAT_LABEL[k].substr(0, 1), int(g[k]), UI.STAT_COLORS[k], 64))
	if not g["ruler"]:
		stats.add_child(UI.stat_bar("忠", int(g["loyalty"]), UI.STAT_COLORS["loyalty"], 64))
	col.add_child(stats)
	var apt := HBoxContainer.new()
	for k in Rules.UNIT_KEYS:
		var a := Rules.aptitude(g, k)
		apt.add_child(UI.label("%s%s" % [Rules.UNITS[k]["short"], a], 13, Color(UI.GRADE_COLORS[a])))
	col.add_child(apt)
	row.add_child(col)
	return card
