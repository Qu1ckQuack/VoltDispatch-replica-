'use client'

import { useAuthStore } from '@/lib/stores/auth-store'

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-slate">
          Welcome{user?.email ? `, ${user.email}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground">
          {user?.role === 'COORDINATOR'
            ? 'Manage work orders and technician assignments'
            : user?.role === 'TECHNICIAN'
              ? 'View your assigned work orders and update status'
              : user?.role === 'DEALER'
                ? 'Manage your customers and work orders'
                : 'System overview and reporting'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Active Orders" value="—" />
        <MetricCard label="Pending" value="—" />
        <MetricCard label="Today's Completions" value="—" />
        <MetricCard label="Technicians Online" value="—" />
      </div>

      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="mb-2 text-lg font-semibold text-ink-slate">
          Recent Activity
        </h2>
        <p className="text-sm text-muted-foreground">
          Activity feed will appear here once the backend is connected.
        </p>
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
