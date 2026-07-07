'use client'

import { useAuthStore } from '@/lib/stores/auth-store'
import { useWorkOrders } from '@/lib/hooks/use-work-orders'
import { useReportingOverview } from '@/lib/hooks/use-reporting'
import { UserRole } from '@/lib/api/types'
import { StatusBadge } from '@/components/queue/status-badge'

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { data: overview, isLoading: overviewLoading } = useReportingOverview()
  const { data: recentOrders } = useWorkOrders({ page: 1, limit: 10 })

  const isHQorCoord =
    user?.role === UserRole.HQ || user?.role === UserRole.COORDINATOR
  const isTech = user?.role === UserRole.TECHNICIAN

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-slate">
          Welcome{user?.email ? `, ${user.email.split('@')[0]}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isTech
            ? 'Your assigned work orders'
            : isHQorCoord
              ? 'System overview and key metrics'
              : 'Your work orders and activity'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Active Orders"
          value={
            overviewLoading ? '...' : String(overview?.activeOrders ?? '—')
          }
        />
        <MetricCard
          label="Completed Today"
          value={
            overviewLoading ? '...' : String(overview?.completedToday ?? '—')
          }
        />
        <MetricCard
          label="Technicians Online"
          value={
            overviewLoading
              ? '...'
              : String(overview?.techniciansOnline ?? '—')
          }
        />
        <MetricCard
          label="Avg Rating"
          value={
            overviewLoading
              ? '...'
              : overview?.avgRating != null
                ? Number(overview.avgRating).toFixed(1)
                : '—'
          }
        />
      </div>

      {isHQorCoord && overview && overview.slaBreached > 0 && (
        <div className="rounded-xl border border-signal-red/30 bg-signal-red/5 px-4 py-3">
          <p className="text-sm font-medium text-signal-red">
            {overview.slaBreached} work order
            {overview.slaBreached > 1 ? 's' : ''} past SLA deadline
          </p>
        </div>
      )}

      {isTech && (
        <div className="rounded-xl border border-border bg-white p-6">
          <h2 className="mb-3 text-lg font-semibold text-ink-slate">
            My Next Job
          </h2>
          <p className="text-sm text-muted-foreground">
            Check your assigned work orders below.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-white">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-ink-slate">
            Recent Work Orders
          </h2>
        </div>
        {recentOrders && recentOrders.data.length > 0 ? (
          <div className="divide-y divide-border">
            {recentOrders.data.map((order) => (
              <div
                key={order.id}
                className="flex items-center gap-4 px-6 py-3 text-sm"
              >
                <span className="w-16 font-mono text-xs text-muted-foreground">
                  {order.id.slice(0, 8)}
                </span>
                <StatusBadge status={order.status} />
                <span className="flex-1 text-ink-slate">
                  {order.subDistrict}
                </span>
                <span className="text-muted-foreground">
                  {order.customer?.name || '—'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-sm text-muted-foreground">
            No recent work orders
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink-slate">{value}</p>
    </div>
  )
}
