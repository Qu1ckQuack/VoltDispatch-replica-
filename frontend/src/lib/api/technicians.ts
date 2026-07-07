import { api } from './client'
import type { Technician, CreateTechnicianDto, UpdateTechnicianDto, UpdateStatusDto } from './types'

export const techniciansApi = {
  create: (data: CreateTechnicianDto) =>
    api.post<Technician>('/technicians', data).then((r) => r.data),

  list: () =>
    api.get<Technician[]>('/technicians').then((r) => r.data),

  get: (id: string) =>
    api.get<Technician>(`/technicians/${id}`).then((r) => r.data),

  update: (id: string, data: UpdateTechnicianDto) =>
    api.patch<Technician>(`/technicians/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete<void>(`/technicians/${id}`).then((r) => r.data),

  updateStatus: (data: UpdateStatusDto) =>
    api.patch<Technician>('/technicians/me/status', data).then((r) => r.data),
}
