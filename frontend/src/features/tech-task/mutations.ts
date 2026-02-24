import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Status } from '@/types/tech-task'
import { createTechTask, updateTechTaskStatus } from './service'
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
