@echo off
title Sri Tayi Grand - Master RFID Client Installer
echo ==========================================================
echo   SRI TAYI GRAND HOTEL - RECEPTION PC INSTALLER
echo   Configures RFID Hardware Bridge & Permanent Cloud Tunnel
echo ==========================================================
echo.
echo Launching installer with Administrator privileges...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-permanent-service.ps1"
echo.
pause
