'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { LocationSocket } from '@/lib/api/locations'

export type ConnectionState = 'connected' | 'reconnecting' | 'disconnected'

interface UseLocationSocketReturn {
  state: ConnectionState
  lastUpdateAt: Date | null
  socket: LocationSocket | null
}

export function useLocationSocket(): UseLocationSocketReturn {
  const accessToken = useAuthStore((s) => s.accessToken)
  const socketRef = useRef<LocationSocket | null>(null)
  const [state, setState] = useState<ConnectionState>('disconnected')
  const [lastUpdateAt, setLastUpdateAt] = useState<Date | null>(null)

  useEffect(() => {
    if (!accessToken) return

    const socket = new LocationSocket(accessToken)
    socketRef.current = socket

    const unsub = socket.onMessage((event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.event === 'position:update') {
          setLastUpdateAt(new Date())
        }
      } catch {
        // ignore malformed messages
      }
    })

    let reconnectCount = 0
    const origOnOpen = socket['connect'].bind(socket)
    const origOnClose = socket['disconnect']?.bind(socket)

    const checkInterval = setInterval(() => {
      if (socketRef.current) {
        const ws = (socketRef.current as unknown as { ws: WebSocket | null }).ws
        if (ws) {
          setState(ws.readyState === WebSocket.OPEN ? 'connected' : 'reconnecting')
        }
      }
    }, 2000)

    socket.connect()
    setState('reconnecting')

    const connectionTimer = setTimeout(() => {
      const ws = (socket as unknown as { ws: WebSocket | null }).ws
      if (ws?.readyState === WebSocket.OPEN) {
        setState('connected')
      }
    }, 1500)

    return () => {
      clearInterval(checkInterval)
      clearTimeout(connectionTimer)
      unsub()
      socket.disconnect()
      socketRef.current = null
    }
  }, [accessToken])

  const socket = socketRef.current

  return { state, lastUpdateAt, socket }
}
