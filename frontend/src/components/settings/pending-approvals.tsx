'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { registrationApi } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/auth-store'
import { UserRole } from '@/lib/api/types'
import { Check, X } from 'lucide-react'

export function PendingApprovals() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: registrationApi.listPending,
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => registrationApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (id: string) => registrationApi.reject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] })
      setConfirmId(null)
    },
  })

  if (user?.role !== UserRole.HQ && user?.role !== UserRole.COORDINATOR) {
    return null
  }

  const label = user.role === UserRole.COORDINATOR ? 'Technician' : 'Dealer'

  return (
    <div className="rounded-xl border border-border bg-white">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold text-ink-slate">
          Pending {label} Approvals
        </h2>
      </div>

      {isLoading ? (
        <div className="px-6 py-8 text-center text-sm text-muted-foreground">
          Loading...
        </div>
      ) : requests.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-muted-foreground">
          No pending approvals
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Phone</th>
                <th className="px-6 py-3 font-medium">District</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Submitted</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-6 py-3 text-ink-slate">{r.email}</td>
                  <td className="px-6 py-3">{r.phone}</td>
                  <td className="px-6 py-3">{r.district}</td>
                  <td className="px-6 py-3">{r.role}</td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => approveMutation.mutate(r.id)}
                        disabled={approveMutation.isPending}
                        className="flex items-center gap-1 rounded-md bg-assurance-green px-2.5 py-1 text-xs font-medium text-white hover:bg-assurance-green/90 disabled:opacity-50"
                      >
                        <Check size={14} /> Approve
                      </button>
                      {confirmId === r.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => rejectMutation.mutate(r.id)}
                            disabled={rejectMutation.isPending}
                            className="rounded-md bg-signal-red px-2.5 py-1 text-xs font-medium text-white hover:bg-signal-red/90"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(r.id)}
                          className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
                        >
                          <X size={14} /> Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
