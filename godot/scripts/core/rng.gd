extends RefCounted
## 可存檔、可重現的亂數（xorshift32）。狀態存在 st["seed"]，存檔後讀回結果相同。


static func next(st: Dictionary) -> float:
	var x: int = int(st.get("seed", 1)) & 0xFFFFFFFF
	if x == 0:
		x = 2463534242
	x ^= (x << 13) & 0xFFFFFFFF
	x ^= x >> 17
	x ^= (x << 5) & 0xFFFFFFFF
	x &= 0xFFFFFFFF
	st["seed"] = x
	return float(x) / 4294967296.0


static func range_i(st: Dictionary, a: int, b: int) -> int:
	return a + int(floor(next(st) * float(b - a + 1)))


static func chance(st: Dictionary, p: float) -> bool:
	return next(st) < p


static func pick(st: Dictionary, arr: Array):
	if arr.is_empty():
		return null
	return arr[int(floor(next(st) * arr.size())) % arr.size()]


static func shuffle(st: Dictionary, arr: Array) -> void:
	for i in range(arr.size() - 1, 0, -1):
		var j := int(floor(next(st) * (i + 1))) % (i + 1)
		var t = arr[i]
		arr[i] = arr[j]
		arr[j] = t
