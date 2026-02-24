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

export function RedirectIfAuthenticated({ children }: GuardProps) {
  const token = useAuthStore((state) => state.token)
  if (getAccessToken(token)) {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}
