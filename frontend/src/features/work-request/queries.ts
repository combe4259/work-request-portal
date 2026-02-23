import { useQuery } from '@tanstack/react-query'
import { listWorkRequests, type WorkRequestListParams } from './service'

export const workRequestQueryKeys = {
  all: ['workRequests'] as const,
  list: (params: WorkRequestListParams) => [...workRequestQueryKeys.all, 'list', params] as const,
}

export function useWorkRequestsQuery(params: WorkRequestListParams) {
  return useQuery({
    queryKey: workRequestQueryKeys.list(params),
    queryFn: () => listWorkRequests(params),
    placeholderData: (prev) => prev,
  })
}
