# 專案說明（給 Claude 看）

這個 repo 的主角是 `sangoku/`：原創三國回合制策略網頁遊戲「三國 逐鹿中原」，用純 JavaScript 寫成，在 GitHub Pages 上玩。
根目錄的 Android 檔案（src、res、AndroidManifest.xml…）是舊的通訊錄專案，不要動。

- 設計規格與手感數值：`sangoku/SPEC.md`（改規則前先看，改了要同步更新）
- 手感數值表：`sangoku/js/tuning.js`（戰鬥、單挑、經濟、登用、難易度的數字只寫在這裡，不要在其他檔案寫死數字）
- 其他分支：`claude/chuhan`（楚漢相爭）、`claude/sanguo-duel`（單挑小遊戲）、`claude/sanguo-godot`（Godot 版，已暫停）

## 待辦事項

- 待辦一律放在 GitHub Issues（jasonchuang/AddContacts），每張要有 EARS 驗收條件（範本在 `.github/ISSUE_TEMPLATE/`）。
- 對話中出現新需求或發現新問題，就開 Issue；做完的 commit 訊息寫上 `#編號`，使用者確認後關閉。
- 每次推上 GitHub，Actions（`.github/workflows/sangoku.yml`）會自動跑單元測試、電腦代打、打包與畫面測試。

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
node sangoku/build.js                     # 打包：單檔版 dist/qunxiong.html ＋ 預覽版 docs/preview/
node sangoku/test/e2e.test.js             # 畫面測試（Playwright），測的是預覽版；截圖在 sangoku/test/e2e-shots/
```

- **發布**：平常只更新預覽版（GitHub Pages 網址加 `/preview/`），請使用者試玩。
  使用者說「發布」或「上線」後，才執行 `node sangoku/build.js --release` 更新正式版 `docs/index.html`，然後 commit、push。

- 改畫面時用 Playwright（已安裝 Chromium）截圖確認，桌機與手機寬度（`body.mobile`）都要看。
- 新增 js 檔要同時加到 `sangoku/index.html`、`test/engine.test.js`、`tools/playtest.js`（若不碰 DOM）。
- 只推到被指定的分支；不要自己開 PR。

## 素材

- 頭像素材包（zip）一律用 `python3 sangoku/tools/import_bundle.py <zip...>` 驗收：先不加 `--apply` 產生對照圖 `art/review/review.jpg` 給使用者確認，確認後再 `--apply`。腳本會擋下不在名單、標示待重畫、圖上有名字標籤、重複的圖。
- 匯入後的原圖在 `sangoku/art/raw/`，用 `crops.json` 裁切，`tools/import_portraits.py` 產生 `sangoku/portraits/`。
- 沒有專屬頭像的武將依身分用通用頭像：`_通用君主`、`_通用文官`、`_通用武將`（分類見 `js/portraits.js` 的 genericKind）。
- 事件背景：提示詞在 `sangoku/art/scene_prompts.json`（每個事件一段，給 ChatGPT 生圖）。生成的圖用 `python3 sangoku/tools/import_scenes.py <zip>` 驗收（加 `--apply` 匯入到 `sangoku/scenes/<事件id>.jpg`）。新增事件時要在 JSON 補上該事件的提示詞。
- 士兵動畫：每個兵種 3 張姿勢圖（idle／attack／fall）＋換色遮罩，用 `python3 sangoku/tools/import_units.py <資料夾或zip>` 匯入（去背、對齊、縮小、產生 `sangoku/sprites/sprites.json`）；遊戲執行時依遮罩塗上勢力色。提示詞在 `sangoku/art/unit_prompts.md`。
- 素材由使用者挑選（itch.io 等），要確認授權允許使用；不要自己用 AI 生圖。
