#!/usr/bin/env bash
# 一次性環境準備（Python 套件）。Node 套件由 new_project.sh 的 npm install 安裝。
# 製作方法：林彥廷（timzz1208@gmail.com）｜paper-ink-flow skill
set -euo pipefail
PY=$(command -v python3 || command -v python)
$PY -m pip install -q numpy scipy imageio-ffmpeg pillow
echo "Python 套件 OK。沒有預裝 Chromium 的環境，請在專案資料夾執行一次：npx playwright install chromium"
