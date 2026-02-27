import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { resolveTeamMemberIdByName } from '@/features/auth/memberResolver'
import type { Defect, DefectStatus, DefectType, Severity } from '@/types/defect'

export type DefectSortKey = 'docNo' | 'deadline' | 'severity' | 'status'
export type DefectSortDir = 'asc' | 'desc'

export interface DefectListParams {
  search: string
  filterType: DefectType | '전체'
  filterSeverity: Severity | '전체'
  filterStatus: DefectStatus | '전체'
  filterAssigneeId: number | null
  deadlineFrom?: string
  deadlineTo?: string
  sortKey: DefectSortKey
  sortDir: DefectSortDir
  page: number
  pageSize: number
}

export interface DefectSummary {
  criticalCount: number
  openCount: number
  fixingCount: number
  doneCount: number
}

export interface DefectListResult {
  items: Defect[]
  total: number
  totalPages: number
  page: number
  summary: DefectSummary
}

export interface CreateDefectInput {
  title: string
  type: DefectType
  severity: Severity
  deadline: string
  assignee?: string
  relatedDoc?: string
  environment?: string
  reproductionSteps?: string[]
  expectedBehavior: string
  actualBehavior: string
}

export interface DefectDetail {
  id: string
  docNo: string
  title: string
  type: DefectType
  severity: Severity
  status: DefectStatus
  reporter: string
  assignee: string
  relatedDoc: string
  environment: string
  reproductionSteps: string[]
  expectedBehavior: string
  actualBehavior: string
  deadline: string
  createdAt: string
}

export interface UpdateDefectInput {
  id: string | number
  title: string
  type: DefectType
  severity: Severity
  status: DefectStatus
  assignee?: string
  relatedDoc?: string
  environment?: string
  reproductionSteps?: string[]
  expectedBehavior: string
  actualBehavior: string
  deadline: string
  statusNote?: string
}

interface ApiPageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
}

interface ApiDefectListItem {
  id: number
  defectNo: string
  title: string
  type: DefectType
  severity: Severity
  status: DefectStatus
  reporterId: number
  assigneeId: number | null
  relatedRefType: string | null
  relatedRefId: number | null
  deadline: string | null
}

interface ApiDefectDetailResponse {
  id: number
  defectNo: string
  title: string
  type: DefectType
  severity: Severity
  status: DefectStatus
  reporterId: number
  assigneeId: number | null
  relatedRefType: string | null
  relatedRefId: number | null
  environment: string | null
  reproductionSteps: string | null
  expectedBehavior: string | null
  actualBehavior: string | null
  statusNote: string | null
  deadline: string | null
  createdAt: string | null
}

interface ApiCreateDefectRequest {
  title: string
  type: DefectType
  severity: Severity
  status: DefectStatus
  teamId: number
  reporterId: number
  assigneeId: number | null
  relatedRefType: string | null
  relatedRefId: number | null
  environment?: string
  reproductionSteps: string
  expectedBehavior: string
  actualBehavior: string
  deadline: string
}

interface ApiCreateDefectResponse {
  id: number
}

interface ApiUpdateDefectRequest {
  title?: string
  description?: string | null
  type?: DefectType
  severity?: Severity
  status?: DefectStatus
  relatedRefType?: string | null
  relatedRefId?: number | null
  environment?: string | null
  reproductionSteps?: string
  expectedBehavior?: string
  actualBehavior?: string
  deadline?: string
  statusNote?: string | null
  assigneeId?: number | null
}

interface ApiUpdateDefectStatusRequest {
  status: DefectStatus
  statusNote?: string
}

const SUMMARY_FETCH_SIZE = 500

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

function toRelatedDoc(refType: string | null | undefined, refId: number | null | undefined): string {
  if (!refType || refId == null) {
    return '-'
  }

  const prefix = refType === 'WORK_REQUEST'
    ? 'WR'
    : refType === 'TECH_TASK'
    ? 'TK'
    : refType === 'TEST_SCENARIO'
    ? 'TS'
    : 'REF'

  return `${prefix}-${refId}`
}

function parseRelatedDoc(relatedDoc?: string): { relatedRefType: string | null; relatedRefId: number | null } {
  if (!relatedDoc || relatedDoc === '-') {
    return { relatedRefType: null, relatedRefId: null }
  }

  const [prefix, idText] = relatedDoc.split('-')
  const parsedId = Number(idText)
  if (!prefix || !Number.isFinite(parsedId)) {
    return { relatedRefType: null, relatedRefId: null }
  }

  if (prefix === 'WR') {
    return { relatedRefType: 'WORK_REQUEST', relatedRefId: parsedId }
  }
  if (prefix === 'TK') {
    return { relatedRefType: 'TECH_TASK', relatedRefId: parsedId }
  }
  if (prefix === 'TS') {
    return { relatedRefType: 'TEST_SCENARIO', relatedRefId: parsedId }
  }

  return { relatedRefType: null, relatedRefId: null }
}

function mapListItem(item: ApiDefectListItem): Defect {
  return {
    id: String(item.id),
    docNo: item.defectNo,
    title: item.title,
    type: item.type,
    severity: item.severity,
    status: item.status,
    reporter: mapUserLabel(item.reporterId, '알 수 없음'),
    assignee: mapUserLabel(item.assigneeId, '미배정'),
    relatedDoc: toRelatedDoc(item.relatedRefType, item.relatedRefId),
    deadline: toDateOnly(item.deadline),
  }
}

function getSummary(source: Defect[]): DefectSummary {
  return {
    criticalCount: source.filter((r) => r.severity === '치명적' && r.status !== '완료' && r.status !== '재현불가').length,
    openCount: source.filter((r) => !['완료', '재현불가'].includes(r.status)).length,
    fixingCount: source.filter((r) => r.status === '수정중').length,
    doneCount: source.filter((r) => r.status === '완료').length,
  }
}

export async function listDefects(params: DefectListParams): Promise<DefectListResult> {
  const requestedPage = Math.max(0, params.page - 1)
  const sortBy = params.sortKey === 'docNo' ? 'docNo' : params.sortKey

  const [listResponse, summaryResponse] = await Promise.all([
    api.get<ApiPageResponse<ApiDefectListItem>>('/defects', {
      params: {
        q: params.search.trim() || undefined,
        type: params.filterType === '전체' ? undefined : params.filterType,
        severity: params.filterSeverity === '전체' ? undefined : params.filterSeverity,
        status: params.filterStatus === '전체' ? undefined : params.filterStatus,
        assigneeId: params.filterAssigneeId ?? undefined,
        deadlineFrom: params.deadlineFrom || undefined,
        deadlineTo: params.deadlineTo || undefined,
        sortBy,
        sortDir: params.sortDir,
        page: requestedPage,
        size: params.pageSize,
      },
    }),
    api.get<ApiPageResponse<ApiDefectListItem>>('/defects', {
      params: { page: 0, size: SUMMARY_FETCH_SIZE },
    }),
  ])

  const listData = listResponse.data
  const items = listData.content.map(mapListItem)
  const summarySource = summaryResponse.data.content.map(mapListItem)
  const totalPages = Math.max(1, listData.totalPages || 1)

  return {
    items,
    total: listData.totalElements ?? items.length,
    totalPages,
    page: (listData.number ?? 0) + 1,
    summary: getSummary(summarySource),
  }
}

export async function createDefect(input: CreateDefectInput): Promise<Defect> {
  const auth = useAuthStore.getState()
  const user = auth.user
  const currentTeam = auth.currentTeam ?? auth.teams[0]

  if (!user || !currentTeam) {
    throw new Error('현재 로그인 사용자 또는 팀 정보가 없습니다.')
  }

  const related = parseRelatedDoc(input.relatedDoc)
  const assigneeId = await resolveTeamMemberIdByName(currentTeam.id, input.assignee)

  const payload: ApiCreateDefectRequest = {
    title: input.title,
    type: input.type,
    severity: input.severity,
    status: '접수',
    teamId: currentTeam.id,
    reporterId: user.id,
    assigneeId,
    relatedRefType: related.relatedRefType,
    relatedRefId: related.relatedRefId,
    environment: input.environment?.trim() ? input.environment : undefined,
    reproductionSteps: JSON.stringify(input.reproductionSteps ?? []),
    expectedBehavior: input.expectedBehavior,
    actualBehavior: input.actualBehavior,
    deadline: input.deadline,
  }

  const { data } = await api.post<ApiCreateDefectResponse>('/defects', payload)
  const detail = await api.get<ApiDefectDetailResponse>(`/defects/${data.id}`)

  return {
    id: String(detail.data.id),
    docNo: detail.data.defectNo,
    title: detail.data.title,
    type: detail.data.type,
    severity: detail.data.severity,
    status: detail.data.status,
    reporter: mapUserLabel(detail.data.reporterId, '알 수 없음'),
    assignee: mapUserLabel(detail.data.assigneeId, '미배정'),
    relatedDoc: toRelatedDoc(detail.data.relatedRefType, detail.data.relatedRefId),
    deadline: toDateOnly(detail.data.deadline),
  }
}

function parseReproductionSteps(value: string | null | undefined): string[] {
  if (!value) {
    return []
  }

  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0)
  } catch {
    return []
  }
}

export async function getDefect(id: string | number): Promise<DefectDetail> {
  const { data } = await api.get<ApiDefectDetailResponse>(`/defects/${id}`)

  return {
    id: String(data.id),
    docNo: data.defectNo,
    title: data.title,
    type: data.type,
    severity: data.severity,
    status: data.status,
    reporter: mapUserLabel(data.reporterId, '알 수 없음'),
    assignee: mapUserLabel(data.assigneeId, '미배정'),
    relatedDoc: toRelatedDoc(data.relatedRefType, data.relatedRefId),
    environment: data.environment ?? '',
    reproductionSteps: parseReproductionSteps(data.reproductionSteps),
    expectedBehavior: data.expectedBehavior ?? '',
    actualBehavior: data.actualBehavior ?? '',
    deadline: toDateOnly(data.deadline),
    createdAt: toDateTime(data.createdAt),
  }
}

export async function updateDefect(input: UpdateDefectInput): Promise<void> {
  const auth = useAuthStore.getState()
  const currentTeam = auth.currentTeam ?? auth.teams[0]
  if (!currentTeam) {
    throw new Error('현재 선택된 팀 정보가 없습니다.')
  }

  const related = parseRelatedDoc(input.relatedDoc)
  const assigneeId = await resolveTeamMemberIdByName(currentTeam.id, input.assignee)

  const payload: ApiUpdateDefectRequest = {
    title: input.title,
    description: null,
    type: input.type,
    severity: input.severity,
    status: input.status,
    relatedRefType: related.relatedRefType,
    relatedRefId: related.relatedRefId,
    environment: input.environment?.trim() ? input.environment : null,
    reproductionSteps: JSON.stringify(input.reproductionSteps ?? []),
    expectedBehavior: input.expectedBehavior,
    actualBehavior: input.actualBehavior,
    deadline: input.deadline,
    statusNote: input.statusNote?.trim() ? input.statusNote : null,
    assigneeId,
  }

  await api.put(`/defects/${input.id}`, payload)
}

export async function updateDefectStatus(id: string | number, status: DefectStatus, statusNote?: string): Promise<void> {
  const payload: ApiUpdateDefectStatusRequest = { status, statusNote }
  await api.patch(`/defects/${id}/status`, payload)
}

export async function deleteDefect(id: string | number): Promise<void> {
  await api.delete(`/defects/${id}`)
}
