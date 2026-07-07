'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { WorkOrder } from '@/lib/api/types'

interface CancelModalProps {
  order: WorkOrder | null
  onCancel: (note?: string) => void
  onClose: () => void
  loading?: boolean
}

export function CancelModal({ order, onCancel, onClose, loading }: CancelModalProps) {
  const [note, setNote] = useState('')

  if (!order) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-slate">Cancel Work Order</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          Are you sure you want to cancel work order{' '}
          <span className="font-mono font-medium text-ink-slate">
            {order.id.slice(0, 8)}
          </span>
          ?
        </p>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-ink-slate">
            Reason (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-slate placeholder:text-muted-foreground focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
            placeholder="Why is this being cancelled?"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-slate hover:bg-muted"
          >
            Keep
          </button>
          <button
            onClick={() => onCancel(note || undefined)}
            disabled={loading}
            className="rounded-lg bg-signal-red px-4 py-2 text-sm font-medium text-white hover:bg-signal-red/90 disabled:opacity-50"
          >
            {loading ? 'Cancelling...' : 'Yes, cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}
