import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@examflow/types'
import { api } from '@/lib/api-client'

function syncTokenCookie(token: string | null) {
  if (typeof document === 'undefined') return
  if (token) {
    document.cookie = `accessToken=${token}; path=/; max-age=${15 * 60}; SameSite=Lax`
  } else {
    document.cookie = 'accessToken=; path=/; max-age=0'
  }
}

interface RegisterData {
  email: string
  password: string
  displayName: string
  role?: string
}

interface AuthStore {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>
  setUser: (user: User) => void
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const res = await api.post<{ user: User; tokens: { accessToken: string; refreshToken: string } }>(
            '/auth/login',
            { email, password },
          )
          localStorage.setItem('accessToken', res.tokens.accessToken)
          localStorage.setItem('refreshToken', res.tokens.refreshToken)
          syncTokenCookie(res.tokens.accessToken)
          set({ user: res.user, accessToken: res.tokens.accessToken })
        } finally {
          set({ isLoading: false })
        }
      },

      register: async (data) => {
        set({ isLoading: true })
        try {
          const res = await api.post<{ user: User; tokens: { accessToken: string; refreshToken: string } }>(
            '/auth/register',
            data,
          )
          localStorage.setItem('accessToken', res.tokens.accessToken)
          localStorage.setItem('refreshToken', res.tokens.refreshToken)
          syncTokenCookie(res.tokens.accessToken)
          set({ user: res.user, accessToken: res.tokens.accessToken })
        } finally {
          set({ isLoading: false })
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch {}
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        syncTokenCookie(null)
        set({ user: null, accessToken: null })
      },

      refreshToken: async () => {
        try {
          const refreshToken = localStorage.getItem('refreshToken')
          if (!refreshToken) return false
          const res = await api.post<{ accessToken: string; refreshToken: string }>(
            '/auth/refresh',
            { refreshToken },
          )
          localStorage.setItem('accessToken', res.accessToken)
          localStorage.setItem('refreshToken', res.refreshToken)
          syncTokenCookie(res.accessToken)
          set({ accessToken: res.accessToken })
          return true
        } catch {
          return false
        }
      },

      setUser: (user) => set({ user }),

      initialize: async () => {
        const token = localStorage.getItem('accessToken')
        if (!token) return
        try {
          const user = await api.get<User>('/auth/me')
          set({ user, accessToken: token })
        } catch {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          syncTokenCookie(null)
          set({ user: null, accessToken: null })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ accessToken: state.accessToken, user: state.user }),
    },
  ),
)
