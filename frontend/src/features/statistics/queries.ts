import { useQuery } from '@tanstack/react-query'
import { getStatisticsSummary } from './service'

export const statisticsQueryKeys = {
  all: ['statistics'] as const,
  summary: (teamId?: number) => [...statisticsQueryKeys.all, 'summary', teamId ?? 'none'] as const,
}

export function useStatisticsSummaryQuery(teamId?: number) {
  return useQuery({
    queryKey: statisticsQueryKeys.summary(teamId),
    queryFn: () => getStatisticsSummary(teamId),
    placeholderData: (prev) => prev,
  })
}
