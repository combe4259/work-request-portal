import api from '@/lib/api'
import { toRelatedRefsPayload } from '@/lib/relatedRefs'
import { useAuthStore } from '@/stores/authStore'
import { resolveTeamMemberIdByName } from '@/features/auth/memberResolver'
import type { Deployment, DeployEnv, DeployStatus, DeployType } from '@/types/deployment'

export type DeploymentSortKey = 'docNo' | 'deployDate' | 'status'
export type DeploymentSortDir = 'asc' | 'desc'

export interface DeploymentListParams {
  search: string
  filterType: DeployType | '전체'
  filterEnv: DeployEnv | '전체'
  filterStatus: DeployStatus | '전체'
  sortKey: DeploymentSortKey
  sortDir: DeploymentSortDir
  page: number
  pageSize: number
}

export interface DeploymentSummary {
  upcomingCount: number
  inProgressCount: number
  prodCount: number
  failCount: number
}

export interface DeploymentListResult {
  items: Deployment[]
  total: number
  totalPages: number
  page: number
  summary: DeploymentSummary
}

export interface CreateDeploymentInput {
  title: string
  version: string
  type: DeployType
  env: DeployEnv
  deployDate: string
  manager?: string
  overview?: string
  rollback?: string
  includedDocs: string[]
  steps: string[]
}

export interface DeploymentRelatedRef {
  refType: string
  refId: number
  refNo: string
  title: string | null
}

export interface DeploymentStep {
  id: number
  stepOrder: number
  content: string
  isDone: boolean
}

export interface DeploymentDetail {
  id: string
  docNo: string
  title: string
  version: string
  type: DeployType
  env: DeployEnv
  status: DeployStatus
  manager: string
  deployDate: string
  overview: string
  rollbackPlan: string
  createdAt: string
}

export interface UpdateDeploymentInput {
  id: string | number
  title: string
  version: string
  type: DeployType
  env: DeployEnv
  status: DeployStatus
  deployDate: string
  manager?: string
  overview?: string
  rollback?: string
  includedDocs: string[]
  steps: string[]
}

interface ApiPageResponse<T> {
  content: T[]
}

interface ApiDeploymentListItem {
  id: number
  deployNo: string
  title: string
  version: string
  type: DeployType
  environment: DeployEnv
  status: DeployStatus
  managerId: number | null
  scheduledAt: string | null
}

interface ApiDeploymentDetailResponse {
  id: number
  deployNo: string
  title: string
  version: string
  type: DeployType
  environment: DeployEnv
  status: DeployStatus
  managerId: number | null
  scheduledAt: string | null
  overview: string | null
  rollbackPlan: string | null
  createdAt: string | null
}

interface ApiCreateDeploymentRequest {
  title: string
  overview?: string
  rollbackPlan?: string
  version: string
  type: DeployType
  environment: DeployEnv
  status: DeployStatus
  teamId: number
  managerId: number | null
  scheduledAt: string
  relatedRefs?: Array<{
    refType: string
    refId: number
    sortOrder: number
  }>
  steps?: string[]
}

interface ApiCreateDeploymentResponse {
  id: number
}

interface ApiDeploymentStepResponse {
  id: number
  stepOrder: number
  content: string
  isDone: boolean
}

interface ApiUpdateDeploymentRequest {
  title?: string
  overview?: string | null
  rollbackPlan?: string | null
  version?: string
  type?: DeployType
  environment?: DeployEnv
  status?: DeployStatus
  managerId?: number | null
  scheduledAt?: string
  relatedRefs?: Array<{
    refType: string
    refId: number
    sortOrder: number
  }>
  steps?: string[]
}

interface ApiUpdateDeploymentStatusRequest {
  status: DeployStatus
  statusNote?: string
}

interface ApiDeploymentRelatedRefResponse {
  refType: string
  refId: number
  refNo: string | null
  title: string | null
}

const STATUS_ORDER: Record<string, number> = {
  진행중: 0,
  대기: 1,
  완료: 2,
  실패: 3,
  롤백: 4,
}

const LIST_FETCH_SIZE = 500
const ONE_DAY_MS = 24 * 60 * 60 * 1000

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

function startOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function mapListItem(item: ApiDeploymentListItem): Deployment {
  return {
    id: String(item.id),
    docNo: item.deployNo,
    title: item.title,
    version: item.version,
    type: item.type,
    env: item.environment,
    status: item.status,
    manager: mapUserLabel(item.managerId, '미배정'),
    deployDate: toDateOnly(item.scheduledAt),
  }
}

function getSummary(source: Deployment[]): DeploymentSummary {
  const today = startOfDay(new Date())
  const sevenDaysLater = new Date(today.getTime() + 7 * ONE_DAY_MS)

  const upcomingCount = source.filter((r) => {
    if (r.status !== '대기' || !r.deployDate) {
      return false
    }
    const target = startOfDay(new Date(r.deployDate))
    return target >= today && target <= sevenDaysLater
  }).length

  return {
    upcomingCount,
    inProgressCount: source.filter((r) => r.status === '진행중').length,
    prodCount: source.filter((r) => r.env === '운영' && r.status === '완료').length,
    failCount: source.filter((r) => r.status === '실패' || r.status === '롤백').length,
  }
}

export async function listDeployments(params: DeploymentListParams): Promise<DeploymentListResult> {
  const { data } = await api.get<ApiPageResponse<ApiDeploymentListItem>>('/deployments', {
    params: { page: 0, size: LIST_FETCH_SIZE },
  })

  const source = data.content.map(mapListItem)

  const filtered = source.filter((item) => {
    const keyword = params.search.trim()
    const matchSearch = keyword.length === 0
      || item.title.includes(keyword)
      || item.docNo.includes(keyword)
      || item.version.includes(keyword)
    const matchType = params.filterType === '전체' || item.type === params.filterType
    const matchEnv = params.filterEnv === '전체' || item.env === params.filterEnv
    const matchStatus = params.filterStatus === '전체' || item.status === params.filterStatus
    return matchSearch && matchType && matchEnv && matchStatus
  })

  const sorted = [...filtered].sort((a, b) => {
    const sortFactor = params.sortDir === 'asc' ? 1 : -1
    if (params.sortKey === 'docNo') {
      return a.docNo.localeCompare(b.docNo, 'ko-KR', { numeric: true }) * sortFactor
    }
    if (params.sortKey === 'status') {
      return ((STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)) * sortFactor
    }

    const aDate = a.deployDate ? new Date(a.deployDate).getTime() : Number.MAX_SAFE_INTEGER
    const bDate = b.deployDate ? new Date(b.deployDate).getTime() : Number.MAX_SAFE_INTEGER
    return (aDate - bDate) * sortFactor
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
    summary: getSummary(source),
  }
}

export async function createDeployment(input: CreateDeploymentInput): Promise<Deployment> {
  const auth = useAuthStore.getState()
  const user = auth.user
  const currentTeam = auth.currentTeam ?? auth.teams[0]

  if (!user || !currentTeam) {
    throw new Error('현재 로그인 사용자 또는 팀 정보가 없습니다.')
  }

  const relatedRefs = toRelatedRefsPayload(input.includedDocs)

  const managerId = await resolveTeamMemberIdByName(currentTeam.id, input.manager)

  const payload: ApiCreateDeploymentRequest = {
    title: input.title,
    overview: input.overview?.trim() ? input.overview : undefined,
    rollbackPlan: input.rollback?.trim() ? input.rollback : undefined,
    version: input.version,
    type: input.type,
    environment: input.env,
    status: '대기',
    teamId: currentTeam.id,
    managerId,
    scheduledAt: input.deployDate,
    relatedRefs: relatedRefs.length > 0 ? relatedRefs : undefined,
    steps: input.steps.filter((step) => step.trim().length > 0),
  }

  const { data } = await api.post<ApiCreateDeploymentResponse>('/deployments', payload)
  const detail = await api.get<ApiDeploymentDetailResponse>(`/deployments/${data.id}`)

  return {
    id: String(detail.data.id),
    docNo: detail.data.deployNo,
    title: detail.data.title,
    version: detail.data.version,
    type: detail.data.type,
    env: detail.data.environment,
    status: detail.data.status,
    manager: mapUserLabel(detail.data.managerId, '미배정'),
    deployDate: toDateOnly(detail.data.scheduledAt),
  }
}

export async function listDeploymentRelatedRefs(id: string | number): Promise<DeploymentRelatedRef[]> {
  const { data } = await api.get<ApiDeploymentRelatedRefResponse[]>(`/deployments/${id}/related-refs`)
  return data.map((item) => ({
    refType: item.refType,
    refId: item.refId,
    refNo: item.refNo?.trim() || toFallbackDocNo(item.refType, item.refId),
    title: item.title,
  }))
}

export async function getDeployment(id: string | number): Promise<DeploymentDetail> {
  const { data } = await api.get<ApiDeploymentDetailResponse>(`/deployments/${id}`)
  return {
    id: String(data.id),
    docNo: data.deployNo,
    title: data.title,
    version: data.version,
    type: data.type,
    env: data.environment,
    status: data.status,
    manager: mapUserLabel(data.managerId, '미배정'),
    deployDate: toDateOnly(data.scheduledAt),
    overview: data.overview ?? '',
    rollbackPlan: data.rollbackPlan ?? '',
    createdAt: toDateTime(data.createdAt),
  }
}

export async function listDeploymentSteps(id: string | number): Promise<DeploymentStep[]> {
  const { data } = await api.get<ApiDeploymentStepResponse[]>(`/deployments/${id}/steps`)
  return data.map((item) => ({
    id: item.id,
    stepOrder: item.stepOrder,
    content: item.content,
    isDone: item.isDone,
  }))
}

export async function updateDeployment(input: UpdateDeploymentInput): Promise<void> {
  const auth = useAuthStore.getState()
  const currentTeam = auth.currentTeam ?? auth.teams[0]
  if (!currentTeam) {
    throw new Error('현재 선택된 팀 정보가 없습니다.')
  }

  const managerId = await resolveTeamMemberIdByName(currentTeam.id, input.manager)
  const relatedRefs = toRelatedRefsPayload(input.includedDocs)

  const payload: ApiUpdateDeploymentRequest = {
    title: input.title,
    overview: input.overview?.trim() ? input.overview : null,
    rollbackPlan: input.rollback?.trim() ? input.rollback : null,
    version: input.version,
    type: input.type,
    environment: input.env,
    status: input.status,
    managerId,
    scheduledAt: input.deployDate,
    relatedRefs,
    steps: input.steps.filter((step) => step.trim().length > 0),
  }

  await api.put(`/deployments/${input.id}`, payload)
}

export async function updateDeploymentStatus(id: string | number, status: DeployStatus, statusNote?: string): Promise<void> {
  const payload: ApiUpdateDeploymentStatusRequest = { status, statusNote }
  await api.patch(`/deployments/${id}/status`, payload)
}

export async function updateDeploymentStep(
  id: string | number,
  stepId: string | number,
  isDone: boolean,
): Promise<void> {
  await api.patch(`/deployments/${id}/steps/${stepId}`, { isDone })
}

export async function deleteDeployment(id: string | number): Promise<void> {
  await api.delete(`/deployments/${id}`)
}
