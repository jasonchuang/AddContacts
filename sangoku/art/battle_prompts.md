# 戰鬥畫面與單挑畫面：生圖提示詞

和事件背景、頭像同一套手繪水彩風格。共 **8 張**：

| 檔名 | 用途 | 比例 |
|---|---|---|
| `field_plain.png` | 戰場背景・平原（預設） | 3:1 寬幅 |
| `field_river.png` | 戰場背景・江邊（江陵、江夏、柴桑、建業、永安等沿江城市） | 3:1 |
| `field_mountain.png` | 戰場背景・山地（漢中、天水、武威、成都、晉陽等） | 3:1 |
| `field_snow.png` | 戰場背景・冬季（12～2 月） | 3:1 |
| `wall.png` | 守方城牆（疊在戰場右側） | 直式 1:2 |
| `wall_damaged.png` | 城防低於 30% 時的殘破城牆 | 直式 1:2 |
| `duel_day.png` | 單挑背景・白天 | 16:10 |
| `duel_dusk.png` | 單挑背景・黃昏戰場 | 16:10 |

一次只生成一張，用上表的檔名存檔，全部打包成 zip 傳回來。

## 共用風格（每張都貼在最前面）

```
Soft hand-painted watercolor animation style background art for a historical strategy game, warm natural palette,
thin delicate linework, painterly brush-stroke skies with visible paper texture, gentle lighting,
ancient Han dynasty China (around 200 AD). NO people, NO soldiers, NO animals, no text, no watermark.
```

## 戰場背景（4 張）

戰場畫面是一條很寬的橫幅（約 1160×300），小兵站在**下方三分之二**，所以地面要平坦、開闊、乾淨；天空只佔上方三分之一。

**共同要求**（接在共用風格後面）：
```
Ultra-wide panoramic battlefield landscape, aspect ratio 3:1, 1800x600.
Horizon at about one third from the top. The lower two thirds is a wide, flat, open ground with no objects,
no trees and no rocks in the middle, so small soldier figures can stand on it. Keep the right 15% simple (a city wall will be placed there).
```

| 檔名 | 接在後面的描述 |
|---|---|
| `field_plain.png` | `Golden-green grass plain in late spring, distant blue hills, a few soft clouds, light dust in the air.` |
| `field_river.png` | `A wide grassy riverbank, the Yangtze river shining in the distance along the horizon, misty green mountains beyond, reeds at the far edge.` |
| `field_mountain.png` | `A flat valley floor surrounded by steep green mountains and cliffs in the distance, a narrow pass far away, drifting mist.` |
| `field_snow.png` | `A flat snowy plain in winter, pale grey sky, bare trees far on the horizon, light snowfall, cold blue tones.` |

## 城牆（2 張）

城牆疊在戰場右側，面向左邊的攻方。**背景要純白**（之後由 Claude 去背）。

**共同要求**：
```
A single tall section of an ancient Chinese rammed-earth and stone city wall seen from the side, with crenellations on top,
a small wooden watchtower roof, and the wall face turned toward the LEFT. Isolated on pure white background, no ground, no shadow.
Vertical image, aspect ratio 1:2, 600x1200. Leave a small empty flagpole on top of the tower.
```

| 檔名 | 接在後面的描述 |
|---|---|
| `wall.png` | `The wall is solid and well maintained, grey stone with brown earth layers, a closed heavy wooden gate at the bottom.` |
| `wall_damaged.png` | `The same wall heavily damaged after a siege: cracks, missing crenellations, a broken tower roof, scorch marks, a battered gate.` |

## 單挑背景（2 張）

單挑時，兩位武將的立繪會站在畫面**左右兩側的下方**，中間有名字、體力條和「一騎討」大字。所以畫面**中間和兩側下方要留空**，地面開闊。

**共同要求**：
```
A dramatic open dueling ground between two armies, wide landscape 16:10, 1536x960.
Two armies are only suggested by rows of distant war banners on the far left and far right horizon (no visible people).
The center and the lower part of the image are empty open ground, with a dramatic sky taking the upper half.
```

| 檔名 | 接在後面的描述 |
|---|---|
| `duel_day.png` | `Bright day, wind blowing dust and grass, sunlight breaking through big clouds, a heroic and tense mood.` |
| `duel_dusk.png` | `Red-orange sunset over a battlefield, long shadows, smoke rising in the distance, an epic and tragic mood.` |

## 生成小技巧

- 戰場圖若出現小人或馬，補一句 `absolutely no people or animals, empty landscape only`。
- 3:1 畫不出來時，可以先畫 16:9，我會裁成寬幅，記得把地平線放在上方三分之一。
- 城牆背景不是純白（有地面或陰影）時，補一句 `isolated on pure white background, no floor`。
