import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Status } from '@/types/tech-task'
import { createTechTask, deleteTechTask, updateTechTask, updateTechTaskStatus } from './service'
import { techTaskQueryKeys } from './queries'

export function useCreateTechTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTechTask,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: techTaskQueryKeys.all })
    },
  })
}

export function useUpdateTechTaskStatusMutation(id: string | number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (status: Status) => updateTechTaskStatus(id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: techTaskQueryKeys.all })
      await queryClient.invalidateQueries({ queryKey: techTaskQueryKeys.detail(id) })
    },
  })
}

export function useUpdateTechTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateTechTask,
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: techTaskQueryKeys.all })
      await queryClient.invalidateQueries({ queryKey: techTaskQueryKeys.detail(variables.id) })
      await queryClient.invalidateQueries({ queryKey: techTaskQueryKeys.relatedRefs(variables.id) })
    },
  })
}

export function useDeleteTechTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTechTask,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: techTaskQueryKeys.all })
    },
  })
}
