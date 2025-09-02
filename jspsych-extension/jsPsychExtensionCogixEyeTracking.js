/**
 * jsPsych Extension for Cogix Eye Tracking
 * 
 * A jsPsych extension that enables eye tracking using the Cogix Eye Tracking Core SDK.
 * This extension can be used with any jsPsych plugin to add eye tracking capabilities.
 * 
 * @author Cogix Team
 * @version 1.0.0
 */

class jsPsychExtensionCogixEyeTracking {
  constructor(jsPsych) {
    this.jsPsych = jsPsych;
    this.tracker = null;
    this.calibrationUI = null;
    this.gazeRenderer = null;
    this.dataBuffer = [];
    this.recording = false;
    this.currentTrialData = [];
    this.initialized = false;
    this.calibrated = false;
    this.tracking = false;
    
    // Language support
    this.translations = {
      en: {
        notConnected: 'Not Connected',
        connected: 'Connected',
        calibrated: 'Calibrated',
        tracking: 'Tracking',
        error: 'Error'
      },
      zh: {
        notConnected: '未连接',
        connected: '已连接',
        calibrated: '已校准',
        tracking: '正在追踪',
        error: '错误'
      }
    };
  }

  /**
   * Initialize the extension - called once when experiment starts
   * @param {Object} params - Extension initialization parameters
   * @returns {Promise} Resolves when initialization is complete
   */
  async initialize(params = {}) {
    // Default parameters
    const defaults = {
      ws_url: 'ws://127.0.0.1:9000',
      auto_initialize: false,
      show_status: true,
      round_predictions: true,
      round_precision: 1,
      language: 'zh'  // 'en' for English, 'zh' for Chinese (default: Chinese)
    };
    
    this.params = { ...defaults, ...params };
    
    // Check if SDK is loaded
    if (!window.IrisPointEyeTracking) {
      console.error('Cogix Eye Tracking SDK not found. Please load the SDK before using this extension.');
      return Promise.reject(new Error('SDK not loaded'));
    }
    
    // Get SDK components
    const { EyeTracker, CalibrationUI, CanvasRenderer } = window.IrisPointEyeTracking;
    
    // Create tracker instance
    this.tracker = new EyeTracker({
      wsUrl: this.params.ws_url,
      autoInitialize: false,
      debug: false
    });
    
    // Setup data collection at maximum sampling rate
    this.tracker.on('gazeData', (data) => {
      // Always collect data at the highest rate possible
      if (this.recording) {
        const sample = {
          x: data.x,  // Raw x from WebSocket
          y: data.y,  // Raw y from WebSocket
          t: data.timestamp  // Use the high-resolution timestamp from the tracker
        };
        
        this.currentTrialData.push(sample);
        this.dataBuffer.push(sample);
      }
    });
    
    // Store extension reference for later use
    this.CalibrationUI = CalibrationUI;
    this.CanvasRenderer = CanvasRenderer;
    
    // Auto-initialize if requested
    if (this.params.auto_initialize) {
      try {
        await this.connect();
        this.initialized = true;
      } catch (error) {
        console.error('Failed to auto-initialize eye tracker:', error);
      }
    }
    
    // Add status indicator if requested
    if (this.params.show_status) {
      this.createStatusIndicator();
    }
    
    return Promise.resolve();
  }

  /**
   * Called at the start of each trial
   * @param {Object} params - Trial-specific parameters
   */
  on_start(params = {}) {
    // Clear trial data
    this.currentTrialData = [];
    
    // Parse trial parameters
    const trialParams = params || {};
    
    // Check if we should track this trial
    if (trialParams.track !== false) {
      // Start recording if tracker is ready
      if (this.initialized && this.calibrated) {
        this.startRecording();
      }
    }
    
    // Store target elements if specified
    if (trialParams.targets) {
      this.currentTargets = Array.isArray(trialParams.targets) ? 
        trialParams.targets : [trialParams.targets];
    } else {
      this.currentTargets = [];
    }
  }

  /**
   * Called after the trial plugin has loaded the DOM
   * @param {Object} params - Trial-specific parameters
   */
  on_load(params = {}) {
    const trialParams = params || {};
    
    // Add gaze visualization if requested
    if (trialParams.show_gaze && this.tracking) {
      this.showGazeVisualization();
    }
    
    // Track target elements' positions
    if (this.currentTargets.length > 0) {
      this.trackTargetPositions();
    }
  }

  /**
   * Called when the trial ends
   * @param {Object} params - Trial-specific parameters
   * @returns {Object} Data to be added to the trial
   */
  on_finish(params = {}) {
    // Stop recording
    this.stopRecording();
    
    // Hide gaze visualization if active
    if (this.gazeCanvas) {
      this.hideGazeVisualization();
    }
    
    // Prepare data to return
    const returnData = {
      cogix_eye_tracking: {
        samples: [...this.currentTrialData],
        sample_count: this.currentTrialData.length,
        tracking_active: this.tracking,
        calibrated: this.calibrated
      }
    };
    
    // Add target information if available
    if (this.currentTargets.length > 0 && this.targetPositions) {
      returnData.cogix_eye_tracking.targets = this.targetPositions;
    }
    
    // Clear trial-specific data
    this.currentTrialData = [];
    this.currentTargets = [];
    this.targetPositions = null;
    
    return returnData;
  }

  // ==================== Public API Methods ====================

  /**
   * Connect to the eye tracker
   * @returns {Promise} Resolves when connected
   */
  async connect() {
    if (this.initialized) {
      console.warn('Eye tracker already connected');
      return Promise.resolve();
    }
    
    try {
      await this.tracker.connect();
      
      // Initialize device components
      await new Promise(resolve => setTimeout(resolve, 100));
      this.tracker.initDevice();
      
      await new Promise(resolve => setTimeout(resolve, 500));
      this.tracker.initLight();
      
      this.initialized = true;
      this.updateStatus('connected');
      
      return Promise.resolve();
    } catch (error) {
      this.updateStatus('error');
      throw error;
    }
  }

  /**
   * Start calibration process
   * @param {Object} options - Calibration options
   * @returns {Promise} Resolves when calibration is complete
   */
  async calibrate(options = {}) {
    if (!this.initialized) {
      throw new Error('Eye tracker not initialized. Call connect() first.');
    }
    
    const defaults = {
      pointDuration: 3000,
      pointSize: 20,
      pointColor: '#4CAF50',
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      showInstructions: true,
      autoFullscreen: true
    };
    
    const calibrationOptions = { ...defaults, ...options };
    
    // Create calibration canvas
    const calibrationCanvas = document.createElement('canvas');
    calibrationCanvas.id = 'cogix-calibration-canvas';
    calibrationCanvas.style.position = 'fixed';
    calibrationCanvas.style.top = '0';
    calibrationCanvas.style.left = '0';
    calibrationCanvas.style.width = '100vw';
    calibrationCanvas.style.height = '100vh';
    calibrationCanvas.style.background = calibrationOptions.backgroundColor;
    calibrationCanvas.style.zIndex = '100000';
    calibrationCanvas.width = window.innerWidth;
    calibrationCanvas.height = window.innerHeight;
    
    document.body.appendChild(calibrationCanvas);
    
    // Enter fullscreen if requested
    if (calibrationOptions.autoFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        console.warn('Failed to enter fullscreen:', err);
      }
    }
    
    // Create calibration UI
    this.calibrationUI = new this.CalibrationUI(this.tracker, {
      canvas: calibrationCanvas,
      ...calibrationOptions
    });
    
    return new Promise((resolve, reject) => {
      const completeHandler = (result) => {
        this.calibrated = result.success;
        cleanup();
        
        if (result.success) {
          this.updateStatus('calibrated');
          resolve(result);
        } else {
          reject(new Error('Calibration failed'));
        }
      };
      
      const cancelHandler = () => {
        cleanup();
        reject(new Error('Calibration cancelled'));
      };
      
      const cleanup = () => {
        this.tracker.off('calibrationComplete', completeHandler);
        this.tracker.off('calibrationCancelled', cancelHandler);
        
        if (document.body.contains(calibrationCanvas)) {
          document.body.removeChild(calibrationCanvas);
        }
        
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
      };
      
      this.tracker.on('calibrationComplete', completeHandler);
      this.tracker.on('calibrationCancelled', cancelHandler);
      
      // Start calibration
      this.tracker.startCalibration();
    });
  }

  /**
   * Start eye tracking
   * @returns {Promise} Resolves when tracking starts
   */
  async startTracking() {
    if (!this.initialized) {
      throw new Error('Eye tracker not initialized');
    }
    
    if (!this.calibrated) {
      console.warn('Starting tracking without calibration');
    }
    
    this.tracker.startTracking();
    this.tracking = true;
    this.updateStatus('tracking');
    
    return Promise.resolve();
  }

  /**
   * Stop eye tracking
   * @returns {Promise} Resolves when tracking stops
   */
  async stopTracking() {
    if (!this.tracking) {
      return Promise.resolve();
    }
    
    this.tracker.stopTracking();
    this.tracking = false;
    this.updateStatus('calibrated');
    
    return Promise.resolve();
  }

  /**
   * Disconnect from eye tracker
   * @returns {Promise} Resolves when disconnected
   */
  async disconnect() {
    if (!this.initialized) {
      return Promise.resolve();
    }
    
    this.stopRecording();
    
    if (this.tracking) {
      await this.stopTracking();
    }
    
    this.tracker.disconnect();
    this.initialized = false;
    this.calibrated = false;
    this.tracking = false;
    this.updateStatus('disconnected');
    
    return Promise.resolve();
  }

  /**
   * Get current gaze position
   * @returns {Object|null} Current gaze position or null
   */
  getCurrentGaze() {
    // Get the most recent gaze data from the tracker directly
    // This ensures plugins can get real-time data even outside of trials
    if (this.tracker && this.tracking) {
      const lastData = this.tracker.getLastGazeData();
      if (lastData) {
        return {
          x: lastData.x,  // Raw x
          y: lastData.y,  // Raw y
          t: performance.now()  // High-resolution timestamp
        };
      }
    }
    
    // Fall back to trial data if available
    if (this.currentTrialData.length > 0) {
      return this.currentTrialData[this.currentTrialData.length - 1];
    }
    return null;
  }

  /**
   * Get all collected data
   * @returns {Array} All gaze data samples
   */
  getAllData() {
    return [...this.dataBuffer];
  }

  /**
   * Clear all collected data
   */
  clearData() {
    this.dataBuffer = [];
    this.currentTrialData = [];
  }

  /**
   * Reset calibration
   */
  resetCalibration() {
    if (this.tracker && this.initialized) {
      this.tracker.resetCalibration();
      this.calibrated = false;
      this.updateStatus('connected');
    }
  }

  /**
   * Get the tracker instance (for plugin use)
   * @returns {Object|null} The tracker instance or null
   */
  getTracker() {
    return this.tracker;
  }

  /**
   * Create a camera overlay using the SDK's CameraOverlay class
   * @param {HTMLElement} container - The container element to add the preview to
   * @param {Object} config - Configuration for the camera overlay
   * @returns {Object} CameraOverlay instance
   */
  createCameraOverlay(container, config = {}) {
    // Check if SDK CameraOverlay is available
    if (!window.IrisPointEyeTracking || !window.IrisPointEyeTracking.CameraOverlay) {
      console.warn('CameraOverlay not available in SDK');
      return null;
    }
    
    const { CameraOverlay } = window.IrisPointEyeTracking;
    
    // Default configuration for init camera plugin
    const overlayConfig = {
      container: container,
      position: 'center',
      size: 'medium',
      showControls: false,  // We'll handle controls in the plugin
      autoHide: false,
      zIndex: 100,
      ...config
    };
    
    // Create and initialize the camera overlay
    const cameraOverlay = new CameraOverlay(this.tracker, overlayConfig);
    cameraOverlay.init();
    
    return cameraOverlay;
  }

  /**
   * Create a simple status preview display (fallback when camera not available)
   * @param {HTMLElement} container - The container element to add the preview to
   * @returns {Object} Preview control object with update and destroy methods
   */
  createStatusPreview(container) {
    // Create preview element
    const preview = document.createElement('div');
    preview.style.cssText = `
      width: 320px;
      height: 240px;
      background: #1a1a1a;
      border: 2px solid #333;
      border-radius: 8px;
      margin: 20px auto;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    // Create eye indicators
    const eyeContainer = document.createElement('div');
    eyeContainer.style.cssText = `
      display: flex;
      gap: 40px;
      margin-bottom: 20px;
    `;
    
    const leftEye = document.createElement('div');
    leftEye.style.cssText = `
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: 3px solid #666;
      background: #222;
      position: relative;
      transition: all 0.3s ease;
    `;
    
    const leftPupil = document.createElement('div');
    leftPupil.style.cssText = `
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #666;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      transition: all 0.1s ease;
    `;
    leftEye.appendChild(leftPupil);
    
    const rightEye = document.createElement('div');
    rightEye.style.cssText = `
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: 3px solid #666;
      background: #222;
      position: relative;
      transition: all 0.3s ease;
    `;
    
    const rightPupil = document.createElement('div');
    rightPupil.style.cssText = `
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #666;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      transition: all 0.1s ease;
    `;
    rightEye.appendChild(rightPupil);
    
    eyeContainer.appendChild(leftEye);
    eyeContainer.appendChild(rightEye);
    
    // Create status text
    const statusText = document.createElement('div');
    statusText.style.cssText = `
      font-size: 14px;
      color: #999;
      text-align: center;
    `;
    statusText.textContent = 'Waiting for connection...';
    
    // Create signal strength indicator
    const signalContainer = document.createElement('div');
    signalContainer.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      display: flex;
      gap: 2px;
      align-items: flex-end;
    `;
    
    const signalBars = [];
    for (let i = 0; i < 4; i++) {
      const bar = document.createElement('div');
      bar.style.cssText = `
        width: 4px;
        height: ${8 + i * 4}px;
        background: #444;
        border-radius: 1px;
        transition: background 0.3s ease;
      `;
      signalBars.push(bar);
      signalContainer.appendChild(bar);
    }
    
    preview.appendChild(eyeContainer);
    preview.appendChild(statusText);
    preview.appendChild(signalContainer);
    container.appendChild(preview);
    
    // Update interval
    let updateInterval = null;
    let gazeDataCount = 0;
    let lastGazeTime = 0;
    
    const updatePreview = () => {
      if (!this.tracker) {
        statusText.textContent = 'No tracker initialized';
        leftEye.style.borderColor = '#666';
        rightEye.style.borderColor = '#666';
        leftPupil.style.background = '#666';
        rightPupil.style.background = '#666';
        signalBars.forEach(bar => bar.style.background = '#444');
        return;
      }
      
      // Update connection status
      if (this.initialized && !this.calibrated) {
        statusText.textContent = 'Connected - Ready to calibrate';
        statusText.style.color = '#ffa500';
      } else if (this.calibrated && !this.tracking) {
        statusText.textContent = 'Calibrated - Ready to track';
        statusText.style.color = '#4CAF50';
      } else if (this.tracking) {
        statusText.textContent = 'Tracking active';
        statusText.style.color = '#00ff00';
      } else {
        statusText.textContent = 'Connecting...';
        statusText.style.color = '#999';
      }
      
      // Update eye indicators based on recent gaze data
      const currentGaze = this.getCurrentGaze();
      if (currentGaze && this.tracking) {
        const now = Date.now();
        if (currentGaze.t > lastGazeTime) {
          gazeDataCount++;
          lastGazeTime = currentGaze.t;
          
          // Animate eyes to show tracking
          leftEye.style.borderColor = '#00ff00';
          rightEye.style.borderColor = '#00ff00';
          leftPupil.style.background = '#00ff00';
          rightPupil.style.background = '#00ff00';
          
          // Move pupils slightly based on gaze position
          const leftOffset = {
            x: (currentGaze.x - 0.5) * 20,
            y: (currentGaze.y - 0.5) * 20
          };
          leftPupil.style.transform = `translate(calc(-50% + ${leftOffset.x}px), calc(-50% + ${leftOffset.y}px))`;
          rightPupil.style.transform = `translate(calc(-50% + ${leftOffset.x}px), calc(-50% + ${leftOffset.y}px))`;
          
          // Update signal strength based on data recency
          const activeBars = 4;  // Full strength when tracking
          signalBars.forEach((bar, i) => {
            if (i < activeBars) {
              bar.style.background = '#00ff00';
            } else {
              bar.style.background = '#444';
            }
          });
        } else if (now - lastGazeTime > 1000) {
          // No recent data
          leftEye.style.borderColor = '#ffa500';
          rightEye.style.borderColor = '#ffa500';
          leftPupil.style.background = '#ffa500';
          rightPupil.style.background = '#ffa500';
          leftPupil.style.transform = 'translate(-50%, -50%)';
          rightPupil.style.transform = 'translate(-50%, -50%)';
        }
      } else if (this.initialized) {
        // Connected but no tracking
        leftEye.style.borderColor = '#4CAF50';
        rightEye.style.borderColor = '#4CAF50';
        leftPupil.style.background = '#4CAF50';
        rightPupil.style.background = '#4CAF50';
        leftPupil.style.transform = 'translate(-50%, -50%)';
        rightPupil.style.transform = 'translate(-50%, -50%)';
        signalBars.forEach((bar, i) => {
          bar.style.background = i < 2 ? '#4CAF50' : '#444';
        });
      }
    };
    
    // Start updating
    updateInterval = setInterval(updatePreview, 100);
    updatePreview();
    
    // Return control object
    return {
      update: updatePreview,
      destroy: () => {
        if (updateInterval) {
          clearInterval(updateInterval);
        }
        if (container.contains(preview)) {
          container.removeChild(preview);
        }
      }
    };
  }

  // ==================== Private Helper Methods ====================

  startRecording() {
    this.recording = true;
  }

  stopRecording() {
    this.recording = false;
  }

  createStatusIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'cogix-eye-tracking-status';
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      border-radius: 20px;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      z-index: 99999;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    
    const dot = document.createElement('span');
    dot.id = 'cogix-status-dot';
    dot.style.cssText = `
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #999;
    `;
    
    const text = document.createElement('span');
    text.id = 'cogix-status-text';
    text.textContent = 'Not Connected';
    
    indicator.appendChild(dot);
    indicator.appendChild(text);
    document.body.appendChild(indicator);
    
    this.statusIndicator = indicator;
    this.statusDot = dot;
    this.statusText = text;
  }

  updateStatus(status) {
    if (!this.statusIndicator) return;
    
    const lang = this.params?.language || 'en';
    const translations = this.translations[lang] || this.translations.en;
    
    const statusConfig = {
      disconnected: { color: '#999', text: translations.notConnected },
      connected: { color: '#ffa500', text: translations.connected },
      calibrated: { color: '#4CAF50', text: translations.calibrated },
      tracking: { color: '#00ff00', text: translations.tracking },
      error: { color: '#ff0000', text: translations.error }
    };
    
    const config = statusConfig[status] || statusConfig.disconnected;
    this.statusDot.style.background = config.color;
    this.statusText.textContent = config.text;
  }

  showGazeVisualization() {
    if (this.gazeCanvas) return;
    
    const canvas = document.createElement('canvas');
    canvas.id = 'cogix-gaze-canvas';
    canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 99998;
    `;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    document.body.appendChild(canvas);
    this.gazeCanvas = canvas;
    
    // Create renderer
    this.gazeRenderer = new this.CanvasRenderer(this.tracker, {
      canvas: canvas,
      showGazePoint: true,
      gazePointSize: 15,
      gazePointColor: '#ff0000',
      showTrail: true,
      trailLength: 30,
      trailFadeOut: true,
      showHeatmap: false,
      clearOnStop: true
    });
  }

  hideGazeVisualization() {
    if (this.gazeCanvas) {
      document.body.removeChild(this.gazeCanvas);
      this.gazeCanvas = null;
      this.gazeRenderer = null;
    }
  }

  trackTargetPositions() {
    this.targetPositions = {};
    
    this.currentTargets.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        const rect = element.getBoundingClientRect();
        this.targetPositions[selector] = {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
          center_x: rect.left + rect.width / 2,
          center_y: rect.top + rect.height / 2
        };
      }
    });
  }
}

// Static info property
jsPsychExtensionCogixEyeTracking.info = {
  name: 'cogix-eye-tracking',
  version: '1.0.0',
  data: {
    /** Array of gaze samples collected during the trial */
    cogix_eye_tracking: {
      type: 'COMPLEX',
      nested: {
        /** Array of gaze samples */
        samples: {
          type: 'COMPLEX',
          array: true
        },
        /** Total number of samples collected */
        sample_count: {
          type: 'INT'
        },
        /** Whether tracking was active during the trial */
        tracking_active: {
          type: 'BOOL'
        },
        /** Whether the eye tracker was calibrated */
        calibrated: {
          type: 'BOOL'
        },
        /** Target element positions if specified */
        targets: {
          type: 'COMPLEX'
        }
      }
    }
  }
};

// For compatibility with different loading methods
if (typeof module !== 'undefined' && module.exports) {
  module.exports = jsPsychExtensionCogixEyeTracking;
}