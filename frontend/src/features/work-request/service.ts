import api from '@/lib/api'
import { toRelatedRefsPayload } from '@/lib/relatedRefs'
import { useAuthStore } from '@/stores/authStore'
import { resolveTeamMemberIdByName } from '@/features/auth/memberResolver'
import type { Priority, RequestType, Status, WorkRequest, WorkRequestDetail } from '@/types/work-request'

export type WorkRequestSortKey = 'docNo' | 'deadline'
export type WorkRequestSortDir = 'asc' | 'desc'

export interface WorkRequestListParams {
  search: string
  filterType: RequestType | '전체'
  filterPriority: Priority | '전체'
  filterStatus: Status | '전체'
  filterAssigneeId: number | null
  deadlineFrom?: string
  deadlineTo?: string
  sortKey: WorkRequestSortKey
  sortDir: WorkRequestSortDir
  page: number
  pageSize: number
}

export interface WorkRequestListResult {
  items: WorkRequest[]
  total: number
  totalPages: number
  page: number
}

export interface CreateWorkRequestInput {
  title: string
  type: RequestType
  priority: Priority
  deadline: string
  assignee?: string
  relatedDocs?: string[]
  background?: string
  description: string
}

export interface CreateWorkRequestResult {
  id: string
}

export interface UpdateWorkRequestInput {
  id: string | number
  title: string
  type: RequestType
  priority: Priority
  status: Status
  assignee?: string
  deadline: string
  background?: string
  description: string
  relatedDocs?: string[]
}

interface ApiPageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
}

interface ApiWorkRequestListItem {
  id: number
  requestNo: string
  title: string
  type: RequestType
  priority: Priority
  status: Status
  assigneeId: number | null
  deadline: string | null
}

interface ApiWorkRequestDetailResponse {
  id: number
  requestNo: string
  title: string
  background: string | null
  description: string
  type: RequestType
  priority: Priority
  status: Status
  requesterId: number
  assigneeId: number | null
  deadline: string | null
  createdAt: string | null
}

interface ApiWorkRequestRelatedRefResponse {
  refType: string
  refId: number
  refNo: string
  title: string | null
}

interface ApiCreateWorkRequestRequest {
  title: string
  background?: string
  description: string
  type: RequestType
  priority: Priority
  status: Status
  teamId: number
  requesterId: number
  assigneeId: number | null
  deadline: string
}

interface ApiCreateWorkRequestResponse {
  id: number
}

interface ApiUpdateWorkRequestRequest {
  title?: string
  background?: string | null
  description?: string
  type?: RequestType
  priority?: Priority
  status: Status
  assigneeId?: number | null
  deadline?: string
}

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

function mapListItem(item: ApiWorkRequestListItem): WorkRequest {
  return {
    id: String(item.id),
    docNo: item.requestNo,
    title: item.title,
    type: item.type,
    priority: item.priority,
    status: item.status,
    assignee: mapUserLabel(item.assigneeId, '미배정'),
    deadline: toDateOnly(item.deadline),
  }
}

function mapDetailItem(item: ApiWorkRequestDetailResponse): WorkRequestDetail {
  return {
    id: String(item.id),
    docNo: item.requestNo,
    title: item.title,
    background: item.background ?? '',
    description: item.description,
    type: item.type,
    priority: item.priority,
    status: item.status,
    requester: mapUserLabel(item.requesterId, '알 수 없음'),
    assignee: mapUserLabel(item.assigneeId, '미배정'),
    deadline: toDateOnly(item.deadline),
    createdAt: item.createdAt?.replace('T', ' ').slice(0, 16) ?? '',
  }
}

export async function listWorkRequests(params: WorkRequestListParams): Promise<WorkRequestListResult> {
  const { data } = await api.get<ApiPageResponse<ApiWorkRequestListItem>>('/work-requests', {
    params: {
      q: params.search.trim() || undefined,
      type: params.filterType === '전체' ? undefined : params.filterType,
      priority: params.filterPriority === '전체' ? undefined : params.filterPriority,
      status: params.filterStatus === '전체' ? undefined : params.filterStatus,
      assigneeId: params.filterAssigneeId ?? undefined,
      deadlineFrom: params.deadlineFrom || undefined,
      deadlineTo: params.deadlineTo || undefined,
      sortBy: params.sortKey,
      sortDir: params.sortDir,
      page: Math.max(0, params.page - 1),
      size: params.pageSize,
    },
  })

  const items = data.content.map(mapListItem)
  const totalPages = Math.max(1, data.totalPages || 1)

  return {
    items,
    total: data.totalElements ?? items.length,
    totalPages,
    page: (data.number ?? 0) + 1,
  }
}

export async function getWorkRequest(id: string | number): Promise<WorkRequestDetail> {
  const { data } = await api.get<ApiWorkRequestDetailResponse>(`/work-requests/${id}`)
  return mapDetailItem(data)
}

export async function listWorkRequestRelatedRefs(id: string | number): Promise<ApiWorkRequestRelatedRefResponse[]> {
  const { data } = await api.get<ApiWorkRequestRelatedRefResponse[]>(`/work-requests/${id}/related-refs`)
  return data
}

export async function createWorkRequest(input: CreateWorkRequestInput): Promise<CreateWorkRequestResult> {
  const auth = useAuthStore.getState()
  const user = auth.user
  const currentTeam = auth.currentTeam ?? auth.teams[0]

  if (!user || !currentTeam) {
    throw new Error('현재 로그인 사용자 또는 팀 정보가 없습니다.')
  }

  const assigneeId = await resolveTeamMemberIdByName(currentTeam.id, input.assignee)

  const payload: ApiCreateWorkRequestRequest = {
    title: input.title,
    background: input.background?.trim() ? input.background.trim() : undefined,
    description: input.description,
    type: input.type,
    priority: input.priority,
    status: '접수대기',
    teamId: currentTeam.id,
    requesterId: user.id,
    assigneeId,
    deadline: input.deadline,
  }

  const { data } = await api.post<ApiCreateWorkRequestResponse>('/work-requests', payload)

  const relatedRefs = toRelatedRefsPayload(input.relatedDocs ?? [])
  if (relatedRefs.length > 0) {
    await api.put(`/work-requests/${data.id}/related-refs`, { items: relatedRefs })
  }

  return { id: String(data.id) }
}

export async function updateWorkRequestStatus(id: string | number, status: Status): Promise<void> {
  const payload: ApiUpdateWorkRequestRequest = { status }
  await api.put(`/work-requests/${id}`, payload)
}

export async function updateWorkRequest(input: UpdateWorkRequestInput): Promise<void> {
  const auth = useAuthStore.getState()
  const currentTeam = auth.currentTeam ?? auth.teams[0]
  if (!currentTeam) {
    throw new Error('현재 선택된 팀 정보가 없습니다.')
  }

  const assigneeId = await resolveTeamMemberIdByName(currentTeam.id, input.assignee)

  const payload: ApiUpdateWorkRequestRequest = {
    title: input.title,
    background: input.background?.trim() ? input.background.trim() : null,
    description: input.description,
    type: input.type,
    priority: input.priority,
    status: input.status,
    assigneeId,
    deadline: input.deadline,
  }

  await api.put(`/work-requests/${input.id}`, payload)

  const relatedRefs = toRelatedRefsPayload(input.relatedDocs ?? [])
  await api.put(`/work-requests/${input.id}/related-refs`, { items: relatedRefs })
}

export async function deleteWorkRequest(id: string | number): Promise<void> {
  await api.delete(`/work-requests/${id}`)
}
