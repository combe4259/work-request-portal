import { useQuery } from '@tanstack/react-query'
import { listTestScenarios, type TestScenarioListParams } from './service'

export const testScenarioQueryKeys = {
  all: ['testScenarios'] as const,
  list: (params: TestScenarioListParams) => [...testScenarioQueryKeys.all, 'list', params] as const,
}

export function useTestScenariosQuery(params: TestScenarioListParams) {
  return useQuery({
    queryKey: testScenarioQueryKeys.list(params),
    queryFn: () => listTestScenarios(params),
    placeholderData: (prev) => prev,
  })
}
