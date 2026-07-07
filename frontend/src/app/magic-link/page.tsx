import { Suspense } from 'react'
import type { Metadata } from 'next'
import { MagicLinkForm } from './magic-link-form'

export const metadata: Metadata = {
  title: 'Sign In — VoltDispatch',
}

export default function MagicLinkPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-clear-sky px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
        <h1 className="mb-4 text-center text-2xl font-bold text-ink-slate">
          VoltDispatch
        </h1>
        <Suspense fallback={<p className="text-center text-sm text-muted-foreground">Loading...</p>}>
          <MagicLinkForm />
        </Suspense>
      </div>
    </div>
  )
}
