'use client'

import type { WorkOrder } from '@/lib/api/types'
import { StatusBadge } from './status-badge'
import { WorkOrderStatus } from '@/lib/api/types'

interface WorkOrderTableProps {
  orders: WorkOrder[]
  loading: boolean
  onAssign: (order: WorkOrder) => void
  onReschedule: (order: WorkOrder) => void
}

const PRIORITY_LABELS: Record<number, string> = {
  0: 'Normal',
  1: 'High',
  2: 'Urgent',
}

export function WorkOrderTable({
  orders,
  loading,
  onAssign,
  onReschedule,
}: WorkOrderTableProps) {
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
        No work orders match the current filters.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left">
            <th className="px-4 py-3 font-medium text-muted-foreground">ID</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Priority</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Area</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Customer</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Appointment</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Technician</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              className="border-b border-border last:border-0 hover:bg-muted/30"
            >
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {order.id.slice(0, 8)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={order.status} />
              </td>
              <td className="px-4 py-3">
                <span
                  className={
                    order.priority === 2
                      ? 'font-medium text-signal-red'
                      : order.priority === 1
                        ? 'font-medium text-warm-sand'
                        : 'text-muted-foreground'
                  }
                >
                  {PRIORITY_LABELS[order.priority] || 'Normal'}
                </span>
              </td>
              <td className="px-4 py-3 text-ink-slate">{order.subDistrict}</td>
              <td className="px-4 py-3 text-ink-slate">
                {order.customer?.name || '—'}
              </td>
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
                <div className="flex gap-1">
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
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
