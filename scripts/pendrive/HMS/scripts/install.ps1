# MAIN COMPUTER: installs HMS, or updates it. Safe to run again: patient data is never deleted.
# Copies the app to C:\HMS, sets up the database the first time, installs the server as a
# Windows service (always running, starts with Windows), opens the LAN port, makes a desktop shortcut.
$ErrorActionPreference = 'Stop'

$Source = Split-Path -Parent $PSScriptRoot            # <pendrive>\HMS
$Root = 'C:\HMS'
$Service = 'HMSServer'
$Port = 4100
$Node = "$Root\node\node.exe"
$Nssm = "$Root\tools\nssm.exe"
$Db = "$Root\data\app.db"

# Windows must allow the service, the firewall rule and C:\HMS: ask for administrator once.
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) {
  Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  exit
}

function Say($text, $color = 'White') { Write-Host $text -ForegroundColor $color }
function Step($text) { Say "`n== $text" 'Cyan' }
function Stop-Install($text) {
  Say "`nINSTALL STOPPED: $text" 'Red'
  Say "Nothing else was changed. Log: $Root\install-log.txt" 'Red'
  try { Stop-Transcript | Out-Null } catch {}
  Read-Host 'Press Enter to close'
  exit 1
}
function Set-ServerEnv {
  $env:PORT = "$Port"
  $env:DATABASE_URL = 'file:C:/HMS/data/app.db'
  $env:MIGRATIONS_DIR = "$Root\app\drizzle"
  $env:WEB_DIR = "$Root\app\web"
}
function Invoke-Tool {
  # Runs setup.mjs; returns $true when it succeeded.
  Set-ServerEnv
  Push-Location "$Root\app"
  try { & $Node "$Root\app\setup.mjs" @args | Out-Host; return ($LASTEXITCODE -eq 0) } finally { Pop-Location }
}

New-Item -ItemType Directory -Force -Path $Root, "$Root\data", "$Root\logs", "$Root\backups" | Out-Null
Start-Transcript -Path "$Root\install-log.txt" -Append | Out-Null
try {
  $version = (Get-Content "$Source\version.txt" -ErrorAction SilentlyContinue | Select-Object -First 1)
  Say "HMS $version" 'Green'
  if (-not (Test-Path "$Source\app\server.mjs") -or -not (Test-Path "$Source\node\node.exe")) { Stop-Install "The pendrive folder is incomplete ($Source). Copy the whole pendrive again." }
  $firstTime = -not (Test-Path $Db)

  Step 'Stopping the server (if it is running)'
  $existing = Get-Service -Name $Service -ErrorAction SilentlyContinue
  if ($existing -and $existing.Status -ne 'Stopped') { Stop-Service -Name $Service -Force; Start-Sleep -Seconds 2 }

  if (-not $firstTime) {
    Step 'Backing up the database before the update'
    # The old program files are still in place here, so this is the version that wrote the database.
    $stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
    if (-not (Invoke-Tool backup "$Root\backups\before-update-$stamp.db")) { Stop-Install 'Could not back up the database, so the update was not started.' }
  }

  Step 'Copying the program files'
  foreach ($dir in 'app', 'node', 'tools', 'scripts') {
    robocopy "$Source\$dir" "$Root\$dir" /MIR /NFL /NDL /NJH /NJS /NP /R:2 /W:2 | Out-Null
    if ($LASTEXITCODE -ge 8) { Stop-Install "Copying '$dir' failed (robocopy code $LASTEXITCODE)." }
  }
  Copy-Item "$Source\version.txt" "$Root\version.txt" -Force
  Get-ChildItem "$Source\*.bat" | Copy-Item -Destination $Root -Force

  if ($firstTime) {
    Step 'First-time setup'
    Say 'The owner signs in with a mobile number and a password.'
    Say 'The owner can add doctors, front desk, pharmacy and lab staff later under Settings.'
    while ($true) {
      $mobile = (Read-Host "Owner's mobile number (10 digits)").Trim()
      $p1 = Read-Host 'Choose a password (at least 8 characters)' -AsSecureString
      $p2 = Read-Host 'Type the password again' -AsSecureString
      $plain1 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p1))
      $plain2 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p2))
      if ($plain1 -ne $plain2) { Say 'The two passwords are not the same. Try again.' 'Yellow'; continue }
      $env:OWNER_MOBILE = $mobile
      $env:OWNER_PASSWORD = $plain1
      $ok = Invoke-Tool init "$Source\setup-data.json"
      Remove-Item Env:OWNER_PASSWORD
      if ($ok) { break }
      Say 'That did not work (see the message above). Try again.' 'Yellow'
      # A half-made database must not block the next try.
      if (Test-Path $Db) { Remove-Item "$Db*" -Force }
    }
  }

  Step 'Installing the server as a Windows service'
  if (Get-Service -Name $Service -ErrorAction SilentlyContinue) { & $Nssm remove $Service confirm | Out-Null }
  & $Nssm install $Service $Node "`"$Root\app\server.mjs`"" | Out-Null
  & $Nssm set $Service AppDirectory "$Root\app" | Out-Null
  & $Nssm set $Service DisplayName 'HMS Server' | Out-Null
  & $Nssm set $Service Description 'Hospital management system: database and web app for this hospital.' | Out-Null
  & $Nssm set $Service AppEnvironmentExtra "PORT=$Port" 'DATABASE_URL=file:C:/HMS/data/app.db' "MIGRATIONS_DIR=$Root\app\drizzle" "WEB_DIR=$Root\app\web" 'NODE_ENV=production' | Out-Null
  & $Nssm set $Service AppStdout "$Root\logs\server.log" | Out-Null
  & $Nssm set $Service AppStderr "$Root\logs\server.log" | Out-Null
  & $Nssm set $Service AppRotateFiles 1 | Out-Null
  & $Nssm set $Service AppRotateBytes 5000000 | Out-Null
  & $Nssm set $Service Start SERVICE_AUTO_START | Out-Null
  & $Nssm set $Service AppExit Default Restart | Out-Null
  & $Nssm set $Service AppRestartDelay 3000 | Out-Null

  Step 'Allowing the other computers to connect'
  if (-not (Get-NetFirewallRule -DisplayName "HMS (port $Port)" -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName "HMS (port $Port)" -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Any | Out-Null
  }

  Step 'Starting the server'
  Start-Service -Name $Service
  $up = $false
  foreach ($i in 1..40) {
    try { if ((Invoke-RestMethod "http://localhost:$Port/api/health" -TimeoutSec 8).ok) { $up = $true; break } } catch { Start-Sleep -Milliseconds 1500 }
  }
  if (-not $up) { Stop-Install "The server did not start. Look at $Root\logs\server.log" }

  Step 'Making the desktop shortcut'
  $desktop = [Environment]::GetFolderPath('CommonDesktopDirectory')
  Set-Content -Path "$desktop\HMS.url" -Value "[InternetShortcut]`r`nURL=http://localhost:$Port/`r`n" -Encoding ASCII

  $ips = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' }).IPAddress
  Say "`nDONE" 'Green'
  Say "On this computer: open 'HMS' on the desktop (http://localhost:$Port)." 'Green'
  Say 'On the other computers (same Wi-Fi/LAN), open a browser and go to:' 'Green'
  Say "    http://$($env:COMPUTERNAME):$Port" 'Green'
  foreach ($ip in $ips) { Say "    http://${ip}:$Port" 'Green' }
  Say "or run '2 - OTHER COMPUTER (add shortcut).bat' from the pendrive on each of them."
  if ($firstTime) { Say "`nSign in with the owner's mobile number and the password you just chose." }
} catch {
  Stop-Install $_.Exception.Message
}
try { Stop-Transcript | Out-Null } catch {}
Read-Host "`nPress Enter to close"
