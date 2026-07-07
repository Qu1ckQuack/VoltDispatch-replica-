'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/auth-store'

export function MagicLinkForm() {
  const [status, setStatus] = useState<'resolving' | 'error'>('resolving')
  const searchParams = useSearchParams()
  const router = useRouter()
  const login = useAuthStore((s) => s.login)

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      return
    }
    authApi
      .requestMagicLink(token)
      .then((res) => {
        login(res.accessToken, res.refreshToken, res.user)
        router.push('/dashboard')
      })
      .catch(() => setStatus('error'))
  }, [searchParams, login, router])

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
