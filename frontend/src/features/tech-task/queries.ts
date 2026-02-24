import { useQuery } from '@tanstack/react-query'
import {
  getTechTask,
  listTechTaskPrLinks,
  listTechTaskRelatedRefs,
  listTechTasks,
  type TechTaskListParams,
} from './service'

export const techTaskQueryKeys = {
  all: ['techTasks'] as const,
  list: (params: TechTaskListParams) => [...techTaskQueryKeys.all, 'list', params] as const,
  detail: (id: string | number) => [...techTaskQueryKeys.all, 'detail', id] as const,
  relatedRefs: (id: string | number) => [...techTaskQueryKeys.all, 'relatedRefs', id] as const,
  prLinks: (id: string | number) => [...techTaskQueryKeys.all, 'prLinks', id] as const,
}

export function useTechTasksQuery(params: TechTaskListParams) {
  return useQuery({
    queryKey: techTaskQueryKeys.list(params),
    queryFn: () => listTechTasks(params),
    placeholderData: (prev) => prev,
  })
}

export function useTechTaskDetailQuery(id: string | number | undefined) {
  return useQuery({
    queryKey: techTaskQueryKeys.detail(id ?? ''),
    queryFn: () => getTechTask(id as string),
    enabled: !!id,
  })
}

export function useTechTaskRelatedRefsQuery(id: string | number | undefined) {
  return useQuery({
    queryKey: techTaskQueryKeys.relatedRefs(id ?? ''),
    queryFn: () => listTechTaskRelatedRefs(id as string),
    enabled: !!id,
  })
}

export function useTechTaskPrLinksQuery(id: string | number | undefined) {
  return useQuery({
    queryKey: techTaskQueryKeys.prLinks(id ?? ''),
    queryFn: () => listTechTaskPrLinks(id as string),
    enabled: !!id,
  })
}
