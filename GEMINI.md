# 🔒 CRITICAL SYSTEM RULE: RFID MODULE FREEZE & DO-NOT-TOUCH DIRECTIVE

> **MANDATORY POLICY FOR ALL FUTURE DEVELOPMENT:**
> The RFID Module, Be-Tech hardware bridge, physical keycard encoding, card activation/deactivation logic, and associated database persistence mechanisms are fully operational, tested, and verified on physical door hardware. 
> **UNDER NO CIRCUMSTANCES should any future development touch, alter, refactor, disable, or disturb any component of this pipeline.**

---

## 1. PROTECTED HARDWARE & BRIDGE COMPONENTS (STRICTLY FROZEN)
- **C# Hardware Bridge Service:**
  - `rfid-bridge/src/SriTayiGrandKeycardBridge.cs`
  - `rfid-bridge/bin/SriTayiGrandKeycardBridge.exe`
  - `bridge_config.ini` (Port=1, ReaderType=4 ACR120 Mifare, SectorNo=0, HotelPwd=TAYIGR, ListenPort=8989)
  - `btlock57l.dll` Be-Tech BIS 5.7 SDK
- **Card SN & Encoding Counters:**
  - `card_sn_counter.dat` (Sequence numbering >= 1000020500)
- **Validity Timestamps:**
  - **Lifetime / Perpetual access**: `beginTime = "0001010000"`, `endTime = "9912312359"`.
  - **NO valid-from / valid-until time restrictions**.

---

## 2. PROTECTED RFID APPLICATION CODE (STRICTLY FROZEN)
- **Admin RFID Dashboard:**
  - `src/app/admin/rfid/page.tsx`
  - Header actions: `+ Super Admin Card`, `+ Cleaner Card`, `+ Issue Customer Card`
  - Roles & Cards tables: `Write Physical Card` and `Write Card (No Time Limit)`
  - Card activation and deactivation toggling (`handleToggleCardStatus`)
- **API Endpoints:**
  - `src/app/api/rfid/cards/route.ts`
  - `src/app/api/rfid/bridge/route.ts`
  - `src/app/api/rfid/devices/route.ts`
  - `src/app/api/admin/rfid-logs/route.ts`
  - Bridge listener endpoints (`/api/status`, `/api/read-card`, `/api/issue-card`, `/api/checkout-card`)
- **Persistence & Repository:**
  - `data/cards.json` (Persistent disk storage)
  - `src/lib/db/card-storage.ts`
  - `src/lib/db/repository.ts` RFID methods (`issueSuperAdminCard`, `issueCleanerCard`, `issueRFIDCard`, `toggleRFIDCardStatus`, `getRFIDCards`, `deleteRFIDCard`, etc.)
- **Hotel Name:**
  - The hotel property name MUST ALWAYS strictly remain **Sri Tayi Grand** (never change to Anantha or any other name).

---

## 3. CHECKOUT DEACTIVATION AUTOMATION (PRESERVED)
- When a guest is checked out in `src/app/admin/bookings/page.tsx` or `/api/admin/bookings`, associated RFID cards are automatically set to `inactive` in the repository and `data/cards.json`.

---

## 4. INSTRUCTION FOR FUTURE AGENTS
When performing any future coding, refactoring, package upgrades, UI redesigns, or feature additions:
1. **DO NOT** modify, delete, or rewrite any of the files listed above.
2. **DO NOT** change the communication protocols, payload formats, or ports (8989 for bridge, 3000 for Next.js).
3. If working on bookings, payments, or other modules, ensure all RFID hooks continue to function without alteration.
