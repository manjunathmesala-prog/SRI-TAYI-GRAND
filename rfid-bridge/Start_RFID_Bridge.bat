@echo off
title Sri Tayi Grand Hotel - RFID Keycard Encoder Bridge
cd /d "%~dp0bin"

echo ========================================================
echo   SRI TAYI GRAND - RFID KEYCARD ENCODER BRIDGE
echo   Vendor: Be-Tech BIS 5.7 (Mifare 1K)
echo   Hardware Port: 1 (Reader Type: 4 - USB Desktop Encoder)
echo   System Password: TAYIGR
echo   Local Web Service: http://127.0.0.1:8989
echo ========================================================
echo.

:: 1. Check if the service is already running and responding on port 8989
powershell -NoProfile -Command "try { $res = Invoke-RestMethod -Uri 'http://127.0.0.1:8989/api/status' -TimeoutSec 1; if ($res.status -eq 'ok') { exit 0 } else { exit 1 } } catch { exit 1 }"
if %ERRORLEVEL% EQU 0 (
    echo [OK] RFID Bridge Service is ALREADY RUNNING and HEALTHY on port 8989!
    echo [OK] Hardware: Be-Tech USB Mifare Reader is online and connected.
    echo.
    echo ------------------------------------------------------------------------
    echo  The RFID encoder is ALREADY working in the background.
    echo  You DO NOT need to keep this window open or launch another instance.
    echo ------------------------------------------------------------------------
    echo.
    set /p RESTART="Do you want to RESTART the bridge service? (y/N): "
    if /i not "%RESTART%"=="y" (
        echo Bridge service remains active. Exiting cleanly.
        timeout /t 3 >nul
        exit /b 0
    )
    echo Restarting bridge service...
)

:: 2. Terminate any stale or duplicate instances before starting fresh to prevent socket conflicts
taskkill /F /IM SriTayiGrandKeycardBridge.exe >nul 2>&1
timeout /t 1 >nul

echo Starting bridge service...
SriTayiGrandKeycardBridge.exe
pause
