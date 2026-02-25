import api from '@/lib/api'
import { toRelatedRefsPayload } from '@/lib/relatedRefs'
import { useAuthStore } from '@/stores/authStore'
import { resolveTeamMemberIdByName } from '@/features/auth/memberResolver'
import type { Priority, Status, TechTask, TechTaskType } from '@/types/tech-task'

export type TechTaskSortKey = 'docNo' | 'deadline'
export type TechTaskSortDir = 'asc' | 'desc'

export interface TechTaskListParams {
  search: string
  filterType: TechTaskType | '전체'
  filterPriority: Priority | '전체'
  filterStatus: Status | '전체'
  sortKey: TechTaskSortKey
  sortDir: TechTaskSortDir
  page: number
  pageSize: number
}

export interface TechTaskListResult {
  items: TechTask[]
  total: number
  totalPages: number
  page: number
}

export interface TechTaskDetail {
  id: string
  docNo: string
  title: string
  type: TechTaskType
  priority: Priority
  status: Status
  registrant: string
  assignee: string
  deadline: string
  createdAt: string
  currentIssue: string
  solution: string
  definitionOfDone?: string
}

export interface TechTaskRelatedRef {
  refType: string
  refId: number
  refNo: string
  title: string | null
}

export interface TechTaskPrLink {
  id: number
  branchName: string
  prNo: string | null
  prUrl: string | null
}

export interface CreateTechTaskInput {
  title: string
  type: TechTaskType
  priority: Priority
  deadline: string
  currentIssue: string
  solution: string
  definitionOfDone?: string
  assignee?: string
  relatedDocs?: string[]
}

export interface CreateTechTaskResult {
  id: string
}

export interface UpdateTechTaskInput {
  id: string | number
  title: string
  type: TechTaskType
  priority: Priority
  status: Status
  deadline: string
  currentIssue: string
  solution: string
  definitionOfDone?: string
  assignee?: string
  relatedDocs?: string[]
}

interface ApiPageResponse<T> {
  content: T[]
}

interface ApiTechTaskListItem {
  id: number
  taskNo: string
  title: string
  type: TechTaskType
  priority: Priority
  status: Status
  assigneeId: number | null
  deadline: string | null
}

interface ApiTechTaskDetailResponse {
  id: number
  taskNo: string
  title: string
  currentIssue: string
  solution: string
  definitionOfDone: string | null
  type: TechTaskType
  priority: Priority
  status: Status
  registrantId: number
  assigneeId: number | null
  deadline: string | null
  createdAt: string | null
}

interface ApiTechTaskRelatedRefResponse {
  refType: string
  refId: number
  refNo: string
  title: string | null
}

interface ApiTechTaskPrLinkResponse {
  id: number
  branchName: string
  prNo: string | null
  prUrl: string | null
}

interface ApiCreateTechTaskRequest {
  title: string
  currentIssue: string
  solution: string
  definitionOfDone?: string
  type: TechTaskType
  priority: Priority
  status: Status
  teamId: number
  registrantId: number
  assigneeId: number | null
  deadline: string
}

interface ApiCreateTechTaskResponse {
  id: number
}

interface ApiUpdateTechTaskStatusRequest {
  status: Status
  statusNote?: string
}

interface ApiUpdateTechTaskRequest {
  title?: string
  currentIssue?: string
  solution?: string
  definitionOfDone?: string | null
  type?: TechTaskType
  priority?: Priority
  status?: Status
  assigneeId?: number | null
  deadline?: string
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

function toDateTime(value: string | null | undefined): string {
  return value?.replace('T', ' ').slice(0, 16) ?? ''
}

function mapListItem(item: ApiTechTaskListItem): TechTask {
  return {
    id: String(item.id),
    docNo: item.taskNo,
    title: item.title,
    type: item.type,
    priority: item.priority,
    status: item.status,
    assignee: mapUserLabel(item.assigneeId, '미배정'),
    deadline: toDateOnly(item.deadline),
  }
}

function mapDetailItem(item: ApiTechTaskDetailResponse): TechTaskDetail {
  return {
    id: String(item.id),
    docNo: item.taskNo,
    title: item.title,
    type: item.type,
    priority: item.priority,
    status: item.status,
    registrant: mapUserLabel(item.registrantId, '알 수 없음'),
    assignee: mapUserLabel(item.assigneeId, '미배정'),
    deadline: toDateOnly(item.deadline),
    createdAt: toDateTime(item.createdAt),
    currentIssue: item.currentIssue,
    solution: item.solution,
    definitionOfDone: item.definitionOfDone ?? undefined,
  }
}

export async function listTechTasks(params: TechTaskListParams): Promise<TechTaskListResult> {
  const { data } = await api.get<ApiPageResponse<ApiTechTaskListItem>>('/tech-tasks', {
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

  const sorted = [...filtered].sort((a, b) => {
    const sortFactor = params.sortDir === 'asc' ? 1 : -1
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

export async function getTechTask(id: string | number): Promise<TechTaskDetail> {
  const { data } = await api.get<ApiTechTaskDetailResponse>(`/tech-tasks/${id}`)
  return mapDetailItem(data)
}

export async function listTechTaskRelatedRefs(id: string | number): Promise<TechTaskRelatedRef[]> {
  const { data } = await api.get<ApiTechTaskRelatedRefResponse[]>(`/tech-tasks/${id}/related-refs`)
  return data
}

export async function listTechTaskPrLinks(id: string | number): Promise<TechTaskPrLink[]> {
  const { data } = await api.get<ApiTechTaskPrLinkResponse[]>(`/tech-tasks/${id}/pr-links`)
  return data
}

export async function createTechTask(input: CreateTechTaskInput): Promise<CreateTechTaskResult> {
  const auth = useAuthStore.getState()
  const user = auth.user
  const currentTeam = auth.currentTeam ?? auth.teams[0]

  if (!user || !currentTeam) {
    throw new Error('현재 로그인 사용자 또는 팀 정보가 없습니다.')
  }

  const assigneeId = await resolveTeamMemberIdByName(currentTeam.id, input.assignee)

  const payload: ApiCreateTechTaskRequest = {
    title: input.title,
    currentIssue: input.currentIssue,
    solution: input.solution,
    definitionOfDone: input.definitionOfDone?.trim() ? input.definitionOfDone : undefined,
    type: input.type,
    priority: input.priority,
    status: '접수대기',
    teamId: currentTeam.id,
    registrantId: user.id,
    assigneeId,
    deadline: input.deadline,
  }

  const { data } = await api.post<ApiCreateTechTaskResponse>('/tech-tasks', payload)

  const relatedRefs = toRelatedRefsPayload(input.relatedDocs ?? [])
  if (relatedRefs.length > 0) {
    await api.put(`/tech-tasks/${data.id}/related-refs`, { items: relatedRefs })
  }

  return { id: String(data.id) }
}

export async function updateTechTaskStatus(id: string | number, status: Status, statusNote?: string): Promise<void> {
  const payload: ApiUpdateTechTaskStatusRequest = { status, statusNote }
  await api.patch(`/tech-tasks/${id}/status`, payload)
}

export async function updateTechTask(input: UpdateTechTaskInput): Promise<void> {
  const auth = useAuthStore.getState()
  const currentTeam = auth.currentTeam ?? auth.teams[0]
  if (!currentTeam) {
    throw new Error('현재 선택된 팀 정보가 없습니다.')
  }

  const assigneeId = await resolveTeamMemberIdByName(currentTeam.id, input.assignee)

  const payload: ApiUpdateTechTaskRequest = {
    title: input.title,
    currentIssue: input.currentIssue,
    solution: input.solution,
    definitionOfDone: input.definitionOfDone?.trim() ? input.definitionOfDone : null,
    type: input.type,
    priority: input.priority,
    status: input.status,
    assigneeId,
    deadline: input.deadline,
  }

  await api.put(`/tech-tasks/${input.id}`, payload)

  const relatedRefs = toRelatedRefsPayload(input.relatedDocs ?? [])
  await api.put(`/tech-tasks/${input.id}/related-refs`, { items: relatedRefs })
}

export async function deleteTechTask(id: string | number): Promise<void> {
  await api.delete(`/tech-tasks/${id}`)
}
