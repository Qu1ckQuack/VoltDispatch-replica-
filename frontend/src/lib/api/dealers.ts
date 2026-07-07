import { api } from './client'
import type { Dealer, CreateDealerDto, UpdateDealerDto } from './types'

export const dealersApi = {
  create: (data: CreateDealerDto) =>
    api.post<Dealer>('/dealers', data).then((r) => r.data),

  list: () =>
    api.get<Dealer[]>('/dealers').then((r) => r.data),

  get: (id: string) =>
    api.get<Dealer>(`/dealers/${id}`).then((r) => r.data),

  update: (id: string, data: UpdateDealerDto) =>
    api.patch<Dealer>(`/dealers/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete<void>(`/dealers/${id}`).then((r) => r.data),
}
