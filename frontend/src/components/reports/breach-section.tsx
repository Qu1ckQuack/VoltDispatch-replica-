'use client'

import { useWorkOrders } from '@/lib/hooks/use-work-orders'
import type { ReportingOverview } from '@/lib/api/types'

interface BreachSectionProps {
  overview: ReportingOverview | undefined
}

export function BreachSection({ overview }: BreachSectionProps) {
  const { data: orders } = useWorkOrders({ status: 'IN_PROGRESS' as never, limit: 50 })

  if (!overview || overview.slaBreached === 0) return null

  return (
    <div className="rounded-xl border border-signal-red/30 bg-white">
      <div className="border-b border-signal-red/30 bg-signal-red/5 px-6 py-3">
        <p className="text-sm font-semibold text-signal-red">
          {overview.slaBreached} SLA Breach{overview.slaBreached > 1 ? 'es' : ''}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-6 py-3 font-medium">ID</th>
              <th className="px-6 py-3 font-medium">Customer</th>
              <th className="px-6 py-3 font-medium">Area</th>
              <th className="px-6 py-3 font-medium">Deadline</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(orders?.data ?? []).map((o) => (
              <tr
                key={o.id}
                className="border-b border-border last:border-0 hover:bg-muted/30"
              >
                <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                  {o.id.slice(0, 8)}
                </td>
                <td className="px-6 py-3 text-ink-slate">
                  {o.customer?.name || '—'}
                </td>
                <td className="px-6 py-3 text-ink-slate">{o.subDistrict}</td>
                <td className="px-6 py-3 text-signal-red">
                  {o.slaDeadline
                    ? new Date(o.slaDeadline).toLocaleDateString()
                    : '—'}
                </td>
                <td className="px-6 py-3">{o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
