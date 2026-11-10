@echo off
title Sri Tayi Grand - Production RFID Bridge & Hardware Connector
cd /d "%~dp0"
echo ==========================================================
echo   SRI TAYI GRAND - PRODUCTION RFID HARDWARE CONNECTOR
echo ==========================================================
echo Starting Be-Tech RFID Bridge and Secure Cloud Connector...
powershell -NoProfile -ExecutionPolicy Bypass -File "rfid-bridge\start-tunnel.ps1"
pause
