# 自訂劇本（MOD）

《烽火 十四年》的劇本都可以匯出成 JSON 檔，修改後再匯入遊玩：例如改人物能力、換陣營、調整兵力，或寫自己的「假如」劇本。

## 怎麼用

1. 標題畫面 →「自訂劇本」→「匯出劇本」，選一個劇本，下載 `劇本名稱.json`。
2. 用文字編輯器（VS Code、記事本皆可）修改，存檔時用 **UTF-8** 編碼。
3. 標題畫面 →「自訂劇本」→「匯入劇本檔」，選擇改好的檔案。
   - 格式有錯時，會用中文列出錯在哪裡（最多 12 條）。
   - 成功後會出現在「新遊戲」的劇本清單最後。
4. 匯入的劇本存在**這個瀏覽器**裡，下次開啟還在；換瀏覽器或手機要再匯入一次。
5. 範例：`mods/假如蔡鍔沒有病逝.json`（遊戲裡也可以直接按「安裝範例」）。

## 檔案格式

```jsonc
{
  "format": "kangzhan-scenario",   // 固定
  "version": 1,
  "id": "my_mod",                // 劇本代號（英數字），同代號再匯入會取代舊的
  "title": "假如蔡鍔沒有病逝",    // 劇本名稱
  "year": 1917, "month": 8,      // 開始年月
  "tag": "自訂劇本", "desc": "劇本說明……",
  "factions": [ ... ], "cities": [ ... ], "roads": [ ... ], "generals": [ ... ],
  "relations": [ ... ], "aptitude": { ... }, "events": [ ... ], "bios": { ... }
}
```

### factions 勢力
| 欄位 | 說明 |
|---|---|
| id | 勢力代號（英數字，例 `duan`） |
| name | 顯示名稱（例「皖系」） |
| ruler | 首領姓名，必須在 generals 裡、且 faction 是這個勢力 |
| color | 勢力色 `#RRGGBB` |
| heirs | 繼承人姓名陣列（首領死後依序繼位） |
| strategist | 軍師姓名（可為 null） |

### cities 城市
| 欄位 | 說明 |
|---|---|
| id | 城名 |
| x, y | 地圖座標（x 0～1000、y 0～720） |
| owner | 所屬勢力 id，無主寫 `null` |
| troops / gold / food | 兵力、金、糧 |
| pop / farm / commerce / defense / order / train | 人口、農業、商業、城防、民心、訓練 |
| arsenal / airfield / port | `true` 表示有兵工廠（可徵坦克）、機場（可徵空軍）、港口（可徵海軍） |

### roads 道路
`[["北京", "天津"], ...]`，兩城之間有道路才能出兵、移動。

### generals 人物
| 欄位 | 說明 |
|---|---|
| name | 姓名（不可重複） |
| faction | 所屬勢力 id；在野寫 `null` |
| city | 所在城 |
| lead / war / int / pol / cha | 統率、武力（作戰）、智略、政務、魅力（1～100） |
| loyalty | 忠誠（0～100，首領固定 100） |
| status | `active`（任官）或 `free`（在野） |

### relations 勢力關係
`[["duan", "zhi", "war"], ["feng", "kmt", "alliance", 24]]`：狀態為 `war` 交戰、`truce` 停戰、`alliance` 同盟、`neutral` 中立；第四項為月數（停戰、同盟）。

### aptitude 兵種適性
`{ "吳佩孚": { "inf": "S", "art": "A" } }`：`inf` 步兵、`tank` 坦克、`art` 砲兵、`air` 空軍、`navy` 海軍；等級 S／A／B／C，沒寫的依能力自動推算。

### events 歷史事件（進階）
匯出的檔案裡已有各劇本的事件，可以照著改。常用的寫法：

```jsonc
{
  "id": "cai_returns", "title": "蔡鍔歸滇", "scene": "camp",
  "cond": { "from": [1917, 8] },                       // 條件：1917 年 8 月以後
  "effects": [{ "do": "loyalty", "faction": "dian", "amount": 10 }],
  "lines": [["蔡鍔", "病好了……"], ["", "旁白文字"]]   // [說話的人, 台詞]，旁白的人名留空
}
```

- **條件 cond**：`from`／`until` 年月、`alive` 勢力存活、`general_faction` 某人在某勢力、`after` 某事件之後、`chance` 機率。
- **效果 effects**：`loyalty` 忠誠、`join` 人物加入、`seize` 奪城、`die` 人物去世、`relation` 改變關係、`rename` 勢力改名、`city_add` 城市數值增減、`absorb` 併入另一勢力。
- **場景 scene**：`palace` 宮殿、`camp` 軍營、`field` 原野、`night` 夜晚、`fire` 火、`river` 江邊、`rain` 雨、`castle` 城池、`garden` 庭園。

### bios 列傳
`{ "蔡鍔": { "zi": "松坡", "home": "湖南邵陽", "life": "1882－1916", "bio": "生平……", "tale": "軼事……" } }`
