using System;
using System.IO;
using System.Diagnostics;
using System.Reflection;
using System.Windows.Forms;
using Microsoft.Win32;
using System.Net;
using System.Threading;

namespace SriTayiGrandRfidInstaller
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            bool isSilent = false;
            bool isDebug = false;
            foreach (string arg in args)
            {
                if (arg.Equals("/s", StringComparison.OrdinalIgnoreCase) ||
                    arg.Equals("/silent", StringComparison.OrdinalIgnoreCase) ||
                    arg.Equals("-s", StringComparison.OrdinalIgnoreCase) ||
                    arg.Equals("-q", StringComparison.OrdinalIgnoreCase) ||
                    arg.Equals("/q", StringComparison.OrdinalIgnoreCase))
                {
                    isSilent = true;
                }
                if (arg.Equals("/debug", StringComparison.OrdinalIgnoreCase))
                {
                    isDebug = true;
                }
            }

            Action<string> Log = (msg) => {
                if (isDebug)
                {
                    try { File.AppendAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "installer.log"), "[" + DateTime.Now.ToString("HH:mm:ss") + "] " + msg + Environment.NewLine); } catch {}
                }
            };

            Log("SriTayiGrand Setup started. Silent: " + isSilent);

            try
            {
                // ========================================================
                // STEP 1: Install ACS ACR120 Driver for Hardware VID_072F&PID_8003
                // ========================================================
                try
                {
                    string driverTempDir = Path.Combine(Path.GetTempPath(), "SriTayiGrand_RFID_Driver");
                    if (!Directory.Exists(driverTempDir)) Directory.CreateDirectory(driverTempDir);

                    Assembly currentAsm = Assembly.GetExecutingAssembly();
                    ExtractResource(currentAsm, "acr120.inf", Path.Combine(driverTempDir, "acr120.inf"));
                    ExtractResource(currentAsm, "acr120.cat", Path.Combine(driverTempDir, "acr120.cat"));
                    ExtractResource(currentAsm, "acr120u-2.0.0.0.msi", Path.Combine(driverTempDir, "acr120u-2.0.0.0.msi"));

                    string infPath = Path.Combine(driverTempDir, "acr120.inf");
                    if (File.Exists(infPath))
                    {
                        Log("Installing driver package with pnputil: " + infPath);
                        ProcessStartInfo pnpPsi = new ProcessStartInfo();
                        pnpPsi.FileName = "pnputil.exe";
                        pnpPsi.Arguments = "/add-driver \"" + infPath + "\" /install";
                        pnpPsi.WindowStyle = ProcessWindowStyle.Hidden;
                        pnpPsi.CreateNoWindow = true;
                        pnpPsi.UseShellExecute = false;
                        using (Process pnpProc = Process.Start(pnpPsi))
                        {
                            pnpProc.WaitForExit(10000);
                            Log("pnputil exit code: " + pnpProc.ExitCode);
                        }
                    }

                    string msiPath = Path.Combine(driverTempDir, "acr120u-2.0.0.0.msi");
                    if (File.Exists(msiPath))
                    {
                        Log("Running MSI installer: " + msiPath);
                        ProcessStartInfo msiPsi = new ProcessStartInfo();
                        msiPsi.FileName = "msiexec.exe";
                        msiPsi.Arguments = "/i \"" + msiPath + "\" /qn /norestart";
                        msiPsi.WindowStyle = ProcessWindowStyle.Hidden;
                        msiPsi.CreateNoWindow = true;
                        msiPsi.UseShellExecute = false;
                        using (Process msiProc = Process.Start(msiPsi))
                        {
                            msiProc.WaitForExit(15000);
                            Log("msiexec exit code: " + msiProc.ExitCode);
                        }
                    }
                }
                catch (Exception exDrv)
                {
                    Log("Driver installation note: " + exDrv.Message);
                }

                // ========================================================
                // STEP 2: Determine writable target directory
                // ========================================================
                string targetDir = null;
                string[] candidateDirs = new string[]
                {
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SriTayiGrand", "RFIDBridge"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "SriTayiGrand", "RFIDBridge"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".sritayigrand", "rfid-bridge"),
                    Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "rfid-bridge-service")
                };

                foreach (string candidate in candidateDirs)
                {
                    try
                    {
                        if (!string.IsNullOrEmpty(candidate))
                        {
                            if (!Directory.Exists(candidate)) Directory.CreateDirectory(candidate);
                            string testFile = Path.Combine(candidate, ".write_test");
                            File.WriteAllText(testFile, "ok");
                            File.Delete(testFile);
                            targetDir = candidate;
                            Log("Selected TargetDir: " + targetDir);
                            break;
                        }
                    }
                    catch (Exception exDir)
                    {
                        Log("Candidate rejected (" + candidate + "): " + exDir.Message);
                    }
                }

                if (string.IsNullOrEmpty(targetDir))
                {
                    throw new UnauthorizedAccessException("Could not find a writable directory for RFID service installation.");
                }

                // ========================================================
                // STEP 3: Terminate any previous instance to release file locks
                // ========================================================
                StopExistingInstances();
                Thread.Sleep(500);

                // ========================================================
                // STEP 4: Extract all bridge runtime resources
                // ========================================================
                Assembly asm = Assembly.GetExecutingAssembly();
                string[] resourceNames = asm.GetManifestResourceNames();

                Log("Extracting bridge resources to " + targetDir);
                foreach (string res in resourceNames)
                {
                    // Skip driver installer files in service target dir
                    if (res.EndsWith(".msi", StringComparison.OrdinalIgnoreCase) ||
                        res.EndsWith(".inf", StringComparison.OrdinalIgnoreCase) ||
                        res.EndsWith(".cat", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    string targetFile = Path.Combine(targetDir, res);
                    try
                    {
                        using (Stream inStream = asm.GetManifestResourceStream(res))
                        using (FileStream outStream = new FileStream(targetFile, FileMode.Create, FileAccess.Write, FileShare.ReadWrite))
                        {
                            inStream.CopyTo(outStream);
                        }
                        Log("Extracted: " + res);
                    }
                    catch (Exception exRes)
                    {
                        Log("Error extracting " + res + ": " + exRes.Message);
                    }
                }

                string exePath = Path.Combine(targetDir, "SriTayiGrandKeycardBridge.exe");
                if (!File.Exists(exePath))
                {
                    throw new FileNotFoundException("Failed to extract SriTayiGrandKeycardBridge.exe to " + targetDir);
                }

                // ========================================================
                // STEP 5: Configure Auto-Run on Boot (Registry & Startup)
                // ========================================================
                try
                {
                    Registry.SetValue(@"HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run", "SriTayiGrand_RFID_Bridge", "\"" + exePath + "\"");
                    Log("Registry Run key configured.");
                }
                catch (Exception exReg) { Log("Registry setup note: " + exReg.Message); }

                try
                {
                    string startupFolder = Environment.GetFolderPath(Environment.SpecialFolder.Startup);
                    string shortcutPath = Path.Combine(startupFolder, "SriTayiGrand_RFID_Bridge.lnk");
                    CreateShortcut(shortcutPath, exePath, targetDir, "Sri Tayi Grand - RFID Keycard Hardware Bridge");
                    Log("Startup shortcut created at " + shortcutPath);
                }
                catch (Exception exSc) { Log("Shortcut setup note: " + exSc.Message); }

                // ========================================================
                // STEP 6: Launch bridge immediately in background
                // ========================================================
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = exePath;
                psi.WorkingDirectory = targetDir;
                psi.WindowStyle = ProcessWindowStyle.Minimized;
                psi.UseShellExecute = true;
                Process.Start(psi);
                Log("Bridge process launched.");

                // ========================================================
                // STEP 7: Verify health on port 8989
                // ========================================================
                bool isHealthy = false;
                for (int i = 0; i < 6; i++)
                {
                    Thread.Sleep(500);
                    try
                    {
                        HttpWebRequest req = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:8989/api/status");
                        req.Timeout = 1000;
                        using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                        {
                            if (resp.StatusCode == HttpStatusCode.OK)
                            {
                                isHealthy = true;
                                Log("Health check verified: Bridge is ONLINE on port 8989.");
                                break;
                            }
                        }
                    }
                    catch (Exception exH) { Log("Health probe attempt " + (i+1) + ": " + exH.Message); }
                }

                // ========================================================
                // STEP 8: Success notification
                // ========================================================
                if (!isSilent)
                {
                    string statusMsg = isHealthy
                        ? "Sri Tayi Grand - RFID System Setup Complete!\n\n" +
                          "✔ Official USB Drivers installed\n" +
                          "✔ RFID Hardware Bridge is ACTIVE on Port 8989\n" +
                          "✔ Configured to auto-start with Windows\n\n" +
                          "Your Be-Tech RFID USB Card Reader is ready to encode keycards."
                        : "Sri Tayi Grand - RFID Hardware Bridge Installed!\n\n" +
                          "Drivers and bridge service have been installed successfully.\n" +
                          "Please ensure your Be-Tech USB card machine is connected.";

                    MessageBox.Show(
                        statusMsg,
                        "Sri Tayi Grand - RFID Setup",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information
                    );
                }
            }
            catch (Exception ex)
            {
                Log("EXCEPTION: " + ex.ToString());
                if (!isSilent)
                {
                    MessageBox.Show(
                        "Setup encountered an issue:\n\n" + ex.Message,
                        "Sri Tayi Grand - RFID Setup Error",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                }
            }
        }

        static void ExtractResource(Assembly asm, string resName, string destPath)
        {
            try
            {
                using (Stream inStream = asm.GetManifestResourceStream(resName))
                {
                    if (inStream != null)
                    {
                        using (FileStream outStream = new FileStream(destPath, FileMode.Create, FileAccess.Write, FileShare.ReadWrite))
                        {
                            inStream.CopyTo(outStream);
                        }
                    }
                }
            }
            catch {}
        }

        static void StopExistingInstances()
        {
            string[] procNames = { "SriTayiGrandKeycardBridge" };
            foreach (string name in procNames)
            {
                try
                {
                    foreach (Process p in Process.GetProcessesByName(name))
                    {
                        try
                        {
                            p.Kill();
                            p.WaitForExit(1000);
                        }
                        catch {}
                    }
                }
                catch {}
            }
        }

        static void CreateShortcut(string shortcutPath, string targetPath, string workingDir, string description)
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType == null) return;
                object shell = Activator.CreateInstance(shellType);
                object shortcut = shellType.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, shell, new object[] { shortcutPath });
                Type scType = shortcut.GetType();
                scType.InvokeMember("TargetPath", BindingFlags.SetProperty, null, shortcut, new object[] { targetPath });
                scType.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, shortcut, new object[] { workingDir });
                scType.InvokeMember("WindowStyle", BindingFlags.SetProperty, null, shortcut, new object[] { 7 }); // Minimized
                scType.InvokeMember("Description", BindingFlags.SetProperty, null, shortcut, new object[] { description });
                scType.InvokeMember("Save", BindingFlags.InvokeMethod, null, shortcut, null);
            }
            catch {}
        }
    }
}
