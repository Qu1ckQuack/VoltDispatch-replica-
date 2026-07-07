'use client'

import { X } from 'lucide-react'
import { useCustomer } from '@/lib/hooks/use-customers'

interface CustomerDetailModalProps {
  customerId: string
  onClose: () => void
}

export function CustomerDetailModal({
  customerId,
  onClose,
}: CustomerDetailModalProps) {
  const { data: customer, isLoading } = useCustomer(customerId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-slate">
            {isLoading ? 'Loading...' : customer?.name || 'Customer'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : customer ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Name" value={customer.name} />
              <Field label="Phone" value={customer.phone || '—'} />
              <Field label="Email" value={customer.email || '—'} />
              <Field label="Sub-district" value={customer.subDistrict} />
              <Field label="Address" value={customer.address} />
            </div>

            
          </div>
        ) : (
          <p className="text-sm text-signal-red">Customer not found</p>
        )}

        <div className="mt-6 flex justify-end border-t border-border pt-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm text-ink-slate hover:bg-muted"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-ink-slate">{value}</p>
    </div>
  )
}
