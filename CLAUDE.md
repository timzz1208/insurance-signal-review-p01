# 給 Claude 的說明（@timzz1208 的內容製作 repo）

製作者：林彥廷｜timzz1208@gmail.com

## Skills（新對話會自動載入，也可以直接打 /名稱 呼叫）

| skill | 用途 |
|---|---|
| `/paper-ink-flow` | 「紙與墨」資訊流動畫：家庭財務、保險觀念、現金流（範例：家庭責任流、房貸責任流） |
| `/handdrawn-reels` | 手繪線稿 IG Reels＋4:5 輪播圖（三套主題色：finance／ai／growth） |

- 原始檔在 `skills/`，`.claude/skills/` 是指向它們的連結。
- 選題、寫文案前，先讀 `skills/paper-ink-flow/references/audience.md`：這支要吸引客戶還是同業。
- 找題材的提示詞：`prompts/hermes_第二大腦找題材.md`。
- 給其他 AI 用的打包檔：`dist/*.zip`。

## 慣例

- 先錄旁白再做畫面：旁白稿確認後，使用者用 VoAI「子墨」生成，通常加速 1.2 倍。
- 內容是觀念分享：不出現公司名稱、商品名稱、保費、保額，也不做承諾性說法；全程標示虛構家庭與數字。
- 成品 mp4 不放進 git，直接傳給使用者。
- 過去的作品原始碼（nhi-risk、good-teacher、mortgage-flow 等）在分支 `claude/nhi-trillion-reels-carousel-n5u2md`。
