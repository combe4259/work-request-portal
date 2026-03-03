import { useQuery } from '@tanstack/react-query'
import { getDashboardSummary, type DashboardDomainFilter, type DashboardScope } from './service'

export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  summary: (teamId: number, scope: DashboardScope, domain: DashboardDomainFilter, page: number, size: number) =>
    [...dashboardQueryKeys.all, 'summary', teamId, scope, domain, page, size] as const,
}

export function useDashboardSummaryQuery(
  teamId: number | undefined,
  scope: DashboardScope,
  domain: DashboardDomainFilter,
  page: number,
  size: number,
) {
  return useQuery({
    queryKey: teamId == null
      ? [...dashboardQueryKeys.all, 'summary', 'none', scope, domain, page, size]
      : dashboardQueryKeys.summary(teamId, scope, domain, page, size),
    queryFn: () => getDashboardSummary({ teamId: teamId as number, scope, domain, page, size }),
    enabled: teamId != null,
    placeholderData: (prev) => prev,
  })
}
