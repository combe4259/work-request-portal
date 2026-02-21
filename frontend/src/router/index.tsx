import { createBrowserRouter, Navigate } from 'react-router-dom'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  // TODO: 추가 라우트
  // { path: '/team-select', element: <TeamSelectPage /> },
  // { path: '/dashboard', element: <DashboardPage /> },
])

export default router
