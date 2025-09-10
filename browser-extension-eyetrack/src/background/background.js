// Import DataIOClient for cogix-data-io integration
import('../lib/dataio-client.js').then(module => {
  window.DataIOClient = module.DataIOClient || module.default || module;
}).catch(err => {
  console.error('Failed to load DataIOClient:', err);
});

// Background service worker for managing recording and eye tracking
let state = {
  isConnected: false,
  isCalibrated: false,
  isRecording: false,
  hasRecording: false,
  activeTabId: null,
  recordingData: {
    video: null,
    gazeData: [],
    metadata: {},
    startTime: null,
    endTime: null
  },
  stats: {
    gazePoints: 0,
    fps: 0,
    lastFpsCalc: Date.now(),
    frameCount: 0
  },
  mediaRecorder: null,
  recordedChunks: [],
  streamId: null,
  // DataIO configuration
  dataIOConfig: {
    projectId: null,
    userId: null,
    backendUrl: 'https://api.cogix.app',
    dataIOUrl: 'https://data-io.cogix.app'
  }
};

// WebSocket connection to eye tracker
// Default ports: ws://localhost:8765 or ws://127.0.0.1:9000
let ws = null;
let reconnectTimeout = null;

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Eye Tracking Recorder Extension installed');
  
  // Set default storage values
  chrome.storage.local.set({
    settings: {
      wsUrl: 'ws://localhost:8765',
      autoConnect: false,
      showGazeOverlay: true,
      saveFormat: 'webm',
      videoQuality: 'high',
      submitToDataIO: true,  // Enable cogix-data-io submission by default
      selectedProjectId: null  // User will select project in settings
    }
  });
  
  // Try to get initial user and project info
  await initializeDataIOConfig();
});

// Initialize DataIO configuration
async function initializeDataIOConfig() {
  try {
    if (!window.DataIOClient) {
      console.log('DataIOClient not yet loaded, retrying...');
      setTimeout(initializeDataIOConfig, 1000);
      return;
    }
    
    const client = new window.DataIOClient({
      backendUrl: state.dataIOConfig.backendUrl
    });
    
    // Get current user info
    const user = await client.getCurrentUser();
    state.dataIOConfig.userId = user.id;
    
    // Get available projects
    const projects = await client.getProjects();
    
    // Store projects for settings UI
    await chrome.storage.local.set({ 
      availableProjects: projects,
      currentUserId: user.id
    });
    
    console.log('DataIO config initialized:', {
      userId: user.id,
      projectCount: projects.length
    });
  } catch (error) {
    console.log('Failed to initialize DataIO config (user may not be logged in):', error.message);
  }
}

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_STATE':
      sendResponse(state);
      break;
      
    case 'GET_STATS':
      sendResponse({ stats: state.stats });
      break;
      
    case 'CONNECT':
      connectEyeTracker();
      sendResponse({ success: true });
      break;
      
    case 'DISCONNECT':
      disconnectEyeTracker();
      sendResponse({ success: true });
      break;
      
    case 'START_CALIBRATION':
      startCalibration(message.tabId);
      sendResponse({ success: true });
      break;
      
    case 'CALIBRATION_COMPLETE':
      handleCalibrationComplete(message.result);
      break;
      
    case 'START_RECORDING':
      // Store project ID from options
      if (message.options?.projectId) {
        state.dataIOConfig.projectId = message.options.projectId;
      }
      startRecording(message.options);
      sendResponse({ success: true });
      break;
      
    case 'STOP_RECORDING':
      stopRecording();
      sendResponse({ success: true });
      break;
      
    case 'GAZE_DATA':
      handleGazeData(message.data);
      break;
      
    case 'DOWNLOAD':
      handleDownload(message.downloadType);
      sendResponse({ success: true });
      break;
      
    case 'CONNECTION_STATUS':
      state.isConnected = message.status === 'connected';
      broadcastStateUpdate();
      break;
      
    case 'TRACKER_ERROR':
      handleTrackerError(message.error);
      break;
      
    case 'GET_PROJECTS':
      getAvailableProjects().then(sendResponse);
      return true; // Will respond asynchronously
      
    case 'SET_PROJECT':
      setSelectedProject(message.projectId);
      sendResponse({ success: true });
      break;
      
    case 'REFRESH_AUTH':
      initializeDataIOConfig().then(() => {
        sendResponse({ success: true });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true; // Will respond asynchronously
  }
  
  return true; // Keep message channel open
});

// Get available projects for the user
async function getAvailableProjects() {
  try {
    // First try to get from storage
    const { availableProjects } = await chrome.storage.local.get('availableProjects');
    if (availableProjects) {
      return { success: true, projects: availableProjects };
    }
    
    // If not in storage, fetch from API
    if (!window.DataIOClient) {
      throw new Error('DataIOClient not loaded');
    }
    
    const client = new window.DataIOClient({
      backendUrl: state.dataIOConfig.backendUrl
    });
    
    const projects = await client.getProjects();
    
    // Store for future use
    await chrome.storage.local.set({ availableProjects: projects });
    
    return { success: true, projects };
  } catch (error) {
    console.error('Failed to get projects:', error);
    return { success: false, error: error.message };
  }
}

// Set the selected project for data submission
async function setSelectedProject(projectId) {
  try {
    const { settings } = await chrome.storage.local.get('settings');
    settings.selectedProjectId = projectId;
    state.dataIOConfig.projectId = projectId;
    
    await chrome.storage.local.set({ settings });
    
    console.log('Selected project for data submission:', projectId);
  } catch (error) {
    console.error('Failed to set project:', error);
  }
}

// Connect to eye tracker WebSocket
async function connectEyeTracker() {
  const { settings } = await chrome.storage.local.get('settings');
  
  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    state.activeTabId = tab.id;
    
    // Send connect message to content script
    await chrome.tabs.sendMessage(tab.id, { type: 'START_TRACKING' });
    
    // Connect WebSocket (if using direct connection)
    ws = new WebSocket(settings.wsUrl);
    
    ws.onopen = () => {
      console.log('Connected to eye tracker');
      state.isConnected = true;
      broadcastStateUpdate();
      
      // Send initialization command
      ws.send(JSON.stringify({
        req_cmd: 'init_et10c',
        eyeType: 0,
        resType: '1640x1232x60',
        numpoint: 5,  // 5-point calibration
        sceenTypeIndex: 1
      }));
    };
    
    ws.onmessage = (event) => {
      handleWebSocketMessage(event.data);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      handleTrackerError(error);
    };
    
    ws.onclose = () => {
      console.log('Disconnected from eye tracker');
      state.isConnected = false;
      broadcastStateUpdate();
      
      // Attempt reconnect if not manually disconnected
      if (state.isRecording) {
        reconnectTimeout = setTimeout(connectEyeTracker, 5000);
      }
    };
  } catch (error) {
    console.error('Failed to connect:', error);
    handleTrackerError(error);
  }
}

// Disconnect from eye tracker
async function disconnectEyeTracker() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  
  if (ws) {
    ws.close();
    ws = null;
  }
  
  if (state.activeTabId) {
    try {
      await chrome.tabs.sendMessage(state.activeTabId, { type: 'STOP_TRACKING' });
    } catch (error) {
      console.error('Failed to stop tracking:', error);
    }
  }
  
  state.isConnected = false;
  state.isCalibrated = false;
  broadcastStateUpdate();
}

// Handle WebSocket messages
function handleWebSocketMessage(data) {
  try {
    const message = JSON.parse(data);
    
    if (message.type === 'gaze_data') {
      handleGazeData({
        x: message.x,
        y: message.y,
        confidence: message.confidence,
        timestamp: message.timestamp || Date.now()
      });
    } else if (message.type === 'calibration_result') {
      handleCalibrationComplete(message.result);
    }
  } catch (error) {
    console.error('Failed to parse WebSocket message:', error);
  }
}

// Start calibration
async function startCalibration(tabId) {
  try {
    // Open calibration in fullscreen window
    const calibrationWindow = await chrome.windows.create({
      url: chrome.runtime.getURL('pages/calibration.html'),
      type: 'popup',
      state: 'fullscreen'
    });
    
    console.log('Opened calibration window:', calibrationWindow.id);
    
    // If we have a WebSocket connection, notify it
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ req_cmd: 'startCalibration' }));
    }
  } catch (error) {
    console.error('Failed to start calibration:', error);
  }
}

// Handle calibration completion
function handleCalibrationComplete(result) {
  state.isCalibrated = true;
  broadcastStateUpdate();
  
  // Store calibration data with timestamp
  const calibrationData = {
    result,
    timestamp: Date.now(),
    accuracy: result.accuracy || null,
    points: result.points || []
  };
  
  chrome.storage.local.set({ calibrationData });
  
  console.log('Calibration completed and saved:', calibrationData);
  
  // Notify popup that calibration is complete
  chrome.runtime.sendMessage({
    type: 'CALIBRATION_COMPLETED',
    calibrationData
  }).catch(() => {});
}

// Start recording
async function startRecording(options = {}) {
  try {
    // Check if calibrated first
    const { calibrationData } = await chrome.storage.local.get('calibrationData');
    
    if (!calibrationData || !calibrationData.timestamp) {
      // Not calibrated - open calibration window
      console.log('Not calibrated, opening calibration window...');
      
      // Send message to popup to show calibration required
      chrome.runtime.sendMessage({
        type: 'CALIBRATION_REQUIRED',
        message: 'Please complete calibration before recording'
      }).catch(() => {});
      
      // Open calibration in new window (fullscreen)
      chrome.windows.create({
        url: chrome.runtime.getURL('pages/calibration.html'),
        type: 'popup',
        state: 'fullscreen'
      });
      
      return;
    }
    
    // Check if calibration is recent (within 24 hours)
    const calibrationAge = Date.now() - calibrationData.timestamp;
    if (calibrationAge > 24 * 60 * 60 * 1000) {
      console.log('Calibration is outdated, needs recalibration');
      
      // Send message to popup
      chrome.runtime.sendMessage({
        type: 'CALIBRATION_OUTDATED',
        message: 'Calibration is outdated. Please recalibrate.'
      }).catch(() => {});
      
      // Open calibration window
      chrome.windows.create({
        url: chrome.runtime.getURL('pages/calibration.html'),
        type: 'popup',
        state: 'fullscreen'
      });
      
      return;
    }
    
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Reset recording data
    state.recordingData = {
      video: null,
      gazeData: [],
      metadata: {
        url: tab.url,
        title: tab.title,
        startTime: Date.now(),
        options
      },
      startTime: Date.now(),
      endTime: null
    };
    
    state.recordedChunks = [];
    state.stats.gazePoints = 0;
    state.stats.frameCount = 0;
    
    // Start screen recording if requested
    if (options.screen) {
      await startScreenRecording(tab.id);
    }
    
    // Start eye tracking data collection
    await chrome.tabs.sendMessage(tab.id, { 
      type: 'START_RECORDING',
      options: {
        showOverlay: options.showOverlay !== false
      }
    });
    
    // Send start tracker command to WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ req_cmd: 'startTracker' }));
    }
    
    state.isRecording = true;
    broadcastStateUpdate();
    
  } catch (error) {
    console.error('Failed to start recording:', error);
    handleTrackerError(error);
  }
}

// Start screen recording
async function startScreenRecording(tabId) {
  try {
    // Get stream ID for tab capture
    state.streamId = await new Promise((resolve) => {
      chrome.desktopCapture.chooseDesktopMedia(
        ['screen', 'window', 'tab'],
        tabId,
        (streamId) => resolve(streamId)
      );
    });
    
    if (!state.streamId) {
      throw new Error('User cancelled screen selection');
    }
    
    // Create offscreen document for recording
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Recording screen with MediaRecorder'
    });
    
    // Send stream ID to offscreen document
    await chrome.runtime.sendMessage({
      type: 'START_MEDIA_RECORDING',
      streamId: state.streamId
    });
    
  } catch (error) {
    console.error('Failed to start screen recording:', error);
    throw error;
  }
}

// Stop recording
async function stopRecording() {
  try {
    state.isRecording = false;
    state.recordingData.endTime = Date.now();
    
    // Stop screen recording
    if (state.streamId) {
      await chrome.runtime.sendMessage({ type: 'STOP_MEDIA_RECORDING' });
      await chrome.offscreen.closeDocument();
      state.streamId = null;
    }
    
    // Stop eye tracking recording
    if (state.activeTabId) {
      const response = await chrome.tabs.sendMessage(state.activeTabId, { 
        type: 'STOP_RECORDING' 
      });
      
      if (response && response.data) {
        // Merge content script data with background data
        state.recordingData.gazeData = [
          ...state.recordingData.gazeData,
          ...response.data.data
        ];
      }
    }
    
    // Send stop tracker command to WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ req_cmd: 'stopTracker' }));
    }
    
    state.hasRecording = true;
    broadcastStateUpdate();
    
    // Save recording to storage
    await saveRecording();
    
  } catch (error) {
    console.error('Failed to stop recording:', error);
  }
}

// Handle gaze data
function handleGazeData(data) {
  if (!state.isRecording) return;
  
  // Add to recording data
  state.recordingData.gazeData.push(data);
  
  // Update stats
  state.stats.gazePoints++;
  state.stats.frameCount++;
  
  // Calculate FPS every second
  const now = Date.now();
  if (now - state.stats.lastFpsCalc > 1000) {
    state.stats.fps = Math.round(state.stats.frameCount);
    state.stats.frameCount = 0;
    state.stats.lastFpsCalc = now;
  }
  
  // Limit buffer size to prevent memory issues
  if (state.recordingData.gazeData.length > 100000) {
    state.recordingData.gazeData.shift();
  }
}

// Handle media recording data
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'MEDIA_CHUNK') {
    state.recordedChunks.push(message.chunk);
  } else if (message.type === 'MEDIA_RECORDING_COMPLETE') {
    // Create blob from chunks
    const blob = new Blob(state.recordedChunks, { type: 'video/webm' });
    state.recordingData.video = blob;
    state.recordedChunks = [];
  }
});

// Save recording to storage and submit to cogix-data-io
async function saveRecording() {
  try {
    const recording = {
      id: Date.now().toString(),
      metadata: state.recordingData.metadata,
      duration: state.recordingData.endTime - state.recordingData.startTime,
      gazeDataCount: state.recordingData.gazeData.length,
      timestamp: Date.now()
    };
    
    // Store metadata in chrome.storage
    const { recordings = [] } = await chrome.storage.local.get('recordings');
    recordings.push(recording);
    await chrome.storage.local.set({ recordings });
    
    // Check if we should submit to cogix-data-io
    const { settings } = await chrome.storage.local.get('settings');
    if (settings?.submitToDataIO && settings?.selectedProjectId) {
      await submitToDataIO(recording.id);
    }
    
    console.log('Recording saved:', recording);
  } catch (error) {
    console.error('Failed to save recording:', error);
  }
}

// Submit recording to cogix-data-io
async function submitToDataIO(sessionId) {
  try {
    // Use project ID from state (set during recording) or from storage
    const projectId = state.dataIOConfig.projectId || 
                     (await chrome.storage.local.get('selectedProjectId')).selectedProjectId;
    
    if (!projectId) {
      console.warn('No project selected for data submission');
      return;
    }
    
    if (!window.DataIOClient) {
      console.error('DataIOClient not loaded');
      return;
    }
    
    // Create DataIO client
    const client = new window.DataIOClient({
      backendUrl: state.dataIOConfig.backendUrl,
      dataIOUrl: state.dataIOConfig.dataIOUrl,
      projectId: projectId,
      userId: state.dataIOConfig.userId
    });
    
    // Prepare session data
    const sessionData = {
      sessionId: sessionId,
      name: state.recordingData.metadata.title || 'Browser Recording',
      duration: state.recordingData.endTime - state.recordingData.startTime,
      startTime: state.recordingData.startTime,
      videoBlob: state.recordingData.video,
      gazeData: state.recordingData.gazeData.map(point => ({
        timestamp: point.timestamp,
        x: point.x,
        y: point.y,
        confidence: point.confidence || 1.0,
        pupilSize: point.pupilSize,
        eyeOpenness: point.eyeOpenness
      })),
      metadata: {
        url: state.recordingData.metadata.url,
        title: state.recordingData.metadata.title,
        browser: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        recordingOptions: state.recordingData.metadata.options
      }
    };
    
    // Submit to cogix-data-io
    console.log('Submitting recording to cogix-data-io...');
    const result = await client.submitSession(sessionData);
    
    // Update recording with submission info
    const { recordings = [] } = await chrome.storage.local.get('recordings');
    const recordingIndex = recordings.findIndex(r => r.id === sessionId);
    if (recordingIndex !== -1) {
      recordings[recordingIndex].submittedToDataIO = true;
      recordings[recordingIndex].dataIOUrl = result.url;
      await chrome.storage.local.set({ recordings });
    }
    
    console.log('Recording submitted to cogix-data-io successfully');
    
    // Notify popup of successful submission
    chrome.runtime.sendMessage({
      type: 'DATAIO_SUBMISSION_SUCCESS',
      sessionId: sessionId,
      url: result.url
    }).catch(() => {});
    
  } catch (error) {
    console.error('Failed to submit to cogix-data-io:', error);
    
    // Notify popup of submission error
    chrome.runtime.sendMessage({
      type: 'DATAIO_SUBMISSION_ERROR',
      error: error.message
    }).catch(() => {});
  }
}

// Handle downloads
async function handleDownload(type) {
  try {
    let blob, filename;
    
    switch (type) {
      case 'video':
        if (state.recordingData.video) {
          blob = state.recordingData.video;
          filename = `recording_${Date.now()}.webm`;
        }
        break;
        
      case 'data':
        const gazeDataJson = JSON.stringify({
          metadata: state.recordingData.metadata,
          gazeData: state.recordingData.gazeData,
          duration: state.recordingData.endTime - state.recordingData.startTime,
          stats: {
            totalPoints: state.recordingData.gazeData.length,
            avgFps: state.stats.fps
          }
        }, null, 2);
        blob = new Blob([gazeDataJson], { type: 'application/json' });
        filename = `gaze_data_${Date.now()}.json`;
        break;
        
      case 'combined':
        // Create a ZIP file with both video and data
        // This would require a ZIP library like JSZip
        await createCombinedDownload();
        return;
    }
    
    if (blob) {
      const url = URL.createObjectURL(blob);
      chrome.downloads.download({
        url,
        filename,
        saveAs: true
      }, () => {
        URL.revokeObjectURL(url);
      });
    }
  } catch (error) {
    console.error('Failed to download:', error);
  }
}

// Create combined download (video + data)
async function createCombinedDownload() {
  // This would require importing JSZip or similar library
  // For now, download separately
  await handleDownload('video');
  await handleDownload('data');
}

// Handle tracker errors
function handleTrackerError(error) {
  console.error('Tracker error:', error);
  
  // Notify popup
  chrome.runtime.sendMessage({
    type: 'ERROR',
    error: error.toString()
  });
  
  // Update state
  if (state.isRecording) {
    stopRecording();
  }
}

// Broadcast state updates to popup
function broadcastStateUpdate() {
  chrome.runtime.sendMessage({
    type: 'STATE_UPDATE',
    state
  }).catch(() => {
    // Popup might be closed, ignore error
  });
}

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === state.activeTabId && changeInfo.status === 'complete') {
    // Re-inject content script if needed
    if (state.isConnected) {
      chrome.tabs.sendMessage(tabId, { type: 'START_TRACKING' }).catch(() => {
        // Content script might not be ready yet
      });
    }
  }
});

// Handle tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === state.activeTabId) {
    if (state.isRecording) {
      stopRecording();
    }
    state.activeTabId = null;
  }
});