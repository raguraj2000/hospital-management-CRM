# "Restore Backup.bat": replaces the current database with a backup you pick.
# The current database is saved first (update-backups\before-restore-...), so a
# restore can itself be undone by restoring that one.
. "$PSScriptRoot\clinic-common.ps1"
Ensure-Admin $PSCommandPath

Write-Host "== Aadhi Hospital: restore a backup ==" -ForegroundColor Cyan

# --- Collect every backup we know about --------------------------------------
$list = @()
function Add-Backups([string]$Folder, [string]$Kind, [string]$Filter = "*.db") {
    if (-not (Test-Path $Folder)) { return }
    Get-ChildItem $Folder -Filter $Filter -File -Recurse:($Kind -eq "Before update/restore") -ErrorAction SilentlyContinue |
        Where-Object { $_.Length -gt 0 } |
        ForEach-Object { $script:list += [pscustomobject]@{ Kind = $Kind; Time = $_.LastWriteTime; File = $_.FullName; SizeMB = [math]::Round($_.Length / 1MB, 1) } }
}
Add-Backups (Join-Path $DataDir "backups\daily") "Daily"
Add-Backups (Join-Path $DataDir "backups\monthly") "Monthly"
Add-Backups (Join-Path $DataDir "backups\manual") "Manual (Back up now)"
Add-Backups (Join-Path $DataDir "backups") "Automatic" "clinic-*.db"
Add-Backups (Join-Path $ClinicRoot "update-backups") "Before update/restore" "clinic.db"
foreach ($d in Get-Pendrives) { Add-Backups "$($d.Drive)\AadhiHospital-Backup" "Pendrive $($d.Drive)" }

$list = @($list | Sort-Object Time -Descending)
if ($list.Count -eq 0) { Stop-WithError "No backups found. (If your backup is on a pendrive, plug it in and run this again.)" }

$showAll = $false
while ($true) {
    $shown = if ($showAll) { $list } else { $list | Select-Object -First 30 }
    Write-Host ""
    Write-Host "Backups (newest first):"
    for ($i = 0; $i -lt @($shown).Count; $i++) {
        $b = @($shown)[$i]
        Write-Host ("  {0,3}. {1:dd-MM-yyyy  hh:mm tt}   {2,-22} {3} MB" -f ($i + 1), $b.Time, $b.Kind, $b.SizeMB)
    }
    if (-not $showAll -and $list.Count -gt 30) { Write-Host "  (showing 30 of $($list.Count) -- type ALL to see every backup)" -ForegroundColor DarkGray }
    $pick = Read-Host "`nType the number of the backup to restore (or press Enter to cancel)"
    if (-not $pick) { Write-Host "Cancelled. Nothing was changed."; Done 0 }
    if ($pick -eq "ALL") { $showAll = $true; continue }
    if (($pick -as [int]) -and [int]$pick -ge 1 -and [int]$pick -le @($shown).Count) { $chosen = @($shown)[[int]$pick - 1]; break }
    Write-Host "Not a valid number." -ForegroundColor Yellow
}

# --- Check the backup before touching anything --------------------------------
Write-Host "`nChecking the backup..."
$check = Invoke-DbTool @("check", $chosen.File)
if ($DbToolCode -ne 0) { Stop-WithError "This backup is damaged and can't be used ($check). Pick a different one. Nothing was changed." }
$info = $check | ConvertFrom-Json
Write-Host ("Backup from {0:dd-MM-yyyy hh:mm tt}: {1} patients, {2} medicines, {3} lab reports, {4} staff accounts." -f $chosen.Time, $info.patients, $info.medicines, $info.labReports, $info.users) -ForegroundColor Green

Write-Host ""
Write-Host "WARNING: everything entered AFTER this backup was made will be replaced." -ForegroundColor Yellow
Write-Host "(The current data is saved first, so this can be undone.)" -ForegroundColor Yellow
Write-Host "Close the Aadhi Hospital app on ALL computers before continuing." -ForegroundColor Yellow
if ((Read-Host "Type YES to restore") -ne "YES") { Write-Host "Cancelled. Nothing was changed."; Done 0 }

# --- Save current data, swap in the backup -----------------------------------
Stop-ClinicServer
if (-not (Test-DbUnlocked)) {
    Start-ClinicServer | Out-Null
    Stop-WithError "Another program still has the database open, so nothing was changed. Close the Aadhi Hospital app on every computer, restart this computer, then run Restore Backup.bat again."
}
$saveDir = Join-Path $ClinicRoot ("update-backups\before-restore-" + (Get-Date -Format "yyyy-MM-dd_HHmmss"))
New-Item -ItemType Directory -Path $saveDir -Force | Out-Null
foreach ($f in @("clinic.db", "clinic.db-wal", "clinic.db-shm")) {
    $src = Join-Path $DataDir $f
    if (Test-Path $src) { Copy-Item $src $saveDir -Force }
}
Write-Host "Current data saved to: $saveDir"

try {
    Remove-Item (Join-Path $DataDir "clinic.db-wal"), (Join-Path $DataDir "clinic.db-shm") -Force -ErrorAction SilentlyContinue
    Copy-Item $chosen.File $DbPath -Force
} catch {
    Copy-Item (Join-Path $saveDir "*") $DataDir -Force
    Start-ClinicServer | Out-Null
    Stop-WithError "Could not copy the backup ($($_.Exception.Message)). The old data was put back."
}

if (Start-ClinicServer) {
    Write-Host ""
    Write-Host "RESTORE DONE -- the server is running with the backup from $("{0:dd-MM-yyyy hh:mm tt}" -f $chosen.Time)." -ForegroundColor Green
    Write-Host "You can open the app again on every computer."
    Done 0
}

# Server didn't come back with the restored file -- put the old data back.
Stop-ClinicServer
Remove-Item (Join-Path $DataDir "clinic.db-wal"), (Join-Path $DataDir "clinic.db-shm") -Force -ErrorAction SilentlyContinue
Copy-Item (Join-Path $saveDir "*") $DataDir -Force
$back = Start-ClinicServer
Stop-WithError ("The server would not start with that backup, so the previous data was put back" + $(if ($back) { " and the server is running again." } else { ". The server is NOT running -- contact the developer." }))
