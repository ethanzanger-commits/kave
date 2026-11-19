<#
Kave database migrations. Save once, use always. Run from anywhere:   .\scripts\migrate.ps1

  .\scripts\migrate.ps1                 apply every migration not yet applied (in order)
  .\scripts\migrate.ps1 -List           show applied / PENDING
  .\scripts\migrate.ps1 -DryRun         show what would run, change nothing
  .\scripts\migrate.ps1 -Only kave19    run one migration by name prefix
  .\scripts\migrate.ps1 -Baseline 18    FIRST TIME ONLY on an existing database: mark kave2..kave18 as already applied (runs nothing)
  .\scripts\migrate.ps1 -Force          re-run everything (safe: migrations are idempotent)

The database address (DATABASE_URL) is read from the environment, then .env.local, otherwise you are asked for it (typed hidden, never saved).
Use the NON-pooled / production Neon connection string. Migrations never delete data.
#>
param([switch]$List, [switch]$DryRun, [switch]$Force, [string]$Only, [int]$Baseline = 0)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Install Node 20+ from https://nodejs.org, then rerun." }
if (-not (Test-Path node_modules\@neondatabase)) { Write-Host "Installing packages (one time)..."; npm install | Out-Null }
if (-not $env:DATABASE_URL -and (Test-Path .env.local)) {
  $line = Select-String -Path .env.local -Pattern '^DATABASE_URL=(.+)$' | Select-Object -First 1
  if ($line) { $env:DATABASE_URL = $line.Matches[0].Groups[1].Value.Trim().Trim('"').Trim("'") }
}
if (-not $env:DATABASE_URL) {
  $s = Read-Host "Paste your Neon DATABASE_URL (hidden)" -AsSecureString
  $env:DATABASE_URL = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
}
$a = @()
if ($List) { $a += "--list" }
if ($DryRun) { $a += "--dry" }
if ($Force) { $a += "--force" }
if ($Only) { $a += "--only"; $a += $Only }
if ($Baseline -gt 0) { $a += "--baseline"; $a += "$Baseline" }
node scripts/migrate.mjs @a
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
