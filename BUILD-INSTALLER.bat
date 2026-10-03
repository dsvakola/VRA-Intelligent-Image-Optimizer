@echo off
title Build VRA Intelligent Image Optimizer installer
cd /d "%~dp0"
echo.
echo ===== VRA Intelligent Image Optimizer - build installer =====
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install it from https://nodejs.org and run this file again.
  pause
  exit /b 1
)
set CSC_IDENTITY_AUTO_DISCOVERY=false
echo Step 1 of 2: installing required libraries (needs internet, first time only)...
call npm install
if errorlevel 1 (
  echo.
  echo npm install failed. Check the internet connection and try again.
  pause
  exit /b 1
)
echo.
echo Step 2 of 2: building the installer...
call npm run dist
if errorlevel 1 (
  echo.
  echo Build failed. Please send me the red error text above.
  pause
  exit /b 1
)
echo.
echo ===== DONE =====
echo The installer is in the "release" folder:
dir /b release\*.exe
echo.
start "" "%~dp0release"
pause
