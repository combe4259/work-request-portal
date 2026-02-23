import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createDefect } from './service'
import { defectQueryKeys } from './queries'

export function useCreateDefectMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createDefect,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: defectQueryKeys.all })
    },
  })
}
