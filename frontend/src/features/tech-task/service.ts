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

export interface CreateTechTaskInput {
  title: string
  type: TechTaskType
  priority: Priority
  deadline: string
  assignee?: string
}

let techTasksStore: TechTask[] = [
  { id: '1',  docNo: 'TK-021', title: '계좌 조회 서비스 레이어 리팩토링',      type: '리팩토링', priority: '보통', status: '개발중',   assignee: '김개발',   deadline: '2026-03-07' },
  { id: '2',  docNo: 'TK-020', title: 'N+1 쿼리 문제 해결 — 잔고 조회 API',  type: '성능개선', priority: '높음', status: '검토중',   assignee: '이설계',   deadline: '2026-02-28' },
  { id: '3',  docNo: 'TK-019', title: 'JWT 토큰 갱신 로직 보안 취약점 패치',  type: '보안',     priority: '긴급', status: '완료',    assignee: '박테스터', deadline: '2026-02-18' },
  { id: '4',  docNo: 'TK-018', title: '레거시 XML 파서 → JSON 파서 전환',    type: '기술부채', priority: '낮음', status: '접수대기', assignee: '미배정',   deadline: '2026-04-01' },
  { id: '5',  docNo: 'TK-017', title: '결제 모듈 단위 테스트 커버리지 80% 달성', type: '테스트', priority: '보통', status: '개발중', assignee: '박테스터', deadline: '2026-03-14' },
  { id: '6',  docNo: 'TK-016', title: 'Redis 캐시 TTL 정책 재설계',          type: '성능개선', priority: '보통', status: '검토중',   assignee: '최인프라', deadline: '2026-03-05' },
  { id: '7',  docNo: 'TK-015', title: '공통 에러 핸들러 모듈화',            type: '리팩토링', priority: '낮음', status: '완료',    assignee: '김개발',   deadline: '2026-02-14' },
  { id: '8',  docNo: 'TK-014', title: 'SQL Injection 방어 로직 전수 점검',   type: '보안',     priority: '긴급', status: '완료',    assignee: '박테스터', deadline: '2026-02-10' },
  { id: '9',  docNo: 'TK-013', title: 'API 응답 DTO 불필요 필드 정리',       type: '기술부채', priority: '낮음', status: '접수대기', assignee: '미배정',   deadline: '2026-04-15' },
  { id: '10', docNo: 'TK-012', title: '배치 스케줄러 성능 최적화',           type: '성능개선', priority: '높음', status: '개발중',   assignee: '이설계',   deadline: '2026-02-26' },
]

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function listTechTasks(params: TechTaskListParams): Promise<TechTaskListResult> {
  await delay(180)

  const filtered = techTasksStore.filter((r) => {
    const matchSearch = params.search === '' || r.title.includes(params.search) || r.docNo.includes(params.search)
    const matchType = params.filterType === '전체' || r.type === params.filterType
    const matchPriority = params.filterPriority === '전체' || r.priority === params.filterPriority
    const matchStatus = params.filterStatus === '전체' || r.status === params.filterStatus
    return matchSearch && matchType && matchPriority && matchStatus
  })

  const sorted = [...filtered].sort((a, b) => {
    const v = params.sortDir === 'asc' ? 1 : -1
    if (params.sortKey === 'docNo') return a.docNo > b.docNo ? v : -v
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
  }
}

function getNextDocNo() {
  const maxNo = techTasksStore.reduce((max, item) => {
    const n = Number(item.docNo.replace('TK-', ''))
    return Number.isFinite(n) ? Math.max(max, n) : max
  }, 0)
  return `TK-${String(maxNo + 1).padStart(3, '0')}`
}

export async function createTechTask(input: CreateTechTaskInput): Promise<TechTask> {
  await delay(220)

  const next: TechTask = {
    id: String(Date.now()),
    docNo: getNextDocNo(),
    title: input.title,
    type: input.type,
    priority: input.priority,
    status: '접수대기',
    assignee: input.assignee?.trim() ? input.assignee : '미배정',
    deadline: input.deadline,
  }

  techTasksStore = [next, ...techTasksStore]
  return next
}
