'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { WorkOrder } from '@/lib/api/types'
import { OrderCard } from './order-card'

interface DateGroupProps {
  date: string
  orders: WorkOrder[]
  onView: (order: WorkOrder) => void
}

export function DateGroup({ date, orders, onView }: DateGroupProps) {
  const [expanded, setExpanded] = useState(true)
  const d = new Date(date)
  const isToday = d.toDateString() === new Date().toDateString()

  return (
    <div className="rounded-xl border border-border bg-white">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 border-b border-border px-6 py-3 text-left"
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span className="text-sm font-semibold text-ink-slate">
          {isToday
            ? 'Today'
            : d.toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
        </span>
        <span className="text-xs text-muted-foreground">
          {orders.length} order{orders.length > 1 ? 's' : ''}
        </span>
      </button>
      {expanded && (
        <div className="space-y-2 p-4">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} onView={onView} />
          ))}
        </div>
      )}
    </div>
  )
}
