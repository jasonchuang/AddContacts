extends "res://scripts/ui/modal.gd"
## 戰鬥畫面：兩軍兵種圖示依比例排列，逐回合播放兵力變化與事件（單挑、齊射、衝鋒、計略）。

const World = preload("res://scripts/core/world.gd")
const Rules = preload("res://scripts/core/rules.gd")
const Portrait = preload("res://scripts/core/portrait.gd")
const Icons = preload("res://scripts/core/icons.gd")

var res: Dictionary = {}
var frame_i := 1
var timer: Timer
var a_bar: ProgressBar
var d_bar: ProgressBar
var a_num: Label
var d_num: Label
var a_units: Array = []
var d_units: Array = []
var event_label: Label
var lines_box: VBoxContainer
var stamp: Label
var skip_btn: Button
var ok_btn: Button
var done := false


func play(result: Dictionary) -> void:
	res = result
	setup("%s攻防戰" % res["city"], 900)
	title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	var armies := HBoxContainer.new()
	armies.add_theme_constant_override("separation", 20)
	var a_side := _side(res["atk"], false)
	var vs := UI.label("對", 30, UI.CINNABAR, true)
	vs.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var d_side := _side(res["def"], true)
	armies.add_child(a_side)
	armies.add_child(vs)
	armies.add_child(d_side)
	body.add_child(armies)
	a_bar = a_side.get_meta("bar")
	a_num = a_side.get_meta("num")
	d_bar = d_side.get_meta("bar")
	d_num = d_side.get_meta("num")

	var field := PanelContainer.new()
	field.add_theme_stylebox_override("panel", UI.box(Color("#c9cf9f"), Color(0.23, 0.2, 0.16, 0.3), 1, 4, 10))
	field.custom_minimum_size = Vector2(0, 170)
	var fh := HBoxContainer.new()
	field.add_child(fh)
	var fa := HFlowContainer.new()
	fa.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var fd := HFlowContainer.new()
	fd.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	fd.alignment = FlowContainer.ALIGNMENT_END
	fh.add_child(fa)
	fh.add_child(fd)
	body.add_child(field)
	var big := maxi(1, maxi(int(res["atk"]["troops"]), int(res["def"]["troops"])))
	a_units = _make_units(fa, res["atk"], big, false)
	d_units = _make_units(fd, res["def"], big, true)

	event_label = UI.label("", 22, UI.CINNABAR_D, true)
	event_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	event_label.custom_minimum_size.y = 32
	body.add_child(event_label)
	lines_box = VBoxContainer.new()
	body.add_child(lines_box)
	stamp = UI.label("", 64, Color("#f6eedb"), true)
	stamp.visible = false

	skip_btn = add_button("跳過", _finish)
	ok_btn = add_button("確定", close, true)
	ok_btn.visible = false

	timer = Timer.new()
	timer.wait_time = 0.7
	timer.one_shot = true
	timer.timeout.connect(_step)
	add_child(timer)
	_apply(res["frames"][0])
	timer.start()


func _side(info: Dictionary, right: bool) -> Control:
	var box := HBoxContainer.new()
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	box.add_theme_constant_override("separation", 10)
	var portrait := TextureRect.new()
	portrait.custom_minimum_size = Vector2(72, 72)
	portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	var g = Game.st["generals"].get(info["commander"])
	if g != null:
		portrait.texture = Portrait.texture(g, Game.color(info["faction"]), "head", 0.9)
	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var name_l := UI.label("%s（%s）" % [info["name"], "守" if right else "攻"], 20, UI.INK, true)
	col.add_child(name_l)
	col.add_child(UI.label("・".join(info["generals"]) if not info["generals"].is_empty() else "守軍", 13, UI.MUTED))
	var mix := []
	for k in Rules.UNIT_KEYS:
		if int(info["units"].get(k, 0)) > 0:
			mix.append("%s%s" % [Rules.UNITS[k]["short"], UI.fmt_w(int(info["units"][k]))])
	col.add_child(UI.label("・".join(mix), 13, UI.INK_2))
	var num := UI.label(str(int(info["troops"])), 26, UI.INK, true)
	col.add_child(num)
	var bar := ProgressBar.new()
	bar.max_value = maxi(1, int(info["troops"]))
	bar.value = int(info["troops"])
	bar.show_percentage = false
	bar.custom_minimum_size = Vector2(0, 10)
	bar.add_theme_stylebox_override("fill", UI.box(Color(Game.color(info["faction"])), Color(0, 0, 0, 0), 0, 3, 0))
	col.add_child(bar)
	if right:
		name_l.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		num.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		box.add_child(col)
		box.add_child(portrait)
	else:
		box.add_child(portrait)
		box.add_child(col)
	box.set_meta("bar", bar)
	box.set_meta("num", num)
	return box


func _make_units(parent: Container, info: Dictionary, big: int, flip: bool) -> Array:
	var n := maxi(4, int(round(30.0 * int(info["troops"]) / big)))
	var counts := World.scale_units(info["units"], n)
	var out := []
	for k in ["cav", "spear", "infantry", "navy", "archer"]:
		for i in int(counts[k]):
			var tr := TextureRect.new()
			tr.texture = Icons.unit_texture(k, Game.color(info["faction"]), 1.4)
			tr.flip_h = flip
			tr.custom_minimum_size = Vector2(34 if k == "cav" else 24, 32)
			tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
			tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
			out.append(tr)
	if flip:
		out.reverse()
	for tr in out:
		parent.add_child(tr)
	if flip:
		out.reverse()
	return out


func _apply(f: Dictionary) -> void:
	_set_side(a_units, a_bar, a_num, int(f["a"]), int(res["atk"]["troops"]))
	_set_side(d_units, d_bar, d_num, int(f["d"]), int(res["def"]["troops"]))


func _set_side(units: Array, bar: ProgressBar, num: Label, cur: int, init: int) -> void:
	var alive := int(ceil(units.size() * float(cur) / maxf(1.0, float(init))))
	for i in units.size():
		units[i].modulate = Color(1, 1, 1, 1.0 if i < alive else 0.15)
	bar.value = cur
	num.text = str(cur)


func _step() -> void:
	if done:
		return
	var frames: Array = res["frames"]
	if frame_i >= frames.size():
		_finish()
		return
	var f: Dictionary = frames[frame_i]
	_apply(f)
	var delay := 0.45
	var ev: String = f.get("ev", "")
	if ev != "":
		event_label.text = ("單挑！" if f.get("kind", "") == "duel" else "") + ev
		lines_box.add_child(UI.label(ev, 14, UI.INK_2))
		delay = 1.3 if f.get("kind", "") == "duel" else 0.8
	frame_i += 1
	timer.start(delay)


func _finish() -> void:
	if done:
		return
	done = true
	timer.stop()
	var frames: Array = res["frames"]
	_apply(frames[frames.size() - 1])
	var me := Game.player()
	var atk_won: bool = res["result"] == "win"
	var text := ""
	var good := true
	if res["atk"]["faction"] == me:
		text = "勝利" if atk_won else "敗退"
		good = atk_won
	elif res["def"]["faction"] == me:
		text = "失守" if atk_won else "守住"
		good = not atk_won
	else:
		text = "攻陷" if atk_won else "擊退"
	event_label.text = "【%s】%s" % [text, res["summary"]]
	event_label.add_theme_color_override("font_color", UI.CINNABAR if good else UI.INK_2)
	for ch in lines_box.get_children():
		ch.queue_free()
	var lines: Array = res["lines"]
	for i in range(1, lines.size() - 1):
		lines_box.add_child(UI.label(lines[i], 14, UI.INK_2))
	skip_btn.visible = false
	ok_btn.visible = true
	ok_btn.grab_focus()
