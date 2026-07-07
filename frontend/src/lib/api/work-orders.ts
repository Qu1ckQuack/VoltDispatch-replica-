import { api } from './client'
import type {
  WorkOrder,
  PaginatedResponse,
  CreateWorkOrderDto,
  WorkOrderQueryDto,
  AssignWorkOrderDto,
  RescheduleWorkOrderDto,
  TransitionNoteDto,
} from './types'

export const workOrdersApi = {
  create: (data: CreateWorkOrderDto) =>
    api.post<WorkOrder>('/work-orders', data).then((r) => r.data),

  list: (query?: WorkOrderQueryDto) =>
    api.get<PaginatedResponse<WorkOrder>>('/work-orders', { params: query }).then((r) => r.data),

  get: (id: string) =>
    api.get<WorkOrder>(`/work-orders/${id}`).then((r) => r.data),

  assign: (id: string, data: AssignWorkOrderDto) =>
    api.patch<WorkOrder>(`/work-orders/${id}/assign`, data).then((r) => r.data),

  accept: (id: string, data?: TransitionNoteDto) =>
    api.patch<WorkOrder>(`/work-orders/${id}/accept`, data).then((r) => r.data),

  decline: (id: string, data?: TransitionNoteDto) =>
    api.patch<WorkOrder>(`/work-orders/${id}/decline`, data).then((r) => r.data),

  reschedule: (id: string, data: RescheduleWorkOrderDto) =>
    api.patch<WorkOrder>(`/work-orders/${id}/reschedule`, data).then((r) => r.data),

  startTravel: (id: string, data?: TransitionNoteDto) =>
    api.patch<WorkOrder>(`/work-orders/${id}/start-travel`, data).then((r) => r.data),

  startWork: (id: string, data?: TransitionNoteDto) =>
    api.patch<WorkOrder>(`/work-orders/${id}/start-work`, data).then((r) => r.data),

  reportIssue: (id: string, data?: TransitionNoteDto) =>
    api.patch<WorkOrder>(`/work-orders/${id}/issue`, data).then((r) => r.data),

  resolveIssue: (id: string, data?: TransitionNoteDto) =>
    api.patch<WorkOrder>(`/work-orders/${id}/resolve-issue`, data).then((r) => r.data),

  escalate: (id: string, data?: TransitionNoteDto) =>
    api.patch<WorkOrder>(`/work-orders/${id}/escalate`, data).then((r) => r.data),

  complete: (id: string, data?: TransitionNoteDto) =>
    api.patch<WorkOrder>(`/work-orders/${id}/complete`, data).then((r) => r.data),

  cancel: (id: string, data?: TransitionNoteDto) =>
    api.patch<WorkOrder>(`/work-orders/${id}/cancel`, data).then((r) => r.data),
}
