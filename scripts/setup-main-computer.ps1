<#
.SYNOPSIS
  One-time setup for the "main computer" in the clinic. Works fully
  OFFLINE when run from the pendrive package built by
  scripts\package-for-handoff.ps1 (node_modules + tools\nssm.exe included).

  It: checks the folder location and Node.js version, links the local
  workspace packages, builds the server, sets up the database, and
  registers the server as an auto-starting Windows service (via NSSM) so
  it runs forever in the background without anyone opening a terminal.

  Safe to run again (e.g. after copying an updated package over
  C:\Aadhi Hospital) -- existing patient data is never touched.

  Needs Administrator; if not elevated it re-launches itself elevated.

.EXAMPLE
  Double-click "Install Main Computer.bat", or:
  powershell -ExecutionPolicy Bypass -File "C:\Aadhi Hospital\scripts\setup-main-computer.ps1"
#>

param([switch]$Relaunched)

$ErrorActionPreference = "Stop"

# The desktop app looks for the server here (apps/client/src/state/
# server-lifecycle.ts DEFAULT_SERVER_ROOT), so the install location is fixed.
$ExpectedRoot = "C:\Aadhi Hospital"
$ServiceName = "ClinicSystemServer"
$Port = 3001

# When we re-launched ourselves elevated, that new window would vanish on
# exit before anyone could read the result -- so wait for Enter first.
function Finish([int]$Code) {
    if ($Relaunched) { Write-Host ""; Read-Host "Press Enter to close this window" | Out-Null }
    exit $Code
}

function Fail([string]$Message) {
    Write-Host ""
    Write-Host "SETUP STOPPED: $Message" -ForegroundColor Red
    Write-Host "Nothing is broken -- fix the problem above and run the setup again." -ForegroundColor Yellow
    Finish 1
}

# Runs a native command without PowerShell turning its stderr into a
# terminating error; returns combined output and sets $script:LastCode.
function Invoke-Quiet([scriptblock]$Block) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try { $out = & $Block 2>&1 | Out-String } finally { $ErrorActionPreference = $prev }
    $script:LastCode = $LASTEXITCODE
    return $out
}

# --- Elevation: re-launch as Administrator if needed ------------------------
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Administrator rights are needed -- Windows will ask for permission, click Yes." -ForegroundColor Yellow
    try {
        $child = Start-Process powershell.exe -Verb RunAs -Wait -PassThru -ArgumentList @(
            "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$PSCommandPath`"", "-Relaunched"
        )
    } catch {
        Write-Host "Setup was cancelled (administrator permission was not given). Run it again and click Yes." -ForegroundColor Red
        exit 1
    }
    Write-Host "Setup finished in the administrator window." -ForegroundColor Cyan
    exit $child.ExitCode
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$serverDir = Join-Path $repoRoot "apps\server"
$dataDir = Join-Path $serverDir "data"
$dbPath = Join-Path $dataDir "clinic.db"

Write-Host "== Aadhi Hospital: main computer setup ==" -ForegroundColor Cyan
Write-Host "Folder: $repoRoot"

# --- 1. Location ------------------------------------------------------------
if ($repoRoot.TrimEnd('\') -ne $ExpectedRoot) {
    Fail "This folder is at '$repoRoot' but it must be exactly '$ExpectedRoot'. Copy the 'Aadhi Hospital' folder from the pendrive directly into C:\ (so you get C:\Aadhi Hospital\scripts\...), then run the setup from there. Do not run it from the pendrive."
}
foreach ($required in @("package.json", "apps\server\package.json", "apps\server\migrations", "packages\shared\package.json")) {
    if (-not (Test-Path (Join-Path $repoRoot $required))) {
        Fail "'$required' is missing -- the copy from the pendrive is incomplete. Copy the whole 'Aadhi Hospital' folder again."
    }
}

# --- 2. Node.js -------------------------------------------------------------
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Fail "Node.js is not installed. Install it from the pendrive (Installers\node-...-x64.msi), then close this window and run the setup again."
}
$node = $nodeCmd.Source
$nodeVersion = (& $node --version).Trim()
Write-Host "Node.js found: $nodeVersion ($node)" -ForegroundColor Green

# node_modules contains compiled code (better-sqlite3) that only works with
# the Node.js major version it was built on -- package-for-handoff.ps1
# records that version here.
$versionFile = Join-Path $repoRoot "node-version.txt"
if (Test-Path $versionFile) {
    $builtFor = (Get-Content $versionFile -Raw).Trim()
    $builtMajor = $builtFor.TrimStart('v').Split('.')[0]
    $haveMajor = $nodeVersion.TrimStart('v').Split('.')[0]
    if ($builtMajor -ne $haveMajor) {
        Fail "This package was prepared for Node.js $builtFor but this computer has $nodeVersion. Uninstall Node.js (Settings > Apps), install the one from the pendrive (Installers\node-$builtFor-x64.msi), then run the setup again."
    }
}

# --- 3. NSSM (service wrapper) ----------------------------------------------
$nssm = $null
$bundled = Join-Path $repoRoot "tools\nssm.exe"
if (Test-Path $bundled) {
    $nssm = $bundled
} elseif (Get-Command nssm -ErrorAction SilentlyContinue) {
    $nssm = (Get-Command nssm).Source
} else {
    Write-Host "`ntools\nssm.exe not found -- trying to download NSSM with winget (needs internet)..." -ForegroundColor Yellow
    Invoke-Quiet { winget install --id NSSM.NSSM -e --accept-source-agreements --accept-package-agreements } | Out-Null
    $found = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter "nssm.exe" -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -like "*win64*" } | Select-Object -First 1
    if (-not $found) { Fail "NSSM is missing. Use the pendrive package (it includes tools\nssm.exe)." }
    New-Item -ItemType Directory -Path (Split-Path $bundled) -Force | Out-Null
    Copy-Item $found.FullName $bundled -Force
    $nssm = $bundled
}
Write-Host "Using NSSM at: $nssm" -ForegroundColor Green

# Stop an existing service first so its files aren't locked while we rebuild.
if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
    Write-Host "`nExisting $ServiceName service found -- stopping it for the update..." -ForegroundColor Yellow
    Invoke-Quiet { & $nssm stop $ServiceName } | Out-Null
    Invoke-Quiet { & $nssm remove $ServiceName confirm } | Out-Null
    Start-Sleep -Seconds 2
}
# Nothing else may serve the API or hold the database open while we migrate
# and re-register (an older desktop app starts its own server when it sees
# the service missing): close the app and stop any such process.
Get-Process -Name "clinic-system" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
foreach ($c in @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)) {
    Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
}
Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match 'dist[\\/]index\.js' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

# --- 4. Dependencies (offline) ----------------------------------------------
# Stop npm's background update/audit/fund lookups -- the clinic has no internet.
$env:npm_config_update_notifier = "false"
$env:npm_config_audit = "false"
$env:npm_config_fund = "false"
Push-Location $repoRoot
try {
    $nodeModules = Join-Path $repoRoot "node_modules"
    if (Test-Path $nodeModules) {
        Write-Host "`nnode_modules found -- using it (no internet needed)." -ForegroundColor Cyan

        # npm workspaces normally link these; they are left out of the
        # pendrive copy (a copied link would point at the developer's PC),
        # so recreate them here pointing at this folder.
        $scope = Join-Path $nodeModules "@clinic"
        New-Item -ItemType Directory -Path $scope -Force | Out-Null
        $links = @{ "shared" = (Join-Path $repoRoot "packages\shared"); "server" = $serverDir }
        foreach ($name in $links.Keys) {
            $link = Join-Path $scope $name
            $item = Get-Item $link -Force -ErrorAction SilentlyContinue
            if ($item) {
                if ($item.LinkType) { [System.IO.Directory]::Delete($link) }  # removes the link only
                else { Remove-Item $link -Recurse -Force }
            }
            New-Item -ItemType Junction -Path $link -Target $links[$name] | Out-Null
        }
        $clientLink = Join-Path $scope "client"
        $clientItem = Get-Item $clientLink -Force -ErrorAction SilentlyContinue
        if ($clientItem -and $clientItem.LinkType) { [System.IO.Directory]::Delete($clientLink) }
    } else {
        Write-Host "`nnode_modules missing -- running npm install (needs internet)..." -ForegroundColor Yellow
        & npm.cmd install --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { Fail "npm install failed. This computer has no internet? Use the pendrive package, which already contains node_modules." }
    }

    # Prove the compiled database/password modules load on this Node.js
    # before going further -- otherwise the service would just crash-loop.
    $check = Invoke-Quiet { & $node -e "require('argon2');require('better-sqlite3')(':memory:').close();console.log('native-ok')" }
    if ($check -notmatch "native-ok") {
        Write-Host $check -ForegroundColor DarkGray
        Fail "The database module does not work with Node.js $nodeVersion. Install the exact Node.js version from the pendrive (see node-version.txt) and run the setup again."
    }
    Write-Host "Database and password modules OK." -ForegroundColor Green

    # --- 5. Build + database -------------------------------------------------
    Write-Host "`nBuilding server..." -ForegroundColor Cyan
    & npm.cmd run build:server
    if ($LASTEXITCODE -ne 0) { Fail "Building the server failed (see messages above)." }

    Write-Host "`nSetting up database at $dbPath ..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
    $env:CLINIC_DB_PATH = $dbPath
    & npm.cmd run migrate
    if ($LASTEXITCODE -ne 0) { Fail "Database migration failed (see messages above)." }
    & npm.cmd run seed
    if ($LASTEXITCODE -ne 0) { Fail "Creating the default admin account failed (see messages above)." }
} finally {
    Pop-Location
}

# --- 6. Register the Windows service ----------------------------------------
Write-Host "`nRegistering $ServiceName service..." -ForegroundColor Cyan
& $nssm install $ServiceName $node "dist\index.js" | Out-Null
if ($LASTEXITCODE -ne 0) { Fail "Could not register the Windows service." }
& $nssm set $ServiceName AppDirectory $serverDir | Out-Null
& $nssm set $ServiceName AppEnvironmentExtra "CLINIC_DB_PATH=$dbPath" | Out-Null
& $nssm set $ServiceName DisplayName "Clinic System Server" | Out-Null
& $nssm set $ServiceName Description "Clinic/Pharmacy management backend (Hono + SQLite) -- Aadhi Hospital" | Out-Null
& $nssm set $ServiceName Start SERVICE_AUTO_START | Out-Null
& $nssm set $ServiceName AppStdout (Join-Path $serverDir "service-stdout.log") | Out-Null
& $nssm set $ServiceName AppStderr (Join-Path $serverDir "service-stderr.log") | Out-Null
& $nssm set $ServiceName AppRotateFiles 1 | Out-Null

# Let any locally logged-in user start/stop this one service without a UAC
# prompt -- the desktop app's Settings > Server > "Restart server" button runs
# `sc start`/`sc stop` as whoever is using the app. RP (start) + WP (stop) for
# Interactive Users only; not reconfigure, not delete.
Write-Host "Granting start/stop control to logged-in users (for the app's Restart button)..." -ForegroundColor Cyan
& sc.exe sdset $ServiceName "D:(A;;CCLCSWRPWPDTLOCRRC;;;SY)(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;BA)(A;;CCLCSWRPWPLOCRRC;;;IU)(A;;CCLCSWLOCRRC;;;SU)" | Out-Null

# --- 7. Firewall -- without this, other clinic computers are silently refused
Write-Host "Opening TCP $Port on Windows Firewall (so other clinic computers can connect)..." -ForegroundColor Cyan
if (-not (Get-NetFirewallRule -DisplayName "Clinic System Server" -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName "Clinic System Server" -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Any | Out-Null
}

# --- 8. Start + health check ------------------------------------------------
Invoke-Quiet { & $nssm start $ServiceName } | Out-Null
$health = $null
for ($i = 0; $i -lt 15 -and -not $health; $i++) {
    Start-Sleep -Seconds 1
    try { $health = Invoke-RestMethod -Uri "http://localhost:$Port/health" -TimeoutSec 3 } catch { }
}

if ($health -and $health.ok) {
    Write-Host ""
    Write-Host "SUCCESS -- the server is installed and running." -ForegroundColor Green
    Write-Host "It starts automatically every time this computer boots. You never need to run this again." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next: install the desktop app (Installers\Aadhi Hospital_..._x64-setup.exe) on this computer." -ForegroundColor Cyan
    Write-Host "Default login: admin / changeme123 -- change this password as soon as you log in." -ForegroundColor Yellow
    $ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } |
        Select-Object -ExpandProperty IPAddress
    if ($ips) {
        Write-Host ""
        Write-Host "Other computers connect to this one using (write this down):" -ForegroundColor Cyan
        foreach ($ip in $ips) { Write-Host "    http://${ip}:$Port" -ForegroundColor White }
    } else {
        Write-Host ""
        Write-Host "No network connection yet -- once this computer is on the clinic Wi-Fi/LAN, run 'ipconfig' to get its address for the other computers." -ForegroundColor Yellow
    }
} else {
    $status = Invoke-Quiet { & $nssm status $ServiceName }
    Write-Host ""
    Write-Host "The service was registered (status: $($status.Trim())) but the server is not answering." -ForegroundColor Red
    Write-Host "Check the log file: $serverDir\service-stderr.log" -ForegroundColor Red
    Finish 1
}
Finish 0
