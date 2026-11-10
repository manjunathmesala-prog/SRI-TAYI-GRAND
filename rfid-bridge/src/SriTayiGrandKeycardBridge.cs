using System;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Runtime.InteropServices;
using System.Collections.Generic;

namespace SriTayiGrandRfidBridge
{
    class Program
    {
        // Safe logging that never throws if running as an invisible Windows GUI daemon
        static void Log(string msg) { try { Console.WriteLine(msg); } catch {} try { System.IO.File.AppendAllText(System.IO.Path.Combine(System.AppDomain.CurrentDomain.BaseDirectory, "bridge_debug.log"), System.DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss ") + msg + System.Environment.NewLine); } catch {} }

        // P/Invoke definitions for Be-Tech BIS Hotel 5.7 btlock57l.dll
        [DllImport("btlock57l.dll", EntryPoint = "Write_Guest_Card", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
        public static extern short Write_Guest_Card(
            byte Port,
            byte ReaderType,
            byte SectorNo,
            string HotelPwd,
            int CardNo,
            int GuestSN,
            short GuestIdx,
            string DoorID,
            string SuitDoor,
            string PubDoor,
            string BeginTime,
            string EndTime
        );

        [DllImport("btlock57l.dll", EntryPoint = "Read_Guest_Card", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
        public static extern short Read_Guest_Card(
            byte Port,
            byte ReaderType,
            byte SectorNo,
            string HotelPwd,
            ref int CardNo,
            ref int GuestSN,
            ref short GuestIdx,
            StringBuilder DoorID,
            StringBuilder SuitDoor,
            StringBuilder PubDoor,
            StringBuilder BeginTime,
            StringBuilder EndTime
        );

        [DllImport("btlock57l.dll", EntryPoint = "Reader_Alarm", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
        public static extern short Reader_Alarm(
            byte Port,
            byte ReaderType,
            byte AlarmCount
        );

        // Hardware Configuration (Configurable via bridge_config.ini)
        public static byte Port = 1;
        public static byte ReaderType = 4; // USB Mifare Reader
        public static byte SectorNo = 0;
        public static string HotelPwd = "TAYIGR";
        public static string AdminApiUrl = "http://localhost:3000/api/admin/rfid-logs";
        public static int ListenPort = 8989;

        static HttpListener listener;
        static bool isRunning = true;
        static Mutex singleInstanceMutex;

        static void Main(string[] args) {
            bool createdNew;
            singleInstanceMutex = new Mutex(true, "Global\\SriTayiGrand_RFID_Bridge_Singleton_Mutex", out createdNew);
            if (!createdNew)
            {
                return;
            } AppDomain.CurrentDomain.UnhandledException += (s, e) => { Log("[UNHANDLED THREAD EXCEPTION] " + e.ExceptionObject.ToString()); }; try { Console.Title = "Sri Tayi Grand Hotel - RFID Hardware Bridge Service"; } catch {}
            Log("========================================================");
            Log("   SRI TAYI GRAND HOTEL - RFID HARDWARE BRIDGE SERVICE  ");
            Log("   Hardware: Be-Tech BIS 5.7 (btlock57l.dll)            ");
            Log("   Local Endpoint: http://127.0.0.1:" + ListenPort + "/            ");
            Log("========================================================");

            LoadConfig();

            // Enable TLS 1.2 for modern HTTPS webhook delivery
            try
            {
                ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072 | SecurityProtocolType.Tls;
            }
            catch {}

            // Start HTTP listener with resilient prefix registration and retry
            bool started = false;
            for (int attempt = 1; attempt <= 3 && !started; attempt++)
            {
                try
                {
                    listener = new HttpListener();
                    listener.Prefixes.Add("http://127.0.0.1:" + ListenPort + "/");
                    try { listener.Prefixes.Add("http://localhost:" + ListenPort + "/"); } catch {}
                    listener.Start();
                    started = true;
                    Log("[INFO] Bridge service is listening on port " + ListenPort);
                    Log("[INFO] Ready for requests from Sri Tayi Grand Admin Portal");

                    Thread listenerThread = new Thread(ListenLoop);
                    listenerThread.IsBackground = true;
                    listenerThread.Start();
                }
                catch (Exception ex)
                {
                    Log("[WARN] Listener start attempt " + attempt + " failed (" + ex.Message + "). Retrying pure 127.0.0.1...");
                    try
                    {
                        listener = new HttpListener();
                        listener.Prefixes.Add("http://127.0.0.1:" + ListenPort + "/");
                        listener.Start();
                        started = true;
                        Log("[INFO] Bridge service bound to 127.0.0.1:" + ListenPort);
                        Thread listenerThread = new Thread(ListenLoop);
                        listenerThread.IsBackground = true;
                        listenerThread.Start();
                    }
                    catch (Exception ex2)
                    {
                        Log("[ERROR] Attempt " + attempt + " failed: " + ex2.Message);
                        Thread.Sleep(1000);
                    }
                }
            }

            Log("\nService is running permanently in background.\n");
            while (isRunning)
            {
                Thread.Sleep(1000);
            }
        }

        static void LoadConfig()
        {
            try
            {
                string iniPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "bridge_config.ini");
                if (File.Exists(iniPath))
                {
                    string[] lines = File.ReadAllLines(iniPath);
                    foreach (string line in lines)
                    {
                        string trimmed = line.Trim();
                        if (trimmed.StartsWith("#") || !trimmed.Contains("=")) continue;
                        string[] parts = trimmed.Split(new char[] { '=' }, 2);
                        string k = parts[0].Trim().ToLower();
                        string v = parts[1].Trim();

                        if (k == "port") byte.TryParse(v, out Port);
                        else if (k == "readertype") byte.TryParse(v, out ReaderType);
                        else if (k == "sectorno") byte.TryParse(v, out SectorNo);
                        else if (k == "hotelpwd") HotelPwd = v;
                        else if (k == "adminapiurl") AdminApiUrl = v;
                        else if (k == "listenport") int.TryParse(v, out ListenPort);
                    }
                    Log("[CONFIG] Loaded configuration from bridge_config.ini");
                }
                else
                {
                    string defConfig =
                        "# Sri Tayi Grand Hotel - RFID Bridge Configuration\n" +
                        "port=1\n" +
                        "readertype=4\n" +
                        "sectorno=0\n" +
                        "hotelpwd=TAYIGR\n" +
                        "adminapiurl=http://localhost:3000/api/admin/rfid-logs\n" +
                        "listenport=8989\n";
                    File.WriteAllText(iniPath, defConfig);
                    Log("[CONFIG] Created default bridge_config.ini");
                }
            }
            catch (Exception ex)
            {
                Log("[CONFIG WARN] " + ex.Message);
            }
        }

        static void ListenLoop()
        {
            while (isRunning && listener.IsListening)
            {
                try
                {
                    HttpListenerContext context = listener.GetContext();
                    ThreadPool.QueueUserWorkItem((o) => ProcessRequest(context));
                }
                catch (Exception)
                {
                    if (!isRunning) break;
                }
            }
        }

        static bool CheckHardwareConnected(out string detail)
        {
            try
            {
                short alarmRes = Reader_Alarm(Port, ReaderType, 0);
                if (alarmRes == 0)
                {
                    detail = "Be-Tech BIS 5.7 USB Encoder Ready on Port " + Port;
                    return true;
                }

                int cardNo = 0, guestSN = 0;
                short guestIdx = 0;
                StringBuilder door = new StringBuilder(20);
                StringBuilder suit = new StringBuilder(20);
                StringBuilder pub = new StringBuilder(20);
                StringBuilder begin = new StringBuilder(20);
                StringBuilder end = new StringBuilder(20);

                short readRes = Read_Guest_Card(Port, ReaderType, SectorNo, HotelPwd, ref cardNo, ref guestSN, ref guestIdx, door, suit, pub, begin, end);
                if (readRes == 0 || readRes == 6 || readRes == 4 || readRes == 7)
                {
                    detail = "Be-Tech BIS 5.7 USB Encoder Ready on Port " + Port;
                    return true;
                }

                detail = "Be-Tech USB Card Encoder not detected on Port " + Port + ". Ensure the USB cable is firmly plugged in.";
                return false;
            }
            catch (Exception ex)
            {
                detail = "Hardware driver error: " + ex.Message;
                return false;
            }
        }

        static void ProcessRequest(HttpListenerContext context)
        {
            HttpListenerRequest req = context.Request;
            HttpListenerResponse res = context.Response;

            try
            {
                // Enable CORS headers for browser requests from web admin
                res.AddHeader("Access-Control-Allow-Origin", "*");
                res.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
                res.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Staff-User");
                res.AddHeader("Access-Control-Allow-Private-Network", "true");
                res.ContentType = "application/json; charset=utf-8";

                if (req.HttpMethod == "OPTIONS")
                {
                    res.StatusCode = 200;
                    res.Close();
                    return;
                }

                string path = req.Url != null ? req.Url.AbsolutePath.ToLower() : req.RawUrl.ToLower();
                string responseJson = "";

                if (path.StartsWith("/api/status"))
                {
                    string hwDetail;
                    bool isHwConnected = CheckHardwareConnected(out hwDetail);
                    if (isHwConnected)
                    {
                        responseJson = "{\"status\":\"ok\",\"isOnline\":true,\"hardwareConnected\":true,\"service\":\"SriTayiGrand-RFID-Bridge\",\"port\":" + Port + ",\"readerType\":" + ReaderType + ",\"message\":\"" + hwDetail.Replace("\"", "\\\"") + "\"}";
                    }
                    else
                    {
                        responseJson = "{\"status\":\"hardware_offline\",\"isOnline\":false,\"hardwareConnected\":false,\"service\":\"SriTayiGrand-RFID-Bridge\",\"port\":" + Port + ",\"readerType\":" + ReaderType + ",\"error\":\"" + hwDetail.Replace("\"", "\\\"") + "\"}";
                    }
                }
                else if (path.StartsWith("/api/read-card"))
                {
                    responseJson = HandleReadCard(req);
                }
                else if (path.StartsWith("/api/issue-card"))
                {
                    responseJson = HandleIssueCard(req);
                }
                else if (path.StartsWith("/api/checkout-card"))
                {
                    responseJson = HandleCheckoutCard(req);
                }
                else
                {
                    res.StatusCode = 404;
                    responseJson = "{\"error\":\"Not Found\",\"availableEndpoints\":[\"/api/status\",\"/api/read-card\",\"/api/issue-card\",\"/api/checkout-card\"]}";
                }

                byte[] buf = Encoding.UTF8.GetBytes(responseJson);
                res.ContentLength64 = buf.Length;
                res.OutputStream.Write(buf, 0, buf.Length);
                res.OutputStream.Close();
            }
            catch (Exception ex)
            {
                Log("[CLIENT REQUEST ERROR / DISCONNECT] " + ex.Message);
                try { res.Close(); } catch {}
            }
        }

        static string GetErrorMessage(short code)
        {
            switch (code)
            {
                case 0: return "Card operation completed successfully.";
                case 1:
                    try { if (Reader_Alarm(Port, ReaderType, 0) == 0) return "Be-Tech USB Reader is ready, but no RFID card is placed on it. Please place a Mifare 1K keycard flat on the reader."; } catch {}
                    return "No RFID card detected on reader or encoder USB disconnected. Please ensure the Mifare keycard is placed flat on the reader.";
                case 2: return "Encoder communication port is busy. Please try again in a moment.";
                case 3: return "Invalid room number or authorization time format.";
                case 4: return "Hotel system password mismatch (Configured: TAYIGR) or sector authentication failure.";
                case 5: return "Failed to write card. The Mifare card may be damaged, write-protected, or was lifted too quickly.";
                case 6: return "Reader is ready, but no RFID card is placed on it. Please place a Mifare 1K keycard on the reader surface.";
                case 7: return "Unsupported card type. Please place a Be-Tech Mifare 1K S50 RFID card.";
                default: return "Hardware return code " + code + " from Be-Tech BIS 5.7 driver.";
            }
        }

        struct PortCandidate { public byte Port; public byte ReaderType; public PortCandidate(byte p, byte rt) { Port = p; ReaderType = rt; } }
        static readonly PortCandidate[] ProbeCandidates = new PortCandidate[]
        {
            new PortCandidate(1, 4), // USB Port 1
            new PortCandidate(0, 4), // USB Port 0 / Auto
            new PortCandidate(2, 4), // USB Port 2
            new PortCandidate(1, 0), // Default/Auto 1
            new PortCandidate(1, 1), // COM1 Serial
            new PortCandidate(2, 1), // COM2 Serial
            new PortCandidate(3, 1), // COM3 Serial
            new PortCandidate(4, 1)  // COM4 Serial
        };

        // Auto-detect and write to Be-Tech encoder across standard USB & COM ports
        static short AutoWriteGuestCard(int cardNo, int guestSN, short guestIdx, string strLockID, string strSuitDoor, string strPubDoor, string beginTime, string endTime)
        {
            short res = 1;
            try
            {
                res = Write_Guest_Card(Port, ReaderType, SectorNo, HotelPwd, cardNo, guestSN, guestIdx, strLockID, strSuitDoor, strPubDoor, beginTime, endTime);
            }
            catch (Exception ex)
            {
                Log("[P/INVOKE EXCEPTION WRITE] " + ex.Message);
                return 1;
            }

            if (res == 0 || res == 6)
            {
                return res;
            }

            // If Port failed (code 1 = port open fail / no reader), probe common ports
            if (res == 1)
            {
                foreach (PortCandidate cand in ProbeCandidates)
                {
                    if (cand.Port == Port && cand.ReaderType == ReaderType) continue;
                    try
                    {
                        short probeRes = Write_Guest_Card(cand.Port, cand.ReaderType, SectorNo, HotelPwd, cardNo, guestSN, guestIdx, strLockID, strSuitDoor, strPubDoor, beginTime, endTime);
                        if (probeRes == 0 || probeRes == 6)
                        {
                            Port = cand.Port;
                            ReaderType = cand.ReaderType;
                            Log(string.Format("[AUTO-PORT DETECT] Successfully bound to Be-Tech Encoder on Port={0}, ReaderType={1} (res={2})", cand.Port, cand.ReaderType, probeRes));
                            return probeRes;
                        }
                    }
                    catch {}
                }
            }

            return res;
        }

        // Auto-detect and read from Be-Tech encoder across standard USB & COM ports
        static short AutoReadGuestCard(ref int cardNo, ref int guestSN, ref short guestIdx, StringBuilder doorID, StringBuilder suitDoor, StringBuilder pubDoor, StringBuilder beginTime, StringBuilder endTime)
        {
            short res = 1;
            try
            {
                res = Read_Guest_Card(Port, ReaderType, SectorNo, HotelPwd, ref cardNo, ref guestSN, ref guestIdx, doorID, suitDoor, pubDoor, beginTime, endTime);
            }
            catch (Exception ex)
            {
                Log("[P/INVOKE EXCEPTION READ] " + ex.Message);
                return 1;
            }

            if (res == 0 || res == 6)
            {
                return res;
            }

            if (res == 1)
            {
                foreach (PortCandidate cand in ProbeCandidates)
                {
                    if (cand.Port == Port && cand.ReaderType == ReaderType) continue;
                    try
                    {
                        short probeRes = Read_Guest_Card(cand.Port, cand.ReaderType, SectorNo, HotelPwd, ref cardNo, ref guestSN, ref guestIdx, doorID, suitDoor, pubDoor, beginTime, endTime);
                        if (probeRes == 0 || probeRes == 6)
                        {
                            Port = cand.Port;
                            ReaderType = cand.ReaderType;
                            Log(string.Format("[AUTO-PORT DETECT] Successfully bound to Be-Tech Encoder on Port={0}, ReaderType={1} (res={2})", cand.Port, cand.ReaderType, probeRes));
                            return probeRes;
                        }
                    }
                    catch {}
                }
            }

            return res;
        }

        static string HandleReadCard(HttpListenerRequest req)
        {
            int cardNo = 0;
            int guestSN = 0;
            short guestIdx = 0;
            StringBuilder doorID = new StringBuilder(10);
            StringBuilder suitDoor = new StringBuilder(20);
            StringBuilder pubDoor = new StringBuilder(20);
            StringBuilder beginTime = new StringBuilder(20);
            StringBuilder endTime = new StringBuilder(20);

            short result = AutoReadGuestCard(
                ref cardNo,
                ref guestSN,
                ref guestIdx,
                doorID,
                suitDoor,
                pubDoor,
                beginTime,
                endTime
            );

            string staffUser = req.Headers["X-Staff-User"] ?? "Front Desk";

            if (result == 0)
            {
                try { Reader_Alarm(Port, ReaderType, 1); } catch {} // 1 Beep confirmation
                string rawDoor = doorID.ToString().Trim();
                string roomNumber = rawDoor.TrimStart('0');
                if (string.IsNullOrEmpty(roomNumber)) roomNumber = rawDoor;

                string json = "{" +
                    "\"success\":true," +
                    "\"code\":0," +
                    "\"roomNumber\":\"" + roomNumber + "\"," +
                    "\"cardNo\":" + cardNo + "," +
                    "\"guestSN\":" + guestSN + "," +
                    "\"beginTime\":\"" + beginTime.ToString().Trim() + "\"," +
                    "\"endTime\":\"" + endTime.ToString().Trim() + "\"," +
                    "\"message\":\"Card read successfully\"" +
                "}";

                RecordTapEvent("TAP_READ", roomNumber, cardNo, beginTime.ToString().Trim(), endTime.ToString().Trim(), staffUser, "SUCCESS");
                return json;
            }
            else
            {
                string errMsg = GetErrorMessage(result);
                RecordTapEvent("TAP_READ_FAIL", "", 0, "", "", staffUser, errMsg);
                return "{\"success\":false,\"code\":" + result + ",\"error\":\"" + errMsg + "\"}";
            }
        }

                static readonly object snLock = new object();
        static int GetNextSequenceNumber()
        {
            lock (snLock)
            {
                // Strict progression above both Be-Tech timestamp and HMS sequence counter (>= 1000020500)
                int nextSN = 1000020500;
                try
                {
                    string snPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "card_sn_counter.dat");
                    if (File.Exists(snPath))
                    {
                        string txt = File.ReadAllText(snPath).Trim();
                        int parsed;
                        if (int.TryParse(txt, out parsed))
                        {
                            if (parsed >= nextSN)
                            {
                                nextSN = parsed + 1;
                            }
                        }
                    }
                    File.WriteAllText(snPath, nextSN.ToString());
                }
                catch {}
                return nextSN;
            }
        }
        static string HandleIssueCard(HttpListenerRequest req)
        {
            string body = GetRequestBody(req);
            string roomNumber = ExtractJsonField(body, "roomNumber");
            string beginTime = ExtractJsonField(body, "beginTime");
            string endTime = ExtractJsonField(body, "endTime");
            string staffUser = req.Headers["X-Staff-User"] ?? ExtractJsonField(body, "staffUser");
            if (string.IsNullOrEmpty(staffUser)) staffUser = "Front Desk";

            if (string.IsNullOrEmpty(roomNumber))
            {
                return "{\"success\":false,\"error\":\"roomNumber is required\"}";
            }

            // Always strictly enforce Perpetual / Lifetime validity (0001010000 / 9912312359) for physical Be-Tech door locks
            beginTime = "0001010000";
            endTime = "9912312359";

            string strLockID = roomNumber.PadLeft(6, '0');
            string strSuitDoor = "0000"; // Exactly 4 characters for Be-Tech lock firmware
            string strPubDoor = "00000000"; // Exactly 8 characters
            int guestSN = GetNextSequenceNumber();
            int cardNo = guestSN;
            short guestIdx = 1; // 1 = Primary Guest (matches Be-Tech lock database holder_no)

            short result = AutoWriteGuestCard(
                cardNo,
                guestSN,
                guestIdx,
                strLockID,
                strSuitDoor,
                strPubDoor,
                beginTime,
                endTime
            );

            if (result == 0)
            {
                try { Reader_Alarm(Port, ReaderType, 2); } catch {} // 2 Beeps on activation
                try { Console.Beep(2000, 120); System.Threading.Thread.Sleep(50); Console.Beep(2500, 200); } catch {}
                RecordTapEvent("TAP_ACTIVATE", roomNumber, cardNo, beginTime, endTime, staffUser, "SUCCESS");
                return "{\"success\":true,\"code\":0,\"roomNumber\":\"" + roomNumber + "\",\"cardNo\":" + cardNo + ",\"beginTime\":\"" + beginTime + "\",\"endTime\":\"" + endTime + "\",\"message\":\"Card activated successfully\"}";
            }
            else
            {
                try { Console.Beep(800, 300); } catch {}
                string errMsg = GetErrorMessage(result);
                RecordTapEvent("TAP_ACTIVATE_FAIL", roomNumber, cardNo, beginTime, endTime, staffUser, errMsg);
                return "{\"success\":false,\"code\":" + result + ",\"error\":\"" + errMsg + "\"}";
            }
        }

        static string HandleCheckoutCard(HttpListenerRequest req)
        {
            string body = GetRequestBody(req);
            string roomNumber = ExtractJsonField(body, "roomNumber");
            string staffUser = req.Headers["X-Staff-User"] ?? ExtractJsonField(body, "staffUser");
            if (string.IsNullOrEmpty(staffUser)) staffUser = "Front Desk";

            string strLockID = "000000";
            string strSuitDoor = "0000";
            string strPubDoor = "00000000";
            string beginTime = DateTime.Now.ToString("yyMMddHHmm");
            string endTime = beginTime;
            int cardNo = 0;
            int guestSN = 1;
            short guestIdx = 1;

            short result = AutoWriteGuestCard(
                cardNo,
                guestSN,
                guestIdx,
                strLockID,
                strSuitDoor,
                strPubDoor,
                beginTime,
                endTime
            );

            if (result == 0)
            {
                try { Reader_Alarm(Port, ReaderType, 1); } catch {}
                RecordTapEvent("TAP_DEACTIVATE", roomNumber, 0, beginTime, endTime, staffUser, "SUCCESS");
                return "{\"success\":true,\"code\":0,\"roomNumber\":\"" + roomNumber + "\",\"message\":\"Card cleared/deactivated successfully\"}";
            }
            else
            {
                string errMsg = GetErrorMessage(result);
                RecordTapEvent("TAP_DEACTIVATE_FAIL", roomNumber, 0, beginTime, endTime, staffUser, errMsg);
                return "{\"success\":false,\"code\":" + result + ",\"error\":\"" + errMsg + "\"}";
            }
        }

        static void RecordTapEvent(string eventType, string roomNumber, int cardNo, string beginTime, string endTime, string staffUser, string status)
        {
            string timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
            string logLine = string.Format("[{0}] Event: {1} | Room: {2} | Card: {3} | Valid: {4} to {5} | Staff: {6} | Status: {7}",
                timestamp, eventType, roomNumber, cardNo, beginTime, endTime, staffUser, status);

            Log(logLine);

            try
            {
                string logFile = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "rfid_tap_audit.log");
                File.AppendAllText(logFile, logLine + Environment.NewLine);
            }
            catch {}

            // Dispatch tap record to local and cloud production admin endpoints
            List<string> targetUrls = new List<string>();
            if (!string.IsNullOrEmpty(AdminApiUrl)) targetUrls.Add(AdminApiUrl);
            string prodVercelUrl = "https://sri-tayi-grand.vercel.app/api/admin/rfid-logs";
            if (!targetUrls.Contains(prodVercelUrl)) targetUrls.Add(prodVercelUrl);

            foreach (string targetUrl in targetUrls)
            {
                string destination = targetUrl;
                ThreadPool.QueueUserWorkItem((o) =>
                {
                    try
                    {
                        HttpWebRequest webReq = (HttpWebRequest)WebRequest.Create(destination);
                        webReq.Method = "POST";
                        webReq.ContentType = "application/json";
                        webReq.Timeout = 6000;

                        string payload = "{" +
                            "\"event_type\":\"" + eventType + "\"," +
                            "\"room_number\":\"" + roomNumber + "\"," +
                            "\"card_no\":\"" + cardNo + "\"," +
                            "\"begin_time\":\"" + beginTime + "\"," +
                            "\"end_time\":\"" + endTime + "\"," +
                            "\"staff_user\":\"" + staffUser + "\"," +
                            "\"status\":\"" + status + "\"," +
                            "\"timestamp\":\"" + timestamp + "\"" +
                        "}";

                        byte[] data = Encoding.UTF8.GetBytes(payload);
                        webReq.ContentLength = data.Length;
                        using (Stream s = webReq.GetRequestStream())
                        {
                            s.Write(data, 0, data.Length);
                        }
                        using (HttpWebResponse r = (HttpWebResponse)webReq.GetResponse()) {}
                    }
                    catch (Exception ex)
                    {
                        Log("[TAP RECORD NOTIFY -> " + destination + "] (" + ex.Message + ")");
                    }
                });
            }
        }

        static string GetRequestBody(HttpListenerRequest req)
        {
            if (!req.HasEntityBody) return "";
            using (StreamReader sr = new StreamReader(req.InputStream, req.ContentEncoding))
            {
                return sr.ReadToEnd();
            }
        }

        static string ExtractJsonField(string json, string field)
        {
            if (string.IsNullOrEmpty(json)) return "";
            string key = "\"" + field + "\"";
            int idx = json.IndexOf(key);
            if (idx == -1) return "";
            int start = json.IndexOf(":", idx);
            if (start == -1) return "";
            start++;
            while (start < json.Length && (json[start] == ' ' || json[start] == '\"')) start++;
            int end = start;
            while (end < json.Length && json[end] != '\"' && json[end] != ',' && json[end] != '}' && json[end] != '\r' && json[end] != '\n') end++;
            return json.Substring(start, end - start).Trim();
        }

        static string EscapeJson(string str)
        {
            if (string.IsNullOrEmpty(str)) return "";
            return str.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\n", "\\n").Replace("\r", "\\r");
        }
    }
}
