/**
 * Simple canvas renderer for visualizing gaze data
 * No React dependencies - pure canvas drawing
 */

import { GazeData } from './types'

export interface CanvasRendererConfig {
  canvas: HTMLCanvasElement
  gazeRadius?: number
  gazeColor?: string
  trailLength?: number
  trailColor?: string
  showCalibrationPoints?: boolean
  calibrationPointRadius?: number
  calibrationPointColor?: string
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private config: Required<CanvasRendererConfig>
  private gazeTrail: GazeData[] = []
  private calibrationPoints: { x: number; y: number }[] = []
  private currentCalibrationIndex: number = -1

  constructor(config: CanvasRendererConfig) {
    this.canvas = config.canvas
    const ctx = this.canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas')
    }
    this.ctx = ctx

    this.config = {
      canvas: config.canvas,
      gazeRadius: config.gazeRadius ?? 10,
      gazeColor: config.gazeColor ?? 'rgba(255, 0, 0, 0.8)',
      trailLength: config.trailLength ?? 10,
      trailColor: config.trailColor ?? 'rgba(255, 0, 0, 0.3)',
      showCalibrationPoints: config.showCalibrationPoints ?? false,
      calibrationPointRadius: config.calibrationPointRadius ?? 20,
      calibrationPointColor: config.calibrationPointColor ?? 'rgba(0, 255, 0, 0.8)'
    }

    // Set up default calibration points (5-point pattern)
    this.calibrationPoints = [
      { x: 0.1, y: 0.1 },  // Top-left
      { x: 0.9, y: 0.1 },  // Top-right  
      { x: 0.5, y: 0.5 },  // Center
      { x: 0.1, y: 0.9 },  // Bottom-left
      { x: 0.9, y: 0.9 }   // Bottom-right
    ]
  }

  /**
   * Clear the canvas
   */
  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  /**
   * Draw a single gaze point
   */
  drawGazePoint(gazeData: GazeData): void {
    const x = gazeData.x * this.canvas.width
    const y = gazeData.y * this.canvas.height

    // Update trail
    this.gazeTrail.push(gazeData)
    if (this.gazeTrail.length > this.config.trailLength) {
      this.gazeTrail.shift()
    }

    // Clear canvas
    this.clear()

    // Draw calibration points if enabled
    if (this.config.showCalibrationPoints) {
      this.drawCalibrationPoints()
    }

    // Draw trail
    this.drawTrail()

    // Draw current gaze point
    this.ctx.beginPath()
    this.ctx.arc(x, y, this.config.gazeRadius, 0, Math.PI * 2)
    this.ctx.fillStyle = this.config.gazeColor
    this.ctx.fill()

    // Draw confidence indicator if available
    if (gazeData.confidence !== undefined) {
      this.ctx.beginPath()
      this.ctx.arc(x, y, this.config.gazeRadius + 5, 0, Math.PI * 2 * gazeData.confidence)
      this.ctx.strokeStyle = this.config.gazeColor
      this.ctx.lineWidth = 2
      this.ctx.stroke()
    }
  }

  /**
   * Draw gaze trail
   */
  private drawTrail(): void {
    if (this.gazeTrail.length < 2) return

    this.ctx.beginPath()
    this.ctx.strokeStyle = this.config.trailColor
    this.ctx.lineWidth = 2

    for (let i = 1; i < this.gazeTrail.length; i++) {
      const prev = this.gazeTrail[i - 1]
      const curr = this.gazeTrail[i]
      
      const prevX = prev.x * this.canvas.width
      const prevY = prev.y * this.canvas.height
      const currX = curr.x * this.canvas.width
      const currY = curr.y * this.canvas.height

      if (i === 1) {
        this.ctx.moveTo(prevX, prevY)
      }
      this.ctx.lineTo(currX, currY)
    }

    this.ctx.stroke()
  }

  /**
   * Draw calibration points
   */
  drawCalibrationPoints(): void {
    this.calibrationPoints.forEach((point, index) => {
      const x = point.x * this.canvas.width
      const y = point.y * this.canvas.height

      // Draw outer circle
      this.ctx.beginPath()
      this.ctx.arc(x, y, this.config.calibrationPointRadius, 0, Math.PI * 2)
      this.ctx.strokeStyle = this.config.calibrationPointColor
      this.ctx.lineWidth = 2
      this.ctx.stroke()

      // Draw inner dot
      this.ctx.beginPath()
      this.ctx.arc(x, y, 3, 0, Math.PI * 2)
      this.ctx.fillStyle = this.config.calibrationPointColor
      this.ctx.fill()

      // Highlight current calibration point
      if (index === this.currentCalibrationIndex) {
        this.ctx.beginPath()
        this.ctx.arc(x, y, this.config.calibrationPointRadius + 5, 0, Math.PI * 2)
        this.ctx.strokeStyle = 'yellow'
        this.ctx.lineWidth = 3
        this.ctx.stroke()
      }

      // Draw point number
      this.ctx.fillStyle = 'white'
      this.ctx.font = '12px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.fillText((index + 1).toString(), x, y)
    })
  }

  /**
   * Show specific calibration point
   */
  showCalibrationPoint(index: number): void {
    this.currentCalibrationIndex = index
    this.config.showCalibrationPoints = true
    this.clear()
    this.drawCalibrationPoints()
  }

  /**
   * Hide calibration points
   */
  hideCalibrationPoints(): void {
    this.config.showCalibrationPoints = false
    this.currentCalibrationIndex = -1
    this.clear()
  }

  /**
   * Draw heatmap from multiple gaze points
   */
  drawHeatmap(gazePoints: GazeData[], radius: number = 30): void {
    this.clear()

    // Create temporary canvas for heatmap
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = this.canvas.width
    tempCanvas.height = this.canvas.height
    const tempCtx = tempCanvas.getContext('2d')!

    // Draw each point with gradient
    gazePoints.forEach(point => {
      const x = point.x * this.canvas.width
      const y = point.y * this.canvas.height

      const gradient = tempCtx.createRadialGradient(x, y, 0, x, y, radius)
      gradient.addColorStop(0, 'rgba(255, 0, 0, 0.5)')
      gradient.addColorStop(0.5, 'rgba(255, 255, 0, 0.3)')
      gradient.addColorStop(1, 'rgba(0, 0, 255, 0)')

      tempCtx.fillStyle = gradient
      tempCtx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    })

    // Copy to main canvas
    this.ctx.drawImage(tempCanvas, 0, 0)
  }

  /**
   * Set canvas size (useful for responsive layouts)
   */
  setSize(width: number, height: number): void {
    this.canvas.width = width
    this.canvas.height = height
    this.clear()
  }

  /**
   * Reset the renderer
   */
  reset(): void {
    this.gazeTrail = []
    this.currentCalibrationIndex = -1
    this.clear()
  }

  /**
   * Get canvas as data URL (for screenshots)
   */
  toDataURL(type?: string, quality?: number): string {
    return this.canvas.toDataURL(type, quality)
  }

  /**
   * Download canvas as image
   */
  download(filename: string = 'gaze-visualization.png'): void {
    const link = document.createElement('a')
    link.download = filename
    link.href = this.toDataURL()
    link.click()
  }
}