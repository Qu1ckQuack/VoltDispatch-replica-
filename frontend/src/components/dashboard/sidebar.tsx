'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PanelLeftClose, PanelLeft } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { filterNavLinks } from './nav-links'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { user, hasHydrated } = useAuthStore()
  const links = hasHydrated ? (user ? filterNavLinks(user.role) : []) : []

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-border bg-white transition-all duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-border px-3">
        {!collapsed && (
          <Link href="/dashboard" className="font-bold text-ink-slate">
            VoltDispatch
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {links.map((link) => {
          const Icon = link.icon
          const active = pathname === link.href || pathname.startsWith(link.href + '/')
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-trust-blue text-white'
                  : 'text-muted-foreground hover:bg-muted hover:text-ink-slate',
                collapsed && 'justify-center px-2',
              )}
              title={collapsed ? link.label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{link.label}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
