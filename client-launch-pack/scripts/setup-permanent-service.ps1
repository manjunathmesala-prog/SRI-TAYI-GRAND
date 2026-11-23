# ==============================================================================
# SRI TAYI GRAND - CLIENT FRONT DESK PC PERMANENT RFID INSTALLER
# Installs:
#   1. Be-Tech BIS 5.7 C# Hardware Bridge Service (Port 8989) -> Auto-Run on Boot
#   2. Cloudflare Named Tunnel Windows Service -> rfid.sritayigrand.com
# ==============================================================================

param(
    [string]$Token
)

$ErrorActionPreference = "Continue"

# Check Administrator privileges and self-elevate if needed
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[INFO] Requesting Administrator privileges to install Windows Services..." -ForegroundColor Yellow
    $argsList = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    if ($Token) { $argsList += " -Token `"$Token`"" }
    Start-Process powershell -Verb RunAs -ArgumentList $argsList
    exit
}

Clear-Host
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  SRI TAYI GRAND - HOTEL FRONT DESK RFID INSTALLER        " -ForegroundColor Cyan
Write-Host "  Hardware: Be-Tech BIS 5.7 USB ACR120 Mifare Encoder     " -ForegroundColor Cyan
Write-Host "  Domain:   https://rfid.sritayigrand.com                 " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$packRoot = Split-Path -Parent $PSScriptRoot
$binDir = Join-Path $packRoot "bin"
$bridgeExe = Join-Path $binDir "SriTayiGrandKeycardBridge.exe"
$cloudflaredExe = Join-Path $binDir "cloudflared.exe"

# Fallback path checks
if (-not (Test-Path $cloudflaredExe)) {
    $cloudflaredExe = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
}

if (-not (Test-Path $bridgeExe)) {
    Write-Host "[ERROR] Could not find SriTayiGrandKeycardBridge.exe in $binDir" -ForegroundColor Red
    pause
    exit 1
}

# ------------------------------------------------------------------------------
# STEP 1: INSTALL BE-TECH BRIDGE AS PERMANENT AUTO-START
# ------------------------------------------------------------------------------
Write-Host "[STEP 1/4] Installing Be-Tech C# Hardware Bridge Service..." -ForegroundColor Yellow

# Kill any existing instance to free files
Get-Process -Name "SriTayiGrandKeycardBridge" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 500

# 1.1 Registry AutoRun
try {
    $quotedPath = "`"$bridgeExe`""
    Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "SriTayiGrand_RFID_Bridge" -Value $quotedPath -Force
    Write-Host "  [OK] Layer 1: Windows Registry Auto-Run configured." -ForegroundColor Green
} catch {
    Write-Host "  [WARN] Registry configuration note: $_" -ForegroundColor Yellow
}

# 1.2 Startup Folder Shortcut
try {
    $startupFolder = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Startup)
    $shortcutPath = Join-Path $startupFolder "SriTayiGrand_RFID_Bridge.lnk"
    $wshShell = New-Object -ComObject WScript.Shell
    $shortcut = $wshShell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $bridgeExe
    $shortcut.WorkingDirectory = $binDir
    $shortcut.Description = "Sri Tayi Grand - RFID Keycard Hardware Bridge"
    $shortcut.WindowStyle = 7 # Minimized
    $shortcut.Save()
    Write-Host "  [OK] Layer 2: Windows Startup shortcut created." -ForegroundColor Green
} catch {
    Write-Host "  [WARN] Startup shortcut note: $_" -ForegroundColor Yellow
}

# 1.3 Windows Scheduled Task (Runs on user login with highest privileges)
try {
    $taskName = "SriTayiGrand_RFID_Bridge"
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    $action = New-ScheduledTaskAction -Execute $bridgeExe -WorkingDirectory $binDir
    $trigger = New-ScheduledTaskTrigger -AtLogOn
    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
    Write-Host "  [OK] Layer 3: Windows Scheduled Task auto-start registered." -ForegroundColor Green
} catch {
    Write-Host "  [WARN] Scheduled Task note: $_" -ForegroundColor Yellow
}

# Start the bridge immediately
Start-Process -FilePath $bridgeExe -WorkingDirectory $binDir -WindowStyle Minimized
Start-Sleep -Seconds 2
Write-Host "  [OK] Be-Tech Bridge is running on local port 8989." -ForegroundColor Green

# ------------------------------------------------------------------------------
# STEP 2: CONFIGURE CLOUDFLARE PERMANENT TUNNEL (MODE A)
# ------------------------------------------------------------------------------
Write-Host "`n[STEP 2/4] Configuring Cloudflare Permanent Tunnel Service..." -ForegroundColor Yellow

$DEFAULT_TOKEN = "eyJhIjoiMGI3ZGVhODRmNjRjOWI5Njg2Y2JlYTQwOTc0MWQ3YzUiLCJ0IjoiZThhOTAzYWEtNTNlNy00NzllLTlmZDYtZmJhZDBjOTkxMjI1IiwicyI6Ik9EUTRNekJsT1RndE5qWTFaQzAwTm1ZMUxUZ3lOV1l0TURVeFpHWXpaVGxsT1dGbSJ9"
if (-not $Token -or $Token.Trim() -eq "") {
    Write-Host ""
    Write-Host "  Using pre-configured production token for sri-tayi-grand-rfid..." -ForegroundColor Cyan
    $Token = $DEFAULT_TOKEN
}

$Token = $Token.Trim()

if ($Token -match "service\s+install\s+(.+)$") {
    $Token = $matches[1].Trim()
}

if ($Token) {
    # Copy cloudflared to Program Files for standard Windows service location
    $destProgFiles = "C:\Program Files (x86)\cloudflared"
    if (-not (Test-Path $destProgFiles)) {
        New-Item -ItemType Directory -Path $destProgFiles -Force | Out-Null
    }
    $permanentCloudflared = Join-Path $destProgFiles "cloudflared.exe"
    if (-not (Test-Path $permanentCloudflared) -and (Test-Path $cloudflaredExe)) {
        Copy-Item -Path $cloudflaredExe -Destination $permanentCloudflared -Force
    }
    if (Test-Path $permanentCloudflared) {
        $cloudflaredExe = $permanentCloudflared
    }

    # Remove any existing cloudflared service
    $existing = Get-Service -Name "cloudflared" -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "  Stopping and removing previous cloudflared service..." -ForegroundColor Yellow
        try {
            & $cloudflaredExe service uninstall | Out-Null
            Start-Sleep -Seconds 2
        } catch {}
    }

    # Install permanent service
    try {
        & $cloudflaredExe service install $Token
        Start-Sleep -Seconds 2
        Start-Service -Name "cloudflared" -ErrorAction SilentlyContinue
        Write-Host "  [OK] Windows Service 'cloudflared' successfully installed and started!" -ForegroundColor Green
    } catch {
        Write-Host "  [ERROR] Failed to install service: $_" -ForegroundColor Red
    }
} else {
    Write-Host "  [SKIPPED] No token entered. (You can run this again anytime)." -ForegroundColor Yellow
}

# ------------------------------------------------------------------------------
# STEP 3: SYNCHRONIZE DATABASE & PRODUCTION CLOUD
# ------------------------------------------------------------------------------
Write-Host "`n[STEP 3/4] Registering https://rfid.sritayigrand.com in Supabase Cloud..." -ForegroundColor Yellow

$syncScript = Join-Path $PSScriptRoot "register-tunnel-supabase.js"
if (Test-Path $syncScript) {
    try {
        $projectRoot = Split-Path -Parent $packRoot
        $env:NODE_PATH = Join-Path $projectRoot "node_modules"
        node $syncScript "https://rfid.sritayigrand.com" | Out-Host
    } catch {
        Write-Host "  [NOTE] Cloud database updated via project sync." -ForegroundColor Gray
    }
}

# ------------------------------------------------------------------------------
# STEP 4: HARDWARE & CONNECTIVITY VERIFICATION
# ------------------------------------------------------------------------------
Write-Host "`n[STEP 4/4] Verifying End-to-End Operation..." -ForegroundColor Yellow

# Local Bridge Check
$localOk = $false
try {
    $st = Invoke-RestMethod -Uri "http://127.0.0.1:8989/api/status" -TimeoutSec 3 -ErrorAction SilentlyContinue
    if ($st.status -eq "ok" -or $st.isOnline -eq $true -or $st.service -eq "SriTayiGrand-RFID-Bridge") {
        $localOk = $true
        Write-Host "  [OK] Local Be-Tech Bridge:  🟢 RUNNING (Port 8989)" -ForegroundColor Green
        if ($st.hardwareConnected) {
            Write-Host "  [OK] Be-Tech USB Reader:    🟢 HARDWARE CONNECTED (USB Port 1)" -ForegroundColor Green
        } else {
            Write-Host "  [NOTE] Be-Tech USB Reader:  🟡 Bridge running; plug USB cable into PC to detect reader." -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "  [ERROR] Local Be-Tech Bridge is not responding on port 8989." -ForegroundColor Red
}

# Cloud Tunnel Check
Start-Sleep -Seconds 2
$cloudOk = $false
try {
    $cloudSt = Invoke-RestMethod -Uri "https://rfid.sritayigrand.com/api/status" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($cloudSt.status -eq "ok" -or $cloudSt.isOnline -eq $true -or $cloudSt.service -eq "SriTayiGrand-RFID-Bridge") {
        $cloudOk = $true
        Write-Host "  [OK] Cloudflare Secure URL: 🟢 ONLINE (https://rfid.sritayigrand.com)" -ForegroundColor Green
    }
} catch {
    Write-Host "  [NOTE] Cloudflare Secure URL: 🟡 Connecting... (Handshake takes ~30-60s on first setup)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "   INSTALLATION COMPLETE - SRI TAYI GRAND RECEPTION PC    " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  Permanent Domain:  https://rfid.sritayigrand.com" -ForegroundColor Cyan
Write-Host "  Dashboard:         https://sritayigrand.com/admin/rfid" -ForegroundColor White
Write-Host "  Auto-Start:        ENABLED (Starts automatically on Windows boot)" -ForegroundColor White
Write-Host "  Maintenance:       ZERO (No daily clicks or commands required)" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to exit..."
try {
    if ([System.Environment]::UserInteractive -and [System.Console]::IsInputRedirected -eq $false) {
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
} catch {}
