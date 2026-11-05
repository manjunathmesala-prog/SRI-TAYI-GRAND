Dim oShell, fso, scriptDir, exePath
Set oShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
exePath = scriptDir & "\SriTayiGrandKeycardBridge.exe"
If Not fso.FileExists(exePath) Then
    exePath = scriptDir & "\SriAnanthaKeycardBridge.exe"
End If

If fso.FileExists(exePath) Then
    ' Run completely hidden (0 = hidden window, False = don't wait for completion)
    oShell.CurrentDirectory = scriptDir
    oShell.Run """" & exePath & """", 0, False
End If
