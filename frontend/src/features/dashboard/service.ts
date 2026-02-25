import api from '@/lib/api'
import type { WorkRequest } from '@/types/work-request'

interface ApiDashboardResponse {
  kpi: {
    todoCount: number
    inProgressCount: number
    doneCount: number
    urgentCount: number
  }
  workRequests: Array<{
    id: number
    docNo: string
    title: string
    type: WorkRequest['type']
    priority: WorkRequest['priority']
    status: WorkRequest['status']
    assignee: string
    deadline: string | null
  }>
  calendarEvents: Array<{
    date: string
    day: number
    docNo: string
    title: string
    priority: WorkRequest['priority']
  }>
}

export interface DashboardSummary {
  kpi: {
    todoCount: number
    inProgressCount: number
    doneCount: number
    urgentCount: number
  }
  workRequests: WorkRequest[]
  calendarEvents: Array<{
    day: number
    docNo: string
    title: string
    priority: WorkRequest['priority']
  }>
}

export async function getDashboardSummary(teamId: number): Promise<DashboardSummary> {
  const { data } = await api.get<ApiDashboardResponse>('/dashboard', {
    params: { teamId },
  })

  return {
    kpi: data.kpi,
    workRequests: data.workRequests.map((item) => ({
      id: String(item.id),
      docNo: item.docNo,
      title: item.title,
      type: item.type,
      priority: item.priority,
      status: item.status,
      assignee: item.assignee,
      deadline: item.deadline ?? '',
    })),
    calendarEvents: data.calendarEvents.map((item) => ({
      day: item.day,
      docNo: item.docNo,
      title: item.title,
      priority: item.priority,
    })),
  }
}
