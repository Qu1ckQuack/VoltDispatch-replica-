import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Schedule — VoltDispatch',
}

export default function SchedulePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-slate">Schedule</h1>
        <p className="text-sm text-muted-foreground">
          View appointment schedule and calendar
        </p>
      </div>

      <div className="rounded-xl border border-border bg-white p-6">
        <p className="text-sm text-muted-foreground">
          Schedule/calendar view will be built next.
        </p>
      </div>
    </div>
  )
}
