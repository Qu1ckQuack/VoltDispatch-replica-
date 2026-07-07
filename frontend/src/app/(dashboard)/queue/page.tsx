'use client'

import { useState, useCallback } from 'react'
import type { WorkOrder, WorkOrderStatus } from '@/lib/api/types'
import { useWorkOrders, useAssignWorkOrder, useRescheduleWorkOrder } from '@/lib/hooks/use-work-orders'
import { useTechnicians } from '@/lib/hooks/use-technicians'
import { FilterBar } from '@/components/queue/filter-bar'
import { WorkOrderTable } from '@/components/queue/work-order-table'
import { AssignModal } from '@/components/queue/assign-modal'
import { RescheduleModal } from '@/components/queue/reschedule-modal'

export default function QueuePage() {
  const [subDistrict, setSubDistrict] = useState('')
  const [status, setStatus] = useState('')
  const [assignTarget, setAssignTarget] = useState<WorkOrder | null>(null)
  const [rescheduleTarget, setRescheduleTarget] = useState<WorkOrder | null>(null)

  const { data: workOrdersRes, isLoading: ordersLoading } = useWorkOrders({
    subDistrict: subDistrict || undefined,
    status: (status as WorkOrderStatus) || undefined,
  })

  const { data: technicians = [], isLoading: techsLoading } = useTechnicians()

  const assignMutation = useAssignWorkOrder()
  const rescheduleMutation = useRescheduleWorkOrder()

  const handleAssign = useCallback(
    (technicianId: string) => {
      if (!assignTarget) return
      assignMutation.mutate(
        { id: assignTarget.id, technicianId },
        { onSuccess: () => setAssignTarget(null) },
      )
    },
    [assignTarget, assignMutation],
  )

  const handleReschedule = useCallback(
    (appointmentDate: string) => {
      if (!rescheduleTarget) return
      rescheduleMutation.mutate(
        { id: rescheduleTarget.id, appointmentDate },
        { onSuccess: () => setRescheduleTarget(null) },
      )
    },
    [rescheduleTarget, rescheduleMutation],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-slate">Queue</h1>
        <p className="text-sm text-muted-foreground">
          Filter by sub-district and assign technicians to work orders
        </p>
      </div>

      <FilterBar
        subDistrict={subDistrict}
        status={status}
        onSubDistrictChange={setSubDistrict}
        onStatusChange={setStatus}
      />

      <WorkOrderTable
        orders={workOrdersRes?.data ?? []}
        loading={ordersLoading}
        onAssign={setAssignTarget}
        onReschedule={setRescheduleTarget}
      />

      {assignTarget && (
        <AssignModal
          order={assignTarget}
          technicians={technicians}
          loading={techsLoading}
          onAssign={handleAssign}
          onClose={() => setAssignTarget(null)}
        />
      )}

      {rescheduleTarget && (
        <RescheduleModal
          order={rescheduleTarget}
          onReschedule={handleReschedule}
          onClose={() => setRescheduleTarget(null)}
        />
      )}
    </div>
  )
}
