'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useEffect } from 'react'

const PUBLIC_ROUTES = ['/login', '/register', '/magic-link', '/']

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, hasHydrated } = useAuthStore()

  useEffect(() => {
    if (!hasHydrated) return

    if (isAuthenticated && PUBLIC_ROUTES.includes(pathname)) {
      router.push('/dashboard')
    } else if (!isAuthenticated && !PUBLIC_ROUTES.includes(pathname)) {
      router.push('/login')
    }
  }, [isAuthenticated, hasHydrated, pathname, router])

  return <>{children}</>
}
