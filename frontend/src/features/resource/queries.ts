import { useQuery } from '@tanstack/react-query'
import { getResource, listResources, type ResourceListParams } from './service'

export const resourceQueryKeys = {
  all: ['resources'] as const,
  list: (params: ResourceListParams) => [...resourceQueryKeys.all, 'list', params] as const,
  detail: (id: string | number) => [...resourceQueryKeys.all, 'detail', id] as const,
}

export function useResourcesQuery(params: ResourceListParams) {
  return useQuery({
    queryKey: resourceQueryKeys.list(params),
    queryFn: () => listResources(params),
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
