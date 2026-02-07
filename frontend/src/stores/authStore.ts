import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, LoginCredentials, RegisterData } from '@/types'
import { api } from '@/lib/api-client'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null

  setTokens: (access: string, refresh: string) => void
  setUser: (user: User) => void
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setTokens: (access, refresh) =>
        set({ accessToken: access, refreshToken: refresh }),

      setUser: (user) => set({ user }),

      login: async (credentials) => {
        const response = await api.login(credentials)
        set({
          user: response.user,
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
        })
      },

      register: async (data) => {
        const response = await api.register(data)
        set({
          user: response.user,
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
        })
      },

      logout: () => {
        api.logout().catch(() => {})
        set({ user: null, accessToken: null, refreshToken: null })
      },
    }),
    { name: 'agentboard-auth' },
  ),
)
