/**
 * jspsych-cogix-init-camera
 * 
 * Plugin for initializing the Cogix eye tracker camera and connection
 * 
 * @author Cogix Team
 * @version 1.0.0
 */

var jsPsychCogixInitCamera = (function () {
  "use strict";

  class CogixInitCameraPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    trial(display_element, trial) {
      // Get the extension
      const extension = this.jsPsych.extensions['cogix-eye-tracking'];
      
      if (!extension) {
        console.error('Cogix eye tracking extension not loaded');
        this.jsPsych.finishTrial({
          success: false,
          error: 'Extension not loaded'
        });
        return;
      }

      // Default parameters
      const show_instructions = trial.instructions !== null;
      const instructions = trial.instructions || `
        <h2>Camera Setup</h2>
        <p>We need to set up the eye tracking camera.</p>
        <p>Please ensure:</p>
        <ul style="text-align: left; display: inline-block;">
          <li>Your eye tracker is connected via USB</li>
          <li>The tracking software is running on port 9000</li>
          <li>You are seated comfortably at arm's length from the screen</li>
          <li>The room has adequate lighting</li>
        </ul>
        <p>Click the button below when you're ready to connect.</p>
      `;

      // Show instructions
      let html = `<div id="cogix-init-camera" style="max-width: 800px; margin: 0 auto; text-align: center;">`;
      
      if (show_instructions) {
        html += `<div class="cogix-instructions">${instructions}</div>`;
      }
      
      // Add camera preview container
      html += `<div id="camera-preview-container" style="margin: 20px auto; min-height: 200px; position: relative;"></div>`;
      
      html += `
        <button id="cogix-connect-button" class="jspsych-btn" style="margin: 20px; padding: 15px 30px; font-size: 16px;">
          ${trial.button_text}
        </button>
        <div id="connection-status" style="margin: 20px; font-size: 14px; color: #666;"></div>
      </div>`;
      
      display_element.innerHTML = html;

      const button = document.getElementById('cogix-connect-button');
      const status = document.getElementById('connection-status');
      const previewContainer = document.getElementById('camera-preview-container');
      const startTime = performance.now();
      
      let cameraOverlay = null;
      let statusPreview = null;
      
      // Handle button click
      button.addEventListener('click', async () => {
        button.disabled = true;
        button.textContent = 'Connecting...';
        status.textContent = 'Establishing connection with eye tracker...';
        
        try {
          // Connect to eye tracker
          await extension.connect();
          
          // Initialize camera and show preview if requested
          if (trial.init_camera) {
            status.textContent = 'Initializing camera...';
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (extension.tracker) {
              // Initialize the camera
              extension.tracker.initCamera();
              
              // Create camera overlay for real-time preview
              if (trial.show_camera_preview && previewContainer) {
                // Try to create camera overlay first (for real camera feed)
                cameraOverlay = extension.createCameraOverlay(previewContainer, {
                  position: 'center',
                  size: 'medium',
                  showControls: false
                });
                
                // If camera overlay not available, create status preview as fallback
                if (!cameraOverlay) {
                  statusPreview = extension.createStatusPreview(previewContainer);
                }
              }
            }
          }
          
          // Show success with camera status
          const lang = trial.language || 'zh';
          if (cameraOverlay || statusPreview) {
            status.innerHTML = lang === 'zh' ? 
              '<span style="color: green;">✓ 已连接！等待摄像头数据...</span>' :
              '<span style="color: green;">✓ Connected! Waiting for camera feed...</span>';
          } else {
            status.innerHTML = lang === 'zh' ?
              '<span style="color: green;">✓ 连接成功！</span>' :
              '<span style="color: green;">✓ Connected successfully!</span>';
          }
          
          // Function to enable continue button
          const enableContinue = () => {
            status.innerHTML = lang === 'zh' ?
              '<span style="color: green;">✓ 摄像头就绪！现在可以继续了。</span>' :
              '<span style="color: green;">✓ Camera ready! You can now continue.</span>';
            
            if (trial.auto_advance) {
              button.textContent = `Continuing in ${Math.floor(trial.advance_delay / 1000)} seconds...`;
              button.disabled = true;
              setTimeout(() => {
                this.endTrial(true, performance.now() - startTime, null, cameraOverlay, statusPreview);
              }, trial.advance_delay);
            } else {
              // Manual continue - this is now the default
              button.textContent = lang === 'zh' ? '继续' : 'Continue';
              button.disabled = false;
              button.style.background = '#4CAF50';
              button.addEventListener('click', () => {
                this.endTrial(true, performance.now() - startTime, null, cameraOverlay, statusPreview);
              }, { once: true });
            }
          };
          
          // Wait for first camera frame if camera preview is showing
          if (cameraOverlay || statusPreview) {
            button.textContent = lang === 'zh' ? '等待摄像头...' : 'Waiting for camera...';
            button.disabled = true;
            
            // Check for camera data
            let frameCheckInterval = setInterval(() => {
              // Check if we have received camera data
              if (extension.tracker && extension.tracker.cameraInitialized) {
                clearInterval(frameCheckInterval);
                enableContinue();
              } else if (extension.dataBuffer && extension.dataBuffer.length > 0) {
                // Alternative check: if we have any data in buffer
                clearInterval(frameCheckInterval);
                enableContinue();
              }
            }, 100);
            
            // Timeout after 5 seconds if no camera data
            setTimeout(() => {
              if (frameCheckInterval) {
                clearInterval(frameCheckInterval);
                status.innerHTML = lang === 'zh' ?
                  '<span style="color: orange;">⚠ 未检测到摄像头数据，但您可以继续。</span>' :
                  '<span style="color: orange;">⚠ Camera feed not detected, but you can continue.</span>';
                enableContinue();
              }
            }, 5000);
          } else {
            // No camera preview requested, enable continue immediately
            enableContinue();
          }
          
        } catch (error) {
          console.error('Connection failed:', error);
          status.innerHTML = `<span style="color: red;">✗ Connection failed: ${error.message}</span>`;
          button.textContent = 'Retry';
          button.disabled = false;
          
          if (trial.allow_retry) {
            button.addEventListener('click', () => {
              this.jsPsych.finishTrial({
                success: false,
                error: error.message,
                rt: performance.now() - startTime
              });
              this.jsPsych.repeatTrial();
            }, { once: true });
          } else {
            this.endTrial(false, performance.now() - startTime, error.message, cameraOverlay, statusPreview);
          }
        }
      });

      // Handle skip if allowed
      if (trial.allow_skip) {
        const skipButton = document.createElement('button');
        skipButton.textContent = 'Skip';
        skipButton.className = 'jspsych-btn';
        skipButton.style.margin = '10px';
        skipButton.addEventListener('click', () => {
          this.endTrial(false, performance.now() - startTime, 'Skipped by user', cameraOverlay, statusPreview);
        });
        document.getElementById('cogix-init-camera').appendChild(skipButton);
      }
    }

    endTrial(success, rt, error = null, cameraOverlay = null, statusPreview = null) {
      // Clean up camera overlay or status preview
      if (cameraOverlay) {
        cameraOverlay.destroy();
      }
      if (statusPreview && statusPreview.destroy) {
        statusPreview.destroy();
      }
      
      const trial_data = {
        success: success,
        rt: rt
      };
      
      if (error) {
        trial_data.error = error;
      }
      
      // Clear display
      this.jsPsych.getDisplayElement().innerHTML = '';
      
      // End trial
      this.jsPsych.finishTrial(trial_data);
    }
  }

  CogixInitCameraPlugin.info = {
    name: "cogix-init-camera",
    version: "1.0.0",
    parameters: {
      /** Instructions to show */
      instructions: {
        type: 'HTML_STRING',
        default: null
      },
      /** Text for the connect button */
      button_text: {
        type: 'STRING',
        default: "Connect Eye Tracker"
      },
      /** Whether to show camera preview */
      show_camera_preview: {
        type: 'BOOL',
        default: true
      },
      /** Whether to initialize camera after connection */
      init_camera: {
        type: 'BOOL',
        default: true
      },
      /** Whether to auto-advance after successful connection */
      auto_advance: {
        type: 'BOOL',
        default: false  // Changed to false so users must click to continue
      },
      /** Delay before auto-advancing (ms) */
      advance_delay: {
        type: 'INT',
        default: 3000  // Increased to 3 seconds if auto-advance is enabled
      },
      /** Whether to allow retry on failure */
      allow_retry: {
        type: 'BOOL',
        default: true
      },
      /** Whether to allow skipping */
      allow_skip: {
        type: 'BOOL',
        default: false
      },
      /** Language for UI text ('en' or 'zh') */
      language: {
        type: 'STRING',
        default: 'zh'
      }
    },
    data: {
      /** Whether connection was successful */
      success: {
        type: 'BOOL'
      },
      /** Response time */
      rt: {
        type: 'INT'
      },
      /** Error message if failed */
      error: {
        type: 'STRING'
      }
    }
  };

  return CogixInitCameraPlugin;
})();