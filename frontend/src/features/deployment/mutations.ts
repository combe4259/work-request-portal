import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createDeployment } from './service'
import { deploymentQueryKeys } from './queries'

export function useCreateDeploymentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createDeployment,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: deploymentQueryKeys.all })
    },
  })
}
