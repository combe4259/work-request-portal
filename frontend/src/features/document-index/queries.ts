import { useQuery } from '@tanstack/react-query'
import { searchDocumentIndex, type DocumentIndexSearchParams } from './service'

export const documentIndexQueryKeys = {
  all: ['documentIndex'] as const,
  search: (q: string, typesKey: string, teamId: number | null, size: number) => [...documentIndexQueryKeys.all, 'search', q, typesKey, teamId, size] as const,
}

interface UseDocumentIndexQueryParams extends DocumentIndexSearchParams {
  enabled?: boolean
}

export function useDocumentIndexQuery(params: UseDocumentIndexQueryParams) {
  const normalizedQuery = params.q?.trim() ?? ''
  const typesKey = params.types?.join(',') ?? ''
  const teamId = params.teamId ?? null
  const size = params.size ?? 40

  return useQuery({
    queryKey: documentIndexQueryKeys.search(normalizedQuery, typesKey, teamId, size),
    queryFn: () => searchDocumentIndex({ q: normalizedQuery, types: params.types, teamId: teamId ?? undefined, size }),
    enabled: (params.enabled ?? true) && teamId != null,
    staleTime: 30_000,
  })
}
