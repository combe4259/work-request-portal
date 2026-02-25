import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createDeployment, deleteDeployment, updateDeployment, updateDeploymentStatus } from './service'
import { deploymentQueryKeys } from './queries'
import type { DeployStatus } from '@/types/deployment'

export function useCreateDeploymentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createDeployment,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: deploymentQueryKeys.all })
    },
  })
}

export function useUpdateDeploymentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateDeployment,
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: deploymentQueryKeys.all })
      await queryClient.invalidateQueries({ queryKey: deploymentQueryKeys.detail(variables.id) })
      await queryClient.invalidateQueries({ queryKey: deploymentQueryKeys.relatedRefs(variables.id) })
      await queryClient.invalidateQueries({ queryKey: deploymentQueryKeys.steps(variables.id) })
    },
  })
}

export function useUpdateDeploymentStatusMutation(id: string | number | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (status: DeployStatus) => {
      if (id == null) {
        throw new Error('배포 ID가 없습니다.')
      }
      await updateDeploymentStatus(id, status)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: deploymentQueryKeys.all })
      if (id != null) {
        await queryClient.invalidateQueries({ queryKey: deploymentQueryKeys.detail(id) })
      }
    },
  })
}

export function useDeleteDeploymentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteDeployment,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: deploymentQueryKeys.all })
    },
  })
}
