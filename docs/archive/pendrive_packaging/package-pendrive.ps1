# Builds the pendrive for an on-site install (one hospital PC, no internet there).
#   powershell -ExecutionPolicy Bypass -File .\scripts\package-pendrive.ps1 [-SetupBranch "<branch name>"]
# Output: handoff\PENDRIVE\  -- copy everything inside it to the root of the pendrive.
#
# -SetupBranch: carry one branch's SETUP from this PC's database (print header, lab tests and prices,
#  medicines and prices, consultation fee). Never patients, visits, bills or stock. Without it the
#  install starts empty.
param([string]$SetupBranch = '')
$ErrorActionPreference = 'Stop'
$Repo = Split-Path -Parent $PSScriptRoot
$Out = "$Repo\handoff\PENDRIVE"
$Cache = "$Repo\handoff\cache"
$App = "$Out\HMS\app"
Set-Location $Repo

function Step($t) { Write-Host "`n== $t" -ForegroundColor Cyan }
function Run($what, [scriptblock]$cmd) { & $cmd; if ($LASTEXITCODE -ne 0) { throw "$what failed (exit $LASTEXITCODE)" } }

Step 'Checks: tests, typecheck, web build'
Run 'tests' { npm test }
Run 'typecheck' { npm run typecheck }
Run 'web build' { npm run build }

Step 'Fresh output folder'
if (Test-Path $Out) { Remove-Item $Out -Recurse -Force }
New-Item -ItemType Directory -Force -Path $App, "$Out\HMS\node", "$Out\HMS\tools", $Cache | Out-Null

Step 'Bundling the server (one file each, no source code on the client PC)'
# @libsql/client loads a native file at run time, so it stays outside the bundle (see runtime modules below).
$banner = "import{createRequire as __cr}from'node:module';const require=__cr(import.meta.url);"
foreach ($pair in @(@('apps\api\src\index.ts', 'server.mjs'), @('apps\api\src\setup-tool.ts', 'setup.mjs'))) {
  Run "bundle $($pair[1])" { npx esbuild $pair[0] --bundle --platform=node --format=esm --target=node22 --external:@libsql/client "--banner:js=$banner" "--outfile=$App\$($pair[1])" --log-level=warning }
}
Copy-Item "$Repo\apps\api\drizzle" "$App\drizzle" -Recurse
Copy-Item "$Repo\apps\web\dist" "$App\web" -Recurse

Step 'Runtime modules (database driver for Windows x64)'
$libsql = (Get-Content "$Repo\node_modules\@libsql\client\package.json" -Raw | ConvertFrom-Json).version
$runtime = "$Cache\runtime-libsql-$libsql"
if (-not (Test-Path "$runtime\node_modules\@libsql\client")) {
  New-Item -ItemType Directory -Force -Path $runtime | Out-Null
  Set-Content "$runtime\package.json" "{ `"name`": `"hms-runtime`", `"private`": true, `"dependencies`": { `"@libsql/client`": `"$libsql`" } }"
  Push-Location $runtime
  try { Run 'npm install (runtime)' { npm install --omit=dev --no-audit --no-fund --os=win32 --cpu=x64 } } finally { Pop-Location }
}
Copy-Item "$runtime\node_modules" "$App\node_modules" -Recurse
if (-not (Get-ChildItem "$App\node_modules\@libsql" -Filter 'win32-x64-msvc' -Directory)) { throw 'The Windows x64 database driver is missing from the runtime modules.' }

Step 'Node.js (portable: nothing to install on the client PC)'
$node = (Get-Command node).Source
Copy-Item $node "$Out\HMS\node\node.exe"
$nodeVersion = (& $node --version)

Step 'Service helper'
if (-not (Test-Path "$Cache\nssm.exe")) { throw "Put nssm.exe (https://nssm.cc) in $Cache" }
Copy-Item "$Cache\nssm.exe" "$Out\HMS\tools\nssm.exe"

Step 'Install scripts and guide'
Copy-Item "$Repo\scripts\pendrive\*" $Out -Recurse -Force
$commit = (git rev-parse --short HEAD 2>$null)
$dirty = if (git status --porcelain) { '+local changes' } else { '' }
Set-Content "$Out\HMS\version.txt" "$(Get-Date -Format 'yyyy.MM.dd-HHmm') (build $commit$dirty, Node $nodeVersion)"

if ($SetupBranch) {
  Step "Setup data of branch '$SetupBranch' (no patient data)"
  Push-Location "$Repo\apps\api"
  try { Run 'export setup' { npx tsx src/setup-tool.ts export $SetupBranch "$Out\HMS\setup-data.json" } } finally { Pop-Location }
}

Step 'Self-test: the packaged server must start from the package alone'
$test = "$Cache\selftest"
if (Test-Path $test) { Remove-Item $test -Recurse -Force }
New-Item -ItemType Directory -Force -Path $test | Out-Null
$env:PORT = '4188'; $env:DATABASE_URL = "file:$($test -replace '\\','/')/app.db"; $env:MIGRATIONS_DIR = "$App\drizzle"; $env:WEB_DIR = "$App\web"
$env:OWNER_MOBILE = '9000000000'; $env:OWNER_PASSWORD = 'selftest-password'
Push-Location $App
try {
  Run 'setup init' { & "$Out\HMS\node\node.exe" setup.mjs init "$Out\HMS\setup-data.json" }
  $server = Start-Process "$Out\HMS\node\node.exe" -ArgumentList 'server.mjs' -WorkingDirectory $App -PassThru -WindowStyle Hidden -RedirectStandardOutput "$test\server.log" -RedirectStandardError "$test\server-err.log"
  try {
    $up = $false
    foreach ($i in 1..30) { try { if ((Invoke-RestMethod 'http://localhost:4188/api/health' -TimeoutSec 8).ok) { $up = $true; break } } catch { Start-Sleep -Milliseconds 700 } }
    if (-not $up) { throw "The packaged server did not answer. $(Get-Content "$test\server.log", "$test\server-err.log" -ErrorAction SilentlyContinue | Out-String)" }
    $login = Invoke-RestMethod 'http://localhost:4188/api/auth/login' -Method Post -ContentType 'application/json' -Body '{"mobile":"9000000000","password":"selftest-password"}' -SessionVariable s
    $page = Invoke-WebRequest 'http://localhost:4188/' -UseBasicParsing
    if ($page.Content -notmatch '<div id="root">') { throw 'The packaged server did not serve the web app.' }
    $meds = Invoke-RestMethod "http://localhost:4188/api/b/$($login.branches[0].slug)/medicines" -WebSession $s
    Write-Host "Self-test OK: signed in as $($login.user.name) of '$($login.organization.name)', branch '$($login.branches[0].name)', $($meds.medicines.Count) medicines, web app served." -ForegroundColor Green
    Run 'backup' { & "$Out\HMS\node\node.exe" setup.mjs backup "$test\backup.db" }
  } finally { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
} finally {
  Pop-Location
  Remove-Item Env:PORT, Env:DATABASE_URL, Env:MIGRATIONS_DIR, Env:WEB_DIR, Env:OWNER_MOBILE, Env:OWNER_PASSWORD -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 500
  Remove-Item $test -Recurse -Force -ErrorAction SilentlyContinue
}

Step 'Safety: no database may be on the pendrive'
$dbs = Get-ChildItem $Out -Recurse -Include '*.db', '*.db-wal', '*.db-shm' -File
if ($dbs) { throw "Database files found in the package: $($dbs.FullName -join ', ')" }

$size = [math]::Round((Get-ChildItem $Out -Recurse -File | Measure-Object Length -Sum).Sum / 1MB)
$count = (Get-ChildItem $Out -Recurse -File).Count
Write-Host "`nDONE: $Out  ($size MB, $count files). Copy everything inside it to the root of the pendrive." -ForegroundColor Green
