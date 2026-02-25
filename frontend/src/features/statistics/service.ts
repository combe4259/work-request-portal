import api from '@/lib/api'

interface ApiStatisticsResponse {
  kpi: {
    totalRequests: number
    averageProcessingDays: number
    completionRate: number
    unresolvedDefects: number
  }
  weeklyTrend: Array<{ week: string; wr: number; defect: number; deploy: number }>
  typeDistribution: Array<{ name: string; value: number }>
  defectSeverity: Array<{ name: string; count: number }>
  memberStats: Array<{ name: string; done: number; inProgress: number }>
  statusFlow: Array<{ name: string; value: number }>
}

export interface StatisticsSummary {
  kpi: {
    totalRequests: number
    averageProcessingDays: number
    completionRate: number
    unresolvedDefects: number
  }
  weeklyTrend: Array<{ week: string; wr: number; defect: number; deploy: number }>
  domainData: Array<{ name: string; value: number; color: string }>
  defectSeverity: Array<{ name: string; count: number; color: string }>
  memberStats: Array<{ name: string; done: number; inProgress: number }>
  statusFlow: Array<{ name: string; value: number }>
}

const TYPE_COLORS: Record<string, string> = {
  신규개발: '#3B82F6',
  기능개선: '#6366F1',
  버그수정: '#EF4444',
  인프라: '#F59E0B',
  기타: '#94A3B8',
}

const SEVERITY_COLORS: Record<string, string> = {
  치명적: '#EF4444',
  높음: '#F97316',
  보통: '#EAB308',
  낮음: '#22C55E',
}

export async function getStatisticsSummary(teamId?: number): Promise<StatisticsSummary> {
  const { data } = await api.get<ApiStatisticsResponse>('/statistics', {
    params: teamId == null ? undefined : { teamId },
  })

  return {
    kpi: data.kpi,
    weeklyTrend: data.weeklyTrend,
    domainData: data.typeDistribution.map((item) => ({
      name: item.name,
      value: item.value,
      color: TYPE_COLORS[item.name] ?? '#94A3B8',
    })),
    defectSeverity: data.defectSeverity.map((item) => ({
      name: item.name,
      count: item.count,
      color: SEVERITY_COLORS[item.name] ?? '#94A3B8',
    })),
    memberStats: data.memberStats,
    statusFlow: data.statusFlow,
  }
}
