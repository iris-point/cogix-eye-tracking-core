# Cogix Eye Tracking Browser Extension

A Chrome browser extension that records eye tracking data and screen recordings, with automatic submission to Cogix Data-IO.

## 🎯 Key Features

- **Eye Tracking Integration**: Supports hardware eye trackers (via WebSocket) and webcam-based tracking (WebGazer)
- **Screen Recording**: Records your screen along with eye tracking data
- **Automatic Calibration**: Enforces fullscreen calibration before recording
- **Cogix Integration**: Seamlessly integrates with your Cogix account
- **Data Submission**: Automatically uploads to cogix-data-io for analysis
- **SDK from CDN**: Uses the latest eye tracking SDK from CDN with local fallback

## 📋 Prerequisites

1. **Chrome Browser** (or Chromium-based browser)
2. **Cogix Account** with at least one project
3. **Eye Tracker** (optional - can use webcam with WebGazer)
4. **Backend Services** (for local development):
   - cogix-backend running on port 8000
   - cogix-data-api running on port 8001
   - cogix-frontend running on port 3000

## 🚀 Installation

### Development Setup

1. **Install dependencies** (if any):
   ```bash
   npm install
   ```

2. **Build the extension**:
   ```bash
   npm run build
   ```

3. **Load in Chrome**:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/` folder

### Quick Install (Pre-built)

1. **Open Chrome Extensions Page**
   ```
   chrome://extensions/
   ```

2. **Enable Developer Mode**
   - Toggle the switch in the top right corner

3. **Load the Extension**
   - Click "Load unpacked"
   - Navigate to the `dist/` folder (after running `npm run build`)
   - Click "Select Folder"

4. **Verify Installation**
   - Look for "Eye Tracking Screen Recorder" in your extensions
   - The extension icon (🎯) should appear in your toolbar
   - Note the Extension ID for testing

### Build Scripts

```bash
# Build for development
npm run build

# Build for production
npm run build:prod

# Watch mode (auto-rebuild on changes)
npm run watch

# Clean build directory
npm run clean

# Create distribution package
npm run package
```

## 🔧 Configuration

### 1. Login to Cogix

Before using the extension, login to your Cogix account:

- **Local Development**: http://localhost:3000
- **Production**: https://app.cogix.com

The extension uses your session cookies for authentication.

### 2. Select Project

1. Click the extension icon (🎯)
2. Select a project from the dropdown
3. The extension will remember your selection

### 3. Connect Eye Tracker

**Option A: Hardware Eye Tracker**
- Ensure eye tracker WebSocket server is running (port 8765 or 9000)
- Click "Connect Eye Tracker" in the extension

**Option B: Webcam (WebGazer)**
- Click "Use WebGazer" for webcam-based tracking
- Grant camera permissions when prompted

## 📹 Recording Workflow

### Step 1: Calibration (Required)

⚠️ **Important**: Calibration is mandatory before recording and opens in fullscreen mode.

1. Click "Calibrate" in the extension popup
2. A fullscreen calibration window will open
3. Look at each of the 5 points that appear
4. Press spacebar to move to the next point
5. Calibration completes automatically

**Note**: Calibration data is valid for 24 hours. After that, you'll need to recalibrate.

### Step 2: Start Recording

1. Navigate to the webpage you want to record
2. Click the extension icon
3. Click "Start Recording"
4. The extension will:
   - Check calibration status (opens calibration if needed)
   - Start screen recording
   - Begin collecting eye tracking data
   - Show a gaze overlay (optional)

### Step 3: Stop Recording

1. Click "Stop Recording" in the extension
2. The recording will be automatically:
   - Saved locally with metadata
   - Video uploaded to cogix-backend (gets CDN URL)
   - Session JSON submitted to cogix-data-io

### Step 4: View in Cogix

1. Go to your Cogix project
2. Navigate to Eye Tracking → Sessions
3. Your recording will appear in the list
4. Click to open in CogixStudio for analysis

## 🧪 Testing

### Complete Flow Test

Open the comprehensive test page to verify the entire flow:

```
file:///G:/TALEMONK/cogix/cogix-eye-tracking-core/browser-extension-eyetrack/test-complete-flow.html
```

This test page guides you through:
1. Extension installation check
2. Authentication verification
3. Project selection
4. Eye tracker connection
5. Calibration
6. Recording
7. Data submission
8. Frontend verification

### Quick Test

For a simpler test, use:
```
file:///G:/TALEMONK/cogix/cogix-eye-tracking-core/browser-extension-eyetrack/test-extension.html
```

## 🔍 Debugging

### View Background Script Console

1. Go to `chrome://extensions/`
2. Find "Eye Tracking Screen Recorder"
3. Click "Service Worker" link
4. DevTools opens with background script console

### View Popup Console

1. Right-click the extension icon
2. Select "Inspect popup"
3. DevTools opens for popup debugging

### Common Issues

**Extension Not Loading**
- Check manifest.json is valid JSON
- Ensure all required files exist
- Check Chrome DevTools console for errors

**Authentication Failed**
- Login to Cogix first (http://localhost:3000)
- Check cookies are not blocked
- Verify backend is running

**Calibration Not Working**
- Grant fullscreen permissions
- Ensure SDK loaded from CDN
- Check console for errors

**Recording Not Starting**
- Complete calibration first (required)
- Select a project before recording
- Check eye tracker connection

**Data Not Submitting**
- Verify project is selected
- Check network connectivity
- Ensure cogix-data-io is accessible
- Check API key permissions

## 📊 Data Flow

1. **Browser Extension** captures:
   - Screen recording (WebM format)
   - Eye tracking data (60Hz+)
   - Page metadata

2. **Video Upload**:
   - Extension → cogix-backend
   - Returns CDN URL

3. **Session Submission**:
   - Extension fetches API key (on-demand)
   - Submits to cogix-data-io with video URL
   - Format: JSON with embedded video URL

4. **Data Storage**:
   - cogix-data-io → Cloudflare R2
   - Path: `/userId/projectId/participantId/sessionId`

5. **Visualization**:
   - Frontend reads from cogix-data-io
   - Displays in CogixStudio

## 🏗️ Architecture

### SDK Loading
- **Primary**: CDN (`https://unpkg.com/@iris-point/eye-tracking-core@latest`)
- **Fallback**: Local bundle (`eye-tracker-core.js`)

### Project Structure

```
browser-extension-eyetrack/
├── src/
│   ├── background/
│   │   ├── background.js      # Service worker
│   │   ├── offscreen.js       # Screen recording handler
│   │   └── offscreen.html     # Offscreen document
│   ├── content/
│   │   └── content.js         # Content script for page injection
│   ├── popup/
│   │   ├── popup.html         # Extension popup UI
│   │   ├── popup.js           # Popup controller
│   │   └── popup.css          # Popup styles
│   ├── pages/
│   │   ├── calibration.html   # Fullscreen calibration page
│   │   └── calibration.js     # Calibration logic
│   ├── lib/
│   │   ├── dataio-client.js   # Cogix API client
│   │   └── eye-tracker-core.js # Local SDK fallback
│   └── assets/
│       └── icons/             # Extension icons
├── tests/                     # Test pages
├── scripts/
│   └── build.js              # Build script
├── manifest.json             # Extension manifest
├── package.json              # NPM configuration
└── README.md                 # Documentation
```

### Permissions

- `storage`: Save settings and calibration data
- `tabs`: Access active tab information
- `desktopCapture`: Record screen
- `cookies`: Access Cogix session
- `identity`: User authentication

## 🚀 Deployment

### Chrome Web Store

1. Build and package:
   ```bash
   npm run package
   ```
   This creates `cogix-eye-tracking-extension.zip`

2. Upload to Chrome Web Store Developer Dashboard

3. Fill in listing details and submit for review

### Self-Hosted

1. Host the `.crx` file on your server
2. Users download and drag to Chrome extensions page
3. Enable "Developer mode" to install

### GitHub Release

1. Create a release on GitHub
2. Upload the `.zip` file
3. Users download and load unpacked

## 📝 API Keys

API keys are **never stored** in the extension. They are:
- Fetched on-demand when needed
- Used immediately for submission
- Discarded after use

This ensures security and always uses the latest API key.

## 🔒 Security

- No hardcoded credentials
- Uses secure session cookies
- API keys fetched on-demand
- HTTPS for all API calls
- WebSocket for eye tracker communication

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This extension is part of the Cogix platform and follows the same license terms.

## 🆘 Support

For issues or questions:
- Check the [Testing Guide](TESTING_GUIDE.md)
- Review [Installation Guide](INSTALLATION_AND_DEPLOYMENT.md)
- Open an issue on GitHub
- Contact the Cogix support team

## 🎯 Next Steps

1. Install the extension
2. Complete calibration
3. Make your first recording
4. View results in CogixStudio
5. Analyze eye tracking patterns

Happy eye tracking! 👁️