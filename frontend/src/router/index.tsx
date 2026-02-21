import { createBrowserRouter, Navigate } from 'react-router-dom'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import TeamSelectPage from '@/pages/auth/TeamSelectPage'
import AppLayout from '@/components/layout/AppLayout'
import DashboardPage from '@/pages/dashboard/DashboardPage'

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
  {
    element: <AppLayout />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      // TODO: 추가 라우트
      // { path: '/work-requests', element: <WorkRequestsPage /> },
      // { path: '/work-requests/new', element: <WorkRequestFormPage /> },
      // { path: '/tech-tasks', element: <TechTasksPage /> },
      // { path: '/test-scenarios', element: <TestScenariosPage /> },
      // { path: '/defects', element: <DefectsPage /> },
      // { path: '/deployments', element: <DeploymentsPage /> },
      // { path: '/knowledge-base', element: <KnowledgeBasePage /> },
      // { path: '/meeting-notes', element: <MeetingNotesPage /> },
      // { path: '/ideas', element: <IdeasPage /> },
      // { path: '/resources', element: <ResourcesPage /> },
      // { path: '/statistics', element: <StatisticsPage /> },
      // { path: '/settings', element: <SettingsPage /> },
    ],
  },
])

export default router
