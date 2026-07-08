'use client'

import type { WorkOrder } from '@/lib/api/types'
import { WorkOrderStatus } from '@/lib/api/types'
import { SharedWorkOrderTable } from '@/components/shared/work-order-table'

interface WorkOrderTableProps {
  orders: WorkOrder[]
  loading: boolean
  onAssign: (order: WorkOrder) => void
  onReschedule: (order: WorkOrder) => void
}

export function WorkOrderTable({
  orders,
  loading,
  onAssign,
  onReschedule,
}: WorkOrderTableProps) {
  return (
    <SharedWorkOrderTable
      orders={orders}
      loading={loading}
      emptyMessage="No work orders match the current filters."
      actionButtons={(order) => (
        <>
          {order.status === WorkOrderStatus.REQUESTED && (
            <button
              onClick={() => onAssign(order)}
              className="rounded-md bg-trust-blue px-2.5 py-1 text-xs font-medium text-white hover:bg-trust-blue/90"
            >
              Assign
            </button>
          )}
          {(order.status === WorkOrderStatus.ASSIGNED ||
            order.status === WorkOrderStatus.ACCEPTED) && (
            <button
              onClick={() => onReschedule(order)}
              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-ink-slate hover:bg-muted"
            >
              Reschedule
            </button>
          )}
        </>
      )}
    />
  )
}
