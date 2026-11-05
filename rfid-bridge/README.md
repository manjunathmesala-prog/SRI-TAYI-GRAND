# Sri Tayi Grand - RFID Hardware Bridge & SDK Package

Complete front-desk keycard encoder SDK and web integration package for **Sri Tayi Grand** (`https://sri-tayi-grand.vercel.app/admin/rfid`).

---

## 📦 Package Contents

- **`start-rfid-bridge.bat`**: Double-click to launch the hardware service on the laptop.
- **`install-rfid-service-permanent.bat`**: One-click install to auto-start bridge silently on Windows boot.
- **`bin/`**: Precompiled 32-bit service (`SriTayiGrandKeycardBridge.exe`) and all Be-Tech BIS 5.7 vendor DLLs.
- **`src/`**: Full C# source code (`SriTayiGrandKeycardBridge.cs`) and recompile batch script (`build.bat`).
- **`web-admin-integration/`**: Ready-to-paste Next.js API routes (`route.ts`), client helpers (`rfidClient.ts`), and React UI component (`RfidManager.tsx`).
- **`docs/`**: Complete technical specification and architectural manual.

---

## 🚀 Quick Start on Front Desk Laptop

1. Connect the Be-Tech USB RFID encoder to the laptop.
2. Double-click **`start-rfid-bridge.bat`** (or run `install-rfid-service-permanent.bat` for silent auto-start).
3. The bridge service starts listening on `http://127.0.0.1:8989`.
4. Open `https://sri-tayi-grand.vercel.app/admin/rfid` (or `http://localhost:3000/admin/rfid`) in Chrome/Edge and manage cards directly.

---

## 🔒 Audit: Recording Every Card Tap

Every single card tap on the encoder is recorded:
1. **Locally:** In `bin\rfid_tap_audit.log`.
2. **Web Admin Database:** Automatically sent via background POST to `https://sri-tayi-grand.vercel.app/api/admin/rfid-logs` (or local `/api/admin/rfid-logs`).
