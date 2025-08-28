/**
 * Simple event emitter for managing callbacks
 */

export class EventEmitter<EventMap extends Record<string, any>> {
  private listeners: Map<keyof EventMap, Set<Function>> = new Map()

  on<K extends keyof EventMap>(
    event: K, 
    callback: (data: EventMap[K]) => void
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  off<K extends keyof EventMap>(
    event: K, 
    callback: (data: EventMap[K]) => void
  ): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.delete(callback)
      if (callbacks.size === 0) {
        this.listeners.delete(event)
      }
    }
  }

  once<K extends keyof EventMap>(
    event: K, 
    callback: (data: EventMap[K]) => void
  ): void {
    const onceWrapper = (data: EventMap[K]) => {
      callback(data)
      this.off(event, onceWrapper)
    }
    this.on(event, onceWrapper)
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in event listener for ${String(event)}:`, error)
        }
      })
    }
  }

  removeAllListeners(event?: keyof EventMap): void {
    if (event) {
      this.listeners.delete(event)
    } else {
      this.listeners.clear()
    }
  }

  listenerCount(event: keyof EventMap): number {
    return this.listeners.get(event)?.size || 0
  }
}