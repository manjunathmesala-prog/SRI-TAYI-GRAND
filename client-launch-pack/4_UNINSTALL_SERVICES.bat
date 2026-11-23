@echo off
title Sri Tayi Grand - Uninstall RFID Services
echo ==========================================================
echo   SRI TAYI GRAND - UNINSTALL RFID SERVICES
echo ==========================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "& {
    Get-Process -Name 'SriTayiGrandKeycardBridge' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Remove-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'SriTayiGrand_RFID_Bridge' -ErrorAction SilentlyContinue
    $startupLnk = Join-Path ([System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Startup)) 'SriTayiGrand_RFID_Bridge.lnk'
    if (Test-Path $startupLnk) { Remove-Item $startupLnk -Force -ErrorAction SilentlyContinue }
    Unregister-ScheduledTask -TaskName 'SriTayiGrand_RFID_Bridge' -Confirm:$false -ErrorAction SilentlyContinue
    & '%~dp0bin\cloudflared.exe' service uninstall 2>nul
    Write-Host 'All RFID services and auto-start entries uninstalled cleanly.' -ForegroundColor Green
}"
echo.
pause
