'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { LocationSocket } from '@/lib/api/locations'

export type ConnectionState = 'connected' | 'reconnecting' | 'disconnected'

interface UseLocationSocketReturn {
  state: ConnectionState
  lastUpdateAt: Date | null
}

export function useLocationSocket(): UseLocationSocketReturn {
  const accessToken = useAuthStore((s) => s.accessToken)
  const [state, setState] = useState<ConnectionState>('disconnected')
  const [lastUpdateAt, setLastUpdateAt] = useState<Date | null>(null)

  useEffect(() => {
    if (!accessToken) return

    const socket = new LocationSocket(accessToken)
    socket.connect()

    const unsub = socket.onMessage((event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.event === 'connected') {
          setState('connected')
        }
        if (data.event === 'position:update') {
          setLastUpdateAt(new Date())
        }
      } catch {
        // ignore malformed messages
      }
    })

    const checkInterval = setInterval(() => {
      const ws = (socket as unknown as { ws: WebSocket | null }).ws
      if (ws) {
        setState(ws.readyState === WebSocket.OPEN ? 'connected' : 'reconnecting')
      }
    }, 2000)

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
    }
  }, [accessToken])

  return { state, lastUpdateAt }
}
