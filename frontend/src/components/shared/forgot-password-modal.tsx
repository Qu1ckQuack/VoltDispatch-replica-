'use client'

import { X } from 'lucide-react'

interface ForgotPasswordModalProps {
  onClose: () => void
}

export function ForgotPasswordModal({ onClose }: ForgotPasswordModalProps) {
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
        <p className="mb-1 text-sm text-ink-slate">
          Please contact your HQ administrator to reset your password.
        </p>
        <p className="mb-4 text-xs text-muted-foreground">
          Only HQ users can change account passwords. If you&apos;re locked out,
          reach out to your organization&apos;s administrator for assistance.
        </p>
        <div className="flex justify-end border-t border-border pt-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm text-ink-slate hover:bg-muted"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
