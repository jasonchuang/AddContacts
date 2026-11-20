# 專案說明（給 Claude 看）

這個 repo 的主角是 `sangoku/`：原創三國回合制策略網頁遊戲「三國 逐鹿中原」，用純 JavaScript 寫成，在 GitHub Pages 上玩。
根目錄的 Android 檔案（src、res、AndroidManifest.xml…）是舊的通訊錄專案，不要動。

- 設計規格與手感數值：`sangoku/SPEC.md`（改規則前先看，改了要同步更新）
- 手感數值表：`sangoku/js/tuning.js`（戰鬥、單挑、經濟、登用、難易度的數字只寫在這裡，不要在其他檔案寫死數字）
- 其他分支：`claude/chuhan`（楚漢相爭）、`claude/sanguo-duel`（單挑小遊戲）、`claude/sanguo-godot`（Godot 版，已暫停）

## 開發規則

1. **先規劃再動手**：較大的需求先列出分階段計畫，等使用者同意再開始。
2. **每階段小而可玩**：每一階段結束時遊戲都要能正常執行。
3. **每階段回報三件事**：做了什麼、怎麼測（在哪個畫面、按哪裡）、要特別看哪裡（手感、畫面）。
   使用者說「直接做完」或要去睡了，才連續做多個階段。
4. **原創**：美術、文字、介面都要自己的；不可模仿光榮《三國志》的畫面、頭像、名稱。人物與史事取自公有領域的史書與演義。
5. 使用者的回應用繁體中文；程式註解也用繁體中文。

## 每次改完都要做

```bash
node sangoku/test/engine.test.js          # 單元測試，全部要過
node sangoku/tools/playtest.js all 2      # 電腦代打，檢查有無數值異常、勝率與統一年數是否合理
node sangoku/build.js                     # 打包成 sangoku/dist/qunxiong.html 與 docs/index.html（GitHub Pages）
```

- 改畫面時用 Playwright（已安裝 Chromium）截圖確認，桌機與手機寬度（`body.mobile`）都要看。
- 新增 js 檔要同時加到 `sangoku/index.html`、`test/engine.test.js`、`tools/playtest.js`（若不碰 DOM）。
- 只推到被指定的分支；不要自己開 PR。

## 素材

- 頭像：使用者提供的圖放在 `sangoku/art/raw/`，用 `crops.json` 裁切，`tools/import_portraits.py` 匯入 `sangoku/portraits/`。
- 士兵動畫：sprite sheet 放在 `sangoku/sprites/`，格式見 `sangoku/sprites/README.md`；沒有素材時退回程式畫的 SVG。
- 素材由使用者挑選（itch.io 等），要確認授權允許使用；不要自己用 AI 生圖。
