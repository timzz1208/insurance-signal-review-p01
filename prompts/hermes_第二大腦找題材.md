# 給 Hermes：到第二大腦找題材，並用 handdrawn-reels 做成 Reels＋輪播

> 使用前只要改【】裡的三個地方。

---

你是我（IG 帳號 @timzz1208）的短影音企劃兼製作助理。這次任務分兩階段：先從我的第二大腦挑題材，等我選定後，再用 handdrawn-reels skill 做成 IG Reels 和 4:5 輪播圖。

## 0. 先準備好 skill（用你自己的 GitHub 權限直接取得，不用公開安裝）
- repo：`timzz1208/insurance-signal-review-p01`，分支：`claude/nhi-trillion-reels-carousel-n5u2md`
- **不要 clone 整個 repo。** 這個分支的完整歷史約 92 MB、最新版本約 33 MB（主要是影片和圖片），曾經因此兩次傳輸逾時。你需要的只有 `skills/` 和 `prompts/`，約 128 KB。用 sparse＋shallow 的方式只取這兩個資料夾：
  ```bash
  git clone -c core.autocrlf=false --depth 1 --filter=blob:none --sparse \
    -b claude/nhi-trillion-reels-carousel-n5u2md \
    https://github.com/timzz1208/insurance-signal-review-p01.git <工作目錄>/insurance-signal-review-p01
  git -C <工作目錄>/insurance-signal-review-p01 sparse-checkout set skills prompts
  ```
  - 需要參考成品原始碼時，才加：`git -C <工作目錄>/insurance-signal-review-p01 sparse-checkout add nhi-risk`（約 33 MB）。
  - 已經取得過的話，改成 `git -C <工作目錄>/insurance-signal-review-p01 pull`。
  - 如果 clone 失敗、只留下不完整的目錄，先問我能不能刪掉，再重試。**不要自己刪。**
- 讓 Hermes 載入這個 skill（二選一）：
  - 在 `~/.hermes/config.yaml` 的 `skills.external_dirs` 加上 `<工作目錄>/insurance-signal-review-p01/skills`。這樣 repo 更新後，pull 一下就是最新版。
  - 或把 `skills/handdrawn-reels/` 整個資料夾複製到 `~/.hermes/skills/creative/handdrawn-reels/`。
- 完整讀過 `SKILL.md`、`references/workflow.md`、`references/pitfalls.md`，接下來的所有工作都照這三份文件做。
- 參考作品是同一個 repo 的 `nhi-risk/`（成品、README、原始碼）。新作品開一個新資料夾，**不要改動 `nhi-risk/`**。完成後 commit＋push 到同一個 repo 的新分支（例如 `reels/<主題>`），不要直接推到 main。

## 0.5 Windows 環境（到了製作階段才需要；挑題材階段不用）
這套管線是在 Linux 上開發和驗證的：腳本是 bash，預設路徑是 Linux 路徑，Chromium 也是預裝好的。在 Windows 上，一定要先處理下面這幾點：
1. **優先用 WSL（Ubuntu）執行整條管線**，所有東西都能原樣運作。沒有 WSL 時才改用 Git Bash，而且要確認 `python3` 這個指令存在（Windows 上常常只有 `python` 或 `py -3`，可以建一個 alias 或捷徑）。
2. **工作目錄不要放在有中文或空格的路徑底下**，例如 `C:\Users\李麗芬\...`。ffmpeg、Chromium、Python 遇到這類路徑可能出錯。WSL 請用 `~/work/`，Git Bash 請用 `C:\work\`。
3. **換行字元**：clone 時已經加了 `-c core.autocrlf=false`。如果仍然出現 `bash: $'\r': command not found`，就是 .sh 檔被轉成 CRLF 了，執行 `sed -i 's/\r$//' make.sh scripts/*.sh` 修正。
4. **Chromium 不是預裝的**：`npm install` 之後，在專案目錄執行一次 `npx playwright install chromium`（playwright 已經釘在 1.56.1，會自動抓對應的版本）。
5. **模型路徑**：`setup_env.sh` 預設把離線模型放在 `/tmp/claude-0/models`，Windows 不適用。執行前先 `export MODELS_DIR=~/models`，之後每次執行管線都要設定同一個值。
6. 第一次跑的時候，先用 `node tools/render.js check` 和 `node tools/render.js stills 1,5 build/test` 確認能渲染，再跑完整的 `./make.sh`。渲染速度依 CPU 核心數而定，可以調整 `render.js video` 的 worker 數量。

## 1. 到第二大腦找素材
- 位置：【第二大腦位置，例如 Obsidian vault 路徑 ~/Notes、Notion 資料庫名稱、或資料夾路徑】
- 範圍：優先看最近【6】個月新增或修改的筆記，再看有以下標籤或關鍵字的舊筆記：【保險、醫療、健保、長照、理財、退休、家庭風險、數據、新聞摘錄】
- 找的是「可以拍」的素材：
  - 一個讓人意外的具體數字
  - 一個常見的誤解
  - 一個制度裡真實存在、但很多人不知道的規定
  - 一句我自己寫下、想分享的觀點
- 每一個候選都要記下來源筆記的路徑或連結，以及原文的關鍵句。**不可以憑記憶補內容。**

## 2. 篩選標準（帳號定位：觀念型、值得收藏、不推銷）
每個候選依下面 6 項打 1～5 分：
1. **封面鉤子**：前 2 秒能不能用一個數字或反差句抓住人（例：「健保一年快 1 兆，為什麼你還要自己準備醫療費？」）
2. **收藏價值**：看完之後，觀眾下次做決定時用得上嗎
3. **可視覺化**：能不能拆成 5 個場景，而且每個場景都有一個「會動的事件」（數字跳動、東西被畫出來、水滴落下、被劃掉再重寫……）
4. **可查證**：關鍵數字和制度有沒有官方出處（政府機關、法規、主管機關公告）
5. **定位契合**：不需要提到任何保險商品或公司名稱就講得完
6. **時效**：近期有新聞、新數字或新制度

排除：
- 必須推薦商品才講得完的題目
- 前提需要猜測的題目
- 只有單一非官方來源的數字

## 3. 交給我挑選（在這裡停下來，等我回覆）
用繁體中文，列出分數最高的 5 個候選。每個候選包含：
- 題目，以及封面反差句（兩行）
- 5 個場景大綱：每個場景一句主要文字，加上一個會動的事件
- 需要查證的事實清單：每一項寫出預期的官方出處。如果前提可能不成立，要明講，例如「若尚未超過 1 兆，封面改寫方案為……」
- 6 項分數、總分，以及一句推薦理由
- 來源筆記：路徑或連結，加上原文關鍵句

最後附上一個總表（題目｜總分｜最大風險），然後**停下來等我選**，不要自己往下做。

## 4. 我選定之後
完全照 handdrawn-reels skill 的流程做：
1. **先做事實查證。** 找到官方出處才寫進內容；前提不成立時停下來，給我改法選項，不可以自己改寫或捏造。
2. 寫旁白稿（每句 30 字內、句尾有標點、一句一行，全長約 200 字），貼給我。我會到 VoAI 用「子墨／Neo／穩健」生成整段音檔。
3. 等音檔的同時，先用臨時 TTS 把整條管線跑完，然後截圖給我確認：5 個場景的安全區截圖、同步表、5 張輪播圖。
4. 收到音檔 → 切句並逐句驗證 → 全部重跑 → 逐格 QA → 再截圖給我確認。
5. 帳號標示：Reels 左上放 `@timzz1208`；輪播左上放 `@timzz1208 ｜ 【系列名，例如 醫療風險】`，右上放頁碼。
6. 交付：MP4、.srt、5 張 1080×1350 PNG、每個場景的截圖、README（含查證表和所有來源）。然後 commit＋push，並回報時長、各場景秒數、LUFS／真峰值、QA 結果、還沒解決的事項。

## 規則
- 所有數字、制度都要有來源。查不到、或只能間接查證時，要明講限制。
- 不出現任何保險商品或公司名稱，也不做推銷。
- 使用繁體中文和教育部標準字形（字型用芫荽 Iansui）。
- 每一次要我確認的時間點，都要停下來等我回覆。
