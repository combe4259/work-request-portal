import { useQuery } from '@tanstack/react-query'
import { getWorkRequest, listWorkRequestRelatedRefs, listWorkRequests, type WorkRequestListParams } from './service'

export const workRequestQueryKeys = {
  all: ['workRequests'] as const,
  list: (params: WorkRequestListParams) => [...workRequestQueryKeys.all, 'list', params] as const,
  detail: (id: string | number) => [...workRequestQueryKeys.all, 'detail', id] as const,
  relatedRefs: (id: string | number) => [...workRequestQueryKeys.all, 'relatedRefs', id] as const,
}

export function useWorkRequestsQuery(params: WorkRequestListParams) {
  return useQuery({
    queryKey: workRequestQueryKeys.list(params),
    queryFn: () => listWorkRequests(params),
    placeholderData: (prev) => prev,
  })
}

export function useWorkRequestDetailQuery(id: string | number | undefined) {
  return useQuery({
    queryKey: id == null ? [...workRequestQueryKeys.all, 'detail', 'none'] : workRequestQueryKeys.detail(id),
    queryFn: () => getWorkRequest(id as string | number),
    enabled: id != null,
  })
}

export function useWorkRequestRelatedRefsQuery(id: string | number | undefined) {
  return useQuery({
    queryKey: id == null ? [...workRequestQueryKeys.all, 'relatedRefs', 'none'] : workRequestQueryKeys.relatedRefs(id),
    queryFn: () => listWorkRequestRelatedRefs(id as string | number),
    enabled: id != null,
  })
}
