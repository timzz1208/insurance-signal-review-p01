#!/usr/bin/env bash
# Full pipeline: narration -> timeline -> sound cues -> audio -> frames -> mux -> subtitles -> carousel -> QA.
set -euo pipefail
cd "$(dirname "$0")"
NAME="健保破兆_Reels"
FF=$(python3 -c "import imageio_ffmpeg as i;print(i.get_ffmpeg_exe())")
mkdir -p build output/stills output/carousel
ls voice/full.* >/dev/null 2>&1 && python3 tools/split_voice.py   # 0. one long VoAI recording -> voice/01..13.wav
python3 tools/tts.py                      # 1. narration + measured durations -> build/timeline.json
python3 tools/asr_check.py                # 2. offline ASR transcript vs script
node tools/render.js events               # 3. sound cues from the same timing code as the drawing
python3 tools/audio.py                    # 4. score + SFX + ducking + -15 LUFS -> build/mix.wav
node tools/render.js check && node tools/render.js video 4              # 5. every frame rendered, painted, captured
"$FF" -y -v error -f concat -safe 0 -i build/segments.txt -i build/mix.wav -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 18 -tune animation -pix_fmt yuv420p -r 30 -c:a aac -b:a 256k -ar 48000 -movflags +faststart "output/$NAME.mp4"
python3 tools/srt.py "output/$NAME.srt"   # 6. .srt with identical cue times
node tools/render.js cards output/carousel   # 7. 5 carousel stills, 1080x1350
python3 tools/qa.py "output/$NAME.mp4"    # 8. frame-by-frame QA
