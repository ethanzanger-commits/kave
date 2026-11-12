$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "Install Git first: winget install Git.Git" }
if (-not (Test-Path .git)) { git init -b main }
git add -A
git commit -m "kave beta"
if (Get-Command gh -ErrorAction SilentlyContinue) { gh repo create kave --public --source . --push }
else { Write-Host "Install GitHub CLI (winget install GitHub.cli), run 'gh auth login', then rerun. Or make an empty repo on github.com and run: git remote add origin <url>; git push -u origin main" }
