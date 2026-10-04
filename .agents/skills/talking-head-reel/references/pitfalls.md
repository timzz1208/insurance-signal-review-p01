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
