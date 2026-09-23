# "Collect Support Info.bat": copies logs, version and a system check to a pendrive
# for the developer. NO patient data is copied.
. "$PSScriptRoot\clinic-common.ps1"

Write-Host "== Aadhi Hospital: collect support info ==" -ForegroundColor Cyan
$drives = @(Get-Pendrives)
if ($drives.Count -eq 0) { Stop-WithError "No pendrive found. Plug in a pendrive and run this again." }
$drive = $drives[0]

$out = Join-Path "$($drive.Drive)\AadhiHospital-Support" (Get-Date -Format "yyyy-MM-dd_HHmm")
New-Item -ItemType Directory -Path $out -Force | Out-Null

foreach ($f in @("version.txt", "install-log.txt", "node-version.txt", "apps\server\service-stderr.log", "apps\server\service-stdout.log")) {
    $src = Join-Path $ClinicRoot $f
    if (Test-Path $src) { Copy-Item $src $out -Force }
}

$prev = $ErrorActionPreference; $ErrorActionPreference = "Continue"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "verify-install.ps1") *>&1 | Out-File (Join-Path $out "system-check.txt") -Encoding UTF8
$ErrorActionPreference = $prev

$sys = @()
$sys += "Computer:  $env:COMPUTERNAME"
$sys += "Windows:   $((Get-CimInstance Win32_OperatingSystem).Caption) $((Get-CimInstance Win32_OperatingSystem).Version)"
$sys += "Node.js:   $(try { (node --version) } catch { 'not found' })"
$sys += "Service:   $((Get-Service $ServiceName -ErrorAction SilentlyContinue).Status)"
$sys += "C: free:   $([math]::Round((Get-PSDrive C).Free / 1GB, 1)) GB"
$sys += "DB size:   $(if (Test-Path $DbPath) { [math]::Round((Get-Item $DbPath).Length / 1MB, 1) } else { 'missing' }) MB"
$sys += "Backups:   $(@(Get-ChildItem (Join-Path $DataDir 'backups') -Filter *.db -Recurse -ErrorAction SilentlyContinue).Count) files"
$sys += "IP:        $((Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike '127.*' } | Select-Object -ExpandProperty IPAddress) -join ', ')"
$sys | Out-File (Join-Path $out "computer.txt") -Encoding UTF8

Write-Host ""
Write-Host "DONE -- saved to $out" -ForegroundColor Green
Write-Host "Give this pendrive to the developer. (No patient data was copied.)"
Done 0
