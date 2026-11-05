@echo off
echo ====================================================
echo Rebuilding SriTayiGrandKeycardBridge.exe...
echo ====================================================
C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe /platform:x86 /target:exe /out:"..\bin\SriTayiGrandKeycardBridge.exe" "SriTayiGrandKeycardBridge.cs"
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Rebuilt successfully to ..\bin\SriTayiGrandKeycardBridge.exe
) else (
    echo [FAILED] Compilation failed.
)
pause
