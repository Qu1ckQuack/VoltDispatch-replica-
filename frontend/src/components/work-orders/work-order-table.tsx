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
  onAccept?: (order: WorkOrder) => void
  onDecline?: (order: WorkOrder) => void
  onStartTravel?: (order: WorkOrder) => void
  onStartWork?: (order: WorkOrder) => void
  onIssue?: (order: WorkOrder) => void
  onResolveIssue?: (order: WorkOrder) => void
  onComplete?: (order: WorkOrder) => void
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
  onAccept,
  onDecline,
  onStartTravel,
  onStartWork,
  onIssue,
  onResolveIssue,
  onComplete,
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
          {actions.includes('accept') && (
            <button
              onClick={() => onAccept?.(order)}
              className="rounded-md bg-assurance-green px-2 py-1 text-xs text-white hover:bg-assurance-green/90"
            >
              Accept
            </button>
          )}
          {actions.includes('decline') && (
            <button
              onClick={() => onDecline?.(order)}
              className="rounded-md border border-signal-red/30 px-2 py-1 text-xs text-signal-red hover:bg-signal-red/10"
            >
              Decline
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
          {actions.includes('start-travel') && (
            <button
              onClick={() => onStartTravel?.(order)}
              className="rounded-md bg-trust-blue px-2 py-1 text-xs text-white hover:bg-trust-blue/90"
            >
              En Route
            </button>
          )}
          {actions.includes('start-work') && (
            <button
              onClick={() => onStartWork?.(order)}
              className="rounded-md bg-trust-blue px-2 py-1 text-xs text-white hover:bg-trust-blue/90"
            >
              Start Work
            </button>
          )}
          {actions.includes('issue') && (
            <button
              onClick={() => onIssue?.(order)}
              className="rounded-md border border-warm-sand/30 px-2 py-1 text-xs text-warm-sand hover:bg-warm-sand/10"
            >
              Report Issue
            </button>
          )}
          {actions.includes('resolve-issue') && (
            <button
              onClick={() => onResolveIssue?.(order)}
              className="rounded-md bg-assurance-green px-2 py-1 text-xs text-white hover:bg-assurance-green/90"
            >
              Resolve Issue
            </button>
          )}
          {actions.includes('complete') && (
            <button
              onClick={() => onComplete?.(order)}
              className="rounded-md bg-assurance-green px-2 py-1 text-xs text-white hover:bg-assurance-green/90"
            >
              Complete
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
