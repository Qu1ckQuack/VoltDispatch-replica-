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
          <p className="text-sm text-muted-foreground">
            KPI overview and SLA breach monitoring
          </p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      <OverviewSection data={overview} loading={overviewLoading} />
      <SummaryChart data={summary} loading={summaryLoading} />
      <BreachSection overview={overview} />
    </div>
  )
}
