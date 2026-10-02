#!/usr/bin/env bash
# 完整流程：無聲影片 → 音效＋配樂（＋旁白混音）→ 合成 → 檢查
# 製作方法：林彥廷（timzz1208@gmail.com）｜paper-ink-flow skill
set -euo pipefail
cd "$(dirname "$0")"
NAME="${NAME:-__NAME__}"
PY=$(command -v python3 || command -v python)
FF=${FFMPEG:-$($PY -c "import imageio_ffmpeg as i;print(i.get_ffmpeg_exe())" 2>/dev/null || echo ffmpeg)}
mkdir -p build output
node render.js --out build/silent.mp4 "$@"                                   # 1. 逐格輸出畫面（無聲）
if [ -f voice/narration.wav ]; then                                          # 2. 音效＋配樂；有旁白就一起混
  $PY sound.py build/sfx.wav --voice voice/narration.wav --mix build/mix.wav
  AUDIO=build/mix.wav
else
  echo "（voice/narration.wav 不存在：先只做音效＋配樂）"; $PY sound.py build/sfx.wav; AUDIO=build/sfx.wav
fi
"$FF" -y -v error -i build/silent.mp4 -i "$AUDIO" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "output/$NAME.mp4"
$PY tools/check.py "output/$NAME.mp4"                                         # 3. 規格與音量檢查
