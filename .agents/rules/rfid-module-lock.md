# 🔓 RFID MODULE DIRECTIVE: UNFROZEN (ACTIVE DEVELOPMENT PERMITTED)

> **STATUS UPDATE (2026-11-22):**
> The RFID Module Freeze & Do-Not-Touch Directive has been **OFFICIALLY LIFTED / UNFROZEN** by user directive.
> All components of the RFID pipeline—including the C# hardware bridge, physical keycard encoding, card activation/deactivation logic, admin UI, and database persistence mechanisms—are now open for active development, enhancements, testing, and refactoring.

---

## 1. HARDWARE & BRIDGE ARCHITECTURE REFERENCE
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

## 2. RFID APPLICATION CODE & REPOSITORY REFERENCE
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
When performing any coding, refactoring, package upgrades, UI redesigns, or feature additions:
1. **Active Development Permitted**: The RFID freeze is officially lifted. Agents and developers are authorized to modify, improve, test, and refactor RFID files and workflows.
2. **Protocol & Hardware Compatibility**: Maintain operational compatibility with the Be-Tech BIS 5.7 bridge (default port 8989), readers (ACR120 Mifare), and Next.js backend.
3. **Property Identity**: Ensure the hotel property name remains strictly **Sri Tayi Grand**.
