import { api } from './client'
import type { Device, CreateDeviceDto, UpdateDeviceDto } from './types'

export const devicesApi = {
  create: (data: CreateDeviceDto) =>
    api.post<Device>('/devices', data).then((r) => r.data),

  list: () =>
    api.get<Device[]>('/devices').then((r) => r.data),

  get: (id: string) =>
    api.get<Device>(`/devices/${id}`).then((r) => r.data),

  update: (id: string, data: UpdateDeviceDto) =>
    api.patch<Device>(`/devices/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete<void>(`/devices/${id}`).then((r) => r.data),
}
