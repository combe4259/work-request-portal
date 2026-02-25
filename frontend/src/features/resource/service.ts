import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type { Resource, ResourceCategory } from '@/types/resource'

interface ApiPageResponse<T> {
  content: T[]
}

interface ApiResourceListItem {
  id: number
  title: string
  url: string
  category: string
  description: string
  registeredBy: number | null
  createdAt: string | null
}

interface ApiResourceDetailResponse {
  id: number
  teamId: number
  title: string
  url: string
  category: string
  description: string
  registeredBy: number | null
  createdAt: string | null
  updatedAt: string | null
}

interface ApiCreateResourceRequest {
  title: string
  url: string
  category: ResourceCategory
  description: string
  teamId: number
  registeredBy: number
}

interface ApiUpdateResourceRequest {
  title: string
  url: string
  category: ResourceCategory
  description: string
}

interface ApiCreateResourceResponse {
  id: number
}

export interface ResourceDetail extends Resource {
  teamId: number
  updatedAt: string
}

export interface CreateResourceInput {
  title: string
  url: string
  category: ResourceCategory
  description: string
}

export interface UpdateResourceInput {
  id: string | number
  title: string
  url: string
  category: ResourceCategory
  description: string
}

const LIST_FETCH_SIZE = 500

function normalizeCategory(value: string | null | undefined): ResourceCategory {
  if (value === 'Figma' || value === 'Notion' || value === 'GitHub' || value === 'Confluence' || value === '문서' || value === '기타') {
    return value
  }
  return '기타'
}

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

function mapListItem(item: ApiResourceListItem): Resource {
  return {
    id: String(item.id),
    title: item.title,
    url: item.url,
    category: normalizeCategory(item.category),
    description: item.description,
    registeredBy: mapUserLabel(item.registeredBy),
    createdAt: toDateOnly(item.createdAt),
  }
}

export async function listResources(): Promise<Resource[]> {
  const { data } = await api.get<ApiPageResponse<ApiResourceListItem>>('/resources', {
    params: { page: 0, size: LIST_FETCH_SIZE },
  })

  return data.content.map(mapListItem)
}

export async function getResource(id: string | number): Promise<ResourceDetail> {
  const { data } = await api.get<ApiResourceDetailResponse>(`/resources/${id}`)

  return {
    id: String(data.id),
    teamId: data.teamId,
    title: data.title,
    url: data.url,
    category: normalizeCategory(data.category),
    description: data.description,
    registeredBy: mapUserLabel(data.registeredBy),
    createdAt: toDateOnly(data.createdAt),
    updatedAt: toDateOnly(data.updatedAt),
  }
}

export async function createResource(input: CreateResourceInput): Promise<{ id: string }> {
  const auth = useAuthStore.getState()
  const user = auth.user
  const currentTeam = auth.currentTeam ?? auth.teams[0]

  if (!user || !currentTeam) {
    throw new Error('현재 로그인 사용자 또는 팀 정보가 없습니다.')
  }

  const payload: ApiCreateResourceRequest = {
    title: input.title,
    url: input.url,
    category: input.category,
    description: input.description,
    teamId: currentTeam.id,
    registeredBy: user.id,
  }

  const { data } = await api.post<ApiCreateResourceResponse>('/resources', payload)
  return { id: String(data.id) }
}

export async function updateResource(input: UpdateResourceInput): Promise<void> {
  const payload: ApiUpdateResourceRequest = {
    title: input.title,
    url: input.url,
    category: input.category,
    description: input.description,
  }

  await api.put(`/resources/${input.id}`, payload)
}

export async function deleteResource(id: string | number): Promise<void> {
  await api.delete(`/resources/${id}`)
}
