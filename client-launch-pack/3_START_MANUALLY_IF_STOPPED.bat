@echo off
title Sri Tayi Grand - Start RFID Services Manually
echo ==========================================================
echo   SRI TAYI GRAND - RESTART RFID SERVICES
echo ==========================================================
echo.
echo Starting local Be-Tech C# Hardware Bridge...
start "" /min "%~dp0bin\SriTayiGrandKeycardBridge.exe"
timeout /t 2 >nul

echo Starting cloudflared service...
net start cloudflared >nul 2>&1

echo Checking local bridge status...
powershell -NoProfile -ExecutionPolicy Bypass -Command "& { try { $r = Invoke-RestMethod -Uri 'http://127.0.0.1:8989/api/status' -TimeoutSec 3; Write-Host 'Local Bridge: OK (Port 8989)' -ForegroundColor Green } catch { Write-Host 'Bridge error: ' $_ -ForegroundColor Red } }"

echo.
echo Services started. You can now use https://sritayigrand.com/admin/rfid
timeout /t 5
