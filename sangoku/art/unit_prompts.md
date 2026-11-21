# 戰場兵種圖：生圖提示詞

戰鬥畫面的槍兵、騎兵、弩兵，換成和頭像一致的手繪水彩風格。

**做法：每個兵種畫 3 張姿勢圖，動作交給程式做**（類似剪紙動畫）：
- 行軍：程式讓圖片上下輕晃、往前推進
- 攻擊：換成攻擊姿勢，往前一衝
- 倒下：換成倒地姿勢，再淡出

AI 一次畫好一整排連續動作格（sprite sheet），每格大小和位置常常對不齊、人物也會變樣，所以改成每個姿勢各畫一張，比較穩定。

總共 **9 張**：3 個兵種 × 3 個姿勢。

## 規格（每張都一樣）

- **側面**，人物**面向右邊**（守方由程式自動翻面）
- **全身**入鏡，腳底貼近圖片下緣，上下左右留一點空白
- **背景純白**（之後由 Claude 去背），不要地面、陰影、其他人物
- 盔甲用**中性的灰黑色＋皮革色**，只在**腰帶、領巾、盾牌**用一塊**純紅色**（程式會把這塊紅色換成各勢力的顏色）
- 正方形 1024×1024
- 3 個姿勢要是**同一個人、同樣服裝、同樣大小**：最好在同一段對話裡接著生成，第 2、3 張說「same soldier as before」

檔名照下表存，打包成 zip 傳回來。

## 共用風格（每張都貼在最前面）

```
Soft hand-painted watercolor animation style, thin delicate linework, warm natural colors, gentle shading,
ancient Han dynasty Chinese soldier (around 200 AD). Full body, side view facing RIGHT, centered, feet near the bottom edge.
Plain pure white background, no ground, no shadow, no other people, no text.
Armor and clothes in neutral dark grey and brown leather; ONLY the waist sash, neck scarf and shield face are solid bright red.
Square image, 1024x1024.
```

## 槍兵（spear）

| 檔名 | 提示詞（接在共用風格後面） |
|---|---|
| `spear_idle.png` | A spearman marching: holding a long spear upright, round shield on the left arm, determined face, small lamellar armor, one foot stepping forward. |
| `spear_attack.png` | The same spearman thrusting the long spear forward horizontally with both hands, leaning forward, shield pulled back, mouth open shouting. |
| `spear_fall.png` | The same spearman falling backward, spear dropping from his hands, shield sliding off, eyes closed. |

## 騎兵（cav）

| 檔名 | 提示詞（接在共用風格後面） |
|---|---|
| `cav_idle.png` | A cavalryman on a brown warhorse trotting: rider holding a ji halberd upright, horse with simple tack and a red saddle cloth, horse legs mid-stride. |
| `cav_attack.png` | The same cavalryman charging: horse galloping with front legs stretched forward, rider swinging the halberd forward, red scarf flying. |
| `cav_fall.png` | The same horse rearing up while the rider falls backward off the saddle, halberd dropping. |

## 弩兵（xbow）

| 檔名 | 提示詞（接在共用風格後面） |
|---|---|
| `xbow_idle.png` | A crossbowman marching: carrying a wooden crossbow at his side, quiver of bolts on his back, light leather armor, red waist sash. |
| `xbow_attack.png` | The same crossbowman kneeling on one knee, aiming the crossbow forward and shooting, a bolt just leaving the bow. |
| `xbow_fall.png` | The same crossbowman falling sideways, crossbow dropping, bolts spilling from the quiver. |

## 選做：主將（general）

戰場最前方可以多一個騎馬的主將，用同樣的 3 個姿勢：`general_idle.png`、`general_attack.png`、`general_fall.png`。
描述：`A commander on a white warhorse, ornate gold-trimmed armor, red cape, a long sword raised, a small red war banner on his back.`

## 生成小技巧

- 3 個姿勢不像同一個人時，把第 1 張圖重新上傳，說「draw the same soldier in this new pose」。
- 背景不是純白（例如有地面或陰影）時，補一句 `isolated on pure white background, no floor`。
- 方向畫反了沒關係，傳回來時說一聲，我會翻過來。
