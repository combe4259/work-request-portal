import api from '@/lib/api'
import type { RefType } from '@/features/common/refTypes'
import { useAuthStore } from '@/stores/authStore'

export interface ActivityLogItem {
  id: number
  refType: RefType
  refId: number
  actionType: string
  actorId: number | null
  actorName: string
  fieldName: string | null
  beforeValue: string | null
  afterValue: string | null
  message: string | null
  createdAt: string
}

export interface ActivityLogListResult {
  items: ActivityLogItem[]
  total: number
}

interface ApiPageResponse<T> {
  content: T[]
  totalElements: number
}

interface ApiActivityLogItem {
  id: number
  refType: RefType
  refId: number
  actionType: string
  actorId: number | null
  fieldName: string | null
  beforeValue: string | null
  afterValue: string | null
  message: string | null
  createdAt: string | null
}

function toDateTime(value: string | null | undefined): string {
  return value?.replace('T', ' ').slice(0, 16) ?? '-'
}

function mapUserLabel(userId: number | null): string {
  if (userId == null) {
    return '시스템'
  }
  const auth = useAuthStore.getState()
  if (auth.user?.id === userId) {
    return auth.user.name
  }
  return `사용자#${userId}`
}

function mapActivityItem(item: ApiActivityLogItem): ActivityLogItem {
  return {
    id: item.id,
    refType: item.refType,
    refId: item.refId,
    actionType: item.actionType,
    actorId: item.actorId,
    actorName: mapUserLabel(item.actorId),
    fieldName: item.fieldName,
    beforeValue: item.beforeValue,
    afterValue: item.afterValue,
    message: item.message,
    createdAt: toDateTime(item.createdAt),
  }
}

export async function listActivityLogs(
  refType: RefType,
  refId: string | number,
  page = 0,
  size = 50,
): Promise<ActivityLogListResult> {
  const { data } = await api.get<ApiPageResponse<ApiActivityLogItem>>('/activity-logs', {
    params: { refType, refId, page, size },
  })

  return {
    items: data.content.map(mapActivityItem),
    total: data.totalElements ?? data.content.length,
  }
}
