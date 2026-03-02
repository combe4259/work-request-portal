import api from '@/lib/api'

interface ApiStatisticsResponse {
  kpi: {
    incompleteCount: number
    overdueCount: number
    completedThisMonth: number
    averageProcessingDays: number
  }
  burndown: Array<{ date: string; remaining: number }>
  statusSnapshot: Array<{ name: string; value: number }>
  defectSeverity: Array<{ name: string; count: number }>
  memberStats: Array<{ name: string; done: number; inProgress: number }>
}

export interface StatisticsSummary {
  kpi: {
    incompleteCount: number
    overdueCount: number
    completedThisMonth: number
    averageProcessingDays: number
  }
  burndown: Array<{ date: string; remaining: number }>
  statusSnapshot: Array<{ name: string; value: number }>
  defectSeverity: Array<{ name: string; count: number; color: string }>
  memberStats: Array<{ name: string; done: number; inProgress: number }>
}

const SEVERITY_COLORS: Record<string, string> = {
  치명적: '#EF4444',
  높음:   '#F97316',
  보통:   '#EAB308',
  낮음:   '#22C55E',
}

export async function getStatisticsSummary(teamId?: number, days = 30): Promise<StatisticsSummary> {
  const { data } = await api.get<ApiStatisticsResponse>('/statistics', {
    params: {
      ...(teamId != null ? { teamId } : {}),
      days,
    },
  })

  return {
    kpi: data.kpi,
    burndown: data.burndown,
    statusSnapshot: data.statusSnapshot,
    defectSeverity: data.defectSeverity.map((item) => ({
      name: item.name,
      count: item.count,
      color: SEVERITY_COLORS[item.name] ?? '#94A3B8',
    })),
    memberStats: data.memberStats,
  }
}
