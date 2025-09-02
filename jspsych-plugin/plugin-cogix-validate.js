/**
 * jspsych-cogix-validate
 * 
 * Plugin for validating the accuracy of Cogix eye tracker calibration
 * 
 * @author Cogix Team
 * @version 1.0.0
 */

var jsPsychCogixValidate = (function () {
  "use strict";

  class CogixValidatePlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    trial(display_element, trial) {
      // Get the extension
      const extension = this.jsPsych.extensions.cogix_eye_tracking;
      
      if (!extension || !extension.initialized) {
        console.error('Cogix eye tracker not initialized');
        this.jsPsych.finishTrial({
          success: false,
          error: 'Eye tracker not initialized'
        });
        return;
      }

      if (!extension.calibrated) {
        console.error('Eye tracker not calibrated');
        this.jsPsych.finishTrial({
          success: false,
          error: 'Eye tracker not calibrated'
        });
        return;
      }

      const startTime = performance.now();
      
      // Default validation points (9-point grid)
      const defaultPoints = [
        { x: 50, y: 50 },   // Center
        { x: 10, y: 10 },   // Top-left
        { x: 50, y: 10 },   // Top-center
        { x: 90, y: 10 },   // Top-right
        { x: 10, y: 50 },   // Middle-left
        { x: 90, y: 50 },   // Middle-right
        { x: 10, y: 90 },   // Bottom-left
        { x: 50, y: 90 },   // Bottom-center
        { x: 90, y: 90 }    // Bottom-right
      ];
      
      const validationPoints = trial.validation_points || defaultPoints;
      let currentPoint = 0;
      let validationData = [];
      let pointStartTime;
      let collectingData = false;
      
      // Show instructions if provided
      if (trial.instructions) {
        display_element.innerHTML = `
          <div id="validation-container" style="text-align: center; padding: 40px;">
            <div>${trial.instructions}</div>
            <button id="start-validation" class="jspsych-btn" style="margin-top: 30px; padding: 15px 30px; font-size: 16px;">
              ${trial.button_text}
            </button>
          </div>
        `;
        
        document.getElementById('start-validation').addEventListener('click', () => {
          this.startValidation(display_element, trial, extension, validationPoints, startTime);
        });
      } else {
        // Start validation immediately
        this.startValidation(display_element, trial, extension, validationPoints, startTime);
      }
    }

    async startValidation(display_element, trial, extension, points, startTime) {
      // Clear display and set up for validation
      display_element.innerHTML = '';
      display_element.style.position = 'relative';
      display_element.style.width = '100vw';
      display_element.style.height = '100vh';
      display_element.style.overflow = 'hidden';
      
      if (trial.background_color) {
        display_element.style.backgroundColor = trial.background_color;
      }
      
      // Create validation point element
      const pointElement = document.createElement('div');
      pointElement.style.position = 'absolute';
      pointElement.style.width = trial.point_size + 'px';
      pointElement.style.height = trial.point_size + 'px';
      pointElement.style.borderRadius = '50%';
      pointElement.style.backgroundColor = trial.point_color;
      pointElement.style.transform = 'translate(-50%, -50%)';
      pointElement.style.transition = `all ${trial.point_move_time}ms ease-in-out`;
      pointElement.style.display = 'none';
      display_element.appendChild(pointElement);
      
      // Create feedback element if needed
      let feedbackElement;
      if (trial.show_feedback_during) {
        feedbackElement = document.createElement('div');
        feedbackElement.style.position = 'absolute';
        feedbackElement.style.top = '20px';
        feedbackElement.style.left = '50%';
        feedbackElement.style.transform = 'translateX(-50%)';
        feedbackElement.style.padding = '10px 20px';
        feedbackElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        feedbackElement.style.color = 'white';
        feedbackElement.style.borderRadius = '8px';
        feedbackElement.style.fontSize = '14px';
        display_element.appendChild(feedbackElement);
      }
      
      // Validation data collection
      const validationData = [];
      let currentPoint = 0;
      
      // Function to collect data for current point
      const collectPointData = () => {
        return new Promise((resolve) => {
          const point = points[currentPoint];
          const targetX = (point.x / 100) * window.innerWidth;
          const targetY = (point.y / 100) * window.innerHeight;
          
          // Position point
          pointElement.style.left = targetX + 'px';
          pointElement.style.top = targetY + 'px';
          pointElement.style.display = 'block';
          
          // Collect gaze samples
          const samples = [];
          const startTime = performance.now();
          
          // Start collecting after settle time
          setTimeout(() => {
            const collectInterval = setInterval(() => {
              const currentGaze = extension.getCurrentGaze();
              if (currentGaze) {
                samples.push({
                  x: currentGaze.x * window.innerWidth,
                  y: currentGaze.y * window.innerHeight,
                  timestamp: performance.now()
                });
              }
            }, 16); // ~60Hz sampling
            
            // Stop collecting after duration
            setTimeout(() => {
              clearInterval(collectInterval);
              
              // Calculate accuracy for this point
              const accuracy = this.calculatePointAccuracy(samples, targetX, targetY);
              
              validationData.push({
                point: point,
                target: { x: targetX, y: targetY },
                samples: samples,
                accuracy: accuracy,
                sample_count: samples.length
              });
              
              // Update feedback if shown
              if (feedbackElement) {
                const avgAccuracy = validationData.reduce((sum, d) => sum + d.accuracy, 0) / validationData.length;
                feedbackElement.textContent = `Point ${currentPoint + 1}/${points.length} - Accuracy: ${(avgAccuracy * 100).toFixed(1)}%`;
              }
              
              resolve();
            }, trial.point_duration - trial.point_settle_time);
          }, trial.point_settle_time);
        });
      };
      
      // Run validation for all points
      for (currentPoint = 0; currentPoint < points.length; currentPoint++) {
        await collectPointData();
        
        // Brief pause between points
        if (currentPoint < points.length - 1) {
          pointElement.style.display = 'none';
          await new Promise(resolve => setTimeout(resolve, trial.inter_point_delay));
        }
      }
      
      // Calculate overall accuracy
      const overallAccuracy = this.calculateOverallAccuracy(validationData);
      
      // Show results
      this.showResults(display_element, trial, validationData, overallAccuracy, performance.now() - startTime);
    }

    calculatePointAccuracy(samples, targetX, targetY) {
      if (samples.length === 0) return 0;
      
      // Calculate average distance from target
      const distances = samples.map(sample => {
        const dx = sample.x - targetX;
        const dy = sample.y - targetY;
        return Math.sqrt(dx * dx + dy * dy);
      });
      
      const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
      
      // Convert to accuracy (0-1 scale)
      // Consider < 50px as perfect, > 200px as 0 accuracy
      const maxAcceptableDistance = 200;
      const accuracy = Math.max(0, 1 - (avgDistance / maxAcceptableDistance));
      
      return accuracy;
    }

    calculateOverallAccuracy(validationData) {
      const totalAccuracy = validationData.reduce((sum, data) => sum + data.accuracy, 0);
      return totalAccuracy / validationData.length;
    }

    showResults(display_element, trial, validationData, overallAccuracy, rt) {
      const passed = overallAccuracy >= trial.accuracy_threshold;
      
      let html = `
        <div style="text-align: center; padding: 40px; background: white;">
          <h2 style="color: ${passed ? 'green' : 'orange'};">
            ${passed ? '✓ Validation Passed' : '⚠ Validation Warning'}
          </h2>
          <p style="font-size: 24px; margin: 20px 0;">
            Overall Accuracy: ${(overallAccuracy * 100).toFixed(1)}%
          </p>
      `;
      
      if (trial.show_detailed_results) {
        html += `
          <div style="margin: 30px auto; max-width: 600px;">
            <h3>Point-by-Point Results:</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <thead>
                <tr style="background: #f0f0f0;">
                  <th style="padding: 10px; border: 1px solid #ddd;">Point</th>
                  <th style="padding: 10px; border: 1px solid #ddd;">Position</th>
                  <th style="padding: 10px; border: 1px solid #ddd;">Samples</th>
                  <th style="padding: 10px; border: 1px solid #ddd;">Accuracy</th>
                </tr>
              </thead>
              <tbody>
        `;
        
        validationData.forEach((data, i) => {
          html += `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${i + 1}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${data.point.x}%, ${data.point.y}%</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${data.sample_count}</td>
              <td style="padding: 8px; border: 1px solid #ddd; color: ${data.accuracy > 0.7 ? 'green' : data.accuracy > 0.5 ? 'orange' : 'red'};">
                ${(data.accuracy * 100).toFixed(1)}%
              </td>
            </tr>
          `;
        });
        
        html += `
              </tbody>
            </table>
          </div>
        `;
      }
      
      if (!passed && trial.allow_recalibrate) {
        html += `
          <p style="margin: 20px 0; color: #666;">
            The accuracy is below the threshold of ${(trial.accuracy_threshold * 100).toFixed(0)}%.
            You may want to recalibrate for better results.
          </p>
          <button id="recalibrate-button" class="jspsych-btn" style="margin: 10px; padding: 15px 30px;">
            Recalibrate
          </button>
        `;
      }
      
      html += `
        <button id="continue-button" class="jspsych-btn" style="margin: 10px; padding: 15px 30px; background: ${passed ? '#4CAF50' : '#2196F3'};">
          ${passed ? 'Continue' : trial.allow_continue_on_fail ? 'Continue Anyway' : 'Must Recalibrate'}
        </button>
      </div>
      `;
      
      display_element.innerHTML = html;
      
      // Handle button clicks
      if (!passed && trial.allow_recalibrate) {
        document.getElementById('recalibrate-button').addEventListener('click', () => {
          this.endTrial(false, rt, overallAccuracy, validationData, 'recalibrate');
        });
      }
      
      const continueButton = document.getElementById('continue-button');
      if (passed || trial.allow_continue_on_fail) {
        continueButton.addEventListener('click', () => {
          this.endTrial(passed, rt, overallAccuracy, validationData, passed ? 'passed' : 'failed');
        });
      } else {
        continueButton.disabled = true;
      }
      
      // Auto-advance if specified
      if (trial.auto_advance && passed) {
        setTimeout(() => {
          this.endTrial(true, rt, overallAccuracy, validationData, 'passed');
        }, trial.advance_delay);
      }
    }

    endTrial(success, rt, accuracy, validationData, status) {
      const trial_data = {
        success: success,
        rt: rt,
        overall_accuracy: accuracy,
        status: status
      };
      
      if (validationData) {
        trial_data.validation_data = validationData;
        trial_data.point_accuracies = validationData.map(d => d.accuracy);
      }
      
      // Clear display
      this.jsPsych.getDisplayElement().innerHTML = '';
      
      // End trial
      this.jsPsych.finishTrial(trial_data);
    }
  }

  CogixValidatePlugin.info = {
    name: "cogix-validate",
    version: "1.0.0",
    parameters: {
      /** Instructions to show before validation */
      instructions: {
        type: ParameterType.HTML_STRING,
        default: `
          <h2>Validation Test</h2>
          <p>We will now test the accuracy of the eye tracking calibration.</p>
          <p>Please look at each dot as it appears on the screen.</p>
          <p>Try to keep your head still and focus on the center of each dot.</p>
        `
      },
      /** Button text to start validation */
      button_text: {
        type: ParameterType.STRING,
        default: "Start Validation"
      },
      /** Validation points as percentage coordinates */
      validation_points: {
        type: ParameterType.COMPLEX,
        default: null
      },
      /** Duration to show each point (ms) */
      point_duration: {
        type: ParameterType.INT,
        default: 2000
      },
      /** Time to wait before collecting data (ms) */
      point_settle_time: {
        type: ParameterType.INT,
        default: 500
      },
      /** Time for point to move to new position (ms) */
      point_move_time: {
        type: ParameterType.INT,
        default: 500
      },
      /** Delay between points (ms) */
      inter_point_delay: {
        type: ParameterType.INT,
        default: 200
      },
      /** Size of validation points */
      point_size: {
        type: ParameterType.INT,
        default: 20
      },
      /** Color of validation points */
      point_color: {
        type: ParameterType.STRING,
        default: "#FF5722"
      },
      /** Background color during validation */
      background_color: {
        type: ParameterType.STRING,
        default: "rgba(250, 250, 250, 1)"
      },
      /** Show accuracy feedback during validation */
      show_feedback_during: {
        type: ParameterType.BOOL,
        default: false
      },
      /** Show detailed results after validation */
      show_detailed_results: {
        type: ParameterType.BOOL,
        default: true
      },
      /** Minimum accuracy threshold to pass (0-1) */
      accuracy_threshold: {
        type: ParameterType.FLOAT,
        default: 0.7
      },
      /** Whether to auto-advance after successful validation */
      auto_advance: {
        type: ParameterType.BOOL,
        default: false
      },
      /** Delay before auto-advancing (ms) */
      advance_delay: {
        type: ParameterType.INT,
        default: 3000
      },
      /** Whether to allow recalibration on failure */
      allow_recalibrate: {
        type: ParameterType.BOOL,
        default: true
      },
      /** Whether to allow continuing on validation failure */
      allow_continue_on_fail: {
        type: ParameterType.BOOL,
        default: false
      }
    },
    data: {
      /** Whether validation was successful */
      success: {
        type: ParameterType.BOOL
      },
      /** Response time */
      rt: {
        type: ParameterType.INT
      },
      /** Overall accuracy (0-1) */
      overall_accuracy: {
        type: ParameterType.FLOAT
      },
      /** Status (passed/failed/recalibrate) */
      status: {
        type: ParameterType.STRING
      },
      /** Detailed validation data for each point */
      validation_data: {
        type: ParameterType.COMPLEX
      },
      /** Array of accuracies for each point */
      point_accuracies: {
        type: ParameterType.COMPLEX
      }
    }
  };

  return CogixValidatePlugin;
})();