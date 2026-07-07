'use client'

import { useAuthStore } from '@/lib/stores/auth-store'
import { StatusBadge } from '@/components/queue/status-badge'
import { WorkOrderStatus, UserRole } from '@/lib/api/types'
import type { WorkOrder } from '@/lib/api/types'

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

const PRIORITY_CLASS: Record<number, string> = {
  0: 'text-muted-foreground',
  1: 'text-warm-sand font-medium',
  2: 'text-signal-red font-semibold',
}

const PRIORITY_LABEL: Record<number, string> = {
  0: 'Normal',
  1: 'High',
  2: 'Urgent',
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
  const totalPages = Math.ceil(total / limit)

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-white p-8 text-center text-sm text-muted-foreground">
        Loading work orders...
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-white p-8 text-center text-sm text-muted-foreground">
        No work orders found.
      </div>
    )
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium text-muted-foreground">ID</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Priority</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Area</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Customer</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Device</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Technician</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Appointment</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const actions = canAction(order, role)
              return (
                <tr
                  key={order.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onView(order)}
                      className="font-mono text-xs text-trust-blue hover:underline"
                    >
                      {order.id.slice(0, 8)}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={PRIORITY_CLASS[order.priority] ?? ''}>
                      {PRIORITY_LABEL[order.priority] ?? 'Normal'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-slate">{order.subDistrict}</td>
                  <td className="px-4 py-3 text-ink-slate">
                    {order.customer?.name || '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {order.device?.model || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {order.technicianId ? (
                      <span className="text-assurance-green">Assigned</span>
                    ) : (
                      <span className="text-warm-sand">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {order.appointmentDate
                      ? new Date(order.appointmentDate).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => onView(order)}
                        className="rounded-md border border-border px-2 py-1 text-xs text-ink-slate hover:bg-muted"
                      >
                        View
                      </button>
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
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-ink-slate hover:bg-muted disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-ink-slate hover:bg-muted disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
