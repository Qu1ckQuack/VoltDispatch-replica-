import axios from 'axios'
import { useAuthStore } from '@/lib/stores/auth-store'
import { isTokenExpired } from '@/lib/api/jwt'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
})

let refreshPromise: Promise<{ accessToken: string; refreshToken: string }> | null = null

api.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    const { accessToken, refreshToken } = useAuthStore.getState()

    if (accessToken && isTokenExpired(accessToken) && refreshToken) {
      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken })
            .then((r) => r.data)
            .finally(() => { refreshPromise = null })
        }
        const data = await refreshPromise
        useAuthStore.getState().setTokens(data.accessToken, data.refreshToken)
        config.headers.Authorization = `Bearer ${data.accessToken}`
      } catch {
        useAuthStore.getState().logout()
      }
      return config
    }

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const refreshToken = useAuthStore.getState().refreshToken
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            { refreshToken },
          )
          useAuthStore.getState().setTokens(data.accessToken, data.refreshToken)
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
          return api(originalRequest)
        } catch {
          useAuthStore.getState().logout()
          return Promise.reject(error)
        }
      }
    }
    return Promise.reject(error)
  },
)
