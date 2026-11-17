extends RefCounted
## 兵種小圖示（原創 SVG）：步兵、槍兵、騎兵、弓兵、水軍。顏色為勢力色。

const Portrait = preload("res://scripts/core/portrait.gd")

static var _cache: Dictionary = {}


static func unit_svg(unit: String, color: String) -> String:
	var v := {"c": color, "d": Portrait.shade(color, -0.25), "l": Portrait.shade(color, 0.18), "skin": "#f1c99a", "gold": "#e2b54a", "wood": "#6b4423", "steel": "#dfe6ea"}
	var head := '<circle cx="11.5" cy="8.5" r="3.6" fill="{skin}"/><path d="M7.4 8.2 Q11.5 1.5 15.6 8.2 Z" fill="{l}" stroke="{d}" stroke-width=".7"/>'
	var legs := '<rect x="8" y="24" width="3" height="7" rx="1" fill="#3a2a1e"/><rect x="12.5" y="24" width="3" height="7" rx="1" fill="#3a2a1e"/>'
	var body := '<path d="M7 13 Q11.5 11 16 13 L16.5 25 L6.5 25 Z" fill="{c}" stroke="{d}" stroke-width=".8"/><rect x="6.6" y="19" width="9.8" height="2" fill="{gold}"/>'
	var w := 24
	var h := 32
	var inner := ""
	match unit:
		"infantry":
			inner = legs + body + head + '<line x1="17" y1="20" x2="22" y2="9" stroke="{steel}" stroke-width="2" stroke-linecap="round"/><line x1="15.5" y1="19" x2="18.5" y2="21.5" stroke="{gold}" stroke-width="1.6"/><rect x="2" y="13" width="7" height="10" rx="2" fill="{d}" stroke="{gold}" stroke-width=".9"/>'
		"spear":
			inner = '<line x1="19" y1="2" x2="19" y2="31" stroke="{wood}" stroke-width="1.6"/><path d="M19 0 L21 5 L17 5 Z" fill="{steel}"/><path d="M17 6 Q19 10 21 6 Z" fill="#c0392b"/>' + legs + body + head + '<ellipse cx="6.5" cy="18" rx="4" ry="5.5" fill="{d}" stroke="{gold}" stroke-width="1"/>'
		"archer":
			inner = legs + body + head + '<path d="M18 6 Q25 16 18 26" fill="none" stroke="{wood}" stroke-width="1.8"/><line x1="18" y1="6" x2="18" y2="26" stroke="#ddd" stroke-width=".6"/><line x1="8" y1="16" x2="22" y2="16" stroke="{wood}" stroke-width="1"/><path d="M22 16 L20 14.5 L20 17.5 Z" fill="{steel}"/>'
		"cav":
			w = 40
			h = 36
			inner = '<path d="M6 22 Q8 15 18 15 L28 15 Q33 12 35 8 L38 10 Q37 15 33 18 L32 24 Q30 27 26 26 L12 26 Q7 27 6 22 Z" fill="#8a5a33" stroke="#4a2e18" stroke-width=".8"/>' \
				+ '<rect x="10" y="25" width="2.6" height="10" fill="#5e3b20"/><rect x="15" y="25" width="2.6" height="10" fill="#5e3b20"/><rect x="24" y="25" width="2.6" height="10" fill="#5e3b20"/><rect x="29" y="24" width="2.6" height="11" fill="#5e3b20"/>' \
				+ '<path d="M5 21 Q1 23 2 29" stroke="#3a2412" stroke-width="2" fill="none"/><rect x="14" y="14" width="12" height="4" rx="1" fill="{c}"/>' \
				+ '<path d="M16 15 L17 6 Q20 4 23 6 L24 15 Z" fill="{c}" stroke="{d}" stroke-width=".8"/><circle cx="20" cy="3.8" r="3" fill="{skin}"/><path d="M16.8 3.6 Q20 -2 23.2 3.6 Z" fill="{l}" stroke="{d}" stroke-width=".6"/>' \
				+ '<line x1="25" y1="1" x2="31" y2="20" stroke="{wood}" stroke-width="1.4"/><path d="M24.4 -1 L26.5 2.8 L23.6 2.6 Z" fill="{steel}"/>'
		"navy":
			w = 36
			h = 32
			inner = '<path d="M2 20 L34 20 L29 28 L7 28 Z" fill="#8a5a33" stroke="#4a2e18" stroke-width=".9"/><line x1="18" y1="2" x2="18" y2="20" stroke="{wood}" stroke-width="1.6"/>' \
				+ '<path d="M19 3 L31 9 L19 16 Z" fill="{c}" stroke="{d}" stroke-width=".8"/><circle cx="10" cy="13" r="3" fill="{skin}"/><path d="M6.6 12.6 Q10 7 13.4 12.6 Z" fill="{l}"/>' \
				+ '<path d="M7 15 L13 15 L13 20 L7 20 Z" fill="{c}"/><path d="M0 30 Q6 27 12 30 T24 30 T36 30" fill="none" stroke="#3d86a6" stroke-width="1.6"/>'
	return ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">' % [w, h, w, h]) + inner.format(v) + "</svg>"


static func unit_texture(unit: String, color: String, scale: float = 2.0) -> Texture2D:
	var key := "%s|%s|%s" % [unit, color, scale]
	if _cache.has(key):
		return _cache[key]
	var img := Image.new()
	var tex: Texture2D = null
	if img.load_svg_from_string(unit_svg(unit, color), scale) == OK:
		tex = ImageTexture.create_from_image(img)
	_cache[key] = tex
	return tex
