---
name: talking-head-reel
description: 把一支口播（talking-head）原始影片剪成 IG Reels／短影音：Whisper 字級轉錄、去重說與停頓、繁中字幕、動態大字卡、切鏡說明畫面、合成音效、結尾卡、封面與貼文文字。當使用者給口播影片（檔案或雲端連結）並要求剪輯、做短影音、Reels、加字幕或字卡時使用。不適用於多機位剪輯、訪談對話、純音樂影片，或只要轉錄不剪輯的需求。
---

# 口播影片 → IG Reels 剪輯

整套流程分成兩個部分：
- **AI 負責判斷**：挑段落、決定剪接點、寫字卡文案。
- **腳本負責執行**：把判斷寫成一份 `plan.json`，再交給 `scripts/build.py` 一次輸出。

**原則：每個判斷點都先給人確認，最後一定要人戴耳機驗收。** 你聽不到聲音，也看不到動態畫面，只能用截圖和數據檢查。

## 0. 環境準備（第一次使用）

```bash
bash scripts/setup.sh      # ffmpeg、faster-whisper、opencc、scipy、playwright+chromium、思源黑體
```
需要的網路：pypi、huggingface.co（下載 Whisper 模型）、npm。從 Google Drive 下載影片要 `drive.google.com`。YouTube 通常會擋雲端主機，不要用 YouTube 傳檔。

## 1. 取得素材並轉錄

```bash
gdown <Drive 檔案 ID> -O raw.mp4      # Drive 要設成「知道連結的人可檢視」
python scripts/transcribe.py raw.mp4 --workdir work --prompt "影片主題與專有名詞" [--script 稿子.txt]
```
- 輸出 `work/transcript.txt`（帶時間的逐字稿）、`work/transcript.json`（字級時間）、`work/unmatched.txt`。
- **`unmatched.txt` 一定要看**：裡面列的是「有聲音但沒轉出字」的區段，常常是被漏掉的重說。用 `--range 起 迄` 重轉那一段確認。
- 如果使用者有提供稿子，用稿子校對 Whisper 聽錯的字（例如「簡介點」其實是「剪接點」），但**時間以實際聲音為準**。拿不準的字要列出來問使用者。

## 2. 做完整版（先驗證切點）

```bash
python scripts/suggest_plan.py --workdir work --source raw.mp4 --out plan_full.json \
  --drop 94.6-99.5 --para 35.8 --fix 錯字=正字
python scripts/build.py plan_full.json
```
- `--drop`：刪掉重說的第一次（對照 `transcript.txt`；也可以參考腳本印出的 `RETAKE?` 提示）。
- `--para`：在段落開頭留比較長的停頓（約 0.75 秒）。
- 交給使用者聽，確認**剪接點和字幕**都沒問題，再進到下一步。

## 3. 規劃短影音（30 秒左右）

1. **挑段落**：選一個不靠前後文也聽得懂的完整觀點。好用的結構是「開頭的提問＋結尾的答案」，可以從長片的前後各取一段接起來。先用**文字**給使用者確認選段。
2. **字卡要少而準**。可用的類型（細節見 `references/plan-schema.md`）：
   - `hook`：開頭 3 秒，有閃白、大字砸下、RGB 錯位。配合 `opener_fx: true`，會推近鏡頭並震動。
   - `big`：重點大字。可以畫底線，也可以加一行副標並套模糊效果。
   - `strike`：劃掉錯誤做法。
   - `chips`：問號貼紙。
   - `list`：清單逐條出現。
   - `scene_timeline`、`scene_prompt`：**整個畫面切成說明圖**，聲音繼續。前者是時間軸加問號，後者是指令框打字。
   - `endcard`：結尾提問加留言 CTA。
3. **鏡頭縮放**：相鄰片段交替使用 1.0、1.08、1.18 的縮放，可以掩飾跳切。想強調的那句用最大的縮放。
4. 寫成 `plan.json`（範例：`examples/plan.example.json`）。**所有時間都填原始影片的秒數**，腳本會自動換算成成片時間。

## 4. 預覽 → 輸出

```bash
python scripts/build.py plan.json --preview 0.3,1.2,8,15      # 只輸出指定秒數的字卡截圖 -> work/preview.jpg
python scripts/build.py plan.json --cover                     # 完整輸出 + 封面
```
輸出結束後，**一定要看這些檢查結果**：
- `frames` 和 expected 要一致。不一致代表畫面有掉格或凍結。
- 響度約 −14 LUFS，峰值低於 −1 dBFS。
- `freezes`：只能出現在說明畫面的靜止段落或打字之間的空檔。如果出現在人臉段落，就是壞了。
- 看 `work/contact.jpg`：字卡不能壓到臉，文字不能超出畫面。
- 封面檢查 `work/cover_grid_check.jpg`（4:5 裁切）：標題和臉都要在裡面。

## 5. 交付

- 成片、封面、貼文文字（文案範本見 `references/caption-template.md`）。
- 檔案大小：IG 沒問題；但如果交付管道限制 30MB，要再壓縮一版。
- 告訴使用者**需要他們聽的地方**：在句子中間剪接的點、跨段落接起來的點、音效的音量，還有不確定的字幕用字。

## 規則

- 不要編造事實或數據放進字卡或封面，例如「90% 的人都…」。
- 改字卡文案時保持原意，不能替講者加新的主張。
- 音效全部用 `sfx.py` 現場合成，不要下載來源不明的音檔。
- 遇到問題先查 `references/pitfalls.md`。
