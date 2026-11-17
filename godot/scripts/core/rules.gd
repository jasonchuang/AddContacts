extends RefCounted
## 遊戲規則常數：兵種、相剋、內政指令、上限。數值皆為本作原創。

const UNIT_KEYS := ["infantry", "spear", "cav", "archer", "navy"]

const UNITS := {
	"infantry": {"name": "步兵", "short": "步", "cost": 80, "desc": "攻守均衡，守城時有加成"},
	"spear": {"name": "槍兵", "short": "槍", "cost": 100, "desc": "槍陣穩固、損失較少，剋制騎兵"},
	"cav": {"name": "騎兵", "short": "騎", "cost": 200, "desc": "進攻衝鋒，剋制弓兵"},
	"archer": {"name": "弓兵", "short": "弓", "cost": 120, "desc": "開戰齊射，剋制槍兵"},
	"navy": {"name": "水軍", "short": "水", "cost": 150, "desc": "沿水路作戰極強，陸戰較弱"},
}

## 槍剋騎、騎剋弓、弓剋槍；步兵與水軍不參與循環
const BEATS := {"spear": "cav", "cav": "archer", "archer": "spear"}
const APT_MULT := {"S": 1.18, "A": 1.07, "B": 1.0, "C": 0.9}

const MAX := {"farm": 999, "commerce": 999, "defense": 999, "order": 100, "train": 100}

const DEV := {
	"farm": {"label": "開墾", "cost": 50, "stat": "pol", "key": "farm"},
	"commerce": {"label": "商業", "cost": 50, "stat": "pol", "key": "commerce"},
	"order": {"label": "治安", "cost": 30, "stat": "cha", "key": "order"},
	"defense": {"label": "築城", "cost": 60, "stat": "lead", "key": "defense"},
	"train": {"label": "訓練", "cost": 0, "stat": "lead", "key": "train"},
}

const FIELD_LABEL := {
	"farm": "農業", "commerce": "商業", "order": "治安", "defense": "城防", "train": "訓練",
	"pop": "人口", "gold": "金", "food": "糧",
}

const STAT_LABEL := {"lead": "統率", "war": "武力", "int": "智略", "pol": "政務", "cha": "魅力"}

const MAX_TROOPS := 150000
const MIN_ATTACK := 1000


static func matchup(a: String, d: String) -> float:
	if a == d:
		return 1.0
	if BEATS.get(a, "") == d:
		return 1.3
	if BEATS.get(d, "") == a:
		return 0.8
	return 1.0


## 武將兵種適性：資料可指定，否則依能力推得
static func aptitude(g: Dictionary, unit: String) -> String:
	var apt: Dictionary = g.get("apt", {})
	if apt.has(unit):
		return str(apt[unit])
	var lead: int = int(g["lead"])
	var war: int = int(g["war"])
	var intel: int = int(g["int"])
	match unit:
		"infantry":
			return "A" if lead >= 80 else ("B" if lead >= 65 else "C")
		"spear":
			return "A" if (lead >= 85 or war >= 88) else ("B" if lead >= 68 else "C")
		"cav":
			return "A" if war >= 85 else ("B" if war >= 70 else "C")
		"archer":
			return "A" if intel >= 85 else ("B" if (intel >= 68 or lead >= 80) else "C")
	return "C"


static func grade(v: int) -> String:
	if v >= 90:
		return "S"
	if v >= 80:
		return "A"
	if v >= 70:
		return "B"
	if v >= 60:
		return "C"
	return "D"
