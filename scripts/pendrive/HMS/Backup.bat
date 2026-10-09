@echo off
rem Runs on the MAIN computer. Click Yes when Windows asks for permission.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell.exe -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File C:\HMS\scripts\tools.ps1 backup'"
