@echo off
title Sri Tayi Grand - Compile One-Click RFID Installer with Auto Drivers
echo Building SriTayiGrand_RFID_Setup.exe with embedded drivers and admin manifest...

C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe /target:winexe /platform:x86 /win32manifest:"app.manifest" /out:"SriTayiGrand_RFID_Setup.exe" /r:System.Windows.Forms.dll /r:System.Drawing.dll /res:"..\bin\SriTayiGrandKeycardBridge.exe,SriTayiGrandKeycardBridge.exe" /res:"..\bin\bridge_config.ini,bridge_config.ini" /res:"..\bin\btlock57l.dll,btlock57l.dll" /res:"..\bin\btlock57.dll,btlock57.dll" /res:"..\bin\btmf1232.dll,btmf1232.dll" /res:"..\bin\Data.dll,Data.dll" /res:"..\bin\EasyD12_500.dll,EasyD12_500.dll" /res:"..\bin\acr120u.dll,acr120u.dll" /res:"..\bin\AcsReader.dll,AcsReader.dll" /res:"..\bin\zymsr232.dll,zymsr232.dll" /res:"..\bin\zymurusb.dll,zymurusb.dll" /res:"..\bin\driver\acr120.inf,acr120.inf" /res:"..\bin\driver\acr120.cat,acr120.cat" /res:"..\bin\driver\acr120u-2.0.0.0.msi,acr120u-2.0.0.0.msi" "Setup.cs"

if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Installer built successfully: SriTayiGrand_RFID_Setup.exe
    copy /y "SriTayiGrand_RFID_Setup.exe" "..\..\public\downloads\SriTayiGrand_RFID_Setup.exe"
) else (
    echo [ERROR] Build failed.
)
