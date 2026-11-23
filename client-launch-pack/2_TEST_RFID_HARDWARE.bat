@echo off
title Sri Tayi Grand - RFID Hardware Diagnostic
echo Running 5-point hardware check...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\test-hardware.ps1"
