import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type { RefType } from '@/features/common/refTypes'

export interface CommentItem {
  id: number
  refType: RefType
  refId: number
  content: string
  authorId: number
  authorName: string
  createdAt: string
}

export interface CommentListResult {
  items: CommentItem[]
  total: number
}

export interface CreateCommentInput {
  refType: RefType
  refId: number
  content: string
}

interface ApiPageResponse<T> {
  content: T[]
  totalElements: number
}

interface ApiCommentItem {
  id: number
  refType: RefType
  refId: number
  content: string
  authorId: number
  createdAt: string | null
}

interface ApiCreateCommentResponse {
  id: number
}

function mapUserLabel(userId: number): string {
  const auth = useAuthStore.getState()
  if (auth.user?.id === userId) {
    return auth.user.name
  }
  return `사용자#${userId}`
}

function toDateTime(value: string | null | undefined): string {
  return value?.replace('T', ' ').slice(0, 16) ?? '-'
}

function mapCommentItem(item: ApiCommentItem): CommentItem {
  return {
    id: item.id,
    refType: item.refType,
    refId: item.refId,
    content: item.content,
    authorId: item.authorId,
    authorName: mapUserLabel(item.authorId),
    createdAt: toDateTime(item.createdAt),
  }
}

export async function listComments(
  refType: RefType,
  refId: string | number,
  page = 0,
  size = 50,
): Promise<CommentListResult> {
  const { data } = await api.get<ApiPageResponse<ApiCommentItem>>('/comments', {
    params: { refType, refId, page, size },
  })

  return {
    items: data.content.map(mapCommentItem),
    total: data.totalElements ?? data.content.length,
  }
}

export async function createComment(input: CreateCommentInput): Promise<number> {
  const auth = useAuthStore.getState()
  if (!auth.user) {
    throw new Error('로그인 사용자 정보가 없습니다.')
  }

  const { data } = await api.post<ApiCreateCommentResponse>('/comments', {
    refType: input.refType,
    refId: input.refId,
    content: input.content,
    authorId: auth.user.id,
  })

  return data.id
}
