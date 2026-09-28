#!/usr/bin/env bash
# One-time environment setup: Python packages + offline models (placeholder TTS, ASR for proof-listening).
# Usage: bash scripts/setup_env.sh            (models go to $MODELS_DIR, default /tmp/claude-0/models)
set -euo pipefail
pip install -q numpy scipy soundfile pyloudnorm imageio-ffmpeg pillow sherpa-onnx opencc-python-reimplemented
M="${MODELS_DIR:-/tmp/claude-0/models}"; mkdir -p "$M"; cd "$M"
get() { [ -d "$2" ] && { echo "have $2"; return; }; curl -sSL -m 900 -o x.tar.bz2 "$1" && tar xjf x.tar.bz2 && rm -f x.tar.bz2 && echo "got $2"; }
get https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-multi-lang-v1_1.tar.bz2 kokoro-multi-lang-v1_1
get https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-paraformer-zh-small-2024-03-09.tar.bz2 sherpa-onnx-paraformer-zh-small-2024-03-09
echo "models in $M  (export MODELS_DIR=$M if you changed it)"
