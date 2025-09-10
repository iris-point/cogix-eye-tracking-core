// Eye Tracker Core wrapper for browser extension
// This is injected into the page context to access the eye tracking SDK

(function() {
  'use strict';
  
  // Eye tracker instance
  let eyeTracker = null;
  let calibrationUI = null;
  let isCalibrating = false;
  let isTracking = false;
  let recordingStartTime = null;
  
  // Data buffer for batching
  let gazeBuffer = [];
  let bufferFlushInterval = null;
  
  // Configuration
  const config = {
    wsUrl: 'ws://localhost:8765',
    bufferSize: 100,
    flushInterval: 100, // ms
    reconnectDelay: 5000,
    calibrationPoints: 9
  };
  
  // Simple EventEmitter implementation
  class EventEmitter {
    constructor() {
      this.events = {};
    }
    
    on(event, listener) {
      if (!this.events[event]) {
        this.events[event] = [];
      }
      this.events[event].push(listener);
    }
    
    emit(event, ...args) {
      if (this.events[event]) {
        this.events[event].forEach(listener => listener(...args));
      }
    }
    
    off(event, listener) {
      if (this.events[event]) {
        this.events[event] = this.events[event].filter(l => l !== listener);
      }
    }
  }
  
  // DataBuffer for managing gaze data
  class DataBuffer {
    constructor(size = 1000) {
      this.buffer = [];
      this.maxSize = size;
    }
    
    add(data) {
      this.buffer.push({
        ...data,
        timestamp: Date.now()
      });
      
      if (this.buffer.length > this.maxSize) {
        this.buffer.shift();
      }
    }
    
    clear() {
      this.buffer = [];
    }
    
    getAll() {
      return [...this.buffer];
    }
    
    getLast(n) {
      return this.buffer.slice(-n);
    }
  }
  
  // EyeTracker class
  class EyeTracker extends EventEmitter {
    constructor(wsUrl) {
      super();
      this.wsUrl = wsUrl;
      this.ws = null;
      this.connected = false;
      this.dataBuffer = new DataBuffer(1000);
      this.reconnectTimeout = null;
    }
    
    connect() {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        return Promise.resolve();
      }
      
      return new Promise((resolve, reject) => {
        try {
          this.ws = new WebSocket(this.wsUrl);
          
          this.ws.onopen = () => {
            console.log('Eye tracker connected');
            this.connected = true;
            this.emit('connected');
            
            // Send initialization
            this.sendCommand({
              req_cmd: 'init_et10c',
              eyeType: 0,
              resType: '1640x1232x60',
              numpoint: 5,
              sceenTypeIndex: 1
            });
            
            resolve();
          };
          
          this.ws.onmessage = (event) => {
            this.handleMessage(event.data);
          };
          
          this.ws.onerror = (error) => {
            console.error('Eye tracker error:', error);
            this.emit('error', error);
            reject(error);
          };
          
          this.ws.onclose = () => {
            console.log('Eye tracker disconnected');
            this.connected = false;
            this.emit('disconnected');
            
            // Auto-reconnect if tracking
            if (isTracking && !this.reconnectTimeout) {
              this.reconnectTimeout = setTimeout(() => {
                this.reconnectTimeout = null;
                this.connect().catch(console.error);
              }, config.reconnectDelay);
            }
          };
        } catch (error) {
          reject(error);
        }
      });
    }
    
    disconnect() {
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      
      this.connected = false;
    }
    
    sendCommand(cmd) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(cmd));
      }
    }
    
    handleMessage(data) {
      try {
        const message = JSON.parse(data);
        
        // Handle different message types
        if (message.type === 'tracker_output' || message.gaze) {
          const gazeData = this.parseGazeData(message);
          this.dataBuffer.add(gazeData);
          this.emit('gaze', gazeData);
        } else if (message.type === 'calibration_result') {
          this.emit('calibrationComplete', message.result);
        } else if (message.type === 'camera_frame') {
          this.emit('cameraFrame', message.frame);
        }
      } catch (error) {
        console.error('Failed to parse eye tracker message:', error);
      }
    }
    
    parseGazeData(message) {
      // Parse based on the actual hardware format
      if (message.gaze) {
        return {
          x: message.gaze.x * window.innerWidth,
          y: message.gaze.y * window.innerHeight,
          confidence: message.gaze.confidence || 1,
          leftEye: message.leftEye,
          rightEye: message.rightEye,
          timestamp: message.timestamp || Date.now()
        };
      }
      
      // Fallback for different formats
      return {
        x: message.x || 0,
        y: message.y || 0,
        confidence: message.confidence || 0,
        timestamp: message.timestamp || Date.now()
      };
    }
    
    startTracking() {
      this.sendCommand({ req_cmd: 'startTracker' });
      isTracking = true;
    }
    
    stopTracking() {
      this.sendCommand({ req_cmd: 'stopTracker' });
      isTracking = false;
    }
    
    startCalibration() {
      this.sendCommand({ req_cmd: 'startCalibration' });
      isCalibrating = true;
    }
    
    stopCalibration() {
      this.sendCommand({ req_cmd: 'stopCalibration' });
      isCalibrating = false;
    }
  }
  
  // CalibrationUI class - using SDK's 5-point calibration
  class CalibrationUI {
    constructor(eyeTracker) {
      this.eyeTracker = eyeTracker;
      this.container = null;
      this.points = [];
      this.currentPoint = 0;
      // Use same 5 points as SDK
      this.calibrationRatios = [
        { x: 0.1, y: 0.1 },  // Top-left
        { x: 0.9, y: 0.1 },  // Top-right  
        { x: 0.5, y: 0.5 },  // Center
        { x: 0.1, y: 0.9 },  // Bottom-left
        { x: 0.9, y: 0.9 }   // Bottom-right
      ];
    }
    
    start() {
      // Request fullscreen first (SDK requirement)
      this.requestFullscreen();
      // Wait for fullscreen before creating UI
      setTimeout(() => {
        this.createUI();
        this.showNextPoint();
      }, 500);
    }
    
    requestFullscreen() {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
      }
    }
    
    createUI() {
      // Create fullscreen calibration container
      this.container = document.createElement('div');
      this.container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #1a1a1a;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      
      // Instructions
      const instructions = document.createElement('div');
      instructions.style.cssText = `
        position: absolute;
        top: 50px;
        left: 50%;
        transform: translateX(-50%);
        color: white;
        font-size: 24px;
        text-align: center;
      `;
      instructions.innerHTML = `
        <h2>Eye Tracker Calibration</h2>
        <p>Look at each point and press SPACE</p>
      `;
      
      this.container.appendChild(instructions);
      document.body.appendChild(this.container);
      
      // Generate calibration points
      this.generatePoints();
      
      // Add keyboard listener
      document.addEventListener('keydown', this.handleKeyPress.bind(this));
    }
    
    generatePoints() {
      // Use the calibration ratios from SDK (5 points)
      this.points = this.calibrationRatios.map(ratio => ({
        x: window.innerWidth * ratio.x,
        y: window.innerHeight * ratio.y
      }));
    }
    
    showNextPoint() {
      if (this.currentPoint >= this.points.length) {
        this.complete();
        return;
      }
      
      // Remove previous point
      const prevPoint = this.container.querySelector('.calibration-point');
      if (prevPoint) {
        prevPoint.remove();
      }
      
      // Create new point
      const point = document.createElement('div');
      point.className = 'calibration-point';
      point.style.cssText = `
        position: absolute;
        width: 30px;
        height: 30px;
        background: #9333ea;
        border: 3px solid white;
        border-radius: 50%;
        left: ${this.points[this.currentPoint].x}px;
        top: ${this.points[this.currentPoint].y}px;
        transform: translate(-50%, -50%);
        animation: pulse 1s infinite;
      `;
      
      // Add animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.2); }
        }
      `;
      document.head.appendChild(style);
      
      this.container.appendChild(point);
      
      // Send calibration point to eye tracker
      this.eyeTracker.sendCommand({
        req_cmd: 'startCalibration',
        point_x: this.points[this.currentPoint].x,
        point_y: this.points[this.currentPoint].y
      });
    }
    
    handleKeyPress(event) {
      if (event.code === 'Space') {
        event.preventDefault();
        this.currentPoint++;
        this.showNextPoint();
      } else if (event.code === 'Escape') {
        this.cancel();
      }
    }
    
    complete() {
      console.log('Calibration complete');
      
      // Send completion command
      this.eyeTracker.sendCommand({ req_cmd: 'checkCabliration' });
      
      // Clean up
      this.destroy();
      
      // Notify extension
      window.postMessage({
        type: 'CALIBRATION_COMPLETE',
        result: {
          points: this.points,
          success: true
        }
      }, '*');
    }
    
    cancel() {
      console.log('Calibration cancelled');
      this.eyeTracker.stopCalibration();
      this.exitFullscreen();
      this.destroy();
    }
    
    exitFullscreen() {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
    
    destroy() {
      if (this.container) {
        this.container.remove();
        this.container = null;
      }
      document.removeEventListener('keydown', this.handleKeyPress);
      // Ensure we exit fullscreen
      this.exitFullscreen();
    }
  }
  
  // Message handler for extension communication
  window.addEventListener('message', async (event) => {
    if (event.source !== window) return;
    
    switch (event.data.type) {
      case 'INIT_EYE_TRACKER':
        initializeEyeTracker(event.data.config);
        break;
        
      case 'START_TRACKER':
        if (eyeTracker) {
          eyeTracker.startTracking();
          startDataStreaming();
        }
        break;
        
      case 'STOP_TRACKER':
        if (eyeTracker) {
          eyeTracker.stopTracking();
          stopDataStreaming();
        }
        break;
        
      case 'START_CALIBRATION':
        if (eyeTracker) {
          calibrationUI = new CalibrationUI(eyeTracker);
          calibrationUI.start();
        }
        break;
        
      case 'START_RECORDING':
        recordingStartTime = event.data.timestamp || Date.now();
        break;
        
      case 'STOP_RECORDING':
        recordingStartTime = null;
        break;
    }
  });
  
  // Initialize eye tracker
  async function initializeEyeTracker(config) {
    try {
      eyeTracker = new EyeTracker(config.wsUrl || 'ws://localhost:8765');
      
      // Set up event listeners
      eyeTracker.on('connected', () => {
        window.postMessage({
          type: 'CONNECTION_STATUS',
          status: 'connected'
        }, '*');
      });
      
      eyeTracker.on('disconnected', () => {
        window.postMessage({
          type: 'CONNECTION_STATUS',
          status: 'disconnected'
        }, '*');
      });
      
      eyeTracker.on('gaze', (data) => {
        // Buffer gaze data
        gazeBuffer.push(data);
        
        // Send immediately if recording
        if (recordingStartTime) {
          data.relativeTime = Date.now() - recordingStartTime;
        }
      });
      
      eyeTracker.on('error', (error) => {
        window.postMessage({
          type: 'TRACKER_ERROR',
          error: error.toString()
        }, '*');
      });
      
      // Connect to eye tracker
      await eyeTracker.connect();
      
      // Notify extension
      window.postMessage({
        type: 'EYE_TRACKER_READY'
      }, '*');
      
    } catch (error) {
      console.error('Failed to initialize eye tracker:', error);
      window.postMessage({
        type: 'TRACKER_ERROR',
        error: error.toString()
      }, '*');
    }
  }
  
  // Start streaming gaze data
  function startDataStreaming() {
    if (bufferFlushInterval) return;
    
    bufferFlushInterval = setInterval(() => {
      if (gazeBuffer.length > 0) {
        // Send buffered data to extension
        gazeBuffer.forEach(data => {
          window.postMessage({
            type: 'GAZE_DATA',
            data
          }, '*');
        });
        
        // Clear buffer
        gazeBuffer = [];
      }
    }, config.flushInterval);
  }
  
  // Stop streaming gaze data
  function stopDataStreaming() {
    if (bufferFlushInterval) {
      clearInterval(bufferFlushInterval);
      bufferFlushInterval = null;
    }
    gazeBuffer = [];
  }
  
  // Expose to global for debugging
  window.EyeTrackerExtension = {
    eyeTracker,
    config,
    getBuffer: () => eyeTracker ? eyeTracker.dataBuffer.getAll() : [],
    isTracking: () => isTracking,
    isCalibrating: () => isCalibrating
  };
  
})();