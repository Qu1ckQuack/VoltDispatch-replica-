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
