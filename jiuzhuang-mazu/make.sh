#!/usr/bin/env bash
# Full pipeline: narration -> timeline -> audio -> frames -> mux -> subtitles -> QA.
set -euo pipefail
cd "$(dirname "$0")"
FF=$(python3 -c "import imageio_ffmpeg as i;print(i.get_ffmpeg_exe())")
ls voice/full.* >/dev/null 2>&1 && python3 tools/split_voice.py   # 0. one long VoAI recording -> voice/01..NN.wav
python3 tools/tts.py                      # 1. narration (voice/ recordings if present) + measured durations -> build/timeline.json
python3 tools/asr_check.py                # 2. pronunciation check (offline ASR transcript vs script)
python3 tools/audio.py                    # 3. score + SFX + ducking + -15 LUFS -> build/mix.wav
node tools/render.js check && node tools/render.js video 4              # 4. every frame rendered, painted, then captured
# final encode at CRF 20 keeps the file under GitHub's 100 MB limit
"$FF" -y -v error -f concat -safe 0 -i build/segments.txt -i build/mix.wav -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 20 -tune animation -pix_fmt yuv420p -c:a aac -b:a 256k -movflags +faststart "output/新社九庄媽進香.mp4"
python3 tools/srt.py                      # 5. .srt with identical cue times
python3 tools/qa.py "output/新社九庄媽進香.mp4"   # 6. frame-by-frame QA
