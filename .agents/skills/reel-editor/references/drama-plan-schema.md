# drama plan.json 格式（流程 B：多鏡頭短劇）

完整範例：`examples/drama.plan.example.json`（《樓下那間房不能住了》EP01 v5）。

## 時間寫法（所有 start / end / at 都可以用）
| 寫法 | 意思 |
|---|---|
| `12.5` | 成片第 12.5 秒 |
| `"p4+0.6"` | piece p4 開始後 0.6 秒（`"p4+-0.05"` 表示開始前 0.05 秒） |
| `"p4@1.29"` | p4 所屬素材的第 1.29 秒（字幕對白用；L-cut 延續的聲音也適用） |
| `"p4.end"` / `"end"` | p4 結束／整支片結束 |

## 頂層
| 欄位 | 說明 |
|---|---|
| `shots` | `{ "s1": "src/shot01.mp4", ... }` |
| `workdir` / `output` / `clean_output` | 中間檔／成片／無字幕無字卡版（選填） |
| `size` / `fps` | 預設 `[1080,1920]` / 24（跟素材 fps 一致，不要硬改 30） |
| `loudness` | 預設 −14 |
| `sfx` | 依疊加元素自動加音效，預設 true |
| `sfx_events` | 額外音效 `[{sound, at, db, repeat, every}]`。sound 可用：boom whoosh whoosh_up whoosh_down pop click ding glitch thud swipe buzz tick knock drip tape_stop ping |
| `music_bed` | 預設 null（使用者自己配樂）。要合成墊底時：`{"pad":["p3+0","p8a+-0.55"],"plucks":["p8a+0","end"]}` |
| `subtitle_style` | `{size:58, outline:4, margin_v:400}` |
| `pieces` / `subtitles` / `overlays` / `cover` | 見下 |

## pieces（依序接起來）
| 欄位 | 說明 |
|---|---|
| `id`, `shot`, `in`, `out` | 取素材哪一段 |
| `zoom` | `[起, 迄]`，例如 `[1.6, 1.0]`：從特寫拉開；`[1.0, 1.06]`：慢推 |
| `center` | `[[x,y]]` 或 `[[x0,y0],[x1,y1]]`（0–1），放大的中心會跟著移動 |
| `ease` | 縮放在幾秒內完成，預設整段 |
| `hold` | 結尾停格秒數 |
| `look` | `flashback`（褪色＋暗角）、`blur`（片尾字卡背景） |
| `freeze` | `{shot, t}`＋`dur`：用某一格做定格段落 |
| `transition_in` | `{type:"slideup"|"fade"|…(ffmpeg xfade), dur}`；預設直切 |
| `audio` / `audio_out` / `audio_db` | `false` 靜音；`audio_out` 讓聲音延續到素材的更後面（L-cut）；`audio_db` 調整這段聲音音量（例如 −8 當環境音墊底） |

同一個鏡頭連續切成多段時，聲音會自動接成一段，不會斷。

## subtitles
`[{"text":"…","start":"p1@0","end":"p1@3.1"}]`（用素材時間對準對白）

## overlays（疊加元素）
共同欄位：`type`、`start`、`end`、`sfx:false`（關閉這個元素的音效）。文字可用 `<y>` 黃、`<r>` 紅、`<b>` 粗。

| type | 欄位 | 用途 |
|---|---|---|
| `hook` | `line1`, `line2`, `label`, `counter:{to, prefix, suffix, decimals}` | 開頭 3 秒：閃白、兩行大字砸下、數字跳動並震動 |
| `flashback` | `title`, `sub` | 定格上的「30 分鐘前」 |
| `ring` | `x`, `y`, `label` | 圈出畫面中的重點（座標是成片的像素） |
| `lower_third` | `n`, `text` | 左下角的編號後果標籤 |
| `tag` | `text` | 畫面中央的小標，例如「↓ 樓下」 |
| `stamp` | `text`, `x`, `y` | 蓋章，例如「停用」 |
| `notif` | `title`, `msg`, `app` | 手機通知卡（不帶品牌） |
| `recap` | `title`, `items[]` | 後果清單逐條出現 |
| `bumper` | `title`, `sub` | 全螢幕深藍過場（約 0.75 秒） |
| `cards` | `cards:[{start, html, sfx:[{sound,at,db}]}]`, `end`, `host`, `avatar:{shot,t,crop:[x,y,w]}` | 片尾說明字卡。html 可用的 class：`k` `big` `c` `pill`（`pill red`）`body` `amount` `note` `row`>`n`+`x` `src` `disc`；加 `data-at="秒"` 讓該行依序出現 |

## cover
`{"bg":{"shot":"s4","t":0.4}, "stamp":{"text","x","y"}, "tag", "t1", "t2":"保險賠了 <b>249</b> 萬", "st", "output", "template":"cover_bottom.html"}`

## 版面安全區
- 疊在畫面上的元素，不要壓到人臉。通常人臉在上半部，所以字卡放中下段（y 760–1450）。
- 字幕在底部（margin 400）。IG 介面會蓋住頂部約 200px、底部約 400px。
- 所有盒子都用 `box-sizing:border-box`。寬度不含內距會超出畫面，這個 bug 發生過。
