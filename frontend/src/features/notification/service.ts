import api from '@/lib/api'

interface ApiPageResponse<T> {
  content: T[]
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
  type: 'assign' | 'comment' | 'deadline' | 'complete'
  text: string
  time: string
}

function mapType(rawType: string): DashboardNotification['type'] {
  if (rawType === '담당자배정' || rawType === '액션아이템배정') {
    return 'assign'
  }
  if (rawType === '댓글등록' || rawType === '멘션') {
    return 'comment'
  }
  if (rawType === '마감임박') {
    return 'deadline'
  }
  return 'complete'
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

export async function listDashboardNotifications(userId: number, size = 6): Promise<DashboardNotification[]> {
  const { data } = await api.get<ApiPageResponse<ApiNotificationListItem>>('/notifications', {
    params: {
      userId,
      page: 0,
      size,
    },
  })

  return data.content.map((item) => ({
    id: item.id,
    type: mapType(item.type),
    text: toDisplayText(item),
    time: formatRelativeTime(item.createdAt),
  }))
}
