import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { RefType } from '@/features/common/refTypes'
import { attachmentQueryKeys } from './queries'
import { createAttachmentsFromFiles } from './service'

export function useCreateAttachmentsMutation(refType: RefType, refId: string | number | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (files: File[]) => {
      if (refId == null) {
        throw new Error('문서 ID가 없습니다.')
      }
      await createAttachmentsFromFiles({ refType, refId, files })
    },
    onSuccess: async () => {
      if (refId == null) {
        return
      }
      await queryClient.invalidateQueries({ queryKey: attachmentQueryKeys.list(refType, refId) })
    },
  })
}
