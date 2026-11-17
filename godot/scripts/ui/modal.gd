extends Control
## 通用對話框：半透明遮罩 + 置中面板（標題、內容、按鈕列）。

const UI = preload("res://scripts/ui/theme_builder.gd")

signal closed

var body: VBoxContainer
var buttons: HBoxContainer
var title_label: Label
var panel: PanelContainer


func setup(title: String, width: int = 560) -> Control:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	var dim := ColorRect.new()
	dim.color = Color(0.12, 0.1, 0.07, 0.55)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(dim)
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(center)
	panel = PanelContainer.new()
	panel.custom_minimum_size = Vector2(width, 0)
	panel.add_theme_stylebox_override("panel", UI.box(UI.PANEL, UI.INK_2, 2, 4, 18))
	center.add_child(panel)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 10)
	panel.add_child(col)
	title_label = UI.label(title, 26, UI.INK, true)
	col.add_child(title_label)
	var sep := HSeparator.new()
	col.add_child(sep)
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.custom_minimum_size = Vector2(width - 40, 0)
	col.add_child(scroll)
	body = VBoxContainer.new()
	body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_theme_constant_override("separation", 8)
	scroll.add_child(body)
	buttons = HBoxContainer.new()
	buttons.alignment = BoxContainer.ALIGNMENT_END
	buttons.add_theme_constant_override("separation", 8)
	col.add_child(buttons)
	# 內容高度：最多佔畫面 75%
	body.resized.connect(func():
		var vh := get_viewport_rect().size.y
		scroll.custom_minimum_size.y = minf(body.size.y, vh * 0.72))
	return self


func add_button(text: String, cb: Callable, is_primary: bool = false) -> Button:
	var b := UI.button(text, cb, is_primary)
	b.custom_minimum_size.x = 96
	buttons.add_child(b)
	return b


func add_close(text: String = "關閉") -> Button:
	return add_button(text, close)


func field(label_text: String, control: Control) -> Control:
	var box := VBoxContainer.new()
	box.add_child(UI.label(label_text, 14, UI.INK_2))
	box.add_child(control)
	body.add_child(box)
	return control


func close() -> void:
	closed.emit()
	queue_free()


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel"):
		close()
		get_viewport().set_input_as_handled()
