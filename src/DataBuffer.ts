/**
 * Simple circular buffer for storing gaze data
 */

import { GazeData } from './types'

export class DataBuffer {
  private buffer: GazeData[]
  private maxSize: number
  private currentIndex: number = 0

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize
    this.buffer = []
  }

  add(data: GazeData): void {
    if (this.buffer.length < this.maxSize) {
      this.buffer.push(data)
    } else {
      this.buffer[this.currentIndex] = data
      this.currentIndex = (this.currentIndex + 1) % this.maxSize
    }
  }

  getAll(): GazeData[] {
    return [...this.buffer]
  }

  getLast(n: number): GazeData[] {
    if (n >= this.buffer.length) {
      return [...this.buffer]
    }
    
    const result: GazeData[] = []
    const startIdx = this.buffer.length < this.maxSize 
      ? Math.max(0, this.buffer.length - n)
      : (this.currentIndex - n + this.maxSize) % this.maxSize

    for (let i = 0; i < n; i++) {
      const idx = (startIdx + i) % this.buffer.length
      result.push(this.buffer[idx])
    }
    
    return result
  }

  getTimeRange(startTime: number, endTime: number): GazeData[] {
    return this.buffer.filter(
      data => data.timestamp >= startTime && data.timestamp <= endTime
    )
  }

  clear(): void {
    this.buffer = []
    this.currentIndex = 0
  }

  get size(): number {
    return this.buffer.length
  }

  get isFull(): boolean {
    return this.buffer.length === this.maxSize
  }
}