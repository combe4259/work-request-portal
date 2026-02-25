import { useQuery } from '@tanstack/react-query'
import { listDashboardNotifications } from './service'

export const notificationQueryKeys = {
  all: ['notifications'] as const,
  dashboard: (userId: number) => [...notificationQueryKeys.all, 'dashboard', userId] as const,
}

export function useDashboardNotificationsQuery(userId: number | undefined) {
  return useQuery({
    queryKey: userId == null ? [...notificationQueryKeys.all, 'dashboard', 'none'] : notificationQueryKeys.dashboard(userId),
    queryFn: () => listDashboardNotifications(userId as number),
    enabled: userId != null,
    placeholderData: (prev) => prev,
  })
}
