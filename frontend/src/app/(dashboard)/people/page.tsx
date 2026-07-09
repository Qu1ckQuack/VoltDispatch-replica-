'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { useCustomers } from '@/lib/hooks/use-customers'
import { useTechnicians } from '@/lib/hooks/use-technicians'
import { useUsers } from '@/lib/hooks/use-users'
import { TechnicianStatus } from '@/lib/api/types'
import { cn } from '@/lib/utils'

type Person = {
  id: string
  name: string
  role: 'Technician' | 'Customer'
  phone: string | null
  email: string | null
  area: string
  status: string | null
  userId?: string
}

const STATUS_STYLES: Record<string, string> = {
  [TechnicianStatus.AVAILABLE]: 'bg-assurance-green/15 text-assurance-green',
  [TechnicianStatus.BUSY]: 'bg-warm-sand/15 text-warm-sand',
  [TechnicianStatus.OFFLINE]: 'bg-muted text-muted-foreground',
}

export default function PeoplePage() {
  const { data: customers = [], isLoading: loadingCustomers } = useCustomers()
  const { data: technicians = [], isLoading: loadingTechs } = useTechnicians()
  const { data: users = [] } = useUsers()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const people = useMemo<Person[]>(() => {
    const result: Person[] = []

    for (const c of customers) {
      result.push({
        id: c.id,
        name: c.name,
        role: 'Customer',
        phone: c.phone,
        email: c.email,
        area: c.subDistrict,
        status: null,
      })
    }

    for (const t of technicians) {
      const user = users.find((u) => u.technician?.id === t.id)
      result.push({
        id: t.id,
        name: user?.email ?? t.userId.slice(0, 8),
        role: 'Technician',
        phone: user?.phone ?? null,
        email: user?.email ?? null,
        area: `${t.subDistrict}${t.district ? `, ${t.district}` : ''}`,
        status: t.status,
        userId: t.userId,
      })
    }

    return result
  }, [customers, technicians, users])

  const filtered = useMemo(() => {
    let list = people
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q) ||
          p.phone?.includes(q) ||
          p.area.toLowerCase().includes(q) ||
          p.userId?.toLowerCase().includes(q),
      )
    }
    if (roleFilter) {
      list = list.filter((p) => p.role === roleFilter)
    }
    if (statusFilter) {
      list = list.filter((p) => p.status === statusFilter)
    }
    return list
  }, [people, search, roleFilter, statusFilter])

  const loading = loadingCustomers || loadingTechs

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-slate">People</h1>
        <p className="text-sm text-muted-foreground">
          View all customers and technicians
        </p>
      </div>

      <div className="rounded-xl border border-border bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-4">
          <div className="relative w-64">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, phone, or area..."
              className="w-full rounded-lg border border-border py-2 pl-9 pr-3 text-sm focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-36 rounded-lg border border-border px-3 py-2 text-sm focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
          >
            <option value="">All roles</option>
            <option value="Technician">Technicians</option>
            <option value="Customer">Customers</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-36 rounded-lg border border-border px-3 py-2 text-sm focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
          >
            <option value="">All statuses</option>
            {Object.values(TechnicianStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="px-6 py-8 text-center text-sm text-muted-foreground">
            Loading people...
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-muted-foreground">
            {search || roleFilter || statusFilter
              ? 'No people match your filters'
              : 'No people found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Contact</th>
                  <th className="px-6 py-3 font-medium">Area</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={`${p.role}-${p.id}`}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-6 py-3 font-medium text-ink-slate">
                      {p.name}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={cn(
                          'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
                          p.role === 'Technician'
                            ? 'bg-trust-blue/15 text-trust-blue'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {p.role}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      <div className="text-xs">
                        {p.email && <p>{p.email}</p>}
                        {p.phone && <p className="text-muted-foreground/70">{p.phone}</p>}
                        {!p.email && !p.phone && <span className="italic">—</span>}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-ink-slate">{p.area}</td>
                    <td className="px-6 py-3">
                      {p.status ? (
                        <span
                          className={cn(
                            'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
                            STATUS_STYLES[p.status],
                          )}
                        >
                          {p.status}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
