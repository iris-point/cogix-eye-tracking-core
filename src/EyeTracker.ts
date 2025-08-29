/**
 * Clean, minimal eye tracking core
 * Verified against working raw example
 */

import { EventEmitter } from './EventEmitter'
import { DataBuffer } from './DataBuffer'
import {
  GazeData,
  CalibrationResult,
  DeviceStatus,
  CoreConfig,
  EventMap,
  TrackerOutput
} from './types'

/**
 * WebSocket command constants
 * All commands are pre-defined to avoid dynamic construction
 */
const COMMANDS = {
  // Device initialization
  INIT_ET10C: {
    "req_cmd": "init_et10c",
    "eyeType": 0,
    "resType": "640x368x30",
    "numpoint": 5,
    "sceenTypeIndex": 1  // Note: typo preserved from HH
  },
  
  // IR Light control - removed, will be dynamic
  
  // Camera control
  START_CAMERA: {
    "req_cmd": "startCamera"
  },
  
  STOP_CAMERA: {
    "req_cmd": "stopCamera"
  },
  
  FLIP_CAMERA: {
    "req_cmd": "filpCamera"  // Note: typo preserved from HH
  },
  
  // Calibration control
  STOP_CALIBRATION: {
    "req_cmd": "stopCalibration"
  },
  
  CHECK_CALIBRATION: {
    "req_cmd": "checkCabliration"  // Note: typo preserved from HH
  },
  
  RESTART_CALIBRATION: {
    "req_cmd": "restartCalibration"
  },
  
  // Tracking control
  START_TRACKER: {
    "req_cmd": "startTracker"
  },
  
  STOP_TRACKER: {
    "req_cmd": "stopTracker"
  },
  
  // Utility
  GET_CURR_TIMESTAMP: {
    "req_cmd": "getCurrTimeStamp"
  }
} as const

/**
 * Factory function for calibration point commands
 * These need to be dynamic due to varying x,y coordinates
 */
const createCalibrationCommand = (x: number, y: number) => ({
  "req_cmd": "startCalibration",
  "point_x": x,
  "point_y": y
})

/**
 * Factory function for IR brightness command
 * Brightness can be set from 0 to 100
 */
const createBrightnessCommand = (brightness: number) => ({
  "req_cmd": "setBright",
  "irBrights": Math.max(0, Math.min(100, brightness))
})

export class EyeTracker extends EventEmitter<EventMap> {
  private websocket: WebSocket | null = null
  private status: DeviceStatus = DeviceStatus.DISCONNECTED
  private config: Required<CoreConfig>
  private dataBuffer: DataBuffer
  private isCalibrating: boolean = false
  private calibrationStep: number = 0
  private calibrationFinished: boolean = false
  private cameraEnabled: boolean = false
  private cameraFlipped: boolean = false
  private autoInitialize: boolean = true
  private isInitialized: boolean = false
  private isTracking: boolean = false
  private lastStatusCode: string | null = null
  private deviceConnected: boolean = false
  
  // Calibration points - same as raw example
  private calibrationPoints = [
    { x: 0.1, y: 0.1 },  // Point 0: Top-left
    { x: 0.9, y: 0.1 },  // Point 1: Top-right  
    { x: 0.5, y: 0.5 },  // Point 2: Center
    { x: 0.1, y: 0.9 },  // Point 3: Bottom-left
    { x: 0.9, y: 0.9 }   // Point 4: Bottom-right
  ]

  constructor(config?: CoreConfig) {
    super()
    
    this.config = {
      wsUrl: ['ws://127.0.0.1:9000', 'wss://127.0.0.1:8443'], // Default ws on 9000, fallback to wss on 8443
      reconnectAttempts: 0,
      reconnectDelay: 1000,
      bufferSize: 10000,
      autoConnect: false,
      autoInitialize: true,  // Auto-initialize device after connection
      initDelay: 500,        // Delay between init device and init light
      debug: false,
      ...config
    }

    if (typeof this.config.wsUrl === 'string') {
      this.config.wsUrl = [this.config.wsUrl]
    }

    this.autoInitialize = this.config.autoInitialize ?? true
    this.dataBuffer = new DataBuffer(this.config.bufferSize)
  }

  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[EyeTracker]', ...args)
    }
  }

  /**
   * Connect to eye tracker - matches raw example exactly
   */
  async connect(): Promise<void> {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      return
    }

    this.setStatus(DeviceStatus.CONNECTING)
    
    return new Promise((resolve, reject) => {
      try {
        // Get the first URL from config (support array or string)
        const wsUrl = Array.isArray(this.config.wsUrl) ? this.config.wsUrl[0] : this.config.wsUrl
        this.log(`Connecting to ${wsUrl}...`)
        this.websocket = new WebSocket(wsUrl)
        
        this.websocket.onopen = () => {
          this.log('Connection established')
          this.setStatus(DeviceStatus.CONNECTED)
          
          // Send stopCalibration to ensure device is in clean state
          // This prevents getting stuck if device was in calibration mode
          this.sendCommand(COMMANDS.STOP_CALIBRATION)
          
          this.emit('connected', undefined)
          
          // Auto-initialize device if enabled
          if (this.autoInitialize && !this.isInitialized) {
            this.autoInit()
          }
          
          resolve()
        }
        
        this.websocket.onmessage = (event) => {
          this.handleMessage(event.data)
        }
        
        this.websocket.onerror = (event) => {
          // Don't reject - just log like raw example
          this.log('WebSocket error:', event)
          this.emit('error', new Error('Connection error'))
          // Don't set ERROR status or reject - let it try to connect
        }
        
        this.websocket.onclose = (event) => {
          this.log('Disconnection')
          this.setStatus(DeviceStatus.DISCONNECTED)
          this.emit('disconnected', undefined)
          // Don't reject on close - the raw example doesn't fail here
        }
      } catch (error) {
        this.setStatus(DeviceStatus.ERROR)
        reject(error)
      }
    })
  }

  /**
   * Auto-initialize device and light after connection
   * This matches the typical initialization sequence
   */
  private async autoInit(): Promise<void> {
    this.log('Auto-initializing device...')
    
    // Step 1: Initialize device
    this.initDevice()
    
    // Step 2: Wait for configured delay (default 500ms)
    await new Promise(resolve => setTimeout(resolve, this.config.initDelay))
    
    // Step 3: Initialize IR light with default brightness (80)
    this.initLight()
    
    this.isInitialized = true
    this.log('Device initialization complete')
    this.emit('ready', { initialized: true })
  }

  /**
   * Initialize device - matches raw example initDevice()
   * @param requestFullscreen - Whether to request fullscreen (default: true)
   */
  initDevice(requestFullscreen: boolean = true): void {
    // Request fullscreen like raw example
    if (requestFullscreen) {
      const element = document.documentElement
      if (element.requestFullscreen) {
        element.requestFullscreen()
      } else if ((element as any).mozRequestFullScreen) {
        (element as any).mozRequestFullScreen()
      } else if ((element as any).webkitRequestFullscreen) {
        (element as any).webkitRequestFullscreen()
      } else if ((element as any).msRequestFullscreen) {
        (element as any).msRequestFullscreen()
      }
    }

    // Send init command using constant
    this.sendCommand(COMMANDS.INIT_ET10C)
    
    // Mark as initialized if called manually
    if (!this.autoInitialize) {
      this.isInitialized = true
    }
  }

  /**
   * Initialize IR light - matches raw example initLight()
   * @param brightness - Optional brightness level (0-100), defaults to 80
   */
  initLight(brightness: number = 80): void {
    this.sendCommand(createBrightnessCommand(brightness))
  }

  /**
   * Set IR light brightness
   * @param brightness - Brightness level (0-100)
   */
  setBrightness(brightness: number): void {
    this.sendCommand(createBrightnessCommand(brightness))
  }

  /**
   * Turn off IR light (set brightness to 0)
   */
  closeLight(): void {
    this.sendCommand(createBrightnessCommand(0))
  }

  /**
   * Initialize camera - matches raw example initCamera()
   */
  initCamera(): void {
    this.log('Initializing camera, sending START_CAMERA command')
    this.sendCommand(COMMANDS.START_CAMERA)
    this.cameraEnabled = true
    this.emit('cameraStarted', undefined)
    this.log('Camera initialization command sent')
  }

  /**
   * Start calibration - matches raw example initCalibration()
   */
  startCalibration(): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected')
    }

    this.isCalibrating = true
    this.calibrationStep = 0
    
    this.setStatus(DeviceStatus.CALIBRATING)
    this.emit('calibrationStarted', { points: 5 })
    
    // Show first calibration point immediately (matches raw line 446)
    // The UI will display the first point (0-based index)
    this.emit('calibrationProgress', {
      current: 0,  // 0-based for display
      total: 5
    })

    // Then wait 3 seconds before sending the command (matches raw line 447-450)
    const firstPoint = this.calibrationPoints[0]
    setTimeout(() => {
      this.sendCommand(createCalibrationCommand(firstPoint.x, firstPoint.y))
    }, 3000)
  }

  /**
   * Handle WebSocket message - matches raw example GetIrisInfo()
   */
  private handleMessage(data: string): void {
    try {
      // Decode from Base64 - matches raw example line 302
      const decodedCmd = atob(data)
      const jsonIris = JSON.parse(decodedCmd)
      
      // Debug: Log all received data keys
      const keys = Object.keys(jsonIris)
      if (keys.length > 0) {
        this.log('Received data with keys:', keys)
        
        // Specifically check for camera data
        if (jsonIris.bg_img !== undefined) {
          this.log('Camera data received! Length:', jsonIris.bg_img ? jsonIris.bg_img.length : 0)
        }
      }

      // Handle calibration progress - matches raw example line 313-335
      if (jsonIris.nFinishedNum !== undefined) {
        this.log('Finish checked!', jsonIris.nFinishedNum)
        
        // Emit progress for the NEXT point that will be shown
        // jsonIris.nFinishedNum is 1-based: 1 means first point finished, show second point
        if (jsonIris.nFinishedNum < 5) {
          this.emit('calibrationProgress', {
            current: jsonIris.nFinishedNum,  // This becomes the index for the next point (0-based)
            total: 5
          })
        }

        // Send next calibration point after delay
        this.sendNextCalibrationPoint(jsonIris.nFinishedNum)

        if (jsonIris.nFinishedNum === 5) {
          // Check calibration - matches raw example line 328-329
          this.sendCommand(COMMANDS.CHECK_CALIBRATION)
        }
      }

      // Handle calibration finished - matches raw example line 336-341
      if (jsonIris.cablicFinished) {
        this.log('Calibration finished')
        this.isCalibrating = false
        this.calibrationFinished = true
        
        const result: CalibrationResult = {
          success: true,
          points: [],
          accuracy: 0.95
        }
        
        this.emit('calibrationComplete', result)
        
        // Start tracking automatically - matches raw example starteyeTracer() call
        this.startTracking()
      }

      // Handle tracking data - matches raw example line 342-379
      if (jsonIris.trakcerOutput) {
        const trakcerOutputData: TrackerOutput = this.parseTrackerOutput(jsonIris.trakcerOutput)
        
        let alleyeLeft = 0
        let alleyeRight = 0
        let eyeCount = 0

        // Process left eye - matches raw example line 353-359
        if (trakcerOutputData.tLeftScreenPoint) {
          alleyeLeft += trakcerOutputData.tLeftScreenPoint.f32X
          alleyeRight += trakcerOutputData.tLeftScreenPoint.f32Y
          eyeCount++
        }

        // Process right eye - matches raw example line 361-367
        if (trakcerOutputData.tRightScreenPoint) {
          alleyeLeft += trakcerOutputData.tRightScreenPoint.f32X
          alleyeRight += trakcerOutputData.tRightScreenPoint.f32Y
          eyeCount++
        }

        if (eyeCount !== 0) {
          // Average coordinates - matches raw example line 371-373
          alleyeLeft = alleyeLeft / eyeCount
          alleyeRight = alleyeRight / eyeCount

          const gazeData: GazeData = {
            timestamp: Date.now(),
            x: alleyeLeft,
            y: alleyeRight,
            confidence: 0.9,
            rawTrackerOutput: trakcerOutputData
          }

          if (trakcerOutputData.tLeftScreenPoint) {
            gazeData.leftEye = {
              x: trakcerOutputData.tLeftScreenPoint.f32X,
              y: trakcerOutputData.tLeftScreenPoint.f32Y
            }
          }

          if (trakcerOutputData.tRightScreenPoint) {
            gazeData.rightEye = {
              x: trakcerOutputData.tRightScreenPoint.f32X,
              y: trakcerOutputData.tRightScreenPoint.f32Y
            }
          }

          this.dataBuffer.add(gazeData)
          this.emit('gazeData', gazeData)
        }
      }

      // Handle camera image - matches raw example line 380-387
      if (jsonIris.bg_img) {
        this.log('Emitting camera frame, image data length:', jsonIris.bg_img.length)
        this.log('First 100 chars of image data:', jsonIris.bg_img.substring(0, 100))
        
        this.emit('cameraFrame', {
          imageData: jsonIris.bg_img,
          timestamp: Date.now()
        })
      }

      // Handle timestamp response
      if (jsonIris.currTimeStamp !== undefined) {
        this.emit('timestampReceived', { timestamp: jsonIris.currTimeStamp })
      }

      // Handle status code - matches raw example line 389-392
      if (jsonIris.statusCode) {
        this.lastStatusCode = jsonIris.statusCode
        if (jsonIris.statusCode === "5001") {
          this.deviceConnected = false
          this.setStatus(DeviceStatus.DISCONNECTED)
          this.emit('error', new Error('设备未接入'))
        } else {
          this.deviceConnected = true
        }
      }

    } catch (error) {
      this.log('Error processing message:', error)
    }
  }

  /**
   * Parse tracker output data to match C++ structure
   */
  private parseTrackerOutput(data: any): TrackerOutput {
    // If already parsed, return as-is
    if (data.haveLeftEyeInfo !== undefined) {
      return data
    }

    // Parse from raw format if needed
    return {
      haveLeftEyeInfo: data.haveLeftEyeInfo || false,
      haveLeftScreenPoint: data.haveLeftScreenPoint || false,
      haveRightEyeInfo: data.haveRightEyeInfo || false,
      haveRightScreenPoint: data.haveRightScreenPoint || false,
      tLeftEyeInfo: data.tLeftEyeInfo,
      tRightEyeInfo: data.tRightEyeInfo,
      tLeftScreenPoint: data.tLeftScreenPoint,
      tRightScreenPoint: data.tRightScreenPoint,
      tLeftSightLine: data.tLeftSightLine,
      tRightSightLine: data.tRightSightLine
    }
  }

  /**
   * Send next calibration point - matches raw example eyeCalibration()
   * finishedNum is 1-based (from device), matching the raw example
   */
  private sendNextCalibrationPoint(finishedNum: number): void {
    // Move to next point and send command
    // finishedNum is 1-based: 1 means first point finished, send second point
    switch (finishedNum) {
      case 1:
        // First point finished, send second point - matches raw example line 514-519
        setTimeout(() => {
          const point = this.calibrationPoints[1]
          this.sendCommand(createCalibrationCommand(point.x, point.y))
        }, 3000)
        break
      
      case 2:
        // Second point finished, send third point - matches raw example line 525-528
        setTimeout(() => {
          const point = this.calibrationPoints[2]
          this.sendCommand(createCalibrationCommand(point.x, point.y))
        }, 3000)
        break
      
      case 3:
        // Third point finished, send fourth point - matches raw example line 531-535
        setTimeout(() => {
          const point = this.calibrationPoints[3]
          this.sendCommand(createCalibrationCommand(point.x, point.y))
        }, 3000)
        break
      
      case 4:
        // Fourth point finished, send fifth point - matches raw example line 538-542
        setTimeout(() => {
          const point = this.calibrationPoints[4]
          this.sendCommand(createCalibrationCommand(point.x, point.y))
        }, 3000)
        break
      
      case 5:
        // Fifth point finished, calibration complete
        // checkCalibration command is sent in handleMessage
        break
    }
  }

  /**
   * Start tracking - matches raw example starteyeTracer()
   */
  startTracking(): void {
    this.sendCommand(COMMANDS.START_TRACKER)
    this.setStatus(DeviceStatus.TRACKING)
    this.isTracking = true
  }

  /**
   * Stop tracking
   */
  stopTracking(): void {
    this.sendCommand(COMMANDS.STOP_TRACKER)
    this.setStatus(DeviceStatus.CONNECTED)
    this.isTracking = false
  }

  /**
   * End camera - matches raw example endCamera()
   */
  endCamera(): void {
    this.sendCommand(COMMANDS.STOP_CAMERA)
    this.cameraEnabled = false
    this.emit('cameraStopped', undefined)
  }

  /**
   * Flip camera image
   */
  flipCamera(): void {
    this.sendCommand(COMMANDS.FLIP_CAMERA)
    this.cameraFlipped = !this.cameraFlipped
    this.emit('cameraFlipped', undefined)
  }

  /**
   * Get current timestamp from device
   */
  getCurrTimeStamp(): void {
    this.sendCommand(COMMANDS.GET_CURR_TIMESTAMP)
  }

  /**
   * Stop calibration
   */
  stopCalibration(): void {
    this.sendCommand(COMMANDS.STOP_CALIBRATION)
    this.isCalibrating = false
    this.calibrationFinished = false
    this.emit('calibrationCancelled', undefined)
    this.setStatus(DeviceStatus.CONNECTED)
  }

  /**
   * Restart calibration
   */
  restartCalibration(): void {
    this.sendCommand(COMMANDS.RESTART_CALIBRATION)
    this.isCalibrating = true
    this.calibrationStep = 0
    this.calibrationFinished = false
    this.emit('calibrationRestarted', undefined)
    this.setStatus(DeviceStatus.CALIBRATING)
  }

  /**
   * Send command - matches raw example Base64 encoding
   */
  private sendCommand(command: any): void {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      // Use btoa for Base64 encoding like raw example
      const decodedCmd = btoa(JSON.stringify(command))
      this.websocket.send(decodedCmd)
      this.log('Sent command:', command.req_cmd)
      
      // Extra debug for camera command
      if (command.req_cmd === 'startCamera') {
        this.log('Full camera command sent:', JSON.stringify(command))
      }
    }
  }

  /**
   * Set device status
   */
  private setStatus(status: DeviceStatus): void {
    if (this.status !== status) {
      this.status = status
      this.emit('statusChanged', status)
    }
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    // Turn off camera and light before disconnecting
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      if (this.cameraEnabled) {
        this.endCamera()
      }
      // Turn off IR light
      this.closeLight()
      
      // Give commands time to send before closing connection
      setTimeout(() => {
        if (this.websocket) {
          this.websocket.close()
          this.websocket = null
        }
      }, 100)
    } else if (this.websocket) {
      this.websocket.close()
      this.websocket = null
    }
    
    this.isCalibrating = false
    this.calibrationFinished = false
    this.cameraEnabled = false
    this.cameraFlipped = false
    this.isInitialized = false
    this.isTracking = false
    this.deviceConnected = false
    this.lastStatusCode = null
    this.setStatus(DeviceStatus.DISCONNECTED)
  }

  // Public data access methods

  getStatus(): DeviceStatus {
    return this.status
  }

  isCameraEnabled(): boolean {
    return this.cameraEnabled
  }

  isCameraFlipped(): boolean {
    return this.cameraFlipped
  }

  getData(): GazeData[] {
    return this.dataBuffer.getAll()
  }

  getRecentData(count: number): GazeData[] {
    return this.dataBuffer.getLast(count)
  }

  clearData(): void {
    this.dataBuffer.clear()
  }

  dispose(): void {
    this.disconnect()
    this.removeAllListeners()
    this.dataBuffer.clear()
  }

  // Status checking methods - matching raw client examples

  /**
   * Check if WebSocket connection is open
   */
  isConnected(): boolean {
    return this.websocket !== null && this.websocket.readyState === WebSocket.OPEN
  }

  /**
   * Check if device hardware is connected
   * Returns false if device sends statusCode 5001
   */
  isDeviceConnected(): boolean {
    return this.deviceConnected && this.isConnected()
  }

  /**
   * Check if device has been initialized
   */
  isDeviceInitialized(): boolean {
    return this.isInitialized
  }

  /**
   * Check if currently calibrating
   */
  isCalibrationInProgress(): boolean {
    return this.isCalibrating
  }

  /**
   * Check if calibration has been completed successfully
   */
  isCalibrationComplete(): boolean {
    return this.calibrationFinished
  }

  /**
   * Check if currently tracking
   */
  isTrackingActive(): boolean {
    return this.isTracking
  }

  /**
   * Get detailed status information
   */
  getDetailedStatus(): {
    connectionStatus: DeviceStatus
    websocketState: 'connecting' | 'open' | 'closing' | 'closed' | 'not_initialized'
    deviceConnected: boolean
    initialized: boolean
    calibrating: boolean
    calibrationComplete: boolean
    tracking: boolean
    cameraEnabled: boolean
    cameraFlipped: boolean
    lastStatusCode: string | null
  } {
    let wsState: 'connecting' | 'open' | 'closing' | 'closed' | 'not_initialized' = 'not_initialized'
    
    if (this.websocket) {
      switch (this.websocket.readyState) {
        case WebSocket.CONNECTING:
          wsState = 'connecting'
          break
        case WebSocket.OPEN:
          wsState = 'open'
          break
        case WebSocket.CLOSING:
          wsState = 'closing'
          break
        case WebSocket.CLOSED:
          wsState = 'closed'
          break
      }
    }

    return {
      connectionStatus: this.status,
      websocketState: wsState,
      deviceConnected: this.deviceConnected,
      initialized: this.isInitialized,
      calibrating: this.isCalibrating,
      calibrationComplete: this.calibrationFinished,
      tracking: this.isTracking,
      cameraEnabled: this.cameraEnabled,
      cameraFlipped: this.cameraFlipped,
      lastStatusCode: this.lastStatusCode
    }
  }

  /**
   * Check overall readiness for tracking
   * Returns true if device is connected, initialized, calibrated, and ready to track
   */
  isReady(): boolean {
    return this.isDeviceConnected() && 
           this.isDeviceInitialized() && 
           this.isCalibrationComplete() && 
           !this.isCalibrating
  }

  /**
   * Get last status code received from device
   */
  getLastStatusCode(): string | null {
    return this.lastStatusCode
  }
}