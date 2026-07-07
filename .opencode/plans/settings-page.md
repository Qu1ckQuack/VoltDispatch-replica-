# Settings Page — Implementation Plan

## Files to create

### 1. `src/lib/hooks/use-users.ts`

React Query hooks for user management (HQ):

```ts
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/lib/api'
import type { CreateUserDto } from '@/lib/api/types'

const USERS_KEY = 'users'

export function useUsers() {
  return useQuery({
    queryKey: [USERS_KEY],
    queryFn: () => usersApi.list(),
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateUserDto) => usersApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [USERS_KEY] }),
  })
}

export function useDeactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [USERS_KEY] }),
  })
}
```

### 2. `src/components/settings/profile-card.tsx`

Displays current user info from auth store:

```tsx
'use client'

import { useAuthStore } from '@/lib/stores/auth-store'

export function ProfileCard() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="rounded-xl border border-border bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-ink-slate">Profile</h2>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <Field label="Email" value={user?.email || '—'} />
        <Field label="Role" value={user?.role || '—'} />
        <Field label="User ID" value={user?.sub ? user.sub.slice(0, 8) : '—'} />
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-ink-slate">{value}</p>
    </div>
  )
}
```

### 3. `src/components/settings/dealer-settings.tsx`

Editable dealer company info (DEALER role only):

```tsx
'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { UserRole } from '@/lib/api/types'

// Displays dealer info — edit form submits to PATCH /dealers/:id
// Note: backend returns dealer profile as part of user context.
// For MVP, this is a read-only display. Full edit mode can be added
// when the backend exposes the dealer profile endpoint.
export function DealerSettings() {
  const user = useAuthStore((s) => s.user)
  if (user?.role !== UserRole.DEALER) return null

  return (
    <div className="rounded-xl border border-border bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-ink-slate">
        Dealer Settings
      </h2>
      <p className="text-sm text-muted-foreground">
        Dealer profile management will be available once the backend
        exposes the dealer detail endpoint.
      </p>
    </div>
  )
}
```

### 4. `src/components/settings/user-management.tsx`

HQ-only: table of users, create user modal, deactivate button:

```tsx
'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { UserRole } from '@/lib/api/types'
import type { CreateUserDto } from '@/lib/api/types'
import { useUsers, useCreateUser, useDeactivateUser } from '@/lib/hooks/use-users'

export function UserManagement() {
  const currentUser = useAuthStore((s) => s.user)
  const { data: users = [], isLoading } = useUsers()
  const createMutation = useCreateUser()
  const deactivateMutation = useDeactivateUser()
  const [showCreate, setShowCreate] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>(UserRole.TECHNICIAN)
  const [phone, setPhone] = useState('')

  if (currentUser?.role !== UserRole.HQ) return null

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(
      { email, password, role, phone: phone || undefined },
      { onSuccess: () => { setShowCreate(false); setEmail(''); setPassword(''); setPhone('') } },
    )
  }

  return (
    <div className="rounded-xl border border-border bg-white">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold text-ink-slate">User Management</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 rounded-lg bg-trust-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-trust-blue/90"
        >
          <Plus size={14} /> New User
        </button>
      </div>

      {isLoading ? (
        <div className="px-6 py-8 text-center text-sm text-muted-foreground">
          Loading users...
        </div>
      ) : users.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-muted-foreground">
          No users found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Active</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-6 py-3 text-ink-slate">{u.email}</td>
                  <td className="px-6 py-3">{u.role}</td>
                  <td className="px-6 py-3">
                    {u.isActive
                      ? <span className="text-assurance-green font-medium">Active</span>
                      : <span className="text-muted-foreground">Inactive</span>}
                  </td>
                  <td className="px-6 py-3">
                    {u.isActive && u.id !== currentUser?.sub && (
                      <button
                        onClick={() => deactivateMutation.mutate(u.id)}
                        disabled={deactivateMutation.isPending}
                        className="text-xs text-signal-red hover:underline disabled:opacity-50"
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-ink-slate">Create User</h3>
              <button onClick={() => setShowCreate(false)} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <input type="email" required placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue" />
              <input type="password" required placeholder="Password (min 8 chars)" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue" />
              <select value={role} onChange={e => setRole(e.target.value as UserRole)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue">
                <option value={UserRole.TECHNICIAN}>Technician</option>
                <option value={UserRole.COORDINATOR}>Coordinator</option>
                <option value={UserRole.DEALER}>Dealer</option>
                <option value={UserRole.HQ}>HQ</option>
              </select>
              <input type="tel" placeholder="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue" />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-ink-slate hover:bg-muted">Cancel</button>
                <button type="submit" disabled={createMutation.isPending}
                  className="rounded-lg bg-trust-blue px-4 py-2 text-sm text-white hover:bg-trust-blue/90 disabled:opacity-50">
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
```

### 5. Rewrite `src/app/(dashboard)/settings/page.tsx`

```tsx
'use client'

import { ProfileCard } from '@/components/settings/profile-card'
import { DealerSettings } from '@/components/settings/dealer-settings'
import { UserManagement } from '@/components/settings/user-management'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-slate">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account and system configuration
        </p>
      </div>

      <ProfileCard />
      <DealerSettings />
      <UserManagement />
    </div>
  )
}
```

## Implementation order
1. Create `src/lib/hooks/use-users.ts`
2. Create `src/components/settings/profile-card.tsx`
3. Create `src/components/settings/dealer-settings.tsx`
4. Create `src/components/settings/user-management.tsx`
5. Rewrite `src/app/(dashboard)/settings/page.tsx`
6. Run `npx tsc --noEmit`
7. Run `npx next build`
