@echo off
title NeuroShield Launcher
cd /d "%~dp0"
echo ========================================================
echo  NEUROSHIELD - Continuous Adaptive Defense System
echo  Starting application via 'npm run electron'...
echo ========================================================
echo.
call npm run electron
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo [NeuroShield Launcher] Process ended with exit code %ERRORLEVEL%.
  pause
)
