'use client'

import { X } from 'lucide-react'
import type { Customer } from '@/lib/api/types'

interface DeleteConfirmModalProps {
  customer: Customer
  onConfirm: () => void
  onClose: () => void
  loading?: boolean
}

export function DeleteConfirmModal({
  customer,
  onConfirm,
  onClose,
  loading,
}: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-slate">
            Delete Customer
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          Are you sure you want to delete{' '}
          <span className="font-medium text-ink-slate">{customer.name}</span>?
          This action cannot be undone.
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm text-ink-slate hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-signal-red px-4 py-2 text-sm text-white hover:bg-signal-red/90 disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
