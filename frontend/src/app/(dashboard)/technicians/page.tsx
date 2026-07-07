import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Technicians — VoltDispatch',
}

export default function TechniciansPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-slate">Technicians</h1>
        <p className="text-sm text-muted-foreground">
          Manage technician profiles and availability
        </p>
      </div>

      <div className="rounded-xl border border-border bg-white p-6">
        <p className="text-sm text-muted-foreground">
          Technician list with CRUD will be built next.
        </p>
      </div>
    </div>
  )
}
