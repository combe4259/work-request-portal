import { useQuery } from '@tanstack/react-query'
import { getResource, listResources } from './service'

export const resourceQueryKeys = {
  all: ['resources'] as const,
  list: () => [...resourceQueryKeys.all, 'list'] as const,
  detail: (id: string | number) => [...resourceQueryKeys.all, 'detail', id] as const,
}

export function useResourcesQuery() {
  return useQuery({
    queryKey: resourceQueryKeys.list(),
    queryFn: listResources,
    placeholderData: (prev) => prev,
  })
}

export function useResourceQuery(id: string | number | undefined) {
  return useQuery({
    queryKey: id == null ? [...resourceQueryKeys.all, 'detail', 'none'] : resourceQueryKeys.detail(id),
    queryFn: () => getResource(id as string | number),
    enabled: id != null,
  })
}
