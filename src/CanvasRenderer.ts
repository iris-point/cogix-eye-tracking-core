/**
 * Canvas renderer for visualizing gaze data
 * Supports gaze points, trails, and calibration visualization
 */

import { EyeTracker } from './EyeTracker'
import { GazeData, DeviceStatus } from './types'

export interface CanvasRendererConfig {
  canvas?: HTMLCanvasElement | string
  showGazePoint?: boolean
  gazePointSize?: number
  gazePointColor?: string
  showTrail?: boolean
  trailLength?: number
  trailFadeOut?: boolean
  showHeatmap?: boolean
  clearOnStop?: boolean
  calibrationPointRadius?: number
  calibrationPointColor?: string
}

export class CanvasRenderer {
  private tracker: EyeTracker
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private config: Required<CanvasRendererConfig>
  private calibrationPoints: { x: number; y: number }[] = []
  private currentCalibrationIndex: number = -1
  private showCalibrationPoints: boolean = false
  private gazeTrail: GazeData[] = []
  private isActive: boolean = false
  private animationFrame: number | null = null

  constructor(tracker: EyeTracker, config?: CanvasRendererConfig) {
    this.tracker = tracker
    
    this.config = {
      canvas: (config?.canvas || null) as any,
      showGazePoint: config?.showGazePoint ?? true,
      gazePointSize: config?.gazePointSize ?? 10,
      gazePointColor: config?.gazePointColor ?? 'rgba(255, 0, 0, 0.8)',
      showTrail: config?.showTrail ?? false,
      trailLength: config?.trailLength ?? 20,
      trailFadeOut: config?.trailFadeOut ?? true,
      showHeatmap: config?.showHeatmap ?? false,
      clearOnStop: config?.clearOnStop ?? true,
      calibrationPointRadius: config?.calibrationPointRadius ?? 20,
      calibrationPointColor: config?.calibrationPointColor ?? 'rgba(0, 255, 0, 0.8)'
    }

    // Default 5-point calibration pattern
    this.calibrationPoints = [
      { x: 0.1, y: 0.1 },  // Top-left
      { x: 0.9, y: 0.1 },  // Top-right  
      { x: 0.5, y: 0.5 },  // Center
      { x: 0.1, y: 0.9 },  // Bottom-left
      { x: 0.9, y: 0.9 }   // Bottom-right
    ]

    // Initialize canvas if provided
    if (this.config.canvas) {
      this.setCanvas(this.config.canvas)
    }

    // Setup event listeners
    this.setupEventListeners()
  }

  /**
   * Set or change the canvas element
   */
  setCanvas(canvas: HTMLCanvasElement | string): void {
    // Resolve canvas element
    if (typeof canvas === 'string') {
      const element = document.querySelector(canvas) as HTMLCanvasElement
      if (!element) {
        console.warn(`Canvas element ${canvas} not found`)
        return
      }
      this.canvas = element
    } else {
      this.canvas = canvas
    }

    // Get context
    const ctx = this.canvas.getContext('2d')
    if (!ctx) {
      console.warn('Failed to get 2D context from canvas')
      return
    }
    this.ctx = ctx
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for gaze data
    this.tracker.on('gazeData', (data) => {
      if (this.isActive && this.ctx) {
        this.updateGazeData(data)
      }
    })

    // Listen for status changes
    this.tracker.on('statusChanged', (status) => {
      if (status === DeviceStatus.TRACKING) {
        this.start()
      } else if (status === DeviceStatus.CONNECTED && this.config.clearOnStop) {
        this.stop()
      }
    })

    // Listen for calibration events
    this.tracker.on('calibrationStarted', () => {
      this.showCalibrationPoints = true
      this.currentCalibrationIndex = 0
    })

    this.tracker.on('calibrationProgress', (data) => {
      this.currentCalibrationIndex = data.current
    })

    this.tracker.on('calibrationComplete', () => {
      this.hideCalibrationPoints()
    })

    this.tracker.on('calibrationCancelled', () => {
      this.hideCalibrationPoints()
    })
  }

  /**
   * Update gaze data and render
   */
  private updateGazeData(data: GazeData): void {
    // Add to trail if enabled
    if (this.config.showTrail) {
      this.gazeTrail.push(data)
      // Limit trail length
      if (this.gazeTrail.length > this.config.trailLength) {
        this.gazeTrail.shift()
      }
    }

    // Render frame
    this.render(data)
  }

  /**
   * Main render function
   */
  private render(currentGaze?: GazeData): void {
    if (!this.ctx || !this.canvas) return

    // Clear canvas
    this.clear()

    // Draw calibration points if showing
    if (this.showCalibrationPoints) {
      this.drawCalibrationPoints()
    }

    // Draw trail if enabled
    if (this.config.showTrail && this.gazeTrail.length > 0) {
      this.drawTrail()
    }

    // Draw current gaze point
    if (currentGaze && this.config.showGazePoint) {
      this.drawGazePoint(currentGaze)
    }
  }

  /**
   * Clear the canvas
   */
  clear(): void {
    if (!this.ctx || !this.canvas) return
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  /**
   * Draw a single gaze point
   */
  drawGazePoint(gazeData: GazeData): void {
    if (!this.ctx || !this.canvas) return

    const x = gazeData.x * this.canvas.width
    const y = gazeData.y * this.canvas.height

    // Draw gaze point
    this.ctx.beginPath()
    this.ctx.arc(x, y, this.config.gazePointSize, 0, Math.PI * 2)
    this.ctx.fillStyle = this.config.gazePointColor
    this.ctx.fill()

    // No confidence ring needed - removed
  }

  /**
   * Draw gaze trail
   */
  private drawTrail(): void {
    if (!this.ctx || !this.canvas) return

    for (let i = 0; i < this.gazeTrail.length - 1; i++) {
      const current = this.gazeTrail[i]
      const next = this.gazeTrail[i + 1]
      
      const x1 = current.x * this.canvas.width
      const y1 = current.y * this.canvas.height
      const x2 = next.x * this.canvas.width
      const y2 = next.y * this.canvas.height

      // Calculate opacity based on position in trail
      let opacity = 1
      if (this.config.trailFadeOut) {
        opacity = (i + 1) / this.gazeTrail.length
      }

      // Draw line segment
      this.ctx.beginPath()
      this.ctx.moveTo(x1, y1)
      this.ctx.lineTo(x2, y2)
      this.ctx.strokeStyle = `rgba(255, 0, 0, ${opacity * 0.5})`
      this.ctx.lineWidth = 2
      this.ctx.stroke()

      // Draw trail point
      this.ctx.beginPath()
      this.ctx.arc(x1, y1, 3, 0, Math.PI * 2)
      this.ctx.fillStyle = `rgba(255, 100, 100, ${opacity * 0.7})`
      this.ctx.fill()
    }
  }

  /**
   * Draw calibration points
   */
  private drawCalibrationPoints(): void {
    if (!this.ctx || !this.canvas) return

    this.calibrationPoints.forEach((point, index) => {
      const x = point.x * this.canvas!.width
      const y = point.y * this.canvas!.height

      // Draw outer circle
      this.ctx!.beginPath()
      this.ctx!.arc(x, y, this.config.calibrationPointRadius, 0, Math.PI * 2)
      this.ctx!.strokeStyle = this.config.calibrationPointColor
      this.ctx!.lineWidth = 2
      this.ctx!.stroke()

      // Draw inner dot
      this.ctx!.beginPath()
      this.ctx!.arc(x, y, 3, 0, Math.PI * 2)
      this.ctx!.fillStyle = this.config.calibrationPointColor
      this.ctx!.fill()

      // Highlight current calibration point
      if (index === this.currentCalibrationIndex) {
        this.ctx!.beginPath()
        this.ctx!.arc(x, y, this.config.calibrationPointRadius + 5, 0, Math.PI * 2)
        this.ctx!.strokeStyle = 'yellow'
        this.ctx!.lineWidth = 3
        this.ctx!.stroke()
      }

      // Draw point number
      this.ctx!.fillStyle = 'white'
      this.ctx!.font = '12px Arial'
      this.ctx!.textAlign = 'center'
      this.ctx!.textBaseline = 'middle'
      this.ctx!.fillText((index + 1).toString(), x, y)
    })
  }

  /**
   * Show specific calibration point
   */
  showCalibrationPoint(index: number): void {
    this.currentCalibrationIndex = index
    this.showCalibrationPoints = true
    this.render()
  }

  /**
   * Hide calibration points
   */
  hideCalibrationPoints(): void {
    this.showCalibrationPoints = false
    this.currentCalibrationIndex = -1
    if (this.config.clearOnStop) {
      this.clear()
    }
  }

  /**
   * Start rendering
   */
  start(): void {
    this.isActive = true
    this.gazeTrail = []
  }

  /**
   * Stop rendering
   */
  stop(): void {
    this.isActive = false
    if (this.config.clearOnStop) {
      this.clear()
      this.gazeTrail = []
    }
  }

  /**
   * Set canvas size
   */
  setSize(width: number, height: number): void {
    if (!this.canvas) return
    this.canvas.width = width
    this.canvas.height = height
    this.clear()
  }

  /**
   * Reset the renderer
   */
  reset(): void {
    this.currentCalibrationIndex = -1
    this.gazeTrail = []
    this.clear()
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CanvasRendererConfig>): void {
    Object.assign(this.config, config)
    if (config.canvas) {
      this.setCanvas(config.canvas)
    }
  }

  /**
   * Destroy the renderer
   */
  destroy(): void {
    this.stop()
    this.reset()
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
    }
  }
}