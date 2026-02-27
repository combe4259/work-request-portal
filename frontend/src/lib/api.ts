import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'
import type { InternalAxiosRequestConfig } from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api',
  headers: { 'Content-Type': 'application/json' },
})

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retryAuth?: boolean
}

function getPersistedToken(): string | null {
  const directToken = localStorage.getItem('accessToken')
  if (directToken && directToken.trim()) {
    return directToken
  }

  const rawAuthStorage = localStorage.getItem('auth-storage')
  if (!rawAuthStorage) {
    return null
  }

  try {
    const parsed = JSON.parse(rawAuthStorage) as {
      state?: {
        token?: unknown
      }
    }
    const token = parsed.state?.token
    if (typeof token === 'string' && token.trim()) {
      return token
    }
  } catch {
    return null
  }

  return null
}

api.interceptors.request.use((config) => {
  const auth = useAuthStore.getState()
  const token = (auth.token && auth.token.trim()) ? auth.token : getPersistedToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (auth.currentTeam?.id) {
    config.headers['X-Team-Id'] = String(auth.currentTeam.id)
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined
    if (error.response?.status === 401 && originalRequest && !originalRequest._retryAuth) {
      const retryToken = getPersistedToken()
      if (retryToken) {
        originalRequest._retryAuth = true
        originalRequest.headers = originalRequest.headers ?? {}
        originalRequest.headers.Authorization = `Bearer ${retryToken}`
        return api(originalRequest)
      }
    }

    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
