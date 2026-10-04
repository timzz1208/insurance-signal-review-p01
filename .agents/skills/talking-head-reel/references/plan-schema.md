# plan.json 格式

**所有時間都是原始影片的秒數**（腳本自動換算成成片時間），除非卡片設 `"time_base": "output"`。
文字欄位可用 `<y>黃字</y>`、`<r>紅字</r>`。

## 頂層
| 欄位 | 預設 | 說明 |
|---|---|---|
| `source` | 必填 | 原始影片（相對 plan.json） |
| `workdir` | `work` | 中間檔 |
| `output` | `out/reel.mp4` | 成片 |
| `size` / `fps` | `[1080,1920]` / `30` | 非 9:16 素材會自動裁成滿版 |
| `zoom_center_y` | `H*0.47` | 鏡頭推近時的中心（臉的位置，約眼睛到鼻子） |
| `opener_fx` | false | 前 2 秒：推近＋震動＋RGB 錯位（配 `hook` 卡用） |
| `sfx` / `sfx_gain_db` | true / -5 | 依卡片自動合成音效；整體音量 |
| `loudness` | -14 | 人聲 LUFS |
| `subtitle_style` | 見下 | `{font,size:66,outline:6,margin_v:520}` |
| `clips` | 必填 | `[{start,end,zoom}]` 依序接起來 |
| `subtitles` | | `[{text,start,end,hide?}]`；`hide:true` 用在被大字卡取代的那句 |
| `cards` | | 見下 |
| `cover` | | `{frame,tag,t1,t2,st,output}`；`frame` 是取哪一秒當背景 |

剪接點建議：開始比第一個字早 0.15s、結束比最後一個字晚 0.25s，一定要落在靜音裡（看 `silences.json`）。
在句子中間剪時，前後字的間隔至少要 0.15s，否則會切到半個字。

## 卡片類型
共同欄位：`type`、`start`、`end`（`null` = 到口播結束）、`sfx:false` 可關閉該卡音效。

**hook** — 開頭大字
`line1`（黃底黑字，從 3 倍大砸下）、`line2`（逐字落下，`<r>` 的字會 RGB 閃爍）、`tag`（小標籤，1.4s 出現）。`start` 設第一個片段的起點。

**big** — 重點大字
`text`、`size`(168)、`anim`：`spin`(預設，旋轉彈出) | `drop`（從上落下）、`underline`(紅底線)、`sub`（第二行）、`sub_at`、`sub_effect:"blur"`（文字持續模糊晃動，適合「太模糊」這類詞）。

**chips** — 貼紙
`items:[{text,at}]`，左右交錯歪斜彈出。

**strike** — 劃掉錯誤做法
`label`（紅色小標）、`text`、`strike_at`（紅線劃過的時間）。

**list** — 疊在臉上的清單（畫面上半部）
`title`、`items:[{text,at}]`，正在講的那條會變黃。

**scene_timeline** — 全螢幕說明畫面：剪輯時間軸
`kicker`、`title`、`tracks`(預設 畫面/口播/字卡/音效)、`badges:[{text,at,track(0-3),x}]`。
`end` 是切回人臉的時間（會自動甩鏡出場）。

**scene_prompt** — 全螢幕說明畫面：指令框打字
`kicker`、`title`、`header`、`delete_text`＋`delete_start`/`delete_end`（先逐字刪掉錯的指令）、
`lines:[{tag,text,at}]`（逐字打出）、`send_at`（送出鍵發光＋叮）。`end:null` 表示停在這個畫面到結束。

**endcard** — 結尾卡（接在口播後面，影片自動延長）
`duration`(2.6)、`line1`、`line2`、`cta`（黃色按鈕＋跳動箭頭）、`foot`（小字）。

## 版面
所有疊在臉上的卡片都放在畫面上半部（y 200–700），字幕在底部 margin 520，避開 IG 介面。
說明畫面內容在 y 250–1260，下方留給字幕。
