# Reports Page — Implementation Plan (HQ)

## Step 0: Install dependency
```
cd frontend; npm install recharts
```

## Files to create

### 1. `src/components/reports/period-selector.tsx`
```tsx
'use client'

import { ReportPeriod } from '@/lib/api/types'
import { cn } from '@/lib/utils'

const OPTIONS = [
  { label: 'Week', value: ReportPeriod.WEEK },
  { label: 'Month', value: ReportPeriod.MONTH },
  { label: 'Quarter', value: ReportPeriod.QUARTER },
  { label: 'Year', value: ReportPeriod.YEAR },
]

interface PeriodSelectorProps {
  value: string
  onChange: (v: ReportPeriod) => void
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-white p-0.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            value === opt.value
              ? 'bg-trust-blue text-white'
              : 'text-muted-foreground hover:text-ink-slate',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
```

### 2. `src/components/reports/overview-section.tsx`
6 metric cards in a 3×2 grid from `ReportingOverview`:
- Total Orders, Active Orders, Completed Today, SLA Breached (red if >0), Technicians Online, Avg Rating

```tsx
'use client'

import type { ReportingOverview } from '@/lib/api/types'

interface OverviewSectionProps {
  data: ReportingOverview | undefined
  loading: boolean
}

export function OverviewSection({ data, loading }: OverviewSectionProps) {
  const v = (val: unknown) => (loading ? '...' : String(val ?? '—'))

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <MetricCard label="Total Orders" value={v(data?.totalOrders)} />
      <MetricCard label="Active Orders" value={v(data?.activeOrders)} />
      <MetricCard label="Completed Today" value={v(data?.completedToday)} />
      <MetricCard
        label="SLA Breached"
        value={v(data?.slaBreached)}
        highlight={!loading && (data?.slaBreached ?? 0) > 0 ? 'red' : undefined}
      />
      <MetricCard label="Technicians Online" value={v(data?.techniciansOnline)} />
      <MetricCard label="Avg Rating" value={loading ? '...' : data?.avgRating != null ? Number(data.avgRating).toFixed(1) : '—'} />
    </div>
  )
}

function MetricCard({ label, value, highlight }: { label: string; value: string; highlight?: 'red' }) {
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${highlight === 'red' ? 'text-signal-red' : 'text-ink-slate'}`}>
        {value}
      </p>
    </div>
  )
}
```

### 3. `src/components/reports/summary-chart.tsx`
Recharts `BarChart` — one bar per date, stacked: completed (green) / total (blue) / cancelled (sand).

```tsx
'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { ReportingSummary } from '@/lib/api/types'

interface SummaryChartProps {
  data: ReportingSummary | undefined
  loading: boolean
}

export function SummaryChart({ data, loading }: SummaryChartProps) {
  if (loading) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Loading chart...</div>
  }

  if (!data || !data.data || data.data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No data for this period</div>
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.data}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="total" name="Total" fill="#1D63B4" radius={[2, 2, 0, 0]} />
          <Bar dataKey="completed" name="Completed" fill="#2F9E58" radius={[2, 2, 0, 0]} />
          <Bar dataKey="cancelled" name="Cancelled" fill="#E3A542" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

### 4. `src/components/reports/breach-section.tsx`
Shows breached order count + detail table.

```tsx
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
              <tr key={o.id} className="border-b border-border last:border-0">
                <td className="px-6 py-3 font-mono text-xs">{o.id.slice(0, 8)}</td>
                <td className="px-6 py-3">{o.customer?.name || '—'}</td>
                <td className="px-6 py-3">{o.subDistrict}</td>
                <td className="px-6 py-3 text-signal-red">
                  {o.slaDeadline ? new Date(o.slaDeadline).toLocaleString() : '—'}
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
```

### 5. Rewrite `src/app/(dashboard)/reports/page.tsx`
```tsx
'use client'

import { useState } from 'react'
import { ReportPeriod } from '@/lib/api/types'
import { useReportingOverview, useReportingSummary } from '@/lib/hooks/use-reporting'
import { PeriodSelector } from '@/components/reports/period-selector'
import { OverviewSection } from '@/components/reports/overview-section'
import { SummaryChart } from '@/components/reports/summary-chart'
import { BreachSection } from '@/components/reports/breach-section'

export default function ReportsPage() {
  const [period, setPeriod] = useState(ReportPeriod.WEEK)
  const { data: overview, isLoading: overviewLoading } = useReportingOverview()
  const { data: summary, isLoading: summaryLoading } = useReportingSummary({ period })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-slate">Reports</h1>
          <p className="text-sm text-muted-foreground">KPI overview and SLA breach monitoring</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      <OverviewSection data={overview} loading={overviewLoading} />
      <SummaryChart data={summary} loading={summaryLoading} />
      <BreachSection overview={overview} />
    </div>
  )
}
```

## Implementation order
1. `npm install recharts` in frontend/
2. Create `src/components/reports/period-selector.tsx`
3. Create `src/components/reports/overview-section.tsx`
4. Create `src/components/reports/summary-chart.tsx`
5. Create `src/components/reports/breach-section.tsx`
6. Rewrite `src/app/(dashboard)/reports/page.tsx`
7. Run `npx tsc --noEmit`
8. Run `npx next build`
