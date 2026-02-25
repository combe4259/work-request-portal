import api from '@/lib/api'
import { toRelatedRefsPayload } from '@/lib/relatedRefs'
import { useAuthStore } from '@/stores/authStore'
import type { KBArticle, KBArticleDetail, KBCategory } from '@/types/knowledge-base'

interface ApiPageResponse<T> {
  content: T[]
}

interface ApiKnowledgeBaseListItem {
  id: number
  articleNo: string
  title: string
  category: KBCategory
  tags: string[] | null
  summary: string
  authorId: number
  viewCount: number
  createdAt: string | null
  updatedAt: string | null
}

interface ApiKnowledgeBaseDetailResponse {
  id: number
  articleNo: string
  teamId: number
  title: string
  category: KBCategory
  tags: string[] | null
  summary: string
  content: string
  authorId: number
  viewCount: number
  createdAt: string | null
  updatedAt: string | null
}

interface ApiKnowledgeBaseCreateRequest {
  title: string
  category: KBCategory
  tags: string[]
  summary: string
  content: string
  teamId: number
  authorId: number
}

interface ApiKnowledgeBaseCreateResponse {
  id: number
}

interface ApiKnowledgeBaseUpdateRequest {
  title: string
  category: KBCategory
  tags: string[]
  summary: string
  content: string
}

interface ApiKnowledgeBaseRelatedRefResponse {
  refType: string
  refId: number
  refNo: string
  title: string | null
}

export interface CreateKnowledgeBaseArticleInput {
  title: string
  category: KBCategory
  tags: string[]
  summary: string
  content: string
  authorId: number
  relatedDocs?: string[]
}

export interface CreateKnowledgeBaseArticleResult {
  id: string
}

export interface UpdateKnowledgeBaseArticleInput {
  id: string | number
  title: string
  category: KBCategory
  tags: string[]
  summary: string
  content: string
  relatedDocs?: string[]
}

const LIST_FETCH_SIZE = 500

function mapUserLabel(userId: number | null | undefined): string {
  if (userId == null) {
    return '미지정'
  }

  const auth = useAuthStore.getState()
  if (auth.user && auth.user.id === userId) {
    return auth.user.name
  }

  return `사용자#${userId}`
}

function toDateOnly(value: string | null | undefined): string {
  return value?.slice(0, 10) ?? ''
}

function mapListItem(item: ApiKnowledgeBaseListItem): KBArticle {
  return {
    id: String(item.id),
    docNo: item.articleNo,
    title: item.title,
    category: item.category,
    tags: item.tags ?? [],
    summary: item.summary,
    authorId: item.authorId,
    author: mapUserLabel(item.authorId),
    relatedDocs: [],
    createdAt: toDateOnly(item.createdAt),
    updatedAt: toDateOnly(item.updatedAt),
    views: item.viewCount,
  }
}

export async function listKnowledgeBaseArticles(): Promise<KBArticle[]> {
  const { data } = await api.get<ApiPageResponse<ApiKnowledgeBaseListItem>>('/knowledge-base', {
    params: { page: 0, size: LIST_FETCH_SIZE },
  })

  return data.content.map(mapListItem)
}

export async function getKnowledgeBaseArticle(id: string | number): Promise<KBArticleDetail> {
  const [detailResponse, relatedRefsResponse] = await Promise.all([
    api.get<ApiKnowledgeBaseDetailResponse>(`/knowledge-base/${id}`),
    api.get<ApiKnowledgeBaseRelatedRefResponse[]>(`/knowledge-base/${id}/related-refs`),
  ])

  const data = detailResponse.data
  const relatedDocs = relatedRefsResponse.data.map((item) => ({
    docNo: item.refNo,
    title: item.title ?? item.refNo,
  }))

  return {
    id: String(data.id),
    docNo: data.articleNo,
    teamId: data.teamId,
    title: data.title,
    category: data.category,
    tags: data.tags ?? [],
    summary: data.summary,
    content: data.content,
    authorId: data.authorId,
    author: mapUserLabel(data.authorId),
    createdAt: toDateOnly(data.createdAt),
    updatedAt: toDateOnly(data.updatedAt),
    views: data.viewCount,
    relatedDocs,
    attachments: [],
  }
}

export async function createKnowledgeBaseArticle(
  input: CreateKnowledgeBaseArticleInput
): Promise<CreateKnowledgeBaseArticleResult> {
  const auth = useAuthStore.getState()
  const currentTeam = auth.currentTeam ?? auth.teams[0]

  if (!currentTeam) {
    throw new Error('현재 선택된 팀 정보가 없습니다.')
  }

  const payload: ApiKnowledgeBaseCreateRequest = {
    title: input.title,
    category: input.category,
    tags: input.tags,
    summary: input.summary,
    content: input.content,
    teamId: currentTeam.id,
    authorId: input.authorId,
  }

  const { data } = await api.post<ApiKnowledgeBaseCreateResponse>('/knowledge-base', payload)

  const relatedRefs = toRelatedRefsPayload(input.relatedDocs ?? [])
  if (relatedRefs.length > 0) {
    await api.put(`/knowledge-base/${data.id}/related-refs`, { items: relatedRefs })
  }

  return { id: String(data.id) }
}

export async function increaseKnowledgeBaseView(id: string | number): Promise<void> {
  await api.post(`/knowledge-base/${id}/view`)
}

export async function updateKnowledgeBaseArticle(input: UpdateKnowledgeBaseArticleInput): Promise<void> {
  const payload: ApiKnowledgeBaseUpdateRequest = {
    title: input.title,
    category: input.category,
    tags: input.tags,
    summary: input.summary,
    content: input.content,
  }

  await api.put(`/knowledge-base/${input.id}`, payload)

  const relatedRefs = toRelatedRefsPayload(input.relatedDocs ?? [])
  await api.put(`/knowledge-base/${input.id}/related-refs`, { items: relatedRefs })
}

export async function deleteKnowledgeBaseArticle(id: string | number): Promise<void> {
  await api.delete(`/knowledge-base/${id}`)
}
