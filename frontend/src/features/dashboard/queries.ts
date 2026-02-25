import { useQuery } from '@tanstack/react-query'
import { getDashboardSummary } from './service'

export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  summary: (teamId: number) => [...dashboardQueryKeys.all, 'summary', teamId] as const,
}

export function useDashboardSummaryQuery(teamId?: number) {
  return useQuery({
    queryKey: teamId == null
      ? [...dashboardQueryKeys.all, 'summary', 'none']
      : dashboardQueryKeys.summary(teamId),
    queryFn: () => getDashboardSummary(teamId as number),
    enabled: teamId != null,
    placeholderData: (prev) => prev,
  })
}
