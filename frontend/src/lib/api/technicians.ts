import { api } from './client'
import type { Technician, CreateTechnicianDto, UpdateTechnicianDto, UpdateStatusDto } from './types'

export type TechnicianMapItem = Pick<Technician, 'id' | 'userId' | 'status' | 'lastLat' | 'lastLng' | 'district' | 'subDistrict'> & { user: { email: string } }

export const techniciansApi = {
  create: (data: CreateTechnicianDto) =>
    api.post<Technician>('/technicians', data).then((r) => r.data),

  list: () =>
    api.get<Technician[]>('/technicians').then((r) => r.data),

  mapList: (role: string) =>
    api.get<TechnicianMapItem[]>('/technicians/map').then((r) => {
      if (role === 'TECHNICIAN' && r.data.length <= 1) {
        console.warn("You are forbidden from accessing others locations other than your current customer")
      }
      return r.data
    }),

  get: (id: string) =>
    api.get<Technician>(`/technicians/${id}`).then((r) => r.data),

  update: (id: string, data: UpdateTechnicianDto) =>
    api.patch<Technician>(`/technicians/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete<void>(`/technicians/${id}`).then((r) => r.data),

  updateStatus: (data: UpdateStatusDto) =>
    api.patch<Technician>('/technicians/me/status', data).then((r) => r.data),
}
