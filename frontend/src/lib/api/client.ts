import axios from 'axios'
import { useAuthStore } from '@/lib/stores/auth-store'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const retryKey = `_retry_${originalRequest.url}`
    if (error.response?.status === 401 && !originalRequest[retryKey]) {
      originalRequest[retryKey] = true
      const refreshToken = useAuthStore.getState().refreshToken
      if (refreshToken && refreshToken.length > 0) {
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
