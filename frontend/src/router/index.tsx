import { createBrowserRouter, Navigate } from 'react-router-dom'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import TeamSelectPage from '@/pages/auth/TeamSelectPage'

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
  {
    path: '/team-select',
    element: <TeamSelectPage />,
  },
  // TODO: 추가 라우트
  // { path: '/dashboard', element: <DashboardPage /> },
])

export default router
