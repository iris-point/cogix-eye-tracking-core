# Eye Tracking Data Flow Analysis

## Problem
All gaze data coordinates are showing as x=0.5, y=0.5 instead of actual eye tracking positions.

## Data Flow Pipeline

### 1. WebSocket Data Reception (src/EyeTracker.ts)
```typescript
// Line 320: handleMessage receives base64 encoded data
private handleMessage(data: string): void {
  const decodedCmd = atob(data)
  const jsonIris = JSON.parse(decodedCmd)
  
  // Line 378: Check for tracking data
  if (jsonIris.trakcerOutput) {
    const trakcerOutputData = this.parseTrackerOutput(jsonIris.trakcerOutput)
    // Process eye data...
  }
}
```

### 2. Data Parsing (src/EyeTracker.ts)
```typescript
// Line 467: parseTrackerOutput
private parseTrackerOutput(data: any): TrackerOutput {
  return {
    tLeftScreenPoint: data.tLeftScreenPoint,  // May be undefined!
    tRightScreenPoint: data.tRightScreenPoint, // May be undefined!
    // ...
  }
}
```

### 3. Gaze Data Processing (src/EyeTracker.ts)
```typescript
// Lines 381-403: Process eye coordinates
let alleyeLeft = 0
let alleyeRight = 0
let eyeCount = 0

if (trakcerOutputData.tLeftScreenPoint) {
  alleyeLeft += trakcerOutputData.tLeftScreenPoint.f32X
  alleyeRight += trakcerOutputData.tLeftScreenPoint.f32Y
  eyeCount++
}

if (trakcerOutputData.tRightScreenPoint) {
  alleyeLeft += trakcerOutputData.tRightScreenPoint.f32X
  alleyeRight += trakcerOutputData.tRightScreenPoint.f32Y
  eyeCount++
}

if (eyeCount !== 0) {
  alleyeLeft = alleyeLeft / eyeCount
  alleyeRight = alleyeRight / eyeCount
  
  const gazeData: GazeData = {
    x: alleyeLeft,
    y: alleyeRight,
    // ...
  }
  this.emit('gazeData', gazeData)
}
```

### 4. Extension Data Collection (jspsych-extension/jsPsychExtensionCogixEyeTracking.js)
```javascript
// Line 59: Listen for gaze data
this.tracker.on('gazeData', (data) => {
  if (this.recording) {
    const sample = {
      x: data.x,  // This receives the value from EyeTracker
      y: data.y,
      t: performance.now(),
      confidence: data.confidence || 1
    }
    this.currentTrialData.push(sample)
  }
})
```

## IDENTIFIED ISSUES

### Issue 1: No Fallback for Missing Eye Data
When `tLeftScreenPoint` and `tRightScreenPoint` are undefined in the tracker output:
- `eyeCount` remains 0
- No gaze data is emitted
- The extension never receives any data

### Issue 2: Possible Default Values
The coordinates x=0.5, y=0.5 suggest:
1. **Tracker not actually tracking** - The device might be sending default/placeholder values
2. **Calibration issue** - The tracker might not be properly calibrated
3. **Coordinate system issue** - The values might need to be converted from pixel to normalized coordinates

### Issue 3: Missing Tracker Start
Looking at the data flow, we need to ensure:
1. Camera is initialized: `tracker.initCamera()`
2. Calibration is completed successfully
3. **Tracking is explicitly started: `tracker.startTracking()`**

## Solution Steps

### Step 1: Add Debug Logging
Add logging to see what raw data we're receiving from the WebSocket.

### Step 2: Check Tracking Status
Ensure tracking is actually started after calibration.

### Step 3: Handle Missing Data
Add proper fallback when eye data is not available.

### Step 4: Verify Coordinate System
Check if coordinates need conversion from pixel space to normalized space (0-1).

## Next Actions
1. Add debug logging to see raw WebSocket data
2. Ensure startTracking() is called after calibration
3. Check if the tracker is sending pixel coordinates that need normalization
4. Add proper error handling for missing eye data