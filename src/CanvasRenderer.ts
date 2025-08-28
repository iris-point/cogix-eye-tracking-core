/**
 * Simple canvas renderer for visualizing gaze data
 * Minimal implementation - just gaze point and calibration points
 */

import { GazeData } from './types'

export interface CanvasRendererConfig {
  canvas: HTMLCanvasElement
  gazeRadius?: number
  gazeColor?: string
  calibrationPointRadius?: number
  calibrationPointColor?: string
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private config: Required<Omit<CanvasRendererConfig, 'canvas'>>
  private calibrationPoints: { x: number; y: number }[] = []
  private currentCalibrationIndex: number = -1
  private showCalibrationPoints: boolean = false

  constructor(config: CanvasRendererConfig) {
    this.canvas = config.canvas
    const ctx = this.canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas')
    }
    this.ctx = ctx

    this.config = {
      gazeRadius: config.gazeRadius ?? 10,
      gazeColor: config.gazeColor ?? 'rgba(255, 0, 0, 0.8)',
      calibrationPointRadius: config.calibrationPointRadius ?? 20,
      calibrationPointColor: config.calibrationPointColor ?? 'rgba(0, 255, 0, 0.8)'
    }

    // Default 5-point calibration pattern
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

    // Clear canvas
    this.clear()

    // Draw calibration points if showing
    if (this.showCalibrationPoints) {
      this.drawCalibrationPoints()
    }

    // Draw gaze point
    this.ctx.beginPath()
    this.ctx.arc(x, y, this.config.gazeRadius, 0, Math.PI * 2)
    this.ctx.fillStyle = this.config.gazeColor
    this.ctx.fill()

    // Draw confidence ring if available
    if (gazeData.confidence !== undefined) {
      this.ctx.beginPath()
      this.ctx.arc(x, y, this.config.gazeRadius + 5, 0, Math.PI * 2 * gazeData.confidence)
      this.ctx.strokeStyle = this.config.gazeColor
      this.ctx.lineWidth = 2
      this.ctx.stroke()
    }
  }

  /**
   * Draw calibration points
   */
  private drawCalibrationPoints(): void {
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
    this.showCalibrationPoints = true
    this.clear()
    this.drawCalibrationPoints()
  }

  /**
   * Hide calibration points
   */
  hideCalibrationPoints(): void {
    this.showCalibrationPoints = false
    this.currentCalibrationIndex = -1
    this.clear()
  }

  /**
   * Set canvas size
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
    this.currentCalibrationIndex = -1
    this.clear()
  }
}