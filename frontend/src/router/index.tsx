import { createBrowserRouter, Navigate } from 'react-router-dom'
import LoginPage from '@/pages/auth/LoginPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  // TODO: 추가 라우트
  // { path: '/register', element: <RegisterPage /> },
  // { path: '/team-select', element: <TeamSelectPage /> },
  // { path: '/dashboard', element: <DashboardPage /> },
])

export default router
