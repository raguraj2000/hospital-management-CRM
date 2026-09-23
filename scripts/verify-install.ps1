<#
.SYNOPSIS
  Checks the whole clinic-system stack on this machine: Node.js, the built
  server, the ClinicSystemServer Windows service (if registered), the HTTP
  API, and a real login. Run it any time you want to confirm "is everything
  actually working" without opening the app.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\verify-install.ps1
#>

param(
    [string]$ServerDir = "",
    [string]$BaseUrl = "http://localhost:3001",
    [string]$AdminUsername = "admin",
    [string]$AdminPassword = "changeme123"
)

$ErrorActionPreference = "Continue"
# Default to the apps\server next to this script's folder, wherever it lives.
if (-not $ServerDir) { $ServerDir = Join-Path (Split-Path -Parent $PSScriptRoot) "apps\server" }
$results = @()

function Add-Result([string]$Name, [bool]$Pass, [string]$Detail) {
    $script:results += [pscustomobject]@{ Check = $Name; Pass = $Pass; Detail = $Detail }
}

Write-Host "== Clinic System install check ==" -ForegroundColor Cyan

# 1. Node.js present
try {
    $nodeVersion = (node --version) 2>$null
    Add-Result "Node.js on PATH" ($LASTEXITCODE -eq 0) $nodeVersion
} catch {
    Add-Result "Node.js on PATH" $false "node command not found"
}

# 2. Server built (dist/index.js exists)
$distEntry = Join-Path $ServerDir "dist\index.js"
Add-Result "Server built (dist\index.js exists)" (Test-Path $distEntry) $distEntry

# 2b. Database file present (the server refuses to start without it once backups exist)
$dbFile = Join-Path $ServerDir "data\clinic.db"
Add-Result "Database file exists" (Test-Path $dbFile) $(if (Test-Path $dbFile) { "$dbFile ($([math]::Round((Get-Item $dbFile).Length / 1MB, 1)) MB)" } else { "MISSING: $dbFile -- run Restore Backup.bat" })

# 3. Windows service registered / status
$service = Get-Service -Name "ClinicSystemServer" -ErrorAction SilentlyContinue
if ($service) {
    Add-Result "ClinicSystemServer service registered" $true "Status: $($service.Status), StartType: $($service.StartType)"
    Add-Result "ClinicSystemServer service running" ($service.Status -eq "Running") "Status: $($service.Status)"
} else {
    Add-Result "ClinicSystemServer service registered" $false "Not found -- run the NSSM setup, or start the server another way (e.g. the app's elevated Start Local Server control)"
}

# 3b. The API on port 3001 must be served by the service (NSSM), not a stray
#     process that would hold the database open and block the service.
$listener = @(Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue) | Select-Object -First 1
if ($listener) {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)" -ErrorAction SilentlyContinue
    $parent = if ($proc) { (Get-CimInstance Win32_Process -Filter "ProcessId=$($proc.ParentProcessId)" -ErrorAction SilentlyContinue).Name } else { $null }
    Add-Result "Port 3001 is served by the Windows service" ($parent -eq "nssm.exe") $(if ($parent -eq "nssm.exe") { "pid $($listener.OwningProcess) under nssm.exe" } else { "pid $($listener.OwningProcess) ($($proc.Name), parent: $parent) is NOT the service -- restart this computer" })
}

# 4. HTTP health check
try {
    $health = Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get -TimeoutSec 5
    Add-Result "Server responds at $BaseUrl/health" ($health.ok -eq $true) ($health | ConvertTo-Json -Compress)
} catch {
    Add-Result "Server responds at $BaseUrl/health" $false "Could not reach $BaseUrl -- is the server running? ($($_.Exception.Message))"
}

# 5. Login works (proves DB + auth + RBAC wiring, not just that the port is open)
$token = $null
$passwordChanged = $false
try {
    $loginBody = @{ username = $AdminUsername; password = $AdminPassword } | ConvertTo-Json
    $loginResp = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -TimeoutSec 5
    $token = $loginResp.token
    Add-Result "Login as '$AdminUsername' succeeds" ($null -ne $token) "user: $($loginResp.user.fullName), role: $($loginResp.user.role)"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        # The server + database answered and rejected the default password --
        # expected once the admin password has been changed.
        $passwordChanged = $true
        Add-Result "Login endpoint works" $true "Default password rejected (it was changed -- good). To test a full login: -AdminPassword <new password>"
    } else {
        Add-Result "Login as '$AdminUsername' succeeds" $false $_.Exception.Message
    }
}

# 6. An authenticated, RBAC-protected read actually returns data
if ($token) {
    try {
        $headers = @{ Authorization = "Bearer $token" }
        $medicines = Invoke-RestMethod -Uri "$BaseUrl/medicines" -Headers $headers -Method Get -TimeoutSec 5
        Add-Result "Authenticated API call succeeds (/medicines)" ($null -ne $medicines.medicines) "$($medicines.medicines.Count) medicine(s) found"
    } catch {
        Add-Result "Authenticated API call succeeds (/medicines)" $false $_.Exception.Message
    }
} elseif (-not $passwordChanged) {
    Add-Result "Authenticated API call succeeds (/medicines)" $false "Skipped -- no login token"
}

# 7. Unauthenticated requests are correctly rejected (RBAC sanity check)
try {
    Invoke-RestMethod -Uri "$BaseUrl/admin/audit-log" -Method Get -TimeoutSec 5 -ErrorAction Stop | Out-Null
    Add-Result "Unauthenticated request correctly rejected" $false "Expected 401 but request succeeded"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Add-Result "Unauthenticated request correctly rejected" ($statusCode -eq 401) "HTTP $statusCode"
}

Write-Host ""
Write-Host "== Results ==" -ForegroundColor Cyan
foreach ($r in $results) {
    $color = if ($r.Pass) { "Green" } else { "Red" }
    $mark = if ($r.Pass) { "PASS" } else { "FAIL" }
    Write-Host ("[{0}] {1}" -f $mark, $r.Check) -ForegroundColor $color
    Write-Host ("       {0}" -f $r.Detail) -ForegroundColor DarkGray
}

$failCount = @($results | Where-Object { -not $_.Pass }).Count
Write-Host ""
if ($failCount -eq 0) {
    Write-Host "All checks passed. The server and app backend are working." -ForegroundColor Green
} else {
    Write-Host "$failCount check(s) failed -- see FAIL lines above." -ForegroundColor Yellow
}
exit $(if ($failCount -eq 0) { 0 } else { 1 })
