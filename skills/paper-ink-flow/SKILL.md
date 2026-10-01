---
name: paper-ink-flow
description: 製作「紙與墨」風格的程式化資訊流動畫（IG Reels 9:16，1080×1920，60fps）與互動模擬器：纖維紙底、墨黑＋一個強調色、網點／木刻斜線／印章取代發光，用粒子水流、水桶、節點、分岔選項演出「錢或責任怎麼流動、哪裡斷掉、有哪些選擇」。含旁白對時（TIME_MAP）、程式合成音效與配樂、旁白 ducking、逐格輸出與檢查。適合家庭財務、保險觀念、現金流、預算、風險情境等「流動與缺口」題材。範例作品為「家庭責任流：如果明天停薪，你家撐得了幾個月？」。Use for paper-and-ink programmatic motion graphics (particle flows, buckets, decision branches) for 9:16 explainer reels.
version: 1.0.0
author: 林彥廷 <timzz1208@gmail.com>
metadata:
  hermes:
    tags: [video, reels, instagram, motion-graphics, canvas, particles, finance, insurance, zh-TW]
    category: creative
---

# 紙與墨資訊流動畫（paper-ink-flow）

> **製作者：林彥廷**｜聯絡信箱：**timzz1208@gmail.com**（使用上有任何問題，歡迎寄信給我）
> 範例作品：「家庭責任流」（IG：@timzz1208）

這個 skill 把「家庭責任流」那支影片的完整做法打包起來，任何 AI 助理都能照著重做一支同風格的新影片，包括 Claude Code、Hermes Agent、OpenAI Codex、claude.ai。

**開工前必讀，依序讀：**
1. `references/method.md`：完整製作流程（12 步）
2. `references/visual-language.md`：「紙與墨」視覺語言，哪些不能改
3. `references/pitfalls.md`：踩過的雷
4. `references/compliance.md`：保險、財經內容的紅線（做這類題材時一定要讀）

## 快速開始

```bash
bash <skill>/scripts/setup_env.sh                          # 一次性：Python 套件（numpy、scipy、imageio-ffmpeg）
bash <skill>/scripts/new_project.sh <新資料夾> <輸出檔名>    # 複製範本＋npm install（字型、playwright）
cd <新資料夾>
node render.js --frames 0.3,2.5,9,15,21,28,36              # 先輸出幾張定格看風格（build/stills/）
bash make.sh                                               # 完整：畫面 → 音效＋旁白混音 → 合成 → 檢查
```

- 範本 `templates/project/` 就是「家庭責任流」的原始碼，可以直接跑出那支影片。不含旁白音檔，請自備 `voice/narration.wav`。
- **換主題時要改的地方**：見 `references/method.md` 第 3 節的對照表。
- 所有畫面都是「時間的函數」，同一秒永遠畫出同一格，所以可以跳到任何一秒檢查。

## 流程與使用者確認點（細節見 method.md）

1. **一句話訊息＋資料包**（主題、長度、品牌色或「交給你」、參考影片、結尾帳號）。缺了就先問。
2. **事實查證與紅線**：保險、財經題材只用虛構家庭和示意數字，並加上聲明（compliance.md）。
3. **旁白稿**：每秒 4～5 字，數字寫成中文字，句尾有標點。**請使用者先生成旁白，再開始做畫面。**
4. **分鏡表**：先用 30 秒的「劇情時間」排，例如「鉤子 → 斷裂 → 後果 → 選擇 → 轉折 → 結語」。交給使用者確認。
5. **關鍵畫面先行**：每一幕先出一張定格（`render.js --frames`），全部通過才做動態。
6. **TIME_MAP 對時**：把旁白每句的真實秒數對應到劇情時間。`video.html` 和 `sound.py` 裡的表**必須一模一樣**（`python3 tools/sync_check.py` 會檢查）。
7. **聲音**：音效要配合「紙與墨」的語言（紙、筆、木頭、印章），旁白說話時背景壓低約 11 dB。
8. **輸出與驗收**：`make.sh` → `tools/check.py`（1080×1920、30 MB 以內、峰值 ≤ -1 dBTP）→ 定格總覽 → **請人實際播放、開聲音看一遍**。

## 必須遵守的規格

- **畫面**：1080×1920，60fps（測試可以先用 `--fps 30`）。H.264 固定位元率約 5.5M，因為逐格顆粒會讓檔案暴增；成品 30 MB 以內。
- **IG 安全區**：重要文字放在上下 250px 以內，右下角留給按讚、留言按鈕。畫面上的字要能獨立說完故事，因為多數人靜音滑。
- **配色**：墨黑為主；一個強調色（朱紅）代表重點；第二個顏色（群青）**留到故事轉折才第一次出現**。不要用發光效果，也不要用深藍底加霓虹。
- **字型**：標題用思源宋體 Black（Noto Serif TC 900），標籤用思源黑體（Noto Sans TC 500～800），透過 npm 的 `@fontsource` 從本機載入。`render.js` 會先收集整支片會用到的字，再預先載入。
- **第 0 格就是封面**：大字提問，而且畫面已經在動。不要從黑畫面淡入。
- **結尾**：帳號，加上「虛構家庭與數字｜示意動畫，不代表特定商品、核保結果或給付承諾」。

## 給不同 AI 助理的使用方式

| 助理 | 怎麼用 |
|---|---|
| Claude Code | 把整個 `paper-ink-flow/` 資料夾放進 repo 的 `.claude/skills/`，會自動載入；或直接打 `/paper-ink-flow` |
| claude.ai | 到「設定」的 Skills 頁面上傳 `paper-ink-flow.zip` |
| Hermes Agent | 把資料夾放到 `~/.hermes/skills/creative/paper-ink-flow/`，或在 `config.yaml` 的 `skills.external_dirs` 加上它的上層資料夾 |
| OpenAI Codex／其他 | 把資料夾放進專案，在指令裡寫「先完整讀 `paper-ink-flow/SKILL.md` 和 `references/` 的四份文件，再照流程做」。可以把下面這段貼進 `AGENTS.md` |

```text
製作 IG 動態資訊圖影片時，先讀 paper-ink-flow/SKILL.md 與 references/ 四份文件，照 method.md 的流程做；
每個確認點都要停下來等使用者回覆。不要拿掉紙張紋理、顆粒、網點、印章；不要改成發光／霓虹風格。
```

## Windows 注意

- 用 WSL 或 Git Bash 執行 `make.sh`。只能用 PowerShell 時，照 `make.sh` 裡的三個步驟手動執行。
- 第一次要執行 `npx playwright install chromium`。
- 工作路徑不要有中文或空格。
- 找不到 ffmpeg 時，`pip install imageio-ffmpeg`，`render.js` 會自動找到它。

## 檔案清單（全部都是這個 skill 的一部分，安裝時要一起取得）

- `references/method.md`
- `references/visual-language.md`
- `references/pitfalls.md`
- `references/compliance.md`
- `references/storyboard-template.md`
- `scripts/setup_env.sh`
- `scripts/new_project.sh`
- `templates/project/README.md`
- `templates/project/video.html`
- `templates/project/engine.js`
- `templates/project/interactive.html`
- `templates/project/render.js`
- `templates/project/sound.py`
- `templates/project/make.sh`
- `templates/project/package.json`
- `templates/project/.gitignore`
- `templates/project/tools/check.py`
- `templates/project/tools/voice_lines.py`
- `templates/project/tools/sync_check.py`
- `templates/project/voice/lines.txt`

---
製作者：林彥廷｜timzz1208@gmail.com｜有問題歡迎來信
