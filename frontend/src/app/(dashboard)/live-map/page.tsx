'use client'

import { useEffect, useState } from 'react'
import { useLocationSocket } from '@/lib/hooks/use-location-socket'
import { techniciansApi, type TechnicianMapItem } from '@/lib/api/technicians'
import { useAuthStore } from '@/lib/stores/auth-store'
import { TechnicianMap } from '@/components/map/technician-map'

export default function LiveMapPage() {
  const user = useAuthStore((s) => s.user)
  const [technicians, setTechnicians] = useState<TechnicianMapItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { positions } = useLocationSocket()

  useEffect(() => {
    if (!user) return
    techniciansApi.mapList(user.role).then(setTechnicians).finally(() => setIsLoading(false))
  }, [user])

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
