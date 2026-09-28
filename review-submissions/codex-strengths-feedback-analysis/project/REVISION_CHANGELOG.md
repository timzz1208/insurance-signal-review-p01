# v2 修改與驗收紀錄

完成日期：2026-09-29（Asia/Taipei）。
分支：`reels/strengths-feedback-analysis-v2`。
基準：`1d23a16fe56dce23238d0a3797a7f7cb589def46`。
本機提交，不推送。所有專案修改限定於 `reels/strengths-feedback-analysis/`，未修改 main 或 nhi-risk/。

## 內容與設計

- 原有五幕、17句旁白、芫荽Iansui、紙張配色與手繪工具保留。核心旁白原句沒有重寫，沒有新增研究主張。
- 開場第一幀有完整鉤子；補片在前1.3秒移向斷板，接著把焦點交給結果紀錄。
- 第二幕把自我判斷卡翻成可對照的紀錄卡。
- 第三幕用筆填預期、把實際結果移入右欄，實際演示事前／事後的比較。
- 第四幕先留單筆待觀察，再依序加入多筆示例，標出共同做法並保留未超預期的例外。
- 第五幕把待驗證線索放進下一輪任務，時間籌碼移入計畫格，最後換成四步收藏小抄。
- 四次場景交界改為0.32秒推頁，背景與帳號固定。移除裝飾性繞圈、微縮放與持續線條抖動。
- 輪播獨立編排成封面、事前填寫、事後示例、多筆模式與下一輪表單，沒有裁切影片作圖。
- 片尾保留1.5秒閱讀時間，原版為4秒；新TTS實測時間軸53.212秒，影片補齊至53.233333秒。

## 原審查項目處理

| 問題 | 實際修正與證據 |
|---|---|
| A01 開場偏弱 | 完整首幀、補片位移；events_01_cover.png的0／0.667／1.3秒。 |
| A02 右側安全區與層級 | 重排標題、紀錄主視覺；1,559個版面樣本無文字越界。 |
| A03 感覺到結果缺動作 | events_02_reframe.png的10.767–14秒呈現翻面與紀錄提示。 |
| A04 預期／實際未演示 | events_03_feedback.png的18.933–23.867秒呈現筆尖與結果卡。 |
| A05 空場繞圈 | 單筆紀錄加「待觀察」，不再用無意義圓點填時間。 |
| A06 把面向誤當多筆 | A／B／C三筆示例，做法跨筆重複，C保留未超預期；events_04_pattern.png。 |
| A07 下一輪不具體 | 待驗證線索卡與三枚時間籌碼進入下一輪格；events_05_close.png。 |
| A08 結尾擁擠 | 收藏小抄與字幕分區，來源縮成可讀方法出處，移除底部長段註記。 |
| A09 轉場無推進 | 四次短推頁；transitions.png包含每次前後與中間影格。 |
| A10 輪播收藏價值 | 五頁完整重排，02與05可照填，03與04保留例子與解讀限制。 |
| A11 QA不足 | 加入逐幀文字界限／重疊掃描、最終檔規格與字幕檢查、QA失敗退出、負向測試與成品解碼事件證據。 |

第一次完整輸出後，事件抽幀又找出三處動畫中間狀態問題：補片路徑碰字、三筆紀錄同時展開重疊、結尾兩層文字交疊。已把提示字移出路徑、錯開卡片進場、舊內容先退場後才顯示新內容，並重新完整渲染及驗證。不是只改文件。

## 最終驗收

| 項目 | 結果 | 證據 |
|---|---|---|
| 影片實際渲染成功 | 通過；四個片段、1,597幀，最後一輪158秒完成幀渲染 | output/qa/render_video.txt |
| 尺寸／fps | 1080×1920、30/1 fps、H.264 | output/qa/artifacts.json |
| 字幕／旁白時間軸 | 17組；共用句首、WAV長度與字型斷行，文字與原稿一致 | output/qa/artifacts.json、timeline.json、SRT |
| 每幕有意義動作 | 已逐張看過五份事件總覽，物件位置／內容／關係隨旁白改變 | output/stills/events_01_cover.png～events_05_close.png |
| 輪播尺寸 | 5張均1080×1350 | output/qa/artifacts.json |
| 文字安全區／重疊 | 1,559樣本，issues 0；含非轉場動畫中間影格與5張輪播 | output/qa/layout.txt、layout.json |
| 影片技術QA | 1,597／1,597幀，issues: 0；平均幀差0.32、最大8.91 | output/qa/video_qa.txt |
| 最終成品音訊 | -15.4 LUFS；真峰值-3.7 dBFS；LRA 1.3 LU | output/qa/loudness.txt |
| 檔案存在 | MP4、SRT、5張輪播均存在，已記錄大小與SHA-256 | output/qa/artifacts.json |
| 修改清單 | 本文附錄逐檔列出 | 下方完整檔案清單 |

最終MP4 SHA-256：`c79bbb2015052d30b3e9245f8c980319990ef9c2beea06d7a7fa12b06919b0a8`。

QA規則變動透明記錄：原「0.2秒相同畫面即凍結」改成「超過4秒警示」，因為已移除可掩蓋靜態內容的線條抖動；黑白異常與跳幀門檻未放寬。刻意閱讀停留與語意動作另外用事件圖驗收。負向測試中的黑屏錯長影片被exit 1拒絕，沒有把檢查器改成永遠成功。

## 視覺驗收範圍與仍需人工確認

已實際檢視原版56張逐秒抽樣總覽、新版53張逐秒抽樣總覽、五幕各6張事件影格、4次轉場各5張影格，以及5張新版輪播總覽。字幕安全區另用實際瀏覽器文字範圍逐幀檢查；短推頁時文字刻意移出畫面，不屬固定版面裁切。

沒有用播放器完整連續觀看，也沒有真人聆聽；不宣稱真人播放／聽感QA通過。離線ASR有同音誤辨，尤其第13句「強項」及第17句「行動前」，無法僅憑ASR判斷是辨識誤差或TTS發音問題。正式發布前請聽這些句子、確認音樂比例，並在IG手機預覽檢查介面覆蓋與整體節奏。

所有教工具、步驟圖等皆標為示例；不是研究資料。三筆不作能力認定門檻，仍保留「不被單次成功定型」與「能力線索需要繼續驗證」。本輪未新增外部來源，也未重查基準README中的連結。

## 工程處理

- Windows稀疏取出原先不含本專案；建立指定分支後，從儲存庫根目錄把本專案加入取出範圍，沒有恢復或修改其他專案。
- 本機預設Python缺少影音套件；在忽略的build/venv建立隔離環境，直接相依版本列於requirements-render.txt。
- Chrome的requestAnimationFrame與正常關閉曾停住；改成截圖前強制版面計算，並由Playwright BrowserServer回收本輪建立的瀏覽器程序。
- 音訊ducking改用等價FFT卷積，保留原配樂、混音、限制器與響度目標。
- 依使用者全域制度，修改前備份原檔並回寫institution/lessons.md；這兩個位置在專案Git之外。

## 完整檔案清單

下表包含修改與新增檔案；產線中間檔build/、node_modules/不納入提交。

| 檔案 | 修改／新增理由 |
|---|---|
| `README.md` | 更新重跑方式、示例限制與有證據的v2驗收，取代舊版QA數值。 |
| `REVISION_AUDIT.md` | 修改前五幕與輪播逐項審查、11項優先級與保真界線。 |
| `REVISION_CHANGELOG.md` | 逐項修改、驗收證據、人工待核與完整檔案清單。 |
| `make.ps1` | Windows完整重跑及失敗退出、保存QA日誌。 |
| `output/audit_before/contact_00.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/contact_15.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/contact_30.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/contact_45.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_001.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_002.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_003.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_004.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_005.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_006.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_007.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_008.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_009.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_010.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_011.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_012.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_013.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_014.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_015.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_016.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_017.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_018.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_019.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_020.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_021.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_022.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_023.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_024.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_025.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_026.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_027.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_028.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_029.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_030.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_031.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_032.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_033.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_034.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_035.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_036.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_037.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_038.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_039.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_040.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_041.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_042.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_043.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_044.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_045.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_046.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_047.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_048.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_049.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_050.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_051.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_052.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_053.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_054.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_055.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/audit_before/second_056.png` | 原MP4的逐秒解碼審查證據，保留修改前狀態。 |
| `output/carousel/00_contact_sheet.png` | 重新設計的1080×1350輪播或五頁總覽。 |
| `output/carousel/01_cover.png` | 重新設計的1080×1350輪播或五頁總覽。 |
| `output/carousel/02_reframe.png` | 重新設計的1080×1350輪播或五頁總覽。 |
| `output/carousel/03_feedback.png` | 重新設計的1080×1350輪播或五頁總覽。 |
| `output/carousel/04_pattern.png` | 重新設計的1080×1350輪播或五頁總覽。 |
| `output/carousel/05_close.png` | 重新設計的1080×1350輪播或五頁總覽。 |
| `output/qa/artifacts.json` | 保存實際執行的技術檢查、響度、時間軸或檔案驗證證據。 |
| `output/qa/artifacts.txt` | 保存實際執行的技術檢查、響度、時間軸或檔案驗證證據。 |
| `output/qa/asr.txt` | 保存實際執行的技術檢查、響度、時間軸或檔案驗證證據。 |
| `output/qa/audio.txt` | 保存實際執行的技術檢查、響度、時間軸或檔案驗證證據。 |
| `output/qa/layout.json` | 保存實際執行的技術檢查、響度、時間軸或檔案驗證證據。 |
| `output/qa/layout.txt` | 保存實際執行的技術檢查、響度、時間軸或檔案驗證證據。 |
| `output/qa/loudness.txt` | 保存實際執行的技術檢查、響度、時間軸或檔案驗證證據。 |
| `output/qa/motion.json` | 保存實際執行的技術檢查、響度、時間軸或檔案驗證證據。 |
| `output/qa/negative_test.txt` | 保存實際執行的技術檢查、響度、時間軸或檔案驗證證據。 |
| `output/qa/render_check.txt` | 保存實際執行的技術檢查、響度、時間軸或檔案驗證證據。 |
| `output/qa/render_video.txt` | 保存實際執行的技術檢查、響度、時間軸或檔案驗證證據。 |
| `output/qa/timeline.json` | 保存實際執行的技術檢查、響度、時間軸或檔案驗證證據。 |
| `output/qa/video_qa.txt` | 保存實際執行的技術檢查、響度、時間軸或檔案驗證證據。 |
| `output/review_seconds/contact_00.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/contact_15.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/contact_30.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/contact_45.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_001.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_002.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_003.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_004.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_005.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_006.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_007.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_008.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_009.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_010.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_011.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_012.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_013.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_014.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_015.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_016.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_017.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_018.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_019.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_020.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_021.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_022.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_023.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_024.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_025.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_026.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_027.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_028.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_029.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_030.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_031.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_032.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_033.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_034.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_035.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_036.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_037.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_038.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_039.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_040.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_041.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_042.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_043.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_044.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_045.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_046.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_047.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_048.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_049.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_050.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_051.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_052.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/review_seconds/second_053.png` | 最終MP4的逐秒解碼驗收證據。 |
| `output/stills/00_scene_contact_sheet.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/events_01_cover.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/events_02_reframe.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/events_03_feedback.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/events_04_pattern.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/events_05_close.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00000.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00006.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00020.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00030.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00039.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00127.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00135.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00168.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00201.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00210.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00239.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00248.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00251.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00254.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00257.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00260.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00323.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00337.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00355.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00360.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00372.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00387.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00402.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00420.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00450.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00474.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00483.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00486.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00489.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00492.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00495.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00568.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00592.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00625.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00629.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00630.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00662.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00680.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00716.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00720.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00755.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00764.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00767.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00770.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00773.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00776.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00810.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00889.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00907.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00937.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00942.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00960.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f00997.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f01015.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f01039.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f01050.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f01102.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f01111.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f01114.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f01117.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f01120.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f01123.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f01200.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f01263.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f01286.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f01320.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f01392.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f01459.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f01474.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f01492.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f01500.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/f01581.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/stills/transitions.png` | 從最終MP4重新解碼的事件／轉場／場景驗收畫面，防止混入舊版。 |
| `output/strengths_feedback_analysis.mp4` | 重新渲染、合成的v2成品，含原旁白、重排音效、字幕。 |
| `output/strengths_feedback_analysis.srt` | 重建的17組字幕，含與燒錄字幕一致的斷行。 |
| `render/main.js` | 短推頁、固定品牌、獨立輪播、完整新字載入、取消裝飾抖動。 |
| `render/scenes.js` | 沿用五幕與工具庫，重設物件事件、示例對照、多筆模式及五頁輪播。 |
| `requirements-render.txt` | 記錄本輪已實跑的Python影音套件版本。 |
| `script.json` | 原17句旁白不改，只把最後場景tail從4秒調為1.5秒。 |
| `tools/audio.py` | 以FFT卷積計算相同ducking包絡，降低處理時間。 |
| `tools/event_frames.py` | 一次解碼精確事件／轉場影格，更新所有舊stills並記錄動作區差異。 |
| `tools/qa.py` | 允許有意識的閱讀停留；解碼失敗或issues非0回傳失敗。 |
| `tools/render.js` | 逐幀版面檢查、共用字幕斷行、影片JPEG擷取及瀏覽器生命週期修復。 |
| `tools/review_frames.py` | 從實際MP4產生逐秒畫面與帶時間標籤的總覽。 |
| `tools/sheet.py` | 排除既有總覽，避免把contact sheet再次納入總覽。 |
| `tools/srt.py` | 使用瀏覽器匯出的同一時間軸及Iansui量測斷行。 |
| `tools/verify_output.py` | 檢查MP4規格、17句原稿、WAV時長、字幕、PNG尺寸與雜湊。 |
