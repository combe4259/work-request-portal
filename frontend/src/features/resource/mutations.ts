import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createResource, deleteResource, updateResource } from './service'
import { resourceQueryKeys } from './queries'

export function useCreateResourceMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createResource,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: resourceQueryKeys.all })
    },
  })
}

export function useUpdateResourceMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateResource,
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: resourceQueryKeys.all })
      await queryClient.invalidateQueries({ queryKey: resourceQueryKeys.detail(variables.id) })
    },
  })
}

export function useDeleteResourceMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteResource,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: resourceQueryKeys.all })
    },
  })
}
