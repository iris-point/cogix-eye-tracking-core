/**
 * @iris-point/eye-tracking-core
 * Minimal eye tracking library for WebSocket-based hardware eye trackers
 */

// Main imports and exports
import { EyeTracker } from './EyeTracker'
import { CalibrationUI } from './CalibrationUI'
import { CanvasRenderer } from './CanvasRenderer'
import { DataBuffer } from './DataBuffer'
import { EventEmitter } from './EventEmitter'
import { DeviceStatus, CoreConfig } from './types'

// Re-export everything
export { EyeTracker }
export { CalibrationUI }
export { CanvasRenderer }
export { DataBuffer }
export { EventEmitter }
export { DeviceStatus }

// Type exports
export type {
  GazeData,
  CalibrationPoint,
  CalibrationResult,
  DeviceInfo,
  CoreConfig,
  EventCallback,
  EventMap
} from './types'

// Factory function
export function createEyeTracker(config?: CoreConfig): EyeTracker {
  return new EyeTracker(config)
}

// Version from package.json
export const VERSION = '0.0.1' // This is updated automatically during build

// Browser global for CDN usage
if (typeof window !== 'undefined') {
  (window as any).IrisPointEyeTracking = {
    EyeTracker,
    CalibrationUI,
    CanvasRenderer,
    DataBuffer,
    EventEmitter,
    createEyeTracker,
    DeviceStatus,
    VERSION
  }
}