# Cogix Eye Tracking Extension Installer for Windows
# This script downloads and prepares the extension for manual installation

$ErrorActionPreference = "Stop"

$REPO = "cogix/cogix-eye-tracking-core"
$EXTENSION_NAME = "cogix-eye-tracking-extension"
$INSTALL_DIR = "$env:USERPROFILE\.cogix-extension"

Write-Host "🎯 Cogix Eye Tracking Extension Installer" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Function to get latest release URL
function Get-LatestRelease {
    try {
        $releases = Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/releases/latest"
        $downloadUrl = $releases.assets | Where-Object { $_.name -like "*.zip" } | Select-Object -First 1 -ExpandProperty browser_download_url
        return $downloadUrl
    } catch {
        # Fallback to GitHub Pages CDN
        return "https://cogix.github.io/cogix-eye-tracking-core/$EXTENSION_NAME.zip"
    }
}

# Create installation directory
Write-Host "📁 Creating installation directory..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $INSTALL_DIR | Out-Null

# Download latest release
Write-Host "📥 Downloading latest extension..." -ForegroundColor Yellow
$DOWNLOAD_URL = Get-LatestRelease
$ZIP_PATH = "$INSTALL_DIR\$EXTENSION_NAME.zip"
Invoke-WebRequest -Uri $DOWNLOAD_URL -OutFile $ZIP_PATH

# Extract extension
Write-Host "📦 Extracting extension..." -ForegroundColor Yellow
$EXTRACT_PATH = "$INSTALL_DIR\$EXTENSION_NAME"
if (Test-Path $EXTRACT_PATH) {
    Remove-Item -Recurse -Force $EXTRACT_PATH
}
Expand-Archive -Path $ZIP_PATH -DestinationPath $EXTRACT_PATH -Force

# Create desktop shortcut
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Install Cogix Extension.lnk")
$Shortcut.TargetPath = "chrome.exe"
$Shortcut.Arguments = "--load-extension=`"$EXTRACT_PATH`""
$Shortcut.IconLocation = "chrome.exe"
$Shortcut.Description = "Launch Chrome with Cogix Eye Tracking Extension"
$Shortcut.Save()

# Create batch file for easy launch
$BATCH_PATH = "$env:USERPROFILE\Desktop\Chrome-with-Cogix.bat"
@"
@echo off
echo Starting Chrome with Cogix Eye Tracking Extension...
start chrome.exe --load-extension="$EXTRACT_PATH"
"@ | Out-File -FilePath $BATCH_PATH -Encoding ASCII

Write-Host ""
Write-Host "✅ Extension downloaded and extracted successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Extension location: $EXTRACT_PATH" -ForegroundColor Cyan
Write-Host ""
Write-Host "To install the extension:" -ForegroundColor Yellow
Write-Host "1. Open Chrome and go to: chrome://extensions/"
Write-Host "2. Enable 'Developer mode'"
Write-Host "3. Click 'Load unpacked'"
Write-Host "4. Select the folder: $EXTRACT_PATH"
Write-Host ""
Write-Host "Or use the desktop shortcuts:" -ForegroundColor Yellow
Write-Host "- 'Install Cogix Extension.lnk' - Opens Chrome with extension pre-loaded"
Write-Host "- 'Chrome-with-Cogix.bat' - Batch file to launch Chrome with extension"
Write-Host ""
Write-Host "🎯 Happy eye tracking!" -ForegroundColor Cyan

# Ask if user wants to open Chrome now
$response = Read-Host "Would you like to open Chrome with the extension now? (Y/N)"
if ($response -eq 'Y' -or $response -eq 'y') {
    Start-Process "chrome.exe" -ArgumentList "--load-extension=`"$EXTRACT_PATH`""
}