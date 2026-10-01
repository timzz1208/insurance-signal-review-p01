# 房貸責任流：房貸還有 20 年，萬一主要收入中斷？

> **製作者：林彥廷**｜timzz1208@gmail.com（有問題歡迎來信）｜IG：@timzz1208
> 用 paper-ink-flow skill 製作的「家庭責任流」系列第 2 號。版面 B「家庭日報」。
> 所有家庭、數字都是虛構的示意。

## 檔案

| 路徑 | 說明 |
|---|---|
| `output/mortgage-flow.mp4` | 成品（1080×1920，60fps） |
| `STORYBOARD.md` | 旁白稿、分鏡、實際時間表 |
| `scene.js` | 這支影片的劇情與版面（時間點都在 `T`） |
| `engine.js` | 共用元件（紙張、顆粒、粒子流、印章、存款水槽…），配色在 `COL` |
| `video.html` | 預覽播放器（瀏覽器開啟即可拖時間軸） |
| `sound.py` | 音效、配樂、旁白混音（`VOICE_LINES`） |
| `voice/` | `narration_raw.wav`（VoAI 原檔）、`narration.wav`（1.2 倍速，實際使用） |
| `mockups/` | 版面＋色調提案 A／B／C 的封面 |

## 重做

```bash
npm install
bash make.sh          # 畫面 → 音效＋旁白 → 合成 → 檢查
node render.js --frames 0,4.7,8.2,19,24.4,28.8,35,40.5,46.5   # 只看定格
python3 tools/sheet.py build/stills build/sheet.png 4          # 定格總覽
```

## 聲明

虛構家庭與數字｜示意動畫，不代表特定商品、核保結果或給付承諾。
這是教育用的概念原型，公開發布前請依公司審核流程確認內容。
