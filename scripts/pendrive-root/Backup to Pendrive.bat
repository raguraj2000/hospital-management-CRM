@echo off
rem Plug in a pendrive, double-click: copies all clinic data to it. Do this every week.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\backup-to-pendrive.ps1"
