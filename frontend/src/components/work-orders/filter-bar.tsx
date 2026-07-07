'use client'

import { WorkOrderStatus } from '@/lib/api/types'

interface FilterBarProps {
  status: string
  subDistrict: string
  priority: string
  onStatusChange: (v: string) => void
  onSubDistrictChange: (v: string) => void
  onPriorityChange: (v: string) => void
  onClear: () => void
}

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  ...Object.values(WorkOrderStatus).map((s) => ({ label: s, value: s })),
]

const PRIORITY_OPTIONS = [
  { label: 'All Priorities', value: '' },
  { label: 'Normal (0)', value: '0' },
  { label: 'High (1)', value: '1' },
  { label: 'Urgent (2)', value: '2' },
]

export function FilterBar({
  status,
  subDistrict,
  priority,
  onStatusChange,
  onSubDistrictChange,
  onPriorityChange,
  onClear,
}: FilterBarProps) {
  const hasFilters = status || subDistrict || priority

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Status
        </label>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="w-36 rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-ink-slate focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Sub-district
        </label>
        <input
          type="text"
          value={subDistrict}
          onChange={(e) => onSubDistrictChange(e.target.value)}
          placeholder="Filter by area..."
          className="w-44 rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-ink-slate placeholder:text-muted-foreground focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Priority
        </label>
        <select
          value={priority}
          onChange={(e) => onPriorityChange(e.target.value)}
          className="w-36 rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-ink-slate focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
        >
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {hasFilters && (
        <button
          onClick={onClear}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
