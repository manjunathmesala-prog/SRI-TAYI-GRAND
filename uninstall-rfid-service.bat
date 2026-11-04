@echo off
title Sri Tayi Grand - Remove RFID Permanent Auto-Start
echo ==========================================================
echo   SRI TAYI GRAND - UNINSTALL RFID BRIDGE AUTO-START
echo ==========================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0rfid-bridge\uninstall-service.ps1"
echo.
pause
