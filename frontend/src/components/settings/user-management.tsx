'use client'

import { useState } from 'react'
import { Plus, KeyRound } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { UserRole } from '@/lib/api/types'
import { useUsers, useDeactivateUser } from '@/lib/hooks/use-users'
import { CreateUserModal } from './create-user-modal'
import { ResetPasswordModal } from './reset-password-modal'

export function UserManagement() {
  const currentUser = useAuthStore((s) => s.user)
  const { data: users = [], isLoading } = useUsers()
  const deactivateMutation = useDeactivateUser()
  const [showCreate, setShowCreate] = useState(false)
  const [resetTarget, setResetTarget] = useState<{ id: string; email: string } | null>(null)

  if (currentUser?.role !== UserRole.HQ) return null

  return (
    <div className="rounded-xl border border-border bg-white">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold text-ink-slate">User Management</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 rounded-lg bg-trust-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-trust-blue/90"
        >
          <Plus size={14} /> New User
        </button>
      </div>

      {isLoading ? (
        <div className="px-6 py-8 text-center text-sm text-muted-foreground">
          Loading users...
        </div>
      ) : users.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-muted-foreground">
          No users found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Active</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-6 py-3 text-ink-slate">{u.email}</td>
                  <td className="px-6 py-3">{u.role}</td>
                  <td className="px-6 py-3">
                    {u.isActive ? (
                      <span className="font-medium text-assurance-green">Active</span>
                    ) : (
                      <span className="text-muted-foreground">Inactive</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      {u.isActive && u.id !== currentUser?.sub && (
                        <button
                          onClick={() => {
                            setResetTarget({ id: u.id, email: u.email })
                          }}
                          className="flex items-center gap-1 text-xs text-trust-blue hover:underline"
                        >
                          <KeyRound size={12} /> Reset PW
                        </button>
                      )}
                      {u.isActive && u.id !== currentUser?.sub && (
                        <button
                          onClick={() => deactivateMutation.mutate(u.id)}
                          disabled={deactivateMutation.isPending}
                          className="text-xs text-signal-red hover:underline disabled:opacity-50"
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateUserModal open={showCreate} onClose={() => setShowCreate(false)} />
      <ResetPasswordModal
        target={resetTarget}
        onClose={() => setResetTarget(null)}
      />
    </div>
  )
}
