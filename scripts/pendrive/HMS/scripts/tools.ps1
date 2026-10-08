# Support tools for the main computer (run through the .bat files in C:\HMS).
#   tools.ps1 backup           copy the database to this pendrive/drive (or to C:\HMS\backups)
#   tools.ps1 reset-password   set a new password for one account
#   tools.ps1 check            is everything running?
param([Parameter(Mandatory)][ValidateSet('backup', 'reset-password', 'check')][string]$Action)
$ErrorActionPreference = 'Stop'
$Root = 'C:\HMS'
$Port = 4100
$Node = "$Root\node\node.exe"

function Invoke-Tool {
  $env:PORT = "$Port"
  $env:DATABASE_URL = 'file:C:/HMS/data/app.db'
  $env:MIGRATIONS_DIR = "$Root\app\drizzle"
  $env:WEB_DIR = "$Root\app\web"
  Push-Location "$Root\app"
  try { & $Node "$Root\app\setup.mjs" @args | Out-Host; return ($LASTEXITCODE -eq 0) } finally { Pop-Location }
}

if ($Action -eq 'backup') {
  # Prefer a pendrive if one is plugged in; otherwise keep the copy on this computer.
  $usb = Get-Volume | Where-Object { $_.DriveType -eq 'Removable' -and $_.DriveLetter } | Select-Object -First 1
  $folder = if ($usb) { "$($usb.DriveLetter):\HMS-Backup" } else { "$Root\backups" }
  New-Item -ItemType Directory -Force -Path $folder | Out-Null
  $file = "$folder\hms-$(Get-Date -Format 'yyyy-MM-dd_HHmm').db"
  if (Invoke-Tool backup $file) { Write-Host "`nDONE. Backup saved: $file" -ForegroundColor Green } else { Write-Host "`nBACKUP FAILED." -ForegroundColor Red }
}

if ($Action -eq 'reset-password') {
  $mobile = (Read-Host 'Mobile number of the account').Trim()
  $password = Read-Host 'New password (at least 8 characters)'
  if (Invoke-Tool reset-password $mobile $password) { Write-Host "`nDONE. They can sign in with the new password now." -ForegroundColor Green } else { Write-Host "`nNOT CHANGED (see the message above)." -ForegroundColor Red }
}

if ($Action -eq 'check') {
  $svc = Get-Service -Name 'HMSServer' -ErrorAction SilentlyContinue
  $ok = $true
  function Line($pass, $text) { if ($pass) { Write-Host "PASS  $text" -ForegroundColor Green } else { Write-Host "FAIL  $text" -ForegroundColor Red; $script:ok = $false } }
  Line ($null -ne $svc) 'The HMS server is installed as a Windows service'
  Line ($svc -and $svc.Status -eq 'Running') 'The service is running'
  $health = $false
  try { $health = (Invoke-RestMethod "http://localhost:$Port/api/health" -TimeoutSec 5).ok } catch {}
  Line $health "The app answers on http://localhost:$Port"
  Line (Test-Path "$Root\data\app.db") 'The database file exists'
  Line ($null -ne (Get-NetFirewallRule -DisplayName "HMS (port $Port)" -ErrorAction SilentlyContinue)) 'Other computers are allowed through the firewall'
  Write-Host "Version: $(Get-Content "$Root\version.txt" -ErrorAction SilentlyContinue | Select-Object -First 1)"
  Write-Host "Other computers open:  http://$($env:COMPUTERNAME):$Port"
  if (-not $ok) { Write-Host "`nSomething is wrong. Log: $Root\logs\server.log" -ForegroundColor Yellow }
}
Read-Host "`nPress Enter to close"
