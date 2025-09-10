# Browser Extension Installation, Debugging & Deployment Guide

## 📦 Local Development Installation

### Method 1: Load Unpacked Extension (Development)

1. **Open Chrome Extensions Page**
   ```
   chrome://extensions/
   ```
   Or: Menu → More Tools → Extensions

2. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top right corner

3. **Load the Extension**
   - Click "Load unpacked" button
   - Navigate to: `G:\TALEMONK\cogix\cogix-eye-tracking-core\browser-extension-eyetrack\`
   - Select the folder and click "Select Folder"

4. **Verify Installation**
   - Extension should appear in the list with name "Eye Tracking Screen Recorder"
   - Icon (🎯) should appear in Chrome toolbar
   - Note the Extension ID for debugging

### Method 2: Pack Extension for Testing

1. **Create .crx file**
   ```
   chrome://extensions/
   ```
   - Click "Pack extension"
   - Extension root directory: `cogix-eye-tracking-core\browser-extension-eyetrack\`
   - Leave private key file blank (first time)
   - Click "Pack Extension"

2. **Install .crx file**
   - Drag the generated .crx file into Chrome extensions page
   - Or double-click the .crx file

## 🔍 Debugging the Extension

### 1. Background Script (Service Worker) Debugging

1. **Open Background Script Console**
   - Go to `chrome://extensions/`
   - Find your extension
   - Click "Service Worker" link (or "background page")
   - DevTools will open for the background script

2. **View Background Logs**
   ```javascript
   // In background script console
   console.log(state);  // View current state
   chrome.storage.local.get(null, (data) => console.log(data));  // View storage
   ```

### 2. Popup Debugging

1. **Right-click Extension Icon → Inspect Popup**
   - Opens DevTools for popup.html
   - View console logs, network requests, etc.

2. **Keep Popup Open for Debugging**
   - In popup DevTools console:
   ```javascript
   // Prevent popup from closing
   chrome.windows.create({
     url: chrome.runtime.getURL('popup.html'),
     type: 'popup',
     width: 400,
     height: 600
   });
   ```

### 3. Content Script Debugging

1. **Open Page DevTools**
   - Right-click any webpage → Inspect
   - Go to Console tab
   - Content script logs appear here

2. **Check if Content Script is Injected**
   ```javascript
   // In page console
   console.log(typeof injectEyeTrackingCore);  // Should be 'function'
   ```

### 4. Extension DevTools

1. **Chrome Extension Debugger**
   - Install Chrome extension: "Extensions Reloader"
   - Allows hot-reloading during development

2. **Debugging Commands in Console**
   ```javascript
   // Get extension ID
   chrome.runtime.id

   // Send test messages
   chrome.runtime.sendMessage({ type: 'GET_STATE' }, console.log);

   // Check permissions
   chrome.permissions.getAll(console.log);

   // View all tabs
   chrome.tabs.query({}, console.log);

   // Check storage
   chrome.storage.local.get(null, console.log);
   chrome.storage.sync.get(null, console.log);
   ```

## 🌐 Deployment Options

### Option 1: Chrome Web Store (Recommended for Production)

1. **Prepare for Submission**
   - Create promotional images:
     - 1 tile (440x280px)
     - 1-5 screenshots (1280x800px or 640x400px)
     - Icon sizes: 16x16, 48x48, 128x128
   
2. **Create Developer Account**
   - Go to https://chrome.google.com/webstore/devconsole
   - Pay one-time $5 registration fee
   - Verify account

3. **Package Extension**
   ```bash
   # Create zip file (not .crx)
   cd cogix-eye-tracking-core/browser-extension-eyetrack
   zip -r cogix-eye-tracking-extension.zip . -x "*.git*" -x "*.DS_Store" -x "test-*"
   ```

4. **Submit to Chrome Web Store**
   - Upload .zip file
   - Fill in listing details:
     - Description
     - Category: "Productivity" or "Developer Tools"
     - Language
     - Screenshots
   - Submit for review (takes 1-3 days)

5. **After Approval**
   - Get permanent extension ID
   - Share URL: `https://chrome.google.com/webstore/detail/[extension-id]`

### Option 2: GitHub Releases (For Beta Testing)

1. **Create GitHub Release**
   ```bash
   # Build extension
   cd cogix-eye-tracking-core/browser-extension-eyetrack
   npm run build  # If you have a build script
   
   # Create distributable
   zip -r cogix-eye-tracking-v1.0.0.zip . -x "*.git*" -x "node_modules/*" -x "src/*"
   ```

2. **Upload to GitHub**
   - Go to your repo → Releases → New Release
   - Upload the .zip file
   - Add installation instructions

3. **Users Install via Developer Mode**
   - Download .zip from GitHub
   - Extract to folder
   - Load unpacked in Chrome

### Option 3: Self-Hosted Distribution

1. **Host .crx File**
   ```xml
   <!-- update-manifest.xml -->
   <?xml version='1.0' encoding='UTF-8'?>
   <gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
     <app appid='YOUR_EXTENSION_ID'>
       <updatecheck codebase='https://yourserver.com/extension.crx' version='1.0.0' />
     </app>
   </gupdate>
   ```

2. **Add to manifest.json**
   ```json
   {
     "update_url": "https://yourserver.com/update-manifest.xml"
   }
   ```

3. **Users Install**
   - Download .crx file
   - Enable "Developer mode" in Chrome
   - Drag .crx to extensions page

### Option 4: Microsoft Edge Add-ons Store

1. **Partner Center Account**
   - Register at https://partner.microsoft.com/
   - No fee required

2. **Submit Extension**
   - Same .zip file as Chrome
   - Usually works without modifications
   - Review takes 1-7 days

## 🛠️ Build & Package Scripts

Create `package.json` for automation:

```json
{
  "name": "cogix-eye-tracking-extension",
  "version": "1.0.0",
  "scripts": {
    "build": "node build-extension.js",
    "pack": "npm run build && npm run zip",
    "zip": "zip -r dist/extension.zip . -x 'node_modules/*' '.git/*' 'dist/*' 'test-*' '*.md'",
    "clean": "rm -rf dist",
    "version": "npm version patch && npm run build"
  }
}
```

Create `build-extension.js`:

```javascript
const fs = require('fs');
const path = require('path');

// Update manifest version
const manifest = require('./manifest.json');
manifest.version = process.env.npm_package_version || '1.0.0';

// Add production URLs
if (process.env.NODE_ENV === 'production') {
  manifest.host_permissions = manifest.host_permissions.filter(
    url => !url.includes('localhost')
  );
}

// Write updated manifest
fs.writeFileSync(
  path.join(__dirname, 'manifest.json'),
  JSON.stringify(manifest, null, 2)
);

console.log(`Built extension v${manifest.version}`);
```

## 🔧 Common Debugging Issues

### 1. Extension Not Loading
```bash
# Check manifest.json is valid JSON
python -m json.tool manifest.json

# Check for syntax errors
node -c background.js
node -c popup-new.js
```

### 2. Permissions Issues
```javascript
// Check current permissions
chrome.permissions.getAll((perms) => {
  console.log('Permissions:', perms);
});

// Request additional permissions
chrome.permissions.request({
  permissions: ['cookies'],
  origins: ['https://api.cogix.app/*']
}, (granted) => {
  console.log('Granted:', granted);
});
```

### 3. Content Script Not Injecting
```javascript
// Manually inject content script
chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
  chrome.scripting.executeScript({
    target: {tabId: tabs[0].id},
    files: ['content.js']
  });
});
```

### 4. CORS Issues
```javascript
// In background script, use fetch with mode
fetch(url, {
  mode: 'cors',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
});
```

## 📊 Testing Checklist Before Deployment

- [ ] Test in Chrome, Edge, Brave browsers
- [ ] Test with different screen resolutions
- [ ] Test login flow with production URLs
- [ ] Test video recording and upload
- [ ] Test data submission to cogix-data-io
- [ ] Check all permissions work correctly
- [ ] Verify SDK loads from CDN
- [ ] Test offline fallback behavior
- [ ] Check memory usage (no leaks)
- [ ] Verify proper error handling

## 🚀 Quick Deploy Commands

```bash
# Development
chrome://extensions/ → Load unpacked → Select folder

# Testing
npm run pack
# Share the .zip file with testers

# Production (Chrome Web Store)
npm run build
zip -r extension.zip . -x "*.git*" "node_modules/*" "test-*"
# Upload to Chrome Web Store Developer Dashboard

# GitHub Release
git tag v1.0.0
git push origin v1.0.0
# Create release on GitHub with .zip file
```

## 📱 Remote Debugging (Advanced)

1. **Enable USB Debugging on Android**
   - Settings → Developer Options → USB Debugging

2. **Connect Device**
   ```
   chrome://inspect/#devices
   ```

3. **Debug Extension on Mobile Chrome**
   - Install extension on mobile Chrome
   - Click "Inspect" next to the page

## 🔗 Useful Links

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Extension Manifest V3 Migration](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Edge Add-ons Documentation](https://docs.microsoft.com/en-us/microsoft-edge/extensions-chromium/)
- [Extension Security Best Practices](https://developer.chrome.com/docs/extensions/mv3/security/)