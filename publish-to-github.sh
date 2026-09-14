#!/usr/bin/env bash
# 把当前工程追加到 github.com/mii22128/Yinhunlu，并打标签（默认 v3）。
# 用法：./publish-to-github.sh v3
set -euo pipefail
cd "$(dirname "$0")"

TAG="${1:-v3}"
REPO_URL="https://github.com/mii22128/Yinhunlu.git"
STAGING="${TMPDIR:-/tmp}/yinhunlu-release"

if [[ ! -f shengtian-tu/index.html ]]; then
  echo "找不到 shengtian-tu/index.html"
  exit 1
fi

rm -rf "$STAGING"
git clone --branch main "$REPO_URL" "$STAGING"

while IFS= read -r -d '' item; do
  name="$(basename "$item")"
  [[ "$name" == ".git" ]] && continue
  rm -rf "$STAGING/$name"
  cp -a "$item" "$STAGING/$name"
done < <(find "$(pwd)" -mindepth 1 -maxdepth 1 -print0)

cd "$STAGING"
git add -A
if git diff --cached --quiet; then
  echo "没有新的改动可提交。"
  exit 0
fi

git commit -m "Release $TAG"
if git rev-parse "$TAG" >/dev/null 2>&1; then
  TAG="v3-$(date +%Y%m%d-%H%M)"
  echo "标签已存在，改用 $TAG"
fi
git tag -a "$TAG" -m "$TAG"
git push origin main
git push origin "$TAG"

echo "仓库：https://github.com/mii22128/Yinhunlu"
echo "网页：https://mii22128.github.io/Yinhunlu/shengtian-tu/"
echo "标签：$TAG"
