'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { LocationSocket } from '@/lib/api/locations'

export type ConnectionState = 'connected' | 'reconnecting' | 'disconnected'

export interface TechnicianPosition {
  technicianId: string
  lat: number
  lng: number
  timestamp: number
}

interface UseLocationSocketReturn {
  state: ConnectionState
  lastUpdateAt: Date | null
  positions: Map<string, TechnicianPosition>
  subscribeToOrder: (orderId: string) => void
  unsubscribeFromOrder: (orderId: string) => void
  updatePosition: (pos: { lat: number; lng: number; orderId?: string }) => void
}

export function useLocationSocket(): UseLocationSocketReturn {
  const accessToken = useAuthStore((s) => s.accessToken)
  const [state, setState] = useState<ConnectionState>('disconnected')
  const [lastUpdateAt, setLastUpdateAt] = useState<Date | null>(null)
  const [positions, setPositions] = useState<Map<string, TechnicianPosition>>(new Map())
  const positionsRef = useRef<Map<string, TechnicianPosition>>(new Map())

  const socketRef = useRef<LocationSocket | null>(null)

  useEffect(() => {
    if (!accessToken) return

    const socket = new LocationSocket(accessToken)
    socket.connect()
    socketRef.current = socket

    const unsub = socket.onMessage((event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.event === 'connected') {
          setState('connected')
        }
        if (data.event === 'position:update') {
          setLastUpdateAt(new Date())
        }
        if (data.event === 'technician:position') {
          const { technicianId, lat, lng, timestamp } = data.data
          positionsRef.current.set(technicianId, { technicianId, lat, lng, timestamp })
          setPositions(new Map(positionsRef.current))
          setLastUpdateAt(new Date())
        }
      } catch {
        // skip malformed messages
      }
    })

    const checkInterval = setInterval(() => {
      const ws = socket.activeSocket
      if (ws) {
        setState(ws.readyState === WebSocket.OPEN ? 'connected' : 'reconnecting')
      }
    }, 2000)

    const connectionTimer = setTimeout(() => {
      const ws = socket.activeSocket
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
      positionsRef.current = new Map()
    }
  }, [accessToken])

  const subscribeToOrder = useCallback((orderId: string) => {
    socketRef.current?.subscribe(`room:order:${orderId}`)
  }, [])

  const unsubscribeFromOrder = useCallback((orderId: string) => {
    socketRef.current?.unsubscribe(`room:order:${orderId}`)
  }, [])

  const updatePosition = useCallback((pos: { lat: number; lng: number; orderId?: string }) => {
    socketRef.current?.updatePosition(pos)
  }, [])

  return { state, lastUpdateAt, positions, subscribeToOrder, unsubscribeFromOrder, updatePosition }
}
