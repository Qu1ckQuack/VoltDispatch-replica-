'use client'

import type { ReportingOverview } from '@/lib/api/types'

interface OverviewSectionProps {
  data: ReportingOverview | undefined
  loading: boolean
}

export function OverviewSection({ data, loading }: OverviewSectionProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Metric label="Total Orders" value={val(data?.totalOrders, loading)} />
      <Metric label="Active Orders" value={val(data?.activeOrders, loading)} />
      <Metric label="Completed Today" value={val(data?.completedToday, loading)} />
      <Metric
        label="SLA Breached"
        value={val(data?.slaBreached, loading)}
        danger={!loading && (data?.slaBreached ?? 0) > 0}
      />
      <Metric label="Technicians Online" value={val(data?.techniciansOnline, loading)} />
      <Metric
        label="Avg Rating"
        value={
          loading
            ? '...'
            : data?.avgRating != null
              ? Number(data.avgRating).toFixed(1)
              : '—'
        }
      />
    </div>
  )
}

function Metric({
  label,
  value,
  danger,
}: {
  label: string
  value: string
  danger?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-3xl font-bold ${
          danger ? 'text-signal-red' : 'text-ink-slate'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function val(v: unknown, loading: boolean): string {
  if (loading) return '...'
  return String(v ?? '—')
}
