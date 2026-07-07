'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { techniciansApi } from '@/lib/api'
import type { CreateTechnicianDto, UpdateTechnicianDto, UpdateStatusDto } from '@/lib/api/types'

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

export function useCreateTechnician() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTechnicianDto) => techniciansApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TECHNICIANS_KEY] }),
  })
}

export function useUpdateTechnician() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTechnicianDto }) =>
      techniciansApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TECHNICIANS_KEY] }),
  })
}

export function useDeleteTechnician() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => techniciansApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TECHNICIANS_KEY] }),
  })
}

export function useUpdateTechnicianStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateStatusDto) => techniciansApi.updateStatus(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TECHNICIANS_KEY] }),
  })
}
