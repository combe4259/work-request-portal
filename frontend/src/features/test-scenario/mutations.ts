import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTestScenario, deleteTestScenario, updateTestScenario, updateTestScenarioStatus } from './service'
import { testScenarioQueryKeys } from './queries'
import type { TestStatus } from '@/types/test-scenario'

export function useCreateTestScenarioMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTestScenario,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: testScenarioQueryKeys.all })
    },
  })
}

export function useUpdateTestScenarioMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateTestScenario,
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: testScenarioQueryKeys.all })
      await queryClient.invalidateQueries({ queryKey: testScenarioQueryKeys.detail(variables.id) })
      await queryClient.invalidateQueries({ queryKey: testScenarioQueryKeys.relatedRefs(variables.id) })
    },
  })
}

export function useUpdateTestScenarioStatusMutation(id: string | number | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (status: TestStatus) => {
      if (id == null) {
        throw new Error('테스트 시나리오 ID가 없습니다.')
      }
      await updateTestScenarioStatus(id, status)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: testScenarioQueryKeys.all })
      if (id != null) {
        await queryClient.invalidateQueries({ queryKey: testScenarioQueryKeys.detail(id) })
      }
    },
  })
}

export function useDeleteTestScenarioMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTestScenario,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: testScenarioQueryKeys.all })
    },
  })
}
