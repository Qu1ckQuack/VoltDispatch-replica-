'use client'

import { useAuthStore } from '@/lib/stores/auth-store'

export function ProfileCard() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="rounded-xl border border-border bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-ink-slate">Profile</h2>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <Field label="Email" value={user?.email || '—'} />
        <Field label="Role" value={user?.role || '—'} />
        <Field
          label="User ID"
          value={user?.sub ? user.sub.slice(0, 8) : '—'}
        />
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-ink-slate">{value}</p>
    </div>
  )
}
