<#
.SYNOPSIS
  Installs ONLY the Aadhi Hospital desktop app on an OTHER clinic computer
  (not the main computer), from the pendrive, with no internet.
  Started by "2 - OTHER COMPUTER (install app).bat" at the pendrive root.

  1. WebView2    -- installs the offline runtime if missing (asks Windows permission once)
  2. Desktop app -- installs silently for this user, adds a desktop shortcut

  No Node.js, no server, no database: those live only on the main computer.
  Safe to run again (e.g. to update the app).
#>

$ErrorActionPreference = "Stop"

$pendrive = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)   # <pendrive>\
$installers = Join-Path $pendrive "Installers"
$webviewSetup = Join-Path $installers "MicrosoftEdgeWebView2-x64-offline.exe"

function Done([int]$Code) {
    Write-Host ""
    Read-Host "Press Enter to close this window" | Out-Null
    exit $Code
}

function Fail([string]$Message) {
    Write-Host ""
    Write-Host "APP INSTALL STOPPED: $Message" -ForegroundColor Red
    Write-Host "Fix the problem above, then double-click '2 - OTHER COMPUTER (install app).bat' again. Running it again is safe." -ForegroundColor Yellow
    Done 1
}

function Step([string]$Text) { Write-Host ""; Write-Host "=== $Text ===" -ForegroundColor Cyan }

Write-Host "== Aadhi Hospital: install the app on this computer ==" -ForegroundColor Cyan

$appSetup = Get-ChildItem $installers -Filter "Aadhi Hospital_*_x64-setup.exe" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $appSetup) { Fail "The app installer (Installers\Aadhi Hospital_..._x64-setup.exe) is missing from the pendrive." }

# TODO(shortcut): the WebView2 check and app install below repeat steps 4-5 of
# one-click-install.ps1; kept separate so the tested main-computer installer isn't touched.

# --- 1. WebView2 (needed to show the app window; Windows 11 already has it) -
Step "1/2  WebView2"
$wvKeys = @(
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
    "HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
    "HKCU:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
)
$wv = $wvKeys | ForEach-Object { (Get-ItemProperty $_ -ErrorAction SilentlyContinue).pv } | Where-Object { $_ -and $_ -ne "0.0.0.0" } | Select-Object -First 1
if ($wv) {
    Write-Host "Already installed: $wv" -ForegroundColor Green
} elseif (Test-Path $webviewSetup) {
    Write-Host "Not installed -- installing from the pendrive (2-3 minutes)."
    Write-Host "Windows will ask for permission -- click Yes." -ForegroundColor Yellow
    try {
        # Only this step needs Administrator; the app itself installs for the signed-in user.
        $p = Start-Process $webviewSetup -Verb RunAs -Wait -PassThru -ArgumentList @("/silent", "/install")
    } catch {
        Fail "Permission was not given, so WebView2 could not be installed. Run it again and click Yes."
    }
    if ($p.ExitCode -ne 0) { Fail "WebView2 install failed (exit code $($p.ExitCode))." }
    Write-Host "Installed." -ForegroundColor Green
} else {
    Fail "WebView2 is not installed and Installers\MicrosoftEdgeWebView2-x64-offline.exe is missing from the pendrive."
}

# --- 2. Desktop app ---------------------------------------------------------
Step "2/2  Installing the Aadhi Hospital app ($($appSetup.Name))"
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

Write-Host ""
Write-Host "DONE" -ForegroundColor Green
Write-Host ""
Write-Host "Last step (only the first time on this computer):" -ForegroundColor Yellow
Write-Host "  1. Open 'Aadhi Hospital' from the desktop."
Write-Host "  2. On the sign-in screen, click 'Server settings'."
Write-Host "  3. Type the MAIN computer's address, e.g.  http://192.168.1.18:3001"
Write-Host "     (see 'ON EVERY OTHER COMPUTER' in SETUP GUIDE.txt for how to find it)."
Write-Host "  4. Click 'Test connection', then 'Save'."
Done 0
