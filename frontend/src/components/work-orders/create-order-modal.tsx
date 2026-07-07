'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useCustomers } from '@/lib/hooks/use-customers'
import { useDevices } from '@/lib/hooks/use-devices'
import { UserRole } from '@/lib/api/types'
import type { CreateWorkOrderDto } from '@/lib/api/types'

interface CreateOrderModalProps {
  onSubmit: (data: CreateWorkOrderDto) => void
  onClose: () => void
  loading?: boolean
}

export function CreateOrderModal({ onSubmit, onClose, loading }: CreateOrderModalProps) {
  const user = useAuthStore((s) => s.user)
  const { data: customers = [] } = useCustomers()
  const { data: devices = [] } = useDevices()

  const [customerId, setCustomerId] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [subDistrict, setSubDistrict] = useState('')
  const [priority, setPriority] = useState(0)
  const [appointmentDate, setAppointmentDate] = useState('')
  const [department, setDepartment] = useState('')
  const [slaDeadline, setSlaDeadline] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data: CreateWorkOrderDto = {
      customerId,
      deviceId,
      subDistrict,
      priority,
      ...(appointmentDate ? { appointmentDate: new Date(appointmentDate).toISOString() } : {}),
      ...(department ? { department } : {}),
      ...(slaDeadline ? { slaDeadline: new Date(slaDeadline).toISOString() } : {}),
    }
    onSubmit(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-slate">Create Work Order</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-slate">
                Customer
              </label>
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-slate focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
              >
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-slate">
                Device
              </label>
              <select
                required
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-slate focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
              >
                <option value="">Select device...</option>
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.model} ({d.serialNumber.slice(0, 8)})
                  </option>
                ))}
              </select>
            </div>
          </div>

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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-slate">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-slate focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
              >
                <option value={0}>Normal</option>
                <option value={1}>High</option>
                <option value={2}>Urgent</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-slate">
                Appointment
              </label>
              <input
                type="datetime-local"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-slate focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
              />
            </div>
          </div>

          {user?.role === UserRole.COORDINATOR && (
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-slate">
                Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-slate placeholder:text-muted-foreground focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
                placeholder="Department scope"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-slate">
              SLA deadline
            </label>
            <input
              type="datetime-local"
              value={slaDeadline}
              onChange={(e) => setSlaDeadline(e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-slate focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-slate hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-trust-blue px-4 py-2 text-sm font-medium text-white hover:bg-trust-blue/90 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
