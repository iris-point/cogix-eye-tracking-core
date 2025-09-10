// Content script for eye tracking integration
// This runs in the context of web pages

let eyeTracker = null;
let gazeOverlay = null;
let isTracking = false;
let gazeData = [];
let recordingStartTime = null;

// Inject the eye tracking core library into the page
function injectEyeTrackingCore() {
  // Check if we're on GitHub or a site with strict CSP
  const isStrictCSP = window.location.hostname.includes('github.com') || 
                      window.location.protocol === 'https:';
  
  if (isStrictCSP) {
    // Use local version for sites with strict CSP
    console.log('Detected strict CSP, using local SDK');
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('lib/eye-tracker-core.js');
    script.onload = function() {
      console.log('Eye tracking core SDK loaded from extension');
      initializeEyeTracker();
    };
    script.onerror = function() {
      console.error('Failed to load local eye tracking SDK');
    };
    (document.head || document.documentElement).appendChild(script);
  } else {
    // Try CDN first for other sites
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@iris-point/eye-tracking-core@latest/dist/cogix-eye-tracking-core.min.js';
    script.onload = function() {
      console.log('Eye tracking core SDK loaded from CDN');
      initializeEyeTracker();
    };
    script.onerror = function() {
      console.error('Failed to load eye tracking core SDK from CDN, trying local');
      // Fallback to local version
      const fallbackScript = document.createElement('script');
      fallbackScript.src = chrome.runtime.getURL('lib/eye-tracker-core.js');
      fallbackScript.onload = function() {
        console.log('Eye tracking core SDK loaded from local fallback');
        initializeEyeTracker();
      };
      (document.head || document.documentElement).appendChild(fallbackScript);
    };
    (document.head || document.documentElement).appendChild(script);
  }
}

// Initialize eye tracker with configuration
function initializeEyeTracker() {
  window.postMessage({ 
    type: 'INIT_EYE_TRACKER',
    config: {
      wsUrl: 'wss://127.0.0.1:8443',  // Use secure WebSocket
      bufferSize: 1000,
      emitInterval: 100,
      reconnectDelay: 1000,
      maxReconnectAttempts: 5
    }
  }, '*');
}

// Create gaze visualization overlay
function createGazeOverlay() {
  if (gazeOverlay) return;
  
  gazeOverlay = document.createElement('div');
  gazeOverlay.id = 'eye-tracking-overlay';
  gazeOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2147483647;
  `;
  
  const canvas = document.createElement('canvas');
  canvas.id = 'gaze-canvas';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.cssText = `
    width: 100%;
    height: 100%;
  `;
  
  gazeOverlay.appendChild(canvas);
  document.body.appendChild(gazeOverlay);
  
  // Handle window resize
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
  
  return canvas;
}

// Remove gaze overlay
function removeGazeOverlay() {
  if (gazeOverlay) {
    gazeOverlay.remove();
    gazeOverlay = null;
  }
}

// Draw gaze point on canvas
function drawGazePoint(canvas, x, y, confidence = 1) {
  const ctx = canvas.getContext('2d');
  
  // Clear previous point (fade effect)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw new point
  const radius = 20 * confidence;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `rgba(147, 51, 234, ${0.8 * confidence})`);
  gradient.addColorStop(0.5, `rgba(147, 51, 234, ${0.4 * confidence})`);
  gradient.addColorStop(1, 'rgba(147, 51, 234, 0)');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw center point
  ctx.fillStyle = `rgba(255, 255, 255, ${confidence})`;
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
}

// Handle messages from extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'START_TRACKING':
      startTracking();
      sendResponse({ success: true });
      break;
      
    case 'STOP_TRACKING':
      stopTracking();
      sendResponse({ success: true });
      break;
      
    case 'START_RECORDING':
      startRecording(message.options);
      sendResponse({ success: true });
      break;
      
    case 'STOP_RECORDING':
      const data = stopRecording();
      sendResponse({ success: true, data });
      break;
      
    case 'CALIBRATE':
      startCalibration();
      sendResponse({ success: true });
      break;
      
    case 'GET_GAZE_DATA':
      sendResponse({ data: gazeData });
      break;
      
    case 'SHOW_GAZE_OVERLAY':
      if (message.show) {
        createGazeOverlay();
      } else {
        removeGazeOverlay();
      }
      sendResponse({ success: true });
      break;
  }
  
  return true; // Keep message channel open for async response
});

// Handle messages from injected script
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  
  switch (event.data.type) {
    case 'EYE_TRACKER_READY':
      console.log('Eye tracker initialized');
      chrome.runtime.sendMessage({ 
        type: 'TRACKER_READY',
        tabId: chrome.runtime.id
      });
      break;
      
    case 'GAZE_DATA':
      handleGazeData(event.data.data);
      break;
      
    case 'CALIBRATION_COMPLETE':
      chrome.runtime.sendMessage({ 
        type: 'CALIBRATION_COMPLETE',
        result: event.data.result
      });
      break;
      
    case 'CONNECTION_STATUS':
      chrome.runtime.sendMessage({ 
        type: 'CONNECTION_STATUS',
        status: event.data.status
      });
      break;
      
    case 'TRACKER_ERROR':
      console.error('Eye tracker error:', event.data.error);
      chrome.runtime.sendMessage({ 
        type: 'TRACKER_ERROR',
        error: event.data.error
      });
      break;
  }
});

// Handle gaze data
function handleGazeData(data) {
  if (!isTracking) return;
  
  // Store data with timestamp
  const timestampedData = {
    ...data,
    timestamp: Date.now(),
    relativeTime: recordingStartTime ? Date.now() - recordingStartTime : 0,
    pageUrl: window.location.href,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY
  };
  
  gazeData.push(timestampedData);
  
  // Visualize if overlay is active
  if (gazeOverlay) {
    const canvas = gazeOverlay.querySelector('#gaze-canvas');
    if (canvas && data.x && data.y) {
      drawGazePoint(canvas, data.x, data.y, data.confidence || 1);
    }
  }
  
  // Send to background for recording
  if (recordingStartTime) {
    chrome.runtime.sendMessage({
      type: 'GAZE_DATA',
      data: timestampedData
    });
  }
  
  // Limit buffer size
  if (gazeData.length > 10000) {
    gazeData.shift();
  }
}

// Start tracking
function startTracking() {
  isTracking = true;
  window.postMessage({ type: 'START_TRACKER' }, '*');
}

// Stop tracking
function stopTracking() {
  isTracking = false;
  window.postMessage({ type: 'STOP_TRACKER' }, '*');
  removeGazeOverlay();
}

// Start recording
function startRecording(options) {
  recordingStartTime = Date.now();
  gazeData = [];
  
  if (options.showOverlay) {
    createGazeOverlay();
  }
  
  // Notify page context
  window.postMessage({ 
    type: 'START_RECORDING',
    timestamp: recordingStartTime
  }, '*');
}

// Stop recording
function stopRecording() {
  const duration = recordingStartTime ? Date.now() - recordingStartTime : 0;
  recordingStartTime = null;
  
  // Notify page context
  window.postMessage({ type: 'STOP_RECORDING' }, '*');
  
  // Return collected data
  const recordingData = {
    duration,
    gazePoints: gazeData.length,
    data: gazeData,
    metadata: {
      url: window.location.href,
      title: document.title,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      timestamp: Date.now()
    }
  };
  
  gazeData = [];
  return recordingData;
}

// Start calibration
function startCalibration() {
  window.postMessage({ type: 'START_CALIBRATION' }, '*');
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectEyeTrackingCore);
} else {
  injectEyeTrackingCore();
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  if (isTracking) {
    stopTracking();
  }
});