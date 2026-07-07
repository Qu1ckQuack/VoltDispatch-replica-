'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import type { Customer } from '@/lib/api/types'

interface CustomerTableProps {
  customers: Customer[]
  loading: boolean
  onEdit: (c: Customer) => void
  onDelete: (c: Customer) => void
}

export function CustomerTable({
  customers,
  loading,
  onEdit,
  onDelete,
}: CustomerTableProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () =>
      customers.filter(
        (c) =>
          !search ||
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.phone?.includes(search) ||
          c.subDistrict.toLowerCase().includes(search.toLowerCase()),
      ),
    [customers, search],
  )

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-white p-8 text-center text-sm text-muted-foreground">
        Loading customers...
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-white">
      <div className="border-b border-border px-6 py-4">
        <div className="relative w-72 max-w-full">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, or area..."
            className="w-full rounded-lg border border-border py-2 pl-9 pr-3 text-sm focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-muted-foreground">
          {search ? 'No customers match your search' : 'No customers found'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Phone</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Sub-district</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-6 py-3 font-medium text-ink-slate">
                    {c.name}
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {c.phone || '—'}
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {c.email || '—'}
                  </td>
                  <td className="px-6 py-3 text-ink-slate">{c.subDistrict}</td>
                  <td className="px-6 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => onEdit(c)}
                        className="rounded-md border border-border px-2.5 py-1 text-xs text-ink-slate hover:bg-muted"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(c)}
                        className="rounded-md border border-signal-red/30 px-2.5 py-1 text-xs text-signal-red hover:bg-signal-red/10"
                      >
                        Delete
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
