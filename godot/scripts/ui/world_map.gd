extends Control
## 世界地圖：海岸、勢力領土、河流、山脈、道路、城池。點擊城市發出 city_clicked。
## 地圖座標系為 1000×720，依控制項大小等比例縮放。地形為本作原創繪製。

const World = preload("res://scripts/core/world.gd")
const Rules = preload("res://scripts/core/rules.gd")
const Diplomacy = preload("res://scripts/core/diplomacy.gd")
const Icons = preload("res://scripts/core/icons.gd")
const UI = preload("res://scripts/ui/theme_builder.gd")

signal city_clicked(name: String)

const MAP_SIZE := Vector2(1000, 720)
const SEA := Color("#9fb6b4")
const RIVER := Color("#3d86a6")
const ROAD := Color(0.42, 0.35, 0.27, 0.55)

var selected := ""
var hovered := ""
var _scale := 1.0
var _offset := Vector2.ZERO


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	clip_contents = true
	resized.connect(queue_redraw)


func refresh() -> void:
	queue_redraw()


func _layout() -> void:
	var s := minf(size.x / MAP_SIZE.x, size.y / MAP_SIZE.y)
	_scale = s
	_offset = (size - MAP_SIZE * s) / 2.0


func to_screen(p) -> Vector2:
	return _offset + Vector2(float(p[0]), float(p[1])) * _scale


func _city_pos(c: Dictionary) -> Vector2:
	return to_screen([c["x"], c["y"]])


## Catmull-Rom 平滑
func _smooth(points: Array, steps: int = 6) -> PackedVector2Array:
	var pts := PackedVector2Array()
	for p in points:
		pts.append(to_screen(p))
	var out := PackedVector2Array()
	for i in range(pts.size() - 1):
		var p0 := pts[maxi(i - 1, 0)]
		var p1 := pts[i]
		var p2 := pts[i + 1]
		var p3 := pts[mini(i + 2, pts.size() - 1)]
		for s in steps:
			var t := float(s) / steps
			var t2 := t * t
			var t3 := t2 * t
			out.append(0.5 * ((2.0 * p1) + (-p0 + p2) * t + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2 + (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t3))
	out.append(pts[pts.size() - 1])
	return out


func _draw() -> void:
	if not Game.has_game():
		return
	_layout()
	var st: Dictionary = Game.st
	var terrain: Dictionary = Game.scenario.get("terrain", {})
	var font := UI.font()
	draw_rect(Rect2(Vector2.ZERO, size), UI.PAPER)

	# 海
	var coast := _smooth(terrain.get("coast", []))
	if coast.size() > 2:
		var sea := PackedVector2Array(coast)
		sea.append(Vector2(size.x + 10, size.y + 10))
		sea.append(Vector2(size.x + 10, -10))
		draw_colored_polygon(sea, SEA)
		draw_polyline(coast, Color(0.16, 0.14, 0.1, 0.55), 2.5 * _scale + 1.0, true)
		for i in 24:
			var y := 30.0 + i * 28.0
			var x := 985.0 - float((i * 37) % 26)
			var a := to_screen([x, y])
			draw_arc(a + Vector2(6, 0) * _scale, 6.0 * _scale, PI, TAU, 6, Color(0.24, 0.35, 0.38, 0.45), 1.2)

	# 勢力領土
	for c in st["cities"].values():
		if c["owner"] == "":
			continue
		var col := Color(Game.color(c["owner"]))
		var p := _city_pos(c)
		draw_circle(p, 66.0 * _scale, Color(col, 0.20))
		draw_circle(p, 42.0 * _scale, Color(col, 0.16))
	for r in st["roads"]:
		var A: Dictionary = st["cities"][r["a"]]
		var B: Dictionary = st["cities"][r["b"]]
		if A["owner"] != "" and A["owner"] == B["owner"]:
			draw_line(_city_pos(A), _city_pos(B), Color(Color(Game.color(A["owner"])), 0.22), 14.0 * _scale, true)

	# 河流
	for rv in terrain.get("rivers", []):
		var pts := _smooth(rv["points"])
		var main: bool = str(rv.get("name", "")) != ""
		draw_polyline(pts, Color(RIVER, 0.25), (16.0 if main else 7.0) * _scale, true)
		draw_polyline(pts, Color(RIVER, 0.9), (5.0 if main else 2.6) * _scale, true)
		draw_polyline(pts, Color(0.78, 0.9, 0.94, 0.9), (1.4 if main else 0.8) * _scale, true)
		if main and rv.get("label") is Array:
			var lp := to_screen(rv["label"])
			_text(font, lp, rv["name"], int(22 * _scale) + 6, Color("#2c6f8c"), true)

	# 山脈
	for m in terrain.get("mountains", []):
		_mountain(float(m[0]), float(m[1]), float(m[2]), float(m[3]))

	# 道路
	for r in st["roads"]:
		var a := _city_pos(st["cities"][r["a"]])
		var b := _city_pos(st["cities"][r["b"]])
		var col := Color(RIVER, 0.6) if r.get("water", false) else ROAD
		draw_dashed_line(a, b, col, 2.0, 6.0 * _scale + 2.0)

	# 城市
	var me := Game.player()
	var sel_city = st["cities"].get(selected)
	var targets := []
	if sel_city != null and sel_city["owner"] == me:
		for n in World.neighbors(st, selected):
			var o: String = st["cities"][n]["owner"]
			if o != me and Diplomacy.can_attack(st, me, o):
				targets.append(n)
	for c in st["cities"].values():
		_city(c, font, targets.has(c["name"]))

	# 圖例
	_legend(font)


func _mountain(x: float, y: float, w: float, h: float) -> void:
	var peaks := [[-0.32, 0.65], [0.0, 1.0], [0.3, 0.72]]
	for pk in peaks:
		var px: float = x + w * float(pk[0])
		var ph: float = h * float(pk[1])
		var pw := w * 0.45
		var base_l := to_screen([px - pw, y])
		var top := to_screen([px, y - ph])
		var base_r := to_screen([px + pw, y])
		draw_colored_polygon(PackedVector2Array([base_l, top, base_r]), Color(0.36, 0.32, 0.27, 0.38))
		draw_colored_polygon(PackedVector2Array([top, base_r, to_screen([px + pw * 0.1, y])]), Color(0.2, 0.17, 0.14, 0.22))
		draw_colored_polygon(PackedVector2Array([to_screen([px - pw * 0.25, y - ph * 0.72]), top, to_screen([px + pw * 0.25, y - ph * 0.72])]), Color(0.96, 0.93, 0.85, 0.85))
		draw_polyline(PackedVector2Array([base_l, top, base_r]), Color(0.16, 0.13, 0.1, 0.5), 1.2, true)


func _text(font: Font, center: Vector2, text: String, fsize: int, col: Color, outline: bool = false) -> void:
	var w := font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, fsize).x
	var pos := center + Vector2(-w / 2.0, fsize * 0.35)
	if outline:
		draw_string_outline(font, pos, text, HORIZONTAL_ALIGNMENT_LEFT, -1, fsize, 5, UI.PAPER)
	draw_string(font, pos, text, HORIZONTAL_ALIGNMENT_LEFT, -1, fsize, col)


func _city(c: Dictionary, font: Font, is_target: bool) -> void:
	var p := _city_pos(c)
	var s := clampf(_scale, 0.6, 2.0)
	var owner: String = c["owner"]
	var fcol := Color(Game.color(owner))
	var ink := fcol.darkened(0.55) if owner != "" else Color("#7d756a")
	var st: Dictionary = Game.st
	var capital := false
	if owner != "":
		var r = st["generals"].get(st["factions"][owner]["ruler"])
		capital = r != null and r["city"] == c["name"]
	# 選取與目標
	if c["name"] == selected:
		draw_arc(p, 30.0 * s, 0, TAU, 40, UI.CINNABAR, 3.0, true)
	if c["name"] == hovered:
		draw_circle(p, 26.0 * s, Color(1, 1, 1, 0.25))
	# 駐軍：依兵種組成畫 1~4 個小兵
	var total := World.troops(c)
	var n := 0 if total <= 0 else (1 if total < 5000 else (2 if total < 15000 else (3 if total < 30000 else 4)))
	if n > 0:
		var shares := World.scale_units(c["units"], n)
		var i := 0
		for k in ["archer", "spear", "infantry", "navy", "cav"]:
			for j in int(shares[k]):
				var tex := Icons.unit_texture(k, Game.color(owner), 1.5)
				if tex != null:
					var sz := Vector2(tex.get_width(), tex.get_height()) / 1.5 * 0.62 * s
					draw_texture_rect(tex, Rect2(p + Vector2(-34.0 * s - i * 10.0 * s - sz.x, -6.0 * s), sz), false)
				i += 1
	# 城池剪影
	var wall := PackedVector2Array([p + Vector2(-19, 13) * s, p + Vector2(-16, -1) * s, p + Vector2(16, -1) * s, p + Vector2(19, 13) * s])
	draw_colored_polygon(wall, ink)
	for bx in [-16, -8, 4, 12]:
		draw_rect(Rect2(p + Vector2(bx, -5) * s, Vector2(4, 4) * s), ink)
	draw_rect(Rect2(p + Vector2(-8, -12) * s, Vector2(16, 9) * s), ink)
	draw_colored_polygon(PackedVector2Array([p + Vector2(-15, -11) * s, p + Vector2(0, -19) * s, p + Vector2(15, -11) * s]), ink)
	if capital:
		draw_rect(Rect2(p + Vector2(-5, -25) * s, Vector2(10, 7) * s), ink)
		draw_colored_polygon(PackedVector2Array([p + Vector2(-11, -24) * s, p + Vector2(0, -31) * s, p + Vector2(11, -24) * s]), ink)
	draw_rect(Rect2(p + Vector2(-4, 6) * s, Vector2(8, 7) * s), UI.PAPER)
	# 勢力印章
	if owner != "":
		var seal_r := Rect2(p + Vector2(13, -33) * s, Vector2(18, 18) * s)
		draw_rect(seal_r, fcol)
		draw_rect(seal_r.grow(-2.0 * s), Color(0.96, 0.93, 0.86), false, 1.0)
		var ruler_name: String = st["factions"][owner]["ruler"]
		_text(font, seal_r.get_center(), ruler_name.substr(ruler_name.length() - 1), int(12 * s), Color(0.96, 0.93, 0.86))
	# 名牌
	var fsize := int(15 * s)
	var w := font.get_string_size(c["name"], HORIZONTAL_ALIGNMENT_LEFT, -1, fsize).x + 14.0 * s
	var plate := Rect2(p + Vector2(-w / 2.0, 17.0 * s), Vector2(w, 22.0 * s))
	if owner != "":
		draw_rect(plate, fcol)
		var border := UI.GOLD if owner == Game.player() else Color(0.96, 0.93, 0.86)
		draw_rect(plate, border, false, 2.0 if owner == Game.player() else 1.0)
		_text(font, plate.get_center(), c["name"], fsize, Color(0.99, 0.97, 0.92))
	else:
		draw_rect(plate, Color(0.95, 0.92, 0.84, 0.92))
		draw_rect(plate, Color("#7d756a"), false, 1.0)
		_text(font, plate.get_center(), c["name"], fsize, UI.INK)
	# 可進攻目標
	if is_target:
		var tp := p + Vector2(0, -44) * s
		draw_line(tp + Vector2(-7, -7) * s, tp + Vector2(7, 7) * s, UI.CINNABAR, 3.0)
		draw_line(tp + Vector2(7, -7) * s, tp + Vector2(-7, 7) * s, UI.CINNABAR, 3.0)


func _legend(font: Font) -> void:
	var st: Dictionary = Game.st
	var x := 10.0
	var y := size.y - 12.0
	for f in st["factions"].values():
		if not f["alive"]:
			continue
		var col := Color(f["color"])
		draw_rect(Rect2(Vector2(x, y - 12), Vector2(12, 12)), col)
		var txt: String = f["name"]
		draw_string(font, Vector2(x + 16, y), txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 14, UI.CINNABAR_D if f["id"] == Game.player() else UI.INK_2)
		x += 26.0 + font.get_string_size(txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 14).x


func _city_at(pos: Vector2) -> String:
	if not Game.has_game():
		return ""
	var best := ""
	var best_d := 30.0 * maxf(_scale, 0.6)
	for c in Game.st["cities"].values():
		var d := pos.distance_to(_city_pos(c) + Vector2(0, 6) * _scale)
		if d < best_d:
			best_d = d
			best = c["name"]
	return best


func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion:
		var mm := event as InputEventMouseMotion
		var h := _city_at(mm.position)
		if h != hovered:
			hovered = h
			tooltip_text = _tip(h)
			mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND if h != "" else Control.CURSOR_ARROW
			queue_redraw()
	elif event is InputEventMouseButton:
		var mb := event as InputEventMouseButton
		if mb.pressed and mb.button_index == MOUSE_BUTTON_LEFT:
			var cname := _city_at(mb.position)
			if cname != "":
				selected = cname
				city_clicked.emit(cname)
				queue_redraw()


func _tip(cname: String) -> String:
	if cname == "":
		return ""
	var st: Dictionary = Game.st
	var c: Dictionary = st["cities"][cname]
	var parts := []
	for k in Rules.UNIT_KEYS:
		if int(c["units"].get(k, 0)) > 0:
			parts.append("%s%s" % [Rules.UNITS[k]["short"], UI.fmt_w(int(c["units"][k]))])
	return "%s（%s）\n兵 %s：%s\n武將 %d 名" % [cname, World.faction_name(st, c["owner"]), UI.fmt_w(World.troops(c)), "・".join(parts), World.officers(st, cname).size()]
