# reel-editor（短影音剪輯 → 封面 → 貼文）

給 AI 代理（Codex、Claude Code）用的 skill，處理兩種素材：
- **口播影片**：轉錄、去重說和停頓、字幕、動態字卡、說明畫面、音效
- **多段 AI 生成的短劇鏡頭**：分鏡剪接、從單鏡放大做特寫、回溯、轉場、後果標籤、片尾說明字卡、真實案例字卡、音效

兩種都會輸出封面（確認 IG 4:5 裁切），並提供貼文文字建議。

## 安裝
- **Codex**：把 `reel-editor` 資料夾放到專案的 `.agents/skills/` 或 `~/.agents/skills/`，用 `$reel-editor` 叫用
- **Claude Code**：放到 `~/.claude/skills/reel-editor/`，用 `/reel-editor` 叫用
- 第一次使用時，代理會執行 `scripts/setup.sh` 安裝工具

## 你要準備
1. 影片：口播長片，或依分鏡生成好的多段鏡頭（Google Drive 連結或直接給檔案）
2. 企劃書、分鏡表或稿子（有的話）
3. 想要的成品：片長、風格、要不要真實案例
4. 一副耳機：AI 聽不到聲音，剪接點和音效要靠你驗收

## 內容
- `SKILL.md`：給 AI 的完整流程
- `scripts/`：轉錄、口播剪輯（build.py）、多鏡頭剪輯（drama_build.py）、字卡和封面輸出、音效合成
- `assets/`：字卡、疊加元素、封面版型
- `references/`：兩種 plan 格式、視覺風格、真實案例與合規、貼文範本、已知問題
- `examples/`：口播範例（AI 剪片實測）、短劇範例（樓下那間房不能住了 EP01）
