import { WorkOrderStatus } from '@/lib/api/types'
import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<string, string> = {
  [WorkOrderStatus.REQUESTED]: 'bg-warm-sand/15 text-warm-sand',
  [WorkOrderStatus.ASSIGNED]: 'bg-trust-blue/15 text-trust-blue',
  [WorkOrderStatus.ACCEPTED]: 'bg-assurance-green/15 text-assurance-green',
  [WorkOrderStatus.RESCHEDULED]: 'bg-warm-sand/15 text-warm-sand',
  [WorkOrderStatus.EN_ROUTE]: 'bg-trust-blue/15 text-trust-blue',
  [WorkOrderStatus.IN_PROGRESS]: 'bg-trust-blue/15 text-trust-blue',
  [WorkOrderStatus.ISSUE]: 'bg-signal-red/15 text-signal-red',
  [WorkOrderStatus.ESCALATED]: 'bg-signal-red/15 text-signal-red',
  [WorkOrderStatus.COMPLETED]: 'bg-assurance-green/15 text-assurance-green',
  [WorkOrderStatus.CANCELLED]: 'bg-muted text-muted-foreground',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_STYLES[status] || 'bg-muted text-muted-foreground',
      )}
    >
      {status}
    </span>
  )
}
