'use client'

import { X } from 'lucide-react'
import { StatusBadge } from '@/components/queue/status-badge'
import { StatusStepper } from '@/components/shared/status-stepper'
import type { WorkOrder, WorkOrderStatusHistory } from '@/lib/api/types'
import { WorkOrderStatus } from '@/lib/api/types'

interface OrderDetailModalProps {
  order: WorkOrder | null
  onClose: () => void
}

export function OrderDetailModal({ order, onClose }: OrderDetailModalProps) {
  if (!order) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-slate">
            Work Order <span className="font-mono">{order.id.slice(0, 8)}</span>
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <StatusBadge status={order.status} />
          {order.technician && (
            <span className="text-xs text-muted-foreground">
              {order.technician.userId ? `Tech: ${order.technician.userId.slice(0, 8)}` : ''}
            </span>
          )}
        </div>

        <div className="mb-6">
          <StatusStepper status={order.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Sub-district" value={order.subDistrict} />
          <Field
            label="Priority"
            value={
              order.priority === 2
                ? 'Urgent'
                : order.priority === 1
                  ? 'High'
                  : 'Normal'
            }
          />
          <Field
            label="Customer"
            value={order.customer?.name || '—'}
          />
          <Field
            label="Device"
            value={order.device?.model || '—'}
          />
          <Field
            label="Technician"
            value={
              order.technicianId
                ? `${order.technician?.userId?.slice(0, 8) || 'Assigned'}`
                : 'Unassigned'
            }
          />
          <Field
            label="Department"
            value={order.department || '—'}
          />
          <Field
            label="Appointment"
            value={
              order.appointmentDate
                ? new Date(order.appointmentDate).toLocaleString()
                : '—'
            }
          />
          <Field
            label="SLA Deadline"
            value={
              order.slaDeadline
                ? new Date(order.slaDeadline).toLocaleString()
                : '—'
            }
          />
          <Field
            label="Created"
            value={new Date(order.createdAt).toLocaleString()}
          />
          <Field
            label="Completed"
            value={
              order.completedAt
                ? new Date(order.completedAt).toLocaleString()
                : '—'
            }
          />
        </div>

        {order.statusHistory && order.statusHistory.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-ink-slate">
              Activity Log
            </h3>
            <div className="space-y-2">
              {order.statusHistory.map((h) => (
                <div
                  key={h.id}
                  className="flex items-start gap-3 rounded-lg bg-muted/30 px-3 py-2 text-xs"
                >
                  <div className="mt-0.5 shrink-0">
                    <StatusBadge status={h.toStatus} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-ink-slate">
                      {formatTransition(h)}
                    </p>
                    {h.note && (
                      <p className="mt-0.5 italic text-muted-foreground">
                        &quot;{h.note}&quot;
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-muted-foreground">
                    {new Date(h.changedAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end border-t border-border pt-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-slate hover:bg-muted"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function formatTransition(h: WorkOrderStatusHistory): string {
  const from = h.fromStatus
  const to = h.toStatus

  if (!from) {
    if (to === WorkOrderStatus.REQUESTED) return 'Order created'
    return `${to}`
  }

  if (to === WorkOrderStatus.CANCELLED) return 'Cancelled'

  switch (`${from}->${to}`) {
    case `${WorkOrderStatus.REQUESTED}->${WorkOrderStatus.ASSIGNED}`:
      return 'Assigned to technician'
    case `${WorkOrderStatus.ASSIGNED}->${WorkOrderStatus.ACCEPTED}`:
      return 'Technician accepted the order'
    case `${WorkOrderStatus.ASSIGNED}->${WorkOrderStatus.RESCHEDULED}`:
      return 'Appointment rescheduled'
    case `${WorkOrderStatus.ACCEPTED}->${WorkOrderStatus.EN_ROUTE}`:
      return 'Technician is en route'
    case `${WorkOrderStatus.EN_ROUTE}->${WorkOrderStatus.IN_PROGRESS}`:
      return 'Work started'
    case `${WorkOrderStatus.IN_PROGRESS}->${WorkOrderStatus.ISSUE}`:
      return 'Issue reported on site'
    case `${WorkOrderStatus.ISSUE}->${WorkOrderStatus.ESCALATED}`:
      return 'Issue escalated'
    case `${WorkOrderStatus.ISSUE}->${WorkOrderStatus.IN_PROGRESS}`:
      return 'Issue resolved, work resumed'
    case `${WorkOrderStatus.IN_PROGRESS}->${WorkOrderStatus.COMPLETED}`:
      return 'Work completed'
    default:
      return `${from} → ${to}`
  }
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-ink-slate">{value}</p>
    </div>
  )
}
