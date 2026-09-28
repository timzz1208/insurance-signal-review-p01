param([int]$Workers = 4, [switch]$ReuseVoice)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$env:PYTHONUTF8 = '1'
$env:MODELS_DIR = 'C:/Users/Public/hermes_models'
$env:CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
if (Test-Path 'build/venv/Scripts/python.exe') { $env:PATH = "$PSScriptRoot\build\venv\Scripts;$env:PATH" }
New-Item -ItemType Directory -Force output/qa | Out-Null
function Run-Step([string]$Name, [scriptblock]$Action) {
    & $Action 2>&1 | Tee-Object "output/qa/$Name.txt"
    if ($LASTEXITCODE -ne 0) { throw "$Name failed with exit $LASTEXITCODE" }
}
if (-not $ReuseVoice) { Run-Step 'tts' { python tools/tts.py } }
Run-Step 'asr' { python tools/asr_check.py }
Run-Step 'events' { node tools/render.js events }
Run-Step 'audio' { python tools/audio.py }
Run-Step 'layout' { node tools/render.js layout }
Run-Step 'render_check' { node tools/render.js check }
Run-Step 'render_video' { node tools/render.js video $Workers }
$ff = python -c 'import imageio_ffmpeg as i;print(i.get_ffmpeg_exe())'
Run-Step 'mux' { & $ff -y -v error -f concat -safe 0 -i build/segments.txt -i build/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart output/strengths_feedback_analysis.mp4 }
Run-Step 'srt' { python tools/srt.py output/strengths_feedback_analysis.srt }
Run-Step 'cards' { node tools/render.js cards output/carousel }
Run-Step 'contact_sheet' { python tools/sheet.py output/carousel output/carousel/00_contact_sheet.png 5 }
Run-Step 'video_qa' { python tools/qa.py output/strengths_feedback_analysis.mp4 }
Run-Step 'artifacts' { python tools/verify_output.py }
Run-Step 'stills' { python tools/event_frames.py }
Run-Step 'seconds' { python tools/review_frames.py output/strengths_feedback_analysis.mp4 output/review_seconds }
Run-Step 'loudness' { & $ff -hide_banner -i output/strengths_feedback_analysis.mp4 -filter_complex ebur128=peak=true -f null - }
Write-Host 'Technical checks finished. Inspect the decoded event sheets; listening and IG preview remain manual.'
