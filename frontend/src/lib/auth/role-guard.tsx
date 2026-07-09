'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useEffect } from 'react'

const ROLE_ROUTES: Record<string, string[]> = {
  '/people': ['HQ'],
  '/technicians': ['HQ'],
  '/queue': ['HQ'],
  '/customers': ['HQ', 'DEALER'],
  '/schedule': ['COORDINATOR', 'TECHNICIAN'],
  '/reports': ['HQ'],
  '/settings': ['HQ', 'DEALER'],
}

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, hasHydrated } = useAuthStore()

  useEffect(() => {
    if (!hasHydrated || !user) return

    const allowedRoles = ROLE_ROUTES[pathname]
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      router.push('/dashboard')
    }
  }, [pathname, user, hasHydrated, router])

  return <>{children}</>
}
