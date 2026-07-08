import { api } from './client'
import type { User, CreateUserDto } from './types'

export const usersApi = {
  create: (data: CreateUserDto) =>
    api.post<User>('/users', data).then((r) => r.data),

  list: () =>
    api.get<User[]>('/users').then((r) => r.data),

  deactivate: (id: string) =>
    api.patch<User>(`/users/${id}/deactivate`).then((r) => r.data),

  resetPassword: (id: string, newPassword: string) =>
    api.post<User>(`/users/${id}/reset-password`, { newPassword }).then((r) => r.data),
}
