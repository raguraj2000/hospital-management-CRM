# Support tools for the main computer (run through the .bat files in C:\HMS).
#   tools.ps1 backup           copy the database to this pendrive/drive (or to C:\HMS\backups)
#   tools.ps1 reset-password   set a new password for one account
#   tools.ps1 check            is everything running?
#   tools.ps1 start-fresh      clear the patient data, keep the setup (a backup is made first). Only ever run by hand.
param([Parameter(Mandatory)][ValidateSet('backup', 'reset-password', 'check', 'start-fresh')][string]$Action)
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

if ($Action -eq 'start-fresh') {
  Write-Host ''
  Write-Host 'START FRESH - clears the patient data so the hospital begins again with empty lists.' -ForegroundColor Yellow
  Write-Host '(Updating HMS never does this. It happens only here, when you choose it.)'
  Write-Host ''
  Write-Host 'REMOVED: every OP visit, prescription, lab order and result, bill, payment,'
  Write-Host '         pharmacy sale and the history log. Token and bill numbers start again from 1.'
  Write-Host '         Patients too, unless you choose to keep them below.'
  Write-Host 'KEPT:    staff and their passwords, lab tests and prices, medicines and prices,'
  Write-Host '         vendors, bookmarks, the consultation fee and the print header.'
  Write-Host ''
  Write-Host 'A full backup is saved first. This cannot be undone except by restoring that backup.' -ForegroundColor Yellow
  Write-Host ''
  $stock = ''
  while ($stock -notin 'K', 'C') { $stock = (Read-Host 'Medicine STOCK and purchase bills entered so far: type K to KEEP them, C to CLEAR them').Trim().ToUpper() }
  $people = ''
  while ($people -notin 'K', 'C') { $people = (Read-Host 'PATIENTS registered so far (name, phone, UHID): type K to KEEP them, C to CLEAR them').Trim().ToUpper() }
  $typed = (Read-Host 'To go ahead type  START FRESH  (anything else cancels)').Trim()
  if ($typed -cne 'START FRESH') {
    Write-Host "`nCANCELLED. Nothing was changed." -ForegroundColor Green
  } else {
    New-Item -ItemType Directory -Force -Path "$Root\backups" | Out-Null
    $backup = "$Root\backups\before-start-fresh-$(Get-Date -Format 'yyyy-MM-dd_HHmm').db"
    if (-not (Invoke-Tool backup $backup) -or -not (Test-Path $backup)) {
      Write-Host "`nSTOPPED: the backup could not be made, so nothing was changed." -ForegroundColor Red
    } else {
      # Nobody may be working while the data is cleared.
      $svc = Get-Service -Name 'HMSServer' -ErrorAction SilentlyContinue
      if ($svc -and $svc.Status -ne 'Stopped') { Stop-Service -Name 'HMSServer' -Force; Start-Sleep -Seconds 2 }
      $mode = if ($stock -eq 'K') { 'keep-stock' } else { 'clear-stock' }
      $done = if ($people -eq 'K') { Invoke-Tool start-fresh $mode keep-patients } else { Invoke-Tool start-fresh $mode }
      if ($svc) { Start-Service -Name 'HMSServer' }
      if ($done) {
        Write-Host "`nDONE. The hospital starts fresh. Everyone signs in again with the same password." -ForegroundColor Green
        Write-Host "The data from before is in: $backup"
        Write-Host '(To get it back: sign in as the owner, Settings, Restore, and choose that file.)'
      } else {
        Write-Host "`nNOT DONE (see the message above). Nothing was changed. The backup is in: $backup" -ForegroundColor Red
      }
    }
  }
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
