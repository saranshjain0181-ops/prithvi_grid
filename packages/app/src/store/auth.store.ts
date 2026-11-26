import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, Role, Tokens } from '@/types'

interface AuthState {
  user: User | null
  role: Role | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  login: (tokens: Tokens, user: User) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (tokens, user) =>
        set({
          user,
          role: user.role,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          user: null,
          role: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),
    }),
    {
      name: 'prithvi-auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
