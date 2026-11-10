# 📋 PENDING IMMEDIATE TASK: Activate Permanent Domain `rfid.sritayigrand.com`

> **Hotel Property:** Sri Tayi Grand  
> **System:** Front Desk RFID Keycard Encoder (Be-Tech BIS 5.7 USB Mifare 1K S50)  
> **Objective:** Transition from temporary/ephemeral session tunnels (`trycloudflare.com`) to a permanent, zero-maintenance named subdomain: **`https://rfid.sritayigrand.com`**.  
> **Cost:** 100% Lifetime Free ($0/month under Cloudflare Zero Trust core infrastructure).

---

## 1. WHY THIS TASK IS REQUIRED

1. **Eliminates URL Regeneration on PC Reboots:**
   - Currently, the reception PC uses a Quick Tunnel (`trycloudflare.com`), which generates a random temporary URL (e.g., `https://pavilion-divine-oliver-frames.trycloudflare.com`).
   - Every time the reception PC restarts, the quick tunnel terminates and a new URL is generated.
   - By creating a permanent named tunnel for **`rfid.sritayigrand.com`**, the URL **never changes** regardless of PC reboots, power cuts, or internet reconnects.

2. **Zero Staff Maintenance:**
   - Once installed as a background Windows Service on the reception terminal, `cloudflared` starts automatically on boot in 0 seconds with 0 clicks required from reception staff.

3. **HTTPS Browser Security Compliance (Mixed Content Policy):**
   - When staff access the cloud management dashboard (`https://sritayigrand.com/admin/rfid` over HTTPS), browsers strictly block insecure HTTP calls to `http://127.0.0.1:8989`.
   - `https://rfid.sritayigrand.com` provides valid SSL certificates directly to local port `8989`.

---

## 2. CURRENT SYSTEM STATUS (LIVE AUDIT)

| Parameter | Current Live State |
| :--- | :--- |
| **Temporary Live Tunnel** | `https://pavilion-divine-oliver-frames.trycloudflare.com` |
| **Status File** | `latest_production_tunnel_url.txt` |
| **Local Bridge Service** | `http://127.0.0.1:8989` (Be-Tech BIS 5.7, Port 1, ReaderType 4 ACR120 Mifare) |
| **Bridge Auto-Start** | Active across 3 layers (Registry `HKCU Run`, Startup folder shortcut, Scheduled Task) |
| **Production Domain** | `sritayigrand.com` (DNS: Hostinger `apollo.dns-parking.com`, Host: Vercel) |
| **Target Permanent URL** | `https://rfid.sritayigrand.com` |

---

## 3. STEP-BY-STEP ACTIVATION PROCEDURE

Follow these 4 steps to activate `rfid.sritayigrand.com`:

### Step 1: Create Free Tunnel in Cloudflare Zero Trust Dashboard
1. Log in to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/) (Free account).
2. In the left navigation menu, navigate to:
   **Networks** ➔ **Tunnels** (or **Access** ➔ **Tunnels**).
3. Click the **Add a tunnel** (or **Create a tunnel**) button.
4. Select **Cloudflared** as the connector type and click **Next**.
5. Name the tunnel:
   ```text
   sritayi-rfid-bridge
   ```
6. Click **Save tunnel**.

---

### Step 2: Install Permanent Windows Service on Reception PC
On the next screen, Cloudflare provides an install token and command for **Windows (64-bit)**:

1. On the reception PC, open **Command Prompt as Administrator** (Right-click `cmd` ➔ *Run as administrator*).
2. Execute the service install command:
   ```cmd
   "C:\Program Files (x86)\cloudflared\cloudflared.exe" service install <YOUR_TUNNEL_TOKEN>
   ```
   *(Note: `cloudflared.exe` is already installed on this PC at `C:\Program Files (x86)\cloudflared\cloudflared.exe`)*.
3. Start the Windows Service:
   ```cmd
   net start cloudflared
   ```
4. Verify in Windows Services (`services.msc`):
   - Service Name: `cloudflared`
   - Startup Type: **Automatic**
   - Status: **Running**

---

### Step 3: Configure Public Hostname & DNS
In the Cloudflare Tunnel configuration page:
1. Go to the **Public Hostnames** tab and click **Add a public hostname**.
2. Fill in the fields:
   - **Subdomain:** `rfid`
   - **Domain:** `sritayigrand.com`
   - **Path:** *(leave blank)*
   - **Type:** `HTTP`
   - **URL:** `127.0.0.1:8989`
3. Click **Save hostname**.

> [!NOTE]
> If your root domain DNS is hosted at **Hostinger**, add a CNAME record in your Hostinger DNS zone:
> - **Type:** `CNAME`
> - **Name / Host:** `rfid`
> - **Points to / Target:** `<your-tunnel-uuid>.cfargotunnel.com`
> - **TTL:** Default (Automatic)

---

### Step 4: Activate in Hotel Dashboard & Codebase

Once the tunnel is active, apply it to the Sri Tayi Grand application using any of the following:

#### A. In the Hotel Admin UI (Instant)
1. Open [`https://sritayigrand.com/admin/rfid`](https://sritayigrand.com/admin/rfid).
2. Click **⚙️ Host Settings** in the top navigation bar.
3. In the **Bridge Service URL** field, replace the existing URL with:
   ```text
   https://rfid.sritayigrand.com
   ```
4. Click **Save Host Setting**.

#### B. In Codebase Environment (`.env.local`)
Add or update the following line in `.env.local`:
```env
RFID_BRIDGE_URL="https://rfid.sritayigrand.com"
```

#### C. In Production Status File (`latest_production_tunnel_url.txt`)
Update `latest_production_tunnel_url.txt` with:
```text
https://rfid.sritayigrand.com
```
*The Next.js gateway at `src/app/api/rfid/bridge/route.ts` automatically loads and checks this file on every request.*

#### D. Synchronize to Supabase Cloud Database
Run the following script to store the permanent URL in Supabase table `integrations`:
```powershell
node rfid-bridge/register-tunnel-supabase.js https://rfid.sritayigrand.com
```

---

## 4. VERIFICATION & HEALTH CHECK

Run this health check command from any terminal or browser to verify complete connectivity:

```bash
curl -s https://rfid.sritayigrand.com/api/status
```

**Expected JSON Response:**
```json
{
  "status": "ok",
  "isOnline": true,
  "service": "SriTayiGrand-RFID-Bridge",
  "port": 1,
  "readerType": 4
}
```

---

## 5. REBOOT BEHAVIOR COMPARISON

| Feature | Quick Tunnel (`trycloudflare.com`) | Permanent Domain (`rfid.sritayigrand.com`) |
| :--- | :--- | :--- |
| **Survives PC Reboot?** | ❌ No (URL changes on reboot) | ✅ Yes (Fixed forever) |
| **Manual Action on Boot** | ⚠️ Run `Start_Production_RFID.bat` | 🟢 Zero (Windows Service auto-runs) |
| **URL Stability** | Random subdomain generated | Constant `rfid.sritayigrand.com` |
| **Host Settings in UI** | Must re-paste on each reboot | Set once and never touch again |
| **Cost** | 100% Free | 100% Free |
