/**
 * Simplified Calibration Page Script
 * Uses the SDK's built-in CalibrationUI instead of duplicating code
 * SDK is loaded from CDN: @iris-point/eye-tracking-core
 */

let sdkInstance = null;
let isCalibrating = false;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('start-btn');
  const status = document.getElementById('status');
  const instructions = document.getElementById('instructions');
  
  // Disable start button until SDK loads
  if (startBtn) {
    startBtn.disabled = true;
    startBtn.textContent = 'Loading SDK...';
  }
  
  // Load SDK from CDN
  loadSDK();
});

// Load SDK from CDN with fallback
function loadSDK() {
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/@iris-point/eye-tracking-core@latest/dist/index.umd.js';
  
  script.onload = function() {
    console.log('Eye tracking SDK loaded from CDN');
    initializeSDK();
  };
  
  script.onerror = function() {
    console.error('Failed to load SDK from CDN, trying local fallback');
    // Try local fallback
    const fallbackScript = document.createElement('script');
    fallbackScript.src = chrome.runtime.getURL('lib/eye-tracker-core.js');
    fallbackScript.onload = function() {
      console.log('Eye tracking SDK loaded from local fallback');
      initializeSDK();
    };
    fallbackScript.onerror = function() {
      console.error('Failed to load SDK');
      updateStatus('Failed to load eye tracking SDK', 'error');
    };
    document.head.appendChild(fallbackScript);
  };
  
  document.head.appendChild(script);
}

// Initialize SDK after loading
async function initializeSDK() {
  try {
    // Check if SDK is available (could be window.EyeTrackingSDK or window.CogixEyeTracking)
    const SDK = window.EyeTrackingSDK || window.CogixEyeTracking || window.EyeTracking;
    
    if (!SDK) {
      throw new Error('SDK not found in global scope');
    }
    
    updateStatus('SDK loaded, initializing...', 'info');
    
    // Create SDK instance with WebGazer as fallback if no hardware
    sdkInstance = new SDK.EyeTrackingSDK({
      provider: 'auto', // Will try HH first, then WebGazer
      wsUrl: 'ws://localhost:8765',
      fallback: true,
      bufferSize: 1000,
      emitInterval: 100
    });
    
    // Try to connect
    await sdkInstance.connect();
    
    updateStatus('Connected to eye tracker', 'success');
    enableStartButton();
    
  } catch (error) {
    console.error('Failed to initialize SDK:', error);
    
    // Try WebGazer fallback
    try {
      updateStatus('Hardware tracker not available, using webcam...', 'warning');
      
      sdkInstance = new (window.EyeTrackingSDK || window.CogixEyeTracking).EyeTrackingSDK({
        provider: 'webgazer',
        bufferSize: 1000,
        emitInterval: 100
      });
      
      await sdkInstance.connect();
      updateStatus('Connected to webcam tracker', 'success');
      enableStartButton();
      
    } catch (fallbackError) {
      console.error('Failed to initialize webcam fallback:', fallbackError);
      updateStatus('No eye tracking available', 'error');
    }
  }
}

// Enable start button
function enableStartButton() {
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.disabled = false;
    startBtn.textContent = 'Start Calibration';
    startBtn.addEventListener('click', startCalibration);
  }
}

// Start calibration using SDK's built-in UI
async function startCalibration() {
  if (!sdkInstance) {
    updateStatus('SDK not initialized', 'error');
    return;
  }
  
  try {
    isCalibrating = true;
    updateStatus('Starting calibration...', 'info');
    
    // Hide instructions
    const instructions = document.getElementById('instructions');
    if (instructions) {
      instructions.style.display = 'none';
    }
    
    // Use SDK's calibration method
    // The SDK will handle the UI, fullscreen, point display, etc.
    const result = await sdkInstance.calibrate({
      pointCount: 5,  // 5-point calibration
      pointDuration: 2000,  // 2 seconds per point
      autoProgress: false,  // Manual progression with spacebar
      showInstructions: true,
      theme: 'dark'
    });
    
    if (result.success) {
      updateStatus('Calibration successful!', 'success');
      
      // Send result to extension
      chrome.runtime.sendMessage({
        type: 'CALIBRATION_COMPLETE',
        result: {
          success: true,
          accuracy: result.accuracy,
          points: result.points,
          timestamp: Date.now()
        }
      });
      
      // Show completion message and close
      showCompletionMessage();
      
    } else {
      updateStatus('Calibration failed, please try again', 'error');
      isCalibrating = false;
    }
    
  } catch (error) {
    console.error('Calibration error:', error);
    updateStatus('Calibration error: ' + error.message, 'error');
    isCalibrating = false;
  }
}

// Show completion message
function showCompletionMessage() {
  const completion = document.getElementById('completion-message');
  if (completion) {
    completion.style.display = 'block';
    completion.classList.add('active');
  }
  
  // Auto-close after 3 seconds
  let countdown = 3;
  const countdownEl = document.getElementById('countdown');
  
  const interval = setInterval(() => {
    countdown--;
    if (countdownEl) {
      countdownEl.textContent = countdown;
    }
    
    if (countdown === 0) {
      clearInterval(interval);
      window.close();
    }
  }, 1000);
}

// Update status message
function updateStatus(message, type = 'info') {
  const status = document.getElementById('status');
  if (status) {
    status.textContent = message;
    status.className = 'status ' + type;
  }
  console.log(`[${type.toUpperCase()}] ${message}`);
}

// Handle ESC key to cancel
document.addEventListener('keydown', (event) => {
  if (event.code === 'Escape' && isCalibrating) {
    if (sdkInstance) {
      sdkInstance.cancelCalibration();
    }
    
    // Send cancellation to extension
    chrome.runtime.sendMessage({
      type: 'CALIBRATION_CANCELLED'
    });
    
    // Close window
    setTimeout(() => {
      window.close();
    }, 100);
  }
});

// Listen for messages from SDK (if it posts messages)
window.addEventListener('message', (event) => {
  if (event.data.type === 'CALIBRATION_PROGRESS') {
    const progress = document.getElementById('progress-fill');
    if (progress) {
      progress.style.width = `${event.data.progress}%`;
    }
  }
});