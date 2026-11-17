# 美術風格 D：日系動畫賽璐璐（原創）

目標：角色鮮明、色彩明亮、線條乾淨的動畫風三國武將。人物取自史實（公有領域），造型、配色、構圖皆為本作原創。
**提示詞與參考都不要使用任何動畫、遊戲作品或畫師的名字**，只描述畫面要素。

## 1. 共通規範

| 項目 | 規範 |
|---|---|
| 線條 | 乾淨的黑色或深棕色主線，粗細一致，外輪廓略粗 |
| 上色 | 賽璐璐兩階陰影（亮面＋一層陰影），少量高光，不要寫實質感與漸層噴槍 |
| 配色 | 明亮飽和；每位武將的服飾帶有所屬勢力的主色（見下表） |
| 臉部 | 中等比例（約 6～7 頭身），大眼但不誇張；年長者有皺紋與鬍鬚 |
| 構圖 | 半身像、身體微側、臉朝前，頭頂到胸口；頭部位於畫面上方 40% 內、水平置中 |
| 背景 | 單色或柔和漸層（淺灰藍），方便去背；不要場景、文字、浮水印 |
| 尺寸 | 800×1000 px（4:5），PNG |
| 一致性 | 同一批使用相同的風格描述與參數；有參考圖功能時，以第一張滿意的圖當風格參考 |

### 勢力主色（與遊戲一致）

| 勢力 | 主色 | 服飾色描述 |
|---|---|---|
| 曹操軍 | #2f5f8f | deep blue |
| 劉備軍 | #3d7a4c | green |
| 孫堅軍 | #b23a2c | crimson red |
| 袁紹軍 | #b8892c | golden yellow |
| 董卓軍 | #5e4280 | purple |
| 劉表軍 | #2b7a78 | teal |
| 在野 | — | neutral brown and gray |

## 2. 提示詞結構

`[人物描述], [年齡與臉部特徵], [服裝與配色], [武器與姿勢], [共通風格描述]`

**共通風格描述（每張都加在最後）**

```
anime cel-shaded illustration, clean bold line art, two-tone cel shading, vivid saturated colors,
half-length portrait, body slightly turned, facing viewer, centered, head in upper part of frame,
plain soft blue-gray gradient background, high quality character art, no text, no watermark, no logo
```

**負面提示詞（工具支援時使用）**

```
photorealistic, 3d render, painterly, blurry, extra fingers, deformed hands, text, watermark, signature, frame, multiple people
```

全部 100 名武將的提示詞由 `tools/gen_prompts.js` 依遊戲資料自動產生，輸出在 `art/prompts_D.md`。

## 3. 製作順序

1. **樣張（3 張）**：劉備、關羽、諸葛亮。確認畫風、比例、配色後再量產。
2. **第一批（約 20 張）**：6 位君主與名將（例如曹操、孫堅、袁紹、董卓、劉表、張飛、趙雲、呂布、周瑜、夏侯惇、典韋、黃忠、馬超、孫策）。
3. **其餘武將**：用第一批的圖當風格參考，維持一致。
4. 把圖用武將名稱命名放進 `art/portraits/`，例如 `art/portraits/關羽.png`，遊戲會自動改用插畫。

## 4. 驗收重點

- 遊戲內小頭像（約 56 px）仍能認出人物：靠髮型、頭飾、鬍鬚、膚色、武器剪影區分
- 同勢力的服飾主色一致，不同勢力一眼可分
- 手部、武器沒有明顯錯誤；臉部左右對稱自然
- 確認生圖工具的商業授權；正式上架前建議由畫師統一修整
