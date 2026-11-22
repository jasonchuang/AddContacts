# 主將（騎馬武將）：生圖提示詞

戰場最前方帶頭衝鋒、單挑時對衝的「主將」專屬圖。風格、規格和兵種圖（`unit_prompts.md`）完全一樣，只是人物換成將領。

共 **3 張**，都要附**換色遮罩**（做法和兵種圖相同）：

| 檔名 | 姿勢 | 遊戲中用在 |
|---|---|---|
| `general_idle.png` | 騎馬小跑、兵器直立 | 戰場待命、單挑對峙 |
| `general_attack.png` | 戰馬衝刺、兵器向前揮擊 | 下令突擊、單挑出招 |
| `general_fall.png` | 戰馬人立、將領往後落馬 | 戰敗、單挑落敗 |

## 規格（每張都一樣）

- **側面**、**面向右邊**（守方由程式翻面），**全身連馬**入鏡，馬蹄貼近下緣
- **背景純白**，不要地面、陰影、其他人物
- 正方形 1024×1024
- 3 張必須是**同一位將領、同一匹馬、同樣服裝與大小**：在同一段對話接著畫，第 2、3 張說「same general and horse as before」
- **換色區**：**披風、馬鞍布、背上的小令旗**用一整塊**純紅色 (#FF0000)**，其他地方不要用紅色（盔甲金邊用金色、不要紅）
- 和一般騎兵的差別要一眼看得出來：**白馬**、**金邊華麗鎧甲**、**頭盔有長羽飾**、**飄揚的大披風**、**背上一面小令旗**

## 共用風格（每張都貼在最前面）

```
Soft hand-painted watercolor animation style, thin delicate linework, warm natural colors, gentle shading,
ancient Han dynasty Chinese commander on horseback (around 200 AD). Full body including the whole horse, side view facing RIGHT, centered,
hooves near the bottom edge. Plain pure white background, no ground, no shadow, no other people, no text.
The commander wears ornate dark lamellar armor with GOLD trim and a tall helmet with a long feather plume, rides a WHITE warhorse.
ONLY the long flowing cape, the saddle cloth and the small command flag on his back are solid pure red (#FF0000); no other red anywhere.
Square image, 1024x1024.
```

## 三個姿勢（接在共用風格後面）

| 檔名 | 提示詞 |
|---|---|
| `general_idle.png` | `The commander rides at a steady trot, holding a long ji halberd upright in his right hand, calm and proud expression, cape flowing behind.` |
| `general_attack.png` | `The same commander and white horse charging at full gallop, front legs stretched forward, halberd thrust forward horizontally, cape and plume streaming, shouting.` |
| `general_fall.png` | `The same white horse rearing up on its hind legs while the commander falls backward off the saddle, halberd dropping from his hand, helmet tilting.` |

## 換色遮罩

和兵種圖一樣，替每張做一張同名的遮罩，放在 `faction-masks/` 資料夾：
- 遮罩是**透明底 PNG**，只有紅色區（披風、馬鞍布、令旗）是不透明。
- 檔名：`faction-masks/general_idle.png`、`faction-masks/general_attack.png`、`faction-masks/general_fall.png`

（如果你上次是請工具幫忙做遮罩，就用同樣的方式；沒有遮罩也可以，只要紅色是純紅，Claude 會自動抓出來。）

## 交回方式

```
general_idle.png
general_attack.png
general_fall.png
faction-masks/general_idle.png
faction-masks/general_attack.png
faction-masks/general_fall.png
```
打包成 zip 傳回來即可。
