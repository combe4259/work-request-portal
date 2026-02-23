import { useQuery } from '@tanstack/react-query'
import { listTechTasks, type TechTaskListParams } from './service'

export const techTaskQueryKeys = {
  all: ['techTasks'] as const,
  list: (params: TechTaskListParams) => [...techTaskQueryKeys.all, 'list', params] as const,
}

export function useTechTasksQuery(params: TechTaskListParams) {
  return useQuery({
    queryKey: techTaskQueryKeys.list(params),
    queryFn: () => listTechTasks(params),
    placeholderData: (prev) => prev,
  })
}
