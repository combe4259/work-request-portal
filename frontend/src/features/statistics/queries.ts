import { useQuery } from '@tanstack/react-query'
import { getStatisticsSummary } from './service'

export const statisticsQueryKeys = {
  all: ['statistics'] as const,
  summary: (teamId?: number, days?: number) =>
    [...statisticsQueryKeys.all, 'summary', teamId ?? 'none', days ?? 30] as const,
}

export function useStatisticsSummaryQuery(teamId?: number, days = 30) {
  return useQuery({
    queryKey: statisticsQueryKeys.summary(teamId, days),
    queryFn: () => getStatisticsSummary(teamId, days),
    placeholderData: (prev) => prev,
  })
}
