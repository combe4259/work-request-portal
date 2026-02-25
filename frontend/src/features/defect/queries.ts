import { useQuery } from '@tanstack/react-query'
import { getDefect, listDefects, type DefectListParams } from './service'

export const defectQueryKeys = {
  all: ['defects'] as const,
  list: (params: DefectListParams) => [...defectQueryKeys.all, 'list', params] as const,
  detail: (id: string | number) => [...defectQueryKeys.all, 'detail', id] as const,
}

export function useDefectsQuery(params: DefectListParams) {
  return useQuery({
    queryKey: defectQueryKeys.list(params),
    queryFn: () => listDefects(params),
    placeholderData: (prev) => prev,
  })
}

export function useDefectDetailQuery(id: string | number | undefined) {
  return useQuery({
    queryKey: id == null ? [...defectQueryKeys.all, 'detail', 'none'] : defectQueryKeys.detail(id),
    queryFn: () => getDefect(id as string | number),
    enabled: id != null,
  })
}
