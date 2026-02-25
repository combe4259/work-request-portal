import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

interface GuardProps {
  children: ReactNode
}

function getAccessToken(token: string | null) {
  return token ?? localStorage.getItem('accessToken')
}

export function RequireAuth({ children }: GuardProps) {
  const token = useAuthStore((state) => state.token)
  if (!getAccessToken(token)) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export function RequireTeam({ children }: GuardProps) {
  const teams = useAuthStore((state) => state.teams)
  const currentTeam = useAuthStore((state) => state.currentTeam)
  if (teams.length === 0 || !currentTeam) {
    return <Navigate to="/team-select" replace />
  }
  return <>{children}</>
}

export function RedirectIfAuthenticated({ children }: GuardProps) {
  const token = useAuthStore((state) => state.token)
  const teams = useAuthStore((state) => state.teams)
  const currentTeam = useAuthStore((state) => state.currentTeam)
  if (getAccessToken(token)) {
    if (teams.length === 0 || !currentTeam) {
      return <Navigate to="/team-select" replace />
    }
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}
