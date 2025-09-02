# Cogix Eye Tracking jsPsych Plugin

A jsPsych 8-compatible plugin for eye tracking using the Cogix Eye Tracking Core SDK.

## Features

- ✅ **Full jsPsych 8 Compatibility** - Uses modern class-based structure with async/await
- ✅ **Multiple Operation Modes** - Connect, calibrate, start tracking, stop, disconnect
- ✅ **Real-time Visualization** - Optional gaze point and trail visualization
- ✅ **Data Recording** - Automatic gaze data collection at 60Hz+
- ✅ **Simulation Support** - Built-in simulation for testing without hardware

## Installation

### Via NPM (after publish)
```bash
npm install @iris-point/eye-tracking-core
```

### Via CDN
```html
<!-- Load jsPsych 8 (latest) -->
<script src="https://unpkg.com/jspsych@8.2.2"></script>

<!-- Load Eye Tracking SDK -->
<script src="https://unpkg.com/@iris-point/eye-tracking-core@latest/dist/cogix-eye-tracking-core.min.js"></script>

<!-- Load jsPsych Plugin -->
<script src="https://unpkg.com/@iris-point/eye-tracking-core@latest/dist/cogix-eye-tracking-jspsych-plugin.min.js"></script>
```

## Usage

```javascript
// Initialize jsPsych
const jsPsych = initJsPsych({
  on_finish: function() {
    // Handle experiment completion
  }
});

// Create timeline
let timeline = [];

// Connect to eye tracker
timeline.push({
  type: jsPsychEyeTracking,
  mode: 'connect',
  ws_url: 'ws://127.0.0.1:9000',
  show_camera: true
});

// Calibrate
timeline.push({
  type: jsPsychEyeTracking,
  mode: 'calibrate',
  message: 'Follow the green dots with your eyes'
});

// Start tracking with stimulus
timeline.push({
  type: jsPsychEyeTracking,
  mode: 'start',
  stimulus: '<h1>Look at this text</h1>',
  trial_duration: 5000,
  show_gaze: true,
  save_trial_data: true
});

// Stop tracking
timeline.push({
  type: jsPsychEyeTracking,
  mode: 'stop'
});

// Disconnect
timeline.push({
  type: jsPsychEyeTracking,
  mode: 'disconnect'
});

// Run experiment
jsPsych.run(timeline);
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `mode` | string | 'calibrate' | Operation mode: 'connect', 'calibrate', 'start', 'stop', 'disconnect' |
| `ws_url` | string | 'ws://127.0.0.1:9000' | WebSocket URL for eye tracker |
| `show_camera` | boolean | false | Show camera view during tracking |
| `show_gaze` | boolean | true | Show gaze visualization |
| `sample_rate` | int | 60 | Sample rate for data recording (Hz) |
| `stimulus` | HTML string | null | Stimulus content to display |
| `trial_duration` | int | null | Duration in ms (null = until response) |
| `choices` | keys | 'NO_KEYS' | Keys that will end the trial |
| `message` | string | null | Message to show during operation |
| `save_trial_data` | boolean | true | Save gaze data to trial data |

## Data Output

The plugin saves the following data:

```javascript
{
  mode: 'start',              // Operation mode
  success: true,              // Whether operation succeeded
  message: 'Tracking started', // Status message
  rt: 5234,                   // Response time (ms)
  response: ' ',              // Key pressed (if applicable)
  total_samples: 314,         // Number of gaze samples
  calibration_accuracy: 0.92, // Calibration accuracy (0-1)
  gaze_data: [...],          // Array of gaze samples
  storage_key: 'jspsych_...'  // LocalStorage key for data
}
```

## Gaze Data Format

Each gaze sample contains:

```javascript
{
  timestamp: 1234567890,  // Unix timestamp
  x: 0.523,              // Normalized X coordinate (0-1)
  y: 0.412,              // Normalized Y coordinate (0-1)
  confidence: 0.95,      // Tracking confidence (0-1)
  trial_index: 3         // Current trial index
}
```

## Simulation Mode

The plugin supports jsPsych's simulation mode for testing:

```javascript
jsPsych.simulate(timeline, "visual", {}, function() {
  console.log('Simulation complete');
});
```

## Requirements

- jsPsych 8.x (tested with 8.2.2)
- Cogix Eye Tracking Core SDK
- Eye tracker hardware (or use simulation mode)
- Modern browser with WebSocket support

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT