@echo off
rem Runs on the MAIN computer, whenever the patient data should be cleared (for example after testing). Click Yes when Windows asks for permission.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell.exe -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File C:\HMS\scripts\tools.ps1 start-fresh'"
