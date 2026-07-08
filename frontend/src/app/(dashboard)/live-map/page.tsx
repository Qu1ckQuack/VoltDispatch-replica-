'use client'

import { useTechnicians } from '@/lib/hooks/use-technicians'
import { useLocationSocket } from '@/lib/hooks/use-location-socket'
import { TechnicianMap } from '@/components/map/technician-map'

export default function LiveMapPage() {
  const { data: technicians = [], isLoading } = useTechnicians()
  const { positions } = useLocationSocket()

  return (
    <div className="flex h-full flex-col space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink-slate">Live Map</h1>
        <p className="text-sm text-muted-foreground">
          Real-time technician locations
        </p>
      </div>
      <TechnicianMap
        technicians={technicians}
        positions={positions}
        height="flex-1 min-h-[60vh]"
        showLoadingOverlay={isLoading}
      />
    </div>
  )
}
