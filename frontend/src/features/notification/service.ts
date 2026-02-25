import api from '@/lib/api'

interface ApiPageResponse<T> {
  content: T[]
  totalElements?: number
  totalPages?: number
  number?: number
  size?: number
}

interface ApiNotificationListItem {
  id: number
  userId: number
  type: string
  title: string
  message: string | null
  refType: string | null
  refId: number | null
  isRead: boolean
  slackSent: boolean
  createdAt: string | null
}

export interface DashboardNotification {
  id: number
  type: 'assign' | 'comment' | 'deadline' | 'status' | 'complete'
  rawType: string
  title: string
  message: string | null
  text: string
  time: string
  createdAt: string | null
  isRead: boolean
  refType: string | null
  refId: number | null
}

export interface NotificationListResult {
  items: DashboardNotification[]
  total: number
  page: number
  totalPages: number
  size: number
}

function mapType(rawType: string): DashboardNotification['type'] {
  const value = rawType.trim()

  if (value.includes('배정')) {
    return 'assign'
  }
  if (value.includes('댓글') || value.includes('멘션')) {
    return 'comment'
  }
  if (value.includes('마감')) {
    return 'deadline'
  }
  if (value.includes('완료')) {
    return 'complete'
  }
  if (value.includes('상태') || value.includes('실패') || value.includes('롤백') || value.includes('반려')) {
    return 'status'
  }
  return 'status'
}

function formatRelativeTime(value: string | null | undefined): string {
  if (!value) {
    return '-'
  }

  const created = new Date(value)
  if (Number.isNaN(created.getTime())) {
    return '-'
  }

  const diffMs = Date.now() - created.getTime()
  if (diffMs < 60_000) {
    return '방금 전'
  }

  const diffMinutes = Math.floor(diffMs / 60_000)
  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours}시간 전`
  }

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) {
    return `${diffDays}일 전`
  }

  return value.slice(0, 10)
}

function toDisplayText(item: ApiNotificationListItem): string {
  const message = item.message?.trim()
  if (message) {
    return `${item.title} - ${message}`
  }
  return item.title
}

function mapNotificationItem(item: ApiNotificationListItem): DashboardNotification {
  return {
    id: item.id,
    type: mapType(item.type),
    rawType: item.type,
    title: item.title,
    message: item.message,
    text: toDisplayText(item),
    time: formatRelativeTime(item.createdAt),
    createdAt: item.createdAt,
    isRead: item.isRead,
    refType: item.refType,
    refId: item.refId,
  }
}

export async function listNotifications(
  userId: number,
  options?: {
    read?: boolean
    page?: number
    size?: number
  },
): Promise<NotificationListResult> {
  const page = options?.page ?? 0
  const size = options?.size ?? 20

  const { data } = await api.get<ApiPageResponse<ApiNotificationListItem>>('/notifications', {
    params: {
      userId,
      read: options?.read,
      page,
      size,
    },
  })

  const items = data.content.map(mapNotificationItem)
  return {
    items,
    total: data.totalElements ?? items.length,
    page: (data.number ?? page) + 1,
    totalPages: data.totalPages ?? 1,
    size: data.size ?? size,
  }
}

export async function listDashboardNotifications(userId: number, size = 6): Promise<DashboardNotification[]> {
  const result = await listNotifications(userId, { page: 0, size })
  return result.items
}

export async function updateNotificationReadState(id: number, read = true): Promise<void> {
  await api.patch(`/notifications/${id}/read`, null, {
    params: { read },
  })
}

export async function updateAllNotificationsReadState(read = true, userId?: number): Promise<void> {
  await api.patch('/notifications/read-all', null, {
    params: {
      read,
      userId,
    },
  })
}
