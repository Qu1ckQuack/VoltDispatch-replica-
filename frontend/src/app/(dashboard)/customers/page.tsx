'use client'

import { useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { UserRole } from '@/lib/api/types'
import type { Customer, CreateCustomerDto, UpdateCustomerDto } from '@/lib/api/types'
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from '@/lib/hooks/use-customers'
import { CustomerTable } from '@/components/customers/customer-table'
import { CustomerFormModal } from '@/components/customers/customer-form-modal'
import { DeleteConfirmModal } from '@/components/customers/delete-confirm-modal'

export default function CustomersPage() {
  const user = useAuthStore((s) => s.user)
  const { data: customers = [], isLoading } = useCustomers()
  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer()
  const deleteMutation = useDeleteCustomer()

  const [editTarget, setEditTarget] = useState<Customer | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)

  const canCreate = user?.role === UserRole.HQ || user?.role === UserRole.DEALER

  const handleCreate = useCallback(
    (data: CreateCustomerDto | UpdateCustomerDto) => {
      createMutation.mutate(data as CreateCustomerDto, { onSuccess: () => setShowCreate(false) })
    },
    [createMutation],
  )

  const handleUpdate = useCallback(
    (data: CreateCustomerDto | UpdateCustomerDto) => {
      if (!editTarget) return
      updateMutation.mutate(
        { id: editTarget.id, data: data as UpdateCustomerDto },
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
          <h1 className="text-2xl font-bold text-ink-slate">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Manage customer records
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-trust-blue px-4 py-2 text-sm font-medium text-white hover:bg-trust-blue/90"
          >
            <Plus size={16} /> New Customer
          </button>
        )}
      </div>

      <CustomerTable
        customers={customers}
        loading={isLoading}
        onEdit={setEditTarget}
        onDelete={setDeleteTarget}
      />

      {showCreate && (
        <CustomerFormModal
          customer={null}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
          loading={createMutation.isPending}
        />
      )}

      {editTarget && (
        <CustomerFormModal
          customer={editTarget}
          onSubmit={handleUpdate}
          onClose={() => setEditTarget(null)}
          loading={updateMutation.isPending}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          customer={deleteTarget}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          loading={deleteMutation.isPending}
        />
      )}
    </div>
  )
}
