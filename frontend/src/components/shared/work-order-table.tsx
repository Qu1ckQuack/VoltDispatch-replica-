'use client'

import { StatusBadge } from '@/components/queue/status-badge'
import type { WorkOrder } from '@/lib/api/types'

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

interface SharedWorkOrderTableProps {
  orders: WorkOrder[]
  loading: boolean
  emptyMessage?: string
  showDevice?: boolean
  showPagination?: boolean
  total?: number
  page?: number
  limit?: number
  onPageChange?: (page: number) => void
  onView?: (order: WorkOrder) => void
  actions?: (order: WorkOrder) => string[]
  actionButtons?: (order: WorkOrder, actions: string[]) => React.ReactNode
}

export function SharedWorkOrderTable({
  orders,
  loading,
  emptyMessage = 'No work orders found.',
  showDevice = false,
  showPagination = false,
  total = 0,
  page = 1,
  limit = 50,
  onPageChange,
  onView,
  actions,
  actionButtons,
}: SharedWorkOrderTableProps) {
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
        {emptyMessage}
      </div>
    )
  }

  const totalPages = showPagination && total > 0 ? Math.ceil(total / limit) : 1
  const orderActions = actions ?? (() => [])

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
              {showDevice && (
                <th className="px-4 py-3 font-medium text-muted-foreground">Device</th>
              )}
              <th className="px-4 py-3 font-medium text-muted-foreground">Appointment</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Technician</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const orderActionList = orderActions(order)
              return (
                <tr
                  key={order.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    {onView ? (
                      <button
                        onClick={() => onView(order)}
                        className="font-mono text-xs text-trust-blue hover:underline"
                      >
                        {order.id.slice(0, 8)}
                      </button>
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground">
                        {order.id.slice(0, 8)}
                      </span>
                    )}
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
                  {showDevice && (
                    <td className="px-4 py-3 text-muted-foreground">
                      {order.device?.model || '—'}
                    </td>
                  )}
                  <td className="px-4 py-3 text-muted-foreground">
                    {order.appointmentDate
                      ? new Date(order.appointmentDate).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-ink-slate">
                    {order.technicianId ? (
                      <span className="text-assurance-green">Assigned</span>
                    ) : (
                      <span className="text-warm-sand">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {onView && (
                        <button
                          onClick={() => onView(order)}
                          className="rounded-md border border-border px-2 py-1 text-xs text-ink-slate hover:bg-muted"
                        >
                          View
                        </button>
                      )}
                      {actionButtons
                        ? actionButtons(order, orderActionList)
                        : null}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showPagination && totalPages > 1 && onPageChange && (
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
