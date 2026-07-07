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
