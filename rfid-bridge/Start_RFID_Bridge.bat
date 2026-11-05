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
echo Starting bridge service...
SriTayiGrandKeycardBridge.exe
pause
