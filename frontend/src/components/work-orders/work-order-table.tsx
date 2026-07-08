'use client'

import { useAuthStore } from '@/lib/stores/auth-store'
import { WorkOrderStatus, UserRole } from '@/lib/api/types'
import type { WorkOrder } from '@/lib/api/types'
import { SharedWorkOrderTable } from '@/components/shared/work-order-table'

interface WorkOrderTableProps {
  orders: WorkOrder[]
  loading: boolean
  total: number
  page: number
  limit: number
  onPageChange: (page: number) => void
  onView: (order: WorkOrder) => void
  onAssign: (order: WorkOrder) => void
  onReschedule: (order: WorkOrder) => void
  onCancel: (order: WorkOrder) => void
}

function canAction(order: WorkOrder, role: string): string[] {
  const actions: string[] = []
  switch (role) {
    case UserRole.DEALER:
      if (order.status === WorkOrderStatus.REQUESTED) actions.push('cancel')
      break
    case UserRole.COORDINATOR:
      if (order.status === WorkOrderStatus.REQUESTED) actions.push('assign')
      if (
        order.status === WorkOrderStatus.ASSIGNED ||
        order.status === WorkOrderStatus.ACCEPTED
      )
        actions.push('reschedule')
      if (order.status === WorkOrderStatus.ISSUE) actions.push('escalate')
      break
    case UserRole.TECHNICIAN:
      if (order.status === WorkOrderStatus.ASSIGNED) actions.push('accept', 'decline')
      if (order.status === WorkOrderStatus.ACCEPTED) actions.push('start-travel')
      if (order.status === WorkOrderStatus.EN_ROUTE) actions.push('start-work')
      if (order.status === WorkOrderStatus.IN_PROGRESS) actions.push('issue', 'complete')
      if (order.status === WorkOrderStatus.ISSUE) actions.push('resolve-issue')
      break
    case UserRole.HQ:
      actions.push('cancel')
      break
  }
  return actions
}

export function WorkOrderTable({
  orders,
  loading,
  total,
  page,
  limit,
  onPageChange,
  onView,
  onAssign,
  onReschedule,
  onCancel,
}: WorkOrderTableProps) {
  const user = useAuthStore((s) => s.user)
  const role = user?.role ?? ''

  return (
    <SharedWorkOrderTable
      orders={orders}
      loading={loading}
      total={total}
      page={page}
      limit={limit}
      showDevice
      showPagination
      onPageChange={onPageChange}
      onView={onView}
      actions={(order) => canAction(order, role)}
      actionButtons={(order, actions) => (
        <>
          {actions.includes('assign') && (
            <button
              onClick={() => onAssign(order)}
              className="rounded-md bg-trust-blue px-2 py-1 text-xs text-white hover:bg-trust-blue/90"
            >
              Assign
            </button>
          )}
          {actions.includes('reschedule') && (
            <button
              onClick={() => onReschedule(order)}
              className="rounded-md border border-border px-2 py-1 text-xs text-ink-slate hover:bg-muted"
            >
              Reschedule
            </button>
          )}
          {actions.includes('cancel') && (
            <button
              onClick={() => onCancel(order)}
              className="rounded-md border border-signal-red/30 px-2 py-1 text-xs text-signal-red hover:bg-signal-red/10"
            >
              Cancel
            </button>
          )}
        </>
      )}
    />
  )
}
