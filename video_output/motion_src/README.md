# 影片樣式與製作流程

## 字型
- **Noto Sans CJK TC（思源黑體 繁中）**，免費開源（SIL OFL）
  - 字卡大字：Black（900）
  - 字卡內文、清單：Bold（700）
  - 底部字幕：Bold
- 安裝（Linux）：`apt-get install fonts-noto-cjk fonts-noto-cjk-extra`
- Mac / Windows：到 Google Fonts 下載「Noto Sans TC」

## 色票
| 用途 | 色碼 |
|---|---|
| 主色（強調、底條、按鈕） | `#FFD60A` 黃 |
| 警示（刪除線、錯誤、「聽得懂」） | `#FF3B30` 紅 |
| 主要文字 | `#FFFFFF` 白 |
| 說明畫面背景 | `#0E0F12` 深灰黑 |
| 面板 / 卡片 | `#17191E`、`#1A1C21` |
| 次要文字 | `#9AA0AA` 灰 |

## 尺寸（1080×1920 畫布）
| 元素 | 字級 | 位置 |
|---|---|---|
| 開頭標題「幫我剪好看一點」 | 100px，黃底黑字 | y≈330 |
| 開頭第二行「AI 聽得懂嗎？」 | 132px | y≈500 |
| 重點大字卡（通常不會等） | 150–176px | 畫面上半部 |
| 說明畫面標題 | 80px | y≈310 |
| 底部字幕 | 66px，白字黑邊 6px | 距底 520px（避開 IG 介面） |

所有字卡都放在畫面上半部，避開臉和底部字幕；封面重點元素放在中間 4:5 範圍內（y 285–1635），個人頁格子才看得到。

## 檔案說明
| 檔案 | 用途 |
|---|---|
| `cards.html` | 動態字卡、說明畫面、結尾卡的樣式與動畫 |
| `cards.json` | 每張字卡出現的時間點 |
| `render.js` | 用 Chromium 把字卡逐格輸出成透明 PNG |
| `cover.html` / `cover.js` | 封面設計與輸出 |
| `reel.py` / `reel.ass` | 30 秒版的剪接點、鏡頭縮放、底部字幕樣式 |
| `edit.py` / `subs.ass` | 2 分鐘完整版的剪接與字幕 |
| `transcribe.py` | Whisper 轉錄（字級時間戳） |
| `sfx.py` | 合成音效並依時間點排好 |
| `vfx.txt` | 開頭推近、震動、RGB 錯位的 ffmpeg 濾鏡 |

## 下一支影片要改的地方
1. `transcribe.py` 轉錄新口播
2. `reel.py` 裡改剪接點（`C`）和字幕（`S`）
3. `cards.html` 改字卡文字，`cards.json` 改時間點
4. 依序輸出：字卡 PNG → 鏡頭特效 → 疊字卡 → 字幕＋音效
