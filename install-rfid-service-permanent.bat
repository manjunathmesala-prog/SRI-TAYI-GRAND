@echo off
title Sri Tayi Grand - RFID Permanent Auto-Start Setup
echo ==========================================================
echo   SRI TAYI GRAND - PERMANENT RFID BRIDGE AUTO-START SETUP
echo ==========================================================
echo.
echo Installing background auto-start service...
echo This will configure Windows so the RFID card machine runs
echo automatically every time this computer starts up.
echo Receptionists will NEVER need to double-click batch files again!
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0rfid-bridge\install-service.ps1"
echo.
pause
