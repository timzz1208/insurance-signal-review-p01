#!/usr/bin/env bash
# Full pipeline: narration -> timeline -> sound cues -> audio -> frames -> mux -> subtitles -> carousel -> QA.
set -euo pipefail
cd "$(dirname "$0")"
NAME="strengths_feedback_analysis"
FF=$(python -c "import imageio_ffmpeg as i;print(i.get_ffmpeg_exe())")
mkdir -p build output/stills output/carousel
if compgen -G "voice/full.*" >/dev/null; then python tools/split_voice.py; fi   # optional VoAI recording
python tools/tts.py                      # 1. narration + measured durations -> build/timeline.json
python tools/asr_check.py                # 2. offline ASR transcript vs script
node tools/render.js events               # 3. sound cues from the same timing code as the drawing
python tools/audio.py                    # 4. score + SFX + ducking + -15 LUFS -> build/mix.wav
node tools/render.js check && node tools/render.js video 4              # 5. every frame rendered, painted, captured
"$FF" -y -v error -f concat -safe 0 -i build/segments.txt -i build/mix.wav -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 18 -tune animation -pix_fmt yuv420p -r 30 -c:a aac -b:a 256k -ar 48000 -movflags +faststart "output/$NAME.mp4"
python tools/srt.py "output/$NAME.srt"   # 6. .srt with identical cue times
node tools/render.js cards output/carousel   # 7. 5 carousel stills, 1080x1350
python tools/qa.py "output/$NAME.mp4"    # 8. frame-by-frame QA
