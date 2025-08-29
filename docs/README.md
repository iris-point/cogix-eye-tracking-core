# Eye Tracking Core Demo

This is the live demo for the @iris-point/eye-tracking-core library.

## Live Demo

Visit the live demo at: https://[your-github-username].github.io/cogix-eye-tracking-core/

## Requirements

To use the eye tracking demo, you need:

1. **HH Eye Tracker Device** connected via USB
2. **HH Eye Tracker Software** running on port 9000
3. **Chrome or Edge browser** (WebSocket support required)

## How to Use

1. Ensure your eye tracker device is connected and the server is running
2. Open the demo page
3. Click "Connect" to establish connection with the eye tracker
4. Follow the calibration process (5 points)
5. Start tracking to see real-time gaze data

## Local Testing

If you want to test locally with the latest development version:

1. Clone the repository
2. Run `npm install`
3. Run `npm run build`
4. Run `npm run example`
5. Open http://localhost:8080 in your browser

## Features

- Real-time eye tracking visualization
- 5-point calibration system
- Fullscreen tracking mode
- Camera view overlay
- Gaze trail visualization
- FPS monitoring

## Troubleshooting

- **Cannot connect**: Ensure the eye tracker server is running on ws://127.0.0.1:9000
- **No camera image**: Check if the camera is initialized after connecting
- **Calibration issues**: Ensure you're looking at each calibration point for the full duration

## License

MIT