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
                    arg.Equals("-s", StringComparison.OrdinalIgnoreCase))
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

            Log("Setup started. Args: " + string.Join(" ", args));

            try
            {
                // 1. Determine writable target directory with smart fallbacks
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
                            // Test write permission
                            string testFile = Path.Combine(candidate, ".write_test");
                            File.WriteAllText(testFile, "ok");
                            File.Delete(testFile);
                            targetDir = candidate;
                            Log("Selected writable TargetDir: " + targetDir);
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

                // 2. Terminate any previous instance to release file locks
                StopExistingInstances();

                // Small pause to release DLL locks
                Thread.Sleep(500);

                // 3. Extract all embedded resources into target folder
                Assembly asm = Assembly.GetExecutingAssembly();
                string[] resourceNames = asm.GetManifestResourceNames();

                Log("Extracting embedded resources to " + targetDir);
                foreach (string res in resourceNames)
                {
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

                // 4. Configure Layer 1: Windows Registry Auto-Run (HKCU Run - Current User)
                try
                {
                    Registry.SetValue(@"HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run", "SriTayiGrand_RFID_Bridge", "\"" + exePath + "\"");
                    Log("Registry Run key configured.");
                }
                catch (Exception exReg) { Log("Registry setup note: " + exReg.Message); }

                // 5. Configure Layer 2: Windows Startup Folder Shortcut (shell:startup)
                try
                {
                    string startupFolder = Environment.GetFolderPath(Environment.SpecialFolder.Startup);
                    string shortcutPath = Path.Combine(startupFolder, "SriTayiGrand_RFID_Bridge.lnk");
                    CreateShortcut(shortcutPath, exePath, targetDir, "Sri Tayi Grand - RFID Keycard Hardware Bridge");
                    Log("Startup shortcut created at " + shortcutPath);
                }
                catch (Exception exSc) { Log("Shortcut setup note: " + exSc.Message); }

                // 6. Launch the bridge immediately in minimized background mode
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = exePath;
                psi.WorkingDirectory = targetDir;
                psi.WindowStyle = ProcessWindowStyle.Minimized;
                psi.UseShellExecute = true;
                Process.Start(psi);
                Log("Bridge process launched.");

                // 7. Verify bridge health via local HTTP port
                bool isHealthy = false;
                for (int i = 0; i < 4; i++)
                {
                    Thread.Sleep(400);
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

                // 8. One-click completion prompt
                if (!isSilent)
                {
                    string statusMsg = isHealthy
                        ? "RFID Hardware Bridge is INSTALLED and ACTIVE on Port 8989!\n\n" +
                          "Your Be-Tech RFID card encoder is ready to use.\n" +
                          "The service is configured to run automatically every time this laptop turns on.\n\n" +
                          "You can now use RFID cards in the Sri Tayi Grand web portal."
                        : "RFID Hardware Bridge has been installed and started!\n\n" +
                          "The service is configured to run automatically on this computer.\n" +
                          "Please make sure your Be-Tech USB card machine is plugged in.";

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
                        "Setup could not complete automatically:\n\n" + ex.Message,
                        "Sri Tayi Grand - RFID Setup Error",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                }
            }
        }

        static void StopExistingInstances()
        {
            string[] procNames = { "SriTayiGrandKeycardBridge", "SriAnanthaKeycardBridge" };
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
