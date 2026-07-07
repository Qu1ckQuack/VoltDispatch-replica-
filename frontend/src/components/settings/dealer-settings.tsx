'use client'

import { useAuthStore } from '@/lib/stores/auth-store'
import { UserRole } from '@/lib/api/types'

export function DealerSettings() {
  const user = useAuthStore((s) => s.user)
  if (user?.role !== UserRole.DEALER) return null

  return (
    <div className="rounded-xl border border-border bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-ink-slate">
        Dealer Settings
      </h2>
      <p className="text-sm text-muted-foreground">
        Dealer profile management will be available once the backend exposes the
        dealer detail endpoint.
      </p>
    </div>
  )
}
