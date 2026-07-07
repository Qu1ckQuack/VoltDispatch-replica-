'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workOrdersApi } from '@/lib/api'
import type { CreateWorkOrderDto, WorkOrderQueryDto } from '@/lib/api/types'

const WORK_ORDERS_KEY = 'work-orders'

export function useWorkOrders(query?: WorkOrderQueryDto) {
  return useQuery({
    queryKey: [WORK_ORDERS_KEY, query],
    queryFn: () => workOrdersApi.list(query),
  })
}

export function useWorkOrder(id: string) {
  return useQuery({
    queryKey: [WORK_ORDERS_KEY, id],
    queryFn: () => workOrdersApi.get(id),
    enabled: !!id,
  })
}

export function useAssignWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, technicianId }: { id: string; technicianId: string }) =>
      workOrdersApi.assign(id, { technicianId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [WORK_ORDERS_KEY] }),
  })
}

export function useDeclineWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      workOrdersApi.decline(id, { note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [WORK_ORDERS_KEY] }),
  })
}

export function useRescheduleWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, appointmentDate }: { id: string; appointmentDate: string }) =>
      workOrdersApi.reschedule(id, { appointmentDate }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [WORK_ORDERS_KEY] }),
  })
}

export function useStartTravelWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      workOrdersApi.startTravel(id, { note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [WORK_ORDERS_KEY] }),
  })
}

export function useStartWorkWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      workOrdersApi.startWork(id, { note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [WORK_ORDERS_KEY] }),
  })
}

export function useIssueWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      workOrdersApi.reportIssue(id, { note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [WORK_ORDERS_KEY] }),
  })
}

export function useResolveIssueWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      workOrdersApi.resolveIssue(id, { note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [WORK_ORDERS_KEY] }),
  })
}

export function useEscalateWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      workOrdersApi.escalate(id, { note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [WORK_ORDERS_KEY] }),
  })
}

export function useCompleteWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      workOrdersApi.complete(id, { note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [WORK_ORDERS_KEY] }),
  })
}

export function useCreateWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateWorkOrderDto) => workOrdersApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [WORK_ORDERS_KEY] }),
  })
}

export function useCancelWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      workOrdersApi.cancel(id, { note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [WORK_ORDERS_KEY] }),
  })
}
