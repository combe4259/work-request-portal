import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Team } from '@/types/auth'

interface AuthState {
  user: User | null
  token: string | null
  currentTeam: Team | null
  teams: Team[]
  setAuth: (user: User, token: string, teams: Team[]) => void
  setCurrentTeam: (team: Team) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      currentTeam: null,
      teams: [],

      setAuth: (user, token, teams) => {
        localStorage.setItem('accessToken', token)
        set({ user, token, teams, currentTeam: teams[0] ?? null })
      },

      setCurrentTeam: (team) => set({ currentTeam: team }),

      logout: () => {
        localStorage.removeItem('accessToken')
        set({ user: null, token: null, currentTeam: null, teams: [] })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        currentTeam: state.currentTeam,
        teams: state.teams,
      }),
    }
  )
)
