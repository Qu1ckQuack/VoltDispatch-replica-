'use client'

import { useQuery } from '@tanstack/react-query'
import { techniciansApi } from '@/lib/api'

const TECHNICIANS_KEY = 'technicians'

export function useTechnicians() {
  return useQuery({
    queryKey: [TECHNICIANS_KEY],
    queryFn: () => techniciansApi.list(),
  })
}

export function useTechnician(id: string) {
  return useQuery({
    queryKey: [TECHNICIANS_KEY, id],
    queryFn: () => techniciansApi.get(id),
    enabled: !!id,
  })
}
