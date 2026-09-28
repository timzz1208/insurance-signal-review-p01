# Review submission notes

## 1. 執行者與環境

- 執行者：OpenAI Codex（GPT-6）。使用者在本次交付指令中稱這是以 `handdrawn-reels skill` 製作的專案，但本工作階段可用技能清單中沒有名為 `handdrawn-reels` 的技能；我是在既有專案架構上直接審查與修改。
- 作業系統：Microsoft Windows 11 家用版，64 位元，build 26200。
- Shell：主要使用 Windows PowerShell；本次依交付要求，以 Git Bash 5.2.37 建立稀疏檢出、分支與 Git 操作，沒有使用 WSL。
- Node.js：v24.19.0。
- Python：系統版本 3.14.2；製作流程使用專案內 `build/venv` 的隔離環境執行所需套件。
- Git：2.53.0.windows.2。
- 瀏覽器：Google Chrome，路徑為 `C:/Program Files/Google/Chrome/Application/chrome.exe`。

## 2. 使用者原始指令

以下是收到的原始製作指令全文：

```text
你只能根據我上傳的影片、截圖與原始碼工作。請先指出每個時間點的問題，再提出並執行修改；如果無法驗證畫面，必須明確說明，不得宣稱 QA 通過。

你現在是資深的 IG 短影音導演、2D motion designer、內容編輯與 QA 審查者。請直接接手並改善現有專案，不要只給建議。

【專案位置】
C:\Users\李麗芬\work\insurance-signal-review-p01\reels\strengths-feedback-analysis

【目前基準】
- 目前 branch：reels/strengths-feedback-analysis
- 目前 commit：1d23a16fe56dce23238d0a3797a7f7cb589def46
- 成品主題：別急著補短板，先找出你的超預期
- 帳號：@timzz1208
- 影片：output/strengths_feedback_analysis.mp4
- 輪播：output/carousel/
- 場景截圖：output/stills/

【工作目標】
把目前版本改善成 v2，重點處理：
1. 動畫事件太弱、太像靜態圖卡的問題。
2. 場景之間的轉場與節奏不夠有推進感。
3. 畫面沒有充分把「寫下預期 → 對照結果 → 找出重複模式 → 下一輪投入」演出來的問題。
4. 開場前 1–2 秒不夠抓人的問題。
5. 文字、旁白、畫面三者不同步或互相重複的問題。
6. 輪播圖內容與視覺層級不夠有收藏價值的問題。
7. 任何文字裁切、資訊過密、留白失衡、手機縮圖看不懂的問題。

【重要工作原則】
- 不要只改 README 或提出建議，必須實際修改程式、內容或視覺設計，重新產生成品。
- 不要從零重做整個專案；先理解現有架構，再保留好的部分。
- 不要把動畫理解成單純淡入淡出或文字逐字出現。
- 每個場景都要有「狀態改變」或「物件行動」，讓觀眾看得出事情正在發生。
- 動畫必須服務理解，不要加入無意義的彈跳、旋轉或裝飾性動作。
- 先檢查目前成品的實際畫面與時間點，不可以只讀原始碼就宣稱已改善。
- 如果無法直接觀看影片，請用 ffmpeg 擷取各場景關鍵幀、contact sheet 與逐秒畫面來檢查；不要假裝完成視覺驗收。

【第一階段：先審查現況】
請先閱讀：
- README.md
- script.json
- render/main.js
- render/scenes.js
- render/lib.js
- tools/render.js
- tools/qa.py
- output/stills/
- output/carousel/00_contact_sheet.png

接著實際檢查影片與輪播，建立：
REVISION_AUDIT.md

每個問題請使用以下格式：
- 問題編號
- 檔案或影片時間點
- 目前看到的問題
- 為什麼會削弱理解、節奏或收藏價值
- 建議修法
- 修正優先級：CRITICAL／HIGH／MEDIUM／LOW

至少逐一檢查 5 個場景，不要只寫總評。

【第二階段：直接執行修正】
完成審查後，直接處理低風險問題，包括：
- 重設場景內的動作順序。
- 增加真正有意義的物件變化。
- 強化開場鉤子。
- 讓每個場景只推進一個理解重點。
- 修正轉場速度與重複淡入淡出。
- 讓畫面事件和旁白時間同步。
- 修正文字層級、留白、安全區與手機縮圖可讀性。
- 重新設計輪播頁面的資訊節奏，不要只把影片畫面裁切成圖片。

如果你認為必須修改核心旁白或主旨，請先在 REVISION_AUDIT.md 寫清楚：
- 原句
- 新句
- 修改理由
- 會影響哪些字幕、TTS、時間軸、音效與畫面

核心內容不可偏離：
- 行動前寫下預期。
- 事後比較實際結果。
- 透過多筆紀錄辨識重複出現的能力模式。
- 不把單次成功當成能力證明。

【內容與查證限制】
- 使用繁體中文與芫荽 Iansui。
- 每句旁白 30 字內，句尾有標點，一句一行。
- 保留 @timzz1208。
- 不出現任何保險商品、保險公司或推銷內容。
- 不得加入 Harvard、2,000 人、10 年、80%、收入增加 3 倍等未找到可靠原始來源的說法。
- 不得把沒有來源的「研究指出」寫成事實。
- Drucker 內容只能保留有來源支持的主張；新增主張要更新 README 的來源與限制說明。

【技術與驗收】
請依現有專案工具重新產生：
- output/strengths_feedback_analysis.mp4
- output/strengths_feedback_analysis.srt
- output/carousel/01_cover.png 至 05_close.png
- output/stills/
- contact sheet
- README.md
- REVISION_AUDIT.md
- REVISION_CHANGELOG.md

若需要完整重跑，Windows 環境使用：
MODELS_DIR='C:/Users/Public/hermes_models' CHROME_PATH='C:/Program Files/Google/Chrome/Application/chrome.exe'

必須完成並記錄：
1. 影片實際渲染成功。
2. 影片尺寸為 1080×1920、30 fps。
3. 字幕與旁白時間軸一致。
4. 每個場景都有可見且有意義的動態事件。
5. 每張輪播為 1080×1350。
6. 文字沒有裁切、重疊或超出安全區。
7. 影片 QA 通過，issues: 0。
8. 成品音訊重新量測，目標約 -15 LUFS。
9. 重新檢查輸出檔案確實存在。
10. 產出變更清單，列出每個修改檔案與理由。

【Git 規則】
- 不要修改 main。
- 不要修改 nhi-risk/。
- 請從目前 commit 建立新 branch：
  reels/strengths-feedback-analysis-v2
- 可以建立本機 commit，但不要 push 到 GitHub。
- 如果工作樹已有未提交變更，先停止並回報，不要覆蓋使用者修改。
- 最後回報：branch、commit、修改檔案、QA 結果、仍需人工確認的地方。

我建議你特別保留這個限制

讓它「先審查再改」，但不要讓它自行大改核心主旨。因為動畫、轉場、版面可以讓 AI 自主修；可是如果它連旁白邏輯都重寫，可能會把目前已經查證過的內容又改回沒有來源的說法。

如果那個 AI 不能讀取你的 C 槽資料夾，就另外提供這些檔案：

text output/strengths_feedback_analysis.mp4 output/carousel/00_contact_sheet.png output/stills/00_scene_contact_sheet.png README.md script.json render/scenes.js render/main.js tools/qa.py
```

後續指令為：

```text
繼續完成
```

以及：

```text
可以直接傳上來給我 成品 我來驗收
```

## 3. 實際執行與跳過項目

### 實際執行

1. 先確認原工作樹乾淨，再從指定 commit 建立 `reels/strengths-feedback-analysis-v2`，沒有修改 `main` 或 `nhi-risk/`。
2. 閱讀指定的 README、腳本、渲染程式、QA 工具、場景截圖與輪播 contact sheet。
3. 將原 MP4 解碼成每秒畫面與 contact sheets，逐一檢查五個場景；審查結果寫入 `REVISION_AUDIT.md`。
4. 保留五場景架構、紙張質感、Iansui、`@timzz1208` 與 17 句旁白。17 句文字沒有改寫；只把結尾停留時間由 4.0 秒縮短為 1.5 秒。
5. 重新設計 `render/scenes.js` 的場景行為：開場修補片移動、問題卡翻面、預期寫入與實際結果滑入、A/B/C 多筆紀錄比對、能力線索與時間投入移入下一輪任務。
6. 將長雙重淡入淡出改為 0.32 秒水平推進轉場，移除沒有解釋作用的持續抖動與裝飾性運動。
7. 重新設計五張輪播，改成可獨立收藏的封面、行動前填寫、實際對照、多筆模式與下一輪工作表。
8. 改進 `tools/qa.py`，讓發現問題時以非零狀態結束；保留黑畫面、白畫面、突變與長時間凍結檢查，並做過會被正確拒絕的黑畫面負向測試。
9. 新增逐秒 review、事件幀與輸出完整性檢查工具；新增 Windows 完整流程 `make.ps1`。
10. 第一輪完成渲染後檢查事件幀，發現三個動畫中間態問題：開場物件穿過紅字、模式卡進場互疊、結尾舊內容與清單交疊。修正後再完整渲染一次，並將版面檢查擴大到所有非轉場影格。
11. 最終製作階段實際檢視五張輪播、五張事件幀、轉場 contact sheet 與 53 張逐秒畫面 contact sheets。
12. 本次送審前又依 `make.sh` 完整重跑一次，輸出保存到 `build/make.log`，接著執行本專案的 `node tools/render.js layout`。此專案沒有 `bounds` mode；`layout` 是逐幀文字安全區與重疊檢查的對應指令。
13. 最新重跑結果：1595/1595 影格解碼；影片 QA `issues: 0`；layout 1557 個樣本、0 issues；音訊 -15.44 LUFS；17 個字幕 cue；五張輪播均重新輸出。

### 跳過或無法完整驗證

- 沒有在播放器中從頭到尾連續觀看最終影片，也沒有以人耳完整監聽成品音訊；視覺驗收採關鍵幀、事件幀、轉場與逐秒 contact sheet。
- 離線 ASR 對部分繁體中文有明顯同音或近音誤判，尤其「強項」與「行動前」；無法僅靠 ASR 判定是 TTS 發音問題或辨識器問題。
- 沒有在 Instagram 實機上傳，因此 IG 手機介面遮擋與壓縮後觀感仍需人工確認。
- 無法從本工作階段匯出完整、逐則且包含工具活動的原始對話紀錄，因此沒有建立 `conversation.md`；使用者原始製作指令已完整收錄於本檔。

## 4. 過程中的錯誤與處理

1. 切換分支後，Git sparse checkout 一度讓專案檔案看似消失；確認不是刪檔後，從 repo 根目錄把精確專案路徑加入 sparse checkout。
2. 系統 Python 缺少渲染與音訊套件；改用專案內隔離的 `build/venv`，沒有修改全域 Python。
3. Windows 上 Chrome 正常關閉曾卡住；渲染工具改用 Playwright BrowserServer，結束時只關閉該次渲染擁有的 Chrome 子行程。
4. 原本直接使用 `numpy.convolve` 產生混響過慢；換成等價的 FFT convolution。
5. 稀疏的時間點檢查沒有抓到動畫中間態重疊；加入事件幀檢查，並把 layout 掃描擴充至所有非轉場影格後修正。
6. 使用者範例要求 `node tools/render.js bounds`，但此專案沒有 `bounds` mode；若直接執行會落入預設影片渲染分支。改執行功能對應且實際存在的 `layout` mode，結果一併寫入 `build/make.log`。
7. 建立審查包時發現原專案的 `voice/旁白稿.txt` 殘留另一支影片的稿件；它沒有參與目前的離線 TTS 或成品輸出。為避免審查者誤解，只在新建的 `review-submissions/.../project/` 複本內將它改成 `script.json` 的 17 句旁白，原 repo 既有資料夾沒有因此變更。

## 5. 芫荽 Iansui 字型

成功載入。`render/index.html` 明確載入 `@fontsource/iansui` 的繁體中文 CSS，渲染初始化會等待 `document.fonts.load()` 與 `document.fonts.ready`。送審前另以同一個 Chrome 渲染環境實測 `document.fonts.check('400 48px "Iansui"', '芫荽繁體字')`，結果為 `true`，載入的 FontFace family 也為 `Iansui`。沒有觀察到系統預設字體取代。

## 6. 自評不足

- 最終動態節奏雖以逐秒與事件幀檢查過，但連續觀看的情緒流與停頓仍應由真人看片確認。
- TTS 的「強項」、「行動前」等詞需用人耳確認；離線 ASR 不足以做最後裁決。
- 目前視覺是單色紙張手繪系統，訊息清楚但風格變化偏節制；若帳號未來有更明確的品牌規範，仍可再統一色彩、筆觸與封面識別。
- 輪播已改成獨立資訊設計，但尚未在實際 Instagram 發布畫面測試壓縮、縮圖與系統 UI 疊層。
- 這次沒有加入新外部來源；內容只沿用原專案已有來源與限制說明。

## 7. 審查入口

- 核心動畫：`project/render/scenes.js`
- 完整重跑紀錄：`project/build/make.log`
- 原始審查：`project/REVISION_AUDIT.md`
- 修改與驗證清單：`project/REVISION_CHANGELOG.md`
- 影片：`project/output/strengths_feedback_analysis.mp4`
- 場景截圖：`project/output/stills/`
- 輪播：`project/output/carousel/`
