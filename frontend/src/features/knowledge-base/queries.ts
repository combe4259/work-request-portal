import { useQuery } from '@tanstack/react-query'
import { getKnowledgeBaseArticle, listKnowledgeBaseArticles, type KnowledgeBaseArticleListParams } from './service'

export const knowledgeBaseQueryKeys = {
  all: ['knowledge-base'] as const,
  list: (params: KnowledgeBaseArticleListParams) => [...knowledgeBaseQueryKeys.all, 'list', params] as const,
  detail: (id: string | number) => [...knowledgeBaseQueryKeys.all, 'detail', id] as const,
}

export function useKnowledgeBaseArticlesQuery(params: KnowledgeBaseArticleListParams) {
  return useQuery({
    queryKey: knowledgeBaseQueryKeys.list(params),
    queryFn: () => listKnowledgeBaseArticles(params),
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
