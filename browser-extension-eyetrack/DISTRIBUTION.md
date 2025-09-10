# 📦 Cogix Eye Tracking Extension - Distribution Guide

This guide explains how to distribute and deploy the Cogix Eye Tracking Chrome Extension without using the Chrome Web Store.

## 🚀 Distribution Methods

### 1. GitHub Releases (Automated)

The extension is automatically built and released when you push a version tag:

```bash
# Bump version and create tag
npm version patch  # or minor/major
git push origin main --tags

# This triggers GitHub Actions to:
# - Build the extension
# - Create ZIP and CRX files
# - Publish a GitHub Release
# - Deploy to GitHub Pages CDN
```

### 2. CDN Distribution

Once published, the extension is available via multiple CDN endpoints:

#### GitHub Releases CDN
```
# Latest release ZIP
https://github.com/cogix/cogix-eye-tracking-core/releases/latest/download/cogix-eye-tracking-extension.zip

# Latest release CRX
https://github.com/cogix/cogix-eye-tracking-core/releases/latest/download/cogix-eye-tracking-extension.crx

# Specific version
https://github.com/cogix/cogix-eye-tracking-core/releases/download/v1.0.0/cogix-eye-tracking-extension.zip
```

#### GitHub Pages CDN
```
# Installation page
https://cogix.github.io/cogix-eye-tracking-core/

# Direct download
https://cogix.github.io/cogix-eye-tracking-core/cogix-eye-tracking-extension.zip
```

#### jsDelivr CDN (Alternative)
```
# Latest from GitHub
https://cdn.jsdelivr.net/gh/cogix/cogix-eye-tracking-core@latest/dist/

# Specific version
https://cdn.jsdelivr.net/gh/cogix/cogix-eye-tracking-core@v1.0.0/dist/
```

### 3. Manual Distribution

Build and package locally:

```bash
# Full release build
npm run release

# This creates:
# - cogix-eye-tracking-extension.zip (ready for distribution)
# - dist/ folder (for development)
```

## 🔧 Installation Methods for Users

### Method 1: One-Click Installers

#### Windows (PowerShell)
```powershell
# Download and run installer
iwr -Uri https://cogix.github.io/cogix-eye-tracking-core/install.ps1 -OutFile install.ps1
.\install.ps1
```

#### macOS/Linux (Bash)
```bash
# Download and run installer
curl -L https://cogix.github.io/cogix-eye-tracking-core/install.sh | bash
```

### Method 2: Manual Installation

1. **Download the extension:**
   - Go to: https://cogix.github.io/cogix-eye-tracking-core/
   - Click "Download ZIP"

2. **Extract the ZIP file**

3. **Install in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the extracted folder

### Method 3: Direct Chrome Launch

Users can launch Chrome with the extension pre-loaded:

```bash
# Windows
chrome.exe --load-extension="C:\path\to\extension"

# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --load-extension=/path/to/extension

# Linux
google-chrome --load-extension=/path/to/extension
```

## 🔐 Enterprise Deployment

For organizations, you can use Chrome Enterprise policies:

### Group Policy (Windows)
Create a registry entry:
```
HKEY_LOCAL_MACHINE\Software\Policies\Google\Chrome\ExtensionInstallForcelist
```

### Configuration Profile (macOS)
```xml
<key>ExtensionInstallForcelist</key>
<array>
  <string>extension-id;file:///path/to/extension</string>
</array>
```

### JSON Policy (All platforms)
```json
{
  "ExtensionInstallSources": [
    "https://cogix.github.io/*"
  ],
  "ExtensionInstallForcelist": [
    "extension-id;https://cogix.github.io/cogix-eye-tracking-core/update.xml"
  ]
}
```

## 📋 Update Mechanism

### Automatic Updates via GitHub

Create an update manifest for automatic updates:

**update.xml** (host on GitHub Pages):
```xml
<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='YOUR_EXTENSION_ID'>
    <updatecheck codebase='https://cogix.github.io/cogix-eye-tracking-core/cogix-eye-tracking-extension.crx' 
                 version='1.0.1' />
  </app>
</gupdate>
```

### Manual Update Check

Users can check for updates:
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Update" button

## 🌐 Hosting Options

### Option 1: GitHub Pages (Recommended)
- Free hosting
- Automatic deployment via GitHub Actions
- HTTPS enabled by default
- Custom domain support (extension.cogix.app)

### Option 2: Cloudflare Pages
```bash
# Deploy to Cloudflare
npm run build:prod
wrangler pages publish dist --project-name=cogix-extension
```

### Option 3: Netlify
```bash
# Deploy to Netlify
npm run build:prod
netlify deploy --prod --dir=dist
```

### Option 4: AWS S3 + CloudFront
```bash
# Upload to S3
aws s3 sync dist/ s3://cogix-extension/ --acl public-read
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

## 🔑 Signing for Trust

### Generate Extension ID
The extension ID is derived from the public key:

```bash
# Generate key pair
openssl genrsa -out key.pem 2048
openssl rsa -in key.pem -pubout -out key.pub

# Get extension ID
node -e "
const crypto = require('crypto');
const fs = require('fs');
const pubKey = fs.readFileSync('key.pub', 'utf8');
const hash = crypto.createHash('sha256').update(pubKey).digest();
const id = hash.toString('hex').substring(0, 32);
console.log('Extension ID:', id);
"
```

### Sign CRX File
```bash
# Install crx3 tool
npm install -g crx3

# Create signed CRX
crx3 dist -o cogix-extension.crx -k key.pem
```

## 📊 Analytics & Tracking

Track installations via:

### GitHub Analytics
- Monitor release download counts
- Track GitHub Pages traffic

### Custom Analytics
Add to installation page:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
  
  // Track downloads
  document.querySelectorAll('a[download]').forEach(link => {
    link.addEventListener('click', () => {
      gtag('event', 'download', {
        'event_category': 'extension',
        'event_label': link.href
      });
    });
  });
</script>
```

## 🆘 Support & Documentation

### User Support Page
Create a simple support page on GitHub Pages:

```html
<!-- support.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Cogix Extension Support</title>
</head>
<body>
  <h1>Support</h1>
  <h2>Common Issues</h2>
  <ul>
    <li>Extension not loading: Ensure Developer Mode is enabled</li>
    <li>Eye tracker not connecting: Check WebSocket connection</li>
    <li>Calibration issues: Ensure fullscreen mode is allowed</li>
  </ul>
  <h2>Contact</h2>
  <p>Email: support@cogix.app</p>
  <p>GitHub Issues: https://github.com/cogix/cogix-eye-tracking-core/issues</p>
</body>
</html>
```

## 🔄 Version Management

### Semantic Versioning
```bash
# Patch release (1.0.0 -> 1.0.1)
npm version patch

# Minor release (1.0.0 -> 1.1.0)
npm version minor

# Major release (1.0.0 -> 2.0.0)
npm version major

# Push with tags
git push origin main --tags
```

### Release Notes Template
```markdown
## Version X.Y.Z

### 🎯 New Features
- Feature 1
- Feature 2

### 🐛 Bug Fixes
- Fix 1
- Fix 2

### 📈 Improvements
- Improvement 1
- Improvement 2

### 💔 Breaking Changes
- Change 1

### 📦 Installation
Download from: https://cogix.github.io/cogix-eye-tracking-core/
```

## 🚨 Security Considerations

1. **Code Signing**: Always sign releases with consistent keys
2. **HTTPS Only**: Serve all files over HTTPS
3. **Integrity Checks**: Provide SHA256 checksums
4. **CSP Headers**: Use Content Security Policy on hosting
5. **Regular Updates**: Keep dependencies updated

## 📝 License Distribution

Include license file in distributions:
```
cogix-eye-tracking-extension.zip
├── manifest.json
├── LICENSE
├── README.md
└── ... (other files)
```

## 🔮 Future Enhancements

1. **Auto-updater**: Built-in update checking
2. **Beta Channel**: Separate beta releases
3. **Portable Version**: Standalone Chrome + Extension bundle
4. **Docker Image**: Containerized Chrome with extension
5. **PWA Version**: Progressive Web App alternative