import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTechTask } from './service'
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
