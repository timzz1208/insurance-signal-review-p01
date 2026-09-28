# 手繪線稿動畫 Reels ＋ 輪播圖：AI 可重複使用的工作流程

> 給接手的 AI：這份文件整理自兩支已完成的作品。
> - `jiuzhuang-mazu/`：新社九庄媽進香，16:9 橫式，在分支 `claude/jiuzhang-mazu-procession-animation-sd4sby`
> - `nhi-risk/`：健保破兆，IG Reels 直式＋4:5 輪播，在分支 `claude/nhi-trillion-reels-carousel-n5u2md`
>
> 新作品用 `scripts/new_project.sh` 從 `templates/project/` 建立，再改 `script.json`、`render/scenes.js`、`tools/audio.py` 的樂譜段落。
> 不要改動舊作品的資料夾。踩雷紀錄在 `pitfalls.md`，動手前請先讀完。

---

## 1. 成品與規格速查

| 項目 | 規格 |
|---|---|
| Reels | 1080×1920、30fps、H.264（CRF 18，`-tune animation`）＋ AAC 256k／48kHz，45～60 秒，5 個場景，每個場景 8～12 秒 |
| 輪播圖 | 每個場景的「完整呈現」定格，1080×1350 PNG，**重新排版，不能直接裁切影片畫面**（沒有字幕、加頁碼與帳號） |
| IG 安全區 | 上 220px、下 380px、右 120px 不放重要文字。內容中心線 x = 510（扣掉右側 120px 後置中），重要文字放在 x 70～950、y 230～1530 |
| 字幕 | 只放中文，54px 粗體，淺色字＋深色半透明底框；框底貼齊 y = 1530（下方安全區上緣）；太長時在最靠近中間的標點斷兩行；句尾「。」拿掉；另輸出時間完全一致的 .srt |
| 帳號 | Reels：`@timzz1208` 放在左上 (60, 262)，是獨立圖層，轉場時不淡出。輪播：左上放 `@timzz1208 ｜ 系列名`，右上放頁碼 `01 / 05`，右下放「往左滑 →」 |
| 字型 | **芫荽 Iansui**（`@fontsource/iansui`），採教育部標準字形。只有一種字重，粗體用同色描邊做（見pitfalls.md） |
| 色彩 | 米白紙 `#f4eee1`、深墨線 `#26211c`；一個主色＋一個警示色。警示色只能用在語意上是「警示」的詞（例如自費、缺口），不能拿來裝飾 |
| 響度 | 整體 -15 LUFS；旁白時音樂壓低 10 dB、音效壓低 5 dB；**成品 MP4 的真峰值要 ≤ -1.5 dBTP**（要量編碼後的檔案） |
| 旁白 | 使用者在 VoAI 用「子墨／Neo／穩健」一次生成整段音檔。每句 30 字內、句尾有標點、一句一行。子墨實測約 0.20 秒/字（含句內停頓） |

---

## 2. 流程總覽（含使用者確認關卡）

```
0 讀前作、準備環境
1 事實查證 ──(數字不成立 → 停下來，給選項讓使用者決定)
2 寫旁白稿 → 交給使用者去 VoAI 生成
3 旁白定稿 → 優先先生成 VoAI 旁白再做畫面；做不到才用臨時 TTS 草稿
4 畫面：場景函式＋共用的時間函式
5 聲音：音效時間從畫面程式匯出
6 渲染 → 7 QA（自動逐格＋人工抽幀）→ 截圖給使用者確認
8 輪播圖
9 收到真人旁白 → 切句驗證 → 全部重跑 → 再做一次 QA、再截圖
10 commit＋push，傳檔給使用者
```

**使用者關卡**（到這些點就停下來，或主動送出截圖）：

1. 查證結果和使用者給的前提不一致時
2. 旁白稿寫好時
3. 第一版截圖出來時
4. 真人旁白版完成時

使用者修改意見通常很具體（例如「誰付兩個字被切掉」），修好後要用全尺寸裁切圖自己先確認，再回報。

---

## 3. 每個階段的做法

### 0. 讀前作、準備環境
- 前作可能不在 main。先 `git fetch --all`，再用 `git log --all --name-only --format= | grep 資料夾名` 找到它在哪個分支。
- 用 `git archive <分支> <資料夾> | tar x -C 暫存目錄` 讀程式碼，**不要 checkout 或修改前作**。
- 環境需求：
  ```bash
  pip install numpy scipy soundfile pyloudnorm imageio-ffmpeg pillow sherpa-onnx opencc-python-reimplemented
  npm install          # playwright 釘 1.56.1、@fontsource/iansui
  ```
- 離線模型從 GitHub releases 下載到 `$MODELS_DIR`（預設 `/tmp/claude-0/models`）：
  - `k2-fsa/sherpa-onnx` tts-models 的 `kokoro-multi-lang-v1_1`（臨時 TTS）
  - asr-models 的 `sherpa-onnx-paraformer-zh-small-2024-03-09`（校對用 ASR）
  - 下載完刪掉 .tar.bz2 省空間。

### 1. 事實查證（先查再寫）
- 每一個數字、制度名詞都要有出處：官方公告優先，媒體報導用來交叉比對。
- **使用者給的前提如果不成立，不可以自己改寫，也不可以捏造。** 要回報實際數字，並用 AskUserQuestion 給 2～3 個改法讓使用者選。
  例：「健保一年花超過 1 兆」不成立（115 年度 9,883 億）；116 年度協商共識是 10,434 億，但尚待核定。使用者選了「明年首度破兆＋小字註明待核定」。
- 尚未定案的數字，畫面上一定要有小字註明狀態（例如「待衛福部核定」）。
- 所有來源寫進 README，也放進片尾最後一格的小字（輪播第 5 張同樣要有）。
- 內容若要求「不推銷」，片尾加「本內容為觀念說明，不推薦任何商品」，而且畫面、文字、道具上都不出現商品或公司名稱。

### 2. 旁白稿
- 用字數估長度：總長 ≈ 字數 × 0.20 秒＋各場景前後留白。45～60 秒大約是 200～210 個中文字、13 句左右。
- 句子結構要讓畫面「有東西可以對上」：一句話對應一個動作或事件。
- 輸出 `voice/旁白稿.txt`（一行一句、有編號），並把全文貼在對話裡，讓使用者可以直接複製到 VoAI。

### 3. 時間軸（`tools/tts.py` → `build/timeline.json`）
- `script.json` 裡每個場景都有 `lead`、`gap`、`tail`（秒）。
  - 前面的場景要緊湊（lead 約 0.35）。
  - 需要讓觀眾停留的場景放慢（lead 1.4、gap 0.9、tail 2.6）。
  - CTA 場景的 tail 放 ≥ 3 秒。
- 還沒有真人旁白時，用 Kokoro（sid 67）當臨時旁白，`SPEED = 1.3`，語速才會接近子墨。整條管線先做完，不要等使用者的音檔。
- 畫面、字幕、音效、配樂全部讀同一份 timeline。

### 4. 畫面（`render/lib.js`、`render/scenes.js`、`render/main.js`）
- 每個場景寫成一個函式：`SCENES[id](tl, sc, M) → { art, txt, abs? }`
  - `tl`：場景內的時間（秒）
  - `M.card`：是否為輪播模式
  - `art` 套較強的手繪抖動（`feDisplacementMap` scale 3.2，每 3 格換一次種子）；`txt` 只套很輕的抖動（scale 1.2），確保字清楚。
- 線稿用 `S(d, p)` 做「邊畫邊出現」（`pathLength=1` 加 dash offset）。封閉物件要填紙色，並且由後往前畫，才能擋住後方的線。
- 文字出現用 `Tw()`：左到右的手寫式揭露（漸層遮罩）加上輕微上浮。
- **每個場景都要有會動的事件**。停留較久的場景要持續動，例如雨、水流、呼吸般的微晃。不要出現 0.2 秒以上完全靜止的畫面（QA 會抓）。
- **時間函式要共用**：`coverTimes(sc)`、`umbTimes(sc)` 這類函式同時給畫面和 `EVENTS[id](sc)` 使用；`node tools/render.js events` 匯出 `build/events.json` 給 `audio.py`。音效時間不要在 Python 裡另外手寫一份。
- 需要物理感的動畫（例如水滴）用真實公式：水滴先長大 0.5 秒 → 脫落 → `y = y0 + ½·g·t²`（g = 2600 px/s²）。落點時間是解析解，同一份資料同時給畫面和音效。
- 輪播模式預設沿用 Reels 的畫面，平移 `translate(30, -130)`：Reels 的內容區 y 240～1360 剛好對到卡片的 110～1230，沒有字幕，另外加帳號、頁碼、滑動提示。如果某個場景的 Reels 版面放不進卡片（例如最後一張要放來源），就回傳 `abs: true`，自己寫一套卡片座標。

### 5. 聲音（`tools/audio.py`）
- 配樂全部用程式合成、原創。現代極簡風格：
  - 加法合成鋼琴（partials 略帶非諧波、高頻衰減較快、加一點 hammer noise）
  - 合成大鼓、rim、hi-hat
  - 104 BPM、Am7–Fmaj7–C–G
- 依場景設計段落：
  - 開頭第 0 格就下和弦，搭配快速 hi-hat。
  - 慢的場景拿掉打擊，改成半速和弦加 pad。
  - CTA 收在大三和弦加鐘聲。
- 音效依 `events.json` 的 kind 合成：tick、thump、punch、scribble、zip、whoosh、pop、clock、stop、plink（水桶越滿音越高）、page、strike、write、rain 等。
- 混音順序：旁白 ducking → reverb → 以旁白響度為基準平衡音樂（旁白響度 -9 LU）→ 正規化到 -15 LUFS → limiter 反覆 4 次收斂。**limiter 上限 -4.2 dBFS**（原因見pitfalls.md）。

### 6. 渲染（`tools/render.js`）
- Headless Chromium 逐格組好 SVG，**等兩次 `requestAnimationFrame`** 再截圖，把 PNG 無損送進 ffmpeg。開 4 個 worker，每個 worker 用自己的 browser。
- 常用模式：
  - `check`：只組 SVG 不截圖，最快找出程式錯誤，每次改完先跑。
  - `stills t1,t2 dir [guides]`：抽幀；加 `guides` 會疊上 IG 安全區參考線。
  - `cards dir`：輸出輪播圖。
  - `events`：匯出音效時間。
  - `video 4`：輸出影片片段。
- 速度參考：4 核心約 6 分鐘渲染 55 秒影片。`make.sh` 會跑完整條管線。

### 7. QA（每次改版都要重跑）
- **自動**（`tools/qa.py`）：逐格解碼，檢查
  - 近乎單色的畫面
  - 純黑／純白色塊
  - 連續 6 格以上凍結（轉場附近除外）
  - 非轉場處的突兀跳動
  - 總格數是否等於 timeline 推算的格數

  目標是 `issues: 0`。
- **人工**，每一輪都做：
  1. 每個場景完整狀態的截圖（含安全區參考線版），檢查文字有沒有進到安全區外。
  2. **同步表**：每句旁白播到 60% 的那一格排成一張總覽圖，確認該句的圖或字已經出現。
  3. **全尺寸裁切**：縮圖看不出字被切掉或線條相撞，重點區域一定要裁原尺寸來看。
  4. 輪播 5 張排成一張總覽圖。
- 聲音：用 `ffmpeg -af ebur128=peak=true` 量**成品 MP4**，確認約 -15 LUFS、真峰值 ≤ -1.5 dBTP。
- 旁白：`asr_check.py` 逐句列出「稿」和「聽」的內容，人工確認差異只是同音字。

### 8. 替換成真人旁白
1. 把使用者的檔案複製到 `voice/full.mp3`。
2. 執行 `tools/split_voice.py`：用動態規劃找切點，候選是 ≥ 120 ms 的停頓，依各句字數比例分配，偏好較長的停頓，然後逐句做 ASR 比對。
3. 相似度偏低時（例如 81%），檢查該句開頭、結尾每 10 ms 的 dB 值。切點落在約 -90 dB 的靜音裡，就代表只是 ASR 聽錯，不是切錯。
4. 重跑 `make.sh`。各場景長度會改變，所以所有截圖時間點都要依新的 timeline 重算。

### 9. 交付
- 目錄結構：
  - `output/<名稱>.mp4`、`.srt`
  - `output/carousel/01～05_*.png`
  - `output/stills/*.jpg`（含 `_guides`）
  - `output/review/` 總覽圖
- README 要寫：規格、查證表與來源連結、查證限制、旁白稿、每個場景的動態事件、版面與聲音做法、重建指令。
- commit 訊息寫清楚這一版改了什麼；push 到指定分支。MP4 約 16 MB（GitHub 單檔上限 100 MB）。
- 用 SendUserFile 傳影片和兩張總覽圖，回報：時長、各場景秒數、LUFS／真峰值、QA 結果、還沒解決的事（例如數字尚待核定）。

---

## 4. 專案結構

```
<作品>/
  script.json            # 場景 id、lead/gap/tail、每句旁白
  voice/旁白稿.txt        # 給使用者的旁白稿；voice/full.mp3 放真人整段錄音
  render/lib.js          # 筆觸原語（S/SS/wash/handLine/ell…）＋物件元件＋文字（T/Tw/tag/underline）
  render/scenes.js       # 5 個場景＋共用時間函式＋EVENTS＋SOURCES
  render/main.js         # 紙紋理、轉場、抖動、字幕、帳號、輪播模式、collectEvents
  tools/split_voice.py   # 整段錄音 → 逐句切開＋ASR 驗證
  tools/tts.py           # 量測秒數 → build/timeline.json（沒有錄音時用 Kokoro）
  tools/asr_check.py     # 稿 vs 聽
  tools/audio.py         # 配樂＋音效＋ducking＋響度
  tools/render.js        # check / events / stills / cards / video
  tools/srt.py  tools/qa.py  tools/sheet.py
  make.sh                # 完整管線
```

---

## 6. 每一輪交付前的檢查清單

- [ ] `make.sh` 結束時是 `EXIT 0`，QA 為 `issues: 0`，格數相符
- [ ] 成品 MP4：1080×1920、30fps、約 -15 LUFS、真峰值 ≤ -1.5 dBTP
- [ ] 第 0 格有內容；前 2 秒就有明顯動態
- [ ] 所有重要文字都在安全區內（guides 截圖）；帳號清楚可見，沒有碰到任何場景的內容
- [ ] 同步表：每一句旁白播放時，對應的圖或字已經出現
- [ ] 全尺寸裁切：手寫揭露的字、數字、標籤都沒有被切掉或相撞
- [ ] 字形是教育部標準字形（為、真、內、值）
- [ ] 輪播 5 張都是 1080×1350，重新排版；有帳號、頁碼、滑動提示；最後一張有來源
- [ ] .srt 的時間和燒錄字幕一致
- [ ] README：查證表、來源連結、查證限制、尚未定案的數字
- [ ] commit＋push 到指定分支；用 SendUserFile 傳影片和總覽圖；回報時長、各場景秒數、LUFS、QA 結果、待辦事項
