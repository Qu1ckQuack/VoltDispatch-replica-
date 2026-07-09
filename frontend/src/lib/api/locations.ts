import type { UpdatePositionDto } from './types'

const RECONNECT_BASE_MS = 1000
const RECONNECT_MAX_MS = 30000
const LOCATION_INTERVAL_MS = 10000

type MessageHandler = (event: MessageEvent) => void

export class LocationSocket {
  private ws: WebSocket | null = null
  private token: string
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private locationInterval: ReturnType<typeof setInterval> | null = null
  private position: UpdatePositionDto | null = null
  private handlers = new Set<MessageHandler>()

  constructor(token: string) {
    this.token = token
  }

  private buildUrl(): string {
    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:'
    const baseUrl = process.env.NEXT_PUBLIC_WS_URL || (isSecure ? 'wss://localhost:3001' : 'ws://localhost:3001')
    return `${baseUrl}/ws/locations?token=${this.token}`
  }

  updateToken(token: string) {
    this.token = token
    if (this.ws) {
      this.disconnect()
      this.connect()
    }
  }

  get activeSocket(): WebSocket | null {
    return this.ws
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return
    this.ws = new WebSocket(this.buildUrl())

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
    this.position = null
    this.handlers.clear()
    if (this.ws) {
      this.ws.onclose = null
      this.ws.onerror = null
      this.ws.onmessage = null
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CLOSING) {
        this.ws.close()
      }
      this.ws = null
    }
  }

  updatePosition(pos: UpdatePositionDto) {
    this.position = pos
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event: 'position:update', data: pos }))
    }
  }

  subscribe(room: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event: 'subscribe', data: { room } }))
    }
  }

  unsubscribe(room: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event: 'unsubscribe', data: { room } }))
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
