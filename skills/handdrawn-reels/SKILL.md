---
name: handdrawn-reels
description: 製作手繪線稿風格的 IG Reels 直式動畫短片（1080×1920、30fps）與 4:5 輪播圖（1080×1350），包含事實查證、旁白稿、VoAI 旁白切句、依旁白實測秒數排時間軸、中文字幕燒錄＋.srt、程式合成配樂與音效、-15 LUFS、逐格 QA、截圖確認與交付。當使用者要做觀念型／知識型短影音、IG Reels、輪播圖、手繪動畫、解說動畫，或提到沿用 nhi-risk／jiuzhuang-mazu 的做法時使用。Use for hand-drawn line-art explainer Reels + carousel production with narration-timed animation.
version: 1.5.0
metadata:
  hermes:
    tags: [video, reels, instagram, animation, svg, carousel, narration, zh-TW]
    category: creative
---

# 手繪線稿 Reels ＋ 輪播圖

一套已經實際交付過的製作管線：SVG 手繪線稿元件、線條邊畫邊出現、手繪抖動、米白紙紋理、
依旁白實測秒數排時間軸、字幕燒錄＋.srt、合成配樂與音效、旁白時音樂自動壓低、-15 LUFS、逐格 QA。

**開工前必讀**：`references/style-guide.md`（風格核心與分鏡方法：手繪抖動、每張都要有具體比喻物件，不能做成方框＋文字的簡報）、`references/pitfalls.md`（37 條真的踩過的雷）。完整做法在 `references/workflow.md`。

## 快速開始

```bash
bash <skill>/scripts/setup_env.sh                           # 一次性：pip 套件＋離線模型（臨時 TTS、校對用 ASR）
bash <skill>/scripts/new_project.sh <新資料夾> <輸出檔名>     # 從 templates/project/ 建立專案並 npm install
cd <新資料夾>
python3 tools/tts.py && node tools/render.js check          # 先確認能跑
./make.sh                                                   # 完整管線 → output/
```

`templates/project/` 是「好的老師，最後會讓學生慢慢不需要你」那支作品的完整原始碼，已經驗證過可以跑（置中版面、bounds 檢查為 0）。前一支「健保破兆」在 repo 的 `nhi-risk/`，可以當第二個參考。**場景內容是範例**，換主題時要改寫的是：

| 檔案 | 要改什麼 |
|---|---|
| `script.json` | 場景 id、每個場景的 `lead`／`gap`／`tail`、每句旁白 `zh` |
| `render/scenes.js` | `SCENES[id]`（畫面）、各場景的時間函式、`EVENTS[id]`（音效時間）、`SOURCES`（片尾來源） |
| `tools/audio.py` | 「score」段落引用了場景 id，要依新場景重寫段落；樂器、音效、混音部分不用動 |
| `render/main.js` | `HANDLE`／`SERIES`（帳號與系列名）、`init()` 裡預載字型用的字串 |
| `render/lib.js` | 通用元件都能直接用；新物件照同樣的慣例加進來 |
| `voice/旁白稿.txt` | 由 script.json 產生，交給使用者去 VoAI 生成 |

## 流程與使用者關卡

1. **事實查證（先查再寫）**。使用者的前提若不成立，**停下來**，回報實際數字，用選項讓使用者決定（Claude Code 用 AskUserQuestion，其他 agent 直接列選項詢問）。不可以自行改寫，也不可以捏造。所有來源寫進 README 和片尾小字。
2. **旁白稿**：每句 30 字內、句尾有標點、一句一行。子墨約 0.20 秒/字，45～60 秒大約 200 字、13 句。把全文貼給使用者。
3. **不等真人錄音**：先用臨時 TTS（Kokoro，speed 1.3）把整條管線、畫面、QA、輪播都做完，截圖給使用者確認。
4. 收到 VoAI 整段音檔 → 放到 `voice/full.mp3` → 跑 `./make.sh`（會自動切句並逐句 ASR 驗證）→ 重做 QA、重新截圖。如果片長超過目標，先縮短停頓；還是超過就問使用者要不要設 `voice_tempo` 加速。
5. 交付：commit＋push，把影片和總覽圖傳給使用者（Claude Code 用 SendUserFile），回報時長、各場景秒數、LUFS／真峰值、QA 結果、待辦事項。

## 必須遵守的規格

- **IG 安全區**：上 220、下 380、右 120px 不放重要文字。內容**置中在 x = 540**（場景座標以 510 撰寫，再用 `REEL_DX = 30` 平移）；**文字寬度 ≤ 840px**，讓它落在 x 120～960。字幕框底貼齊 y = 1530，只放中文。每次改版都跑 `node tools/render.js bounds`，結果要是 0。
- **第 0 格要有內容**（它就是縮圖，也是前 2 秒的鉤子）。每個場景都要有會動的事件，不可以有 0.2 秒以上完全靜止。
- **字型用芫荽 Iansui**（教育部標準字形）。不要用霞鶩文楷 TC，它會把為、真畫成爲、眞。粗體用同色描邊。
- **文字揭露的 clip／mask 寬度一律用 `measure()` 實測**，不要寫死像素（「誰付」的言字旁就是這樣被切掉的）。
- **一個主色＋一個警示色**；警示色只能用在語意上是警示的詞。
- **音效時間跟畫面用同一組時間函式**（`EVENTS` → `render.js events` → `build/events.json`），不要在 Python 裡另外手寫一份。
- **響度**：-15 LUFS；limiter 上限 -4.2 dBFS，讓 AAC 編碼後的真峰值 ≤ -1.5 dBTP。**要量成品 MP4**（`ffmpeg -af ebur128=peak=true`）。
- 輪播圖要重新排版（沒有字幕；加帳號、頁碼、滑動提示；最後一張放來源），**不能直接裁切影片畫面**。

## 每一輪的 QA（缺一不可）

1. `tools/qa.py` 回報 `issues: 0`，且格數相符；`node tools/render.js bounds` 回報 0
2. 每個場景的 guides 截圖：`node tools/render.js stills <秒數,...> <dir> guides`
3. 同步表：每句旁白播到 60% 的那一格，確認對應的圖或字已經出現
4. **全尺寸裁切**看文字、數字、標籤有沒有被切掉或相撞（縮圖看不出來）
5. 輪播 5 張排成總覽圖檢查
6. `tools/asr_check.py` 的稿 vs 聽：差異只是同音字

## 環境注意

- Playwright 釘在 **1.56.1**。環境已預裝 `chromium-1194` 時（例如 Claude Code 雲端）不要執行 `playwright install`；沒有預裝時，執行一次 `npx playwright install chromium`。
- 雲端環境可能擋掉政府網站和新聞網站的直接連線。遇到時改用 WebSearch 摘要交叉比對，並在 README 和回報裡**明講查證限制**。
- 前作可能在別的分支：用 `git log --all --name-only` 找，用 `git archive` 唯讀取出，不要修改前作。
- 只改聲音時，不必重新渲染畫面：重跑 `audio.py`，再用 ffmpeg 重新 mux 就好。
- **取得這個 skill 時不要 clone 整個 repo**（完整歷史約 92 MB、最新版本約 33 MB，會逾時）。用 `git clone --depth 1 --filter=blob:none --sparse`，再 `sparse-checkout set skills`，只取約 128 KB。
- **Windows**：
  - 優先用 WSL；用 Git Bash 時要確認 `python3` 指令存在。
  - 工作路徑不要有中文或空格。
  - clone 加 `-c core.autocrlf=false`；如果出現 `$'\r'` 錯誤，就把 .sh 轉回 LF。
  - 要自己執行 `npx playwright install chromium`。
  - `MODELS_DIR` 改成自己的路徑（預設的 `/tmp/claude-0/models` 只適用於 Claude Code 雲端）。

## 檔案清單（全部都是這個 skill 的一部分，安裝時要一起取得）

- `references/pitfalls.md`
- `references/style-guide.md`
- `references/workflow.md`
- `scripts/new_project.sh`
- `scripts/setup_env.sh`
- `templates/project/.gitignore`
- `templates/project/make.sh`
- `templates/project/package-lock.json`
- `templates/project/package.json`
- `templates/project/render/index.html`
- `templates/project/render/lib.js`
- `templates/project/render/main.js`
- `templates/project/render/scenes.js`
- `templates/project/script.json`
- `templates/project/tools/asr_check.py`
- `templates/project/tools/audio.py`
- `templates/project/tools/qa.py`
- `templates/project/tools/render.js`
- `templates/project/tools/sheet.py`
- `templates/project/tools/split_voice.py`
- `templates/project/tools/srt.py`
- `templates/project/tools/tts.py`
- `templates/project/tools/tts_common.py`
- `templates/project/voice/旁白稿.txt`
