/**
 * Calibration UI Manager
 * Handles calibration visualization and user interaction
 */

import { EyeTracker } from './EyeTracker'
import { CalibrationPoint, DeviceStatus } from './types'

export interface CalibrationUIConfig {
  canvas?: HTMLCanvasElement | string
  pointDuration?: number
  pointSize?: number
  pointColor?: string
  backgroundColor?: string
  showInstructions?: boolean
  instructionText?: string
  autoFullscreen?: boolean
}

export class CalibrationUI {
  private tracker: EyeTracker
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private config: Required<CalibrationUIConfig>
  private calibrationPoints: CalibrationPoint[] = []
  private currentPointIndex: number = -1
  private isVisible: boolean = false
  private animationFrame: number | null = null
  private pointTimer: NodeJS.Timeout | null = null

  constructor(tracker: EyeTracker, config?: CalibrationUIConfig) {
    this.tracker = tracker
    
    this.config = {
      canvas: (config?.canvas || null) as any,
      pointDuration: config?.pointDuration ?? 3000,
      pointSize: config?.pointSize ?? 20,
      pointColor: config?.pointColor ?? '#4CAF50',
      backgroundColor: config?.backgroundColor ?? 'rgba(0, 0, 0, 0.95)',
      showInstructions: config?.showInstructions ?? false,  // Default to no instructions for cleaner UI
      instructionText: config?.instructionText ?? 'Follow the green dot with your eyes',
      autoFullscreen: config?.autoFullscreen ?? true  // Default to fullscreen like raw example
    }

    // Default 5-point calibration pattern
    this.calibrationPoints = [
      { x: 0.1, y: 0.1, samples: [], error: 0 },  // Top-left
      { x: 0.9, y: 0.1, samples: [], error: 0 },  // Top-right  
      { x: 0.5, y: 0.5, samples: [], error: 0 },  // Center
      { x: 0.1, y: 0.9, samples: [], error: 0 },  // Bottom-left
      { x: 0.9, y: 0.9, samples: [], error: 0 }   // Bottom-right
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
    // Listen for calibration events
    this.tracker.on('calibrationStarted', (data) => {
      this.start()
    })

    this.tracker.on('calibrationProgress', (data) => {
      // data.current represents the point index to display
      // When current=0, show first point (initial)
      // When current=1, show second point (after first finished), etc.
      this.currentPointIndex = data.current
      // The animation loop will draw the current point
    })

    this.tracker.on('calibrationComplete', () => {
      this.hide()
    })

    this.tracker.on('calibrationCancelled', () => {
      this.hide()
    })
  }

  /**
   * Start calibration UI
   */
  start(): void {
    if (!this.canvas) {
      console.warn('No canvas set for calibration UI')
      return
    }

    this.isVisible = true
    this.currentPointIndex = -1  // Will be set to 0 by calibrationProgress event
    
    // Enter fullscreen if configured
    if (this.config.autoFullscreen && document.fullscreenElement === null) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Failed to enter fullscreen:', err)
      })
    }

    // Show canvas
    this.canvas.style.display = 'block'
    
    // Start animation
    this.animate()
  }

  /**
   * Show specific calibration point
   */
  showPoint(index: number): void {
    if (index < 0 || index >= this.calibrationPoints.length) {
      return
    }

    this.currentPointIndex = index
    // No timer needed - the tracker handles the timing
  }

  /**
   * Animation loop
   */
  private animate(): void {
    if (!this.isVisible || !this.ctx || !this.canvas) {
      return
    }

    // Clear canvas
    this.ctx.fillStyle = this.config.backgroundColor
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw current calibration point
    if (this.currentPointIndex >= 0 && this.currentPointIndex < this.calibrationPoints.length) {
      const point = this.calibrationPoints[this.currentPointIndex]
      this.drawCalibrationPoint(point)
    }

    // Draw minimal instructions if enabled
    if (this.config.showInstructions) {
      this.drawMinimalInstructions()
    }

    // Continue animation
    this.animationFrame = requestAnimationFrame(() => this.animate())
  }

  /**
   * Draw calibration point with animation
   */
  private drawCalibrationPoint(point: CalibrationPoint): void {
    if (!this.ctx || !this.canvas) return

    const x = point.x * this.canvas.width
    const y = point.y * this.canvas.height
    
    // Animated pulsing effect
    const time = Date.now() / 1000
    const pulse = Math.sin(time * 3) * 0.2 + 0.8
    const size = this.config.pointSize * pulse

    // Draw outer ring
    this.ctx.beginPath()
    this.ctx.arc(x, y, size + 10, 0, Math.PI * 2)
    this.ctx.strokeStyle = this.config.pointColor
    this.ctx.lineWidth = 2
    this.ctx.stroke()

    // Draw main point
    this.ctx.beginPath()
    this.ctx.arc(x, y, size, 0, Math.PI * 2)
    this.ctx.fillStyle = this.config.pointColor
    this.ctx.fill()

    // Draw center dot
    this.ctx.beginPath()
    this.ctx.arc(x, y, 3, 0, Math.PI * 2)
    this.ctx.fillStyle = 'white'
    this.ctx.fill()

    // Draw progress indicator
    const progress = (this.currentPointIndex + 1) / this.calibrationPoints.length
    this.ctx.beginPath()
    this.ctx.arc(x, y, size + 20, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progress), false)
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    this.ctx.lineWidth = 3
    this.ctx.stroke()
  }

  /**
   * Draw minimal instructions (just progress)
   */
  private drawMinimalInstructions(): void {
    if (!this.ctx || !this.canvas) return

    const progress = `${this.currentPointIndex + 1} / ${this.calibrationPoints.length}`

    // Draw minimal progress indicator at bottom
    this.ctx.font = '14px Arial'
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'bottom'
    this.ctx.fillText(progress, this.canvas.width / 2, this.canvas.height - 20)
    
    // Draw escape instruction at top
    this.ctx.font = '12px Arial'
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'top'
    this.ctx.fillText('Press ESC or Stop button to cancel calibration', this.canvas.width / 2, 20)
  }

  /**
   * Draw instructions (legacy method for compatibility)
   */
  private drawInstructions(): void {
    this.drawMinimalInstructions()
  }

  /**
   * Hide calibration UI
   */
  hide(): void {
    this.isVisible = false
    
    // Cancel animation
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }

    // Clear timer
    if (this.pointTimer) {
      clearTimeout(this.pointTimer)
      this.pointTimer = null
    }

    // Hide canvas
    if (this.canvas) {
      this.canvas.style.display = 'none'
      if (this.ctx) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      }
    }

    // Don't exit fullscreen - let the experiment control fullscreen mode
    // This was causing issues with experiments that want to stay in fullscreen
    /*
    if (this.config.autoFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(err => {
        console.warn('Failed to exit fullscreen:', err)
      })
    }
    */
  }

  /**
   * Set canvas size
   */
  setSize(width: number, height: number): void {
    if (!this.canvas) return
    this.canvas.width = width
    this.canvas.height = height
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CalibrationUIConfig>): void {
    Object.assign(this.config, config)
    if (config.canvas) {
      this.setCanvas(config.canvas)
    }
  }

  /**
   * Reset calibration UI
   */
  reset(): void {
    this.currentPointIndex = -1
    this.hide()
  }

  /**
   * Destroy the UI
   */
  destroy(): void {
    this.hide()
    this.canvas = null
    this.ctx = null
  }
}