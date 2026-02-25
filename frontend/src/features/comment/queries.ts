import { useQuery } from '@tanstack/react-query'
import type { RefType } from '@/features/common/refTypes'
import { listComments } from './service'

export const commentQueryKeys = {
  all: ['comments'] as const,
  list: (refType: RefType, refId: string | number) =>
    [...commentQueryKeys.all, 'list', refType, refId] as const,
}

export function useCommentsQuery(refType: RefType, refId: string | number | undefined) {
  return useQuery({
    queryKey: refId == null
      ? [...commentQueryKeys.all, 'list', refType, 'none']
      : commentQueryKeys.list(refType, refId),
    queryFn: () => listComments(refType, refId as string | number),
    enabled: refId != null,
  })
}
