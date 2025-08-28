/**
 * Core eye tracking interface - minimal wrapper around HH WebSocket protocol
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
  EventMap
} from './types'

export class EyeTrackerCore extends EventEmitter<EventMap> {
  private websocket: WebSocket | null = null
  private status: DeviceStatus = DeviceStatus.DISCONNECTED
  private config: Required<CoreConfig>
  private dataBuffer: DataBuffer
  private reconnectTimer: NodeJS.Timeout | null = null
  private reconnectCount: number = 0
  
  // Calibration state
  private isCalibrating: boolean = false
  private calibrationPoints: CalibrationPoint[] = []
  private currentCalibrationPoint: number = 0
  private calibrationConfig = {
    numPoints: 5,
    points: [
      { x: 0.1, y: 0.1 },  // Top-left
      { x: 0.9, y: 0.1 },  // Top-right  
      { x: 0.5, y: 0.5 },  // Center
      { x: 0.1, y: 0.9 },  // Bottom-left
      { x: 0.9, y: 0.9 }   // Bottom-right
    ]
  }

  // HH Protocol commands
  private readonly commands = {
    init: {
      req_cmd: 'init_et10c',
      eyeType: 0,
      resType: '640x368x30',
      numpoint: 5,
      sceenTypeIndex: 1
    },
    setBright: {
      req_cmd: 'setBright',
      irBrights: 80
    },
    startCamera: { 
      req_cmd: 'startCamera'
    },
    stopCamera: { 
      req_cmd: 'stopCamera'
    },
    flipCamera: {
      req_cmd: 'filpCamera' // HH's typo
    },
    startCalibration: (x: number, y: number) => ({
      req_cmd: 'startCalibration',
      point_x: x,
      point_y: y
    }),
    stopCalibration: { 
      req_cmd: 'stopCalibration' 
    },
    checkCalibration: { 
      req_cmd: 'checkCabliration' // HH's typo
    },
    restartCalibration: { 
      req_cmd: 'restartCalibration' 
    },
    startTracker: { 
      req_cmd: 'startTracker' 
    },
    stopTracker: { 
      req_cmd: 'stopTracker' 
    },
    getCurrTimeStamp: { 
      req_cmd: 'getCurrTimeStamp' 
    }
  }

  private deviceInfo: DeviceInfo = {
    provider: 'HH Eye Tracker',
    model: 'HH Hardware Device',
    samplingRate: 60
  }

  constructor(config?: CoreConfig) {
    super()
    
    this.config = {
      wsUrl: ['wss://localhost:8443', 'ws://localhost:9000'],
      reconnectAttempts: 3,
      reconnectDelay: 1000,
      bufferSize: 10000,
      autoConnect: false,
      debug: false,
      ...config
    }

    // Ensure wsUrl is an array
    if (typeof this.config.wsUrl === 'string') {
      this.config.wsUrl = [this.config.wsUrl]
    }

    this.dataBuffer = new DataBuffer(this.config.bufferSize)

    if (this.config.autoConnect) {
      this.connect()
    }
  }

  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[EyeTrackerCore]', ...args)
    }
  }

  private setStatus(status: DeviceStatus): void {
    if (this.status !== status) {
      this.status = status
      this.emit('statusChanged', status)
      this.log('Status changed:', status)
    }
  }

  async connect(): Promise<void> {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.log('Already connected')
      return
    }

    const urls = Array.isArray(this.config.wsUrl) ? this.config.wsUrl : [this.config.wsUrl]
    let connectionAttempt = 0

    const tryConnect = (wsUrl: string): Promise<void> => {
      this.setStatus(DeviceStatus.CONNECTING)
      
      return new Promise((resolve, reject) => {
        try {
          this.log('Attempting connection to:', wsUrl)
          this.websocket = new WebSocket(wsUrl)
          
          const connectionTimeout = setTimeout(() => {
            if (this.websocket) {
              this.websocket.close()
              this.websocket = null
            }
            
            connectionAttempt++
            if (connectionAttempt < urls.length) {
              tryConnect(urls[connectionAttempt]).then(resolve).catch(reject)
            } else {
              this.setStatus(DeviceStatus.DISCONNECTED)
              reject(new Error(`Failed to connect to eye tracker. Tried: ${urls.join(', ')}`))
            }
          }, 5000)

          this.websocket.onopen = () => {
            clearTimeout(connectionTimeout)
            this.log('WebSocket connected')
            this.setStatus(DeviceStatus.CONNECTED)
            this.emit('connected', undefined)
            this.emit('ready', { initialized: true })
            
            // Send initialization commands
            setTimeout(() => {
              this.sendCommand(this.commands.init)
              setTimeout(() => {
                this.sendCommand(this.commands.setBright)
                setTimeout(() => {
                  this.sendCommand(this.commands.startCamera)
                }, 100)
              }, 100)
            }, 100)
            
            this.reconnectCount = 0
            resolve()
          }

          this.websocket.onmessage = (event) => {
            try {
              this.handleMessage(event.data)
            } catch (err) {
              this.log('Error handling message:', err)
            }
          }

          this.websocket.onerror = (error) => {
            clearTimeout(connectionTimeout)
            this.log('WebSocket error:', error)
            
            connectionAttempt++
            if (connectionAttempt < urls.length) {
              if (this.websocket) {
                this.websocket.close()
                this.websocket = null
              }
              tryConnect(urls[connectionAttempt]).then(resolve).catch(reject)
            } else {
              this.setStatus(DeviceStatus.ERROR)
              this.emit('error', new Error('WebSocket connection error'))
              reject(new Error('Failed to connect to eye tracker'))
            }
          }

          this.websocket.onclose = (event) => {
            clearTimeout(connectionTimeout)
            this.log('WebSocket closed:', event.code, event.reason)
            
            if (connectionAttempt >= urls.length - 1) {
              this.setStatus(DeviceStatus.DISCONNECTED)
              this.emit('disconnected', undefined)
              
              // Auto-reconnect if not manual close
              if (event.code !== 1000) {
                this.attemptReconnect()
              }
            }
          }
        } catch (error) {
          this.log('Connection error:', error)
          
          connectionAttempt++
          if (connectionAttempt < urls.length) {
            tryConnect(urls[connectionAttempt]).then(resolve).catch(reject)
          } else {
            this.setStatus(DeviceStatus.ERROR)
            reject(error)
          }
        }
      })
    }

    return tryConnect(urls[0])
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
    }

    this.isCalibrating = false
    this.currentCalibrationPoint = 0
    this.calibrationPoints = []
    
    this.setStatus(DeviceStatus.DISCONNECTED)
    this.emit('disconnected', undefined)
  }

  private attemptReconnect(): void {
    if (this.reconnectCount < this.config.reconnectAttempts) {
      this.reconnectCount++
      this.log(`Reconnecting... (attempt ${this.reconnectCount}/${this.config.reconnectAttempts})`)
      
      this.reconnectTimer = setTimeout(() => {
        this.connect().catch(err => {
          this.log('Reconnection failed:', err)
        })
      }, this.config.reconnectDelay)
    }
  }

  private sendCommand(command: any): void {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      const jsonString = JSON.stringify(command)
      const encodedCommand = btoa(jsonString) // Base64 encode
      this.websocket.send(encodedCommand)
      this.log('Sent command:', command.req_cmd)
    }
  }

  private handleMessage(data: string): void {
    let decodedData: string
    try {
      decodedData = atob(data) // Decode from Base64
    } catch {
      decodedData = data
    }

    let message: any
    try {
      message = JSON.parse(decodedData)
    } catch {
      return
    }

    // Handle calibration progress
    if (message.nFinishedNum !== undefined) {
      this.emit('calibrationProgress', {
        current: message.nFinishedNum,
        total: this.calibrationConfig.numPoints
      })

      // Move to next calibration point
      if (message.nFinishedNum < this.calibrationConfig.numPoints) {
        const nextPointIndex = message.nFinishedNum
        const nextPoint = this.calibrationConfig.points[nextPointIndex]
        
        setTimeout(() => {
          this.sendCommand(this.commands.startCalibration(nextPoint.x, nextPoint.y))
        }, 3000) // 3 second delay between points
      } else if (message.nFinishedNum === this.calibrationConfig.numPoints) {
        // All points done, check calibration
        setTimeout(() => {
          this.sendCommand(this.commands.checkCalibration)
        }, 1000)
      }
    }

    // Handle calibration complete
    if (message.cablicFinished) {
      const result: CalibrationResult = {
        success: true,
        points: this.calibrationPoints,
        accuracy: 0.95
      }
      
      this.emit('calibrationComplete', result)
      this.isCalibrating = false
      
      // Start tracking automatically
      setTimeout(() => {
        this.startTracking()
      }, 500)
    }

    // Handle tracking data
    if (message.trakcerOutput) {
      this.handleTrackingData(message.trakcerOutput)
    }

    // Handle camera frame
    if (message.bg_img) {
      this.emit('cameraFrame', {
        imageData: message.bg_img,
        timestamp: Date.now()
      })

      // Update status if needed
      if (this.status === DeviceStatus.ERROR || this.status === DeviceStatus.CONNECTING) {
        this.setStatus(DeviceStatus.CONNECTED)
      }
    }

    // Handle status codes
    if (message.statusCode) {
      if (message.statusCode === "5001" || message.statusCode === 5001) {
        this.setStatus(DeviceStatus.DISCONNECTED)
        this.emit('error', new Error('Eye tracking hardware not connected'))
      } else if (message.statusCode === "5000" || message.statusCode === 5000) {
        if (this.status === DeviceStatus.ERROR || this.status === DeviceStatus.CONNECTING) {
          this.setStatus(DeviceStatus.CONNECTED)
        }
      }
    }
  }

  private handleTrackingData(data: any): void {
    let x = 0, y = 0, count = 0

    if (data.tLeftScreenPoint) {
      x += data.tLeftScreenPoint.f32X
      y += data.tLeftScreenPoint.f32Y
      count++
    }

    if (data.tRightScreenPoint) {
      x += data.tRightScreenPoint.f32X
      y += data.tRightScreenPoint.f32Y
      count++
    }

    if (count > 0) {
      x = x / count
      y = y / count

      const gazeData: GazeData = {
        timestamp: Date.now(),
        x: x,  // Normalized [0,1]
        y: y,  // Normalized [0,1]
        confidence: 0.9
      }

      if (data.tLeftScreenPoint) {
        gazeData.leftEye = {
          x: data.tLeftScreenPoint.f32X,
          y: data.tLeftScreenPoint.f32Y
        }
      }

      if (data.tRightScreenPoint) {
        gazeData.rightEye = {
          x: data.tRightScreenPoint.f32X,
          y: data.tRightScreenPoint.f32Y
        }
      }

      this.dataBuffer.add(gazeData)
      this.emit('gazeData', gazeData)
    }
  }

  // Public API methods

  startCalibration(points: number = 5): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to eye tracker')
    }

    if (this.status !== DeviceStatus.CONNECTED) {
      throw new Error(`Device must be connected before calibration (current: ${this.status})`)
    }

    this.isCalibrating = true
    this.currentCalibrationPoint = 0
    this.calibrationPoints = []
    
    this.setStatus(DeviceStatus.CALIBRATING)
    this.emit('calibrationStarted', { points })

    // Start with first calibration point after delay
    const firstPoint = this.calibrationConfig.points[0]
    setTimeout(() => {
      this.sendCommand(this.commands.startCalibration(firstPoint.x, firstPoint.y))
    }, 3000)
  }

  cancelCalibration(): void {
    this.isCalibrating = false
    this.currentCalibrationPoint = 0
    this.calibrationPoints = []
    this.sendCommand(this.commands.stopCalibration)
    this.setStatus(DeviceStatus.CONNECTED)
    this.emit('calibrationCancelled', undefined)
  }

  startTracking(): void {
    if (this.status === DeviceStatus.TRACKING) {
      return
    }

    if (this.status !== DeviceStatus.CONNECTED && this.status !== DeviceStatus.CALIBRATING) {
      throw new Error(`Device must be connected or calibrated to start tracking (current: ${this.status})`)
    }

    this.sendCommand(this.commands.startTracker)
    this.setStatus(DeviceStatus.TRACKING)
  }

  stopTracking(): void {
    this.sendCommand(this.commands.stopTracker)
    this.setStatus(DeviceStatus.CONNECTED)
  }

  // Data access methods

  getStatus(): DeviceStatus {
    return this.status
  }

  getDeviceInfo(): DeviceInfo {
    return { ...this.deviceInfo }
  }

  getData(): GazeData[] {
    return this.dataBuffer.getAll()
  }

  getRecentData(count: number): GazeData[] {
    return this.dataBuffer.getLast(count)
  }

  getDataInTimeRange(startTime: number, endTime: number): GazeData[] {
    return this.dataBuffer.getTimeRange(startTime, endTime)
  }

  clearData(): void {
    this.dataBuffer.clear()
  }

  // Utility methods

  setBrightness(brightness: number): void {
    if (brightness < 0 || brightness > 100) {
      throw new Error('Brightness must be between 0 and 100')
    }
    
    this.sendCommand({
      req_cmd: 'setBright',
      irBrights: brightness
    })
  }

  flipCamera(): void {
    this.sendCommand(this.commands.flipCamera)
  }

  async getCurrentTimestamp(): Promise<number> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for timestamp'))
      }, 5000)

      const handler = (data: any) => {
        if (data.timestamp !== undefined) {
          clearTimeout(timeout)
          this.off('gazeData', handler)
          resolve(data.timestamp)
        }
      }

      this.on('gazeData', handler)
      this.sendCommand(this.commands.getCurrTimeStamp)
    })
  }

  // Cleanup

  dispose(): void {
    this.disconnect()
    this.removeAllListeners()
    this.dataBuffer.clear()
  }
}