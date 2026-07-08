'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authApi } from '@/lib/api'
import { UserRole } from '@/lib/api/types'
import { useAuthStore } from '@/lib/stores/auth-store'

function MagicLinkHandler({ token }: { token: string }) {
  const [status, setStatus] = useState<'resolving' | 'error'>('resolving')
  const router = useRouter()
  const login = useAuthStore((s) => s.login)

  useEffect(() => {
    authApi
      .requestMagicLink(token)
      .then((res) => {
        login(res.accessToken, '', {
          sub: res.customer.id,
          email: res.customer.email ?? '',
          role: UserRole.CUSTOMER,
          profileId: res.customer.id,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 900,
        })
        router.push('/dashboard')
      })
      .catch(() => setStatus('error'))
  }, [token, login, router])

  if (status === 'error') {
    return (
      <p className="text-center text-sm text-signal-red">
        Invalid or expired link. Please request a new one.
      </p>
    )
  }

  return (
    <p className="text-center text-sm text-muted-foreground">
      Signing you in...
    </p>
  )
}

export function MagicLinkForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  if (!token) {
    return (
      <p className="text-center text-sm text-signal-red">
        Invalid or expired link. Please request a new one.
      </p>
    )
  }

  return <MagicLinkHandler token={token} />
}
