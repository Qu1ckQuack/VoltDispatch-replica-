'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { AuthGuard } from '@/lib/auth/auth-guard'
import { RoleGuard } from '@/lib/auth/role-guard'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard>
        <RoleGuard>{children}</RoleGuard>
      </AuthGuard>
    </QueryClientProvider>
  )
}
