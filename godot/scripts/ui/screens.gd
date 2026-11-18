extends RefCounted
## 武將管理、武將列傳、外交、歷史事件對話、外交提案等畫面。

const Modal = preload("res://scripts/ui/modal.gd")
const UI = preload("res://scripts/ui/theme_builder.gd")
const World = preload("res://scripts/core/world.gd")
const Rules = preload("res://scripts/core/rules.gd")
const Portrait = preload("res://scripts/core/portrait.gd")
const Icons = preload("res://scripts/core/icons.gd")
const Diplomacy = preload("res://scripts/core/diplomacy.gd")


static func _modal(parent: Control, title: String, width: int = 560):
	var m = Modal.new()
	parent.add_child(m)
	m.setup(title, width)
	return m


static func _portrait_rect(g: Dictionary, size: Vector2, mode: String, scale: float) -> TextureRect:
	var tr := TextureRect.new()
	tr.texture = Portrait.texture(g, Game.color(str(g.get("faction", "")) if g.get("faction", "") != "" else str(g.get("former", ""))), mode, scale)
	tr.custom_minimum_size = size
	tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	return tr


# ---------- 武將列傳 ----------
static func general_detail(parent: Control, gname: String) -> void:
	var st: Dictionary = Game.st
	var g: Dictionary = st["generals"][gname]
	var t := Portrait.traits(g)
	var m = _modal(parent, "武將列傳", 680)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 18)
	m.body.add_child(row)
	var frame := PanelContainer.new()
	frame.add_theme_stylebox_override("panel", UI.box(Color("#f6eedb"), UI.INK_2, 2, 2, 4))
	frame.add_child(_portrait_rect(g, Vector2(220, 275), "full", 2.2))
	row.add_child(frame)
	var info := VBoxContainer.new()
	info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	info.add_theme_constant_override("separation", 6)
	row.add_child(info)
	var title_row := HBoxContainer.new()
	title_row.add_child(UI.label(g["name"], 40, UI.INK, true))
	if t.has("title"):
		var ep := UI.label("「%s」" % t["title"], 18, UI.CINNABAR, true)
		ep.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		title_row.add_child(ep)
	info.add_child(title_row)
	var status_txt: String = {"active": "仕官", "free": "在野", "prisoner": "俘虜", "dead": "已故"}.get(g["status"], "")
	var fid: String = g["faction"]
	info.add_child(UI.label("%s・%s・武器：%s" % [World.faction_name(st, fid) if fid != "" else status_txt, Portrait.class_label(g), Portrait.WEAPON_NAME.get(t["weapon"], "—")], 15, UI.INK_2))
	if g["city"] != "":
		info.add_child(UI.label("所在：%s（%s）" % [g["city"], status_txt], 14, UI.MUTED))
	for k in ["lead", "war", "int", "pol", "cha"]:
		info.add_child(UI.stat_bar(Rules.STAT_LABEL[k], int(g[k]), UI.STAT_COLORS[k], 240))
	if g["status"] == "active" and not g["ruler"]:
		info.add_child(UI.stat_bar("忠誠", int(g["loyalty"]), UI.STAT_COLORS["loyalty"], 240))
	info.add_child(UI.label("兵種適性", 15, UI.INK_2, true))
	var apt := HBoxContainer.new()
	apt.add_theme_constant_override("separation", 6)
	for k in Rules.UNIT_KEYS:
		var a := Rules.aptitude(g, k)
		var cell := VBoxContainer.new()
		cell.custom_minimum_size = Vector2(70, 0)
		var icon := TextureRect.new()
		icon.texture = Icons.unit_texture(k, Game.color(fid), 2.0)
		icon.custom_minimum_size = Vector2(40, 36)
		icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		cell.add_child(icon)
		var nl := UI.label(Rules.UNITS[k]["name"], 13, UI.INK_2)
		nl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		cell.add_child(nl)
		var gl := UI.label(a, 24, Color(UI.GRADE_COLORS[a]), true)
		gl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		cell.add_child(gl)
		apt.add_child(cell)
	info.add_child(apt)
	m.add_close()


# ---------- 武將管理 ----------
static func general_list(parent: Control, on_changed: Callable) -> void:
	var st: Dictionary = Game.st
	var me := Game.player()
	var m = _modal(parent, "武將管理", 1040)
	var f: Dictionary = st["factions"][me]
	var gens := World.faction_generals(st, me)
	gens.sort_custom(func(a, b): return a["city"] < b["city"] or (a["city"] == b["city"] and int(a["lead"]) + int(a["war"]) > int(b["lead"]) + int(b["war"])))

	# 軍師任命
	var top := HBoxContainer.new()
	top.add_child(UI.label("軍師：", 16, UI.INK_2))
	var strat := OptionButton.new()
	strat.add_item("（未任命）")
	strat.set_item_metadata(0, "")
	var cur := 0
	for g in gens:
		if g["ruler"]:
			continue
		strat.add_item("%s（智略 %d）" % [g["name"], int(g["int"])])
		strat.set_item_metadata(strat.item_count - 1, g["name"])
		if f.get("strategist", "") == g["name"]:
			cur = strat.item_count - 1
	strat.select(cur)
	strat.item_selected.connect(func(i):
		var who: String = strat.get_item_metadata(i)
		if who != "":
			var r := Game.exec({"type": "strategist", "city": World.capital(st, me), "target": who})
			if r["ok"]:
				Game.toast.emit(r["msg"], false)
				on_changed.call())
	top.add_child(strat)
	top.add_child(UI.label("　軍師可提高外交成功率，並顯示各項成功率。", 13, UI.MUTED))
	m.body.add_child(top)
	m.body.add_child(UI.label("共 %d 名武將" % gens.size(), 14, UI.MUTED))

	for g in gens:
		var card := PanelContainer.new()
		card.add_theme_stylebox_override("panel", UI.box(Color(1, 0.98, 0.93, 0.8), Color(0.23, 0.2, 0.16, 0.2), 1, 3, 6))
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 12)
		card.add_child(row)
		row.add_child(_portrait_rect(g, Vector2(56, 56), "head", 0.7))
		var name_col := VBoxContainer.new()
		name_col.custom_minimum_size.x = 150
		name_col.add_child(UI.label(g["name"], 18, UI.INK, true))
		var roles := []
		if g["ruler"]:
			roles.append("君主")
		if st["cities"][g["city"]].get("governor", "") == g["name"]:
			roles.append("%s太守" % g["city"])
		if f.get("strategist", "") == g["name"]:
			roles.append("軍師")
		name_col.add_child(UI.label("%s　%s" % [g["city"], "・".join(roles)], 13, UI.MUTED))
		row.add_child(name_col)
		var stats := GridContainer.new()
		stats.columns = 3
		stats.add_theme_constant_override("h_separation", 14)
		for k in ["lead", "war", "int", "pol", "cha"]:
			stats.add_child(UI.stat_bar(Rules.STAT_LABEL[k].substr(0, 1), int(g[k]), UI.STAT_COLORS[k], 70))
		if not g["ruler"]:
			stats.add_child(UI.stat_bar("忠", int(g["loyalty"]), UI.STAT_COLORS["loyalty"], 70))
		row.add_child(stats)
		var apt := []
		for k in Rules.UNIT_KEYS:
			apt.append("%s%s" % [Rules.UNITS[k]["short"], Rules.aptitude(g, k)])
		var al := UI.label(" ".join(apt), 14, UI.INK_2)
		al.custom_minimum_size.x = 150
		row.add_child(al)
		var gname: String = g["name"]
		row.add_child(UI.button("列傳", func(): general_detail(parent, gname)))
		m.body.add_child(card)
	m.add_close()


# ---------- 外交 ----------
static func diplomacy(parent: Control, on_changed: Callable) -> void:
	var st: Dictionary = Game.st
	var me := Game.player()
	var m = _modal(parent, "外交", 900)
	m.body.add_child(UI.label("同盟與停戰中的勢力不能互相攻擊。攻擊中立勢力會自動開戰。", 14, UI.MUTED))
	for f in st["factions"].values():
		if not f["alive"] or f["id"] == me:
			continue
		var fid: String = f["id"]
		var r := Diplomacy.rel(st, me, fid)
		var card := PanelContainer.new()
		card.add_theme_stylebox_override("panel", UI.box(Color(1, 0.98, 0.93, 0.8), Color(f["color"]), 2, 3, 8))
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 12)
		card.add_child(row)
		var ruler = st["generals"].get(f["ruler"])
		if ruler != null:
			row.add_child(_portrait_rect(ruler, Vector2(56, 56), "head", 0.7))
		var col := VBoxContainer.new()
		col.custom_minimum_size.x = 240
		col.add_child(UI.label(f["name"], 20, Color(f["color"]).darkened(0.2), true))
		col.add_child(UI.label("城 %d・兵 %s・武將 %d" % [World.cities_of(st, fid).size(), UI.fmt_w(World.faction_power(st, fid) - 2000 * World.cities_of(st, fid).size()), World.faction_generals(st, fid).size()], 13, UI.MUTED))
		row.add_child(col)
		var state_txt: String = Diplomacy.STATE_LABEL[r["state"]]
		if r["state"] == "truce":
			state_txt += "（%d 個月）" % int(r["months"])
		var sl := UI.label("%s　友好 %+d" % [state_txt, int(r["rel"])], 16, UI.CINNABAR if r["state"] == "war" else UI.INK_2, true)
		sl.custom_minimum_size.x = 200
		row.add_child(sl)
		for action in ["alliance", "truce", "war", "surrender"]:
			var act: String = action
			var b := UI.button(Diplomacy.ACTIONS[act]["label"], func(): _envoy(parent, fid, act, on_changed, m))
			row.add_child(b)
		m.body.add_child(card)
	m.add_close()


static func _envoy(parent: Control, fid: String, action: String, on_changed: Callable, list_modal) -> void:
	var st: Dictionary = Game.st
	var me := Game.player()
	var label: String = Diplomacy.ACTIONS[action]["label"]
	var m = _modal(parent, "%s・%s" % [label, World.faction_name(st, fid)], 560)
	var pick := OptionButton.new()
	var gens := World.faction_generals(st, me).filter(func(g): return not g["acted"])
	gens.sort_custom(func(a, b): return int(a["cha"]) + int(a["int"]) > int(b["cha"]) + int(b["int"]))
	for g in gens:
		pick.add_item("%s（%s，魅力 %d、智略 %d）" % [g["name"], g["city"], int(g["cha"]), int(g["int"])])
		pick.set_item_metadata(pick.item_count - 1, g["name"])
	if gens.is_empty():
		m.body.add_child(UI.label("本月沒有可以出使的武將。", 15, UI.CINNABAR))
		m.add_close()
		return
	m.field("使者", pick)
	var hint := UI.label("", 14, UI.INK_2)
	hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	m.body.add_child(hint)
	var has_strat: bool = st["factions"][me].get("strategist", "") != ""
	var update := func():
		var g: Dictionary = st["generals"][pick.get_item_metadata(pick.selected)]
		var p := Diplomacy.chance(st, me, fid, action, g)
		var cost: int = Diplomacy.ACTIONS[action]["cost"]
		var txt := "花費金 %d（從使者所在城支出）。" % cost
		if p <= 0.0:
			txt += "目前無法%s。" % label
		elif action == "war":
			txt += "宣戰後雙方進入交戰。背棄同盟或停戰會使部下忠誠下降。"
		elif has_strat:
			txt += "軍師估計成功率約 %d%%。" % int(round(p * 100))
		else:
			txt += "（任命軍師後可看到成功率）"
		hint.text = txt
	pick.item_selected.connect(func(_i): update.call())
	update.call()
	m.add_button("取消", m.close)
	m.add_button("派遣", func():
		var r := Game.exec({"type": "diplo", "action": action, "target": fid, "general": pick.get_item_metadata(pick.selected)})
		if r["ok"]:
			Game.toast.emit(r["msg"], not r.get("success", true))
			m.close()
			if is_instance_valid(list_modal):
				list_modal.close()
			on_changed.call(), true)


# ---------- 歷史事件 ----------
static func event_dialog(parent: Control, ev: Dictionary, on_done: Callable) -> void:
	var m = _modal(parent, "【%s】" % ev["title"], 680)
	var lines: Array = ev.get("lines", [])
	var idx := [0]
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 16)
	m.body.add_child(row)
	var portrait := TextureRect.new()
	portrait.custom_minimum_size = Vector2(150, 188)
	portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	row.add_child(portrait)
	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(col)
	var who := UI.label("", 22, UI.CINNABAR_D, true)
	col.add_child(who)
	var text := UI.label("", 18, UI.INK)
	text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	text.custom_minimum_size = Vector2(440, 120)
	col.add_child(text)
	var next_btn: Button = m.add_button("繼續", Callable(), true)
	var show := func():
		var l: Dictionary = lines[idx[0]] if not lines.is_empty() else {"speaker": "", "text": ""}
		var sp: String = l.get("speaker", "")
		var g = Game.st["generals"].get(sp)
		portrait.texture = Portrait.texture(g, Game.color(str(g["faction"])), "full", 1.4) if g != null else null
		portrait.visible = g != null
		who.text = sp
		text.text = l.get("text", "")
		next_btn.text = "確定" if idx[0] >= lines.size() - 1 else "繼續"
	next_btn.pressed.connect(func():
		if idx[0] >= lines.size() - 1:
			m.close()
			on_done.call()
		else:
			idx[0] += 1
			show.call())
	show.call()


static func proposal_dialog(parent: Control, p: Dictionary, on_done: Callable) -> void:
	var st: Dictionary = Game.st
	var fid: String = p["from"]
	var label := "同盟" if p["kind"] == "alliance" else "停戰"
	var m = _modal(parent, "%s的使者" % World.faction_name(st, fid), 560)
	var ruler = st["generals"].get(st["factions"][fid]["ruler"])
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 14)
	if ruler != null:
		row.add_child(_portrait_rect(ruler, Vector2(110, 138), "full", 1.0))
	var txt := UI.label("%s派使者前來，提議兩家%s%s。是否接受？" % [World.faction_name(st, fid), label, "（為期一年）" if p["kind"] == "truce" else ""], 18, UI.INK)
	txt.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	txt.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(txt)
	m.body.add_child(row)
	m.add_button("拒絕", func():
		Game.respond_proposal(p, false)
		m.close()
		on_done.call())
	m.add_button("接受", func():
		Game.respond_proposal(p, true)
		m.close()
		on_done.call(), true)
