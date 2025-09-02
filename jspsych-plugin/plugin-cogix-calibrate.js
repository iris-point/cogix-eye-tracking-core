/**
 * jspsych-cogix-calibrate
 * 
 * Plugin for calibrating the Cogix eye tracker
 * 
 * @author Cogix Team
 * @version 1.0.0
 */

var jsPsychCogixCalibrate = (function () {
  "use strict";

  class CogixCalibratePlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    trial(display_element, trial) {
      // Get the extension
      const extension = this.jsPsych.extensions['cogix-eye-tracking'];
      
      if (!extension || !extension.initialized) {
        console.error('Cogix eye tracker not initialized');
        this.jsPsych.finishTrial({
          success: false,
          error: 'Eye tracker not initialized'
        });
        return;
      }

      const startTime = performance.now();
      
      // Default calibration points (5-point calibration)
      const defaultPoints = [
        { x: 50, y: 50 },   // Center
        { x: 10, y: 10 },   // Top-left
        { x: 90, y: 10 },   // Top-right
        { x: 10, y: 90 },   // Bottom-left
        { x: 90, y: 90 }    // Bottom-right
      ];
      
      const calibrationPoints = trial.calibration_points || defaultPoints;
      
      // Show instructions if provided
      if (trial.instructions) {
        display_element.innerHTML = `
          <div id="calibration-container" style="text-align: center; padding: 40px;">
            <div>${trial.instructions}</div>
            <button id="start-calibration" class="jspsych-btn" style="margin-top: 30px; padding: 15px 30px; font-size: 16px;">
              ${trial.button_text}
            </button>
          </div>
        `;
        
        document.getElementById('start-calibration').addEventListener('click', () => {
          this.startCalibration(display_element, trial, extension, calibrationPoints, startTime);
        });
      } else {
        // Start calibration immediately
        this.startCalibration(display_element, trial, extension, calibrationPoints, startTime);
      }
    }

    async startCalibration(display_element, trial, extension, points, startTime) {
      // Clear display
      display_element.innerHTML = '';
      
      // Use extension's calibration method with custom options
      const calibrationOptions = {
        pointDuration: trial.point_duration,
        pointSize: trial.point_size,
        pointColor: trial.point_color,
        backgroundColor: trial.background_color,
        showInstructions: trial.show_instructions_during,
        autoFullscreen: trial.auto_fullscreen
      };
      
      try {
        const result = await extension.calibrate(calibrationOptions);
        
        // Show success message
        display_element.innerHTML = `
          <div style="text-align: center; padding: 40px;">
            <h2 style="color: green;">✓ Calibration Successful!</h2>
            <p>Accuracy: ${(result.accuracy * 100).toFixed(1)}%</p>
            ${trial.show_feedback ? `
              <div style="margin: 20px auto; max-width: 500px;">
                <p>The eye tracker has been calibrated to your eyes.</p>
                <p>Please try to keep your head in the same position during the experiment.</p>
              </div>
            ` : ''}
            <button id="continue-button" class="jspsych-btn" style="margin-top: 20px; padding: 15px 30px;">
              Continue
            </button>
          </div>
        `;
        
        document.getElementById('continue-button').addEventListener('click', () => {
          this.endTrial(true, performance.now() - startTime, result.accuracy);
        });
        
        // Auto-advance if specified
        if (trial.auto_advance) {
          setTimeout(() => {
            this.endTrial(true, performance.now() - startTime, result.accuracy);
          }, trial.advance_delay);
        }
        
        // Start tracking after calibration if specified
        if (trial.start_tracking_after) {
          await extension.startTracking();
        }
        
      } catch (error) {
        console.error('Calibration failed:', error);
        
        // Show error message
        display_element.innerHTML = `
          <div style="text-align: center; padding: 40px;">
            <h2 style="color: red;">✗ Calibration Failed</h2>
            <p>${error.message}</p>
            ${trial.allow_recalibrate ? `
              <button id="retry-button" class="jspsych-btn" style="margin: 20px; padding: 15px 30px;">
                Try Again
              </button>
            ` : ''}
            ${trial.allow_skip ? `
              <button id="skip-button" class="jspsych-btn" style="margin: 20px; padding: 15px 30px;">
                Skip Calibration
              </button>
            ` : ''}
          </div>
        `;
        
        if (trial.allow_recalibrate) {
          document.getElementById('retry-button').addEventListener('click', () => {
            this.startCalibration(display_element, trial, extension, points, startTime);
          });
        }
        
        if (trial.allow_skip) {
          document.getElementById('skip-button').addEventListener('click', () => {
            this.endTrial(false, performance.now() - startTime, 0, 'skipped');
          });
        }
      }
    }

    endTrial(success, rt, accuracy = null, status = null) {
      const trial_data = {
        success: success,
        rt: rt
      };
      
      if (accuracy !== null) {
        trial_data.calibration_accuracy = accuracy;
      }
      
      if (status) {
        trial_data.status = status;
      }
      
      // Clear display
      this.jsPsych.getDisplayElement().innerHTML = '';
      
      // End trial
      this.jsPsych.finishTrial(trial_data);
    }
  }

  CogixCalibratePlugin.info = {
    name: "cogix-calibrate",
    version: "1.0.0",
    parameters: {
      /** Instructions to show before calibration */
      instructions: {
        type: 'HTML_STRING',
        default: `
          <h2>Eye Tracker Calibration</h2>
          <p>We need to calibrate the eye tracker to accurately track your gaze.</p>
          <p>You will see several dots appear on the screen.</p>
          <p><strong>Please look at each dot until it disappears.</strong></p>
          <p>Try to keep your head still during calibration.</p>
        `
      },
      /** Button text to start calibration */
      button_text: {
        type: 'STRING',
        default: "Start Calibration"
      },
      /** Calibration points as percentage coordinates */
      calibration_points: {
        type: 'COMPLEX',
        default: null
      },
      /** Duration to show each point (ms) */
      point_duration: {
        type: 'INT',
        default: 3000
      },
      /** Size of calibration points */
      point_size: {
        type: 'INT',
        default: 20
      },
      /** Color of calibration points */
      point_color: {
        type: 'STRING',
        default: "#4CAF50"
      },
      /** Background color during calibration */
      background_color: {
        type: 'STRING',
        default: "rgba(0, 0, 0, 0.95)"
      },
      /** Show instructions during calibration */
      show_instructions_during: {
        type: 'BOOL',
        default: true
      },
      /** Whether to enter fullscreen for calibration */
      auto_fullscreen: {
        type: 'BOOL',
        default: true
      },
      /** Whether to show feedback after calibration */
      show_feedback: {
        type: 'BOOL',
        default: true
      },
      /** Whether to auto-advance after successful calibration */
      auto_advance: {
        type: 'BOOL',
        default: false
      },
      /** Delay before auto-advancing (ms) */
      advance_delay: {
        type: 'INT',
        default: 2000
      },
      /** Whether to allow recalibration on failure */
      allow_recalibrate: {
        type: 'BOOL',
        default: true
      },
      /** Whether to allow skipping calibration */
      allow_skip: {
        type: 'BOOL',
        default: false
      },
      /** Whether to start tracking after calibration */
      start_tracking_after: {
        type: 'BOOL',
        default: true
      }
    },
    data: {
      /** Whether calibration was successful */
      success: {
        type: 'BOOL'
      },
      /** Response time */
      rt: {
        type: 'INT'
      },
      /** Calibration accuracy (0-1) */
      calibration_accuracy: {
        type: 'FLOAT'
      },
      /** Status (e.g., 'skipped') */
      status: {
        type: 'STRING'
      }
    }
  };

  return CogixCalibratePlugin;
})();