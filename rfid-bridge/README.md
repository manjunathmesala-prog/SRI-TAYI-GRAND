# Sri Anantha Hotel - RFID Hardware Bridge & SDK Package

Complete front-desk keycard encoder SDK and web integration package for **Sri Anantha Hotel** (`https://sriananthahotel.com/admin`).

---

## 📦 Package Contents

- **`Start_RFID_Bridge.bat`**: Double-click to launch the hardware service on the laptop.
- **`bin/`**: Precompiled 32-bit service (`SriAnanthaKeycardBridge.exe`) and all Be-Tech BIS 5.7 vendor DLLs.
- **`src/`**: Full C# source code and recompile batch script.
- **`web-admin-integration/`**: Ready-to-paste Next.js API routes (`route.ts`), client helpers (`rfidClient.ts`), and React UI component (`RfidManager.tsx`).
- **`docs/`**: Complete technical specification and architectural manual.

---

## 🚀 Quick Start on Front Desk Laptop

1. Connect the USB RFID encoder to the laptop.
2. Double-click **`Start_RFID_Bridge.bat`** (or the Desktop shortcut).
3. The bridge service starts listening on `http://127.0.0.1:8989`.
4. Open `https://sriananthahotel.com/admin` in Chrome/Edge and manage cards directly.

---

## 🔒 Audit: Recording Every Card Tap

Every single card tap on the encoder is recorded:
1. **Locally:** In `bin\rfid_tap_audit.log`.
2. **Web Admin Database:** Automatically sent via background POST to `https://sriananthahotel.com/api/admin/rfid-logs`.
