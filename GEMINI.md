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

## 4. CLOUDFLARE HTTPS TUNNEL ARCHITECTURE (LIFETIME FREE)
- **Why Cloudflare Tunnel is Used:**
  - Browsers enforce a strict **Mixed Content Policy**: when front desk staff open `https://sritayigrand.com` (secure HTTPS), the browser strictly blocks direct requests to unencrypted `http://127.0.0.1:8989`.
  - Cloudflare Tunnel creates an encrypted HTTPS tunnel directly to local port 8989, allowing the cloud dashboard to safely issue, read, and write physical keycards.
  - **No Public IP or Port Forwarding Needed**: Operates via outbound encrypted tunnels through hotel broadband (Airtel, Jio, ACT) without touching router NAT.
- **Cost & Terms:**
  - **100% Lifetime Free** under Cloudflare Zero Trust core infrastructure ($0/month, no trial expiration, no credit card required).
  - Mode 1: Quick Tunnel (`cloudflared tunnel --url http://127.0.0.1:8989`) gives `https://...trycloudflare.com` for instant zero-configuration operation via `start-production-rfid-tunnel.bat`.
  - Mode 2: Permanent Named Subdomain (e.g., `rfid.sritayigrand.com`) is also 100% lifetime free, keeping the URL permanent across reception PC reboots.
- **Local Fallback:**
  - When accessing locally on `http://localhost:3000`, the tunnel is optional and direct HTTP communication to `127.0.0.1:8989` is supported.

---

## 5. PERMANENT CARD PURGE & RESTORATION RESISTANCE
- **Cascade Deletion Protocol:**
  - Deleting an RFID card via UI or API must permanently purge all matching records by `card_uid` and `id` across:
    1. Memory repository (`this.rfidCards`)
    2. Local persistent disk storage (`data/cards.json`)
    3. Supabase PostgreSQL cloud database (`DELETE FROM rfid_cards WHERE card_uid = $1 OR id::text = $1`)
- **Deduplication Safeguard:**
  - `getRFIDCards()` strictly deduplicates by `card_uid || id`, preventing duplicate records or old cached copies from resurrecting on page refresh.
  - Card issuance (`issueSuperAdminCard`, `issueCleanerCard`, `issueRFIDCard`) updates matching `card_uid` records in place instead of creating duplicate rows.

---

## 6. CARD ACTIVATION / DEACTIVATION CONTEXT INTEGRITY
- **Full Card Context Requirement:**
  - `handleToggleCardStatus(card)` must evaluate the complete card object (`card_type`, `card_label`, `holder_name`, `assigned_room_number`, `card_uid`).
  - **NEVER default unassigned rooms to '104'**.
  - Super Admin and Cleaner cards have universal/facility-wide access and must **never** execute room-specific lock wipes or checkout commands.
  - Hardware encoding/wiping is only applied to customer cards with an actual assigned room number.
  - Feedback notifications must accurately specify the card type, holder name, and room number.

---

## 7. INSTRUCTION FOR FUTURE AGENTS
When performing any future coding, refactoring, package upgrades, UI redesigns, or feature additions:
1. **DO NOT** modify, delete, or rewrite any of the files listed in Section 1 and Section 2.
2. **DO NOT** change the communication protocols, payload formats, or ports (8989 for bridge, 3000 for Next.js).
3. If working on bookings, payments, or other modules, ensure all RFID hooks continue to function without alteration.
