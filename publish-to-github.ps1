# 在保留 GitHub 历史的前提下，把当前文件夹追加成新版本。
# 用法：在能看到 index.html 和 shengtian-tu 的这一层运行。
# 可带标签：.\publish-to-github.ps1 v3
# 不要加 --force，否则会抹掉仓库里已经存着的旧提交。

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

git config user.name "mii22128"
git config user.email "mii22128@users.noreply.github.com"

if (Test-Path -LiteralPath ".\Yinhunlu\shengtian-tu\index.html") {
  Write-Host "检测到多套了一层 Yinhunlu 文件夹，正在摊平到仓库根目录..."
  Get-ChildItem -LiteralPath ".\Yinhunlu" -Force | ForEach-Object {
    $dest = Join-Path (Get-Location) $_.Name
    if (Test-Path -LiteralPath $dest) { Remove-Item -LiteralPath $dest -Recurse -Force }
    Move-Item -LiteralPath $_.FullName -Destination $dest
  }
  Remove-Item -LiteralPath ".\Yinhunlu" -Recurse -Force -ErrorAction SilentlyContinue
}

if (-not (Test-Path -LiteralPath ".\shengtian-tu\index.html")) {
  Write-Host "找不到 shengtian-tu\\index.html。请先打开解压后的项目根目录再运行。"
  exit 1
}

$repoUrl = "https://github.com/mii22128/Yinhunlu.git"
$tagName = if ($args.Count -ge 1 -and $args[0]) { [string]$args[0] } else { Get-Date -Format "'v'yyyyMMdd-HHmm" }
$staging = Join-Path $env:TEMP "yinhunlu-release"

Write-Host "正在克隆现有仓库，以便把新文件接在旧提交后面..."
if (Test-Path -LiteralPath $staging) { Remove-Item -LiteralPath $staging -Recurse -Force }
git clone --branch main $repoUrl $staging

Get-ChildItem -LiteralPath (Get-Location) -Force | Where-Object { $_.Name -ne ".git" } | ForEach-Object {
  $dest = Join-Path $staging $_.Name
  if (Test-Path -LiteralPath $dest) { Remove-Item -LiteralPath $dest -Recurse -Force }
  Copy-Item -LiteralPath $_.FullName -Destination $dest -Recurse -Force
}

Set-Location -LiteralPath $staging
git add -A
git status

$pending = git status --porcelain
if (-not $pending) {
  Write-Host "和仓库里已有文件相同，没有新的改动可提交。"
  exit 0
}

git commit -m "Release $tagName"
if (git rev-parse $tagName 2>$null) {
  Write-Host "标签 $tagName 已存在，改用时间标签。"
  $tagName = Get-Date -Format "'v'yyyyMMdd-HHmm"
}
git tag -a $tagName -m $tagName
git push origin main
git push origin $tagName

Write-Host ""
Write-Host "已追加新版本，没有覆盖旧提交。"
Write-Host "仓库：https://github.com/mii22128/Yinhunlu"
Write-Host "本版标签：$tagName"
Write-Host "在仓库页 Releases → Draft a new release，选这个标签，即可把这一版 zip 长期挂出来。"
Write-Host "网页：https://mii22128.github.io/Yinhunlu/shengtian-tu/"
