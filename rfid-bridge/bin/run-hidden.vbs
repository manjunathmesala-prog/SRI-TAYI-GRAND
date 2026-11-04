Dim oShell, fso, scriptDir, exePath
Set oShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
exePath = scriptDir & "\SriAnanthaKeycardBridge.exe"

If fso.FileExists(exePath) Then
    ' Run completely hidden (0 = hidden window, False = don't wait for completion)
    oShell.CurrentDirectory = scriptDir
    oShell.Run """" & exePath & """", 0, False
End If
