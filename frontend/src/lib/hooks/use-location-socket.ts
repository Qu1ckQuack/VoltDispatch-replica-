'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { LocationSocket } from '@/lib/api/locations'
import { authApi } from '@/lib/api/auth'
import { isTokenExpired } from '@/lib/api/jwt'

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
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!accessToken) return

    let active = true

    ;(async () => {
      let token = accessToken
      if (isTokenExpired(token)) {
        const refreshToken = useAuthStore.getState().refreshToken
        if (refreshToken) {
          try {
            const res = await authApi.refresh(refreshToken)
            useAuthStore.getState().setTokens(res.accessToken, res.refreshToken)
            token = res.accessToken
          } catch {
            return
          }
        } else {
          return
        }
      }

      if (!active) return

      const socket = new LocationSocket(token)
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
      unsubRef.current = unsub

      tickRef.current = setInterval(() => {
        const ws = socket.activeSocket
        if (ws) {
          setState(ws.readyState === WebSocket.OPEN ? 'connected' : 'reconnecting')
        }
      }, 2000)

      timerRef.current = setTimeout(() => {
        const ws = socket.activeSocket
        if (ws?.readyState === WebSocket.OPEN) {
          setState('connected')
        }
      }, 1500)
    })()

    return () => {
      active = false
      if (tickRef.current) clearInterval(tickRef.current)
      if (timerRef.current) clearTimeout(timerRef.current)
      tickRef.current = null
      timerRef.current = null
      unsubRef.current?.()
      unsubRef.current = null
      socketRef.current?.disconnect()
      socketRef.current = null
      positionsRef.current = new Map()
    }
  }, [accessToken])

  const prevTokenRef = useRef(accessToken)

  useEffect(() => {
    if (!socketRef.current || !accessToken) return
    if (prevTokenRef.current === accessToken) return
    prevTokenRef.current = accessToken
    socketRef.current.updateToken(accessToken)
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
