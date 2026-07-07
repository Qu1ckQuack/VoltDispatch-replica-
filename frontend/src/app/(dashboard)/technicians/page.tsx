'use client'

import { useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { UserRole, TechnicianStatus } from '@/lib/api/types'
import type { Technician, CreateTechnicianDto, UpdateTechnicianDto } from '@/lib/api/types'
import {
  useTechnicians,
  useCreateTechnician,
  useUpdateTechnician,
  useDeleteTechnician,
  useUpdateTechnicianStatus,
} from '@/lib/hooks/use-technicians'
import { TechnicianTable } from '@/components/technicians/technician-table'
import { TechnicianFormModal } from '@/components/technicians/technician-form-modal'

export default function TechniciansPage() {
  const user = useAuthStore((s) => s.user)
  const { data: technicians = [], isLoading } = useTechnicians()
  const createMutation = useCreateTechnician()
  const updateMutation = useUpdateTechnician()
  const deleteMutation = useDeleteTechnician()
  const statusMutation = useUpdateTechnicianStatus()

  const [editTarget, setEditTarget] = useState<Technician | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Technician | null>(null)

  const isHQ = user?.role === UserRole.HQ

  const handleCreate = useCallback(
    (data: CreateTechnicianDto | UpdateTechnicianDto) => {
      createMutation.mutate(data as CreateTechnicianDto, { onSuccess: () => setShowCreate(false) })
    },
    [createMutation],
  )

  const handleUpdate = useCallback(
    (data: CreateTechnicianDto | UpdateTechnicianDto) => {
      if (!editTarget) return
      updateMutation.mutate(
        { id: editTarget.id, data: data as UpdateTechnicianDto },
        { onSuccess: () => setEditTarget(null) },
      )
    },
    [editTarget, updateMutation],
  )

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    })
  }, [deleteTarget, deleteMutation])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-slate">Technicians</h1>
          <p className="text-sm text-muted-foreground">
            Manage technician profiles and availability
          </p>
        </div>
        {isHQ && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-trust-blue px-4 py-2 text-sm font-medium text-white hover:bg-trust-blue/90"
          >
            <Plus size={16} /> New Technician
          </button>
        )}
      </div>

      {/* Status toggle for TECHNICIAN role */}
      {user?.role === UserRole.TECHNICIAN && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-white px-6 py-4">
          <span className="text-sm font-medium text-ink-slate">
            Your status:
          </span>
          {[TechnicianStatus.AVAILABLE, TechnicianStatus.BUSY, TechnicianStatus.OFFLINE].map(
            (s) => (
              <button
                key={s}
                onClick={() => statusMutation.mutate({ status: s })}
                disabled={statusMutation.isPending}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  user?.role === UserRole.TECHNICIAN
                    ? 'bg-trust-blue text-white'
                    : ''
                }`}
              >
                {s}
              </button>
            ),
          )}
        </div>
      )}

      <TechnicianTable
        technicians={technicians}
        loading={isLoading}
        onEdit={setEditTarget}
        onDelete={setDeleteTarget}
      />

      {showCreate && (
        <TechnicianFormModal
          technician={null}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
          loading={createMutation.isPending}
        />
      )}

      {editTarget && (
        <TechnicianFormModal
          technician={editTarget}
          onSubmit={handleUpdate}
          onClose={() => setEditTarget(null)}
          loading={updateMutation.isPending}
        />
      )}
    </div>
  )
}
