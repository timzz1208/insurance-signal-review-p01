# talking-head-reel（口播影片 → IG Reels）

給 AI 代理（Codex、Claude Code）用的 skill：把一支口播影片剪成有字幕、動態字卡、說明畫面、音效、結尾卡和封面的短影音。

## 安裝

**Codex**
- 只在某個專案用：把整個 `talking-head-reel` 資料夾放到專案的 `.agents/skills/` 底下
- 每個專案都能用：放到 `~/.agents/skills/` 底下
- 使用：在 Codex 裡輸入 `$talking-head-reel`，或直接說「幫我把這支口播剪成 Reels」

**Claude Code**
- 放到 `~/.claude/skills/talking-head-reel/`（或專案的 `.claude/skills/`）
- 使用：輸入 `/talking-head-reel`，或直接描述需求

第一次使用時，代理會執行 `scripts/setup.sh` 安裝 ffmpeg、Whisper、Chromium、思源黑體等工具。

## 你要準備
1. 口播影片：Google Drive 連結（設成「知道連結的人可檢視」）或直接給檔案
2. （選填）口播稿，用來校對字幕
3. 想要的成品：完整版、30 秒短版、要不要說明畫面
4. 一副耳機：AI 聽不到聲音，剪接點和音效要靠你驗收

## 內容
- `SKILL.md`：給 AI 的流程說明
- `scripts/`：轉錄、產生剪輯計畫、輸出影片、字卡、音效、封面
- `assets/`：字卡和封面的版型（HTML/CSS）
- `references/`：plan.json 格式、視覺風格、已知問題、貼文範本
- `examples/plan.example.json`：第一支影片（AI 剪片實測）的完整剪輯計畫
