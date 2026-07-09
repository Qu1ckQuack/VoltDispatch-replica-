'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/auth-store'
import { UserRole } from '@/lib/api/types'
import { ForgotPasswordModal } from '@/components/shared/forgot-password-modal'

const ROLE_ROUTES: Record<string, string> = {
  [UserRole.HQ]: '/dashboard',
  [UserRole.COORDINATOR]: '/queue',
  [UserRole.DEALER]: '/dashboard',
  [UserRole.TECHNICIAN]: '/dashboard',
  [UserRole.CUSTOMER]: '/dashboard',
}

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const router = useRouter()
  const login = useAuthStore((s) => s.login)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authApi.login(email, password)
      login(res.accessToken, res.refreshToken, res.user)
      router.push(ROLE_ROUTES[res.user.role] || '/dashboard')
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response: { data?: { message?: string } } }).response?.data?.message
          : null
      setError(message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-signal-red/10 px-3 py-2 text-sm text-signal-red">
            {error}
          </div>
        )}
        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-ink-slate"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-slate placeholder:text-muted-foreground focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium text-ink-slate"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-slate placeholder:text-muted-foreground focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
            placeholder="Enter your password"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-muted-foreground/80 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-muted-foreground disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          <Link
            href="/register"
            className="block rounded-lg bg-trust-blue px-4 py-1.5 text-center text-sm font-medium text-white transition-colors hover:bg-trust-blue/90"
          >
            Create account
          </Link>
        </div>
        <div className="text-center">
          <button
            type="button"
            onClick={() => setShowForgot(true)}
            className="text-xs text-muted-foreground hover:text-trust-blue hover:underline"
          >
            Forgot password?
          </button>
        </div>
      </form>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </>
  )
}
