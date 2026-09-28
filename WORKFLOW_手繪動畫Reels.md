# 手繪線稿動畫 Reels ＋ 輪播圖工作流程

已經打包成 skill，放在 `skills/handdrawn-reels/`（`.claude/skills/handdrawn-reels` 是指過去的捷徑，Claude Code 會自動載入）。

- `SKILL.md`：入口，包含快速開始、要改哪些檔案、必須遵守的規格、每輪 QA、完整檔案清單
- `references/workflow.md`：完整流程
- `references/pitfalls.md`：27 條踩雷紀錄
- `templates/project/`：可直接執行的專案範本
- `scripts/setup_env.sh`、`scripts/new_project.sh`：環境準備、建立新專案

安裝方式：
- Hermes Agent：`hermes skills install timzz1208/insurance-signal-review-p01/skills/handdrawn-reels`（skill 要在 main 分支上）
- claude.ai：上傳 `dist/handdrawn-reels.zip`
