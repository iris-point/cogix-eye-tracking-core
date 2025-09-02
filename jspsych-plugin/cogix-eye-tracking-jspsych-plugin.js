/**
 * cogix-eye-tracking-jspsych-plugin
 * A jsPsych 8 plugin for eye tracking using @iris-point/eye-tracking-core
 * 
 * Author: Cogix Team
 * Version: 1.0.0
 * 
 * This plugin provides eye tracking capabilities including:
 * - Connection management
 * - Calibration
 * - Real-time gaze tracking
 * - Data recording
 * 
 * Compatible with jsPsych 8.x
 */

var jsPsychEyeTracking = (function () {
  "use strict";

  const info = {
    name: 'eye-tracking',
    version: '1.0.0',
    parameters: {
      mode: {
        type: 'STRING',
        default: 'connect',
        description: 'Mode: connect, calibrate, start, stop, disconnect'
      },
      stimulus: {
        type: 'HTML_STRING',
        default: null,
        description: 'HTML content to display'
      },
      message: {
        type: 'STRING',
        default: '',
        description: 'Message to display'
      },
      show_gaze: {
        type: 'BOOL',
        default: false,
        description: 'Show gaze visualization'
      },
      trial_duration: {
        type: 'INT',
        default: null,
        description: 'Trial duration in ms'
      },
      response_ends_trial: {
        type: 'BOOL',
        default: true,
        description: 'End trial on response'
      },
      choices: {
        type: 'KEYS',
        default: 'ALL_KEYS',
        description: 'Valid keyboard responses'
      },
      data: {
        type: 'OBJECT',
        default: {},
        description: 'Additional data to store'
      }
    }
  };

  class EyeTrackingPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
      
      // Check if tracker already exists in global scope
      if (!window.jsPsychEyeTracker) {
        // Check if SDK is loaded
        if (!window.IrisPointEyeTracking) {
          console.error('Cogix Eye Tracking SDK not found. Please load the SDK before using this plugin.');
          return;
        }
        
        // Get SDK components
        const { EyeTracker, CalibrationUI, CanvasRenderer, CameraOverlay, DeviceStatus } = 
          window.IrisPointEyeTracking;
        
        // Create global tracker instance
        window.jsPsychEyeTracker = new EyeTracker({
          wsUrl: 'ws://127.0.0.1:9000',
          autoInitialize: false,
          debug: false
        });
        
        // Create global data buffer
        window.jsPsychEyeTrackingData = [];
        
        // Setup data collection
        window.jsPsychEyeTracker.on('gazeData', (data) => {
          if (window.jsPsychEyeTrackingRecording) {
            window.jsPsychEyeTrackingData.push({
              timestamp: data.timestamp,
              x: data.x,
              y: data.y,
              confidence: data.confidence,
              trial_index: jsPsych.getCurrentTrial()?.trial_index
            });
          }
        });
      }
      
      this.tracker = window.jsPsychEyeTracker;
    }

    async trial(display_element, trial, on_load) {
      // Initialize trial data
      let trial_data = {
        mode: trial.mode,
        success: false,
        message: "",
        rt: null
      };

      const start_time = performance.now();

      // Call on_load callback if provided
      if (on_load) {
        on_load();
      }

      // Handle different modes
      switch (trial.mode) {
        case 'connect':
          await this.handleConnect(display_element, trial, trial_data, start_time);
          break;
        
        case 'calibrate':
          await this.handleCalibrate(display_element, trial, trial_data, start_time);
          break;
        
        case 'start':
          await this.handleStart(display_element, trial, trial_data, start_time);
          break;
        
        case 'stop':
          await this.handleStop(display_element, trial, trial_data);
          break;
        
        case 'disconnect':
          await this.handleDisconnect(display_element, trial, trial_data);
          break;
        
        default:
          console.error('Unknown eye tracking mode:', trial.mode);
          this.jsPsych.finishTrial(trial_data);
      }
    }

    async handleConnect(display_element, trial, trial_data, start_time) {
      // Show connection message
      display_element.innerHTML = `
        <div style="text-align: center; padding: 50px;">
          <h2>Connecting to Eye Tracker</h2>
          <p>${trial.message || 'Please wait...'}</p>
        </div>
      `;

      try {
        // Connect to tracker
        await this.tracker.connect();
        
        trial_data.success = true;
        trial_data.message = "Connected successfully";
        trial_data.rt = performance.now() - start_time;
        
        // Initialize device after connection
        await new Promise(resolve => setTimeout(resolve, 100));
        this.tracker.initDevice();
        
        await new Promise(resolve => setTimeout(resolve, 500));
        this.tracker.initLight();
        
        if (trial.show_camera) {
          await new Promise(resolve => setTimeout(resolve, 500));
          this.tracker.initCamera();
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        trial_data.success = false;
        trial_data.message = error.message;
      }
      
      // End trial
      this.jsPsych.finishTrial(trial_data);
    }

    async handleCalibrate(display_element, trial, trial_data, start_time) {
      // Create calibration canvas
      const calibrationCanvas = document.createElement('canvas');
      calibrationCanvas.id = 'jspsych-eye-tracking-calibration';
      calibrationCanvas.style.position = 'fixed';
      calibrationCanvas.style.top = '0';
      calibrationCanvas.style.left = '0';
      calibrationCanvas.style.width = '100vw';
      calibrationCanvas.style.height = '100vh';
      calibrationCanvas.style.background = 'rgba(0, 0, 0, 0.95)';
      calibrationCanvas.style.zIndex = '10000';
      calibrationCanvas.width = window.innerWidth;
      calibrationCanvas.height = window.innerHeight;
      
      document.body.appendChild(calibrationCanvas);
      
      // Enter fullscreen
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        console.warn('Failed to enter fullscreen:', err);
      }

      // Create calibration UI
      const { CalibrationUI } = window.IrisPointEyeTracking;
      const calibrationUI = new CalibrationUI(this.tracker, {
        canvas: calibrationCanvas,
        pointDuration: 3000,
        pointSize: 20,
        pointColor: '#4CAF50',
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        showInstructions: true,
        autoFullscreen: false
      });

      // Show message
      display_element.innerHTML = `
        <div style="text-align: center; padding: 50px;">
          <h2>Calibration</h2>
          <p>${trial.message || 'Follow the green dots with your eyes'}</p>
          <p style="margin-top: 20px; color: #666;">Press ESC to cancel</p>
        </div>
      `;

      // Wait for calibration to complete
      return new Promise((resolve) => {
        const completeHandler = (result) => {
          trial_data.success = result.success;
          trial_data.message = "Calibration complete";
          trial_data.calibration_accuracy = result.accuracy;
          trial_data.rt = performance.now() - start_time;
          
          cleanup();
          resolve();
        };

        const cancelHandler = () => {
          trial_data.success = false;
          trial_data.message = "Calibration cancelled";
          trial_data.rt = performance.now() - start_time;
          
          cleanup();
          resolve();
        };

        const cleanup = () => {
          // Clean up
          this.tracker.off('calibrationComplete', completeHandler);
          this.tracker.off('calibrationCancelled', cancelHandler);
          
          // Remove canvas
          if (document.body.contains(calibrationCanvas)) {
            document.body.removeChild(calibrationCanvas);
          }
          
          // Exit fullscreen
          if (document.fullscreenElement) {
            document.exitFullscreen();
          }
          
          // End trial
          this.jsPsych.finishTrial(trial_data);
        };

        // Listen for calibration events
        this.tracker.on('calibrationComplete', completeHandler);
        this.tracker.on('calibrationCancelled', cancelHandler);

        // Start calibration
        this.tracker.startCalibration();
      });
    }

    async handleStart(display_element, trial, trial_data, start_time) {
      // Clear previous data
      window.jsPsychEyeTrackingData = [];
      window.jsPsychEyeTrackingRecording = true;
      
      // Show stimulus if provided
      if (trial.stimulus) {
        display_element.innerHTML = trial.stimulus;
      } else {
        display_element.innerHTML = `
          <div style="text-align: center; padding: 50px;">
            <h2>Eye Tracking Active</h2>
            <p>${trial.message || 'Recording gaze data...'}</p>
          </div>
        `;
      }

      // Add gaze visualization if requested
      if (trial.show_gaze) {
        const trackingCanvas = document.createElement('canvas');
        trackingCanvas.id = 'jspsych-gaze-canvas';
        trackingCanvas.style.position = 'fixed';
        trackingCanvas.style.top = '0';
        trackingCanvas.style.left = '0';
        trackingCanvas.style.width = '100vw';
        trackingCanvas.style.height = '100vh';
        trackingCanvas.style.pointerEvents = 'none';
        trackingCanvas.style.zIndex = '9999';
        trackingCanvas.width = window.innerWidth;
        trackingCanvas.height = window.innerHeight;
        display_element.appendChild(trackingCanvas);

        // Create renderer
        const { CanvasRenderer } = window.IrisPointEyeTracking;
        this.gazeRenderer = new CanvasRenderer(this.tracker, {
          canvas: trackingCanvas,
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

      // Start tracking
      this.tracker.startTracking();
      trial_data.success = true;
      trial_data.message = "Tracking started";

      // Wait for response or timeout
      return new Promise((resolve) => {
        let keyboard_listener = null;
        
        // End trial function
        const end_trial = (response) => {
          // Clear keyboard listener
          if (keyboard_listener) {
            this.jsPsych.pluginAPI.cancelKeyboardResponse(keyboard_listener);
          }

          // Record response
          if (response) {
            trial_data.rt = response.rt;
            trial_data.response = response.key;
          } else {
            trial_data.rt = performance.now() - start_time;
          }

          // Save gaze data if requested
          if (trial.save_trial_data) {
            trial_data.gaze_data = [...window.jsPsychEyeTrackingData];
          }

          // Clean up canvas
          if (this.gazeRenderer) {
            const canvas = document.getElementById('jspsych-gaze-canvas');
            if (canvas) canvas.remove();
            this.gazeRenderer = null;
          }

          // End trial
          this.jsPsych.finishTrial(trial_data);
          resolve();
        };

        // Setup keyboard listener
        if (trial.choices !== "NO_KEYS") {
          keyboard_listener = this.jsPsych.pluginAPI.getKeyboardResponse({
            callback_function: end_trial,
            valid_responses: trial.choices,
            persist: false,
            allow_held_key: false
          });
        }

        // End trial after duration if specified
        if (trial.trial_duration !== null) {
          this.jsPsych.pluginAPI.setTimeout(() => {
            end_trial(null);
          }, trial.trial_duration);
        } else if (trial.choices === "NO_KEYS") {
          // If no keys and no duration, end immediately
          end_trial(null);
        }
      });
    }

    async handleStop(display_element, trial, trial_data) {
      // Stop recording
      window.jsPsychEyeTrackingRecording = false;
      
      // Stop tracking
      this.tracker.stopTracking();
      
      trial_data.success = true;
      trial_data.message = "Tracking stopped";
      trial_data.total_samples = window.jsPsychEyeTrackingData.length;
      
      // Save all collected data to localStorage
      const experiment_data = {
        timestamp: new Date().toISOString(),
        samples: window.jsPsychEyeTrackingData
      };
      
      const storage_key = `jspsych_eyetracking_${Date.now()}`;
      localStorage.setItem(storage_key, JSON.stringify(experiment_data));
      trial_data.storage_key = storage_key;
      
      display_element.innerHTML = `
        <div style="text-align: center; padding: 50px;">
          <h2>Tracking Stopped</h2>
          <p>${trial.message || 'Data saved successfully'}</p>
          <p style="margin-top: 10px; color: #666;">Samples collected: ${trial_data.total_samples}</p>
        </div>
      `;
      
      // End trial after short delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      this.jsPsych.finishTrial(trial_data);
    }

    async handleDisconnect(display_element, trial, trial_data) {
      // Disconnect tracker
      this.tracker.disconnect();
      
      trial_data.success = true;
      trial_data.message = "Disconnected";
      
      display_element.innerHTML = `
        <div style="text-align: center; padding: 50px;">
          <h2>Eye Tracker Disconnected</h2>
          <p>${trial.message || 'Thank you for participating'}</p>
        </div>
      `;
      
      // End trial after short delay  
      await new Promise(resolve => setTimeout(resolve, 1500));
      this.jsPsych.finishTrial(trial_data);
    }

    // Optional: Add simulation support for testing
    simulate(trial, simulation_mode, simulation_options, load_callback) {
      if (simulation_mode == "data-only") {
        load_callback();
        this.simulate_data_only(trial, simulation_options);
      }
      if (simulation_mode == "visual") {
        this.simulate_visual(trial, simulation_options, load_callback);
      }
    }

    simulate_data_only(trial, simulation_options) {
      const data = this.create_simulation_data(trial, simulation_options);
      this.jsPsych.finishTrial(data);
    }

    simulate_visual(trial, simulation_options, load_callback) {
      const data = this.create_simulation_data(trial, simulation_options);
      const display_element = this.jsPsych.getDisplayElement();
      
      this.trial(display_element, trial, () => {
        load_callback();
        // Simulate responses
        if (trial.mode === 'start' && trial.choices !== "NO_KEYS") {
          this.jsPsych.pluginAPI.setTimeout(() => {
            this.jsPsych.pluginAPI.keyDown(" ");
            this.jsPsych.pluginAPI.keyUp(" ");
          }, data.rt);
        } else {
          this.jsPsych.pluginAPI.setTimeout(() => {
            this.jsPsych.finishTrial(data);
          }, data.rt || 1000);
        }
      });
    }

    create_simulation_data(trial, simulation_options) {
      const data = {
        mode: trial.mode,
        success: true,
        message: "Simulated " + trial.mode,
        rt: this.jsPsych.randomization.sampleExGaussian(500, 50, 1 / 150, true)
      };

      if (trial.mode === 'calibrate') {
        data.calibration_accuracy = 0.85 + Math.random() * 0.1;
      }

      if (trial.mode === 'start') {
        if (trial.choices !== "NO_KEYS") {
          data.response = " ";
        }
        if (trial.save_trial_data) {
          // Generate simulated gaze data
          const num_samples = Math.floor(data.rt / 16.67); // ~60Hz
          data.gaze_data = Array.from({length: num_samples}, (_, i) => ({
            timestamp: i * 16.67,
            x: 0.5 + Math.sin(i * 0.1) * 0.2,
            y: 0.5 + Math.cos(i * 0.1) * 0.2,
            confidence: 0.9 + Math.random() * 0.1
          }));
          data.total_samples = num_samples;
        }
      }

      if (trial.mode === 'stop') {
        data.total_samples = window.jsPsychEyeTrackingData ? window.jsPsychEyeTrackingData.length : 0;
        data.storage_key = `jspsych_eyetracking_simulated_${Date.now()}`;
      }

      return data;
    }
  }

  // Set static info property
  // Note: ParameterType values are defined by jsPsych, so we reference them via the global object
  const ParameterType = window.jsPsych ? window.jsPsych.ParameterType : {
    BOOL: "BOOL",
    STRING: "STRING", 
    INT: "INT",
    FLOAT: "FLOAT",
    FUNCTION: "FUNCTION",
    KEY: "KEY",
    KEYS: "KEYS",
    SELECT: "SELECT",
    HTML_STRING: "HTML_STRING",
    IMAGE: "IMAGE",
    AUDIO: "AUDIO",
    VIDEO: "VIDEO",
    OBJECT: "OBJECT",
    COMPLEX: "COMPLEX",
    TIMELINE: "TIMELINE"
  };
  
  EyeTrackingPlugin.info = {
    name: "eye-tracking",
    version: "1.0.0",
    parameters: {
      /** The mode of operation: 'connect', 'calibrate', 'start', 'stop', 'disconnect' */
      mode: {
        type: ParameterType.STRING,
        default: "calibrate",
      },
      /** WebSocket URL for eye tracker */
      ws_url: {
        type: ParameterType.STRING,
        default: "ws://127.0.0.1:9000",
      },
      /** Whether to show camera view during tracking */
      show_camera: {
        type: ParameterType.BOOL,
        default: false,
      },
      /** Whether to show gaze visualization during tracking */
      show_gaze: {
        type: ParameterType.BOOL,
        default: true,
      },
      /** Sample rate for data recording (Hz) */
      sample_rate: {
        type: ParameterType.INT,
        default: 60,
      },
      /** Stimulus content to display during tracking */
      stimulus: {
        type: ParameterType.HTML_STRING,
        default: null,
      },
      /** Duration to show stimulus (null = until response) */
      trial_duration: {
        type: ParameterType.INT,
        default: null,
      },
      /** Key(s) that will end the trial */
      choices: {
        type: ParameterType.KEYS,
        default: "NO_KEYS",
      },
      /** Message to show during connection/calibration */
      message: {
        type: ParameterType.STRING,
        default: null,
      },
      /** Whether to save gaze data to trial data */
      save_trial_data: {
        type: ParameterType.BOOL,
        default: true,
      }
    },
    data: {
      /** The mode of operation for this trial */
      mode: {
        type: ParameterType.STRING,
      },
      /** Whether the operation was successful */
      success: {
        type: ParameterType.BOOL,
      },
      /** Status message */
      message: {
        type: ParameterType.STRING,
      },
      /** Response time in milliseconds */
      rt: {
        type: ParameterType.INT,
      },
      /** Key pressed (if applicable) */
      response: {
        type: ParameterType.STRING,
      },
      /** Total number of gaze samples collected */
      total_samples: {
        type: ParameterType.INT,
      },
      /** Calibration accuracy (if mode is calibrate) */
      calibration_accuracy: {
        type: ParameterType.FLOAT,
      },
      /** Gaze data samples (if save_trial_data is true) */
      gaze_data: {
        type: ParameterType.COMPLEX,
      },
      /** Storage key for saved data */
      storage_key: {
        type: ParameterType.STRING,
      }
    }
  };

  EyeTrackingPlugin.info = info;
  return EyeTrackingPlugin;

})();