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
  filterAssigneeId: number | null
  deadlineFrom?: string
  deadlineTo?: string
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

export interface CreateTechTaskPrLinkInput {
  branchName: string
  prNo?: string | null
  prUrl?: string | null
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
  totalElements: number
  totalPages: number
  number: number
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

export async function createTechTaskPrLink(
  id: string | number,
  input: CreateTechTaskPrLinkInput,
): Promise<number> {
  const { data } = await api.post<{ id: number }>(`/tech-tasks/${id}/pr-links`, {
    branchName: input.branchName,
    prNo: input.prNo ?? null,
    prUrl: input.prUrl ?? null,
  })
  return data.id
}

export async function deleteTechTaskPrLink(id: string | number, linkId: number): Promise<void> {
  await api.delete(`/tech-tasks/${id}/pr-links/${linkId}`)
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
