@echo off
title Sri Tayi Grand - Production RFID Cloud Connector
echo ==========================================================
echo   SRI TAYI GRAND - PRODUCTION RFID CLOUD CONNECTOR
echo   Fixed Domain: https://rfid.sritayigrand.com
echo ==========================================================
echo.

:: 1. Check if permanent service is already installed and running
sc query cloudflared | findstr /I "RUNNING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Permanent Cloudflare Tunnel Windows Service is ALIVE and RUNNING!
    echo Target Domain: https://rfid.sritayigrand.com
    echo.
    echo RFID operations are active across https://sritayigrand.com
    timeout /t 5
    exit /b 0
)

:: 2. If not running as service, run via powershell runner
echo Launching RFID Bridge and Tunnel Connector...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0rfid-bridge\start-tunnel.ps1"
echo.
pause
