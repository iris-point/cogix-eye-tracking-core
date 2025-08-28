/**
 * Minimal type definitions for core eye tracking
 * Reusing types from the main SDK where appropriate
 */

export interface GazeData {
  timestamp: number
  x: number           // Normalized [0,1]
  y: number           // Normalized [0,1]
  confidence?: number
  leftEye?: {
    x: number
    y: number
  }
  rightEye?: {
    x: number
    y: number
  }
}

export interface CalibrationPoint {
  x: number           // Normalized [0,1]
  y: number           // Normalized [0,1]
  samples?: GazeData[]
  error?: number
}

export interface CalibrationResult {
  success: boolean
  points: CalibrationPoint[]
  accuracy?: number
  error?: string
}

export enum DeviceStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  CALIBRATING = 'calibrating',
  TRACKING = 'tracking',
  ERROR = 'error'
}

export interface DeviceInfo {
  provider: string
  model: string
  samplingRate: number
}

export interface CoreConfig {
  wsUrl?: string | string[]      // WebSocket URL(s) to try
  reconnectAttempts?: number     // Number of reconnect attempts
  reconnectDelay?: number        // Delay between reconnects in ms
  bufferSize?: number           // Size of internal data buffer
  autoConnect?: boolean         // Auto-connect on initialization
  debug?: boolean              // Enable debug logging
}

export type EventCallback<T = any> = (data: T) => void

export interface EventMap {
  connected: void
  disconnected: void
  error: Error
  ready: { initialized: boolean }
  statusChanged: DeviceStatus
  gazeData: GazeData
  calibrationStarted: { points: number }
  calibrationProgress: { current: number; total: number }
  calibrationComplete: CalibrationResult
  calibrationCancelled: void
  cameraFrame: { imageData: string; timestamp: number }
}