import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Customers — VoltDispatch',
}

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-slate">Customers</h1>
        <p className="text-sm text-muted-foreground">
          Manage customer records
        </p>
      </div>

      <div className="rounded-xl border border-border bg-white p-6">
        <p className="text-sm text-muted-foreground">
          Customer list with CRUD will be built next.
        </p>
      </div>
    </div>
  )
}
