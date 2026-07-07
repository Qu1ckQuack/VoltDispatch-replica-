import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings — VoltDispatch',
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-slate">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage system settings
        </p>
      </div>

      <div className="rounded-xl border border-border bg-white p-6">
        <p className="text-sm text-muted-foreground">
          Settings panel will be built next.
        </p>
      </div>
    </div>
  )
}
