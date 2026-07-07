'use client'

import { WorkOrderStatus } from '@/lib/api/types'
import { cn } from '@/lib/utils'

const MAIN_FLOW: WorkOrderStatus[] = [
  WorkOrderStatus.REQUESTED,
  WorkOrderStatus.ASSIGNED,
  WorkOrderStatus.ACCEPTED,
  WorkOrderStatus.EN_ROUTE,
  WorkOrderStatus.IN_PROGRESS,
  WorkOrderStatus.COMPLETED,
]

const HAPPY_INDEX: Record<string, number> = {}
MAIN_FLOW.forEach((s, i) => (HAPPY_INDEX[s] = i))

interface StatusStepperProps {
  status: WorkOrderStatus
}

export function StatusStepper({ status }: StatusStepperProps) {
  const currentIdx = HAPPY_INDEX[status]

  const isCancelled = status === WorkOrderStatus.CANCELLED
  const isIssueBranch =
    status === WorkOrderStatus.ISSUE ||
    status === WorkOrderStatus.ESCALATED
  const isRescheduled = status === WorkOrderStatus.RESCHEDULED

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        {MAIN_FLOW.map((step, i) => {
          const isRequested = i === 0
          const isCompleted =
            currentIdx !== undefined && i < currentIdx && !isCancelled && !isIssueBranch
          const isCurrent = i === currentIdx && !isCancelled && !isIssueBranch && !isRescheduled
          const isPast = currentIdx !== undefined && i <= currentIdx

          return (
            <div key={step} className="flex flex-1 items-center">
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                  isCompleted && 'bg-assurance-green text-white',
                  isCurrent && 'bg-trust-blue text-white ring-2 ring-trust-blue/30',
                  isPast && !isCompleted && !isCurrent && 'bg-muted text-muted-foreground',
                  !isPast && 'bg-muted/50 text-muted-foreground/50',
                )}
              >
                {isCompleted ? '✓' : isRequested ? 'R' : i + 1}
              </div>
              {i < MAIN_FLOW.length - 1 && (
                <div
                  className={cn(
                    'mx-1 h-0.5 flex-1',
                    isCompleted
                      ? 'bg-assurance-green'
                      : isCurrent || (currentIdx !== undefined && i < currentIdx)
                        ? 'bg-trust-blue'
                        : 'bg-muted',
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      {isCancelled && (
        <div className="flex items-center gap-2 rounded-md bg-signal-red/10 px-3 py-2">
          <span className="text-sm font-medium text-signal-red">Cancelled</span>
        </div>
      )}

      {isIssueBranch && (
        <div className="flex items-center gap-2 rounded-md bg-signal-red/10 px-3 py-2">
          <span className="text-sm font-medium text-signal-red">
            {status === WorkOrderStatus.ESCALATED ? 'Escalated' : 'Issue Reported'}
          </span>
        </div>
      )}

      {isRescheduled && (
        <div className="flex items-center gap-2 rounded-md bg-warm-sand/10 px-3 py-2">
          <span className="text-sm font-medium text-warm-sand">Rescheduled</span>
        </div>
      )}

      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] text-muted-foreground">Created</span>
        <span className="text-[11px] text-muted-foreground">Completed</span>
      </div>
    </div>
  )
}
