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
}

const PRIORITY_ORDER: Record<string, number> = { '긴급': 0, '높음': 1, '보통': 2, '낮음': 3 }
const STATUS_ORDER: Record<string, number> = { '실행중': 0, '검토중': 1, '승인됨': 2, '실패': 3, '작성중': 4, '통과': 5, '보류': 6 }

let testScenariosStore: TestScenario[] = [
  { id: '1', docNo: 'TS-018', title: '모바일 PDA 레이아웃 반응형 검증', type: '기능', priority: '높음', status: '실행중', assignee: '박테스터', relatedDoc: 'WR-051', deadline: '2026-02-26' },
  { id: '2', docNo: 'TS-017', title: '계좌 개설 프로세스 E2E 흐름 검증', type: 'E2E', priority: '긴급', status: '승인됨', assignee: '박테스터', relatedDoc: 'WR-050', deadline: '2026-02-24' },
  { id: '3', docNo: 'TS-016', title: '잔고 조회 API 응답시간 회귀 테스트', type: '회귀', priority: '긴급', status: '통과', assignee: '박테스터', relatedDoc: 'WR-049', deadline: '2026-02-20' },
  { id: '4', docNo: 'TS-015', title: 'S3 파일 업로드/다운로드 통합 테스트', type: '통합', priority: '보통', status: '통과', assignee: '최인프라', relatedDoc: 'WR-048', deadline: '2026-02-17' },
  { id: '5', docNo: 'TS-014', title: '로그인 세션 만료 기능 검증', type: '기능', priority: '낮음', status: '작성중', assignee: '미배정', relatedDoc: 'WR-047', deadline: '2026-03-03' },
  { id: '6', docNo: 'TS-013', title: '엑셀 다운로드 데이터 정합성 검증', type: '기능', priority: '보통', status: '검토중', assignee: '박테스터', relatedDoc: 'WR-046', deadline: '2026-02-27' },
  { id: '7', docNo: 'TS-012', title: 'JWT 토큰 보안 취약점 침투 테스트', type: '보안', priority: '긴급', status: '통과', assignee: '박테스터', relatedDoc: 'TK-019', deadline: '2026-02-17' },
  { id: '8', docNo: 'TS-011', title: '잔고 조회 N+1 쿼리 성능 검증', type: '성능', priority: '높음', status: '실행중', assignee: '이설계', relatedDoc: 'TK-020', deadline: '2026-02-27' },
  { id: '9', docNo: 'TS-010', title: '결제 모듈 PG 연동 오류 회귀 테스트', type: '회귀', priority: '긴급', status: '실패', assignee: '박테스터', relatedDoc: 'WR-043', deadline: '2026-02-21' },
  { id: '10', docNo: 'TS-009', title: '관리자 권한 분리 E2E 시나리오', type: 'E2E', priority: '보통', status: '작성중', assignee: '미배정', relatedDoc: 'WR-042', deadline: '2026-03-08' },
  { id: '11', docNo: 'TS-008', title: 'SQL Injection 방어 보안 점검', type: '보안', priority: '긴급', status: '통과', assignee: '박테스터', relatedDoc: 'TK-014', deadline: '2026-02-09' },
  { id: '12', docNo: 'TS-007', title: '거래 내역 조회 대용량 성능 테스트', type: '성능', priority: '높음', status: '보류', assignee: '이설계', relatedDoc: 'WR-041', deadline: '2026-03-06' },
]

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
  await delay(180)

  const filtered = testScenariosStore.filter((r) => {
    const matchSearch = params.search === '' || r.title.includes(params.search) || r.docNo.includes(params.search)
    const matchType = params.filterType === '전체' || r.type === params.filterType
    const matchPriority = params.filterPriority === '전체' || r.priority === params.filterPriority
    const matchStatus = params.filterStatus === '전체' || r.status === params.filterStatus
    return matchSearch && matchType && matchPriority && matchStatus
  })

  const sorted = [...filtered].sort((a, b) => {
    const v = params.sortDir === 'asc' ? 1 : -1
    if (params.sortKey === 'docNo') return a.docNo > b.docNo ? v : -v
    if (params.sortKey === 'priority') return ((PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)) * v
    if (params.sortKey === 'status') return ((STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)) * v
    return a.deadline > b.deadline ? v : -v
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / params.pageSize))
  const safePage = Math.min(Math.max(1, params.page), totalPages)
  const items = sorted.slice((safePage - 1) * params.pageSize, safePage * params.pageSize)

  return {
    items,
    total: sorted.length,
    totalPages,
    page: safePage,
    summary: getSummary(testScenariosStore),
  }
}

function getNextDocNo() {
  const maxNo = testScenariosStore.reduce((max, item) => {
    const n = Number(item.docNo.replace('TS-', ''))
    return Number.isFinite(n) ? Math.max(max, n) : max
  }, 0)
  return `TS-${String(maxNo + 1).padStart(3, '0')}`
}

export async function createTestScenario(input: CreateTestScenarioInput): Promise<TestScenario> {
  await delay(220)

  const next: TestScenario = {
    id: String(Date.now()),
    docNo: getNextDocNo(),
    title: input.title,
    type: input.type,
    priority: input.priority,
    status: '작성중',
    assignee: input.assignee?.trim() ? input.assignee : '미배정',
    relatedDoc: '-',
    deadline: input.deadline,
  }

  testScenariosStore = [next, ...testScenariosStore]
  return next
}
