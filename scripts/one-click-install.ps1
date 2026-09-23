<#
.SYNOPSIS
  ONE-CLICK install of the MAIN computer, run from the pendrive (no internet).
  Started by "1 - MAIN COMPUTER (install or update).bat" at the pendrive root.

  1. Node.js     -- installs the pendrive's version silently if missing
  2. Copy        -- pendrive "Aadhi Hospital" -> C:\Aadhi Hospital
                    (never deletes anything, so existing patient data is kept)
  3. Server      -- runs setup-main-computer.ps1 (build, database, service, firewall)
  4. WebView2    -- installs the offline runtime silently if missing
  5. Desktop app -- installs silently, adds a desktop shortcut
  6. Check       -- runs verify-install.ps1

  Safe to run again (e.g. for an update). Log: C:\Aadhi Hospital\install-log.txt
#>

param([switch]$Relaunched)

$ErrorActionPreference = "Stop"
$Target = "C:\Aadhi Hospital"
$ServiceName = "ClinicSystemServer"

$pkgSource = Split-Path -Parent $PSScriptRoot       # <pendrive>\Aadhi Hospital
$pendrive = Split-Path -Parent $pkgSource           # <pendrive>\
$installers = Join-Path $pendrive "Installers"
$tempLog = Join-Path $env:TEMP "AadhiHospital-install.log"

function Finish([int]$Code) {
    try { Stop-Transcript | Out-Null } catch { }
    if (Test-Path $Target) { Copy-Item $tempLog (Join-Path $Target "install-log.txt") -Force -ErrorAction SilentlyContinue }
    if ($Relaunched) { Write-Host ""; Read-Host "Press Enter to close this window" | Out-Null }
    exit $Code
}

function Fail([string]$Message) {
    Write-Host ""
    Write-Host "INSTALL STOPPED: $Message" -ForegroundColor Red
    Write-Host "Fix the problem above, then double-click '1 - MAIN COMPUTER (install or update).bat' again. Running it again is safe." -ForegroundColor Yellow
    # Defensive: if this failure came after Stop-Server ran (e.g. the update
    # was aborted partway through), make sure the clinic isn't left offline.
    # Harmless if the server was never stopped, or isn't installed yet.
    try {
        $n = @((Join-Path $Target "tools\nssm.exe"), (Join-Path $pkgSource "tools\nssm.exe")) | Where-Object { Test-Path $_ } | Select-Object -First 1
        if ($n -and (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue)) {
            & $n start $ServiceName 2>&1 | Out-Null
            Start-Sleep -Seconds 2
            $ok = $false
            try { $ok = (Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 3).ok } catch { }
            if ($ok) { Write-Host "(The server is still running -- the clinic can keep working while this is fixed.)" -ForegroundColor Cyan }
        }
    } catch { }
    Finish 1
}

function Step([string]$Text) { Write-Host ""; Write-Host "=== $Text ===" -ForegroundColor Cyan }

# --- Elevation: ask once, then everything runs as Administrator -------------
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Windows will ask for permission -- click Yes." -ForegroundColor Yellow
    try {
        $child = Start-Process powershell.exe -Verb RunAs -Wait -PassThru -ArgumentList @(
            "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$PSCommandPath`"", "-Relaunched"
        )
    } catch {
        Write-Host "Install cancelled (permission was not given). Run it again and click Yes." -ForegroundColor Red
        exit 1
    }
    exit $child.ExitCode
}

Start-Transcript -Path $tempLog -Force | Out-Null
Write-Host "== Aadhi Hospital: one-click install (main computer) ==" -ForegroundColor Cyan
Write-Host "Installing from: $pendrive"

if ($pkgSource.TrimEnd('\') -eq $Target) {
    Fail "Run '1 - MAIN COMPUTER (install or update).bat' from the PENDRIVE, not from C:\Aadhi Hospital."
}
foreach ($f in @("package.json", "node_modules", "apps\server\migrations", "scripts\setup-main-computer.ps1", "tools\nssm.exe", "node-version.txt")) {
    if (-not (Test-Path (Join-Path $pkgSource $f))) { Fail "The pendrive is incomplete: '$f' is missing from '$pkgSource'." }
}
$nodeWanted = (Get-Content (Join-Path $pkgSource "node-version.txt") -Raw).Trim()
$nodeMsi = Join-Path $installers "node-$nodeWanted-x64.msi"
$appSetup = Get-ChildItem $installers -Filter "Aadhi Hospital_*_x64-setup.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
$webviewSetup = Join-Path $installers "MicrosoftEdgeWebView2-x64-offline.exe"
if (-not (Test-Path $nodeMsi)) { Fail "Installers\node-$nodeWanted-x64.msi is missing from the pendrive." }
if (-not $appSetup) { Fail "The desktop app installer (Installers\Aadhi Hospital_..._x64-setup.exe) is missing from the pendrive." }

function Update-PathFromRegistry {
    $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
}

# --- 1. Node.js -------------------------------------------------------------
Step "1/6  Node.js"
Update-PathFromRegistry
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
    $have = (& $nodeCmd.Source --version).Trim()
    if ($have.TrimStart('v').Split('.')[0] -ne $nodeWanted.TrimStart('v').Split('.')[0]) {
        Fail "This computer has Node.js $have, but Aadhi Hospital needs $nodeWanted. Uninstall Node.js (Settings > Apps > Node.js > Uninstall), then run this again."
    }
    Write-Host "Already installed: $have" -ForegroundColor Green
} else {
    Write-Host "Not installed -- installing Node.js $nodeWanted from the pendrive (about 1 minute)..."
    $msiLog = Join-Path $env:TEMP "AadhiHospital-node-msi.log"
    $p = Start-Process msiexec.exe -Wait -PassThru -ArgumentList @("/i", "`"$nodeMsi`"", "/qn", "/norestart", "/l*v", "`"$msiLog`"")
    if ($p.ExitCode -notin @(0, 3010)) { Fail "Node.js install failed (msiexec exit code $($p.ExitCode)). Details: $msiLog" }
    Update-PathFromRegistry
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCmd) { Fail "Node.js was installed but can't be found. Restart the computer, then run this again." }
    Write-Host "Installed: $((& $nodeCmd.Source --version).Trim())" -ForegroundColor Green
}

# --- Update? Save a safety copy of the data AND the current program first ---
$dataDir = Join-Path $Target "apps\server\data"
$isUpdate = Test-Path (Join-Path $dataDir "clinic.db")
$newVersion = (Get-Content (Join-Path $pkgSource "version.txt") -Raw -ErrorAction SilentlyContinue)
$oldVersion = (Get-Content (Join-Path $Target "version.txt") -Raw -ErrorAction SilentlyContinue)
$newVersion = if ($newVersion) { $newVersion.Trim() } else { "unknown" }
$oldVersion = if ($oldVersion) { $oldVersion.Trim() } else { "older version" }
$programSnapshot = Join-Path $Target "update-backups\program-previous"
$safeDir = $null

# Installed before, but the database file is gone? Never carry on and create an
# empty one -- the clinic would lose sight of all its data. Restore first.
$anyBackup = @(Get-ChildItem (Join-Path $dataDir "backups"), (Join-Path $Target "update-backups") -Filter "*.db" -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notlike "*\node_modules\*" }).Count -gt 0
if (-not $isUpdate -and $anyBackup) {
    Fail "The database file is MISSING ($dataDir\clinic.db), but backups exist. Nothing was changed. Double-click C:\Aadhi Hospital\Restore Backup.bat to restore the latest backup, then run this again."
}

# Closes the desktop app, stops the service, and removes any other process
# serving the clinic API (e.g. a stray server an older app version started
# while the service was being reinstalled) so nothing holds the database open.
function Stop-Server {
    Get-Process -Name "clinic-system" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    $n = @((Join-Path $Target "tools\nssm.exe"), (Join-Path $pkgSource "tools\nssm.exe")) | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ((Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) -and $n) {
        # nssm writes "has not been started" to stderr if it's already stopped --
        # harmless, but under ErrorActionPreference=Stop that would abort the install.
        $prev = $ErrorActionPreference; $ErrorActionPreference = "Continue"
        try { & $n stop $ServiceName 2>&1 | Out-Null } finally { $ErrorActionPreference = $prev }
        Start-Sleep -Seconds 2
    }
    foreach ($c in @(Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue)) {
        Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -match 'dist[\\/]index\.js' } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 1
}

# Keep only the newest 3 safety copies (update + restore); older ones just
# fill the disk. Daily/monthly backups in data\backups are separate. Called
# right after a new one is made, regardless of whether the rest of the
# update succeeds -- a repeatedly failing update must not accumulate these
# forever.
function Prune-SafetyCopies {
    Get-ChildItem (Join-Path $Target "update-backups") -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like "before-update-*" -or $_.Name -like "before-restore-*" } |
        Sort-Object { $_.Name -replace '^before-(update|restore)-', '' } -Descending | Select-Object -Skip 3 |
        ForEach-Object { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
}

# True only if no program has the database open. Never copy over it otherwise.
function Test-DbUnlocked {
    foreach ($f in @("clinic.db", "clinic.db-wal", "clinic.db-shm")) {
        $p = Join-Path $dataDir $f
        if (-not (Test-Path $p)) { continue }
        try { $h = [IO.File]::Open($p, 'Open', 'ReadWrite', 'None'); $h.Close() } catch { return $false }
    }
    return $true
}

if ($isUpdate) {
    Step "UPDATE: $oldVersion  ->  $newVersion   (saving a safety copy first)"
    Stop-Server
    if (-not (Test-DbUnlocked)) {
        Fail "Another program still has the database open, so nothing was updated. Close the Aadhi Hospital app on every computer, restart this computer, then run the update again."
    }
    # With the server stopped the database files are consistent, so a plain copy is safe.
    $safeDir = Join-Path $Target ("update-backups\before-update-" + (Get-Date -Format "yyyy-MM-dd_HHmmss"))
    New-Item -ItemType Directory -Path $safeDir -Force | Out-Null
    foreach ($f in @("clinic.db", "clinic.db-wal", "clinic.db-shm")) {
        $src = Join-Path $dataDir $f
        if (Test-Path $src) { Copy-Item $src $safeDir -Force }
    }
    $prev = $ErrorActionPreference; $ErrorActionPreference = "Continue"
    $check = & node (Join-Path $pkgSource "scripts\db-tool.cjs") check (Join-Path $safeDir "clinic.db") 2>&1 | Out-String
    $checkCode = $LASTEXITCODE
    $ErrorActionPreference = $prev
    if ($checkCode -ne 0) { Fail "The safety copy of the database doesn't check out ($($check.Trim())). Nothing was updated. Contact the developer." }
    $info = $check | ConvertFrom-Json
    Write-Host "Data saved to $safeDir ($($info.patients) patients, $($info.medicines) medicines, $($info.labReports) lab reports)." -ForegroundColor Green
    Prune-SafetyCopies

    # Keep the current program too, so a failed update can be rolled back completely.
    robocopy $Target $programSnapshot /MIR /XJ /R:2 /W:2 /NFL /NDL /NJH /NJS /NP /XD $dataDir (Join-Path $Target "update-backups") | Out-Null
    if ($LASTEXITCODE -ge 8) { Fail "Could not save a copy of the current program (robocopy exit $LASTEXITCODE). Nothing was updated. Is the C: drive full?" }
    $global:LASTEXITCODE = 0
    Write-Host "Current program saved (for automatic rollback)." -ForegroundColor Green
}

# Puts the previous program + data back and restarts it. Used only if the update fails.
function Undo-Update([string]$Reason) {
    Write-Host ""
    Write-Host "UPDATE FAILED: $Reason" -ForegroundColor Red
    Write-Host "Putting the previous version and data back..." -ForegroundColor Yellow
    Stop-Server
    Get-ChildItem $Target -Force | Where-Object { $_.Name -notin @("apps", "update-backups", "install-log.txt") } |
        ForEach-Object { cmd.exe /c "rd /s /q `"$($_.FullName)`" 2>nul & del /f /q `"$($_.FullName)`" 2>nul" | Out-Null }
    Get-ChildItem (Join-Path $Target "apps") -Force | Where-Object { $_.Name -ne "server" } |
        ForEach-Object { cmd.exe /c "rd /s /q `"$($_.FullName)`"" | Out-Null }
    Get-ChildItem (Join-Path $Target "apps\server") -Force | Where-Object { $_.Name -ne "data" } |
        ForEach-Object { cmd.exe /c "rd /s /q `"$($_.FullName)`" 2>nul & del /f /q `"$($_.FullName)`" 2>nul" | Out-Null }
    robocopy $programSnapshot $Target /E /XJ /R:2 /W:2 /NFL /NDL /NJH /NJS /NP | Out-Null
    Stop-Server
    if (-not (Test-DbUnlocked)) {
        Fail "The update failed, and another program has the database open, so the data could not be put back safely. Your data is safe in $safeDir . Restart the computer, then run C:\Aadhi Hospital\Restore Backup.bat and pick the newest 'Before update/restore' entry."
    }
    Remove-Item (Join-Path $dataDir "clinic.db-wal"), (Join-Path $dataDir "clinic.db-shm") -Force -ErrorAction SilentlyContinue
    Copy-Item (Join-Path $safeDir "*") $dataDir -Force
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Target "scripts\setup-main-computer.ps1") | Out-Null
    $ok = $false
    try { $ok = (Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 5).ok } catch { }
    if ($ok) {
        Fail "The update was NOT installed. The previous version ($oldVersion) and all data were put back and the clinic can keep working. Send C:\Aadhi Hospital\install-log.txt to the developer."
    }
    Fail "The update failed AND the previous version did not start again. Your data is safe in $safeDir . Contact the developer."
}

# --- 2. Copy files to C:\Aadhi Hospital -------------------------------------
Step "2/6  Copying files to $Target (a few minutes, please wait)"
Stop-Server
# /E copies everything and never deletes files in the target (no /MIR, no
# /PURGE), so C:\Aadhi Hospital\apps\server\data (patient data) is untouched.
robocopy $pkgSource $Target /E /XJ /R:2 /W:2 /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) {
    $code = $LASTEXITCODE
    if ($isUpdate) { Undo-Update "copying files failed (robocopy exit $code)" }
    Fail "Copying to $Target failed (robocopy exit code $code). Is the C: drive full?"
}
$global:LASTEXITCODE = 0
Write-Host "Files copied." -ForegroundColor Green

# --- 3. Server: build, database, Windows service, firewall ------------------
Step "3/6  Setting up the server"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Target "scripts\setup-main-computer.ps1")
if ($LASTEXITCODE -ne 0) {
    if ($isUpdate) { Undo-Update "server setup did not finish (see the red message above)" }
    Fail "Server setup did not finish (see the red message above)."
}

# --- 4. WebView2 (needed to show the app window; Windows 11 already has it) -
Step "4/6  WebView2"
$wvKeys = @(
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
    "HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
    "HKCU:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
)
$wv = $wvKeys | ForEach-Object { (Get-ItemProperty $_ -ErrorAction SilentlyContinue).pv } | Where-Object { $_ -and $_ -ne "0.0.0.0" } | Select-Object -First 1
if ($wv) {
    Write-Host "Already installed: $wv" -ForegroundColor Green
} elseif (Test-Path $webviewSetup) {
    Write-Host "Not installed -- installing from the pendrive (2-3 minutes)..."
    $p = Start-Process $webviewSetup -Wait -PassThru -ArgumentList @("/silent", "/install")
    if ($p.ExitCode -ne 0) { Fail "WebView2 install failed (exit code $($p.ExitCode))." }
    Write-Host "Installed." -ForegroundColor Green
} else {
    Fail "WebView2 is not installed and Installers\MicrosoftEdgeWebView2-x64-offline.exe is missing from the pendrive."
}

# --- 5. Desktop app ---------------------------------------------------------
Step "5/6  Installing the Aadhi Hospital app"
Get-Process -Name "clinic-system" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
$p = Start-Process $appSetup.FullName -Wait -PassThru -ArgumentList "/S"
if ($p.ExitCode -ne 0) { Fail "The app installer failed (exit code $($p.ExitCode))." }
$appExe = @(
    "$env:LOCALAPPDATA\Aadhi Hospital\clinic-system.exe",
    "$env:ProgramFiles\Aadhi Hospital\clinic-system.exe"
) + (Get-ChildItem "$env:LOCALAPPDATA\Aadhi Hospital", "$env:ProgramFiles\Aadhi Hospital" -Filter *.exe -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -ne "uninstall.exe" } | Select-Object -ExpandProperty FullName) |
    Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $appExe) { Fail "The app installer finished but the app can't be found." }
$shortcut = Join-Path ([Environment]::GetFolderPath("Desktop")) "Aadhi Hospital.lnk"
if (-not (Test-Path $shortcut)) {
    $ws = New-Object -ComObject WScript.Shell
    $lnk = $ws.CreateShortcut($shortcut)
    $lnk.TargetPath = $appExe
    $lnk.WorkingDirectory = Split-Path $appExe
    $lnk.Save()
}
Write-Host "App installed: $appExe" -ForegroundColor Green

# --- 6. Final check ---------------------------------------------------------
Step "6/6  Checking everything"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Target "scripts\verify-install.ps1")
$verifyCode = $LASTEXITCODE

Write-Host ""
if ($verifyCode -eq 0) {
    Write-Host "############################################################" -ForegroundColor Green
    if ($isUpdate) {
        Write-Host "  DONE -- updated $oldVersion -> $newVersion. All data kept." -ForegroundColor Green
        Write-Host "  Safety copy of the data: $safeDir" -ForegroundColor Green
    } else {
        Write-Host "  DONE -- Aadhi Hospital $newVersion is installed and running." -ForegroundColor Green
    }
    Write-Host "  Open 'Aadhi Hospital' from the desktop." -ForegroundColor Green
    Write-Host "  Login: admin / changeme123  (change it after first login)" -ForegroundColor Green
    Write-Host "############################################################" -ForegroundColor Green
    Finish 0
} else {
    Fail "Some checks failed (see FAIL lines above). Send the file $Target\install-log.txt to the developer."
}
