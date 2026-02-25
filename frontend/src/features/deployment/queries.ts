import { useQuery } from '@tanstack/react-query'
import {
  getDeployment,
  listDeploymentRelatedRefs,
  listDeploymentSteps,
  listDeployments,
  type DeploymentListParams,
} from './service'

export const deploymentQueryKeys = {
  all: ['deployments'] as const,
  list: (params: DeploymentListParams) => [...deploymentQueryKeys.all, 'list', params] as const,
  detail: (id: string | number) => [...deploymentQueryKeys.all, 'detail', id] as const,
  relatedRefs: (id: string | number) => [...deploymentQueryKeys.all, 'relatedRefs', id] as const,
  steps: (id: string | number) => [...deploymentQueryKeys.all, 'steps', id] as const,
}

export function useDeploymentsQuery(params: DeploymentListParams) {
  return useQuery({
    queryKey: deploymentQueryKeys.list(params),
    queryFn: () => listDeployments(params),
    placeholderData: (prev) => prev,
  })
}

export function useDeploymentRelatedRefsQuery(id: string | number | undefined) {
  return useQuery({
    queryKey: id == null ? [...deploymentQueryKeys.all, 'relatedRefs', 'none'] : deploymentQueryKeys.relatedRefs(id),
    queryFn: () => listDeploymentRelatedRefs(id as string | number),
    enabled: id != null,
  })
}

export function useDeploymentDetailQuery(id: string | number | undefined) {
  return useQuery({
    queryKey: id == null ? [...deploymentQueryKeys.all, 'detail', 'none'] : deploymentQueryKeys.detail(id),
    queryFn: () => getDeployment(id as string | number),
    enabled: id != null,
  })
}

export function useDeploymentStepsQuery(id: string | number | undefined) {
  return useQuery({
    queryKey: id == null ? [...deploymentQueryKeys.all, 'steps', 'none'] : deploymentQueryKeys.steps(id),
    queryFn: () => listDeploymentSteps(id as string | number),
    enabled: id != null,
  })
}
