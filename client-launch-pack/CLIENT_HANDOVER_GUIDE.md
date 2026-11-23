# Sri Tayi Grand - Reception PC RFID Hardware Handover Guide

> **Property:** Sri Tayi Grand Hotel, Kadiri, Andhra Pradesh  
> **Production Web Portal:** [https://sritayigrand.com/admin/rfid](https://sritayigrand.com/admin/rfid)  
> **Permanent Cloud Domain:** `https://rfid.sritayigrand.com`  
> **Hardware:** Be-Tech BIS 5.7 ACR120 USB Mifare 1K Keycard Encoder (Proprietary USB Mode, Port 1)

---

## 1. What This Package Contains

```
client-launch-pack/
│
├── 1_INSTALL_ON_RECEPTION_PC.bat       <-- Master 1-Click Installer (Run this during hotel onboarding)
├── 2_TEST_RFID_HARDWARE.bat            <-- 1-Click Diagnostic (Checks bridge, reader, and cloud tunnel)
├── 3_START_MANUALLY_IF_STOPPED.bat     <-- Emergency restart (if services are ever accidentally closed)
├── 4_UNINSTALL_SERVICES.bat            <-- Clean uninstaller (if moving to a new computer)
├── CLIENT_HANDOVER_GUIDE.md            <-- This technical deployment documentation
├── FRONT_DESK_QUICK_GUIDE.txt          <-- Simple cheat sheet for front desk staff
│
├── bin/                                <-- All native binaries & Be-Tech driver DLLs
│   ├── SriTayiGrandKeycardBridge.exe   <-- C# Hardware Bridge Service (Port 8989)
│   ├── cloudflared.exe                 <-- Cloudflare Tunnel Windows Service binary
│   ├── btlock57L.dll, btlock57.dll     <-- Be-Tech BIS 5.7 native SDK libraries
│   ├── acr120u.dll, AcsReader.dll      <-- ACR120 USB Mifare driver libraries
│   ├── bridge_config.ini               <-- Hardware configuration (Port=1, SectorNo=0, HotelPwd=TAYIGR)
│   └── card_sn_counter.dat             <-- Hardware card SN sequence numbering
│
└── scripts/
    ├── setup-permanent-service.ps1     <-- Automated Windows Service & Auto-Start engine
    ├── test-hardware.ps1               <-- 3-point diagnostic test runner
    └── register-tunnel-supabase.js     <-- Direct Supabase PostgreSQL synchronization
```

---

## 2. Onboarding Steps at Sri Tayi Grand Hotel (Takes 3 Minutes)

### Step 1: Copy the Folder to the Reception PC
Copy this entire `client-launch-pack` folder onto the reception computer:
- Recommended path: `C:\SriTayiGrand\client-launch-pack` (or onto the Desktop).

### Step 2: Plug in the Be-Tech Card Encoder
1. Connect the USB cable from the Be-Tech card encoder machine into any standard USB port on the PC.
2. The encoder will give a quick beep/LED light indicating power is on.

### Step 3: Run the Master Installer
1. Right-click `1_INSTALL_ON_RECEPTION_PC.bat` and select **Run as administrator**.
2. When prompted:
   - Paste your Cloudflare Tunnel Token (from Cloudflare Zero Trust: `sri-tayi-grand-rfid`).
   - If you do not have the token yet, press Enter to skip token installation — the local bridge and auto-start will still be configured completely.
3. The installer will:
   - Install `SriTayiGrandKeycardBridge.exe` into Windows Startup & Task Scheduler.
   - Install `cloudflared` as a permanent background Windows Service.
   - Automatically start both services.
   - Test local hardware on Port 1.

### Step 4: Run the Diagnostic Test
Double-click `2_TEST_RFID_HARDWARE.bat`. You should see:
- `[PASS] SriTayiGrandKeycardBridge.exe is RUNNING`
- `[PASS] Be-Tech ACR120 USB Reader: DETECTED on USB Port 1`
- `[PASS] Cloudflare Edge Tunnel: ONLINE & ACCESSIBLE`

### Step 5: Test Keycard Issuance on `https://sritayigrand.com`
1. Open Google Chrome on the reception PC and navigate to `https://sritayigrand.com/admin/rfid`.
2. Notice the green indicator: **🟢 Hardware Online (USB Port 1)**.
3. Place a Mifare 1K keycard on the encoder machine.
4. Click **"+ Issue Customer Card"** or **"Write Physical Card"**.
5. The encoder will beep, write the card for Room 101/102/etc., and display a success toast!

---

## 3. Daily Operation for Front Desk Staff

- **Zero Maintenance:** Staff does not need to start any programs or click any batch files.
- When the PC is turned on in the morning, both the bridge and tunnel start automatically in the background before anyone even logs in.
- Staff simply opens Chrome, goes to `https://sritayigrand.com`, and operates the hotel management system.

---

## 4. Hardware Troubleshooting Cheat Sheet

| Symptom | Cause | Solution |
|---|---|---|
| Dashboard says **"Hardware offline"** | USB cable unplugged or loose | Unplug and replug the Be-Tech USB cable into another USB port. Click "Recheck Connection" in the dashboard. |
| Dashboard says **"No RFID card detected"** | Card not placed flat on encoder | Place the Mifare 1K keycard flat on the center of the Be-Tech reader. |
| Computer was restarted, reader not responding | Services warming up | Wait 15 seconds for Windows services to initialize, or double-click `3_START_MANUALLY_IF_STOPPED.bat`. |
| Card write failed (error code 4) | System password mismatch | The hotel system password is set to `TAYIGR` in `bridge_config.ini`. Do not change this password. |
