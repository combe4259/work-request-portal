import { useQuery } from '@tanstack/react-query'
import { getIdea, listIdeaRelatedRefs, listIdeas, type IdeaListParams } from './service'

export const ideaQueryKeys = {
  all: ['ideas'] as const,
  list: (params: IdeaListParams) => [...ideaQueryKeys.all, 'list', params] as const,
  detail: (id: string | number) => [...ideaQueryKeys.all, 'detail', id] as const,
  relatedRefs: (id: string | number) => [...ideaQueryKeys.all, 'relatedRefs', id] as const,
}

export function useIdeasQuery(params: IdeaListParams) {
  return useQuery({
    queryKey: ideaQueryKeys.list(params),
    queryFn: () => listIdeas(params),
    placeholderData: (prev) => prev,
  })
}

export function useIdeaQuery(id: string | number | undefined) {
  return useQuery({
    queryKey: ideaQueryKeys.detail(id ?? 'unknown'),
    queryFn: () => getIdea(id as string | number),
    enabled: Boolean(id),
  })
}

export function useIdeaRelatedRefsQuery(id: string | number | undefined) {
  return useQuery({
    queryKey: id == null ? [...ideaQueryKeys.all, 'relatedRefs', 'none'] : ideaQueryKeys.relatedRefs(id),
    queryFn: () => listIdeaRelatedRefs(id as string | number),
    enabled: id != null,
  })
}
