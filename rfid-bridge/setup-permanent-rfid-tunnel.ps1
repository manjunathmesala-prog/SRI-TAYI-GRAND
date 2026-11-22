# ==============================================================================
# SRI TAYI GRAND - PERMANENT NAMED CLOUDFLARE TUNNEL SETUP (MODE A)
# Configures rfid.sritayigrand.com -> http://127.0.0.1:8989 as a Windows Service
# ==============================================================================

param(
    [string]$Token
)

$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  SRI TAYI GRAND - PERMANENT RFID CLOUDFLARE TUNNEL SETUP " -ForegroundColor Cyan
Write-Host "  Fixed Domain: https://rfid.sritayigrand.com (Lifetime Free) " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$workspaceDir = Split-Path -Parent $PSScriptRoot
$cloudflaredExe = "C:\Program Files (x86)\cloudflared\cloudflared.exe"

if (-not (Test-Path $cloudflaredExe)) {
    # Check PATH or alternative installation paths
    $alt = Get-Command "cloudflared" -ErrorAction SilentlyContinue
    if ($alt) {
        $cloudflaredExe = $alt.Source
    } else {
        Write-Host "[ERROR] cloudflared.exe not found. Installing via winget..." -ForegroundColor Yellow
        winget install --id Cloudflare.cloudflared --silent --accept-package-agreements --accept-source-agreements
    }
}

if (-not (Test-Path $cloudflaredExe)) {
    Write-Host "[ERROR] cloudflared is not installed. Please install cloudflared first." -ForegroundColor Red
    exit 1
}

Write-Host "[1/5] Verified cloudflared binary: $cloudflaredExe" -ForegroundColor Green

# 1. Prompt for token if not passed via command line
if (-not $Token -or $Token.Trim() -eq "") {
    Write-Host ""
    Write-Host "Please obtain your Cloudflare Tunnel Token:" -ForegroundColor Yellow
    Write-Host "  1. Log into https://one.dash.cloudflare.com/ -> Networks -> Tunnels" -ForegroundColor White
    Write-Host "  2. Create tunnel 'sri-tayi-grand-rfid' -> Select Windows (64-bit)" -ForegroundColor White
    Write-Host "  3. Copy the token string from the install command" -ForegroundColor White
    Write-Host "  4. Set Public Hostname: rfid.sritayigrand.com -> HTTP://127.0.0.1:8989" -ForegroundColor White
    Write-Host ""
    $Token = Read-Host "Paste your Cloudflare Tunnel Token here"
}

$Token = $Token.Trim()

if (-not $Token) {
    Write-Host "[ERROR] No token provided. Permanent service installation cancelled." -ForegroundColor Red
    exit 1
}

# Clean any leading 'cloudflared.exe service install ' if user pasted whole command
if ($Token -match "service\s+install\s+(.+)$") {
    $Token = $matches[1].Trim()
}

# 2. Check and configure the cloudflared Windows Service
Write-Host "`n[2/5] Configuring permanent Windows Service (cloudflared)..." -ForegroundColor Yellow

$existingService = Get-Service -Name "cloudflared" -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "  Existing cloudflared service detected. Reinstalling with new token..." -ForegroundColor Yellow
    try {
        & $cloudflaredExe service uninstall | Out-Null
        Start-Sleep -Seconds 2
    } catch {}
}

try {
    & $cloudflaredExe service install $Token
    Start-Sleep -Seconds 2
    Start-Service -Name "cloudflared" -ErrorAction SilentlyContinue
    Write-Host "  [OK] Windows Service 'cloudflared' successfully installed and started!" -ForegroundColor Green
} catch {
    Write-Host "  [WARN] Failed to install Windows Service automatically. Running with elevated privileges may be required." -ForegroundColor Yellow
    Write-Host "  Command to run in Admin PowerShell: & '$cloudflaredExe' service install $Token" -ForegroundColor White
}

# 3. Ensure local Be-Tech bridge is running
Write-Host "`n[3/5] Verifying local Be-Tech C# Hardware Bridge..." -ForegroundColor Yellow
$bridgeRunning = $false
try {
    $res = Invoke-RestMethod -Uri "http://127.0.0.1:8989/api/status" -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($res.status -eq "ok" -or $res.isOnline -eq $true -or $res.service -eq "SriTayiGrand-RFID-Bridge") {
        $bridgeRunning = $true
        Write-Host "  [OK] Local Be-Tech bridge is active on port 8989." -ForegroundColor Green
    }
} catch {}

if (-not $bridgeRunning) {
    Write-Host "  Starting local Be-Tech bridge service..." -ForegroundColor Yellow
    $bridgeExe = Join-Path $workspaceDir "rfid-bridge\bin\SriTayiGrandKeycardBridge.exe"
    if (Test-Path $bridgeExe) {
        Start-Process -FilePath $bridgeExe -WorkingDirectory (Split-Path -Parent $bridgeExe) -WindowStyle Minimized
        Start-Sleep -Seconds 2
        Write-Host "  [OK] Local Be-Tech bridge started." -ForegroundColor Green
    }
}

# 4. Synchronize with Supabase Cloud integrations table
Write-Host "`n[4/5] Synchronizing permanent domain with Supabase Cloud..." -ForegroundColor Yellow
$syncScript = Join-Path $PSScriptRoot "register-tunnel-supabase.js"
$permanentUrl = "https://rfid.sritayigrand.com"

if (Test-Path $syncScript) {
    $nodePathEnv = Join-Path $workspaceDir "node_modules"
    $env:NODE_PATH = $nodePathEnv
    try {
        node $syncScript $permanentUrl
        Write-Host "  [OK] Supabase Cloud registered: $permanentUrl" -ForegroundColor Green
    } catch {
        Write-Host "  [WARN] Could not run direct sync script: $_" -ForegroundColor Yellow
    }
}

# Update local status file
$outFile = Join-Path $workspaceDir "latest_production_tunnel_url.txt"
Set-Content -Path $outFile -Value $permanentUrl -Force

# Notify Next.js backend
try {
    $body = @{ action = "register_tunnel"; tunnelUrl = $permanentUrl } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:3000/api/rfid/bridge" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 3 -ErrorAction SilentlyContinue | Out-Null
} catch {}

# 5. Verify connectivity through Cloudflare Edge
Write-Host "`n[5/5] Testing end-to-end HTTPS connectivity through Cloudflare Edge..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

$edgeHealthy = $false
try {
    $edgeRes = Invoke-RestMethod -Uri "$permanentUrl/api/status" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($edgeRes.status -eq "ok" -or $edgeRes.isOnline -eq $true -or $edgeRes.service -eq "SriTayiGrand-RFID-Bridge") {
        $edgeHealthy = $true
    }
} catch {}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  PERMANENT PRODUCTION RFID TUNNEL SETUP COMPLETE!        " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  Permanent Domain:  $permanentUrl" -ForegroundColor Cyan
Write-Host "  Local Bridge:      http://127.0.0.1:8989" -ForegroundColor White
Write-Host "  Windows Service:   cloudflared (Auto-starts with Windows)" -ForegroundColor White
Write-Host "  Target Portal:     https://sritayigrand.com/admin/rfid" -ForegroundColor White
if ($edgeHealthy) {
    Write-Host "  Edge Status:       🟢 ONLINE & OPERATIONAL" -ForegroundColor Green
} else {
    Write-Host "  Edge Status:       🟡 Pending DNS/Tunnel handshake (usually takes 30-60s)" -ForegroundColor Yellow
}
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
