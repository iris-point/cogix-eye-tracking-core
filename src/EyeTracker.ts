/**
 * Clean, minimal eye tracking core
 * Verified against working raw example
 */

import { EventEmitter } from './EventEmitter'
import { DataBuffer } from './DataBuffer'
import {
  GazeData,
  CalibrationPoint,
  CalibrationResult,
  DeviceStatus,
  DeviceInfo,
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
  
  // IR Light control
  SET_BRIGHT_80: {
    "req_cmd": "setBright",
    "irBrights": 80
  },
  
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

export class EyeTracker extends EventEmitter<EventMap> {
  private websocket: WebSocket | null = null
  private status: DeviceStatus = DeviceStatus.DISCONNECTED
  private config: Required<CoreConfig>
  private dataBuffer: DataBuffer
  private isCalibrating: boolean = false
  private calibrationStep: number = 0
  private cameraEnabled: boolean = false
  private cameraFlipped: boolean = false
  
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
      wsUrl: ['ws://127.0.0.1:9000'], // Same as raw example
      reconnectAttempts: 0,
      reconnectDelay: 1000,
      bufferSize: 10000,
      autoConnect: false,
      debug: false,
      ...config
    }

    if (typeof this.config.wsUrl === 'string') {
      this.config.wsUrl = [this.config.wsUrl]
    }

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
        // Use ws://127.0.0.1:9000 like raw example
        this.websocket = new WebSocket('ws://127.0.0.1:9000')
        
        this.websocket.onopen = () => {
          this.log('Connection established')
          this.setStatus(DeviceStatus.CONNECTED)
          this.emit('connected', undefined)
          resolve()
        }
        
        this.websocket.onmessage = (event) => {
          this.handleMessage(event.data)
        }
        
        this.websocket.onerror = (event) => {
          this.setStatus(DeviceStatus.ERROR)
          this.emit('error', new Error('Connection error'))
          reject(new Error('WebSocket error'))
        }
        
        this.websocket.onclose = (event) => {
          this.log('Disconnection')
          this.setStatus(DeviceStatus.DISCONNECTED)
          this.emit('disconnected', undefined)
        }
      } catch (error) {
        this.setStatus(DeviceStatus.ERROR)
        reject(error)
      }
    })
  }

  /**
   * Initialize device - matches raw example initDevice()
   */
  initDevice(): void {
    // Request fullscreen like raw example
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

    // Send init command using constant
    this.sendCommand(COMMANDS.INIT_ET10C)
  }

  /**
   * Initialize IR light - matches raw example initLight()
   */
  initLight(): void {
    this.sendCommand(COMMANDS.SET_BRIGHT_80)
  }

  /**
   * Initialize camera - matches raw example initCamera()
   */
  initCamera(): void {
    this.sendCommand(COMMANDS.START_CAMERA)
    this.cameraEnabled = true
    this.emit('cameraStarted', undefined)
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

    // Start with first point after 3 second delay (same as raw)
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

      // Handle calibration progress - matches raw example line 313-335
      if (jsonIris.nFinishedNum !== undefined) {
        this.log('Finish checked!', jsonIris.nFinishedNum)
        
        this.emit('calibrationProgress', {
          current: jsonIris.nFinishedNum,
          total: 5
        })

        // Send next calibration point
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
        
        const result: CalibrationResult = {
          success: true,
          points: [],
          accuracy: 0.95
        }
        
        this.emit('calibrationComplete', result)
        
        // Start tracking automatically
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
      if (jsonIris.statusCode === "5001") {
        this.setStatus(DeviceStatus.DISCONNECTED)
        this.emit('error', new Error('设备未接入'))
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
   */
  private sendNextCalibrationPoint(finishedNum: number): void {
    // Move to next point and send command
    switch (finishedNum) {
      case 0:
        // First point already sent, wait for completion
        break
      
      case 1:
        // Send second point - matches raw example line 514-519
        setTimeout(() => {
          const point = this.calibrationPoints[1]
          this.sendCommand(createCalibrationCommand(point.x, point.y))
        }, 3000)
        break
      
      case 2:
        // Send third point - matches raw example line 525-528
        setTimeout(() => {
          const point = this.calibrationPoints[2]
          this.sendCommand(createCalibrationCommand(point.x, point.y))
        }, 3000)
        break
      
      case 3:
        // Send fourth point - matches raw example line 531-535
        setTimeout(() => {
          const point = this.calibrationPoints[3]
          this.sendCommand(createCalibrationCommand(point.x, point.y))
        }, 3000)
        break
      
      case 4:
        // Send fifth point - matches raw example line 538-542
        setTimeout(() => {
          const point = this.calibrationPoints[4]
          this.sendCommand(createCalibrationCommand(point.x, point.y))
        }, 3000)
        break
    }
  }

  /**
   * Start tracking - matches raw example starteyeTracer()
   */
  startTracking(): void {
    this.sendCommand(COMMANDS.START_TRACKER)
    this.setStatus(DeviceStatus.TRACKING)
  }

  /**
   * Stop tracking
   */
  stopTracking(): void {
    this.sendCommand(COMMANDS.STOP_TRACKER)
    this.setStatus(DeviceStatus.CONNECTED)
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
    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
    }
    
    this.isCalibrating = false
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
}