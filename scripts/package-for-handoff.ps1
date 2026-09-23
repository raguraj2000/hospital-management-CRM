<#
.SYNOPSIS
  Builds a ready-to-copy PENDRIVE folder for installing the clinic system on
  computers with NO internet. Run on the developer PC (which has internet).

  Output: handoff\PENDRIVE\
      INSTALL AADHI HOSPITAL.bat     <- ONE-CLICK install (main computer)
      SETUP GUIDE.txt                <- installation guide
      Aadhi Hospital\                <- copy this folder to C:\ on the main computer
          Install Main Computer.bat
          Check System.bat
          node_modules\  (offline, compiled for this PC's Node.js version)
          tools\nssm.exe (service wrapper -- no winget/internet needed)
          apps\server, packages\shared, scripts\ ...
      Installers\
          node-vXX-x64.msi                       <- same Node.js version as this PC
          Aadhi Hospital_X_x64-setup.exe         <- desktop app, for every computer
          MicrosoftEdgeWebView2-x64-offline.exe  <- only if the app won't open (Windows 10)

  Never included: any database (apps\server\data) -- that holds THIS PC's
  test patients -- the client app source, or the Rust build folder.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\package-for-handoff.ps1
#>

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$handoffDir = Join-Path $repoRoot "handoff"
$outDir = Join-Path $handoffDir "PENDRIVE"
$pkgDir = Join-Path $outDir "Aadhi Hospital"
$instDir = Join-Path $outDir "Installers"
$cacheDir = Join-Path $handoffDir "download-cache"

function Robo([string]$From, [string]$To, [string[]]$Extra) {
    robocopy $From $To /E /XJ /NFL /NDL /NJH /NJS /NP @Extra | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "robocopy $From -> $To failed (exit $LASTEXITCODE)" }
    $global:LASTEXITCODE = 0
}

Push-Location $repoRoot
try {
    # 1. node_modules must work on this Node.js -- the client gets the same version.
    $nodeVersion = (node --version).Trim()
    Write-Host "Node.js on this PC: $nodeVersion" -ForegroundColor Cyan
    $prev = $ErrorActionPreference; $ErrorActionPreference = "Continue"
    $check = node -e "require('argon2');require('better-sqlite3')(':memory:').close();console.log('native-ok')" 2>&1 | Out-String
    $ErrorActionPreference = $prev
    if ($check -notmatch "native-ok") {
        Write-Host $check -ForegroundColor DarkGray
        throw "better-sqlite3/argon2 don't load on $nodeVersion. Run 'npm rebuild better-sqlite3' first."
    }

    # Never ship a better-sqlite3 build that hits the Node 24.19+ ObjectWrap
    # crash (see scripts\check-native-gc.cjs) -- it randomly kills the clinic
    # server under normal load.
    Write-Host "Checking the database module for the Node 24.19+ crash..." -ForegroundColor Cyan
    $prev = $ErrorActionPreference; $ErrorActionPreference = "Continue"
    $gcCheck = node scripts\check-native-gc.cjs 2>&1 | Out-String
    $ErrorActionPreference = $prev
    if ($gcCheck -notmatch "native-gc-ok") {
        Write-Host $gcCheck -ForegroundColor DarkGray
        throw "better-sqlite3 was built against Node >= 24.19 headers and crashes. Rebuild it against 24.18.1 headers (see scripts\check-native-gc.cjs), then package again."
    }

    # 2. Fresh build so dist\ matches the source being shipped.
    Write-Host "Building server..." -ForegroundColor Cyan
    npm run build:server
    if ($LASTEXITCODE -ne 0) { throw "build failed" }

    # 3. Desktop installer must exist before we go further.
    $appExe = Get-ChildItem (Join-Path $repoRoot "apps\client\src-tauri\target\release\bundle\nsis") -Filter "*-setup.exe" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $appExe) { throw "Desktop installer not found. Build it first (in apps\client: npm run tauri build)." }

    # 4. NSSM, so the client never needs winget/internet.
    $nssmSrc = $null
    $nssmCmd = Get-Command nssm -ErrorAction SilentlyContinue
    if ($nssmCmd) { $nssmSrc = $nssmCmd.Source }
    if (-not $nssmSrc) {
        $nssmSrc = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter "nssm.exe" -Recurse -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -like "*win64*" } | Select-Object -First 1 -ExpandProperty FullName
    }
    if (-not $nssmSrc) { throw "nssm.exe not found. Install it once on this PC: winget install --id NSSM.NSSM -e" }

    # 5. Stage the server package.
    if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
    New-Item -ItemType Directory -Path $pkgDir, $instDir, (Join-Path $pkgDir "tools"), (Join-Path $pkgDir "scripts") -Force | Out-Null

    Write-Host "Copying server files..." -ForegroundColor Cyan
    Copy-Item "package.json", "package-lock.json" $pkgDir
    Robo (Join-Path $repoRoot "apps\server") (Join-Path $pkgDir "apps\server") @("/XD", "data", "node_modules", "tests", "/XF", "*.log", "*.db", "*.db-wal", "*.db-shm")
    Robo (Join-Path $repoRoot "packages\shared") (Join-Path $pkgDir "packages\shared") @("/XD", "node_modules")
    # apps\client is a workspace in package.json; npm needs its package.json
    # present, but none of its source.
    New-Item -ItemType Directory -Path (Join-Path $pkgDir "apps\client") -Force | Out-Null
    Copy-Item "apps\client\package.json" (Join-Path $pkgDir "apps\client")

    Write-Host "Copying node_modules (this takes a minute)..." -ForegroundColor Cyan
    # /XJ skips the @clinic/* workspace links (they'd point at this PC);
    # setup-main-computer.ps1 recreates them on the client.
    Robo (Join-Path $repoRoot "node_modules") (Join-Path $pkgDir "node_modules") @("/XD", ".cache", ".vite")

    Copy-Item "scripts\setup-main-computer.ps1", "scripts\verify-install.ps1", "scripts\one-click-install.ps1",
        "scripts\clinic-common.ps1", "scripts\db-tool.cjs", "scripts\backup-to-pendrive.ps1", "scripts\restore-backup.ps1",
        "scripts\reset-admin-password.ps1", "scripts\collect-support-info.ps1" (Join-Path $pkgDir "scripts")
    # Shown by the installer ("UPDATE: old -> new") and in Collect Support Info.
    $appVersion = (Get-Content "apps\client\src-tauri\tauri.conf.json" -Raw | ConvertFrom-Json).version
    Set-Content -Path (Join-Path $pkgDir "version.txt") -Value "$appVersion (built $(Get-Date -Format 'yyyy-MM-dd HH:mm'))" -Encoding ASCII
    Copy-Item "scripts\pendrive-top\*.bat" $outDir
    Copy-Item "scripts\pendrive-root\*.bat" $pkgDir
    Copy-Item $nssmSrc (Join-Path $pkgDir "tools\nssm.exe")
    Set-Content -Path (Join-Path $pkgDir "node-version.txt") -Value $nodeVersion -Encoding ASCII
    # Plain .txt with Windows line endings: opens in Notepad on any PC
    # (a fresh Windows may have no app associated with .md).
    $guide = ((Get-Content "README.md" -Raw -Encoding UTF8) -replace "`r?`n", "`r`n")
    foreach ($dest in @($outDir, $pkgDir)) {
        [IO.File]::WriteAllText((Join-Path $dest "SETUP GUIDE.txt"), $guide, (New-Object Text.UTF8Encoding $true))
    }

    # Safety net: never ship a database.
    $leaked = Get-ChildItem $pkgDir -Recurse -Include "*.db", "*.db-wal", "*.db-shm" -File -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notlike "*\node_modules\*" }
    if ($leaked) { throw "A database file ended up in the package: $($leaked[0].FullName)" }

    # 6. Installers.
    Write-Host "Collecting installers..." -ForegroundColor Cyan
    Copy-Item $appExe.FullName $instDir
    New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
    $downloads = @(
        @{ Name = "node-$nodeVersion-x64.msi"; Url = "https://nodejs.org/dist/$nodeVersion/node-$nodeVersion-x64.msi" },
        # Evergreen Standalone (offline) installer, x64
        @{ Name = "MicrosoftEdgeWebView2-x64-offline.exe"; Url = "https://go.microsoft.com/fwlink/?linkid=2124701" }
    )
    foreach ($d in $downloads) {
        $cached = Join-Path $cacheDir $d.Name
        if (-not (Test-Path $cached)) {
            Write-Host "  downloading $($d.Name)..."
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            $ProgressPreference = "SilentlyContinue"
            Invoke-WebRequest -Uri $d.Url -OutFile "$cached.part" -UseBasicParsing
            Move-Item "$cached.part" $cached -Force
        }
        Copy-Item $cached $instDir
    }
} finally {
    Pop-Location
}

$sizeMb = [math]::Round(((Get-ChildItem $outDir -Recurse -File | Measure-Object Length -Sum).Sum / 1MB))
Write-Host ""
Write-Host "Done: $outDir  ($sizeMb MB)" -ForegroundColor Green
Write-Host "Copy EVERYTHING inside that PENDRIVE folder to the root of the pendrive, then follow SETUP GUIDE.txt." -ForegroundColor Green
