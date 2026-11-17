$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Install Node 20+ from https://nodejs.org, then rerun." }
if (-not (Test-Path .env.local)) {
  Copy-Item .env.example .env.local
  $b = New-Object byte[] 32
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
  $secret = [Convert]::ToBase64String($b)
  (Get-Content .env.local) -replace '^AUTH_SECRET=.*', "AUTH_SECRET=$secret" | Set-Content .env.local
  Write-Host "Created .env.local with a fresh AUTH_SECRET."
}
npm install
if (Select-String -Path .env.local -Pattern '^DATABASE_URL=.+' -Quiet) { npx drizzle-kit push }
else { Write-Host "Add DATABASE_URL (Neon) and your provider keys to .env.local, then run: npm run db:push" }
Write-Host "Start it with: npm run dev  (http://localhost:3000)"
