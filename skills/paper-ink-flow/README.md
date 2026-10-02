# paper-ink-flow：紙與墨資訊流動畫 skill

**製作者：林彥廷**
**聯絡信箱：timzz1208@gmail.com**（使用上有任何問題，歡迎寄信給我）
**IG：@timzz1208**

把「家庭責任流：如果明天停薪，你家撐得了幾個月？」這支 IG 動態影片的完整做法，打包成任何 AI 助理都能使用的 skill。適用 Claude Code、Hermes Agent、OpenAI Codex、claude.ai。

## 內容

| 路徑 | 說明 |
|---|---|
| `SKILL.md` | 入口：給 AI 讀的流程、規格、各平台使用方式 |
| `references/method.md` | 完整製作流程（資料包 → 故事結構 → 旁白 → 對時 → 聲音 → 輸出 → 驗收） |
| `references/visual-language.md` | 「紙與墨」視覺語言：配色、字體、版面、動態節奏，以及不能拿掉的元素 |
| `references/pitfalls.md` | 22 條踩雷紀錄 |
| `references/compliance.md` | 保險、財經內容紅線檢查表 |
| `references/storyboard-template.md` | 分鏡表範本 |
| `templates/project/` | 「家庭責任流」完整原始碼，可以直接重做出原片 |
| `scripts/` | 環境準備、建立新專案 |

## 安裝

- **Claude Code**：把 `paper-ink-flow/` 資料夾放進專案的 `.claude/skills/`。
- **claude.ai**：到「設定」的 Skills 頁面上傳這個 zip。
- **Hermes Agent**：把資料夾放到 `~/.hermes/skills/creative/paper-ink-flow/`。
- **OpenAI Codex／其他 AI**：把資料夾放進專案，在指令裡寫「先完整讀 `paper-ink-flow/SKILL.md` 和 `references/` 的文件，再照流程做」。

## 需要的環境

- Node.js 18 以上（`npm install` 會安裝 playwright 1.56.1，以及思源黑體、思源宋體的本機字型套件）
- Python 3，加上 numpy、scipy、imageio-ffmpeg（`scripts/setup_env.sh`）
- 沒有預裝 Chromium 時，執行一次 `npx playwright install chromium`

## 注意

範本內容是虛構家庭與示意數字，屬於教育用的概念原型，不是商品推薦、保額建議或給付承諾。
用這套方法製作保險、財經內容時，請照 `references/compliance.md` 做；內容定位是觀念分享，不是商品推薦。

---
© 林彥廷｜timzz1208@gmail.com
