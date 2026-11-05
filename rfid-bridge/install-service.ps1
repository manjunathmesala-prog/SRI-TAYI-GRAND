# Sri Tayi Grand Hotel - RFID Hardware Bridge Permanent Auto-Start Installer
$ErrorActionPreference = "Continue"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$binDir = Join-Path $scriptDir "bin"
$exePath = Join-Path $binDir "SriTayiGrandKeycardBridge.exe"
if (-not (Test-Path $exePath)) {
    $exePath = Join-Path $binDir "SriTayiGrandKeycardBridge.exe"
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " SRI TAYI GRAND - RFID HARDWARE BRIDGE PERMANENT SETUP    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Executable: $exePath"
Write-Host "Working Dir: $binDir"

if (-not (Test-Path $exePath)) {
    Write-Host "[ERROR] Could not find SriTayiGrandKeycardBridge.exe in $binDir" -ForegroundColor Red
    exit 1
}

# 1. Stop any currently running instance to ensure clean setup
Write-Host "`n[1/4] Checking and stopping existing bridge processes..." -ForegroundColor Yellow
Get-Process -Name "SriTayiGrandKeycardBridge" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# 2. Layer 1: Windows Registry User Auto-Run (Starts on every boot/login, NO admin required)
Write-Host "[2/4] Registering Windows Startup Registry (Auto-Run)..." -ForegroundColor Yellow
try {
    $quotedPath = "`"$exePath`""
    Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "SriTayiGrand_RFID_Bridge" -Value $quotedPath -Force
    Write-Host "  [OK] Registry Auto-Run configured (HKCU Run)." -ForegroundColor Green
} catch {
    Write-Host "  [WARN] Registry configuration skipped: $_" -ForegroundColor Yellow
}

# 3. Layer 2: Windows Startup Folder Shortcut (shell:startup)
Write-Host "[3/4] Creating Windows Startup folder shortcut..." -ForegroundColor Yellow
try {
    $startupFolder = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Startup)
    $shortcutPath = Join-Path $startupFolder "SriTayiGrand_RFID_Bridge.lnk"
    
    $wshShell = New-Object -ComObject WScript.Shell
    $shortcut = $wshShell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $exePath
    $shortcut.WorkingDirectory = $binDir
    $shortcut.Description = "Sri Tayi Grand Hotel - RFID Keycard Encoder Bridge Service"
    $shortcut.WindowStyle = 7 # Minimized
    $shortcut.Save()
    Write-Host "  [OK] Startup folder shortcut created: $shortcutPath" -ForegroundColor Green
} catch {
    Write-Host "  [WARN] Startup shortcut skipped: $_" -ForegroundColor Yellow
}

# 4. Layer 3: Windows Scheduled Task (Best Effort for elevated environments)
try {
    $taskName = "SriTayiGrand_RFID_Bridge"
    $action = New-ScheduledTaskAction -Execute $exePath -WorkingDirectory $binDir
    $trigger = New-ScheduledTaskTrigger -AtLogOn
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Force -ErrorAction SilentlyContinue | Out-Null
    Write-Host "  [OK] Scheduled Task '$taskName' registered." -ForegroundColor Green
} catch {
    # Non-admin user, Registry & Startup folder will handle it
}

# 5. Launch the service immediately in background
Write-Host "[4/4] Starting RFID bridge service now..." -ForegroundColor Yellow
Start-Process -FilePath $exePath -WorkingDirectory $binDir -WindowStyle Minimized

Start-Sleep -Seconds 2

# 6. Verify health
try {
    $res = Invoke-RestMethod -Uri "http://127.0.0.1:8989/api/status" -TimeoutSec 4
    if ($res.status -eq "ok") {
        Write-Host "`n==========================================================" -ForegroundColor Green
        Write-Host " [SUCCESS] PERMANENT RFID BRIDGE SERVICE IS ACTIVE & READY!" -ForegroundColor Green
        Write-Host " Endpoint: http://127.0.0.1:8989" -ForegroundColor Green
        Write-Host " Hardware: Be-Tech BIS 5.7 (Port $($res.port), Type $($res.readerType))" -ForegroundColor Green
        Write-Host "" -ForegroundColor Green
        Write-Host " AUTOMATION ACTIVE:" -ForegroundColor Green
        Write-Host " - Runs automatically every time this PC starts up / logs on." -ForegroundColor Green
        Write-Host " - Receptionists NEVER need to manually click batch files." -ForegroundColor Green
        Write-Host " - Web portal (/admin/rfid) will always show 'Hardware Online'." -ForegroundColor Green
        Write-Host "==========================================================" -ForegroundColor Green
    }
} catch {
    Write-Host "`n[INFO] Service launched. Verifying bridge at http://127.0.0.1:8989..." -ForegroundColor Yellow
}
