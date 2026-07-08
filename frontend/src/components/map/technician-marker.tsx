'use client'

import { useEffect, useMemo } from 'react'
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { TechnicianStatus } from '@/lib/api/types'

interface TechnicianMarkerProps {
  id: string
  lat: number
  lng: number
  status: TechnicianStatus
  label: string
  lastUpdate?: string
  subDistrict?: string
}

const COLOR_MAP: Record<TechnicianStatus, string> = {
  [TechnicianStatus.AVAILABLE]: '#22c55e',
  [TechnicianStatus.BUSY]: '#f59e0b',
  [TechnicianStatus.OFFLINE]: '#6b7280',
}

function createIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 18px; height: 18px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
  })
}

const iconsCache = new Map<string, L.DivIcon>()

function getIcon(status: TechnicianStatus): L.DivIcon {
  const color = COLOR_MAP[status]
  if (!iconsCache.has(status)) {
    iconsCache.set(status, createIcon(color))
  }
  return iconsCache.get(status)!
}

export function TechnicianMarker({
  id,
  lat,
  lng,
  status,
  label,
  lastUpdate,
  subDistrict,
}: TechnicianMarkerProps) {
  const icon = useMemo(() => getIcon(status), [status])

  return (
    <Marker position={[lat, lng]} icon={icon}>
      <Popup>
        <div className="text-sm">
          <p className="font-semibold">{label}</p>
          <p className="text-muted-foreground">
            Status: <span style={{ color: COLOR_MAP[status] }}>{status}</span>
          </p>
          {subDistrict && (
            <p className="text-muted-foreground">Area: {subDistrict}</p>
          )}
          {lastUpdate && (
            <p className="text-xs text-muted-foreground">
              Updated: {new Date(lastUpdate).toLocaleTimeString()}
            </p>
          )}
        </div>
      </Popup>
    </Marker>
  )
}
