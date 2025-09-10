/**
 * Main Popup Controller
 * Handles all popup functionality including authentication, project selection, and recording
 */

// Import DataIO client for API communication
import('../lib/dataio-client.js').then(module => {
  window.DataIOClient = module.default || module;
}).catch(err => {
  console.error('Failed to load DataIO client:', err);
});

class PopupController {
  constructor() {
    // State
    this.state = {
      isConnected: false,
      isRecording: false,
      isCalibrated: false,
      isAuthenticated: false,
      selectedProjectId: null,
      projects: [],
      recordingStartTime: null,
      settings: {
        autoSubmit: true,
        showOverlay: true,
        recordScreen: true,
        recordGaze: true
      }
    };
    
    // Timers
    this.timerInterval = null;
    this.dataIOClient = null;
    
    // DOM elements (will be initialized in init)
    this.elements = {};
  }

  async init() {
    console.log('Initializing popup controller...');
    
    // Initialize DOM elements
    this.initializeElements();
    
    // Initialize DataIO client
    await this.initDataIOClient();
    
    // Check authentication status
    await this.checkAuthStatus();
    
    // Get current extension state
    await this.loadState();
    
    // Check calibration status
    await this.checkCalibrationStatus();
    
    // Load saved settings
    await this.loadSettings();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Start UI updates
    this.startUIUpdates();
  }
  
  initializeElements() {
    // Get all relevant DOM elements
    const elementIds = [
      'connect-btn', 'calibrate-btn', 'record-btn', 'stop-btn',
      'tracker-status', 'calibration-status', 'recording-status',
      'project-select', 'project-info', 'auth-status-text',
      'login-section', 'project-section', 'recording-timer',
      'settings-btn', 'settings-panel', 'auto-submit-checkbox',
      'show-overlay-checkbox', 'record-screen-checkbox', 'record-gaze-checkbox',
      'calibration-alert', 'error-message', 'success-message'
    ];
    
    elementIds.forEach(id => {
      this.elements[id] = document.getElementById(id);
    });
  }

  async initDataIOClient() {
    // Wait for DataIOClient to load
    let attempts = 0;
    while (!window.DataIOClient && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (window.DataIOClient) {
      this.dataIOClient = new window.DataIOClient({
        backendUrl: 'https://api.cogix.app',
        dataIOUrl: 'https://data-io.cogix.app'
      });
      console.log('DataIO client initialized');
    } else {
      console.error('Failed to load DataIOClient');
      this.showError('Failed to initialize API client');
    }
  }

  async checkAuthStatus() {
    if (!this.dataIOClient) {
      this.updateAuthUI(false);
      return;
    }

    try {
      this.state.isAuthenticated = await this.dataIOClient.isAuthenticated();
      console.log('Authentication status:', this.state.isAuthenticated);
      
      this.updateAuthUI(this.state.isAuthenticated);
      
      if (this.state.isAuthenticated) {
        await this.loadUserAndProjects();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      this.updateAuthUI(false);
    }
  }

  async loadUserAndProjects() {
    try {
      // Get current user
      const user = await this.dataIOClient.getCurrentUser();
      console.log('Current user:', user);
      
      if (user && user.id) {
        this.dataIOClient.config.userId = user.id;
        
        // Get projects
        this.state.projects = await this.dataIOClient.getProjects();
        console.log('Loaded projects:', this.state.projects);
        
        this.updateProjectList();
        
        // Load saved project selection
        const { selectedProjectId } = await chrome.storage.local.get('selectedProjectId');
        if (selectedProjectId) {
          this.state.selectedProjectId = selectedProjectId;
          if (this.elements['project-select']) {
            this.elements['project-select'].value = selectedProjectId;
          }
          this.showProjectInfo(selectedProjectId);
        }
      }
    } catch (error) {
      console.error('Failed to load user/projects:', error);
      this.showError('Failed to load projects. Please try refreshing.');
    }
  }
  
  async checkCalibrationStatus() {
    // Get calibration data from storage
    const { calibrationData } = await chrome.storage.local.get('calibrationData');
    
    if (calibrationData && calibrationData.timestamp) {
      // Check if calibration is recent (within 24 hours)
      const age = Date.now() - calibrationData.timestamp;
      const isRecent = age < 24 * 60 * 60 * 1000; // 24 hours
      
      this.state.isCalibrated = isRecent;
      
      if (!isRecent) {
        console.log('Calibration is outdated, needs recalibration');
        this.showCalibrationAlert();
      }
    } else {
      this.state.isCalibrated = false;
      this.showCalibrationAlert();
    }
    
    this.updateCalibrationUI();
  }
  
  showCalibrationAlert() {
    if (this.elements['calibration-alert']) {
      this.elements['calibration-alert'].style.display = 'block';
    }
  }
  
  hideCalibrationAlert() {
    if (this.elements['calibration-alert']) {
      this.elements['calibration-alert'].style.display = 'none';
    }
  }
  
  updateCalibrationUI() {
    const calibrateBtn = this.elements['calibrate-btn'];
    const calibrationStatus = this.elements['calibration-status'];
    const recordBtn = this.elements['record-btn'];
    
    if (this.state.isCalibrated) {
      if (calibrationStatus) {
        calibrationStatus.textContent = '✅ Calibrated';
        calibrationStatus.className = 'status-value calibrated';
      }
      if (calibrateBtn) {
        calibrateBtn.textContent = 'Recalibrate';
        calibrateBtn.classList.remove('pulse');
      }
      this.hideCalibrationAlert();
    } else {
      if (calibrationStatus) {
        calibrationStatus.textContent = '⚠️ Not calibrated';
        calibrationStatus.className = 'status-value not-calibrated';
      }
      if (calibrateBtn) {
        calibrateBtn.textContent = 'Calibrate Now';
        calibrateBtn.classList.add('pulse');
      }
    }
    
    // Update record button state
    if (recordBtn) {
      if (!this.state.isCalibrated) {
        recordBtn.title = 'Please calibrate before recording';
      } else {
        recordBtn.title = '';
      }
    }
  }

  async loadState() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      if (response) {
        this.state.isConnected = response.isConnected;
        this.state.isRecording = response.isRecording;
        this.state.isCalibrated = response.isCalibrated;
        
        this.updateUI();
      }
    } catch (error) {
      console.error('Failed to load state:', error);
    }
  }
  
  async loadSettings() {
    const { settings } = await chrome.storage.local.get('settings');
    if (settings) {
      this.state.settings = { ...this.state.settings, ...settings };
      this.updateSettingsUI();
    }
  }
  
  async saveSettings() {
    await chrome.storage.local.set({ settings: this.state.settings });
    this.showSuccess('Settings saved');
  }

  setupEventListeners() {
    // Connection button
    if (this.elements['connect-btn']) {
      this.elements['connect-btn'].addEventListener('click', () => this.toggleConnection());
    }
    
    // Calibration button
    if (this.elements['calibrate-btn']) {
      this.elements['calibrate-btn'].addEventListener('click', () => this.startCalibration());
    }
    
    // Recording buttons
    if (this.elements['record-btn']) {
      this.elements['record-btn'].addEventListener('click', () => this.startRecording());
    }
    
    if (this.elements['stop-btn']) {
      this.elements['stop-btn'].addEventListener('click', () => this.stopRecording());
    }
    
    // Project selection
    if (this.elements['project-select']) {
      this.elements['project-select'].addEventListener('change', (e) => {
        this.selectProject(e.target.value);
      });
    }
    
    // Settings
    if (this.elements['settings-btn']) {
      this.elements['settings-btn'].addEventListener('click', () => this.toggleSettings());
    }
    
    // Settings checkboxes
    ['auto-submit', 'show-overlay', 'record-screen', 'record-gaze'].forEach(setting => {
      const checkbox = this.elements[`${setting}-checkbox`];
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          const key = setting.replace('-', '').replace('record', 'record');
          this.state.settings[key] = e.target.checked;
          this.saveSettings();
        });
      }
    });
    
    // Listen for messages from background
    chrome.runtime.onMessage.addListener((message) => {
      this.handleBackgroundMessage(message);
    });
  }
  
  handleBackgroundMessage(message) {
    switch (message.type) {
      case 'STATE_UPDATE':
        this.state = { ...this.state, ...message.state };
        this.updateUI();
        break;
        
      case 'CALIBRATION_REQUIRED':
      case 'CALIBRATION_OUTDATED':
        this.showCalibrationAlert();
        this.state.isCalibrated = false;
        this.updateCalibrationUI();
        break;
        
      case 'CALIBRATION_COMPLETED':
        this.state.isCalibrated = true;
        this.updateCalibrationUI();
        this.showSuccess('Calibration completed successfully');
        break;
        
      case 'DATAIO_SUBMISSION_SUCCESS':
        this.showSuccess('Recording submitted to Cogix successfully');
        break;
        
      case 'DATAIO_SUBMISSION_ERROR':
        this.showError('Failed to submit recording: ' + message.error);
        break;
    }
  }

  async toggleConnection() {
    if (this.state.isConnected) {
      await chrome.runtime.sendMessage({ type: 'DISCONNECT' });
    } else {
      await chrome.runtime.sendMessage({ type: 'CONNECT' });
    }
  }
  
  async startCalibration() {
    const response = await chrome.runtime.sendMessage({ type: 'START_CALIBRATION' });
    if (response && response.success) {
      this.showSuccess('Calibration window opened');
    }
  }
  
  async startRecording() {
    if (!this.state.selectedProjectId) {
      this.showError('Please select a project first');
      return;
    }
    
    const options = {
      projectId: this.state.selectedProjectId,
      screen: this.state.settings.recordScreen,
      gaze: this.state.settings.recordGaze,
      showOverlay: this.state.settings.showOverlay,
      autoSubmit: this.state.settings.autoSubmit
    };
    
    const response = await chrome.runtime.sendMessage({ 
      type: 'START_RECORDING',
      options 
    });
    
    if (response && response.success) {
      this.state.isRecording = true;
      this.state.recordingStartTime = Date.now();
      this.updateUI();
      this.startRecordingTimer();
    }
  }
  
  async stopRecording() {
    const response = await chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
    
    if (response && response.success) {
      this.state.isRecording = false;
      this.stopRecordingTimer();
      this.updateUI();
    }
  }
  
  selectProject(projectId) {
    this.state.selectedProjectId = projectId;
    chrome.storage.local.set({ selectedProjectId: projectId });
    chrome.runtime.sendMessage({ type: 'SET_PROJECT', projectId });
    this.showProjectInfo(projectId);
  }

  updateUI() {
    // Connection status
    if (this.elements['tracker-status']) {
      this.elements['tracker-status'].textContent = this.state.isConnected ? 'Connected' : 'Disconnected';
      this.elements['tracker-status'].className = `status-value ${this.state.isConnected ? 'connected' : 'disconnected'}`;
    }
    
    // Connection button
    if (this.elements['connect-btn']) {
      this.elements['connect-btn'].textContent = this.state.isConnected ? 'Disconnect' : 'Connect Eye Tracker';
    }
    
    // Recording status
    if (this.elements['recording-status']) {
      this.elements['recording-status'].textContent = this.state.isRecording ? 'Recording' : 'Inactive';
      this.elements['recording-status'].className = `status-value ${this.state.isRecording ? 'recording' : 'inactive'}`;
    }
    
    // Recording buttons
    if (this.elements['record-btn']) {
      this.elements['record-btn'].style.display = this.state.isRecording ? 'none' : 'block';
      this.elements['record-btn'].disabled = !this.state.isConnected || !this.state.isCalibrated;
    }
    
    if (this.elements['stop-btn']) {
      this.elements['stop-btn'].style.display = this.state.isRecording ? 'block' : 'none';
    }
    
    // Calibration UI
    this.updateCalibrationUI();
  }
  
  updateAuthUI(isAuthenticated) {
    if (this.elements['auth-status-text']) {
      this.elements['auth-status-text'].textContent = isAuthenticated ? 'Logged in to Cogix' : 'Not logged in';
    }
    
    if (this.elements['login-section']) {
      this.elements['login-section'].style.display = isAuthenticated ? 'none' : 'block';
    }
    
    if (this.elements['project-section']) {
      this.elements['project-section'].style.display = isAuthenticated ? 'block' : 'none';
    }
  }
  
  updateProjectList() {
    const select = this.elements['project-select'];
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Select a project --</option>';
    
    this.state.projects.forEach(project => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.name;
      select.appendChild(option);
    });
  }
  
  showProjectInfo(projectId) {
    const project = this.state.projects.find(p => p.id === projectId);
    if (!project || !this.elements['project-info']) return;
    
    this.elements['project-info'].style.display = 'block';
    this.elements['project-info'].innerHTML = `
      <strong>Selected:</strong> ${project.name}<br>
      <small>Data will be submitted to this project</small>
    `;
  }
  
  updateSettingsUI() {
    Object.keys(this.state.settings).forEach(key => {
      const checkboxId = key.replace(/([A-Z])/g, '-$1').toLowerCase() + '-checkbox';
      const checkbox = this.elements[checkboxId];
      if (checkbox) {
        checkbox.checked = this.state.settings[key];
      }
    });
  }
  
  toggleSettings() {
    const panel = this.elements['settings-panel'];
    if (panel) {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
  }
  
  startRecordingTimer() {
    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.state.recordingStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      
      if (this.elements['recording-timer']) {
        this.elements['recording-timer'].textContent = 
          `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
    }, 1000);
  }
  
  stopRecordingTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    if (this.elements['recording-timer']) {
      this.elements['recording-timer'].textContent = '';
    }
  }
  
  startUIUpdates() {
    // Update stats every second
    setInterval(async () => {
      if (this.state.isRecording) {
        const response = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
        if (response && response.stats) {
          // Update any stats display if needed
        }
      }
    }, 1000);
  }
  
  showError(message) {
    console.error(message);
    if (this.elements['error-message']) {
      this.elements['error-message'].textContent = message;
      this.elements['error-message'].style.display = 'block';
      setTimeout(() => {
        this.elements['error-message'].style.display = 'none';
      }, 5000);
    }
  }
  
  showSuccess(message) {
    console.log(message);
    if (this.elements['success-message']) {
      this.elements['success-message'].textContent = message;
      this.elements['success-message'].style.display = 'block';
      setTimeout(() => {
        this.elements['success-message'].style.display = 'none';
      }, 3000);
    }
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  const controller = new PopupController();
  await controller.init();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PopupController;
}