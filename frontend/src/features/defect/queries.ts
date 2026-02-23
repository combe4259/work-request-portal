import { useQuery } from '@tanstack/react-query'
import { listDefects, type DefectListParams } from './service'

export const defectQueryKeys = {
  all: ['defects'] as const,
  list: (params: DefectListParams) => [...defectQueryKeys.all, 'list', params] as const,
}

export function useDefectsQuery(params: DefectListParams) {
  return useQuery({
    queryKey: defectQueryKeys.list(params),
    queryFn: () => listDefects(params),
    placeholderData: (prev) => prev,
  })
}
