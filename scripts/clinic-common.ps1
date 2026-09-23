# Shared helpers for the clinic's double-click tools. Dot-source it:  . "$PSScriptRoot\clinic-common.ps1"

$ErrorActionPreference = "Stop"
$ClinicRoot = Split-Path -Parent $PSScriptRoot
$ServiceName = "ClinicSystemServer"
$DataDir = Join-Path $ClinicRoot "apps\server\data"
$DbPath = Join-Path $DataDir "clinic.db"
$DbTool = Join-Path $PSScriptRoot "db-tool.cjs"
$Nssm = Join-Path $ClinicRoot "tools\nssm.exe"

function Done([int]$Code) {
    Write-Host ""
    Read-Host "Press Enter to close this window" | Out-Null
    exit $Code
}

function Stop-WithError([string]$Message) {
    Write-Host ""
    Write-Host "STOPPED: $Message" -ForegroundColor Red
    Done 1
}

# Re-launches the calling script as Administrator (one UAC prompt) if needed.
function Ensure-Admin([string]$ScriptPath) {
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if ($isAdmin) { return }
    Write-Host "Windows will ask for permission -- click Yes." -ForegroundColor Yellow
    try {
        Start-Process powershell.exe -Verb RunAs -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$ScriptPath`"") | Out-Null
    } catch {
        Write-Host "Cancelled (permission was not given)." -ForegroundColor Red
    }
    exit 0
}

function Invoke-DbTool([string[]]$ToolArgs) {
    $prev = $ErrorActionPreference; $ErrorActionPreference = "Continue"
    try { $out = & node $DbTool @ToolArgs 2>&1 | Out-String } finally { $ErrorActionPreference = $prev }
    $script:DbToolCode = $LASTEXITCODE
    return $out.Trim()
}

# Removable drives (pendrives), excluding the one this script runs from.
function Get-Pendrives {
    Get-CimInstance Win32_LogicalDisk -Filter "DriveType=2" -ErrorAction SilentlyContinue |
        Where-Object { $_.Size -gt 0 } |
        ForEach-Object { [pscustomobject]@{ Drive = $_.DeviceID; Label = $_.VolumeName; FreeGB = [math]::Round($_.FreeSpace / 1GB, 1) } }
}

function Wait-ServerHealthy([int]$Seconds = 20) {
    for ($i = 0; $i -lt $Seconds; $i++) {
        try { if ((Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 2).ok) { return $true } } catch { }
        Start-Sleep -Seconds 1
    }
    return $false
}

# nssm writes harmless notes ("has not been started") to stderr; don't let
# ErrorActionPreference=Stop turn them into a crash.
function Invoke-Nssm([string[]]$NssmArgs) {
    $prev = $ErrorActionPreference; $ErrorActionPreference = "Continue"
    try { & $Nssm @NssmArgs 2>&1 | Out-Null } finally { $ErrorActionPreference = $prev }
}

# Stops the service AND anything else serving the clinic API (e.g. a stray
# server an old app version started), and closes the desktop app on this PC.
function Stop-ClinicServer {
    Get-Process -Name "clinic-system" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
        Invoke-Nssm @("stop", $ServiceName)
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

# True only if no program has the database open. Never overwrite it otherwise.
function Test-DbUnlocked {
    foreach ($f in @($DbPath, "$DbPath-wal", "$DbPath-shm")) {
        if (-not (Test-Path $f)) { continue }
        try { $h = [IO.File]::Open($f, 'Open', 'ReadWrite', 'None'); $h.Close() } catch { return $false }
    }
    return $true
}

function Start-ClinicServer {
    Invoke-Nssm @("start", $ServiceName)
    return (Wait-ServerHealthy)
}
