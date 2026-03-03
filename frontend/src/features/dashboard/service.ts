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
  totalWorkItems: number
  calendarEvents: Array<{
    id: number
    startDate: string
    endDate: string
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
  totalWorkItems: number
  calendarEvents: Array<{
    id: number
    startDate: string
    endDate: string
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
  page: number
  size: number
}): Promise<DashboardSummary> {
  const { data } = await api.get<ApiDashboardResponse>('/dashboard', {
    params: {
      teamId: params.teamId,
      scope: params.scope,
      domain: params.domain,
      page: params.page,
      size: params.size,
    },
  })

  return {
    kpi: data.kpi,
    totalWorkItems: data.totalWorkItems,
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
      id: item.id,
      startDate: item.startDate,
      endDate: item.endDate,
      domain: item.domain,
      docNo: item.docNo,
      title: item.title,
      priority: (item.priority as Priority | '-') ?? '-',
    })),
  }
}
