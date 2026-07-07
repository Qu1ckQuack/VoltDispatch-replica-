'use client'

import { useState, useMemo } from 'react'
import { useWorkOrders } from '@/lib/hooks/use-work-orders'
import type { WorkOrder } from '@/lib/api/types'
import { DateNavigation } from '@/components/schedule/date-navigation'
import { DateGroup } from '@/components/schedule/date-group'
import { OrderDetailModal } from '@/components/work-orders/order-detail-modal'

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [detailTarget, setDetailTarget] = useState<WorkOrder | null>(null)

  const { data: workOrdersRes, isLoading } = useWorkOrders({
    limit: 100,
  })

  const grouped = useMemo(() => {
    const orders = workOrdersRes?.data ?? []
    const withAppointment = orders.filter((o) => o.appointmentDate)
    const groups: Record<string, WorkOrder[]> = {}
    for (const order of withAppointment) {
      const key = new Date(order.appointmentDate!).toDateString()
      if (!groups[key]) groups[key] = []
      groups[key].push(order)
    }
    return Object.entries(groups).sort(
      ([a], [b]) => new Date(a).getTime() - new Date(b).getTime(),
    )
  }, [workOrdersRes])

  const navigateDate = (days: number) => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + days)
    setCurrentDate(d)
  }

  const ordersForDate = useMemo(() => {
    const key = currentDate.toDateString()
    return grouped.find(([date]) => date === key)?.[1] ?? []
  }, [grouped, currentDate])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-slate">Schedule</h1>
          <p className="text-sm text-muted-foreground">
            View appointments by date
          </p>
        </div>
        <DateNavigation
          date={currentDate}
          onPrev={() => navigateDate(-1)}
          onNext={() => navigateDate(1)}
          onToday={() => setCurrentDate(new Date())}
        />
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-border bg-white p-8 text-center text-sm text-muted-foreground">
          Loading schedule...
        </div>
      ) : ordersForDate.length > 0 ? (
        <DateGroup
          date={currentDate.toISOString()}
          orders={ordersForDate}
          onView={setDetailTarget}
        />
      ) : (
        <div className="rounded-xl border border-border bg-white p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No appointments scheduled for this date.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Use the date navigation to browse other days, or view all upcoming
            appointments below.
          </p>
        </div>
      )}

      {/* Upcoming appointments */}
      {grouped.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-ink-slate">
            All Upcoming Appointments
          </h2>
          {grouped.map(([date, orders]) => (
            <DateGroup
              key={date}
              date={date}
              orders={orders}
              onView={setDetailTarget}
            />
          ))}
        </div>
      )}

      {detailTarget && (
        <OrderDetailModal
          order={detailTarget}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </div>
  )
}
