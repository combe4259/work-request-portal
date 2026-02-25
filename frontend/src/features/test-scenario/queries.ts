import { useQuery } from '@tanstack/react-query'
import {
  getTestScenario,
  listTestScenarioRelatedRefs,
  listTestScenarios,
  type TestScenarioListParams,
} from './service'

export const testScenarioQueryKeys = {
  all: ['testScenarios'] as const,
  list: (params: TestScenarioListParams) => [...testScenarioQueryKeys.all, 'list', params] as const,
  detail: (id: string | number) => [...testScenarioQueryKeys.all, 'detail', id] as const,
  relatedRefs: (id: string | number) => [...testScenarioQueryKeys.all, 'relatedRefs', id] as const,
}

export function useTestScenariosQuery(params: TestScenarioListParams) {
  return useQuery({
    queryKey: testScenarioQueryKeys.list(params),
    queryFn: () => listTestScenarios(params),
    placeholderData: (prev) => prev,
  })
}

export function useTestScenarioRelatedRefsQuery(id: string | number | undefined) {
  return useQuery({
    queryKey: id == null ? [...testScenarioQueryKeys.all, 'relatedRefs', 'none'] : testScenarioQueryKeys.relatedRefs(id),
    queryFn: () => listTestScenarioRelatedRefs(id as string | number),
    enabled: id != null,
  })
}

export function useTestScenarioDetailQuery(id: string | number | undefined) {
  return useQuery({
    queryKey: id == null ? [...testScenarioQueryKeys.all, 'detail', 'none'] : testScenarioQueryKeys.detail(id),
    queryFn: () => getTestScenario(id as string | number),
    enabled: id != null,
  })
}
