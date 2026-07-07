'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { WorkOrder } from '@/lib/api/types'

interface RescheduleModalProps {
  order: WorkOrder | null
  onReschedule: (date: string) => void
  onClose: () => void
}

export function RescheduleModal({
  order,
  onReschedule,
  onClose,
}: RescheduleModalProps) {
  const [date, setDate] = useState(
    order?.appointmentDate
      ? new Date(order.appointmentDate).toISOString().slice(0, 16)
      : '',
  )

  if (!order) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (date) onReschedule(new Date(date).toISOString())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-slate">
            Reschedule Appointment
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          Work order <span className="font-mono font-medium text-ink-slate">{order.id.slice(0, 8)}</span>
          {' '}— current:{' '}
          {order.appointmentDate
            ? new Date(order.appointmentDate).toLocaleDateString()
            : 'not set'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="appointment"
              className="mb-1 block text-sm font-medium text-ink-slate"
            >
              New appointment date & time
            </label>
            <input
              id="appointment"
              type="datetime-local"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-slate focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-slate hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!date}
              className="rounded-lg bg-trust-blue px-4 py-2 text-sm font-medium text-white hover:bg-trust-blue/90 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
