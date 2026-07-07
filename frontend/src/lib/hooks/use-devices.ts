'use client'

import { useQuery } from '@tanstack/react-query'
import { devicesApi } from '@/lib/api'

const DEVICES_KEY = 'devices'

export function useDevices() {
  return useQuery({
    queryKey: [DEVICES_KEY],
    queryFn: () => devicesApi.list(),
  })
}

export function useDevice(id: string) {
  return useQuery({
    queryKey: [DEVICES_KEY, id],
    queryFn: () => devicesApi.get(id),
    enabled: !!id,
  })
}
