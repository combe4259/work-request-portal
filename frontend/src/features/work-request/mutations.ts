import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createWorkRequest } from './service'
import { workRequestQueryKeys } from './queries'

export function useCreateWorkRequestMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createWorkRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workRequestQueryKeys.all })
    },
  })
}
