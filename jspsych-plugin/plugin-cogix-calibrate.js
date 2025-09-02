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
      
      // Language support
      this.translations = {
        en: {
          notInitialized: 'Eye tracker not initialized',
          calibrationSuccess: '✓ Calibration Successful!',
          accuracy: 'Accuracy: {percent}%',
          calibrationComplete: 'The eye tracker has been calibrated to your eyes.',
          keepPosition: 'Please try to keep your head in the same position during the experiment.',
          continueButton: 'Continue',
          recalibrateButton: 'Recalibrate',
          calibrationFailed: '✗ Calibration Failed',
          tryAgain: 'Please try again',
          retryButton: 'Retry Calibration',
          skipButton: 'Skip Calibration',
          defaultButtonText: 'Start Calibration'
        },
        zh: {
          notInitialized: '眼动仪未初始化',
          calibrationSuccess: '✓ 校准成功！',
          accuracy: '精度：{percent}%',
          calibrationComplete: '眼动仪已根据您的眼睛完成校准。',
          keepPosition: '请在实验过程中保持头部位置不变。',
          continueButton: '继续',
          recalibrateButton: '重新校准',
          calibrationFailed: '✗ 校准失败',
          tryAgain: '请重试',
          retryButton: '重新校准',
          skipButton: '跳过校准',
          defaultButtonText: '开始校准'
        }
      };
    }
    
    getTranslation(key, lang, replacements = {}) {
      const language = lang || 'zh';
      let text = this.translations[language]?.[key] || this.translations.en[key] || key;
      
      // Replace placeholders
      Object.keys(replacements).forEach(placeholder => {
        text = text.replace(`{${placeholder}}`, replacements[placeholder]);
      });
      
      return text;
    }

    trial(display_element, trial) {
      // Get the extension
      const extension = this.jsPsych.extensions['cogix-eye-tracking'];
      const lang = trial.language || 'en';
      
      if (!extension || !extension.initialized) {
        const errorMsg = this.getTranslation('notInitialized', lang);
        console.error(errorMsg);
        this.jsPsych.finishTrial({
          success: false,
          error: errorMsg
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
        const buttonText = trial.button_text || this.getTranslation('defaultButtonText', lang);
        display_element.innerHTML = `
          <div id="calibration-container" style="text-align: center; padding: 40px;">
            <div>${trial.instructions}</div>
            <button id="start-calibration" class="jspsych-btn" style="margin-top: 30px; padding: 15px 30px; font-size: 16px;">
              ${buttonText}
            </button>
          </div>
        `;
        
        document.getElementById('start-calibration').addEventListener('click', () => {
          this.startCalibration(display_element, trial, extension, calibrationPoints, startTime, lang);
        });
      } else {
        // Start calibration immediately
        this.startCalibration(display_element, trial, extension, calibrationPoints, startTime, lang);
      }
    }

    async startCalibration(display_element, trial, extension, points, startTime, lang) {
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
            <h2 style="color: green;">${this.getTranslation('calibrationSuccess', lang)}</h2>
            <p>${this.getTranslation('accuracy', lang, { percent: (result.accuracy * 100).toFixed(1) })}</p>
            ${trial.show_feedback ? `
              <div style="margin: 20px auto; max-width: 500px;">
                <p>${this.getTranslation('calibrationComplete', lang)}</p>
                <p>${this.getTranslation('keepPosition', lang)}</p>
              </div>
            ` : ''}
            <button id="continue-button" class="jspsych-btn" style="margin-top: 20px; padding: 15px 30px;">
              ${this.getTranslation('continueButton', lang)}
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
            <h2 style="color: red;">${this.getTranslation('calibrationFailed', lang)}</h2>
            <p>${error.message}</p>
            ${trial.allow_recalibrate ? `
              <button id="retry-button" class="jspsych-btn" style="margin: 20px; padding: 15px 30px;">
                ${this.getTranslation('retryButton', lang)}
              </button>
            ` : ''}
            ${trial.allow_skip ? `
              <button id="skip-button" class="jspsych-btn" style="margin: 20px; padding: 15px 30px;">
                ${this.getTranslation('skipButton', lang)}
              </button>
            ` : ''}
          </div>
        `;
        
        if (trial.allow_recalibrate) {
          document.getElementById('retry-button').addEventListener('click', () => {
            this.startCalibration(display_element, trial, extension, points, startTime, lang);
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
        default: null
      },
      /** Language for UI text ('en' or 'zh') */
      language: {
        type: 'STRING',
        default: 'zh'
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