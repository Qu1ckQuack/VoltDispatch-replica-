'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api'
import { UserRole } from '@/lib/api/types'
export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<UserRole>(UserRole.TECHNICIAN)
  const [district, setDistrict] = useState('')
  const [subDistrict, setSubDistrict] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const passwordErrors = [
    { key: 'length', label: '8 or more characters', pass: password.length >= 8 },
    { key: 'letter', label: 'At least 1 upper or lowercase letter', pass: /[A-Za-z]/.test(password) },
    { key: 'number', label: 'At least 1 number', pass: /[0-9]/.test(password) },
    { key: 'special', label: 'At least 1 special character', pass: /[^A-Za-z0-9]/.test(password) },
  ]
  const passwordValid = passwordErrors.every((r) => r.pass)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!passwordValid) {
      setError('Password does not meet the requirements below')
      return
    }
    setLoading(true)
    try {
      await authApi.register({
        email,
        password,
        phone,
        role,
        district,
        subDistrict: role === UserRole.TECHNICIAN ? subDistrict : undefined,
        zipCode,
        companyName: role === UserRole.DEALER ? companyName : undefined,
      })
      setSuccess(true)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Registration failed'
      setError(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-clear-sky px-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg text-center">
          <div className="mb-4 text-4xl">📋</div>
          <h1 className="text-xl font-bold text-ink-slate">Request Submitted</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your registration has been submitted for approval. You will be
            notified once an admin approves your account.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-lg bg-trust-blue px-4 py-2 text-sm font-medium text-white hover:bg-trust-blue/90"
          >
            Back to Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-clear-sky px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-ink-slate">VoltDispatch</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-signal-red/10 px-3 py-2 text-sm text-signal-red">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-slate">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-slate placeholder:text-muted-foreground focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-slate">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-slate placeholder:text-muted-foreground focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
              placeholder="e.g. P@ssw0rd!"
            />
            {password.length > 0 && (
              <div className="mt-2 space-y-1 rounded-lg bg-muted/30 px-3 py-2 text-xs">
                <p className="font-medium text-muted-foreground">Your password must have:</p>
                {passwordErrors.map((rule) => (
                  <p
                    key={rule.key}
                    className={rule.pass ? 'text-assurance-green' : 'text-signal-red'}
                  >
                    {rule.pass ? '✓' : '✗'} {rule.label}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-slate">
              Phone
            </label>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-lg border border-r-0 border-border bg-muted px-3 text-sm text-muted-foreground">
                🇹🇭 +66
              </span>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-r-lg border border-border bg-white px-3 py-2 text-sm text-ink-slate placeholder:text-muted-foreground focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
                placeholder="080-710-8744"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={role !== UserRole.TECHNICIAN ? 'col-span-2' : ''}>
              <label className="mb-1 block text-sm font-medium text-ink-slate">
                District
              </label>
              <input
                type="text"
                required
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-slate placeholder:text-muted-foreground focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
                placeholder="e.g. Watthana"
              />
            </div>
            {role === UserRole.TECHNICIAN && (
              <div>
                <label className="mb-1 block text-sm font-medium text-ink-slate">
                  Sub-district
                </label>
                <input
                  type="text"
                  required
                  value={subDistrict}
                  onChange={(e) => setSubDistrict(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-slate placeholder:text-muted-foreground focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
                  placeholder="e.g. Khlong Toei"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-slate">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-slate focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"              >
                <option value={UserRole.TECHNICIAN}>Technician</option>
                <option value={UserRole.DEALER}>Dealer</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-slate">
                Zip Code
              </label>
              <input
                type="text"
                required
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-slate placeholder:text-muted-foreground focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
                placeholder="e.g. 10110"
              />
            </div>
          </div>

          {role === UserRole.DEALER && (
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-slate">
                Company Name
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-slate placeholder:text-muted-foreground focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
                placeholder="Your company name"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-trust-blue py-1.5 text-sm font-medium text-white transition-colors hover:bg-trust-blue/90 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Create Account'}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-trust-blue hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
