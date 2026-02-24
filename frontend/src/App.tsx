import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import router from '@/router'
import { useMeQuery } from '@/features/auth/queries'
import { useAuthStore } from '@/stores/authStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap />
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

function AuthBootstrap() {
  const token = useAuthStore((state) => state.token) ?? localStorage.getItem('accessToken')
  const setAuth = useAuthStore((state) => state.setAuth)
  const { data } = useMeQuery(Boolean(token))

  useEffect(() => {
    if (!data) return
    setAuth(data.user, data.accessToken, data.teams)
  }, [data, setAuth])

  return null
}
