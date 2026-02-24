import { useQuery } from '@tanstack/react-query'
import { getIdea, listIdeas, type IdeaListParams } from './service'

export const ideaQueryKeys = {
  all: ['ideas'] as const,
  list: (params: IdeaListParams) => [...ideaQueryKeys.all, 'list', params] as const,
  detail: (id: string | number) => [...ideaQueryKeys.all, 'detail', id] as const,
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
