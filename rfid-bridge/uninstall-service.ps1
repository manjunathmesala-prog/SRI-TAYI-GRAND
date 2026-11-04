# Sri Tayi Grand Hotel - RFID Hardware Bridge Uninstaller
$ErrorActionPreference = "SilentlyContinue"

Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host " SRI TAYI GRAND - UNINSTALL RFID HARDWARE BRIDGE SERVICE   " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Yellow

# 1. Stop running process
Get-Process -Name "SriAnanthaKeycardBridge" -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "[1/4] Stopped running RFID bridge processes."

# 2. Remove Registry Auto-Run
Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "SriTayiGrand_RFID_Bridge" -ErrorAction SilentlyContinue
Write-Host "[2/4] Removed Registry Auto-Run entry."

# 3. Remove Startup folder shortcut
$startupFolder = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Startup)
$shortcutPath = Join-Path $startupFolder "SriTayiGrand_RFID_Bridge.lnk"
if (Test-Path $shortcutPath) {
    Remove-Item -Path $shortcutPath -Force
    Write-Host "[3/4] Removed Windows Startup shortcut."
} else {
    Write-Host "[3/4] No Startup shortcut found."
}

# 4. Remove Scheduled Task
Unregister-ScheduledTask -TaskName "SriTayiGrand_RFID_Bridge" -Confirm:$false -ErrorAction SilentlyContinue
Write-Host "[4/4] Removed Scheduled Task."

Write-Host "`n[SUCCESS] RFID bridge service completely removed from system startup." -ForegroundColor Green
