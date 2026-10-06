---
name: reel-editor
description: 剪輯 IG Reels／短影音並交付發布用的封面與貼文文字。兩種素材都能處理：(A) 一支口播（talking-head）原始影片——Whisper 字級轉錄、去重說與停頓、繁中字幕、動態大字卡、切鏡說明畫面；(B) 多段 AI 生成或分鏡拍攝的短劇鏡頭——依分鏡剪接、單鏡放大成特寫、回溯定格、轉場、後果標籤、片尾說明字卡、真實案例字卡。兩種都會合成音效、輸出封面並給貼文建議。當使用者給影片檔或雲端連結要剪成短影音、加字幕或字卡、做封面或寫貼文時使用。不適用於只要轉錄、長片剪輯或純音樂影片。
---

# Reel Editor：短影音剪輯 → 封面 → 貼文

**原則**
- AI 負責判斷，腳本負責執行：判斷寫進 `plan.json`，由腳本一次輸出。
- 每個判斷點先給人確認，例如選段、文字版時間線、字卡文案。
- 你聽不到聲音、看不到動態畫面，只能用截圖和數據檢查。音效、接點和節奏一定要請使用者戴耳機驗收。
- 每次修改都要重新輸出完整成片，交付前看完 `contact.jpg`（紅框是畫面邊界）。

## 0. 環境（第一次）
```bash
bash scripts/setup.sh   # ffmpeg、faster-whisper、opencc、jieba、scipy、playwright+chromium、思源黑體
```
影片傳輸用 Google Drive（設成「知道連結的人可檢視」，用 `gdown <ID>` 下載）。YouTube 通常會擋雲端主機。

## 1. 先判斷是哪一種素材

| 素材 | 流程 | 腳本 |
|---|---|---|
| 一支口播長片（自己對鏡頭講話） | **A** | `transcribe.py` → `suggest_plan.py` → `build.py` |
| 多段短鏡頭（AI 生成、分鏡腳本、5–8 秒一段） | **B** | `drama_build.py` |

使用者如果有企劃書、分鏡表或交接腳本，先讀完再動手。檔案之間不一致時（例如角色設定、時間線、台詞位置），列出來，並說明你採用哪一份。

---

## A. 口播流程

1. **轉錄**：`python scripts/transcribe.py raw.mp4 --workdir work --prompt "專有名詞"`
   - 一定要看 `work/unmatched.txt`：它列出有聲音但沒轉出字的段落，通常是漏掉的重說。用 `--range 起 迄` 重新轉錄，結果檔會給 `suggest_plan.py --add` 使用。
   - 使用者有稿子時，用稿子校對聽錯的字，但時間以實際聲音為準。拿不準的字列出來問。
2. **完整版**：`python scripts/suggest_plan.py --workdir work --source raw.mp4 --out plan_full.json --drop A-B --para T --fix 錯=對`，再執行 `python scripts/build.py plan_full.json`，請使用者確認切點。
3. **30 秒短版**：選一個不靠上下文也聽得懂的觀點（開頭的提問加結尾的答案常常最好）。先用文字給使用者確認，再寫 `plan.json`（範例：`examples/plan.example.json`；格式：`references/plan-schema.md`）。
4. **預覽和輸出**：`python scripts/build.py plan.json --preview 0.3,8,15`，確認後執行 `python scripts/build.py plan.json --cover`。

## B. 多鏡頭短劇流程（AI 生成鏡頭）

1. **盤點素材**：用 `ffprobe` 看每段的長度、解析度、fps、有沒有聲音，再依檔名時間或分鏡排序。每段取 3 格拼成一張圖，對照分鏡確認順序。
2. **找出對白**：每段都用 Whisper 轉錄並取字級時間。只有環境音的片段，Whisper 常會「幻聽」出不相干的句子（例如「明鏡需要您的支援」），要忽略。
3. **寫剪輯計畫** `plan.json`（範例：`examples/drama.plan.example.json`；格式：`references/drama-plan-schema.md`）：
   - 一段素材可以切成多個 piece：用 `zoom` 和 `center` 從同一個鏡頭做出特寫（例如水龍頭、天花板水漬），交替使用遠景和特寫，打破單調。放大不要超過 1.6 倍。
   - **L-cut**：一個鏡頭的台詞太長時，用 `audio_out` 讓聲音延續到下一個鏡頭的畫面上。
   - **回溯**：用 `freeze` 加上 `look: flashback`，再疊一個 `flashback` 標題，例如「30 分鐘前」。
   - **轉場**：預設直切。只有在有意義的地方才用 `slideup`（往下一層樓）或 `fade`（進入說明段）。
   - **疊加元素**（overlay）：`hook` 開頭大字加數字跳動、`ring` 圈出重點、`lower_third` 後果編號、`tag`、`stamp`、`notif` 手機通知、`recap` 後果清單、`bumper` 過場、`cards` 片尾說明字卡（背景用 `look: blur`）。
   - 聲音：素材原聲（對白和環境音）為主。音效依疊加元素自動加，`sfx_events` 可以補敲門、時鐘、水滴等。配樂預設關閉，留給使用者自己配。
4. **預覽**：`python scripts/drama_build.py plan.json --preview 1.8,14.8,40` 會在剪好的畫面上疊字卡截圖，存成 `work/preview.jpg`。
5. **輸出**：`python scripts/drama_build.py plan.json --cover`。只改字卡、字幕或聲音時，加上 `--skip-video` 會快很多。

---

## 2. 輸出後必看（兩種流程都一樣）

- `frames` 要等於 expected。不一致代表掉格或畫面凍結（見 pitfalls）。
- 響度約 −14 LUFS，峰值低於 −1 dBFS。
- `overlay bounds check` 要是 `ok`。出現 `OVERFLOW` 代表有字卡超出畫面，要修。
- 看 `contact.jpg`：字卡不能壓到臉，文字不能被切掉。
- 檔案要給手機看時，30MB 以上先壓一版給預覽用。

## 3. 封面（兩種流程都要做）

- 在 plan 的 `cover` 欄位設定背景用哪個鏡頭的哪一格。挑「故事最有張力」的畫面，例如有人指著損壞處。
- 構成：一個紅章點出事件，一個小標籤（例如「真實理賠案例」），大標題寫行為（例如「忘了關水龍頭」），第二行放結果或數字（`<b>` 會變成大紅字），最後一行用問句連回觀眾自己。
- **一定要看 `work/cover_grid_check.jpg`**：IG 個人頁會把封面裁成 4:5（y 285–1635），標題和人臉都要在裡面。
- 版型：口播用 `cover.html`（標題在上），短劇用 `cover_bottom.html`（標題在下，避開人物）。

## 4. 貼文文字（兩種流程都要給）

依 `references/caption-template.md` 給使用者：3 種第一行（好奇型、數字型、自我檢查型）、中間重點、互動問題、一定要放的行（來源、免責聲明、配樂標註）、hashtag。使用者要自己寫的話，就給建議，不用寫成完整文案。

## 5. 真實案例與數字

使用者要求「放新聞或真實案例」時，照 `references/sourcing-and-compliance.md` 做：
- 只用找得到原文的一手來源（保險公司公布的理賠案例、官方文件、正式新聞），並用 curl 讀原始網頁核對數字。
- 兩個來源數字不同時，要告訴使用者，並說明你採用哪一個、為什麼。
- 外幣金額換算成台幣時，要寫出匯率和年份，例如「以 2026 年匯率約 0.2 換算」。
- 找不到符合的新聞就直說，不要拿相近的案例冒充。

## 規則

- 不編造事實、數字或新聞。字卡上的真實案例一定附來源。
- 保險相關內容：不寫「一定賠」或「保證理賠」，要附上「示意案例，實際承保範圍、限額及除外責任依保單條款為準」。出現公司名稱或金額時，提醒使用者做合規確認。
- 音效用 `sfx.py` 合成，不下載來源不明的音檔。推薦配樂時，只推薦授權清楚的曲目（例如 CC BY），並附上標註格式。
- 遇到問題先查 `references/pitfalls.md`。
