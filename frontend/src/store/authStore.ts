import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (user: User, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user, token) => {
        localStorage.setItem('auth_token', token)
        set({ user, isAuthenticated: true })
      },
      logout: () => {
        localStorage.removeItem('auth_token')
        set({ user: null, isAuthenticated: false })
      },
    }),
    {
      name: 'priorauth-auth-storage',
    }
  )
)
