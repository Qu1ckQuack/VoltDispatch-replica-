'use client'

import { useState } from 'react'
import { X, Search } from 'lucide-react'
import type { WorkOrder, Technician } from '@/lib/api/types'

interface AssignModalProps {
  order: WorkOrder | null
  technicians: Technician[]
  loading: boolean
  onAssign: (technicianId: string) => void
  onClose: () => void
}

export function AssignModal({
  order,
  technicians,
  loading,
  onAssign,
  onClose,
}: AssignModalProps) {
  const [search, setSearch] = useState('')

  if (!order) return null

  const filtered = technicians.filter(
    (t) =>
      t.subDistrict.toLowerCase().includes(search.toLowerCase()) ||
      t.userId.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-slate">
            Assign Technician
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
          {' '}— {order.subDistrict}
        </p>

        <div className="relative mb-4">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by area or ID..."
            className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm text-ink-slate placeholder:text-muted-foreground focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
          />
        </div>

        <div className="max-h-60 space-y-1 overflow-y-auto">
          {loading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Loading technicians...
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No technicians found
            </p>
          ) : (
            filtered.map((tech) => (
              <button
                key={tech.id}
                onClick={() => onAssign(tech.id)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-clear-sky"
              >
                <div>
                  <span className="font-medium text-ink-slate">
                    {tech.userId.slice(0, 8)}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {tech.subDistrict}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    tech.status === 'AVAILABLE'
                      ? 'bg-assurance-green/15 text-assurance-green'
                      : tech.status === 'BUSY'
                        ? 'bg-warm-sand/15 text-warm-sand'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {tech.status}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-slate hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
