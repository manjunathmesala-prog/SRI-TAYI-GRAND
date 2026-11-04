@echo off
echo ====================================================
echo Rebuilding SriAnanthaKeycardBridge.exe...
echo ====================================================
C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe /platform:x86 /target:exe /out:"..\bin\SriAnanthaKeycardBridge.exe" "SriAnanthaKeycardBridge.cs"
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Rebuilt successfully to ..\bin\SriAnanthaKeycardBridge.exe
) else (
    echo [FAILED] Compilation failed.
)
pause
