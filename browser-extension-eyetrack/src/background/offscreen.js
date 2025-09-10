// Offscreen document for media recording
// Handles screen recording using MediaRecorder API

let mediaRecorder = null;
let recordedChunks = [];
let stream = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  switch (message.type) {
    case 'START_MEDIA_RECORDING':
      await startRecording(message.streamId);
      sendResponse({ success: true });
      break;
      
    case 'STOP_MEDIA_RECORDING':
      await stopRecording();
      sendResponse({ success: true });
      break;
      
    case 'PAUSE_RECORDING':
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.pause();
      }
      sendResponse({ success: true });
      break;
      
    case 'RESUME_RECORDING':
      if (mediaRecorder && mediaRecorder.state === 'paused') {
        mediaRecorder.resume();
      }
      sendResponse({ success: true });
      break;
  }
  
  return true;
});

// Start recording with the provided stream ID
async function startRecording(streamId) {
  try {
    // Get media stream using the stream ID
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: streamId
        }
      },
      audio: false // Can be enabled if needed
    });
    
    // Set up MediaRecorder
    const options = {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 2500000 // 2.5 Mbps
    };
    
    // Check if the mimeType is supported
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = 'video/webm;codecs=vp8';
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
      }
    }
    
    mediaRecorder = new MediaRecorder(stream, options);
    recordedChunks = [];
    
    // Handle data available event
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
        
        // Send chunk to background for incremental saving
        // Convert to base64 for message passing
        const reader = new FileReader();
        reader.onloadend = () => {
          chrome.runtime.sendMessage({
            type: 'MEDIA_CHUNK',
            chunk: reader.result,
            timestamp: Date.now()
          });
        };
        reader.readAsDataURL(event.data);
      }
    };
    
    // Handle recording stop
    mediaRecorder.onstop = () => {
      // Create final blob
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      
      // Convert to base64 and send to background
      const reader = new FileReader();
      reader.onloadend = () => {
        chrome.runtime.sendMessage({
          type: 'MEDIA_RECORDING_COMPLETE',
          data: reader.result,
          mimeType: mediaRecorder.mimeType,
          duration: Date.now() - startTime
        });
      };
      reader.readAsDataURL(blob);
      
      // Clean up
      recordedChunks = [];
    };
    
    // Handle errors
    mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event);
      chrome.runtime.sendMessage({
        type: 'RECORDING_ERROR',
        error: event.error
      });
    };
    
    // Start recording with 1 second chunks
    const startTime = Date.now();
    mediaRecorder.start(1000);
    
    console.log('Recording started with mimeType:', mediaRecorder.mimeType);
    
    // Notify background that recording started
    chrome.runtime.sendMessage({
      type: 'RECORDING_STARTED',
      mimeType: mediaRecorder.mimeType,
      timestamp: startTime
    });
    
  } catch (error) {
    console.error('Failed to start recording:', error);
    chrome.runtime.sendMessage({
      type: 'RECORDING_ERROR',
      error: error.toString()
    });
  }
}

// Stop recording
async function stopRecording() {
  try {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      // Stop will trigger the onstop event
      mediaRecorder.stop();
    }
    
    // Stop all tracks in the stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
    
    console.log('Recording stopped');
    
  } catch (error) {
    console.error('Failed to stop recording:', error);
    chrome.runtime.sendMessage({
      type: 'RECORDING_ERROR',
      error: error.toString()
    });
  }
}

// Monitor recording state
setInterval(() => {
  if (mediaRecorder) {
    chrome.runtime.sendMessage({
      type: 'RECORDING_STATE',
      state: mediaRecorder.state,
      chunksCount: recordedChunks.length
    });
  }
}, 1000);