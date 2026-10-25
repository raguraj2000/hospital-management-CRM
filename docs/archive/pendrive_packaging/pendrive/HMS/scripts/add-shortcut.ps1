# OTHER COMPUTERS: nothing is installed. This only puts an "HMS" shortcut on the desktop that
# opens the main computer in the browser.
$Port = 4100
Write-Host 'HMS - shortcut for this computer' -ForegroundColor Cyan
Write-Host "The main computer showed its address when it was installed, for example  MAINPC  or  192.168.1.10`n"
while ($true) {
  $name = (Read-Host "Main computer's name or IP address").Trim() -replace '^https?://', '' -replace '[:/].*$', ''
  if (-not $name) { continue }
  $url = "http://${name}:$Port"
  try {
    if ((Invoke-RestMethod "$url/api/health" -TimeoutSec 5).ok) { break }
  } catch {}
  Write-Host "Could not reach $url. Check that the main computer is on, both are on the same Wi-Fi/LAN, and the name is right." -ForegroundColor Yellow
  if ((Read-Host 'Make the shortcut anyway? (y/n)') -eq 'y') { break }
}
$desktop = [Environment]::GetFolderPath('Desktop')
Set-Content -Path "$desktop\HMS.url" -Value "[InternetShortcut]`r`nURL=$url/`r`n" -Encoding ASCII
Write-Host "`nDONE. Open 'HMS' on the desktop ($url)." -ForegroundColor Green
Read-Host 'Press Enter to close'
