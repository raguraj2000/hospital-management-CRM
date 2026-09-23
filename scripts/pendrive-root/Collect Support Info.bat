@echo off
rem Copies logs (no patient data) to a pendrive for the developer.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\collect-support-info.ps1"
