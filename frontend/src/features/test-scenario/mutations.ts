import { useMutation, useQueryClient } from '@tanstack/react-query'
import { activityLogQueryKeys } from '@/features/activity-log/queries'
import { dashboardQueryKeys } from '@/features/dashboard/queries'
import {
  createTestScenario,
  deleteTestScenario,
  updateTestScenario,
  updateTestScenarioExecution,
  updateTestScenarioStatus,
  type UpdateTestScenarioExecutionInput,
} from './service'
import { testScenarioQueryKeys } from './queries'
import type { TestStatus } from '@/types/test-scenario'

export function useCreateTestScenarioMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTestScenario,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: testScenarioQueryKeys.all })
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all })
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
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all })
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
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all })
    },
  })
}

export function useUpdateTestScenarioExecutionMutation(id: string | number | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateTestScenarioExecutionInput) => {
      if (id == null) {
        throw new Error('테스트 시나리오 ID가 없습니다.')
      }
      await updateTestScenarioExecution(id, input)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: testScenarioQueryKeys.all })
      if (id != null) {
        await queryClient.invalidateQueries({ queryKey: testScenarioQueryKeys.detail(id) })
        await queryClient.invalidateQueries({ queryKey: activityLogQueryKeys.list('TEST_SCENARIO', id) })
      }
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all })
    },
  })
}

export function useDeleteTestScenarioMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTestScenario,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: testScenarioQueryKeys.all })
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all })
    },
  })
}
