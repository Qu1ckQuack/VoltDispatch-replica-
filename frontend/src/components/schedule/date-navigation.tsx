'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DateNavigationProps {
  date: Date
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

export function DateNavigation({ date, onPrev, onNext, onToday }: DateNavigationProps) {
  const isToday =
    date.toDateString() === new Date().toDateString()

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onToday}
        disabled={isToday}
        className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink-slate hover:bg-muted disabled:opacity-40"
      >
        Today
      </button>
      <div className="flex items-center gap-1">
        <button
          onClick={onPrev}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="min-w-[180px] text-center text-sm font-medium text-ink-slate">
          {date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
        <button
          onClick={onNext}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
