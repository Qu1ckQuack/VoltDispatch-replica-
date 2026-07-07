import { api } from './client'
import type { Notification } from './types'

export const notificationsApi = {
  list: () =>
    api.get<Notification[]>('/notifications').then((r) => r.data),

  get: (id: string) =>
    api.get<Notification>(`/notifications/${id}`).then((r) => r.data),
}
