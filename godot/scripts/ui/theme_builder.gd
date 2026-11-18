extends RefCounted
## 介面主題：宣紙底、墨色字、朱紅按鈕。字型使用系統中文字型。

const PAPER := Color("#efe5cf")
const PAPER_2 := Color("#e6d9bb")
const PANEL := Color("#f8f1df")
const INK := Color("#1f1a14")
const INK_2 := Color("#3b332a")
const MUTED := Color("#7d7062")
const CINNABAR := Color("#b23a2c")
const CINNABAR_D := Color("#8a2a1f")
const GOLD := Color("#b8892c")
const HUD := Color("#231c15")

const STAT_COLORS := {"lead": "#2f5f8f", "war": "#b23a2c", "int": "#5e4280", "pol": "#3d7a4c", "cha": "#b8892c", "loyalty": "#6b6358"}
const GRADE_COLORS := {"S": "#b23a2c", "A": "#a8743a", "B": "#2f5f8f", "C": "#3d7a4c", "D": "#8d857a"}

static var _font: Font = null
static var _brush: Font = null


const BODY_FONT := "res://fonts/NotoSansTC-Subset.ttf"
const PIXEL_FONT := "res://fonts/FusionPixel12-Subset.ttf"


## 讀取專案內附字型（避免系統缺中文字型時出現亂碼），缺字時退回系統字型
static func _load_font(path: String, sys_names: PackedStringArray, pixel: bool) -> Font:
	var f: Font = null
	if ResourceLoader.exists(path):
		f = load(path) as Font
	if f == null and FileAccess.file_exists(path):
		var raw := FontFile.new()
		if raw.load_dynamic_font(path) == OK:
			f = raw
	var sys := SystemFont.new()
	sys.font_names = sys_names
	if f == null:
		return sys
	var ff := f as FontFile
	if ff != null and pixel:
		ff.antialiasing = TextServer.FONT_ANTIALIASING_NONE
		ff.hinting = TextServer.HINTING_NONE
		ff.subpixel_positioning = TextServer.SUBPIXEL_POSITIONING_DISABLED
	f.fallbacks = [sys]
	return f


static func font() -> Font:
	if _font == null:
		_font = _load_font(BODY_FONT, PackedStringArray(["Noto Sans TC", "Noto Sans CJK TC", "Microsoft JhengHei", "PingFang TC", "Heiti TC", "sans-serif"]), false)
	return _font


## 標題、選單用的像素字型
static func brush() -> Font:
	if _brush == null:
		_brush = _load_font(PIXEL_FONT, PackedStringArray(["Microsoft JhengHei", "PingFang TC", "Noto Sans CJK TC", "sans-serif"]), true)
	return _brush


static func box(bg: Color, border: Color = Color(0, 0, 0, 0), width: int = 0, radius: int = 4, pad: int = 8) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(width)
	s.set_corner_radius_all(radius)
	s.set_content_margin_all(pad)
	return s


static func build() -> Theme:
	var t := Theme.new()
	t.default_font = font()
	t.default_font_size = 16
	t.set_color("font_color", "Label", INK)
	t.set_stylebox("panel", "PanelContainer", box(PANEL, Color(0.23, 0.2, 0.16, 0.35), 1, 4, 12))
	t.set_stylebox("panel", "Panel", box(PANEL, Color(0.23, 0.2, 0.16, 0.35), 1, 4, 12))
	# 按鈕：淡紙底、墨框；主要按鈕另用 primary()
	t.set_stylebox("normal", "Button", box(Color("#fbf5e6"), Color(0.23, 0.2, 0.16, 0.45), 1, 3, 6))
	t.set_stylebox("hover", "Button", box(Color("#fffaf0"), INK_2, 1, 3, 6))
	t.set_stylebox("pressed", "Button", box(PAPER_2, INK, 1, 3, 6))
	t.set_stylebox("disabled", "Button", box(Color("#efe8d8"), Color(0.23, 0.2, 0.16, 0.2), 1, 3, 6))
	t.set_stylebox("focus", "Button", box(Color(0, 0, 0, 0), CINNABAR, 1, 3, 6))
	t.set_color("font_color", "Button", INK)
	t.set_color("font_hover_color", "Button", INK)
	t.set_color("font_pressed_color", "Button", INK)
	t.set_color("font_disabled_color", "Button", Color(0.48, 0.44, 0.38, 0.6))
	t.set_stylebox("normal", "LineEdit", box(Color("#fbf5e6"), Color(0.23, 0.2, 0.16, 0.4), 1, 3, 4))
	t.set_color("font_color", "LineEdit", INK)
	t.set_stylebox("normal", "OptionButton", box(Color("#fbf5e6"), Color(0.23, 0.2, 0.16, 0.45), 1, 3, 6))
	t.set_stylebox("hover", "OptionButton", box(Color("#fffaf0"), INK_2, 1, 3, 6))
	t.set_color("font_color", "OptionButton", INK)
	t.set_color("font_hover_color", "OptionButton", INK)
	t.set_color("font_color", "CheckBox", INK)
	t.set_color("font_hover_color", "CheckBox", INK)
	t.set_color("font_pressed_color", "CheckBox", INK)
	t.set_stylebox("background", "ProgressBar", box(Color(0.23, 0.2, 0.16, 0.12), Color(0, 0, 0, 0), 0, 3, 0))
	t.set_stylebox("fill", "ProgressBar", box(INK_2, Color(0, 0, 0, 0), 0, 3, 0))
	t.set_stylebox("normal", "RichTextLabel", box(Color(0, 0, 0, 0), Color(0, 0, 0, 0), 0, 0, 4))
	t.set_color("default_color", "RichTextLabel", INK_2)
	t.set_color("font_color", "ItemList", INK)
	t.set_stylebox("panel", "PopupMenu", box(PANEL, INK_2, 1, 3, 4))
	t.set_color("font_color", "PopupMenu", INK)
	t.set_color("font_hover_color", "PopupMenu", CINNABAR_D)
	t.set_color("font_color", "TooltipLabel", INK)
	t.set_stylebox("panel", "TooltipPanel", box(PANEL, INK_2, 1, 3, 8))
	return t


## 朱紅主要按鈕
static func primary(b: Button) -> void:
	b.add_theme_stylebox_override("normal", box(CINNABAR, Color("#f6eedb"), 2, 3, 8))
	b.add_theme_stylebox_override("hover", box(CINNABAR.lightened(0.1), Color("#f6eedb"), 2, 3, 8))
	b.add_theme_stylebox_override("pressed", box(CINNABAR_D, Color("#f6eedb"), 2, 3, 8))
	b.add_theme_color_override("font_color", Color("#f6eedb"))
	b.add_theme_color_override("font_hover_color", Color.WHITE)
	b.add_theme_color_override("font_pressed_color", Color.WHITE)


static func label(text: String, size: int = 16, color: Color = INK, use_brush: bool = false) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	if use_brush:
		l.add_theme_font_override("font", brush())
	return l


static func button(text: String, cb: Callable, is_primary: bool = false) -> Button:
	var b := Button.new()
	b.text = text
	if cb.is_valid():
		b.pressed.connect(cb)
	if is_primary:
		primary(b)
	return b


## 能力值長條（1–100 分）
static func stat_bar(label_text: String, value: int, color_hex: String, width: int = 120) -> HBoxContainer:
	var row := HBoxContainer.new()
	var l := label(label_text, 13, INK_2)
	l.custom_minimum_size.x = 34
	row.add_child(l)
	var bar := ProgressBar.new()
	bar.min_value = 0
	bar.max_value = 100
	bar.value = value
	bar.show_percentage = false
	bar.custom_minimum_size = Vector2(width, 8)
	bar.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	bar.add_theme_stylebox_override("fill", box(Color(color_hex), Color(0, 0, 0, 0), 0, 3, 0))
	row.add_child(bar)
	var v := label(str(value), 13, INK_2)
	v.custom_minimum_size.x = 42
	v.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	row.add_child(v)
	return row


static func fmt_w(n: int) -> String:
	if absi(n) >= 10000:
		var s := "%.1f" % (n / 10000.0)
		if s.ends_with(".0"):
			s = s.substr(0, s.length() - 2)
		return s + "萬"
	return str(n)
