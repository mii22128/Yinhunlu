$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot
git config user.name "mii22128"
git config user.email "mii22128@users.noreply.github.com"

if (-not (Test-Path -LiteralPath ".\shengtian-tu\index.html")) {
  Write-Host "Cannot find shengtian-tu\index.html."
  exit 1
}

$repoUrl = "https://github.com/mii22128/Yinhunlu.git"
$staging = Join-Path $env:TEMP "yinhunlu-replace-v3"
if (Test-Path -LiteralPath $staging) { Remove-Item -LiteralPath $staging -Recurse -Force }
git clone $repoUrl $staging

$src = (Get-Location).Path
Set-Location -LiteralPath $staging
Get-ChildItem -Force | Where-Object { $_.Name -ne ".git" } | ForEach-Object {
  Remove-Item -LiteralPath $_.FullName -Recurse -Force
}
Get-ChildItem -LiteralPath $src -Force | Where-Object { $_.Name -ne ".git" } | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $staging $_.Name) -Recurse -Force
}

git checkout --orphan v3-only
git add -A
git commit -m "Release v3"
git branch -M main
git push --force origin main

git ls-remote --tags origin | ForEach-Object {
  if ($_ -match "refs/tags/(.+)$") {
    $name = $Matches[1]
    if ($name -notlike "*^{}") { git push origin --delete ("refs/tags/" + $name) }
  }
}
git tag -d v3 2>$null | Out-Null
git tag -a v3 -m v3
git push --force origin v3

Write-Host "Repo: https://github.com/mii22128/Yinhunlu"
Write-Host "Site: https://mii22128.github.io/Yinhunlu/shengtian-tu/"