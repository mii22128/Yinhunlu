#!/usr/bin/env bash
# 生成仓库根目录的 Yinhunlu.zip（不含 .git 与既有压缩包）。
set -euo pipefail
cd "$(dirname "$0")"
OUT="$(pwd)/Yinhunlu.zip"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

cp -a . "$STAGE/src"
rm -rf "$STAGE/src/.git" "$STAGE/src/dist-minitool"
find "$STAGE/src" -name '*.zip' -delete
rm -rf "$STAGE/src/.claude"
rm -f "$STAGE/src/download.html" "$STAGE/src/shengtian-tu/download.html"

rm -f "$OUT"
(
  cd "$STAGE/src"
  zip -r -q "$OUT" .
)

echo "已写入 $OUT （$(du -h "$OUT" | cut -f1)）"
cp -f "$OUT" "$(pwd)/Yinhunlu-v3.zip"
echo "已同步 $(pwd)/Yinhunlu-v3.zip"
