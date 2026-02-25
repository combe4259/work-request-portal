import { useQuery } from '@tanstack/react-query'
import type { RefType } from '@/features/common/refTypes'
import { listActivityLogs } from './service'

export const activityLogQueryKeys = {
  all: ['activityLogs'] as const,
  list: (refType: RefType, refId: string | number) =>
    [...activityLogQueryKeys.all, 'list', refType, refId] as const,
}

export function useActivityLogsQuery(refType: RefType, refId: string | number | undefined) {
  return useQuery({
    queryKey: refId == null
      ? [...activityLogQueryKeys.all, 'list', refType, 'none']
      : activityLogQueryKeys.list(refType, refId),
    queryFn: () => listActivityLogs(refType, refId as string | number),
    enabled: refId != null,
  })
}
