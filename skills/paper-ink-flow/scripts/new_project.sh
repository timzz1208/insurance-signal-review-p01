#!/usr/bin/env bash
# 從範本建立新專案：bash scripts/new_project.sh <目標資料夾> <輸出檔名>
# 製作方法：林彥廷（timzz1208@gmail.com）｜paper-ink-flow skill
set -euo pipefail
[ $# -eq 2 ] || { echo "用法：$0 <目標資料夾> <輸出檔名>"; exit 1; }
SKILL="$(cd "$(dirname "$0")/.." && pwd)"; T="$1"; NAME="$2"
[ -e "$T" ] && { echo "$T 已存在，不覆蓋"; exit 1; }
cp -r "$SKILL/templates/project" "$T"
sed -i "s/__NAME__/$NAME/" "$T/make.sh"
cp "$SKILL/references/storyboard-template.md" "$T/STORYBOARD.md"
chmod +x "$T/make.sh"
( cd "$T" && npm install --silent )
echo "已建立 $T"
echo "下一步：填 STORYBOARD.md → 旁白存成 voice/narration.wav → node render.js --frames 0.3,2.5,9,15 → bash make.sh"
