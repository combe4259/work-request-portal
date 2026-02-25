import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { RefType } from '@/features/common/refTypes'
import { commentQueryKeys } from './queries'
import { createComment, type CreateCommentInput } from './service'

export function useCreateCommentMutation(refType: RefType, refId: string | number | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Omit<CreateCommentInput, 'refType' | 'refId'>) => {
      if (refId == null) {
        throw new Error('문서 ID가 없습니다.')
      }
      return createComment({
        refType,
        refId: Number(refId),
        content: input.content,
      })
    },
    onSuccess: async () => {
      if (refId == null) {
        return
      }
      await queryClient.invalidateQueries({ queryKey: commentQueryKeys.list(refType, refId) })
    },
  })
}
