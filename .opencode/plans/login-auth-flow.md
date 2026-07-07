# Login Page + Auth Flow Implementation Plan

## Files to modify

### 1. `src/app/globals.css` — Add brand palette
Add to `@theme inline {}`:
```css
--color-trust-blue: #1D63B4;
--color-clear-sky: #EAF3FC;
--color-assurance-green: #2F9E58;
--color-warm-sand: #E3A542;
--color-signal-red: #D64545;
--color-ink-slate: #1F2937;
```
Also update `:root`:
- `--primary` → `#1D63B4` (Trust Blue)
- `--primary-foreground` → `#FFFFFF`
- `--destructive` → `#D64545` (Signal Red)

### 2. `src/app/login/page.tsx` — Login page shell (Server Component)
```tsx
import type { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Sign In — VoltDispatch',
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-clear-sky px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-ink-slate">VoltDispatch</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Technician Management System
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
```

### 3. `src/app/login/login-form.tsx` — Login form (Client Component)
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/auth-store'
import { UserRole } from '@/lib/api/types'

const ROLE_ROUTES: Record<string, string> = {
  [UserRole.HQ]: '/dashboard',
  [UserRole.COORDINATOR]: '/queue',
  [UserRole.DEALER]: '/dashboard',
  [UserRole.TECHNICIAN]: '/dashboard',
}

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
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
    } catch {
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-signal-red/10 px-3 py-2 text-sm text-signal-red">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink-slate">
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
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink-slate">
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
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-trust-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-trust-blue/90 disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  )
}
```

### 4. `src/app/magic-link/page.tsx` — Magic link page shell
```tsx
import type { Metadata } from 'next'
import { MagicLinkForm } from './magic-link-form'

export const metadata: Metadata = {
  title: 'Sign In — VoltDispatch',
}

export default function MagicLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-clear-sky px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
        <h1 className="mb-4 text-center text-2xl font-bold text-ink-slate">
          VoltDispatch
        </h1>
        <MagicLinkForm />
      </div>
    </div>
  )
}
```

### 5. `src/app/magic-link/magic-link-form.tsx` — Magic link resolver
```tsx
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
```

### 6. `src/lib/auth/auth-guard.tsx` — Auth guard wrapper
```tsx
'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useEffect } from 'react'

const PUBLIC_ROUTES = ['/login', '/magic-link']

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated && PUBLIC_ROUTES.includes(pathname)) {
      router.push('/dashboard')
    } else if (!isAuthenticated && !PUBLIC_ROUTES.includes(pathname)) {
      router.push('/login')
    }
  }, [isAuthenticated, pathname, router])

  return <>{children}</>
}
```

### 7. Update `src/app/providers.tsx` — Wrap with AuthGuard
```tsx
'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { AuthGuard } from '@/lib/auth/auth-guard'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard>{children}</AuthGuard>
    </QueryClientProvider>
  )
}
```

### 8. `.env.local` — API URL
Create `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

## Implementation order
1. globals.css (brand colors)
2. .env.local
3. lib/auth/ directory + auth-guard.tsx
4. app/providers.tsx (update)
5. app/login/page.tsx + login-form.tsx
6. app/magic-link/ (page + form)
7. Run `npx tsc --noEmit` to verify
8. Run `npx next build` to verify

## Files created (6 new + 2 modified)
- `src/app/globals.css` (modified)
- `.env.local` (new)
- `src/lib/auth/auth-guard.tsx` (new)
- `src/app/providers.tsx` (modified)
- `src/app/login/page.tsx` (new)
- `src/app/login/login-form.tsx` (new)
- `src/app/magic-link/page.tsx` (new)
- `src/app/magic-link/magic-link-form.tsx` (new)
