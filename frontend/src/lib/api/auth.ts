import { api } from './client'
import type { LoginResponse, MagicLinkResponse, RegisterDto } from './types'

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }).then((r) => r.data),

  refresh: (refreshToken: string) =>
    api.post<LoginResponse>('/auth/refresh', { refreshToken }).then((r) => r.data),

  requestMagicLink: (token: string) =>
    api.post<MagicLinkResponse>('/auth/magic-link', { token }).then((r) => r.data),

  register: (dto: RegisterDto) =>
    api.post<{ message: string }>('/register', dto).then((r) => r.data),
}
