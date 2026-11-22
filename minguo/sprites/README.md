# 士兵動畫圖（sprite sheet）

戰鬥畫面的士兵可以換成你挑的動畫素材。沒有素材的兵種會用程式畫的 SVG 士兵。

## 要找什麼素材

到 itch.io 搜尋免費素材（Game assets → Free），可用的關鍵字：
`pixel soldier sprite`、`spearman sprite sheet`、`archer sprite sheet`、`cavalry sprite`、`samurai pixel`、`ashigaru`、`chinese warrior pixel`

挑選條件：

1. **側面視角**（橫向捲軸那種），不要俯視角。
2. **三種兵**：槍兵（長槍）、騎兵（騎馬）、弩兵（弓或弩都可以）。最好是**同一個作者、同一套**，風格才會一致。
3. **動作**：至少要「走路」；有「攻擊」、「死亡」更好。
4. **PNG 圖檔**，一張圖裡排好一格一格的動作（sprite sheet），或一個動作一張長條圖都可以。
5. **授權**：頁面上寫 CC0、Free to use、可用於個人或商業專案的才用。只寫 "for personal use" 的也可以，因為這是自己玩的。
6. 東方風格（中國、日本古代士兵）最搭；沒有的話，中世紀步兵也可以接受。

找到後把 zip 或 PNG 直接傳給 Claude，說明是哪個兵種。Claude 會量好格子大小、寫好 `sprites.json`。

## 檔案格式（給 Claude 或自己改）

PNG 放在這個資料夾，`sprites.json` 描述每個兵種：

```json
{
  "spear": {
    "file": "spear.png",
    "frame": [32, 32],
    "facing": "right",
    "height": 48,
    "anims": {
      "walk":   { "row": 0, "frames": 6, "fps": 10 },
      "attack": { "row": 1, "frames": 4, "fps": 10 },
      "die":    { "row": 2, "frames": 4, "fps": 8 }
    }
  },
  "cav": {
    "frame": [48, 48],
    "anims": {
      "walk":   { "file": "horse_run.png", "frames": 8, "fps": 12 },
      "attack": { "file": "horse_attack.png", "frames": 5 }
    }
  },
  "xbow": { "...": "同上" }
}
```

| 欄位 | 意義 |
|---|---|
| `file` | 整張 sprite sheet（每一列一個動作） |
| `frame` | 一格的寬、高（像素） |
| `facing` | 圖中士兵面向哪邊：`right`（預設）或 `left`；守方會自動翻面 |
| `height` | 畫面上顯示的高度（px），預設槍兵、弩兵 48、騎兵 60；手機自動縮成 55% |
| `pixel` | 預設 `true`：像素風放大不模糊；手繪風素材設 `false` |
| `anims.walk` | 必要。`row` 第幾列（從 0 起）、`col` 從第幾格開始（預設 0）、`frames` 幾格、`fps` 每秒幾格 |
| `anims.attack` | 可省略：造成傷害時播一次 |
| `anims.die` | 可省略：倒下時播一次並停在最後一格；沒有就直接淡出 |
| `anims.*.file` | 這個動作用另一張圖（一個動作一張長條圖的素材） |

改完執行 `node sangoku/build.js`，圖會內嵌進 `dist/qunxiong.html` 與 GitHub Pages。
