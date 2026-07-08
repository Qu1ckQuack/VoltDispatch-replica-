'use client'

import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet'
import { TechnicianMarker } from './technician-marker'

interface MapContentTechnician {
  id: string
  userId: string
  status: import('@/lib/api/types').TechnicianStatus
  subDistrict: string
  displayLat: number | null
  displayLng: number | null
  lastLocationAt: string | null
}

interface MapContentProps {
  technicians: MapContentTechnician[]
  defaultCenter: [number, number]
}

export default function MapContent({ technicians, defaultCenter }: MapContentProps) {
  const located = technicians.filter(
    (t): t is MapContentTechnician & { displayLat: number; displayLng: number } =>
      t.displayLat != null && t.displayLng != null,
  )

  return (
    <MapContainer
      center={defaultCenter}
      zoom={12}
      className="h-full w-full"
      zoomControl={false}
    >
      <ZoomControl position="bottomright" />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {located.map((t) => (
        <TechnicianMarker
          key={t.id}
          id={t.id}
          lat={t.displayLat}
          lng={t.displayLng}
          status={t.status}
          label={`Technician ${t.userId.slice(0, 8)}`}
          lastUpdate={t.lastLocationAt ?? undefined}
          subDistrict={t.subDistrict}
        />
      ))}
    </MapContainer>
  )
}
