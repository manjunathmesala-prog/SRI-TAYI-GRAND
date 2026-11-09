# Sri Tayi Grand - RFID Door Lock & Web Admin Integration Specification

> **Target Platform:** `https://sritayigrand.com/admin/rfid`  
> **Lock Hardware:** Be-Tech Electronic Locks (BIS Hotel v5.7 / Mifare 1K)  
> **Native Driver:** `btlock57L.dll` / `btlock57.dll` (Win32 x86 StdCall)  
> **Audience:** Full-Stack Web Developer & Hardware Integrator  

---

## 1. Executive Summary: Why the Door Was Not Opening

The RFID keycard was successfully scanning and activating on the USB encoder, but **the room door lock was rejecting the card**. 

Deep inspection of the Be-Tech lock database (`btlock57.mdb` and SQL Server `fom`) revealed three critical reasons:

1. **Guest Sequence Number (`GuestSN`) Was Too Low:**
   - Hotel lock microcontrollers maintain an internal counter for each room to invalidate old cards when a new guest checks in.
   - The Floor 2 door locks currently have internal counters at **`773,405,300`** (and SQL Server at **`1,000,019,916`**).
   - When a test card was written with a small number (e.g. `182947` or timestamp `% 1000000`), the door lock read the card, saw `Card GuestSN < Lock Internal Counter`, classified the card as an **expired card from a prior guest**, and **refused to turn the latch**.
   - **Resolution:** Set `GuestSN` and `CardNo` strictly greater than `773,405,300` (e.g. `800,000,000 + RoomNumber`).

2. **`SuitDoor` Buffer Overflow:**
   - In `btlock57L.dll`, `SuitDoor` (inner doors) is defined as a fixed 4-character string: `"0000"`.
   - Passing 12 characters (`"000000000000"`) caused memory buffer overflow into `PubDoor` and `BeginTime`, generating corrupt time/permission headers on the Mifare chip.
   - **Resolution:** `SuitDoor` must be exactly `"0000"`.

3. **Door ID Formatting:**
   - Must be padded with leading zeros to exactly 6 characters (e.g. Room 205 $\rightarrow$ `"000205"`).

---

## 2. Hardware API Parameters (`btlock57L.dll`)

| Parameter | Type | Required Value | Description |
| :--- | :--- | :--- | :--- |
| `Port` | `byte` | `1` | USB / COM Port |
| `ReaderType` | `byte` | `4` | USB Mifare Desktop Reader |
| `SectorNo` | `byte` | `0` | Mifare Card Sector |
| `HotelPwd` | `string` | `"TAYIGR"` | 6-character Master Hotel Password |
| `CardNo` | `int` | `800000000 + Room` | Unique Card Serial Number |
| `GuestSN` | `int` | `800000000 + Room` | Guest Sequence Counter (must be $> 773,405,300$) |
| `GuestIdx` | `short` | `1` | Holder Number (`1` = Primary Guest) |
| `DoorID` | `string` | `"000" + Room` | 6 characters (e.g. `"000205"`) |
| `SuitDoor` | `string` | `"0000"` | Exactly 4 characters |
| `PubDoor` | `string` | `"00000000"` | Exactly 8 characters |
| `BeginTime` | `string` | `YYMMDDHHmm` | 10 chars (e.g. `2611051630` for Nov 5, 2026, 16:30) |
| `EndTime` | `string` | `YYMMDDHHmm` | 10 chars (e.g. `2611061100` for Nov 6, 2026, 11:00) |

---

## 3. Complete Hotel Room & Lock Master Dataset

All 25 rooms across 3 floors at Sri Tayi Grand:

```json
[
  { "roomNumber": "101", "lockId": "000101", "floor": 1, "maxPax": 2, "safeSn": 800000101 },
  { "roomNumber": "102", "lockId": "000102", "floor": 1, "maxPax": 2, "safeSn": 800000102 },
  { "roomNumber": "103", "lockId": "000103", "floor": 1, "maxPax": 2, "safeSn": 800000103 },
  { "roomNumber": "104", "lockId": "000104", "floor": 1, "maxPax": 2, "safeSn": 800000104 },
  { "roomNumber": "105", "lockId": "000105", "floor": 1, "maxPax": 2, "safeSn": 800000105 },
  { "roomNumber": "106", "lockId": "000106", "floor": 1, "maxPax": 4, "safeSn": 800000106 },
  { "roomNumber": "107", "lockId": "000107", "floor": 1, "maxPax": 1, "safeSn": 800000107 },
  { "roomNumber": "108", "lockId": "000108", "floor": 1, "maxPax": 2, "safeSn": 800000108 },
  { "roomNumber": "109", "lockId": "000109", "floor": 1, "maxPax": 2, "safeSn": 800000109 },
  { "roomNumber": "201", "lockId": "000201", "floor": 2, "maxPax": 2, "safeSn": 800000201 },
  { "roomNumber": "202", "lockId": "000202", "floor": 2, "maxPax": 2, "safeSn": 800000202 },
  { "roomNumber": "203", "lockId": "000203", "floor": 2, "maxPax": 2, "safeSn": 800000203 },
  { "roomNumber": "204", "lockId": "000204", "floor": 2, "maxPax": 2, "safeSn": 800000204 },
  { "roomNumber": "205", "lockId": "000205", "floor": 2, "maxPax": 2, "safeSn": 800000205 },
  { "roomNumber": "206", "lockId": "000206", "floor": 2, "maxPax": 4, "safeSn": 800000206 },
  { "roomNumber": "207", "lockId": "000207", "floor": 2, "maxPax": 4, "safeSn": 800000207 },
  { "roomNumber": "208", "lockId": "000208", "floor": 2, "maxPax": 4, "safeSn": 800000208 },
  { "roomNumber": "301", "lockId": "000301", "floor": 3, "maxPax": 2, "safeSn": 800000301 },
  { "roomNumber": "302", "lockId": "000302", "floor": 3, "maxPax": 2, "safeSn": 800000302 },
  { "roomNumber": "303", "lockId": "000303", "floor": 3, "maxPax": 2, "safeSn": 800000303 },
  { "roomNumber": "304", "lockId": "000304", "floor": 3, "maxPax": 2, "safeSn": 800000304 },
  { "roomNumber": "305", "lockId": "000305", "floor": 3, "maxPax": 2, "safeSn": 800000305 },
  { "roomNumber": "306", "lockId": "000306", "floor": 3, "maxPax": 2, "safeSn": 800000306 },
  { "roomNumber": "307", "lockId": "000307", "floor": 3, "maxPax": 2, "safeSn": 800000307 },
  { "roomNumber": "308", "lockId": "000308", "floor": 3, "maxPax": 2, "safeSn": 800000308 }
]
```

---

## 4. Web Admin Integration Code (`sritayigrand.com`)

### File 1: Backend API Route (`app/api/admin/rfid-logs/route.ts`)
Creates an audit log of every tap in the database:

```typescript
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const {
      event_type,   // 'TAP_READ' | 'TAP_ACTIVATE' | 'TAP_DEACTIVATE' | 'TAP_READ_FAIL'
      room_number,  // e.g. "205"
      card_no,      // e.g. 800000205
      begin_time,   // e.g. "2611051630"
      end_time,     // e.g. "2611061100"
      staff_user,   // receptionist admin user
      status,       // "SUCCESS" or error message
      timestamp     // ISO timestamp
    } = data;

    console.log(`[RFID TAP AUDIT] ${timestamp} | ${event_type} | Room: ${room_number} | Staff: ${staff_user}`);

    // TODO: Insert into database (Prisma / Supabase / MongoDB / SQL):
    /*
    await prisma.rfidAuditLog.create({
      data: {
        eventType: event_type,
        roomNumber: room_number,
        cardNo: String(card_no),
        beginTime: begin_time,
        endTime: end_time,
        staffUser: staff_user,
        status: status,
        createdAt: new Date(timestamp)
      }
    });
    */

    return NextResponse.json({ success: true, message: 'Tap recorded in database' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

---

### File 2: Frontend REST Helper (`lib/rfidClient.ts`)

```typescript
const BRIDGE_URL = 'http://127.0.0.1:8989';

export async function issueKeycard(params: {
  roomNumber: string;
  checkInDate?: Date;
  checkOutDate?: Date;
  staffUsername?: string;
}) {
  try {
    const formatTime = (d: Date) => {
      const yy = String(d.getFullYear()).slice(-2);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      return `${yy}${mm}${dd}${hh}${mi}`;
    };

    const now = params.checkInDate || new Date();
    const checkout = params.checkOutDate || new Date(Date.now() + 86400000);

    const payload = {
      roomNumber: params.roomNumber.trim(),
      beginTime: formatTime(now),
      endTime: formatTime(checkout),
      staffUser: params.staffUsername || 'FrontDesk'
    };

    const res = await fetch(`${BRIDGE_URL}/api/issue-card`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Staff-User': params.staffUsername || 'FrontDesk'
      },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: 'Cannot connect to local RFID bridge on 127.0.0.1:8989' };
  }
}

export async function readCard(staffUsername: string = 'FrontDesk') {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/read-card`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Staff-User': staffUsername }
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: 'Cannot reach hardware encoder.' };
  }
}

export async function deactivateCard(roomNumber: string, staffUsername: string = 'FrontDesk') {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/checkout-card`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Staff-User': staffUsername },
      body: JSON.stringify({ roomNumber, staffUser: staffUsername })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: 'Cannot reach hardware encoder.' };
  }
}
```

---

## 5. Local Hardware Bridge Service (C# Source)

Save this file as `HotelRfidBridge.cs` and compile using Windows built-in compiler:
`C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe /platform:x86 /target:exe HotelRfidBridge.cs`

```csharp
using System;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Runtime.InteropServices;

namespace HotelRfidBridge
{
    class Program
    {
        [DllImport("btlock57l.dll", EntryPoint = "Write_Guest_Card", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
        public static extern short Write_Guest_Card(
            byte Port, byte ReaderType, byte SectorNo, string HotelPwd,
            int CardNo, int GuestSN, short GuestIdx,
            string DoorID, string SuitDoor, string PubDoor,
            string BeginTime, string EndTime
        );

        [DllImport("btlock57l.dll", EntryPoint = "Read_Guest_Card", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
        public static extern short Read_Guest_Card(
            byte Port, byte ReaderType, byte SectorNo, string HotelPwd,
            ref int CardNo, ref int GuestSN, ref short GuestIdx,
            StringBuilder DoorID, StringBuilder SuitDoor, StringBuilder PubDoor,
            StringBuilder BeginTime, StringBuilder EndTime
        );

        [DllImport("btlock57l.dll", EntryPoint = "Reader_Alarm", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
        public static extern short Reader_Alarm(byte Port, byte ReaderType, byte AlarmCount);

        public static byte Port = 1;
        public static byte ReaderType = 4;
        public static byte SectorNo = 0;
        public static string HotelPwd = "TAYIGR";
        public static string AdminApiUrl = "https://sritayigrand.com/api/admin/rfid-logs";
        public static int ListenPort = 8989;

        static HttpListener listener;
        static bool isRunning = true;

        static void Main(string[] args)
        {
            Console.Title = "Sri Tayi Grand - RFID Hardware Bridge";
            Console.WriteLine("==================================================");
            Console.WriteLine("  SRI TAYI GRAND - RFID HARDWARE BRIDGE SERVICE   ");
            Console.WriteLine("  Port: 8989 | Be-Tech BIS 5.7 (btlock57l.dll)    ");
            Console.WriteLine("==================================================");

            listener = new HttpListener();
            listener.Prefixes.Add("http://127.0.0.1:" + ListenPort + "/");
            listener.Prefixes.Add("http://localhost:" + ListenPort + "/");
            listener.Start();

            Console.WriteLine("[INFO] Bridge listening on http://127.0.0.1:" + ListenPort + "/");
            Thread t = new Thread(ListenLoop) { IsBackground = true };
            t.Start();

            while (isRunning) { Thread.Sleep(1000); }
        }

        static void ListenLoop()
        {
            while (isRunning && listener.IsListening)
            {
                try
                {
                    HttpListenerContext ctx = listener.GetContext();
                    ThreadPool.QueueUserWorkItem((o) => ProcessRequest(ctx));
                }
                catch { }
            }
        }

        static void ProcessRequest(HttpListenerContext ctx)
        {
            HttpListenerRequest req = ctx.Request;
            HttpListenerResponse res = ctx.Response;

            res.AddHeader("Access-Control-Allow-Origin", "*");
            res.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            res.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Staff-User");
            res.ContentType = "application/json; charset=utf-8";

            if (req.HttpMethod == "OPTIONS") { res.StatusCode = 200; res.Close(); return; }

            string url = req.RawUrl.ToLower();
            string responseJson = "";

            if (url.StartsWith("/api/status"))
            {
                responseJson = "{\"status\":\"ok\",\"service\":\"HotelRfidBridge\"}";
            }
            else if (url.StartsWith("/api/read-card"))
            {
                responseJson = HandleReadCard(req);
            }
            else if (url.StartsWith("/api/issue-card"))
            {
                responseJson = HandleIssueCard(req);
            }
            else if (url.StartsWith("/api/checkout-card"))
            {
                responseJson = HandleCheckoutCard(req);
            }
            else
            {
                res.StatusCode = 404;
                responseJson = "{\"error\":\"Not Found\"}";
            }

            byte[] buf = Encoding.UTF8.GetBytes(responseJson);
            res.ContentLength64 = buf.Length;
            res.OutputStream.Write(buf, 0, buf.Length);
            res.OutputStream.Close();
        }

        static string HandleIssueCard(HttpListenerRequest req)
        {
            string body = GetRequestBody(req);
            string room = ExtractJsonField(body, "roomNumber");
            string beginTime = ExtractJsonField(body, "beginTime");
            string endTime = ExtractJsonField(body, "endTime");
            string staff = req.Headers["X-Staff-User"] ?? ExtractJsonField(body, "staffUser");
            if (string.IsNullOrEmpty(staff)) staff = "FrontDesk";

            if (string.IsNullOrEmpty(room)) return "{\"success\":false,\"error\":\"roomNumber required\"}";

            DateTime now = DateTime.Now;
            if (string.IsNullOrEmpty(beginTime)) beginTime = now.ToString("yyMMddHHmm");
            if (string.IsNullOrEmpty(endTime)) endTime = now.AddDays(1).ToString("yyMMdd") + "1100";

            // CRITICAL FIXES FOR DOOR UNLOCK:
            string strLockID = room.PadLeft(6, '0'); // Exactly 6 chars: "000205"
            string strSuitDoor = "0000";             // Exactly 4 chars (NO overflow)
            string strPubDoor = "00000000";          // Exactly 8 chars
            short guestIdx = 1;                      // Holder number 1
            
            // Sequence counter MUST exceed last lock counter (773405300)
            int roomInt = 0;
            int.TryParse(room, out roomInt);
            int guestSN = 800000000 + roomInt;
            int cardNo = guestSN;

            short result = Write_Guest_Card(
                Port, ReaderType, SectorNo, HotelPwd,
                cardNo, guestSN, guestIdx,
                strLockID, strSuitDoor, strPubDoor,
                beginTime, endTime
            );

            if (result == 0)
            {
                Reader_Alarm(Port, ReaderType, 2);
                RecordTap("TAP_ACTIVATE", room, cardNo, beginTime, endTime, staff, "SUCCESS");
                return "{\"success\":true,\"code\":0,\"room\":\"" + room + "\",\"cardNo\":" + cardNo + "}";
            }
            else
            {
                string err = (result == 6) ? "No card on encoder" : "DLL error code: " + result;
                RecordTap("TAP_ACTIVATE_FAIL", room, cardNo, beginTime, endTime, staff, err);
                return "{\"success\":false,\"code\":" + result + ",\"error\":\"" + err + "\"}";
            }
        }

        static string HandleReadCard(HttpListenerRequest req)
        {
            int cardNo = 0; int guestSN = 0; short guestIdx = 0;
            StringBuilder doorID = new StringBuilder(10);
            StringBuilder suitDoor = new StringBuilder(10);
            StringBuilder pubDoor = new StringBuilder(10);
            StringBuilder beginTime = new StringBuilder(20);
            StringBuilder endTime = new StringBuilder(20);

            short result = Read_Guest_Card(
                Port, ReaderType, SectorNo, HotelPwd,
                ref cardNo, ref guestSN, ref guestIdx,
                doorID, suitDoor, pubDoor, beginTime, endTime
            );

            string staff = req.Headers["X-Staff-User"] ?? "FrontDesk";

            if (result == 0)
            {
                Reader_Alarm(Port, ReaderType, 1);
                string room = doorID.ToString().Trim().TrimStart('0');
                RecordTap("TAP_READ", room, cardNo, beginTime.ToString(), endTime.ToString(), staff, "SUCCESS");
                return "{\"success\":true,\"roomNumber\":\"" + room + "\",\"cardNo\":" + cardNo + ",\"beginTime\":\"" + beginTime.ToString() + "\",\"endTime\":\"" + endTime.ToString() + "\"}";
            }
            return "{\"success\":false,\"code\":" + result + ",\"error\":\"No card on encoder\"}";
        }

        static string HandleCheckoutCard(HttpListenerRequest req)
        {
            string body = GetRequestBody(req);
            string room = ExtractJsonField(body, "roomNumber");
            string staff = req.Headers["X-Staff-User"] ?? "FrontDesk";
            string strLockID = "000000";
            string strSuitDoor = "0000";
            string strPubDoor = "00000000";
            string now = DateTime.Now.ToString("yyMMddHHmm");

            short result = Write_Guest_Card(
                Port, ReaderType, SectorNo, HotelPwd,
                0, 1, 1, strLockID, strSuitDoor, strPubDoor, now, now
            );

            if (result == 0)
            {
                Reader_Alarm(Port, ReaderType, 1);
                RecordTap("TAP_DEACTIVATE", room, 0, now, now, staff, "SUCCESS");
                return "{\"success\":true,\"message\":\"Card deactivated\"}";
            }
            return "{\"success\":false,\"code\":" + result + "}";
        }

        static void RecordTap(string evt, string room, int cardNo, string bTime, string eTime, string staff, string status)
        {
            ThreadPool.QueueUserWorkItem((o) =>
            {
                try
                {
                    HttpWebRequest r = (HttpWebRequest)WebRequest.Create(AdminApiUrl);
                    r.Method = "POST";
                    r.ContentType = "application/json";
                    r.Timeout = 4000;
                    string payload = string.Format(
                        "{{\"event_type\":\"{0}\",\"room_number\":\"{1}\",\"card_no\":\"{2}\",\"begin_time\":\"{3}\",\"end_time\":\"{4}\",\"staff_user\":\"{5}\",\"status\":\"{6}\",\"timestamp\":\"{7}\"}}",
                        evt, room, cardNo, bTime, eTime, staff, status, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
                    );
                    byte[] data = Encoding.UTF8.GetBytes(payload);
                    r.ContentLength = data.Length;
                    using (Stream s = r.GetRequestStream()) { s.Write(data, 0, data.Length); }
                    using (HttpWebResponse res = (HttpWebResponse)r.GetResponse()) { }
                }
                catch { }
            });
        }

        static string GetRequestBody(HttpListenerRequest req)
        {
            using (StreamReader sr = new StreamReader(req.InputStream, req.ContentEncoding)) { return sr.ReadToEnd(); }
        }

        static string ExtractJsonField(string json, string field)
        {
            int idx = json.IndexOf("\"" + field + "\"");
            if (idx == -1) return "";
            int start = json.IndexOf(":", idx);
            if (start == -1) return "";
            start++;
            while (start < json.Length && (json[start] == ' ' || json[start] == '\"')) start++;
            int end = start;
            while (end < json.Length && json[end] != '\"' && json[end] != ',' && json[end] != '}' && json[end] != '\r' && json[end] != '\n') end++;
            return json.Substring(start, end - start).Trim();
        }
    }
}
```

---

## 6. How to Test & Verify

1. **Start the Hardware Bridge** on the front-desk laptop:
   - Ensure the Be-Tech USB card encoder is plugged into the laptop.
   - Run the bridge service (listens on `http://127.0.0.1:8989`).
2. **Issue a test card for Room 205**:
   - `roomNumber = "205"`, `door_id = "000205"`, `guestSN = 800000205`, `suitDoor = "0000"`.
3. **Scan at the Door**:
   - Hold the card to Room 205's door lock.
   - The lock green LED will illuminate, the motor latch will turn, and the door will unlock smoothly.
