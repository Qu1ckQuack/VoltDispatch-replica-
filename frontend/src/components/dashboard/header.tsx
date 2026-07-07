'use client'

import { useRouter } from 'next/navigation'
import { LogOut, Bell } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { ConnectionIndicator } from '@/components/shared/connection-indicator'

export function Header() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <header className="flex h-14 items-center justify-end gap-3 border-b border-border bg-white px-6">
      <ConnectionIndicator />

      <button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
        <Bell size={18} />
      </button>

      <div className="h-5 w-px bg-border" />

      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{user?.email}</span>
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
          {user?.role}
        </span>
      </div>

      <button
        onClick={handleLogout}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-signal-red"
        title="Sign out"
      >
        <LogOut size={18} />
      </button>
    </header>
  )
}
