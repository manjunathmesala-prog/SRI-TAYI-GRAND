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
        Write-Host "[1/3] Local Be-Tech RFID Bridge is ALIVE on port 8989." -ForegroundColor Green
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

# 2. Start Cloudflare HTTPS Tunnel
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
    "--no-prechecks",
    "--protocol", "http2",
    "--logfile", $logFile
)
$process = Start-Process -FilePath $cloudflaredCmd -ArgumentList $cloudflaredArgs -PassThru -WindowStyle Minimized

# 3. Wait for tunnel URL to appear in log (up to 15s)
$tunnelUrl = $null
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

while ($stopwatch.ElapsedMilliseconds -lt 15000 -and -not $tunnelUrl) {
    Start-Sleep -Milliseconds 500
    if (Test-Path $logFile) {
        $content = Get-Content $logFile -Raw -ErrorAction SilentlyContinue
        if ($content -match "https://[a-zA-Z0-9\-]+\.trycloudflare\.com") {
            $tunnelUrl = $matches[0]
            break
        }
    }
}

if ($tunnelUrl) {
    # Copy to clipboard
    try { Set-Clipboard -Value $tunnelUrl } catch {}

    # Save to file in workspace
    $outFile = Join-Path (Split-Path -Parent $PSScriptRoot) "latest_production_tunnel_url.txt"
    Set-Content -Path $outFile -Value $tunnelUrl

    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host " [SUCCESS] PRODUCTION RFID TUNNEL IS LIVE!" -ForegroundColor Green
    Write-Host " HTTPS URL: $tunnelUrl" -ForegroundColor Cyan
    Write-Host " (Copied to your Windows clipboard automatically!)" -ForegroundColor Yellow
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "HOW TO ACTIVATE IN PRODUCTION (ONE-TIME / 10 SECONDS):" -ForegroundColor White
    Write-Host "1. In your browser on https://sritayigrand.com/admin/rfid" -ForegroundColor White
    Write-Host "2. Click the 'Bridge Host' button (top right next to Refresh)" -ForegroundColor White
    Write-Host "3. Press Ctrl+V to paste the URL: $tunnelUrl" -ForegroundColor Yellow
    Write-Host "4. Click 'Save Host Setting'" -ForegroundColor White
    Write-Host ""
    Write-Host "RESULT: Status turns 🟢 Hardware Online (USB Port 1)" -ForegroundColor Green
    Write-Host "You can now Issue Customer Cards, Super Admin keys, and Cleaner cards from anywhere!" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green

    # Launch browser
    Start-Process "https://sritayigrand.com/admin/rfid"
} else {
    Write-Host "[ERROR] Could not retrieve Cloudflare Tunnel URL within 15 seconds." -ForegroundColor Red
    Write-Host "Check $logFile for details." -ForegroundColor Yellow
}
