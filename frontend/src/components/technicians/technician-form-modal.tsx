'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Technician, CreateTechnicianDto, UpdateTechnicianDto } from '@/lib/api/types'

interface TechnicianFormModalProps {
  technician: Technician | null
  onSubmit: (data: CreateTechnicianDto | UpdateTechnicianDto) => void
  onClose: () => void
  loading?: boolean
}

export function TechnicianFormModal({
  technician,
  onSubmit,
  onClose,
  loading,
}: TechnicianFormModalProps) {
  const isEdit = !!technician
  const [userId, setUserId] = useState('')
  const [subDistrict, setSubDistrict] = useState('')

  useEffect(() => {
    if (technician) {
      setUserId(technician.userId)
      setSubDistrict(technician.subDistrict)
    }
  }, [technician])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isEdit) {
      onSubmit({ subDistrict } as UpdateTechnicianDto)
    } else {
      onSubmit({ userId, subDistrict } as CreateTechnicianDto)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-slate">
            {isEdit ? 'Edit Technician' : 'New Technician'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEdit && (
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-slate">
                User ID
              </label>
              <input
                type="text"
                required
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
                placeholder="UUID of the user to link"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-slate">
              Sub-district
            </label>
            <input
              type="text"
              required
              value={subDistrict}
              onChange={(e) => setSubDistrict(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
              placeholder="e.g. Khlong Toei"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm text-ink-slate hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-trust-blue px-4 py-2 text-sm text-white hover:bg-trust-blue/90 disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEdit ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
