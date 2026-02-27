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
  filterAssigneeId: number | null
  deadlineFrom?: string
  deadlineTo?: string
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
  precondition?: string
  steps?: string
  expectedResult?: string
  actualResult?: string
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
  createdAt: string
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

export type TestScenarioExecutionResult = 'PASS' | 'FAIL' | 'SKIP'

export interface UpdateTestScenarioExecutionInput {
  stepResults: TestScenarioExecutionResult[]
  actualResult?: string
  executedAt?: string
}

interface ApiPageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
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
  createdAt: string | null
}

interface ApiCreateTestScenarioRequest {
  title: string
  description?: string | null
  type: TestScenarioType
  priority: Priority
  status: TestStatus
  teamId: number
  assigneeId: number | null
  precondition?: string
  steps: string
  expectedResult?: string
  actualResult?: string
  deadline: string
  executedAt?: string | null
  statusNote?: string | null
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

interface ApiUpdateTestScenarioExecutionRequest {
  stepResults: TestScenarioExecutionResult[]
  actualResult?: string
  executedAt?: string
}

interface ApiTestScenarioRelatedRefResponse {
  refType: string
  refId: number
  refNo: string | null
  title: string | null
}

const SUMMARY_FETCH_SIZE = 500

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

function toDateTime(value: string | null | undefined): string {
  return value?.replace('T', ' ').slice(0, 16) ?? ''
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
  const requestedPage = Math.max(0, params.page - 1)
  const sortBy = params.sortKey === 'docNo' ? 'docNo' : params.sortKey

  const [listResponse, summaryResponse] = await Promise.all([
    api.get<ApiPageResponse<ApiTestScenarioListItem>>('/test-scenarios', {
      params: {
        q: params.search.trim() || undefined,
        type: params.filterType === '전체' ? undefined : params.filterType,
        priority: params.filterPriority === '전체' ? undefined : params.filterPriority,
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
    api.get<ApiPageResponse<ApiTestScenarioListItem>>('/test-scenarios', {
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
    precondition: input.precondition?.trim() ? input.precondition : undefined,
    steps: input.steps ?? '[]',
    expectedResult: input.expectedResult ?? '',
    actualResult: input.actualResult ?? '',
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
    createdAt: toDateTime(data.createdAt),
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

export async function updateTestScenarioExecution(
  id: string | number,
  input: UpdateTestScenarioExecutionInput,
): Promise<void> {
  const payload: ApiUpdateTestScenarioExecutionRequest = {
    stepResults: input.stepResults,
    actualResult: input.actualResult,
    executedAt: input.executedAt,
  }
  await api.patch(`/test-scenarios/${id}/execution`, payload)
}

export async function deleteTestScenario(id: string | number): Promise<void> {
  await api.delete(`/test-scenarios/${id}`)
}
