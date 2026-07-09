'use client'

import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useCustomers } from '@/lib/hooks/use-customers'
import { useDevices } from '@/lib/hooks/use-devices'
import { customersApi, devicesApi } from '@/lib/api'
import { UserRole } from '@/lib/api/types'
import type { CreateWorkOrderDto } from '@/lib/api/types'

interface CreateOrderModalProps {
  onSubmit: (data: CreateWorkOrderDto) => void
  onClose: () => void
  loading?: boolean
}

export function CreateOrderModal({ onSubmit, onClose, loading }: CreateOrderModalProps) {
  const user = useAuthStore((s) => s.user)
  const { data: customers = [], refetch: refetchCustomers } = useCustomers()
  const { data: devices = [], refetch: refetchDevices } = useDevices()

  const [customerId, setCustomerId] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [subDistrict, setSubDistrict] = useState('')
  const [priority, setPriority] = useState(0)
  const [appointmentDate, setAppointmentDate] = useState('')
  const [department, setDepartment] = useState('')
  const [slaDeadline, setSlaDeadline] = useState('')

  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerEmail, setNewCustomerEmail] = useState('')
  const [newCustomerAddress, setNewCustomerAddress] = useState('')
  const [newCustomerSubDistrict, setNewCustomerSubDistrict] = useState('')
  const [creatingCustomer, setCreatingCustomer] = useState(false)

  const [showNewDevice, setShowNewDevice] = useState(false)
  const [newModel, setNewModel] = useState('')
  const [newSerial, setNewSerial] = useState('')
  const [newIp, setNewIp] = useState('')
  const [creatingDevice, setCreatingDevice] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    let finalCustomerId = customerId
    let finalDeviceId = deviceId

    if (showNewCustomer) {
      setCreatingCustomer(true)
      try {
        const customer = await customersApi.create({
          name: newCustomerName,
          phone: newCustomerPhone || undefined,
          email: newCustomerEmail || undefined,
          address: newCustomerAddress,
          subDistrict: newCustomerSubDistrict,
        })
        finalCustomerId = customer.id
        await refetchCustomers()
      } catch {
        setCreatingCustomer(false)
        return
      }
      setCreatingCustomer(false)
    }

    if (showNewDevice) {
      setCreatingDevice(true)
      try {
        const device = await devicesApi.create({
          model: newModel,
          serialNumber: newSerial,
          ...(newIp ? { ipAddress: newIp } : {}),
        })
        finalDeviceId = device.id
        await refetchDevices()
      } catch {
        setCreatingDevice(false)
        return
      }
      setCreatingDevice(false)
    }

    const data: CreateWorkOrderDto = {
      customerId: finalCustomerId,
      deviceId: finalDeviceId,
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
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-medium text-ink-slate">
                  Customer
                </label>
                <button
                  type="button"
                  onClick={() => { setShowNewCustomer(!showNewCustomer); setCustomerId('') }}
                  className="flex items-center gap-1 text-xs text-trust-blue hover:underline"
                >
                  <Plus size={14} />
                  {showNewCustomer ? 'Pick existing' : 'New customer'}
                </button>
              </div>
              {showNewCustomer ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-slate placeholder:text-muted-foreground focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
                    placeholder="Customer name"
                  />
                  <input
                    type="tel"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-slate placeholder:text-muted-foreground focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
                    placeholder="Phone (optional)"
                  />
                  <input
                    type="email"
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-slate placeholder:text-muted-foreground focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
                    placeholder="Email (optional)"
                  />
                  <input
                    type="text"
                    required
                    value={newCustomerAddress}
                    onChange={(e) => setNewCustomerAddress(e.target.value)}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-slate placeholder:text-muted-foreground focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
                    placeholder="Address"
                  />
                  <input
                    type="text"
                    required
                    value={newCustomerSubDistrict}
                    onChange={(e) => setNewCustomerSubDistrict(e.target.value)}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-slate placeholder:text-muted-foreground focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
                    placeholder="Sub-district"
                  />
                </div>
              ) : (
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
              )}
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-medium text-ink-slate">
                  Device
                </label>
                <button
                  type="button"
                  onClick={() => { setShowNewDevice(!showNewDevice); setDeviceId('') }}
                  className="flex items-center gap-1 text-xs text-trust-blue hover:underline"
                >
                  <Plus size={14} />
                  {showNewDevice ? 'Pick existing' : 'New device'}
                </button>
              </div>
              {showNewDevice ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-slate placeholder:text-muted-foreground focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
                    placeholder="Model (e.g. Tesla Wall Connector)"
                  />
                  <input
                    type="text"
                    required
                    value={newSerial}
                    onChange={(e) => setNewSerial(e.target.value)}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-slate placeholder:text-muted-foreground focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
                    placeholder="Serial number"
                  />
                  <input
                    type="text"
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-slate placeholder:text-muted-foreground focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
                    placeholder="IP address (optional)"
                  />
                </div>
              ) : (
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
              )}
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
