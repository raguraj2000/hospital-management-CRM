# "Reset Admin Password.bat": sets the 'admin' account's password back to changeme123.
# Needs Windows administrator permission on the MAIN computer, so it can't be done
# from another computer or by someone without that permission.
. "$PSScriptRoot\clinic-common.ps1"
Ensure-Admin $PSCommandPath

Write-Host "== Aadhi Hospital: reset admin password ==" -ForegroundColor Cyan
if (-not (Test-Path $DbPath)) { Stop-WithError "No database found at $DbPath." }

Write-Host "This sets the password of the 'admin' account back to:  changeme123"
Write-Host "Other staff accounts are not changed."
if ((Read-Host "Type YES to continue") -ne "YES") { Write-Host "Cancelled. Nothing was changed."; Done 0 }

$out = Invoke-DbTool @("reset-admin", $DbPath)
if ($DbToolCode -ne 0 -or $out -notmatch "reset-ok") { Stop-WithError "The reset failed: $out" }

Write-Host ""
Write-Host "DONE. Sign in with:  admin  /  changeme123" -ForegroundColor Green
Write-Host "Then set a new password right away (Preferences, top right) and write it down somewhere safe." -ForegroundColor Yellow
Done 0
