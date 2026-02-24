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
import TestScenarioDetailPage from '@/pages/test-scenario/TestScenarioDetailPage'
import DefectsPage from '@/pages/defect/DefectsPage'
import DefectFormPage from '@/pages/defect/DefectFormPage'
import DefectDetailPage from '@/pages/defect/DefectDetailPage'
import DeploymentsPage from '@/pages/deployment/DeploymentsPage'
import DeploymentFormPage from '@/pages/deployment/DeploymentFormPage'
import DeploymentDetailPage from '@/pages/deployment/DeploymentDetailPage'
import KnowledgeBasePage from '@/pages/knowledge-base/KnowledgeBasePage'
import KnowledgeBaseFormPage from '@/pages/knowledge-base/KnowledgeBaseFormPage'
import KnowledgeBaseDetailPage from '@/pages/knowledge-base/KnowledgeBaseDetailPage'
import IdeasPage from '@/pages/idea/IdeasPage'
import IdeaFormPage from '@/pages/idea/IdeaFormPage'
import IdeaDetailPage from '@/pages/idea/IdeaDetailPage'
import MeetingNotesPage from '@/pages/meeting-note/MeetingNotesPage'
import MeetingNoteFormPage from '@/pages/meeting-note/MeetingNoteFormPage'
import MeetingNoteDetailPage from '@/pages/meeting-note/MeetingNoteDetailPage'
import StatisticsPage from '@/pages/statistics/StatisticsPage'
import ResourcesPage from '@/pages/resource/ResourcesPage'
import ResourceFormPage from '@/pages/resource/ResourceFormPage'
import SettingsPage from '@/pages/settings/SettingsPage'
import SettingsTeamPage from '@/pages/settings/SettingsTeamPage'
import { RedirectIfAuthenticated, RequireAuth } from './RouteGuards'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: (
      <RedirectIfAuthenticated>
        <LoginPage />
      </RedirectIfAuthenticated>
    ),
  },
  {
    path: '/register',
    element: (
      <RedirectIfAuthenticated>
        <RegisterPage />
      </RedirectIfAuthenticated>
    ),
  },
  {
    path: '/team-select',
    element: (
      <RequireAuth>
        <TeamSelectPage />
      </RequireAuth>
    ),
  },
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
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
      { path: '/test-scenarios/:id', element: <TestScenarioDetailPage /> },
      { path: '/defects', element: <DefectsPage /> },
      { path: '/defects/new', element: <DefectFormPage /> },
      { path: '/defects/:id', element: <DefectDetailPage /> },
      { path: '/deployments', element: <DeploymentsPage /> },
      { path: '/deployments/new', element: <DeploymentFormPage /> },
      { path: '/deployments/:id', element: <DeploymentDetailPage /> },
      { path: '/knowledge-base', element: <KnowledgeBasePage /> },
      { path: '/knowledge-base/new', element: <KnowledgeBaseFormPage /> },
      { path: '/knowledge-base/:id', element: <KnowledgeBaseDetailPage /> },
      { path: '/meeting-notes', element: <MeetingNotesPage /> },
      { path: '/meeting-notes/new', element: <MeetingNoteFormPage /> },
      { path: '/meeting-notes/:id', element: <MeetingNoteDetailPage /> },
      { path: '/ideas', element: <IdeasPage /> },
      { path: '/ideas/new', element: <IdeaFormPage /> },
      { path: '/ideas/:id', element: <IdeaDetailPage /> },
      { path: '/statistics', element: <StatisticsPage /> },
      { path: '/resources', element: <ResourcesPage /> },
      { path: '/resources/new', element: <ResourceFormPage /> },
      { path: '/resources/:id/edit', element: <ResourceFormPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/settings/team', element: <SettingsTeamPage /> },
    ],
  },
])

export default router
