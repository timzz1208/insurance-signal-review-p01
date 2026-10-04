#!/usr/bin/env bash
# One-time environment setup for talking-head-reel. Safe to re-run.
set -e
need_sudo(){ if [ "$(id -u)" = 0 ]; then "$@"; else sudo "$@"; fi; }
if ! command -v ffmpeg >/dev/null; then
  if command -v apt-get >/dev/null; then need_sudo apt-get update -q && need_sudo apt-get install -y -q ffmpeg
  elif command -v brew >/dev/null; then brew install ffmpeg
  else echo "請先安裝 ffmpeg"; exit 1; fi
fi
# 思源黑體（Noto Sans CJK TC，含 Black 字重）
if ! fc-list 2>/dev/null | grep -q "Noto Sans CJK TC:style=Black"; then
  if command -v apt-get >/dev/null; then need_sudo apt-get install -y -q fonts-noto-cjk fonts-noto-cjk-extra
  else echo "請安裝 Noto Sans TC / Noto Sans CJK TC（Google Fonts），需包含 Black 字重"; fi
fi
python3 -m pip install -q faster-whisper opencc-python-reimplemented scipy numpy gdown
python3 -m pip install -q --use-pep517 jieba   # 字幕斷行用；--use-pep517 避免舊 setuptools 編譯失敗
# Playwright + Chromium（若已有 Chromium，可設 CHROMIUM_PATH 跳過下載）
if ! node -e "require('playwright')" 2>/dev/null && ! node -e "require(require('child_process').execSync('npm root -g').toString().trim()+'/playwright')" 2>/dev/null; then
  npm install -g playwright
fi
if [ -z "$CHROMIUM_PATH" ] && [ -z "$PLAYWRIGHT_BROWSERS_PATH" ]; then npx playwright install chromium; fi
echo "setup ok"
