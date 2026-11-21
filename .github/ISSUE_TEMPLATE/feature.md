---
name: 新功能／內容
about: 遊戲的新功能、新劇本、新素材或規則調整
labels: ''
---

## 想要什麼（口語描述就好）


## 驗收條件（EARS 句型，每一條都要能測試或在畫面上確認）

- When ＿＿＿＿, the game shall ＿＿＿＿。
- While ＿＿＿＿, the game shall ＿＿＿＿。
- If ＿＿＿＿, then the game shall ＿＿＿＿。

## 怎麼驗收

- [ ] 單元測試／畫面測試涵蓋（`node sangoku/test/engine.test.js`、`node sangoku/test/e2e.test.js`）
- [ ] 預覽版（GitHub Pages 網址加 `/preview/`）試玩確認
- [ ] 確認後發布正式版（`node sangoku/build.js --release`）
