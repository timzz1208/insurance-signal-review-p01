#!/usr/bin/env bash
# Create a new Reels project from the template.
# Usage: bash scripts/new_project.sh <target_dir> <output_name>
#   e.g. bash scripts/new_project.sh ~/repo/my-topic 我的主題_Reels
# Then edit script.json, render/scenes.js (scenes + EVENTS + SOURCES), tools/audio.py (score section),
# and HANDLE / SERIES in render/main.js.
set -euo pipefail
[ $# -eq 2 ] || { echo "usage: $0 <target_dir> <output_name>"; exit 1; }
SKILL="$(cd "$(dirname "$0")/.." && pwd)"; T="$1"; NAME="$2"
[ -e "$T" ] && { echo "$T already exists; refusing to overwrite"; exit 1; }
cp -r "$SKILL/template" "$T"
sed -i "s/__NAME__/$NAME/" "$T/make.sh"
mkdir -p "$T/output/stills" "$T/output/carousel" "$T/output/review" "$T/build"
chmod +x "$T/make.sh"
( cd "$T" && npm install --silent )   # playwright 1.56.1 (matches the preinstalled chromium-1194) + Iansui font
echo "created $T  ->  next: edit script.json, then: cd $T && python3 tools/tts.py && node tools/render.js check"
