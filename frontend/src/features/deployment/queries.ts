import { useQuery } from '@tanstack/react-query'
import { listDeployments, type DeploymentListParams } from './service'

export const deploymentQueryKeys = {
  all: ['deployments'] as const,
  list: (params: DeploymentListParams) => [...deploymentQueryKeys.all, 'list', params] as const,
}

export function useDeploymentsQuery(params: DeploymentListParams) {
  return useQuery({
    queryKey: deploymentQueryKeys.list(params),
    queryFn: () => listDeployments(params),
    placeholderData: (prev) => prev,
  })
}
