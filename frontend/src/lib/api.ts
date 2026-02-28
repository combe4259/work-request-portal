import axios from 'axios'
import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retryAuth?: boolean
  _skipAuthRefresh?: boolean
}

type RetriableAxiosRequestConfig = AxiosRequestConfig & {
  _skipAuthRefresh?: boolean
}

interface TokenRefreshResponse {
  accessToken: string
}

let refreshPromise: Promise<string | null> | null = null

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

function clearAuthAndRedirect() {
  useAuthStore.getState().logout()
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = api
      .post<TokenRefreshResponse>('/auth/refresh', undefined, { _skipAuthRefresh: true } as RetriableAxiosRequestConfig)
      .then(({ data }) => {
        if (!data?.accessToken) {
          return null
        }

        useAuthStore.getState().setAccessToken(data.accessToken)
        return data.accessToken
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
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
  async (error) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined

    if (error.response?.status === 401 && originalRequest?._skipAuthRefresh) {
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retryAuth) {
      originalRequest._retryAuth = true
      const nextToken = await refreshAccessToken()

      if (nextToken) {
        originalRequest.headers = originalRequest.headers ?? {}
        originalRequest.headers.Authorization = `Bearer ${nextToken}`
        return api(originalRequest)
      }
    }

    if (error.response?.status === 401) {
      clearAuthAndRedirect()
    }

    return Promise.reject(error)
  }
)

export default api
