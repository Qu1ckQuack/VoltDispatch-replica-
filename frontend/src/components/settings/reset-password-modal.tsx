'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useResetPassword } from '@/lib/hooks/use-users'

interface ResetPasswordModalProps {
  target: { id: string; email: string } | null
  onClose: () => void
}

export function ResetPasswordModal({ target, onClose }: ResetPasswordModalProps) {
  const [resetPassword, setResetPassword] = useState('')
  const resetMutation = useResetPassword()

  if (!target) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-ink-slate">Reset Password</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Setting a new password for <strong>{target.email}</strong>
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            resetMutation.mutate(
              { id: target.id, newPassword: resetPassword },
              { onSuccess: () => onClose() },
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
              onClick={onClose}
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
  )
}
