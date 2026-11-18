# 三國一騎討

以《群雄逐鹿》的原創動畫風武將為班底，獨立出來的單挑小遊戲。手機直向優先，全部用點的操作；一場約 1–2 分鐘。

## 怎麼玩
- 手機或電腦用瀏覽器打開 `dist/yiqitao.html` 即可（單一檔案，不需安裝）。
- **過關挑戰**：選一位武將，連破十將，最後迎戰天下第一。擊敗的武將會解鎖。
- **雙人對戰**：同一支手機，兩人輪流出招（出完招會蓋住畫面再交給對方）。
- **武將排名**：100 位武將依武力／統率／智力排行，可看必殺技。

## 規則
- 每回合同時出招：猛攻 剋 技巧、技巧 剋 架擋、架擋 剋 猛攻（反擊）。同招互拚兩敗俱傷。
- 蓄氣：氣力＋1，但這回合被打會受到加重傷害。命中也會累積氣力。
- 氣力 3 格（黃忠 2 格）可發動必殺技：重擊、連擊、震懾、鼓舞、計略、神射六類。必殺無法閃避，架擋可減半。
- 武力＝攻擊力，統率＝體力與防禦，智力越高越常「看穿」對手的下一招。
- 電腦會依個性出招，越後面的對手越會讀你的出招習慣。

## 檔案
```
  index.html / style.css
  js/roster.js   武將名冊（由 tools/gen_roster.js 產生：能力、外觀、必殺技）
  js/core.js     規則核心（不碰 DOM，可在 Node 測試）
  js/anime.js    原創動畫風立繪產生器（與群雄逐鹿共用，多了去背選項）
  js/sound.js    晶片音樂風音效
  js/ui.js       畫面與操作
  fonts/         Noto Sans TC 與 Fusion Pixel 12px 子集（OFL-1.1）
  tools/         gen_roster.js、build_font.py、portrait_traits.js
  build.js       打包成 dist/yiqitao.html
  test/core.test.js
```

## 開發
```
node duel/test/core.test.js          # 規則測試
python3 duel/tools/build_font.py     # 新增文字後重建字型子集
node duel/build.js                   # 打包單檔
```
所有美術、文字與規則數值皆為原創；歷史人物與招式名稱取自史書與演義典故。
