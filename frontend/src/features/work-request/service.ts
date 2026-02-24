import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type { Priority, RequestType, Status, WorkRequest, WorkRequestDetail } from '@/types/work-request'

export type WorkRequestSortKey = 'docNo' | 'deadline'
export type WorkRequestSortDir = 'asc' | 'desc'

export interface WorkRequestListParams {
  search: string
  filterType: RequestType | '전체'
  filterPriority: Priority | '전체'
  filterStatus: Status | '전체'
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
  background?: string
  description: string
}

export interface CreateWorkRequestResult {
  id: string
}

interface ApiPageResponse<T> {
  content: T[]
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
  status: Status
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
    params: { page: 0, size: LIST_FETCH_SIZE },
  })

  const filtered = data.content
    .map(mapListItem)
    .filter((item) => {
      const keyword = params.search.trim()
      const matchSearch = keyword.length === 0 || item.title.includes(keyword) || item.docNo.includes(keyword)
      const matchType = params.filterType === '전체' || item.type === params.filterType
      const matchPriority = params.filterPriority === '전체' || item.priority === params.filterPriority
      const matchStatus = params.filterStatus === '전체' || item.status === params.filterStatus
      return matchSearch && matchType && matchPriority && matchStatus
    })

  const sortFactor = params.sortDir === 'asc' ? 1 : -1
  const sorted = [...filtered].sort((a, b) => {
    if (params.sortKey === 'docNo') {
      return a.docNo.localeCompare(b.docNo, 'ko-KR', { numeric: true }) * sortFactor
    }

    const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER
    const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER
    return (aDeadline - bDeadline) * sortFactor
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

export async function getWorkRequest(id: string | number): Promise<WorkRequestDetail> {
  const { data } = await api.get<ApiWorkRequestDetailResponse>(`/work-requests/${id}`)
  return mapDetailItem(data)
}

export async function createWorkRequest(input: CreateWorkRequestInput): Promise<CreateWorkRequestResult> {
  const auth = useAuthStore.getState()
  const user = auth.user
  const currentTeam = auth.currentTeam ?? auth.teams[0]

  if (!user || !currentTeam) {
    throw new Error('현재 로그인 사용자 또는 팀 정보가 없습니다.')
  }

  const payload: ApiCreateWorkRequestRequest = {
    title: input.title,
    background: input.background?.trim() ? input.background.trim() : undefined,
    description: input.description,
    type: input.type,
    priority: input.priority,
    status: '접수대기',
    teamId: currentTeam.id,
    requesterId: user.id,
    // assignee는 현재 UI가 이름 기반이어서 백엔드 userId 매핑 전까지 미배정으로 저장
    assigneeId: null,
    deadline: input.deadline,
  }

  const { data } = await api.post<ApiCreateWorkRequestResponse>('/work-requests', payload)
  return { id: String(data.id) }
}

export async function updateWorkRequestStatus(id: string | number, status: Status): Promise<void> {
  const payload: ApiUpdateWorkRequestRequest = { status }
  await api.put(`/work-requests/${id}`, payload)
}
