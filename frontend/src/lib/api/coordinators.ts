import { api } from './client'
import type { Coordinator, CreateCoordinatorDto, UpdateCoordinatorDto } from './types'

export const coordinatorsApi = {
  create: (data: CreateCoordinatorDto) =>
    api.post<Coordinator>('/coordinators', data).then((r) => r.data),

  list: () =>
    api.get<Coordinator[]>('/coordinators').then((r) => r.data),

  get: (id: string) =>
    api.get<Coordinator>(`/coordinators/${id}`).then((r) => r.data),

  update: (id: string, data: UpdateCoordinatorDto) =>
    api.patch<Coordinator>(`/coordinators/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete<void>(`/coordinators/${id}`).then((r) => r.data),
}
