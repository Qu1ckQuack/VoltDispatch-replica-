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
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-border bg-white text-sm text-muted-foreground">
        Loading chart...
      </div>
    )
  }

  if (!data || !data.data || data.data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-border bg-white text-sm text-muted-foreground">
        No data for this period
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-ink-slate">
        {data.period.charAt(0).toUpperCase() + data.period.slice(1)}ly Summary
      </h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.data}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(v) =>
                new Date(v).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })
              }
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="total"
              name="Total"
              fill="#1D63B4"
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="completed"
              name="Completed"
              fill="#2F9E58"
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="cancelled"
              name="Cancelled"
              fill="#E3A542"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
