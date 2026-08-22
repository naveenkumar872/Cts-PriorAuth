import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PersonaRole = 'provider' | 'payer' | 'patient'

interface UIState {
  sidebarCollapsed: boolean
  darkMode: boolean
  userRole: PersonaRole
  toggleSidebar: () => void
  toggleDarkMode: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setUserRole: (role: PersonaRole) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      darkMode: false,
      userRole: 'provider',
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setUserRole: (role) => set({ userRole: role }),
    }),
    {
      name: 'priorauth-ui-storage',
    }
  )
)
