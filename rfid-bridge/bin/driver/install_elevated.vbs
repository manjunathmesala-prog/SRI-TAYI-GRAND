Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
Set oShell = CreateObject("Shell.Application")
oShell.ShellExecute "cmd.exe", "/c """ & scriptDir & "\install_driver.cmd""", "", "runas", 1
