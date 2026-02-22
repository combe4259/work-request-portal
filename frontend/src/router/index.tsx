import { createBrowserRouter, Navigate } from 'react-router-dom'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import TeamSelectPage from '@/pages/auth/TeamSelectPage'
import AppLayout from '@/components/layout/AppLayout'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import WorkRequestsPage from '@/pages/work-request/WorkRequestsPage'
import WorkRequestFormPage from '@/pages/work-request/WorkRequestFormPage'
import WorkRequestDetailPage from '@/pages/work-request/WorkRequestDetailPage'
import TechTasksPage from '@/pages/tech-task/TechTasksPage'
import TechTaskDetailPage from '@/pages/tech-task/TechTaskDetailPage'
import TechTaskFormPage from '@/pages/tech-task/TechTaskFormPage'
import TestScenariosPage from '@/pages/test-scenario/TestScenariosPage'
import TestScenarioFormPage from '@/pages/test-scenario/TestScenarioFormPage'
import DefectsPage from '@/pages/defect/DefectsPage'
import DefectFormPage from '@/pages/defect/DefectFormPage'
import DeploymentsPage from '@/pages/deployment/DeploymentsPage'
import DeploymentFormPage from '@/pages/deployment/DeploymentFormPage'
import KnowledgeBasePage from '@/pages/knowledge-base/KnowledgeBasePage'

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
      { path: '/work-requests', element: <WorkRequestsPage /> },
      { path: '/work-requests/new', element: <WorkRequestFormPage /> },
      { path: '/work-requests/:id', element: <WorkRequestDetailPage /> },
      { path: '/tech-tasks', element: <TechTasksPage /> },
      { path: '/tech-tasks/new', element: <TechTaskFormPage /> },
      { path: '/tech-tasks/:id', element: <TechTaskDetailPage /> },
      { path: '/test-scenarios', element: <TestScenariosPage /> },
      { path: '/test-scenarios/new', element: <TestScenarioFormPage /> },
      { path: '/defects', element: <DefectsPage /> },
      { path: '/defects/new', element: <DefectFormPage /> },
      { path: '/deployments', element: <DeploymentsPage /> },
      { path: '/deployments/new', element: <DeploymentFormPage /> },
      { path: '/knowledge-base', element: <KnowledgeBasePage /> },
      // { path: '/meeting-notes', element: <MeetingNotesPage /> },
      // { path: '/ideas', element: <IdeasPage /> },
      // { path: '/resources', element: <ResourcesPage /> },
      // { path: '/statistics', element: <StatisticsPage /> },
      // { path: '/settings', element: <SettingsPage /> },
    ],
  },
])

export default router
