'use client'

import { useState, useMemo } from 'react'
import type { Technician } from '@/lib/api/types'
import { TechnicianStatus } from '@/lib/api/types'
import { cn } from '@/lib/utils'

interface TechnicianTableProps {
  technicians: Technician[]
  loading: boolean
  onEdit: (t: Technician) => void
  onDelete: (t: Technician) => void
}

const STATUS_STYLES: Record<string, string> = {
  [TechnicianStatus.AVAILABLE]: 'bg-assurance-green/15 text-assurance-green',
  [TechnicianStatus.BUSY]: 'bg-warm-sand/15 text-warm-sand',
  [TechnicianStatus.OFFLINE]: 'bg-muted text-muted-foreground',
}

const STATUS_ORDER: Record<string, number> = {
  [TechnicianStatus.AVAILABLE]: 0,
  [TechnicianStatus.BUSY]: 1,
  [TechnicianStatus.OFFLINE]: 2,
}

export function TechnicianTable({
  technicians,
  loading,
  onEdit,
  onDelete,
}: TechnicianTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const filtered = useMemo(() => {
    let list = technicians
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (t) =>
          t.subDistrict.toLowerCase().includes(q) ||
          t.userId.toLowerCase().includes(q),
      )
    }
    if (statusFilter) {
      list = list.filter((t) => t.status === statusFilter)
    }
    return [...list].sort(
      (a, b) =>
        (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99),
    )
  }, [technicians, search, statusFilter])

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-white p-8 text-center text-sm text-muted-foreground">
        Loading technicians...
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by area..."
          className="w-48 rounded-lg border border-border px-3 py-1.5 text-sm focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-36 rounded-lg border border-border px-3 py-1.5 text-sm focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
        >
          <option value="">All statuses</option>
          {Object.values(TechnicianStatus).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-muted-foreground">
          {search || statusFilter
            ? 'No technicians match your filters'
            : 'No technicians found'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-6 py-3 font-medium">User ID</th>
                <th className="px-6 py-3 font-medium">Sub-district</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Rating</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-6 py-3 font-mono text-xs text-ink-slate">
                    {t.userId.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-3 text-ink-slate">{t.subDistrict}</td>
                  <td className="px-6 py-3">
                    <span
                      className={cn(
                        'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
                        STATUS_STYLES[t.status],
                      )}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {t.ratingCount > 0
                      ? `${Number(t.ratingAvg).toFixed(1)} (${t.ratingCount})`
                      : '—'}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => onEdit(t)}
                        className="rounded-md border border-border px-2.5 py-1 text-xs text-ink-slate hover:bg-muted"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(t)}
                        className="rounded-md border border-signal-red/30 px-2.5 py-1 text-xs text-signal-red hover:bg-signal-red/10"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
