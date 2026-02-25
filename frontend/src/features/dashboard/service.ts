import api from '@/lib/api'
import type { Priority } from '@/types/work-request'

export type DashboardScope = 'mine' | 'team'
export type DashboardDomain = 'WORK_REQUEST' | 'TECH_TASK' | 'TEST_SCENARIO' | 'DEFECT' | 'DEPLOYMENT'
export type DashboardDomainFilter = 'ALL' | DashboardDomain

interface ApiDashboardResponse {
  kpi: {
    todoCount: number
    inProgressCount: number
    doneCount: number
    urgentCount: number
  }
  workRequests: Array<{
    id: number
    domain: DashboardDomain
    docNo: string
    title: string
    type: string
    priority: string
    status: string
    assignee: string
    deadline: string | null
  }>
  calendarEvents: Array<{
    date: string
    day: number
    domain: DashboardDomain
    docNo: string
    title: string
    priority: string
  }>
}

export interface DashboardSummary {
  kpi: {
    todoCount: number
    inProgressCount: number
    doneCount: number
    urgentCount: number
  }
  workRequests: Array<{
    id: number
    domain: DashboardDomain
    docNo: string
    title: string
    type: string
    priority: Priority | '-'
    status: string
    assignee: string
    deadline: string
  }>
  calendarEvents: Array<{
    date: string
    day: number
    domain: DashboardDomain
    docNo: string
    title: string
    priority: Priority | '-'
  }>
}

export async function getDashboardSummary(params: {
  teamId: number
  scope: DashboardScope
  domain: DashboardDomainFilter
}): Promise<DashboardSummary> {
  const { data } = await api.get<ApiDashboardResponse>('/dashboard', {
    params: {
      teamId: params.teamId,
      scope: params.scope,
      domain: params.domain,
    },
  })

  return {
    kpi: data.kpi,
    workRequests: data.workRequests.map((item) => ({
      id: item.id,
      domain: item.domain,
      docNo: item.docNo,
      title: item.title,
      type: item.type,
      priority: (item.priority as Priority | '-') ?? '-',
      status: item.status,
      assignee: item.assignee,
      deadline: item.deadline ?? '',
    })),
    calendarEvents: data.calendarEvents.map((item) => ({
      date: item.date,
      day: item.day,
      domain: item.domain,
      docNo: item.docNo,
      title: item.title,
      priority: (item.priority as Priority | '-') ?? '-',
    })),
  }
}
