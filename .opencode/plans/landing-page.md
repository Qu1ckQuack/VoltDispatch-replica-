# Landing Page — Implementation Plan

## What changes

### 1. Rewrite `src/app/page.tsx` — Branded landing page

Server component with metadata. Shows:
- Brand name + tagline
- Feature highlights (3-4 cards with icons)
- "Sign in" button → `/login`
- Clean, professional design using brand palette

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { Wrench, MapPin, Clock, Shield } from 'lucide-react'

export const metadata: Metadata = {
  title: 'VoltDispatch — Technician Management System',
  description: 'EV charger field service operations management',
}

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <span className="text-xl font-bold text-ink-slate">VoltDispatch</span>
        <Link
          href="/login"
          className="rounded-lg bg-trust-blue px-4 py-2 text-sm font-medium text-white hover:bg-trust-blue/90"
        >
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <h1 className="max-w-2xl text-4xl font-bold text-ink-slate sm:text-5xl">
          EV Charger Field Service,{' '}
          <span className="text-trust-blue">Simplified</span>
        </h1>
        <p className="mt-4 max-w-lg text-lg text-muted-foreground">
          From work order creation to technician dispatch and completion tracking
          — manage your entire field service operation in one place.
        </p>
        <Link
          href="/login"
          className="mt-8 rounded-lg bg-trust-blue px-6 py-3 text-sm font-medium text-white hover:bg-trust-blue/90"
        >
          Get started
        </Link>
      </section>

      {/* Features */}
      <section className="grid gap-6 px-6 pb-20 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto w-full">
        <FeatureCard
          icon={Wrench}
          title="Work Orders"
          description="Create, assign, and track work orders from request to completion"
        />
        <FeatureCard
          icon={MapPin}
          title="Live Tracking"
          description="Real-time technician location updates and ETA for every job"
        />
        <FeatureCard
          icon={Clock}
          title="SLA Management"
          description="Automated deadline tracking and breach alerts to keep you on schedule"
        />
        <FeatureCard
          icon={Shield}
          title="Role-Based Access"
          description="Tailored views for HQ, dealers, coordinators, and technicians"
        />
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
        VoltDispatch — Technician Management System
      </footer>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-6 text-left">
      <Icon size={24} className="text-trust-blue" />
      <h3 className="mt-3 font-semibold text-ink-slate">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
```

### 2. Delete `src/app/(dashboard)/page.tsx`

Remove the redirect — landing page handles `/` directly.

### 3. Update `src/lib/auth/auth-guard.tsx`

Add `'/'` to `PUBLIC_ROUTES` so unauthenticated users see the landing page, and authenticated users get redirected to `/dashboard`.

```ts
const PUBLIC_ROUTES = ['/login', '/magic-link', '/']
```

## Implementation order
1. Rewrite `src/app/page.tsx`
2. Delete `src/app/(dashboard)/page.tsx`
3. Update auth-guard PUBLIC_ROUTES
4. Run `npx tsc --noEmit`
5. Run `npx next build`
