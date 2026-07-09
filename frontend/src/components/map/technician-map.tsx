'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState, useMemo } from 'react'
import type { TechnicianMapItem } from '@/lib/api/technicians'
import type { TechnicianPosition } from './map-utils'
import { defaultCenter } from './map-utils'

const MapContent = dynamic(
  () => import('./map-content'),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading map...</div> },
)

export interface TechnicianMapProps {
  technicians: TechnicianMapItem[]
  positions?: Map<string, TechnicianPosition>
  height?: string
  showLoadingOverlay?: boolean
}

export function TechnicianMap({
  technicians,
  positions,
  height = 'h-80',
  showLoadingOverlay,
}: TechnicianMapProps) {
  const hasPositions = technicians.some((t) => t.lastLat != null && t.lastLng != null)

  const combined = useMemo(() => {
    return technicians.map((t) => {
      const wsPos = positions?.get(t.id)
      return {
        ...t,
        displayLat: wsPos?.lat ?? t.lastLat,
        displayLng: wsPos?.lng ?? t.lastLng,
      }
    })
  }, [technicians, positions])

  return (
    <div className={`relative w-full overflow-hidden rounded-xl border border-border bg-white ${height}`}>
      {showLoadingOverlay && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/70 text-sm text-muted-foreground">
          Waiting for location data...
        </div>
      )}
      {!hasPositions && !showLoadingOverlay && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/70 text-sm text-muted-foreground">
          No location data available
        </div>
      )}
      <MapContent technicians={combined} defaultCenter={defaultCenter()} />
    </div>
  )
}
