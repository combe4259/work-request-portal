import api from '@/lib/api'
import { toRelatedRefsPayload } from '@/lib/relatedRefs'
import { useAuthStore } from '@/stores/authStore'
import { resolveTeamMemberIdByName } from '@/features/auth/memberResolver'
import type { Priority, TestScenario, TestScenarioType, TestStatus } from '@/types/test-scenario'

export type TestScenarioSortKey = 'docNo' | 'deadline' | 'priority' | 'status'
export type TestScenarioSortDir = 'asc' | 'desc'

export interface TestScenarioListParams {
  search: string
  filterType: TestScenarioType | '전체'
  filterPriority: Priority | '전체'
  filterStatus: TestStatus | '전체'
  sortKey: TestScenarioSortKey
  sortDir: TestScenarioSortDir
  page: number
  pageSize: number
}

export interface TestScenarioSummary {
  passCount: number
  failCount: number
  runCount: number
  totalCount: number
}

export interface TestScenarioListResult {
  items: TestScenario[]
  total: number
  totalPages: number
  page: number
  summary: TestScenarioSummary
}

export interface CreateTestScenarioInput {
  title: string
  type: TestScenarioType
  priority: Priority
  deadline: string
  assignee?: string
  relatedDoc?: string
}

export interface TestScenarioRelatedRef {
  refType: string
  refId: number
  refNo: string
  title: string | null
}

export interface TestScenarioDetail {
  id: string
  docNo: string
  title: string
  type: TestScenarioType
  priority: Priority
  status: TestStatus
  assignee: string
  precondition: string
  steps: string
  expectedResult: string
  actualResult: string
  statusNote?: string
  deadline: string
}

export interface UpdateTestScenarioInput {
  id: string | number
  title: string
  type: TestScenarioType
  priority: Priority
  status: TestStatus
  assignee?: string
  precondition?: string
  steps: string
  expectedResult: string
  actualResult: string
  statusNote?: string
  deadline: string
  relatedDoc?: string
}

interface ApiPageResponse<T> {
  content: T[]
}

interface ApiTestScenarioListItem {
  id: number
  scenarioNo: string
  title: string
  type: TestScenarioType
  priority: Priority
  status: TestStatus
  assigneeId: number | null
  deadline: string | null
}

interface ApiTestScenarioDetailResponse {
  id: number
  scenarioNo: string
  title: string
  description: string | null
  type: TestScenarioType
  priority: Priority
  status: TestStatus
  assigneeId: number | null
  precondition: string | null
  steps: string | null
  expectedResult: string | null
  actualResult: string | null
  statusNote: string | null
  deadline: string | null
}

interface ApiCreateTestScenarioRequest {
  title: string
  type: TestScenarioType
  priority: Priority
  status: TestStatus
  teamId: number
  assigneeId: number | null
  steps: string
  deadline: string
  createdBy: number
}

interface ApiCreateTestScenarioResponse {
  id: number
}

interface ApiUpdateTestScenarioRequest {
  title?: string
  description?: string | null
  type?: TestScenarioType
  priority?: Priority
  status?: TestStatus
  assigneeId?: number | null
  precondition?: string
  steps?: string
  expectedResult?: string
  actualResult?: string
  statusNote?: string | null
  deadline?: string
}

interface ApiUpdateTestScenarioStatusRequest {
  status: TestStatus
  statusNote?: string
}

interface ApiTestScenarioRelatedRefResponse {
  refType: string
  refId: number
  refNo: string | null
  title: string | null
}

const PRIORITY_ORDER: Record<string, number> = { 긴급: 0, 높음: 1, 보통: 2, 낮음: 3 }
const STATUS_ORDER: Record<string, number> = { 실행중: 0, 검토중: 1, 승인됨: 2, 실패: 3, 작성중: 4, 통과: 5, 보류: 6 }
const LIST_FETCH_SIZE = 500

function toFallbackDocNo(refType: string, refId: number): string {
  const prefix = refType === 'WORK_REQUEST'
    ? 'WR'
    : refType === 'TECH_TASK'
      ? 'TK'
      : refType === 'TEST_SCENARIO'
        ? 'TS'
        : refType === 'DEFECT'
          ? 'DF'
          : refType === 'DEPLOYMENT'
            ? 'DP'
            : refType === 'MEETING_NOTE'
              ? 'MN'
              : refType === 'PROJECT_IDEA'
                ? 'ID'
                : refType === 'KNOWLEDGE_BASE'
                  ? 'KB'
                  : 'DOC'
  return `${prefix}-${refId}`
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

function mapListItem(item: ApiTestScenarioListItem): TestScenario {
  return {
    id: String(item.id),
    docNo: item.scenarioNo,
    title: item.title,
    type: item.type,
    priority: item.priority,
    status: item.status,
    assignee: mapUserLabel(item.assigneeId, '미배정'),
    relatedDoc: '-',
    deadline: toDateOnly(item.deadline),
  }
}

function getSummary(source: TestScenario[]): TestScenarioSummary {
  return {
    passCount: source.filter((r) => r.status === '통과').length,
    failCount: source.filter((r) => r.status === '실패').length,
    runCount: source.filter((r) => r.status === '실행중').length,
    totalCount: source.length,
  }
}

export async function listTestScenarios(params: TestScenarioListParams): Promise<TestScenarioListResult> {
  const { data } = await api.get<ApiPageResponse<ApiTestScenarioListItem>>('/test-scenarios', {
    params: { page: 0, size: LIST_FETCH_SIZE },
  })

  const source = data.content.map(mapListItem)

  const filtered = source.filter((r) => {
    const keyword = params.search.trim()
    const matchSearch = keyword.length === 0 || r.title.includes(keyword) || r.docNo.includes(keyword)
    const matchType = params.filterType === '전체' || r.type === params.filterType
    const matchPriority = params.filterPriority === '전체' || r.priority === params.filterPriority
    const matchStatus = params.filterStatus === '전체' || r.status === params.filterStatus
    return matchSearch && matchType && matchPriority && matchStatus
  })

  const sorted = [...filtered].sort((a, b) => {
    const sortFactor = params.sortDir === 'asc' ? 1 : -1
    if (params.sortKey === 'docNo') {
      return a.docNo.localeCompare(b.docNo, 'ko-KR', { numeric: true }) * sortFactor
    }
    if (params.sortKey === 'priority') {
      return ((PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)) * sortFactor
    }
    if (params.sortKey === 'status') {
      return ((STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)) * sortFactor
    }

    const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER
    const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER
    return (aDeadline - bDeadline) * sortFactor
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / params.pageSize))
  const safePage = Math.min(Math.max(1, params.page), totalPages)
  const items = sorted.slice((safePage - 1) * params.pageSize, safePage * params.pageSize)

  return {
    items,
    total: sorted.length,
    totalPages,
    page: safePage,
    summary: getSummary(source),
  }
}

export async function createTestScenario(input: CreateTestScenarioInput): Promise<TestScenario> {
  const auth = useAuthStore.getState()
  const user = auth.user
  const currentTeam = auth.currentTeam ?? auth.teams[0]

  if (!user || !currentTeam) {
    throw new Error('현재 로그인 사용자 또는 팀 정보가 없습니다.')
  }

  const assigneeId = await resolveTeamMemberIdByName(currentTeam.id, input.assignee)

  const payload: ApiCreateTestScenarioRequest = {
    title: input.title,
    type: input.type,
    priority: input.priority,
    status: '작성중',
    teamId: currentTeam.id,
    assigneeId,
    steps: '[]',
    deadline: input.deadline,
    createdBy: user.id,
  }

  const { data } = await api.post<ApiCreateTestScenarioResponse>('/test-scenarios', payload)

  const relatedRefs = toRelatedRefsPayload(input.relatedDoc ? [input.relatedDoc] : [])
  if (relatedRefs.length > 0) {
    await api.put(`/test-scenarios/${data.id}/related-refs`, { items: relatedRefs })
  }

  const detail = await api.get<ApiTestScenarioDetailResponse>(`/test-scenarios/${data.id}`)

  return {
    id: String(detail.data.id),
    docNo: detail.data.scenarioNo,
    title: detail.data.title,
    type: detail.data.type,
    priority: detail.data.priority,
    status: detail.data.status,
    assignee: mapUserLabel(detail.data.assigneeId, '미배정'),
    relatedDoc: input.relatedDoc ?? '-',
    deadline: toDateOnly(detail.data.deadline),
  }
}

export async function listTestScenarioRelatedRefs(id: string | number): Promise<TestScenarioRelatedRef[]> {
  const { data } = await api.get<ApiTestScenarioRelatedRefResponse[]>(`/test-scenarios/${id}/related-refs`)
  return data.map((item) => ({
    refType: item.refType,
    refId: item.refId,
    refNo: item.refNo?.trim() || toFallbackDocNo(item.refType, item.refId),
    title: item.title,
  }))
}

export async function getTestScenario(id: string | number): Promise<TestScenarioDetail> {
  const { data } = await api.get<ApiTestScenarioDetailResponse>(`/test-scenarios/${id}`)

  return {
    id: String(data.id),
    docNo: data.scenarioNo,
    title: data.title,
    type: data.type,
    priority: data.priority,
    status: data.status,
    assignee: mapUserLabel(data.assigneeId, '미배정'),
    precondition: data.precondition ?? '',
    steps: data.steps ?? '[]',
    expectedResult: data.expectedResult ?? '',
    actualResult: data.actualResult ?? '',
    statusNote: data.statusNote ?? undefined,
    deadline: toDateOnly(data.deadline),
  }
}

export async function updateTestScenario(input: UpdateTestScenarioInput): Promise<void> {
  const auth = useAuthStore.getState()
  const currentTeam = auth.currentTeam ?? auth.teams[0]
  if (!currentTeam) {
    throw new Error('현재 선택된 팀 정보가 없습니다.')
  }

  const assigneeId = await resolveTeamMemberIdByName(currentTeam.id, input.assignee)

  const payload: ApiUpdateTestScenarioRequest = {
    title: input.title,
    description: null,
    type: input.type,
    priority: input.priority,
    status: input.status,
    assigneeId,
    precondition: input.precondition ?? '',
    steps: input.steps,
    expectedResult: input.expectedResult,
    actualResult: input.actualResult,
    statusNote: input.statusNote?.trim() ? input.statusNote : null,
    deadline: input.deadline,
  }

  await api.put(`/test-scenarios/${input.id}`, payload)

  const relatedRefs = toRelatedRefsPayload(input.relatedDoc ? [input.relatedDoc] : [])
  await api.put(`/test-scenarios/${input.id}/related-refs`, { items: relatedRefs })
}

export async function updateTestScenarioStatus(id: string | number, status: TestStatus, statusNote?: string): Promise<void> {
  const payload: ApiUpdateTestScenarioStatusRequest = { status, statusNote }
  await api.patch(`/test-scenarios/${id}/status`, payload)
}

export async function deleteTestScenario(id: string | number): Promise<void> {
  await api.delete(`/test-scenarios/${id}`)
}
