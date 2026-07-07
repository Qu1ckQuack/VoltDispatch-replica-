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
