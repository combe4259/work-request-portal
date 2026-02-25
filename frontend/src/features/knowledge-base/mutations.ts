import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createKnowledgeBaseArticle,
  deleteKnowledgeBaseArticle,
  increaseKnowledgeBaseView,
  updateKnowledgeBaseArticle,
} from './service'
import { knowledgeBaseQueryKeys } from './queries'

export function useCreateKnowledgeBaseArticleMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createKnowledgeBaseArticle,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: knowledgeBaseQueryKeys.all })
    },
  })
}

export function useIncreaseKnowledgeBaseViewMutation(id: string | number | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (id == null) {
        throw new Error('지식베이스 문서 ID가 없습니다.')
      }
      await increaseKnowledgeBaseView(id)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: knowledgeBaseQueryKeys.all })
      if (id != null) {
        await queryClient.invalidateQueries({ queryKey: knowledgeBaseQueryKeys.detail(id) })
      }
    },
  })
}

export function useUpdateKnowledgeBaseArticleMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateKnowledgeBaseArticle,
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: knowledgeBaseQueryKeys.all })
      await queryClient.invalidateQueries({ queryKey: knowledgeBaseQueryKeys.detail(variables.id) })
    },
  })
}

export function useDeleteKnowledgeBaseArticleMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteKnowledgeBaseArticle,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: knowledgeBaseQueryKeys.all })
    },
  })
}
