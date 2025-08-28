/**
 * Camera overlay component for eye tracker video stream
 * Displays real-time camera feed from the eye tracker device
 */

import { EyeTracker } from './EyeTracker'

export interface CameraOverlayConfig {
  container?: HTMLElement | string  // Container element or selector
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  size?: 'small' | 'medium' | 'large' | 'fullscreen'
  opacity?: number  // 0-1
  showControls?: boolean
  autoHide?: boolean
  zIndex?: number
}

export class CameraOverlay {
  private tracker: EyeTracker
  private container: HTMLElement
  private overlayElement: HTMLDivElement | null = null
  private imageElement: HTMLImageElement | null = null
  private controlsElement: HTMLDivElement | null = null
  private config: Required<CameraOverlayConfig>
  private isVisible: boolean = false
  private hideTimeout: NodeJS.Timeout | null = null

  constructor(tracker: EyeTracker, config?: CameraOverlayConfig) {
    this.tracker = tracker
    
    this.config = {
      container: document.body,
      position: 'bottom-right',
      size: 'small',
      opacity: 1,
      showControls: true,
      autoHide: false,
      zIndex: 9999,
      ...config
    }

    // Resolve container
    if (typeof this.config.container === 'string') {
      const el = document.querySelector(this.config.container) as HTMLElement
      if (!el) {
        throw new Error(`Container ${this.config.container} not found`)
      }
      this.container = el
    } else if (this.config.container instanceof HTMLElement) {
      this.container = this.config.container
    } else {
      this.container = document.body
    }

    this.setupEventListeners()
  }

  /**
   * Initialize the camera overlay UI
   */
  init(): void {
    if (this.overlayElement) {
      return
    }

    // Create overlay container
    this.overlayElement = document.createElement('div')
    this.overlayElement.className = 'eye-tracker-camera-overlay'
    this.overlayElement.style.cssText = this.getOverlayStyles()

    // Create image element for camera feed
    this.imageElement = document.createElement('img')
    this.imageElement.className = 'eye-tracker-camera-image'
    this.imageElement.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 8px;
    `

    // Create controls if enabled
    if (this.config.showControls) {
      this.controlsElement = document.createElement('div')
      this.controlsElement.className = 'eye-tracker-camera-controls'
      this.controlsElement.style.cssText = `
        position: absolute;
        bottom: 10px;
        right: 10px;
        display: flex;
        gap: 8px;
        background: rgba(0, 0, 0, 0.7);
        padding: 8px;
        border-radius: 4px;
      `

      // Add control buttons
      this.addControlButton('📷', 'Toggle Camera', () => {
        if (this.tracker.isCameraEnabled()) {
          this.tracker.endCamera()
        } else {
          this.tracker.initCamera()
        }
      })

      this.addControlButton('🔄', 'Flip Camera', () => {
        this.tracker.flipCamera()
      })

      this.addControlButton('✕', 'Close', () => {
        this.hide()
      })

      this.overlayElement.appendChild(this.controlsElement)
    }

    this.overlayElement.appendChild(this.imageElement)
    this.container.appendChild(this.overlayElement)

    // Apply initial visibility
    if (this.tracker.isCameraEnabled()) {
      this.show()
    }
  }

  /**
   * Add a control button
   */
  private addControlButton(icon: string, title: string, onClick: () => void): void {
    if (!this.controlsElement) return

    const button = document.createElement('button')
    button.innerHTML = icon
    button.title = title
    button.style.cssText = `
      background: transparent;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 16px;
      padding: 4px;
      opacity: 0.8;
      transition: opacity 0.2s;
    `
    
    button.onmouseover = () => button.style.opacity = '1'
    button.onmouseout = () => button.style.opacity = '0.8'
    button.onclick = onClick

    this.controlsElement.appendChild(button)
  }

  /**
   * Get overlay styles based on config
   */
  private getOverlayStyles(): string {
    const sizes = {
      small: { width: '210px', height: '110px' },
      medium: { width: '320px', height: '180px' },
      large: { width: '480px', height: '270px' },
      fullscreen: { width: '100%', height: '100%' }
    }

    const positions = {
      'top-left': { top: '20px', left: '20px' },
      'top-right': { top: '20px', right: '20px' },
      'bottom-left': { bottom: '20px', left: '20px' },
      'bottom-right': { bottom: '20px', right: '20px' },
      'center': { 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)' 
      }
    }

    const size = sizes[this.config.size]
    const position = positions[this.config.position]

    let styles = `
      position: fixed;
      width: ${size.width};
      height: ${size.height};
      background: #000;
      border: 2px solid #176feb;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      opacity: ${this.config.opacity};
      z-index: ${this.config.zIndex};
      transition: opacity 0.3s;
      display: none;
    `

    // Add position styles
    Object.entries(position).forEach(([key, value]) => {
      styles += `${key}: ${value};`
    })

    return styles
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for camera frames
    this.tracker.on('cameraFrame', (data) => {
      this.updateFrame(data.imageData)
    })

    // Listen for camera state changes
    this.tracker.on('cameraStarted', () => {
      this.show()
    })

    this.tracker.on('cameraStopped', () => {
      this.hide()
    })

    // Auto-hide on mouse movement if enabled
    if (this.config.autoHide) {
      document.addEventListener('mousemove', () => {
        this.showTemporary()
      })
    }
  }

  /**
   * Update camera frame
   */
  private updateFrame(imageData: string): void {
    if (!this.imageElement || !this.isVisible) return

    // Update image source (base64 data)
    this.imageElement.src = `data:image/jpeg;base64,${imageData}`
  }

  /**
   * Show overlay
   */
  show(): void {
    if (!this.overlayElement) {
      this.init()
    }

    if (this.overlayElement) {
      this.overlayElement.style.display = 'block'
      this.isVisible = true
    }
  }

  /**
   * Hide overlay
   */
  hide(): void {
    if (this.overlayElement) {
      this.overlayElement.style.display = 'none'
      this.isVisible = false
    }
  }

  /**
   * Toggle overlay visibility
   */
  toggle(): void {
    if (this.isVisible) {
      this.hide()
    } else {
      this.show()
    }
  }

  /**
   * Show temporarily (for auto-hide)
   */
  private showTemporary(): void {
    if (!this.tracker.isCameraEnabled()) return

    this.show()

    // Clear existing timeout
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout)
    }

    // Set new timeout
    this.hideTimeout = setTimeout(() => {
      this.hide()
    }, 3000)
  }

  /**
   * Update overlay configuration
   */
  updateConfig(config: Partial<CameraOverlayConfig>): void {
    this.config = { ...this.config, ...config }
    
    if (this.overlayElement) {
      this.overlayElement.style.cssText = this.getOverlayStyles()
      
      // Restore visibility if it was visible
      if (this.isVisible) {
        this.overlayElement.style.display = 'block'
      }
    }
  }

  /**
   * Set overlay position
   */
  setPosition(position: CameraOverlayConfig['position']): void {
    this.updateConfig({ position })
  }

  /**
   * Set overlay size
   */
  setSize(size: CameraOverlayConfig['size']): void {
    this.updateConfig({ size })
  }

  /**
   * Set overlay opacity
   */
  setOpacity(opacity: number): void {
    this.updateConfig({ opacity: Math.max(0, Math.min(1, opacity)) })
  }

  /**
   * Destroy overlay
   */
  destroy(): void {
    // Clear timeout
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout)
    }

    // Remove element
    if (this.overlayElement && this.overlayElement.parentElement) {
      this.overlayElement.parentElement.removeChild(this.overlayElement)
    }

    // Clear references
    this.overlayElement = null
    this.imageElement = null
    this.controlsElement = null
  }

  /**
   * Get current visibility state
   */
  get visible(): boolean {
    return this.isVisible
  }
}