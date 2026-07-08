import { api } from './client'
import type { RegistrationRequest } from './types'

export const registrationApi = {
  listPending: () =>
    api.get<RegistrationRequest[]>('/register/requests').then((r) => r.data),

  approve: (id: string) =>
    api.post<{ message: string }>(`/register/approve/${id}`).then((r) => r.data),

  reject: (id: string) =>
    api.post<{ message: string }>(`/register/reject/${id}`).then((r) => r.data),
}
