import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createIdea, likeIdea, unlikeIdea, updateIdeaStatus } from './service'
import { ideaQueryKeys } from './queries'

export function useCreateIdeaMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createIdea,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ideaQueryKeys.all })
    },
  })
}

export function useUpdateIdeaStatusMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status, statusNote }: { id: string | number; status: '제안됨' | '검토중' | '채택' | '보류' | '기각'; statusNote?: string }) =>
      updateIdeaStatus(id, status, statusNote),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ideaQueryKeys.detail(variables.id) })
      await queryClient.invalidateQueries({ queryKey: ideaQueryKeys.all })
    },
  })
}

export function useLikeIdeaMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: likeIdea,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ideaQueryKeys.all })
    },
  })
}

export function useUnlikeIdeaMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: unlikeIdea,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ideaQueryKeys.all })
    },
  })
}
