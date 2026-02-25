import { useQuery } from '@tanstack/react-query'
import type { RefType } from '@/features/common/refTypes'
import { listAttachments } from './service'

export const attachmentQueryKeys = {
  all: ['attachments'] as const,
  list: (refType: RefType, refId: string | number) =>
    [...attachmentQueryKeys.all, 'list', refType, refId] as const,
}

export function useAttachmentsQuery(refType: RefType, refId: string | number | undefined) {
  return useQuery({
    queryKey: refId == null
      ? [...attachmentQueryKeys.all, 'list', refType, 'none']
      : attachmentQueryKeys.list(refType, refId),
    queryFn: () => listAttachments(refType, refId as string | number),
    enabled: refId != null,
  })
}
