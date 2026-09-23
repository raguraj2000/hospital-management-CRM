# "Backup to Pendrive.bat": copies the whole clinic database (patients, prescriptions,
# stock, lab reports, staff) to <pendrive>\AadhiHospital-Backup\. Safe while the app is in use.
. "$PSScriptRoot\clinic-common.ps1"

Write-Host "== Aadhi Hospital: backup to pendrive ==" -ForegroundColor Cyan
if (-not (Test-Path $DbPath)) { Stop-WithError "No database found at $DbPath." }

$drives = @(Get-Pendrives)
if ($drives.Count -eq 0) { Stop-WithError "No pendrive found. Plug in a pendrive and run this again." }
if ($drives.Count -eq 1) {
    $drive = $drives[0]
} else {
    Write-Host "More than one pendrive is plugged in:"
    for ($i = 0; $i -lt $drives.Count; $i++) { Write-Host ("  {0}. {1}  {2}  ({3} GB free)" -f ($i + 1), $drives[$i].Drive, $drives[$i].Label, $drives[$i].FreeGB) }
    $pick = Read-Host "Type the number of the pendrive to use"
    if (-not ($pick -as [int]) -or [int]$pick -lt 1 -or [int]$pick -gt $drives.Count) { Stop-WithError "Not a valid number." }
    $drive = $drives[[int]$pick - 1]
}

$dbSizeMB = [math]::Round((Get-Item $DbPath).Length / 1MB, 1)
if ($drive.FreeGB * 1024 -lt $dbSizeMB * 2) { Stop-WithError "The pendrive $($drive.Drive) is almost full ($($drive.FreeGB) GB free). Delete old files from it and try again." }

$dest = Join-Path "$($drive.Drive)\AadhiHospital-Backup" ("clinic-" + (Get-Date -Format "yyyy-MM-dd_HHmm") + ".db")
Write-Host "Copying the database ($dbSizeMB MB) to $dest ..."
$out = Invoke-DbTool @("backup", $DbPath, $dest)
if ($DbToolCode -ne 0) { Stop-WithError "The backup failed: $out" }

$check = Invoke-DbTool @("check", $dest)
if ($DbToolCode -ne 0) { Stop-WithError "The backup was copied but it doesn't check out: $check. Try another pendrive." }
$info = $check | ConvertFrom-Json

Write-Host ""
Write-Host "BACKUP DONE -- checked and OK." -ForegroundColor Green
Write-Host "  File:      $dest"
Write-Host "  Contains:  $($info.patients) patients, $($info.medicines) medicines, $($info.labReports) lab reports, $($info.users) staff accounts"
Write-Host ""
Write-Host "Keep this pendrive somewhere safe, away from this computer." -ForegroundColor Yellow
Done 0
