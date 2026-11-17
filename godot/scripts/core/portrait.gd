extends RefCounted
## Q 版武將肖像：依特徵（帽子、鬍鬚、膚色、眼神、武器）組合出原創的 SVG，再轉成貼圖。
## 若 res://art/portraits/<武將名>.png 存在則優先使用插畫。

const SKIN := {"normal": "#f1c99a", "fair": "#f6d7b4", "tan": "#d9a877", "red": "#b4483a", "dark": "#9c6a45"}
const HAIR := {"black": "#231710", "brown": "#4a3020", "grey": "#8c8c8c", "white": "#ece8e0"}
const INK := "#2a1d14"
const WEAPON_NAME := {
	"bow": "弓", "spear": "槍", "snake": "蛇矛", "glaive": "大刀", "halberd": "戟", "axe": "大斧",
	"sword": "劍", "twin": "雙劍", "fan": "羽扇", "scroll": "書卷", "none": "—",
}

static var _cache: Dictionary = {}


static func _hash(s: String) -> int:
	var h := 2166136261
	for i in s.length():
		h = ((h ^ s.unicode_at(i)) * 16777619) & 0xFFFFFFFF
	return h


static func shade(hex: String, amt: float) -> String:
	var c := Color.html(hex)
	if amt >= 0.0:
		c = c.lightened(amt)
	else:
		c = c.darkened(-amt)
	return "#" + c.to_html(false)


## 與紙色混合，讓顏色柔和
static func mute(hex: String, k: float) -> String:
	return "#" + Color.html(hex).lerp(Color.html("#e8dcc0"), k).to_html(false)


## 依身分與能力推得特徵，再套用資料中的 look 設定
static func traits(g: Dictionary) -> Dictionary:
	var h := _hash(str(g["name"]))
	var pick := func(arr: Array, salt: int): return arr[(h >> salt) % arr.size()]
	var t := {}
	var intel := int(g["int"])
	if g.get("ruler", false):
		t = {"hat": "crown", "weapon": "sword", "beard": pick.call(["short", "mustache", "long"], 3), "eyes": pick.call(["calm", "sly"], 5)}
	elif intel >= 80 and int(g["war"]) < 60:
		t = {"hat": "scholar", "robe": true, "weapon": "fan" if intel >= 92 else "scroll", "beard": pick.call(["goatee", "long", "mustache", "none"], 2), "eyes": pick.call(["calm", "sly"], 7)}
	elif int(g["war"]) >= 80:
		t = {"hat": pick.call(["helmet", "helmet", "headband"], 4), "weapon": pick.call(["spear", "glaive", "halberd", "axe", "sword"], 1), "beard": pick.call(["full", "short", "none", "long"], 6), "eyes": "fierce"}
	elif int(g["pol"]) >= 75 and int(g["war"]) < 50:
		t = {"hat": "scholar", "robe": true, "weapon": "scroll", "beard": pick.call(["mustache", "goatee", "short"], 2), "eyes": "calm"}
	else:
		t = {"hat": pick.call(["helmet", "headband"], 3), "weapon": pick.call(["sword", "spear"], 5), "beard": pick.call(["short", "mustache", "none"], 1), "eyes": pick.call(["calm", "fierce"], 8)}
	t["skin"] = pick.call(["normal", "normal", "fair", "tan"], 9)
	t["hair"] = "black"
	t["age"] = "mid"
	t["robe"] = t.get("robe", false)
	var look: Dictionary = g.get("look", {})
	for k in look:
		t[k] = look[k]
	if t["age"] == "old" and t["hair"] == "black":
		t["hair"] = "grey"
	return t


static func class_label(g: Dictionary) -> String:
	var t := traits(g)
	if g.get("ruler", false):
		return "君主"
	if t["weapon"] == "bow":
		return "弓將"
	if int(g["int"]) >= 90 and int(g["war"]) < 70:
		return "軍師"
	if int(g["war"]) >= 90 and int(g["lead"]) >= 85:
		return "名將"
	if int(g["war"]) >= 85:
		return "猛將"
	if int(g["int"]) >= 80 and int(g["lead"]) >= 80:
		return "智將"
	if int(g["pol"]) >= 80:
		return "文官"
	return "武官"


static func _fmt(tpl: String, d: Dictionary) -> String:
	return tpl.format(d)


## 產生 Q 版 SVG。mode："full"（半身）或 "head"（頭像）
static func svg(g: Dictionary, color: String, mode: String = "full") -> String:
	var t := traits(g)
	var skin: String = SKIN.get(t["skin"], SKIN["normal"])
	var v := {
		"ink": INK, "skin": skin, "skinD": shade(skin, -0.14),
		"hair": HAIR.get(t["hair"], HAIR["black"]),
		"cloth": mute(str(t.get("armor", color)), 0.12),
		"bg": mute(color, 0.55),
		"metal": "#7d8a96", "metalL": "#a9b4be", "gold": "#d8a93a", "red": "#d6453a", "steel": "#e3e9ec", "wood": "#8a5a33",
		"eye": str(t.get("eyeColor", INK)), "band": str(t.get("band", shade(color, -0.05))),
	}
	v["clothD"] = shade(v["cloth"], -0.25)
	v["capeC"] = shade(v["cloth"], -0.35)
	v["brow"] = v["hair"] if t["age"] == "old" else INK
	var O := 'stroke="{ink}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"'
	var o := 'stroke="{ink}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"'
	v["O"] = _fmt(O, v)
	v["o"] = _fmt(o, v)
	var p := PackedStringArray()

	# 背景
	p.append('<rect x="-10" y="-10" width="140" height="170" fill="#f6eedb"/>')
	p.append('<circle cx="60" cy="64" r="56" fill="{bg}" opacity=".55"/>')
	for c in [[14, 22, 3], [104, 30, 2.5], [18, 120, 2], [108, 112, 3]]:
		p.append('<circle cx="%s" cy="%s" r="%s" fill="#fff" opacity=".7"/>' % c)

	# 長兵器（身後）
	var shaft := func(y1: int) -> String:
		return '<line x1="102" y1="152" x2="102" y2="%d" stroke="{ink}" stroke-width="6.5" stroke-linecap="round"/><line x1="102" y1="152" x2="102" y2="%d" stroke="{wood}" stroke-width="3.5" stroke-linecap="round"/>' % [y1, y1]
	var blade := 'fill="{steel}" {o}'
	match str(t["weapon"]):
		"spear":
			p.append(shaft.call(26) + '<path d="M102,8 L109,28 L95,28 Z" ' + blade + '/><path d="M96,30 Q102,42 108,30 Z" fill="{red}" {o}/>')
		"snake":
			p.append(shaft.call(30) + '<path d="M102,30 Q110,22 102,14 Q94,6 102,-2" fill="none" stroke="{ink}" stroke-width="7" stroke-linecap="round"/><path d="M102,30 Q110,22 102,14 Q94,6 102,-2" fill="none" stroke="{steel}" stroke-width="4" stroke-linecap="round"/><path d="M96,32 Q102,44 108,32 Z" fill="{red}" {o}/>')
		"glaive":
			p.append(shaft.call(30) + '<path d="M102,8 Q126,14 120,48 Q112,36 102,36 Z" ' + blade + '/><path d="M106,16 Q116,22 115,36" fill="none" stroke="#3d7a4c" stroke-width="2"/>')
		"halberd":
			p.append(shaft.call(20) + '<path d="M102,4 L108,22 L96,22 Z" ' + blade + '/><path d="M102,26 Q118,24 121,40 Q111,34 102,36 Z" ' + blade + '/><path d="M102,26 Q86,24 83,40 Q93,34 102,36 Z" ' + blade + '/>')
		"axe":
			p.append(shaft.call(40) + '<path d="M102,40 Q128,32 124,66 Q114,56 102,58 Z" ' + blade + '/>')
		"sword", "twin":
			p.append('<path d="M86,112 L106,62" stroke="{ink}" stroke-width="7" stroke-linecap="round"/><path d="M86,112 L106,62" stroke="{steel}" stroke-width="4" stroke-linecap="round"/><path d="M80,104 L94,110" stroke="{gold}" stroke-width="5" stroke-linecap="round"/>')
			if t["weapon"] == "twin":
				p.append('<path d="M34,112 L14,62" stroke="{ink}" stroke-width="7" stroke-linecap="round"/><path d="M34,112 L14,62" stroke="{steel}" stroke-width="4" stroke-linecap="round"/><path d="M40,104 L26,110" stroke="{gold}" stroke-width="5" stroke-linecap="round"/>')
		"bow":
			p.append('<path d="M86,104 L100,72" stroke="{ink}" stroke-width="9" stroke-linecap="round"/><path d="M86,104 L100,72" stroke="{wood}" stroke-width="6" stroke-linecap="round"/><path d="M95,74 L98,64 M99,76 L104,67" stroke="{red}" stroke-width="3" stroke-linecap="round"/>')
	if t["hat"] == "crown" and not t["robe"]:
		p.append('<path d="M28,152 Q26,112 60,104 Q94,112 92,152 Z" fill="{capeC}" {O}/>')

	# 身體
	p.append('<path d="M34,152 Q32,112 60,106 Q88,112 86,152 Z" fill="{cloth}" {O}/>')
	if t["robe"]:
		p.append('<path d="M50,108 L60,128 L70,108" fill="#fbf6ea" {o}/><path d="M52,108 L66,134" stroke="{clothD}" stroke-width="3"/><rect x="40" y="136" width="40" height="5" rx="2" fill="{clothD}"/>')
	else:
		p.append('<circle cx="60" cy="128" r="8" fill="{steel}" {o}/><circle cx="58" cy="126" r="2.4" fill="#fff"/><circle cx="36" cy="116" r="10" fill="{gold}" {o}/><circle cx="84" cy="116" r="10" fill="{gold}" {o}/><path d="M44,140 Q60,146 76,140" stroke="{clothD}" stroke-width="2" fill="none"/>')

	# 頭髮、臉
	if not ["helmet", "bald", "feather"].has(t["hat"]):
		p.append('<ellipse cx="60" cy="58" rx="40" ry="36" fill="{hair}" {O}/>')
	p.append('<ellipse cx="24" cy="70" rx="6" ry="8" fill="{skinD}" {O}/><ellipse cx="96" cy="70" rx="6" ry="8" fill="{skinD}" {O}/>')
	p.append('<ellipse cx="60" cy="66" rx="36" ry="34" fill="{skin}" {O}/>')
	if ["crown", "headband", "scholar"].has(t["hat"]):
		p.append('<path d="M25,62 Q24,30 60,28 Q96,30 95,62 Q88,46 74,48 Q68,40 60,48 Q52,40 46,48 Q32,46 25,62 Z" fill="{hair}" {O}/>')
	if t["age"] == "old":
		p.append('<path d="M44,50 Q52,47 58,50 M62,50 Q68,47 76,50" stroke="{skinD}" stroke-width="1.6" fill="none"/>')

	# 眼睛
	var round_eye := func(x: int) -> String:
		return '<ellipse cx="%d" cy="69" rx="5.6" ry="6.8" fill="{eye}"/><circle cx="%.1f" cy="66.4" r="2" fill="#fff"/><circle cx="%.1f" cy="71.5" r=".9" fill="#fff"/>' % [x, x + 1.8, x - 1.6]
	match str(t["eyes"]):
		"fierce":
			p.append('<path d="M37,55 L53,61" stroke="{brow}" stroke-width="5" stroke-linecap="round"/><path d="M83,55 L67,61" stroke="{brow}" stroke-width="5" stroke-linecap="round"/>')
			p.append(round_eye.call(47) + round_eye.call(73))
			p.append('<path d="M41,64 L53,66 M79,64 L67,66" stroke="{skin}" stroke-width="3"/>')
		"sly":
			p.append('<path d="M39,57 Q46,53 53,57 M67,57 Q74,53 81,57" stroke="{brow}" stroke-width="2.4" fill="none" stroke-linecap="round"/>')
			p.append('<path d="M40,70 Q47,64 54,70 M66,70 Q73,64 80,70" stroke="{eye}" stroke-width="3.4" fill="none" stroke-linecap="round"/>')
		_:
			p.append('<path d="M39,57 Q46,53 53,56 M67,56 Q74,53 81,57" stroke="{brow}" stroke-width="3" fill="none" stroke-linecap="round"/>')
			p.append(round_eye.call(47) + round_eye.call(73))
	if t.get("patch", false):
		p.append('<path d="M24,54 L96,68" stroke="{ink}" stroke-width="2.4"/><ellipse cx="47" cy="69" rx="9" ry="8.5" fill="{ink}"/>')
	p.append('<ellipse cx="38" cy="80" rx="6" ry="3.5" fill="#f08a7a" opacity=".45"/><ellipse cx="82" cy="80" rx="6" ry="3.5" fill="#f08a7a" opacity=".45"/>')
	var mouth := "M54,83 Q60,89 66,83"
	if t["eyes"] == "fierce":
		mouth = "M54,86 Q60,82 66,86"
	elif t["eyes"] == "sly":
		mouth = "M54,84 Q61,88 67,82"
	if t["beard"] == "none" or t["beard"] == "goatee":
		p.append('<path d="%s" stroke="{ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>' % mouth)

	# 鬍鬚
	v["bc"] = HAIR.get(t["hair"], HAIR["black"])
	var stache := '<path d="M48,84 Q54,79 60,82.5 Q66,79 72,84 Q66,88 60,85.5 Q54,88 48,84 Z" fill="{bc}" {o}/>'
	match str(t["beard"]):
		"long":
			p.append('<path d="M44,88 Q46,104 54,116 Q59,128 60,132 Q62,126 66,116 Q74,104 76,88 Q68,97 60,97 Q52,97 44,88 Z" fill="{bc}" {o}/>' + stache)
		"full":
			p.append('<path d="M26,70 Q24,100 42,106 L46,100 L50,110 L56,102 L60,112 L64,102 L70,110 L74,100 L78,106 Q96,100 94,70 Q90,92 74,96 Q60,100 46,96 Q30,92 26,70 Z" fill="{bc}" {o}/>' + stache)
		"short":
			p.append('<path d="M42,90 Q46,104 60,105 Q74,104 78,90 Q70,98 60,98 Q50,98 42,90 Z" fill="{bc}" {o}/>' + stache)
		"goatee":
			p.append('<path d="M56,92 Q60,108 64,92 Q60,95 56,92 Z" fill="{bc}" {o}/>')
		"mustache":
			p.append(stache)

	# 帽子
	match str(t["hat"]):
		"helmet":
			p.append('<path d="M20,64 Q18,20 60,18 Q102,20 100,64 L94,66 Q92,40 60,38 Q28,40 26,66 Z" fill="{metal}" {O}/><path d="M30,34 Q60,22 90,34" stroke="{metalL}" stroke-width="3" fill="none"/>')
			p.append('<path d="M22,52 Q60,34 98,52 L98,58 Q60,42 22,58 Z" fill="{gold}" {o}/>')
			p.append('<line x1="60" y1="20" x2="60" y2="8" stroke="{ink}" stroke-width="5" stroke-linecap="round"/><line x1="60" y1="20" x2="60" y2="8" stroke="{gold}" stroke-width="2.5"/>')
			p.append('<path d="M60,10 Q48,0 55,-8 Q60,2 65,-8 Q72,0 60,10 Z" fill="{red}" {o}/>')
			p.append('<path d="M20,58 Q14,82 24,90 L30,66 Z M100,58 Q106,82 96,90 L90,66 Z" fill="{metal}" {o}/>')
		"feather":
			p.append('<path d="M46,30 Q22,-14 -6,-2" stroke="{ink}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M46,30 Q22,-14 -6,-2" stroke="#c0392b" stroke-width="4.5" fill="none" stroke-linecap="round"/>')
			p.append('<path d="M74,30 Q98,-14 126,-2" stroke="{ink}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M74,30 Q98,-14 126,-2" stroke="#c0392b" stroke-width="4.5" fill="none" stroke-linecap="round"/>')
			p.append('<path d="M26,56 Q24,22 60,20 Q96,22 94,56 Q60,38 26,56 Z" fill="#e2b54a" {O}/><circle cx="60" cy="34" r="5" fill="{red}" {o}/>')
		"crown":
			p.append('<rect x="47" y="8" width="26" height="22" rx="5" fill="{ink}"/><rect x="43" y="26" width="34" height="7" rx="3" fill="{gold}" {o}/>')
			p.append('<line x1="34" y1="18" x2="86" y2="18" stroke="{ink}" stroke-width="5" stroke-linecap="round"/><line x1="34" y1="18" x2="86" y2="18" stroke="{gold}" stroke-width="2.6" stroke-linecap="round"/><circle cx="60" cy="18" r="3.5" fill="{red}"/>')
		"scholar":
			p.append('<path d="M22,56 Q20,14 60,12 Q100,14 98,56 Q82,38 60,38 Q38,38 22,56 Z" fill="#33475b" {O}/><path d="M40,20 L40,40 M52,15 L52,38 M68,15 L68,38 M80,20 L80,40" stroke="#5a7389" stroke-width="1.5"/>')
			p.append('<path d="M94,50 Q110,64 106,96" stroke="{ink}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M94,50 Q110,64 106,96" stroke="#33475b" stroke-width="4" fill="none" stroke-linecap="round"/>')
		"headband":
			p.append('<circle cx="60" cy="20" r="11" fill="{hair}" {O}/><path d="M24,50 Q60,32 96,50 L96,58 Q60,40 24,58 Z" fill="{band}" {o}/>')
			p.append('<path d="M94,52 Q110,58 114,78 M96,56 Q114,58 120,72" stroke="{band}" stroke-width="4.5" fill="none" stroke-linecap="round"/>')
		"bald":
			p.append('<ellipse cx="50" cy="42" rx="10" ry="5" fill="#fff" opacity=".45"/><circle cx="60" cy="30" r="7" fill="{hair}" {o}/>')

	# 手持
	var hand := func(x: int, y: int) -> String:
		return '<circle cx="%d" cy="%d" r="7" fill="{skin}" {o}/>' % [x, y]
	match str(t["weapon"]):
		"bow":
			p.append('<path d="M26,40 Q-2,96 26,150" stroke="{ink}" stroke-width="7.5" fill="none" stroke-linecap="round"/><path d="M26,40 Q-2,96 26,150" stroke="#a0683a" stroke-width="4.5" fill="none" stroke-linecap="round"/><line x1="26" y1="40" x2="26" y2="150" stroke="#fff" stroke-width="1.2"/>')
			p.append(hand.call(14, 96))
		"fan":
			p.append('<line x1="84" y1="146" x2="90" y2="124" stroke="{ink}" stroke-width="5" stroke-linecap="round"/><path d="M90,126 Q72,104 84,88 Q102,80 112,98 Q112,118 90,126 Z" fill="#fff" {O}/><path d="M90,126 L82,94 M90,126 L92,86 M90,126 L104,92" stroke="#c8ccd0" stroke-width="1.4"/>')
			p.append(hand.call(86, 138))
		"scroll":
			p.append('<rect x="64" y="124" width="36" height="12" rx="5" fill="#f3e3b8" {o}/><rect x="61" y="121" width="7" height="18" rx="3" fill="#a0683a" {o}/><rect x="96" y="121" width="7" height="18" rx="3" fill="#a0683a" {o}/>')
			p.append(hand.call(70, 138))
		"spear", "snake", "glaive", "halberd", "axe":
			p.append(hand.call(102, 126))

	var body := _fmt("".join(p), v)
	if mode == "head":
		return '<svg xmlns="http://www.w3.org/2000/svg" width="88" height="88" viewBox="16 10 88 88">%s</svg>' % body
	return '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="150" viewBox="0 0 120 150">%s</svg>' % body


## 取得肖像貼圖（有快取）。scale 越大越清晰
static func texture(g: Dictionary, color: String, mode: String = "full", scale: float = 2.0) -> Texture2D:
	var key := "%s|%s|%s|%s" % [g["name"], color, mode, scale]
	if _cache.has(key):
		return _cache[key]
	# 預先輸出的插畫：頭像優先用 <名>_head.png，半身用 <名>.png
	var full_path := "res://art/portraits/%s.png" % g["name"]
	var head_path := "res://art/portraits/%s_head.png" % g["name"]
	var art_path := head_path if mode == "head" and ResourceLoader.exists(head_path) else full_path
	var tex: Texture2D = null
	if ResourceLoader.exists(art_path):
		tex = load(art_path)
	else:
		var img := Image.new()
		var err := img.load_svg_from_string(svg(g, color, mode), scale)
		if err == OK:
			tex = ImageTexture.create_from_image(img)
	_cache[key] = tex
	return tex


static func clear_cache() -> void:
	_cache.clear()
