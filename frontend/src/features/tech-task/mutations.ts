import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Status } from '@/types/tech-task'
import { createTechTask, deleteTechTask, updateTechTask, updateTechTaskStatus } from './service'
import { techTaskQueryKeys } from './queries'
import { dashboardQueryKeys } from '@/features/dashboard/queries'

export function useCreateTechTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTechTask,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: techTaskQueryKeys.all })
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all })
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
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all })
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
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all })
    },
  })
}

export function useDeleteTechTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTechTask,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: techTaskQueryKeys.all })
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all })
    },
  })
}
