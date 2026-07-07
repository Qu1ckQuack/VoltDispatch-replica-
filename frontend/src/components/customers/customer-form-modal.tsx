'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Customer, CreateCustomerDto, UpdateCustomerDto } from '@/lib/api/types'

interface CustomerFormModalProps {
  customer: Customer | null
  onSubmit: (data: CreateCustomerDto | UpdateCustomerDto) => void
  onClose: () => void
  loading?: boolean
}

export function CustomerFormModal({
  customer,
  onSubmit,
  onClose,
  loading,
}: CustomerFormModalProps) {
  const isEdit = !!customer
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [subDistrict, setSubDistrict] = useState('')

  useEffect(() => {
    if (customer) {
      setName(customer.name)
      setPhone(customer.phone || '')
      setEmail(customer.email || '')
      setAddress(customer.address)
      setSubDistrict(customer.subDistrict)
    }
  }, [customer])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      name,
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {}),
      address,
      subDistrict,
    }
    onSubmit(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-slate">
            {isEdit ? 'Edit Customer' : 'New Customer'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-slate">
              Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-slate">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-slate">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-slate">
              Address
            </label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
            />
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
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-trust-blue focus:outline-none focus:ring-1 focus:ring-trust-blue"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm text-ink-slate hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-trust-blue px-4 py-2 text-sm text-white hover:bg-trust-blue/90 disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEdit ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
