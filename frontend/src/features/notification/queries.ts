import { useQuery } from '@tanstack/react-query'
import { listDashboardNotifications, listNotifications } from './service'

export const notificationQueryKeys = {
  all: ['notifications'] as const,
  dashboard: (userId: number) => [...notificationQueryKeys.all, 'dashboard', userId] as const,
  list: (userId: number, read: boolean | undefined, page: number, size: number) =>
    [...notificationQueryKeys.all, 'list', userId, read ?? 'all', page, size] as const,
}

export function useDashboardNotificationsQuery(userId: number | undefined, size = 6) {
  return useQuery({
    queryKey: userId == null
      ? [...notificationQueryKeys.all, 'dashboard', 'none', size]
      : [...notificationQueryKeys.dashboard(userId), size],
    queryFn: () => listDashboardNotifications(userId as number, size),
    enabled: userId != null,
    placeholderData: (prev) => prev,
  })
}

export function useNotificationsQuery(
  userId: number | undefined,
  options: {
    read?: boolean
    page?: number
    size?: number
  },
) {
  const page = options.page ?? 0
  const size = options.size ?? 20

  return useQuery({
    queryKey: userId == null
      ? [...notificationQueryKeys.all, 'list', 'none', options.read ?? 'all', page, size]
      : notificationQueryKeys.list(userId, options.read, page, size),
    queryFn: () => listNotifications(userId as number, { ...options, page, size }),
    enabled: userId != null,
    placeholderData: (prev) => prev,
  })
}
