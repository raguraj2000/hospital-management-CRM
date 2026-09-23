<#
.SYNOPSIS
  Deploys the server (built dist/ + full migrations/) from this dev repo to
  the production install at C:\Aadhi Hospital, then restarts the
  ClinicSystemServer Windows service so the new code and any pending
  migrations take effect.

  Replaces ad-hoc "copy a few files by hand" deploys, which is how
  migrations 0006 and 0007 were silently left out of production while 0008
  made it in -- a selective copy has no way to notice a missing file, a
  full directory mirror does.

  MUST be run as Administrator (service restart requires it).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\deploy-to-main-computer.ps1
#>

$ErrorActionPreference = "Stop"

# DEVELOPER PC ONLY. This syncs the dev repo into an install that already
# exists on the SAME computer. It is not an installer -- for a new clinic
# computer use the pendrive package + "Install Main Computer.bat".
$devRoot = Split-Path -Parent $PSScriptRoot
if ($devRoot.TrimEnd('\') -eq "C:\Aadhi Hospital" -or -not (Test-Path (Join-Path $devRoot "apps\client"))) {
    Write-Host "This is a developer-only update script and must not be run on the clinic computers." -ForegroundColor Red
    Write-Host "To install: run 'C:\Aadhi Hospital\Install Main Computer.bat' (see README.md)." -ForegroundColor Yellow
    exit 1
}
if (-not (Get-Service -Name "ClinicSystemServer" -ErrorAction SilentlyContinue)) {
    Write-Host "The ClinicSystemServer service is not installed on this computer, so there is nothing to update." -ForegroundColor Red
    Write-Host "For a first-time install, run 'C:\Aadhi Hospital\Install Main Computer.bat' (see README.md)." -ForegroundColor Yellow
    exit 1
}

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "This script must be run as Administrator (service restart needs it). Right-click PowerShell -> Run as administrator, then re-run." -ForegroundColor Red
    exit 1
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$serverDir = Join-Path $repoRoot "apps\server"
$prodRoot = "C:\Aadhi Hospital"
$prodServerDir = Join-Path $prodRoot "apps\server"

if (-not (Test-Path $prodServerDir)) {
    Write-Host "Production server directory not found at $prodServerDir -- is this the right machine?" -ForegroundColor Red
    exit 1
}

Write-Host "== Deploying clinic-system server to $prodServerDir ==" -ForegroundColor Cyan

Write-Host "`nBuilding server..." -ForegroundColor Cyan
Push-Location $repoRoot
npm run build:server
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "build failed" }
Pop-Location

# Mirror (not selective copy): removes files in the destination that no
# longer exist in source too, so dist/ and migrations/ never drift out of
# sync with what's actually in the repo.
Write-Host "`nSyncing dist/..." -ForegroundColor Cyan
robocopy "$serverDir\dist" "$prodServerDir\dist" /MIR /NFL /NDL /NJH | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy dist failed (exit $LASTEXITCODE)" }

Write-Host "Syncing migrations/..." -ForegroundColor Cyan
robocopy "$serverDir\migrations" "$prodServerDir\migrations" /MIR /NFL /NDL /NJH | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy migrations failed (exit $LASTEXITCODE)" }

$srcCount = (Get-ChildItem "$serverDir\migrations" -Filter "*.sql").Count
$dstCount = (Get-ChildItem "$prodServerDir\migrations" -Filter "*.sql").Count
if ($srcCount -ne $dstCount) {
    throw "Migration file count mismatch after sync: source has $srcCount, production has $dstCount"
}
Write-Host "Migrations in sync: $dstCount files." -ForegroundColor Green

Write-Host "`nRestarting ClinicSystemServer..." -ForegroundColor Cyan
net stop ClinicSystemServer | Out-Null
net start ClinicSystemServer | Out-Null

Start-Sleep -Seconds 2
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 5
    Write-Host "`nSUCCESS -- server is back up: $($health | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "`nService restarted but health check failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Check $prodServerDir\service-stderr.log" -ForegroundColor Red
    exit 1
}

# Sanity check: the applied-migrations count in the DB should match the
# number of migration files now on disk. A mismatch here means a migration
# failed silently or the DB is pointed somewhere unexpected.
node -e "
const Database = require('$($prodRoot -replace '\\','/')/node_modules/better-sqlite3');
const db = new Database('$($prodServerDir -replace '\\','/')/data/clinic.db');
const applied = db.prepare('SELECT COUNT(*) as c FROM _migrations').get().c;
const onDisk = $dstCount;
if (applied !== onDisk) {
  console.error('MISMATCH: ' + applied + ' migrations applied vs ' + onDisk + ' files on disk');
  process.exit(1);
}
console.log('Migrations applied: ' + applied + '/' + onDisk + ' -- in sync.');
"
