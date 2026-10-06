# 已知問題與解法

| 症狀 | 原因 | 解法（build.py 已內建） |
|---|---|---|
| ffmpeg 被 Killed（OOM） | 一個 filter_complex 裡 trim 十幾段整支影片 | 每段先切成獨立檔再 concat |
| 成片某段畫面凍結數秒 | overlay + ass 放在同一個濾鏡鏈 | overlay 和字幕分兩次輸出 |
| 成片影像比聲音短（停在中途） | zoompan 套在整支影片上又接 overlay | zoompan 只套前 2 秒，再和後段 concat |
| 字幕全部停在第一句（只在預覽截圖） | 用 `-ss` 在輸入前 seek 會重設時間戳 | 檢查成片時用輸出端 seek：`-i f -ss t` |
| Whisper 漏掉一段重說 | 整段轉錄時偶爾整句不出字 | 看 `unmatched.txt`，用 `--range` 重轉 |
| 專有名詞聽錯（AI→愛、剪接點→簡介點） | 模型詞彙 | `--prompt` 放專有名詞；字幕用 `--fix` 修 |
| large-v3-turbo 輸出簡體 | 模型行為 | 已用 OpenCC s2twp 轉繁體 |
| YouTube 下載失敗（要求登入） | 雲端 IP 被擋 | 改用 Google Drive / 直接上傳 |
| 字卡寬度超出畫面 | 字太多 | 標題 ≤ 11 字（80px）、大字 ≤ 6 字（168px）；或調 `size` |
| 交付檔案太大 | 平台上限 | `ffmpeg -i out.mp4 -c:v libx264 -crf 26 -maxrate 1600k -bufsize 3200k -c:a copy small.mp4` |
| 字卡偏右、右邊被切掉 | CSS 寬度沒有包含內距（940 加內距 112 等於 1052px） | 所有盒子用 `box-sizing:border-box`；輸出後看 bounds check |
| 字卡在暫停時看起來歪 | 進場是從側邊滑進來的 | 片尾說明字卡改成原地淡入加輕微放大 |
| 轉場、音效、標籤時間差了 0.35 秒 | xfade 的第二段從 offset 開始，不是從第一段結束才開始 | drama_build 用 `transition_in` 自動計算 |
| 只有環境音的片段轉出奇怪的句子 | Whisper 在噪音上幻聽 | 用畫面和分鏡判斷，不要相信這些字 |
| WebFetch 摘要裡的金額不對 | 摘要模型抄錯 | 用 curl 抓原始網頁，grep 金額 |
| AI 生成的素材 576 寬，放大後糊 | 原始解析度低 | 放大不要超過 1.6 倍；特寫畫面請使用者另外生成插入鏡頭 |
