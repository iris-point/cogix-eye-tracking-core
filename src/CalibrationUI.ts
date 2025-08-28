/**
 * Fullscreen Calibration UI Manager
 * Creates a fullscreen overlay for calibration that's always on top
 */

import { CalibrationPoint } from './types'

export interface CalibrationUIConfig {
  pointRadius?: number
  pointColor?: string
  backgroundColor?: string
  showInstructions?: boolean
  instructionText?: string
  autoFullscreen?: boolean
}

export class CalibrationUI {
  private static globalInstance: CalibrationUI | null = null
  
  private overlay: HTMLDivElement | null = null
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private config: Required<CalibrationUIConfig>
  private calibrationPoints: CalibrationPoint[] = []
  private currentPointIndex: number = -1
  private isVisible: boolean = false
  private animationFrame: number | null = null

  constructor(config?: CalibrationUIConfig) {
    this.config = {
      pointRadius: 20,
      pointColor: 'rgba(0, 255, 0, 0.8)',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      showInstructions: true,
      instructionText: 'Follow the green dot with your eyes',
      autoFullscreen: true,
      ...config
    }

    // Default 5-point calibration pattern
    this.calibrationPoints = [
      { x: 0.1, y: 0.1, samples: [], error: 0 },  // Top-left
      { x: 0.9, y: 0.1, samples: [], error: 0 },  // Top-right  
      { x: 0.5, y: 0.5, samples: [], error: 0 },  // Center
      { x: 0.1, y: 0.9, samples: [], error: 0 },  // Bottom-left
      { x: 0.9, y: 0.9, samples: [], error: 0 }   // Bottom-right
    ]
  }

  /**
   * Show calibration UI in fullscreen
   */
  show(): void {
    if (this.isVisible) return

    // Request fullscreen if enabled
    if (this.config.autoFullscreen) {
      this.requestFullscreen()
    }

    // Create overlay
    this.createOverlay()
    this.isVisible = true
    
    // Ensure overlay stays on top even in complex frameworks
    this.ensureOnTop()
  }
  
  /**
   * Force the calibration UI to the top of the DOM
   * This handles cases where frameworks might add elements after our overlay
   */
  private ensureOnTop(): void {
    if (!this.overlay) return
    
    // Use a small delay to ensure it happens after any framework rendering
    setTimeout(() => {
      if (this.overlay && document.body) {
        // Move to end of body
        document.body.appendChild(this.overlay)
        
        // Force highest z-index again in case it was overridden
        this.overlay.style.zIndex = '2147483647'
        
        // Also check and fix every 100ms during calibration
        const checkInterval = setInterval(() => {
          if (this.overlay && this.isVisible) {
            if (this.overlay.parentNode !== document.body || 
                this.overlay !== document.body.lastElementChild) {
              document.body.appendChild(this.overlay)
            }
          } else {
            clearInterval(checkInterval)
          }
        }, 100)
      }
    }, 0)
  }

  /**
   * Hide calibration UI
   */
  hide(): void {
    if (!this.isVisible) return

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }

    if (this.overlay && this.overlay.parentNode) {
      document.body.removeChild(this.overlay)
    }

    this.overlay = null
    this.canvas = null
    this.ctx = null
    this.isVisible = false

    // Exit fullscreen if in fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen()
    }
  }

  /**
   * Show specific calibration point
   */
  showPoint(index: number): void {
    if (!this.isVisible) {
      this.show()
    }

    this.currentPointIndex = index
    this.drawCalibration()
  }

  /**
   * Create fullscreen overlay
   */
  private createOverlay(): void {
    // Create overlay div with maximum z-index to ensure it's always on top
    this.overlay = document.createElement('div')
    this.overlay.id = 'iris-point-calibration-overlay'
    this.overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: ${this.config.backgroundColor} !important;
      z-index: 2147483647 !important;  /* Maximum z-index value */
      pointer-events: all !important;   /* Block all interactions below */
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      transform: none !important;
      opacity: 1 !important;
    `

    // Create canvas
    this.canvas = document.createElement('canvas')
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.canvas.style.cssText = `
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      z-index: 2147483647 !important;
      pointer-events: none !important;
    `

    this.ctx = this.canvas.getContext('2d')
    if (!this.ctx) {
      throw new Error('Failed to get 2D context')
    }

    // Add instructions if enabled
    if (this.config.showInstructions) {
      const instructions = document.createElement('div')
      instructions.style.cssText = `
        position: absolute !important;
        top: 20px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        color: white !important;
        font-family: Arial, sans-serif !important;
        font-size: 24px !important;
        text-align: center !important;
        z-index: 2147483647 !important;
        pointer-events: none !important;
      `
      instructions.textContent = this.config.instructionText
      this.overlay.appendChild(instructions)
    }

    this.overlay.appendChild(this.canvas)
    
    // Force append to body and ensure it's the last element
    // This guarantees it appears on top of everything
    document.body.appendChild(this.overlay)
    
    // Double-check by moving it to the end if needed
    document.body.appendChild(this.overlay)

    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this))
  }

  /**
   * Draw calibration point with animation
   */
  private drawCalibration(): void {
    if (!this.ctx || !this.canvas || this.currentPointIndex < 0) return

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    const point = this.calibrationPoints[this.currentPointIndex]
    if (!point) return

    const x = point.x * this.canvas.width
    const y = point.y * this.canvas.height

    // Animate the point (pulsing effect)
    const time = Date.now() / 1000
    const pulse = Math.sin(time * 3) * 0.2 + 0.8
    const radius = this.config.pointRadius * pulse

    // Draw outer ring
    this.ctx.beginPath()
    this.ctx.arc(x, y, radius + 10, 0, Math.PI * 2)
    this.ctx.strokeStyle = this.config.pointColor
    this.ctx.lineWidth = 2
    this.ctx.stroke()

    // Draw main point
    this.ctx.beginPath()
    this.ctx.arc(x, y, radius, 0, Math.PI * 2)
    this.ctx.fillStyle = this.config.pointColor
    this.ctx.fill()

    // Draw center dot
    this.ctx.beginPath()
    this.ctx.arc(x, y, 3, 0, Math.PI * 2)
    this.ctx.fillStyle = 'white'
    this.ctx.fill()

    // Draw point number
    this.ctx.fillStyle = 'white'
    this.ctx.font = 'bold 16px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText((this.currentPointIndex + 1).toString(), x, y)

    // Continue animation
    this.animationFrame = requestAnimationFrame(() => this.drawCalibration())
  }

  /**
   * Handle window resize
   */
  private handleResize(): void {
    if (this.canvas) {
      this.canvas.width = window.innerWidth
      this.canvas.height = window.innerHeight
      this.drawCalibration()
    }
  }

  /**
   * Request fullscreen
   */
  private requestFullscreen(): void {
    const element = document.documentElement

    if (element.requestFullscreen) {
      element.requestFullscreen()
    } else if ((element as any).webkitRequestFullscreen) {
      (element as any).webkitRequestFullscreen()
    } else if ((element as any).mozRequestFullScreen) {
      (element as any).mozRequestFullScreen()
    } else if ((element as any).msRequestFullscreen) {
      (element as any).msRequestFullscreen()
    }
  }

  /**
   * Update calibration points (if using custom pattern)
   */
  setCalibrationPoints(points: { x: number; y: number }[]): void {
    this.calibrationPoints = points.map(p => ({
      x: p.x,
      y: p.y,
      samples: [],
      error: 0
    }))
  }

  /**
   * Get current visibility state
   */
  isShowing(): boolean {
    return this.isVisible
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.hide()
    window.removeEventListener('resize', this.handleResize.bind(this))
  }
  
  /**
   * Static method to create/get a global calibration UI instance
   * This ensures only one calibration UI exists across the entire application
   */
  static getGlobalInstance(config?: CalibrationUIConfig): CalibrationUI {
    if (!CalibrationUI.globalInstance) {
      CalibrationUI.globalInstance = new CalibrationUI(config)
    }
    return CalibrationUI.globalInstance
  }
  
  /**
   * Static method to show fullscreen calibration
   * Works across any framework by ensuring overlay is always on top
   */
  static showFullscreenCalibration(pointIndex: number = 0): void {
    const instance = CalibrationUI.getGlobalInstance()
    instance.show()
    instance.showPoint(pointIndex)
    
    // Extra safety for framework compatibility
    // Some frameworks like React/Vue might render after our overlay
    setTimeout(() => {
      instance.ensureOnTop()
    }, 100)
  }
  
  /**
   * Static method to hide calibration
   */
  static hideCalibration(): void {
    const instance = CalibrationUI.getGlobalInstance()
    instance.hide()
  }
}