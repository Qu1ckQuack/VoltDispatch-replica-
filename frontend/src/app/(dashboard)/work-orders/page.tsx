'use client'

import { useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { UserRole } from '@/lib/api/types'
import type { WorkOrder, CreateWorkOrderDto } from '@/lib/api/types'
import {
  useWorkOrders,
  useCreateWorkOrder,
  useCancelWorkOrder,
  useAcceptWorkOrder,
  useDeclineWorkOrder,
  useStartTravelWorkOrder,
  useStartWorkWorkOrder,
  useIssueWorkOrder,
  useResolveIssueWorkOrder,
  useCompleteWorkOrder,
} from '@/lib/hooks/use-work-orders'
import { FilterBar } from '@/components/work-orders/filter-bar'
import { WorkOrderTable } from '@/components/work-orders/work-order-table'
import { CreateOrderModal } from '@/components/work-orders/create-order-modal'
import { OrderDetailModal } from '@/components/work-orders/order-detail-modal'
import { CancelModal } from '@/components/work-orders/cancel-modal'

export default function WorkOrdersPage() {
  const user = useAuthStore((s) => s.user)

  const [status, setStatus] = useState('')
  const [subDistrict, setSubDistrict] = useState('')
  const [priority, setPriority] = useState('')
  const [page, setPage] = useState(1)

  const [detailTarget, setDetailTarget] = useState<WorkOrder | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<WorkOrder | null>(null)

  const query = {
    ...(status ? { status: status as never } : {}),
    ...(subDistrict ? { subDistrict } : {}),
    ...(priority ? { priority: Number(priority) } : {}),
    page,
    limit: 20,
  }

  const { data: workOrdersRes, isLoading } = useWorkOrders(query)
  const createMutation = useCreateWorkOrder()
  const cancelMutation = useCancelWorkOrder()
  const acceptMutation = useAcceptWorkOrder()
  const declineMutation = useDeclineWorkOrder()
  const startTravelMutation = useStartTravelWorkOrder()
  const startWorkMutation = useStartWorkWorkOrder()
  const issueMutation = useIssueWorkOrder()
  const resolveIssueMutation = useResolveIssueWorkOrder()
  const completeMutation = useCompleteWorkOrder()

  const handleCreate = useCallback(
    (data: CreateWorkOrderDto) => {
      createMutation.mutate(data, { onSuccess: () => setShowCreate(false) })
    },
    [createMutation],
  )

  const handleCancel = useCallback(
    (note?: string) => {
      if (!cancelTarget) return
      cancelMutation.mutate(
        { id: cancelTarget.id, note },
        { onSuccess: () => setCancelTarget(null) },
      )
    },
    [cancelTarget, cancelMutation],
  )

  const handleAccept = useCallback((order: WorkOrder) => {
    if (window.confirm(`Accept work order ${order.id.slice(0, 8)}?`)) {
      acceptMutation.mutate({ id: order.id })
    }
  }, [acceptMutation])

  const handleDecline = useCallback((order: WorkOrder) => {
    if (window.confirm(`Decline work order ${order.id.slice(0, 8)}?`)) {
      declineMutation.mutate({ id: order.id })
    }
  }, [declineMutation])

  const handleStartTravel = useCallback((order: WorkOrder) => {
    startTravelMutation.mutate({ id: order.id })
  }, [startTravelMutation])

  const handleStartWork = useCallback((order: WorkOrder) => {
    startWorkMutation.mutate({ id: order.id })
  }, [startWorkMutation])

  const handleIssue = useCallback((order: WorkOrder) => {
    const note = window.prompt('Describe the issue:')
    if (note !== null) {
      issueMutation.mutate({ id: order.id, note: note || undefined })
    }
  }, [issueMutation])

  const handleResolveIssue = useCallback((order: WorkOrder) => {
    resolveIssueMutation.mutate({ id: order.id })
  }, [resolveIssueMutation])

  const handleComplete = useCallback((order: WorkOrder) => {
    if (window.confirm(`Mark work order ${order.id.slice(0, 8)} as completed?`)) {
      completeMutation.mutate({ id: order.id })
    }
  }, [completeMutation])

  const handleClearFilters = useCallback(() => {
    setStatus('')
    setSubDistrict('')
    setPriority('')
    setPage(1)
  }, [])

  const canCreate =
    user?.role === UserRole.DEALER || user?.role === UserRole.COORDINATOR

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-slate">Work Orders</h1>
          <p className="text-sm text-muted-foreground">
            View and manage all work orders
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-trust-blue px-4 py-2 text-sm font-medium text-white hover:bg-trust-blue/90"
          >
            <Plus size={16} />
            New Order
          </button>
        )}
      </div>

      <FilterBar
        status={status}
        subDistrict={subDistrict}
        priority={priority}
        onStatusChange={setStatus}
        onSubDistrictChange={setSubDistrict}
        onPriorityChange={setPriority}
        onClear={handleClearFilters}
      />

      <WorkOrderTable
        orders={workOrdersRes?.data ?? []}
        loading={isLoading}
        total={workOrdersRes?.total ?? 0}
        page={page}
        limit={20}
        onPageChange={setPage}
        onView={setDetailTarget}
        onAssign={() => {}}
        onReschedule={() => {}}
        onCancel={setCancelTarget}
        onAccept={handleAccept}
        onDecline={handleDecline}
        onStartTravel={handleStartTravel}
        onStartWork={handleStartWork}
        onIssue={handleIssue}
        onResolveIssue={handleResolveIssue}
        onComplete={handleComplete}
      />

      {showCreate && (
        <CreateOrderModal
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
          loading={createMutation.isPending}
        />
      )}

      {detailTarget && (
        <OrderDetailModal
          order={detailTarget}
          onClose={() => setDetailTarget(null)}
        />
      )}

      {cancelTarget && (
        <CancelModal
          order={cancelTarget}
          onCancel={handleCancel}
          onClose={() => setCancelTarget(null)}
          loading={cancelMutation.isPending}
        />
      )}
    </div>
  )
}
