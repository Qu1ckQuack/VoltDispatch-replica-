import type { UpdatePositionDto } from './types'

const RECONNECT_BASE_MS = 1000
const RECONNECT_MAX_MS = 30000
const LOCATION_INTERVAL_MS = 10000

type MessageHandler = (event: MessageEvent) => void

export class LocationSocket {
  private ws: WebSocket | null = null
  private url: string
  private token: string
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private locationInterval: ReturnType<typeof setInterval> | null = null
  private position: UpdatePositionDto | null = null
  private handlers = new Set<MessageHandler>()

  constructor(token: string) {
    const baseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'
    this.url = `${baseUrl}/ws/locations?token=${token}`
    this.token = token
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return
    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      this.startLocationPush()
    }

    this.ws.onmessage = (event) => {
      for (const handler of this.handlers) handler(event)
    }

    this.ws.onclose = () => {
      this.stopLocationPush()
      this.scheduleReconnect()
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  disconnect() {
    this.stopLocationPush()
    this.clearReconnect()
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }
  }

  updatePosition(pos: UpdatePositionDto) {
    this.position = pos
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event: 'position:update', data: pos }))
    }
  }

  subscribe(technicianId: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event: 'subscribe', data: { technicianId } }))
    }
  }

  unsubscribe(technicianId: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event: 'unsubscribe', data: { technicianId } }))
    }
  }

  onMessage(handler: MessageHandler) {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  private startLocationPush() {
    if (this.locationInterval) return
    this.locationInterval = setInterval(() => {
      if (this.position && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ event: 'position:update', data: this.position }))
      }
    }, LOCATION_INTERVAL_MS)
  }

  private stopLocationPush() {
    if (this.locationInterval) {
      clearInterval(this.locationInterval)
      this.locationInterval = null
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return
    const delay = Math.min(
      RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000,
      RECONNECT_MAX_MS,
    )
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  private clearReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}
