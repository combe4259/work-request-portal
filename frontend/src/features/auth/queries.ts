import { useQuery } from '@tanstack/react-query'
import { getTeamMembers, me } from './service'

export const authQueryKeys = {
  all: ['auth'] as const,
  me: () => [...authQueryKeys.all, 'me'] as const,
  teamMembers: (teamId: number | undefined) => [...authQueryKeys.all, 'team-members', teamId] as const,
}

export function useMeQuery(enabled: boolean) {
  return useQuery({
    queryKey: authQueryKeys.me(),
    queryFn: me,
    enabled,
    retry: 0,
  })
}

export function useTeamMembersQuery(teamId: number | undefined) {
  return useQuery({
    queryKey: authQueryKeys.teamMembers(teamId),
    queryFn: () => getTeamMembers(teamId as number),
    enabled: typeof teamId === 'number',
  })
}
