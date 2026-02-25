import { useQuery } from '@tanstack/react-query'
import { getKnowledgeBaseArticle, listKnowledgeBaseArticles } from './service'

export const knowledgeBaseQueryKeys = {
  all: ['knowledge-base'] as const,
  list: () => [...knowledgeBaseQueryKeys.all, 'list'] as const,
  detail: (id: string | number) => [...knowledgeBaseQueryKeys.all, 'detail', id] as const,
}

export function useKnowledgeBaseArticlesQuery() {
  return useQuery({
    queryKey: knowledgeBaseQueryKeys.list(),
    queryFn: listKnowledgeBaseArticles,
    placeholderData: (prev) => prev,
  })
}

export function useKnowledgeBaseArticleQuery(id: string | number | undefined) {
  return useQuery({
    queryKey: id == null ? [...knowledgeBaseQueryKeys.all, 'detail', 'none'] : knowledgeBaseQueryKeys.detail(id),
    queryFn: () => getKnowledgeBaseArticle(id as string | number),
    enabled: id != null,
  })
}
