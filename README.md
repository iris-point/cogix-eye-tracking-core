# @iris-point/eye-tracking-core

Minimal, lightweight eye tracking library for HH WebSocket-based hardware eye trackers. Pure JavaScript/TypeScript with no framework dependencies.

## Features

- 🎯 **Simple API** - Direct WebSocket connection to HH hardware
- 📦 **Minimal footprint** - ~8KB gzipped, no heavy dependencies
- 🎨 **Fullscreen calibration** - Always-on-top calibration UI
- 📊 **Data buffering** - Efficient circular buffer for real-time data
- 🌐 **CDN ready** - Works with script tags or npm
- 🎭 **Framework agnostic** - Works with any JavaScript framework

## Installation

### NPM
```bash
npm install @iris-point/eye-tracking-core
```

### CDN (Multiple Options)

#### unpkg (Recommended)
```html
<!-- Latest minified version -->
<script src="https://unpkg.com/@iris-point/eye-tracking-core/dist/cogix-eye-tracking-core.min.js"></script>

<!-- Specific version -->
<script src="https://unpkg.com/@iris-point/eye-tracking-core@1.0.0/dist/cogix-eye-tracking-core.min.js"></script>
```

#### jsDelivr (Fast Global CDN)
```html
<!-- Latest minified version -->
<script src="https://cdn.jsdelivr.net/npm/@iris-point/eye-tracking-core/dist/cogix-eye-tracking-core.min.js"></script>

<!-- Specific version -->
<script src="https://cdn.jsdelivr.net/npm/@iris-point/eye-tracking-core@1.0.0/dist/cogix-eye-tracking-core.min.js"></script>
```

#### Local Development
```html
<!-- Development version (not minified) -->
<script src="https://unpkg.com/@iris-point/eye-tracking-core/dist/cogix-eye-tracking-core.js"></script>
```

## Quick Start

### JavaScript/TypeScript
```javascript
import { createEyeTracker, CalibrationUI } from '@iris-point/eye-tracking-core'

// Create tracker
const tracker = createEyeTracker({
  wsUrl: ['ws://127.0.0.1:9000'],
  debug: true
})

// Create calibration UI
const calibrationUI = new CalibrationUI({
  autoFullscreen: true
})

// Connect and initialize (following HH protocol sequence)
await tracker.connect()
tracker.initDevice()   // Step 1: Initialize device
tracker.initLight()    // Step 2: Turn on IR light
tracker.initCamera()   // Step 3: Start camera

// Start calibration
calibrationUI.show()
tracker.startCalibration()

// Listen for tracking data
tracker.on('gazeData', (data) => {
  console.log(`Gaze: ${data.x}, ${data.y}`)
})
```

### Browser/HTML
```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/@iris-point/eye-tracking-core/dist/cogix-eye-tracking-core.min.js"></script>
</head>
<body>
  <script>
    const { createEyeTracker, CalibrationUI } = IrisPointEyeTracking
    
    const tracker = createEyeTracker()
    const calibrationUI = new CalibrationUI()
    
    // Initialize sequence
    async function init() {
      await tracker.connect()
      tracker.initDevice()
      tracker.initLight()
      tracker.initCamera()
    }
    
    init()
  </script>
</body>
</html>
```

## API Reference

### EyeTracker

Main class for eye tracker connection and control.

#### Methods

**Connection & Initialization:**
- `connect(): Promise<void>` - Connect to WebSocket server
- `disconnect(): void` - Disconnect from server
- `initDevice(): void` - Initialize eye tracking device
- `initLight(): void` - Turn on IR illumination
- `initCamera(): void` - Start camera feed
- `endCamera(): void` - Stop camera feed

**Calibration & Tracking:**
- `startCalibration(): void` - Start 5-point calibration
- `startTracking(): void` - Begin eye tracking
- `stopTracking(): void` - Stop eye tracking

**Data Access:**
- `getStatus(): DeviceStatus` - Get current device status
- `getData(): GazeData[]` - Get all buffered data
- `getRecentData(count: number): GazeData[]` - Get recent samples
- `clearData(): void` - Clear data buffer

#### Events

- `connected` - WebSocket connected
- `disconnected` - WebSocket disconnected
- `error` - Error occurred
- `statusChanged` - Device status changed
- `gazeData` - New gaze data received
- `calibrationStarted` - Calibration started
- `calibrationProgress` - Calibration point completed
- `calibrationComplete` - Calibration finished
- `cameraFrame` - Camera frame received

### CalibrationUI

Fullscreen calibration interface that overlays everything.

#### Constructor
```javascript
const calibrationUI = new CalibrationUI({
  pointRadius: 20,
  pointColor: 'rgba(0, 255, 0, 0.8)',
  backgroundColor: 'rgba(0, 0, 0, 0.95)',
  autoFullscreen: true
})
```

#### Methods
- `show(): void` - Show calibration UI
- `hide(): void` - Hide calibration UI  
- `showPoint(index: number): void` - Show specific calibration point

### Data Types

#### GazeData
```typescript
interface GazeData {
  timestamp: number   // Unix timestamp
  x: number          // Normalized X [0,1]
  y: number          // Normalized Y [0,1]
  confidence?: number // Confidence score [0,1]
}
```

#### DeviceStatus
```typescript
enum DeviceStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  CALIBRATING = 'calibrating',
  TRACKING = 'tracking',
  ERROR = 'error'
}
```

## Protocol Sequence

The HH eye tracker requires a specific initialization sequence:

1. **Connect** to WebSocket (ws://127.0.0.1:9000)
2. **Initialize device** (`init_et10c` command)
3. **Turn on IR light** (`setBright` command)
4. **Start camera** (`startCamera` command)
5. **Calibrate** with 5 points
6. **Start tracking** (`startTracker` command)

## Examples

### Complete Integration
```javascript
const tracker = createEyeTracker()
const calibrationUI = new CalibrationUI()

// Initialize in sequence
async function initialize() {
  await tracker.connect()
  
  // Wait between commands
  setTimeout(() => tracker.initDevice(), 100)
  setTimeout(() => tracker.initLight(), 200)
  setTimeout(() => tracker.initCamera(), 300)
  
  // Ready for calibration after camera starts
  setTimeout(() => {
    calibrationUI.show()
    tracker.startCalibration()
  }, 1000)
}

// Handle calibration complete
tracker.on('calibrationComplete', () => {
  calibrationUI.hide()
  console.log('Tracking started!')
})

// Process gaze data
tracker.on('gazeData', (data) => {
  // data.x and data.y are normalized [0,1]
  const screenX = data.x * window.innerWidth
  const screenY = data.y * window.innerHeight
  
  // Update UI or process data
})

initialize()
```

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT