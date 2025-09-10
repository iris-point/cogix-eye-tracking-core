# Browser Extension Testing Guide

## Overview
This guide walks through testing the complete eye tracking data flow from the browser extension to cogix-data-io.

## Prerequisites

1. **Start Backend Services**
   ```bash
   # Terminal 1: Start cogix-backend
   cd cogix-backend
   uvicorn app.main:app --reload --port 8000

   # Terminal 2: Start cogix-data-api
   cd cogix-data-api
   python start-server.py  # Runs on port 8001
   ```

2. **Start Frontend (for login)**
   ```bash
   cd cogix-frontend
   npm run dev  # Runs on http://localhost:3000
   ```

3. **Ensure cogix-data-io is accessible**
   - Production: https://data-io.cogix.app
   - Or deploy locally if testing local worker

## Step 1: Install Browser Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the folder: `cogix-eye-tracking-core/browser-extension-eyetrack`
5. The extension should appear with a 🎯 icon

## Step 2: Login to Cogix

1. Open http://localhost:3000 in Chrome
2. Log in with your Cogix account
3. The browser will store session cookies

## Step 3: Configure Extension

1. Click the extension icon (🎯) in Chrome toolbar
2. You should see "Logged in to Cogix" status
3. Select a project from the dropdown
4. Enable "Auto-submit to Cogix after recording"

## Step 4: Connect Eye Tracker

### Option A: Hardware Eye Tracker
- Ensure eye tracker WebSocket server is running (port 8765 or 9000)
- Click "Connect Eye Tracker" in extension popup

### Option B: Webcam (WebGazer)
- Extension will use webcam-based tracking as fallback
- Grant camera permissions when prompted

## Step 5: Calibrate

1. Click "Calibrate" in extension popup
2. Follow the on-screen calibration points
3. Look at each point for 2-3 seconds
4. Wait for calibration to complete

## Step 6: Record Session

1. Navigate to any webpage you want to track
2. Click "Start Recording" in extension popup
3. Select recording options:
   - ✅ Screen recording
   - ✅ Eye tracking
   - ✅ Auto-submit to Cogix
4. Interact with the page for at least 10 seconds
5. Click "Stop Recording"

## Step 7: Verify Data Submission

The extension will automatically:
1. Upload video to cogix-backend → get CDN URL
2. Fetch API key for selected project
3. Submit complete session JSON to cogix-data-io

Check console for confirmation:
- "Video uploaded successfully: [URL]"
- "Session submitted to cogix-data-io successfully"

## Step 8: View in Frontend

1. Go to http://localhost:3000
2. Navigate to your project
3. Click "Eye Tracking" → "Sessions"
4. Your recording should appear in the list
5. Click to view in CogixStudio

## Testing URLs

- **Test Page**: Open `test-extension.html` in Chrome
- **Frontend**: http://localhost:3000
- **Sessions**: http://localhost:3000/projects/[PROJECT_ID]/eye-tracking/sessions
- **Studio**: http://localhost:3000/projects/[PROJECT_ID]/eye-tracking/studio

## Troubleshooting

### Extension Not Working
- Check Chrome DevTools console for errors
- Ensure all permissions are granted in manifest.json
- Reload extension after changes

### Authentication Issues
- Clear cookies and login again
- Check that backend is running on port 8000
- Verify CORS settings allow extension origin

### Recording Not Submitting
- Check project is selected
- Verify "Auto-submit" is enabled
- Check browser console for API errors
- Ensure cogix-data-io is accessible

### Eye Tracking Not Working
- For hardware: Check WebSocket connection (ws://localhost:8765)
- For webcam: Grant camera permissions
- Ensure good lighting for webcam tracking
- Check SDK loaded from CDN: https://unpkg.com/@iris-point/eye-tracking-core@latest

## Console Commands

Open Chrome DevTools console while on any page:

```javascript
// Check if extension is loaded
chrome.runtime.id

// Send message to extension
chrome.runtime.sendMessage(extensionId, { type: 'GET_STATE' }, response => {
  console.log('Extension state:', response);
});

// Check authentication
chrome.runtime.sendMessage(extensionId, { type: 'CHECK_AUTH' }, response => {
  console.log('Auth status:', response);
});
```

## Data Flow Summary

1. **Browser Extension** records eye tracking + video
2. **Video Upload**: Extension → cogix-backend → CDN URL
3. **Session Submit**: Extension → cogix-data-io (with video URL)
4. **Visualization**: Frontend reads from cogix-data-io → CogixStudio

## Important Notes

- Eye tracking SDK loads from CDN: `@iris-point/eye-tracking-core@latest`
- API keys are fetched on-demand (not stored)
- All data submission happens through browser extension
- Frontend only reads data (never writes to cogix-data-io)