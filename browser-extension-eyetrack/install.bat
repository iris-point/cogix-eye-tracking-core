@echo off
echo ===============================================
echo Cogix Eye Tracking Browser Extension Installer
echo ===============================================
echo.

echo Step 1: Opening Chrome Extensions Page
echo ----------------------------------------
start chrome chrome://extensions/
timeout /t 2 >nul

echo.
echo Step 2: Installation Instructions
echo ----------------------------------------
echo.
echo Please follow these steps in the Chrome window that just opened:
echo.
echo 1. Enable "Developer mode" (toggle in top right corner)
echo 2. Click "Load unpacked" button
echo 3. Navigate to this folder:
echo    %cd%
echo 4. Click "Select Folder"
echo.
echo The extension should now appear with a target icon (🎯)
echo.
echo ===============================================
echo IMPORTANT: Before using the extension:
echo ===============================================
echo.
echo 1. Log in to Cogix:
echo    - Local: http://localhost:3000
echo    - Production: https://app.cogix.com
echo.
echo 2. Start backend services (if testing locally):
echo    - cogix-backend on port 8000
echo    - cogix-data-api on port 8001
echo.
echo 3. Click the extension icon to:
echo    - Select a project
echo    - Connect eye tracker
echo    - Start recording
echo.
pause