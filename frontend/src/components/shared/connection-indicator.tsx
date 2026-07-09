'use client'

import { useLocationSocket } from '@/lib/hooks/use-location-socket'
import { cn } from '@/lib/utils'

export function ConnectionIndicator() {
  const { state, lastUpdateAt } = useLocationSocket()

  const dotColor =
    state === 'connected'
      ? 'bg-assurance-green'
      : state === 'reconnecting'
        ? 'bg-warm-sand'
        : 'bg-signal-red'

  const label =
    state === 'connected'
      ? 'Live'
      : state === 'reconnecting'
        ? 'Reconnecting…'
        : 'Disconnected'

  return (
    <div
      className="group relative flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
      title={
        lastUpdateAt
          ? `Last update: ${lastUpdateAt.toISOString()}`
          : 'No data received yet'
      }
    >
      <span className={cn('h-2 w-2 rounded-full', dotColor)} />
      <span>{label}</span>
      {state === 'reconnecting' && (
        <span className="ml-1 animate-pulse text-[10px] text-warm-sand">●</span>
      )}
    </div>
  )
}
