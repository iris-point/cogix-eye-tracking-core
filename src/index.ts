/**
 * Cogix Eye Tracking Core
 * Minimal eye tracking library for WebSocket-based hardware eye trackers
 */

export { EyeTrackerCore } from './EyeTrackerCore'
export { CanvasRenderer } from './CanvasRenderer'
export { DataBuffer } from './DataBuffer'
export { EventEmitter } from './EventEmitter'

export type {
  GazeData,
  CalibrationPoint,
  CalibrationResult,
  DeviceStatus,
  DeviceInfo,
  CoreConfig,
  EventCallback,
  EventMap
} from './types'

// Export DeviceStatus enum values
export { DeviceStatus } from './types'

// Convenience factory function
export function createEyeTracker(config?: CoreConfig): EyeTrackerCore {
  return new EyeTrackerCore(config)
}

// Version
export const VERSION = '1.0.0'

// Browser global for CDN usage
if (typeof window !== 'undefined') {
  (window as any).IrisPointEyeTracking = {
    EyeTrackerCore,
    CanvasRenderer,
    DataBuffer,
    EventEmitter,
    createEyeTracker,
    DeviceStatus,
    VERSION
  }
}