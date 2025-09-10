#!/bin/bash

# Cogix Eye Tracking Extension Installer for Linux/Mac
# This script downloads and prepares the extension for manual installation

set -e

REPO="cogix/cogix-eye-tracking-core"
EXTENSION_NAME="cogix-eye-tracking-extension"
INSTALL_DIR="$HOME/.cogix-extension"

echo "🎯 Cogix Eye Tracking Extension Installer"
echo "========================================="
echo ""

# Function to get latest release URL
get_latest_release() {
    curl -s "https://api.github.com/repos/$REPO/releases/latest" | grep "browser_download_url.*zip" | cut -d '"' -f 4
}

# Create installation directory
echo "📁 Creating installation directory..."
mkdir -p "$INSTALL_DIR"

# Download latest release
echo "📥 Downloading latest extension..."
DOWNLOAD_URL=$(get_latest_release)
if [ -z "$DOWNLOAD_URL" ]; then
    # Fallback to GitHub Pages CDN
    DOWNLOAD_URL="https://cogix.github.io/cogix-eye-tracking-core/$EXTENSION_NAME.zip"
fi

curl -L "$DOWNLOAD_URL" -o "$INSTALL_DIR/$EXTENSION_NAME.zip"

# Extract extension
echo "📦 Extracting extension..."
cd "$INSTALL_DIR"
unzip -o "$EXTENSION_NAME.zip" -d "$EXTENSION_NAME"

# Create desktop shortcut (Linux)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    cat > "$HOME/Desktop/Install-Cogix-Extension.desktop" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Install Cogix Extension
Comment=Open Chrome to install Cogix Eye Tracking Extension
Exec=google-chrome --load-extension=$INSTALL_DIR/$EXTENSION_NAME
Icon=google-chrome
Terminal=false
EOF
    chmod +x "$HOME/Desktop/Install-Cogix-Extension.desktop"
fi

# Create Chrome launcher with extension pre-loaded (Mac)
if [[ "$OSTYPE" == "darwin"* ]]; then
    cat > "$HOME/Desktop/Chrome-with-Cogix.command" << EOF
#!/bin/bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --load-extension=$INSTALL_DIR/$EXTENSION_NAME
EOF
    chmod +x "$HOME/Desktop/Chrome-with-Cogix.command"
fi

echo ""
echo "✅ Extension downloaded and extracted successfully!"
echo ""
echo "📍 Extension location: $INSTALL_DIR/$EXTENSION_NAME"
echo ""
echo "To install the extension:"
echo "1. Open Chrome and go to: chrome://extensions/"
echo "2. Enable 'Developer mode'"
echo "3. Click 'Load unpacked'"
echo "4. Select the folder: $INSTALL_DIR/$EXTENSION_NAME"
echo ""
echo "Or run Chrome with the extension pre-loaded:"
echo "  google-chrome --load-extension=$INSTALL_DIR/$EXTENSION_NAME"
echo ""
echo "🎯 Happy eye tracking!"