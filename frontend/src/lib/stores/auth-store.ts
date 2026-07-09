import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { UserPayload } from '@/lib/api/types'

interface PersistedAuthState {
  accessToken: string | null
  user: UserPayload | null
}

function getPersistedState(): PersistedAuthState | null {
  try {
    const raw = sessionStorage.getItem('volt-dispatch-auth')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.state ?? null
  } catch {
    return null
  }
}

const persisted = getPersistedState()

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: UserPayload | null
  isAuthenticated: boolean
  hasHydrated: boolean
  login: (accessToken: string, refreshToken: string, user: UserPayload) => void
  logout: () => void
  setTokens: (accessToken: string, refreshToken: string) => void
  setUser: (user: UserPayload) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: persisted?.accessToken ?? null,
      refreshToken: null,
      user: persisted?.user ?? null,
      isAuthenticated: !!persisted?.accessToken,
      hasHydrated: true,
      login: (accessToken, refreshToken, user) =>
        set({ accessToken, refreshToken, user, isAuthenticated: true }),
      logout: () =>
        set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
    }),
    {
      name: 'volt-dispatch-auth',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
