import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Team } from '@/types/auth'

interface AuthState {
  user: User | null
  token: string | null
  currentTeam: Team | null
  teams: Team[]
  setAuth: (user: User, token: string, teams: Team[]) => void
  setCurrentTeam: (team: Team | null) => void
  setTeams: (teams: Team[]) => void
  addTeam: (team: Team) => void
  logout: () => void
}

function resolveCurrentTeam(teams: Team[], currentTeam: Team | null): Team | null {
  if (teams.length === 0) {
    return null
  }

  if (!currentTeam) {
    return teams[0]
  }

  return teams.find((team) => team.id === currentTeam.id) ?? teams[0]
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
        set((state) => ({
          user,
          token,
          teams,
          currentTeam: resolveCurrentTeam(teams, state.currentTeam),
        }))
      },

      setCurrentTeam: (team) => set({ currentTeam: team }),

      setTeams: (teams) => set((state) => ({
        teams,
        currentTeam: resolveCurrentTeam(teams, state.currentTeam),
      })),

      addTeam: (team) => set((state) => {
        const exists = state.teams.some((item) => item.id === team.id)
        const nextTeams = exists
          ? state.teams.map((item) => (item.id === team.id ? team : item))
          : [...state.teams, team]

        return {
          teams: nextTeams,
          currentTeam: team,
        }
      }),

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
