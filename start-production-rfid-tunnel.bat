@echo off
title Sri Tayi Grand - Production RFID Cloud Tunnel
echo ==========================================================
echo   SRI TAYI GRAND - PRODUCTION RFID CLOUD CONNECTOR
echo ==========================================================
echo.
echo 1. Ensuring local Be-Tech RFID Bridge is running on port 8989...
powershell -NoProfile -ExecutionPolicy Bypass -Command "& { if (-not (Get-Process -Name 'SriTayiGrandKeycardBridge' -ErrorAction SilentlyContinue)) { Start-Process 'C:\Users\M S T C\AppData\Local\SriTayiGrand\RFIDBridge\SriTayiGrandKeycardBridge.exe' -WorkingDirectory 'C:\Users\M S T C\AppData\Local\SriTayiGrand\RFIDBridge' -WindowStyle Minimized; Start-Sleep -Seconds 1 } }"
echo.
echo 2. Launching secure HTTPS Tunnel for sritayigrand.com production...
echo.
echo ==========================================================
echo  INSTRUCTIONS:
echo  1. KEEP THIS WINDOW OPEN while operating RFID at the desk.
echo  2. Copy the 'https://...trycloudflare.com' address shown below.
echo  3. In https://sritayigrand.com/admin/rfid, click 'Bridge Host'.
echo  4. Paste the URL and click 'Save Host Setting'.
echo ==========================================================
echo.
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://127.0.0.1:8989 --no-prechecks --protocol http2
pause
