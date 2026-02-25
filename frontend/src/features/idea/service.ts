import api from '@/lib/api'
import { toRelatedRefsPayload } from '@/lib/relatedRefs'
import { useAuthStore } from '@/stores/authStore'
import type { Idea, IdeaCategory, IdeaStatus } from '@/types/idea'

export type IdeaSortKey = 'createdAt' | 'likes'
export type IdeaSortDir = 'asc' | 'desc'

export interface IdeaListParams {
  search: string
  filterCategory: IdeaCategory | '전체'
  filterStatus: IdeaStatus | '전체'
  sortKey: IdeaSortKey
  sortDir: IdeaSortDir
  page: number
  pageSize: number
}

export interface IdeaListResult {
  items: Idea[]
  total: number
  totalPages: number
  page: number
}

export interface IdeaDetail {
  id: string
  docNo: string
  title: string
  content: string
  benefits: string[]
  category: IdeaCategory
  status: IdeaStatus
  statusNote?: string
  proposer: string
  likes: number
  createdAt: string
}

export interface CreateIdeaInput {
  title: string
  content: string
  category: IdeaCategory
  benefits: string[]
  relatedDocs?: string[]
}

export interface CreateIdeaResult {
  id: string
}

export interface UpdateIdeaInput {
  id: string | number
  title: string
  content: string
  category: IdeaCategory
  benefits: string[]
  status: IdeaStatus
  statusNote?: string
  relatedDocs?: string[]
}

interface ApiPageResponse<T> {
  content: T[]
}

interface ApiIdeaListItem {
  id: number
  ideaNo: string
  title: string
  content: string
  category: IdeaCategory
  status: IdeaStatus
  proposedBy: number
  likeCount: number
  createdAt: string | null
}

interface ApiIdeaDetailResponse {
  id: number
  ideaNo: string
  teamId: number
  title: string
  content: string
  benefits: string[]
  category: IdeaCategory
  status: IdeaStatus
  statusNote: string | null
  proposedBy: number
  likeCount: number
  createdAt: string | null
  updatedAt: string | null
}

interface ApiCreateIdeaRequest {
  title: string
  content: string
  benefits: string[]
  category: IdeaCategory
  status: IdeaStatus
  statusNote?: string
  teamId: number
  proposedBy: number
}

interface ApiCreateIdeaResponse {
  id: number
}

interface ApiUpdateIdeaStatusRequest {
  status: IdeaStatus
  statusNote?: string
}

interface ApiUpdateIdeaRequest {
  title?: string
  content?: string
  benefits?: string[]
  category?: IdeaCategory
  status?: IdeaStatus
  statusNote?: string | null
}

interface ApiVoteResponse {
  liked: boolean
  likeCount: number
}

interface ApiIdeaRelatedRefResponse {
  refType: string
  refId: number
  refNo: string
  title: string | null
}

const LIST_FETCH_SIZE = 500

function mapUserLabel(userId: number | null | undefined, fallbackText: string): string {
  if (userId == null) {
    return fallbackText
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

function mapListItem(item: ApiIdeaListItem): Idea {
  return {
    id: String(item.id),
    docNo: item.ideaNo,
    title: item.title,
    category: item.category,
    status: item.status,
    content: item.content,
    proposer: mapUserLabel(item.proposedBy, '미지정'),
    likes: item.likeCount,
    commentCount: 0,
    createdAt: toDateOnly(item.createdAt),
  }
}

export async function listIdeas(params: IdeaListParams): Promise<IdeaListResult> {
  const { data } = await api.get<ApiPageResponse<ApiIdeaListItem>>('/ideas', {
    params: { page: 0, size: LIST_FETCH_SIZE },
  })

  const filtered = data.content
    .map(mapListItem)
    .filter((item) => {
      const keyword = params.search.trim().toLowerCase()
      const matchSearch = keyword.length === 0
        || item.title.toLowerCase().includes(keyword)
        || item.content.toLowerCase().includes(keyword)
      const matchCategory = params.filterCategory === '전체' || item.category === params.filterCategory
      const matchStatus = params.filterStatus === '전체' || item.status === params.filterStatus
      return matchSearch && matchCategory && matchStatus
    })

  const sorted = [...filtered].sort((a, b) => {
    const sortFactor = params.sortDir === 'asc' ? 1 : -1
    if (params.sortKey === 'likes') {
      return (a.likes - b.likes) * sortFactor
    }
    return a.createdAt.localeCompare(b.createdAt) * sortFactor
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / params.pageSize))
  const safePage = Math.min(Math.max(1, params.page), totalPages)
  const start = (safePage - 1) * params.pageSize
  const items = sorted.slice(start, start + params.pageSize)

  return {
    items,
    total: sorted.length,
    totalPages,
    page: safePage,
  }
}

export async function getIdea(id: string | number): Promise<IdeaDetail> {
  const { data } = await api.get<ApiIdeaDetailResponse>(`/ideas/${id}`)
  return {
    id: String(data.id),
    docNo: data.ideaNo,
    title: data.title,
    content: data.content,
    benefits: data.benefits ?? [],
    category: data.category,
    status: data.status,
    statusNote: data.statusNote ?? undefined,
    proposer: mapUserLabel(data.proposedBy, '미지정'),
    likes: data.likeCount,
    createdAt: toDateOnly(data.createdAt),
  }
}

export async function listIdeaRelatedRefs(id: string | number): Promise<ApiIdeaRelatedRefResponse[]> {
  const { data } = await api.get<ApiIdeaRelatedRefResponse[]>(`/ideas/${id}/related-refs`)
  return data
}

export async function createIdea(input: CreateIdeaInput): Promise<CreateIdeaResult> {
  const auth = useAuthStore.getState()
  const user = auth.user
  const currentTeam = auth.currentTeam ?? auth.teams[0]

  if (!user || !currentTeam) {
    throw new Error('현재 로그인 사용자 또는 팀 정보가 없습니다.')
  }

  const payload: ApiCreateIdeaRequest = {
    title: input.title,
    content: input.content,
    benefits: input.benefits,
    category: input.category,
    status: '제안됨',
    teamId: currentTeam.id,
    proposedBy: user.id,
  }

  const { data } = await api.post<ApiCreateIdeaResponse>('/ideas', payload)

  const relatedRefs = toRelatedRefsPayload(input.relatedDocs ?? [])
  if (relatedRefs.length > 0) {
    await api.put(`/ideas/${data.id}/related-refs`, { items: relatedRefs })
  }

  return { id: String(data.id) }
}

export async function updateIdeaStatus(id: string | number, status: IdeaStatus, statusNote?: string): Promise<void> {
  const payload: ApiUpdateIdeaStatusRequest = { status, statusNote }
  await api.patch(`/ideas/${id}/status`, payload)
}

export async function likeIdea(id: string | number): Promise<ApiVoteResponse> {
  const { data } = await api.post<ApiVoteResponse>(`/ideas/${id}/votes`)
  return data
}

export async function unlikeIdea(id: string | number): Promise<ApiVoteResponse> {
  const { data } = await api.delete<ApiVoteResponse>(`/ideas/${id}/votes/me`)
  return data
}

export async function updateIdea(input: UpdateIdeaInput): Promise<void> {
  const payload: ApiUpdateIdeaRequest = {
    title: input.title,
    content: input.content,
    benefits: input.benefits,
    category: input.category,
    status: input.status,
    statusNote: input.statusNote?.trim() ? input.statusNote : null,
  }

  await api.put(`/ideas/${input.id}`, payload)

  const relatedRefs = toRelatedRefsPayload(input.relatedDocs ?? [])
  await api.put(`/ideas/${input.id}/related-refs`, { items: relatedRefs })
}

export async function deleteIdea(id: string | number): Promise<void> {
  await api.delete(`/ideas/${id}`)
}
