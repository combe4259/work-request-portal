import { useQuery } from '@tanstack/react-query'
import { me } from './service'

export const authQueryKeys = {
  all: ['auth'] as const,
  me: () => [...authQueryKeys.all, 'me'] as const,
}

export function useMeQuery(enabled: boolean) {
  return useQuery({
    queryKey: authQueryKeys.me(),
    queryFn: me,
    enabled,
    retry: 0,
  })
}
