'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { UserRole } from '@/lib/api/types'
import { useCreateUser } from '@/lib/hooks/use-users'

interface CreateUserModalProps {
  open: boolean
  onClose: () => void
}

export function CreateUserModal({ open, onClose }: CreateUserModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>(UserRole.TECHNICIAN)
  const [phone, setPhone] = useState('')
  const createMutation = useCreateUser()

  if (!open) return null

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(
      { email, password, role, phone: phone || undefined },
      {
        onSuccess: () => {
          onClose()
          setEmail('')
          setPassword('')
          setPhone('')
        },
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-ink-slate">Create User</h3>
          <button
            onClick={onClose}
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
              onClick={onClose}
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
  )
}
