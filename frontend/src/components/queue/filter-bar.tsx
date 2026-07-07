'use client'

import { WorkOrderStatus } from '@/lib/api/types'

interface FilterBarProps {
  subDistrict: string
  status: string
  onSubDistrictChange: (v: string) => void
  onStatusChange: (v: string) => void
}

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  ...Object.values(WorkOrderStatus).map((s) => ({ label: s, value: s })),
]

export function FilterBar({
  subDistrict,
  status,
  onSubDistrictChange,
  onStatusChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Sub-district
        </label>
        <input
          type="text"
          value={subDistrict}
          onChange={(e) => onSubDistrictChange(e.target.value)}
          placeholder="Filter by area..."
          className="w-48 rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-ink-slate placeholder:text-muted-foreground focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Status
        </label>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="w-40 rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-ink-slate focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
