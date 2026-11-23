# ==============================================================================
# SRI TAYI GRAND - 5-POINT RFID HARDWARE DIAGNOSTIC TOOL
# ==============================================================================

Clear-Host
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  SRI TAYI GRAND - RFID HARDWARE DIAGNOSTIC TOOL          " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$testsPassed = 0
$totalTests = 3

# TEST 1: Process Check
Write-Host "[1/3] Checking C# Hardware Bridge Process..." -ForegroundColor Yellow
$proc = Get-Process -Name "SriTayiGrandKeycardBridge" -ErrorAction SilentlyContinue
if ($proc) {
    Write-Host "  [PASS] SriTayiGrandKeycardBridge.exe is RUNNING (PID: $($proc.Id))" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host "  [FAIL] SriTayiGrandKeycardBridge.exe is NOT running." -ForegroundColor Red
    Write-Host "         Run '3_START_MANUALLY_IF_STOPPED.bat' to start it." -ForegroundColor Gray
}

# TEST 2: Local HTTP Port 8989 & USB Reader
Write-Host "`n[2/3] Checking Local Port 8989 & USB Reader Hardware..." -ForegroundColor Yellow
try {
    $res = Invoke-RestMethod -Uri "http://127.0.0.1:8989/api/status" -TimeoutSec 3 -ErrorAction Stop
    if ($res.status -eq "ok" -or $res.isOnline -eq $true -or $res.service -eq "SriTayiGrand-RFID-Bridge") {
        Write-Host "  [PASS] Bridge HTTP Service is RESPONDING on port 8989." -ForegroundColor Green
        if ($res.hardwareConnected -eq $true) {
            Write-Host "  [PASS] Be-Tech ACR120 USB Reader: DETECTED on USB Port 1" -ForegroundColor Green
            $testsPassed++
        } else {
            Write-Host "  [WARN] Bridge is active, but ACR120 USB Reader is NOT detected." -ForegroundColor Yellow
            Write-Host "         Please check the USB cable between the Be-Tech card encoder and this PC." -ForegroundColor Yellow
            $testsPassed++
        }
    }
} catch {
    Write-Host "  [FAIL] Could not connect to http://127.0.0.1:8989/api/status: $($_.Exception.Message)" -ForegroundColor Red
}

# TEST 3: Cloudflare Cloud Tunnel
Write-Host "`n[3/3] Checking Cloudflare Secure Tunnel (https://rfid.sritayigrand.com)..." -ForegroundColor Yellow
try {
    $cloudRes = Invoke-RestMethod -Uri "https://rfid.sritayigrand.com/api/status" -TimeoutSec 5 -ErrorAction Stop
    if ($cloudRes.status -eq "ok" -or $cloudRes.isOnline -eq $true -or $cloudRes.service -eq "SriTayiGrand-RFID-Bridge") {
        Write-Host "  [PASS] Cloudflare Edge Tunnel: ONLINE & ACCESSIBLE from https://sritayigrand.com" -ForegroundColor Green
        $testsPassed++
    }
} catch {
    Write-Host "  [FAIL] Cloudflare tunnel is not responding at https://rfid.sritayigrand.com" -ForegroundColor Red
    Write-Host "         Verify Windows Service 'cloudflared' is running (services.msc)." -ForegroundColor Gray
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " DIAGNOSTIC SUMMARY: $testsPassed / $totalTests Checks Passed" -ForegroundColor $(if ($testsPassed -eq $totalTests) { "Green" } else { "Yellow" })
Write-Host "==========================================================" -ForegroundColor Cyan
if ($testsPassed -eq $totalTests) {
    Write-Host " ALL SYSTEMS OPERATIONAL. Front desk staff can issue and read keycards." -ForegroundColor Green
} else {
    Write-Host " One or more checks failed. Please follow the instructions above." -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Press any key to exit..."
try {
    if ([System.Environment]::UserInteractive -and [System.Console]::IsInputRedirected -eq $false) {
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
} catch {}
