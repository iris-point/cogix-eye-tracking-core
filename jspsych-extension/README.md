# Cogix Eye Tracking Extension for jsPsych 8

A powerful jsPsych extension that adds eye tracking capabilities to any jsPsych experiment using the Cogix Eye Tracking Core SDK.

## Why Use an Extension Instead of a Plugin?

Extensions in jsPsych are designed to add functionality that works across **all plugins**, while plugins are designed for specific trial types. The eye tracking extension:

- ✅ Works with **any** jsPsych plugin (html-keyboard-response, survey, etc.)
- ✅ Automatically collects data without modifying existing trials
- ✅ Provides a consistent API across your entire experiment
- ✅ Manages the eye tracker lifecycle independently of trials

## Features

- 🎯 **Universal Compatibility** - Works with all jsPsych 8 plugins
- 📊 **Automatic Data Collection** - Gaze data automatically added to trial results
- 🎨 **Real-time Visualization** - Optional gaze point overlay
- 🎯 **Target Tracking** - Track positions of specific DOM elements
- ⚙️ **Configurable Sampling** - Adjustable sampling rate (default 60Hz)
- 📐 **Built-in Calibration** - Professional 5-point calibration UI
- 📈 **Status Indicator** - Real-time connection status display

## Installation

### Via NPM (after publish)
```bash
npm install @iris-point/eye-tracking-core
```

### Via CDN
```html
<!-- Load jsPsych 8 -->
<script src="https://unpkg.com/jspsych@8.2.2"></script>

<!-- Load Eye Tracking SDK -->
<script src="https://unpkg.com/@iris-point/eye-tracking-core@latest/dist/cogix-eye-tracking-core.min.js"></script>

<!-- Load Eye Tracking Extension -->
<script src="https://unpkg.com/@iris-point/eye-tracking-core@latest/dist/jsPsychExtensionCogixEyeTracking.min.js"></script>
```

## Basic Usage

### 1. Initialize jsPsych with the Extension

```javascript
const jsPsych = initJsPsych({
  extensions: [
    {
      type: jsPsychExtensionCogixEyeTracking,
      params: {
        ws_url: 'ws://127.0.0.1:9000',
        auto_initialize: false,
        show_status: true,
        sampling_interval: 16, // ~60Hz
        round_predictions: true,
        round_precision: 2
      }
    }
  ]
});
```

### 2. Get Extension Reference

```javascript
const eyeTracker = jsPsych.extensions.cogix_eye_tracking;
```

### 3. Connect and Calibrate

```javascript
// Connect to eye tracker
await eyeTracker.connect();

// Run calibration
await eyeTracker.calibrate({
  pointDuration: 3000,
  autoFullscreen: true
});

// Start tracking
await eyeTracker.startTracking();
```

### 4. Use in Any Trial

```javascript
const trial = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: '<p>Look at this text while we track your eyes!</p>',
  choices: [' '],
  extensions: [
    {
      type: jsPsychExtensionCogixEyeTracking,
      params: {
        track: true,              // Enable tracking for this trial
        show_gaze: true,          // Show gaze visualization
        targets: ['.my-element']  // Track specific elements
      }
    }
  ]
};
```

## Extension Parameters

### Initialization Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `ws_url` | string | 'ws://127.0.0.1:9000' | WebSocket URL for eye tracker |
| `auto_initialize` | boolean | false | Auto-connect on experiment start |
| `show_status` | boolean | true | Show connection status indicator |
| `sampling_interval` | number | 16 | Sampling interval in ms (~60Hz) |
| `round_predictions` | boolean | true | Round coordinate values |
| `round_precision` | number | 1 | Decimal places for rounding |

### Trial Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `track` | boolean | true | Enable tracking for this trial |
| `show_gaze` | boolean | false | Show gaze visualization overlay |
| `targets` | array/string | [] | CSS selectors for elements to track |

## Data Output

The extension automatically adds eye tracking data to each trial:

```javascript
{
  // Standard trial data...
  cogix_eye_tracking: {
    samples: [
      { x: 0.523, y: 0.412, t: 1234567890, confidence: 0.95 },
      // ... more samples
    ],
    sample_count: 314,
    tracking_active: true,
    calibrated: true,
    targets: {
      '#element1': {
        x: 100, y: 200, width: 300, height: 150,
        center_x: 250, center_y: 275
      }
    }
  }
}
```

## API Methods

### Core Methods

```javascript
// Connection management
await eyeTracker.connect();
await eyeTracker.disconnect();

// Calibration
await eyeTracker.calibrate(options);
eyeTracker.resetCalibration();

// Tracking control
await eyeTracker.startTracking();
await eyeTracker.stopTracking();

// Data access
const currentGaze = eyeTracker.getCurrentGaze();
const allData = eyeTracker.getAllData();
eyeTracker.clearData();
```

### Calibration Options

```javascript
await eyeTracker.calibrate({
  pointDuration: 3000,              // Duration per calibration point (ms)
  pointSize: 20,                    // Size of calibration points
  pointColor: '#4CAF50',            // Color of calibration points
  backgroundColor: 'rgba(0,0,0,0.95)', // Background color
  showInstructions: true,           // Show instruction text
  autoFullscreen: true              // Enter fullscreen for calibration
});
```

## Complete Example

```javascript
// Initialize jsPsych with extension
const jsPsych = initJsPsych({
  extensions: [
    {
      type: jsPsychExtensionCogixEyeTracking,
      params: {
        ws_url: 'ws://127.0.0.1:9000',
        show_status: true
      }
    }
  ],
  on_finish: function() {
    // Access all data including eye tracking
    const data = jsPsych.data.get().json();
    console.log(data);
  }
});

// Get extension reference
const eyeTracker = jsPsych.extensions.cogix_eye_tracking;

// Create timeline
const timeline = [];

// Welcome trial (no tracking)
timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: '<h1>Welcome</h1><p>Click to connect eye tracker</p>',
  choices: ['Connect'],
  extensions: [
    {
      type: jsPsychExtensionCogixEyeTracking,
      params: { track: false }
    }
  ],
  on_finish: async function() {
    await eyeTracker.connect();
    await eyeTracker.calibrate();
    await eyeTracker.startTracking();
  }
});

// Experimental trial (with tracking)
timeline.push({
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `
    <h2>Look at these items:</h2>
    <div id="item1">Item 1</div>
    <div id="item2">Item 2</div>
    <p>Press SPACE to continue</p>
  `,
  choices: [' '],
  extensions: [
    {
      type: jsPsychExtensionCogixEyeTracking,
      params: {
        track: true,
        show_gaze: true,
        targets: ['#item1', '#item2']
      }
    }
  ]
});

// Run experiment
jsPsych.run(timeline);
```

## Advantages Over Plugin Approach

| Feature | Extension | Plugin |
|---------|-----------|--------|
| Works with any plugin | ✅ Yes | ❌ No |
| Requires special trial type | ❌ No | ✅ Yes |
| Can modify existing experiments | ✅ Easy | ❌ Requires rewrite |
| Consistent API across trials | ✅ Yes | ❌ Plugin-specific |
| Lifecycle management | ✅ Automatic | ❌ Manual |
| Data integration | ✅ Automatic | ❌ Manual |

## Requirements

- jsPsych 8.x (tested with 8.2.2)
- Cogix Eye Tracking Core SDK
- Eye tracker hardware
- Modern browser with WebSocket support

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### Eye tracker not connecting
- Ensure eye tracker software is running on port 9000
- Check firewall settings
- Verify USB connection

### Low sampling rate
- Adjust `sampling_interval` parameter (lower = higher rate)
- Check CPU usage
- Close unnecessary applications

### Calibration issues
- Ensure good lighting conditions
- Position monitor at eye level
- Keep head still during calibration

## License

MIT