import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTestScenario } from './service'
import { testScenarioQueryKeys } from './queries'

export function useCreateTestScenarioMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTestScenario,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: testScenarioQueryKeys.all })
    },
  })
}
