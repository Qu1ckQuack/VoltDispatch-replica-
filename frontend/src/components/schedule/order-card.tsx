'use client'

import type { WorkOrder } from '@/lib/api/types'
import { StatusBadge } from '@/components/queue/status-badge'

interface OrderCardProps {
  order: WorkOrder
  onView: (order: WorkOrder) => void
}

export function OrderCard({ order, onView }: OrderCardProps) {
  return (
    <div
      onClick={() => onView(order)}
      className="flex cursor-pointer items-center gap-4 rounded-lg border border-border bg-white px-4 py-3 text-sm transition-colors hover:bg-muted/30"
    >
      <span className="font-mono text-xs text-muted-foreground">
        {order.id.slice(0, 8)}
      </span>
      <StatusBadge status={order.status} />
      <span className="flex-1 text-ink-slate">{order.subDistrict}</span>
      <span className="hidden text-muted-foreground sm:inline">
        {order.customer?.name || '—'}
      </span>
      <span className="hidden text-xs text-muted-foreground md:inline">
        {order.technicianId ? 'Assigned' : 'Unassigned'}
      </span>
      <span
        className={`shrink-0 text-xs ${
          order.priority === 2
            ? 'font-semibold text-signal-red'
            : order.priority === 1
              ? 'font-medium text-warm-sand'
              : 'text-muted-foreground'
        }`}
      >
        {order.priority === 2
          ? 'URGENT'
          : order.priority === 1
            ? 'HIGH'
            : ''}
      </span>
    </div>
  )
}
