import { useQuery } from '@tanstack/react-query'
import { getDashboardSummary, type DashboardDomainFilter, type DashboardScope } from './service'

export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  summary: (teamId: number, scope: DashboardScope, domain: DashboardDomainFilter) =>
    [...dashboardQueryKeys.all, 'summary', teamId, scope, domain] as const,
}

export function useDashboardSummaryQuery(
  teamId: number | undefined,
  scope: DashboardScope,
  domain: DashboardDomainFilter,
) {
  return useQuery({
    queryKey: teamId == null
      ? [...dashboardQueryKeys.all, 'summary', 'none', scope, domain]
      : dashboardQueryKeys.summary(teamId, scope, domain),
    queryFn: () => getDashboardSummary({ teamId: teamId as number, scope, domain }),
    enabled: teamId != null,
    placeholderData: (prev) => prev,
  })
}
