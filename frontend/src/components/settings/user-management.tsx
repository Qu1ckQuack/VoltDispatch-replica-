'use client'

import { useState } from 'react'
import { Plus, X, KeyRound } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { UserRole } from '@/lib/api/types'
import { useUsers, useCreateUser, useDeactivateUser, useResetPassword } from '@/lib/hooks/use-users'

export function UserManagement() {
  const currentUser = useAuthStore((s) => s.user)
  const { data: users = [], isLoading } = useUsers()
  const createMutation = useCreateUser()
  const deactivateMutation = useDeactivateUser()
  const [showCreate, setShowCreate] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>(UserRole.TECHNICIAN)
  const [phone, setPhone] = useState('')
  const [resetTarget, setResetTarget] = useState<{ id: string; email: string } | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const resetMutation = useResetPassword()

  if (currentUser?.role !== UserRole.HQ) return null

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(
      { email, password, role, phone: phone || undefined },
      {
        onSuccess: () => {
          setShowCreate(false)
          setEmail('')
          setPassword('')
          setPhone('')
        },
      },
    )
  }

  return (
    <div className="rounded-xl border border-border bg-white">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold text-ink-slate">
          User Management
        </h2>
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
                      <span className="font-medium text-assurance-green">
                        Active
                      </span>
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
                            setResetPassword('')
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

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-ink-slate">Create User</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
              />
              <input
                type="password"
                required
                placeholder="Password (min 8 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
              >
                <option value={UserRole.TECHNICIAN}>Technician</option>
                <option value={UserRole.COORDINATOR}>Coordinator</option>
                <option value={UserRole.DEALER}>Dealer</option>
                <option value={UserRole.HQ}>HQ</option>
              </select>
              <input
                type="tel"
                placeholder="Phone (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-ink-slate hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-lg bg-trust-blue px-4 py-2 text-sm text-white hover:bg-trust-blue/90 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-ink-slate">
                Reset Password
              </h3>
              <button
                onClick={() => setResetTarget(null)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              Setting a new password for <strong>{resetTarget.email}</strong>
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                resetMutation.mutate(
                  { id: resetTarget.id, newPassword: resetPassword },
                  { onSuccess: () => setResetTarget(null) },
                )
              }}
              className="space-y-3"
            >
              <input
                type="password"
                required
                minLength={8}
                placeholder="New password (min 8 chars)"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-ink-slate hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetMutation.isPending}
                  className="rounded-lg bg-trust-blue px-4 py-2 text-sm text-white hover:bg-trust-blue/90 disabled:opacity-50"
                >
                  {resetMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
