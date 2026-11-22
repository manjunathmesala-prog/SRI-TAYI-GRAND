@echo off
title Sri Tayi Grand - Setup Permanent RFID Tunnel
echo ==========================================================
echo   SRI TAYI GRAND - PERMANENT PRODUCTION RFID TUNNEL SETUP
echo   Fixed Domain: https://rfid.sritayigrand.com
echo ==========================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-permanent-rfid-tunnel.ps1" %*
echo.
pause
