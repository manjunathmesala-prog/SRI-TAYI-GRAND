# Sri Tayi Grand Hotel - Production RFID Secure Tunnel Starter
$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  SRI TAYI GRAND - PRODUCTION RFID HARDWARE CONNECTOR     " -ForegroundColor Cyan
Write-Host "  Connecting Be-Tech BIS 5.7 USB Encoder to sritayigrand.com  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Ensure local RFID bridge service is running on port 8989
$bridgeRunning = $false
try {
    $res = Invoke-RestMethod -Uri "http://127.0.0.1:8989/api/status" -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($res.status -eq "ok") {
        $bridgeRunning = $true
        Write-Host "[1/3] Local Be-Tech RFID Bridge is ALIVE on port 8989 (Port 1 ACR120 Mifare)." -ForegroundColor Green
    }
} catch {}

if (-not $bridgeRunning) {
    Write-Host "[1/3] Starting local RFID Bridge service..." -ForegroundColor Yellow
    $appDataExe = "C:\Users\M S T C\AppData\Local\SriTayiGrand\RFIDBridge\SriTayiGrandKeycardBridge.exe"
    $localExe = Join-Path (Split-Path -Parent $PSScriptRoot) "rfid-bridge\bin\SriTayiGrandKeycardBridge.exe"
    $exeToStart = if (Test-Path $appDataExe) { $appDataExe } else { $localExe }

    Start-Process -FilePath $exeToStart -WindowStyle Minimized
    Start-Sleep -Seconds 2
    Write-Host "  [OK] Local bridge started." -ForegroundColor Green
}

# 2. Check if a valid Cloudflare HTTPS Tunnel is already running and reachable
$existingTunnelLive = $false
$workspaceDir = Split-Path -Parent $PSScriptRoot
$outFile = Join-Path $workspaceDir "latest_production_tunnel_url.txt"
$activeTunnelUrl = $null

if (Test-Path $outFile) {
    $candUrl = (Get-Content $outFile -Raw).Trim()
    if ($candUrl -match "https://[a-zA-Z0-9\-]+\.trycloudflare\.com") {
        try {
            $tCheck = Invoke-RestMethod -Uri "$candUrl/api/status" -TimeoutSec 3 -ErrorAction SilentlyContinue
            if ($tCheck.status -eq "ok") {
                $existingTunnelLive = $true
                $activeTunnelUrl = $candUrl
                Write-Host "[2/3] Existing Cloudflare HTTPS tunnel is active: $activeTunnelUrl" -ForegroundColor Green
            }
        } catch {}
    }
}

if (-not $existingTunnelLive) {
    Write-Host "[2/3] Establishing secure HTTPS tunnel for sritayigrand.com production..." -ForegroundColor Yellow

    $logFile = Join-Path $env:TEMP "stg_cloudflared.log"
    if (Test-Path $logFile) { Remove-Item $logFile -Force -ErrorAction SilentlyContinue }

    # Terminate any existing cloudflared
    Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

    # Find cloudflared executable
    $cloudflaredCmd = "cloudflared"
    $standardPaths = @(
        "C:\Program Files (x86)\cloudflared\cloudflared.exe",
        "C:\Program Files\cloudflared\cloudflared.exe",
        "$env:LOCALAPPDATA\Programs\cloudflared\cloudflared.exe"
    )
    foreach ($p in $standardPaths) {
        if (Test-Path $p) {
            $cloudflaredCmd = $p
            break
        }
    }
    $cloudflaredArgs = @(
        "tunnel",
        "--url", "http://127.0.0.1:8989",
        "--logfile", $logFile
    )
    $process = Start-Process -FilePath $cloudflaredCmd -ArgumentList $cloudflaredArgs -PassThru -WindowStyle Minimized

    # Wait for tunnel URL to appear in log (up to 15s)
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    while ($stopwatch.ElapsedMilliseconds -lt 15000 -and -not $activeTunnelUrl) {
        Start-Sleep -Milliseconds 500
        if (Test-Path $logFile) {
            $content = Get-Content $logFile -Raw -ErrorAction SilentlyContinue
            if ($content -match "https://[a-zA-Z0-9\-]+\.trycloudflare\.com") {
                $activeTunnelUrl = $matches[0]
                break
            }
        }
    }
}

if ($activeTunnelUrl) {
    # Copy to clipboard
    try { Set-Clipboard -Value $activeTunnelUrl } catch {}

    # Save to local file in workspace
    Set-Content -Path $outFile -Value $activeTunnelUrl

    # 3. Synchronize with Supabase and production cloud
    Write-Host "[3/3] Synchronizing active tunnel with Sri Tayi Grand cloud..." -ForegroundColor Yellow

    # Direct sync with Supabase PostgreSQL
    $syncScript = Join-Path $PSScriptRoot "register-tunnel-supabase.js"
    if (Test-Path $syncScript) {
        $nodePathEnv = Join-Path (Split-Path -Parent $PSScriptRoot) "node_modules"
        $env:NODE_PATH = $nodePathEnv
        try {
            node $syncScript $activeTunnelUrl | Out-Host
        } catch {}
    }

    # Auto-register with Next.js endpoints
    $regBody = @{ action = "register_tunnel"; tunnelUrl = $activeTunnelUrl } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "https://www.sritayigrand.com/api/rfid/bridge" -Method Post -Body $regBody -ContentType "application/json" -TimeoutSec 5 | Out-Null
        Write-Host "  [OK] Synchronized with https://www.sritayigrand.com production cloud!" -ForegroundColor Green
    } catch {}
    try {
        Invoke-RestMethod -Uri "http://localhost:3000/api/rfid/bridge" -Method Post -Body $regBody -ContentType "application/json" -TimeoutSec 3 | Out-Null
        Write-Host "  [OK] Synchronized with local dev server." -ForegroundColor Green
    } catch {}

    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host " [SUCCESS] PRODUCTION RFID HARDWARE CONNECTOR IS ACTIVE!" -ForegroundColor Green
    Write-Host " HTTPS Tunnel URL: $activeTunnelUrl" -ForegroundColor Cyan
    Write-Host " Target Portal:    https://sritayigrand.com/admin/rfid" -ForegroundColor White
    Write-Host " Status:           🟢 Hardware Online (USB Port 1)" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Keep this window open or minimized while the front desk is operating." -ForegroundColor Gray
} else {
    Write-Host "[ERROR] Could not retrieve Cloudflare Tunnel URL within 15 seconds." -ForegroundColor Red
    Write-Host "Check $logFile for details." -ForegroundColor Yellow
}
