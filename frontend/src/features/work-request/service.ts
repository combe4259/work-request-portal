import type { Priority, RequestType, Status, WorkRequest } from '@/types/work-request'

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
}

let workRequestsStore: WorkRequest[] = [
  { id: '1',  docNo: 'WR-051', title: '모바일 PDA 화면 레이아웃 개선 요청',     type: '기능개선', priority: '높음', status: '개발중',   assignee: '김개발',   deadline: '2026-02-25' },
  { id: '2',  docNo: 'WR-050', title: '신규 계좌 개설 프로세스 자동화',         type: '신규개발', priority: '긴급', status: '검토중',   assignee: '이설계',   deadline: '2026-02-22' },
  { id: '3',  docNo: 'WR-049', title: '잔고 조회 API 응답 지연 버그 수정',      type: '버그수정', priority: '긴급', status: '테스트중', assignee: '박테스터', deadline: '2026-02-21' },
  { id: '4',  docNo: 'WR-048', title: 'AWS S3 스토리지 용량 확장',            type: '인프라',   priority: '보통', status: '완료',    assignee: '최인프라', deadline: '2026-02-18' },
  { id: '5',  docNo: 'WR-047', title: '로그인 세션 만료 시간 정책 변경',        type: '기능개선', priority: '낮음', status: '접수대기', assignee: '미배정',   deadline: '2026-03-05' },
  { id: '6',  docNo: 'WR-046', title: '주문 내역 엑셀 다운로드 기능 추가',      type: '신규개발', priority: '보통', status: '개발중',   assignee: '김개발',   deadline: '2026-02-28' },
  { id: '7',  docNo: 'WR-045', title: '고객 알림 푸시 발송 로직 개선',          type: '기능개선', priority: '높음', status: '검토중',   assignee: '이설계',   deadline: '2026-03-03' },
  { id: '8',  docNo: 'WR-044', title: '배포 파이프라인 CI/CD 구성',            type: '인프라',   priority: '보통', status: '완료',    assignee: '최인프라', deadline: '2026-02-14' },
  { id: '9',  docNo: 'WR-043', title: '결제 모듈 PG사 연동 오류 수정',         type: '버그수정', priority: '긴급', status: '완료',    assignee: '박테스터', deadline: '2026-02-12' },
  { id: '10', docNo: 'WR-042', title: '관리자 대시보드 권한 분리',             type: '신규개발', priority: '보통', status: '개발중',   assignee: '김개발',   deadline: '2026-03-10' },
  { id: '11', docNo: 'WR-041', title: '거래 내역 조회 페이지 성능 개선',        type: '기능개선', priority: '높음', status: '접수대기', assignee: '미배정',   deadline: '2026-03-07' },
  { id: '12', docNo: 'WR-040', title: '사용자 비밀번호 재설정 이메일 발송 오류', type: '버그수정', priority: '보통', status: '반려',    assignee: '박테스터', deadline: '2026-02-10' },
]

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function listWorkRequests(params: WorkRequestListParams): Promise<WorkRequestListResult> {
  await delay(180)

  const filtered = workRequestsStore.filter((r) => {
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
  const maxNo = workRequestsStore.reduce((max, item) => {
    const n = Number(item.docNo.replace('WR-', ''))
    return Number.isFinite(n) ? Math.max(max, n) : max
  }, 0)
  return `WR-${String(maxNo + 1).padStart(3, '0')}`
}

export async function createWorkRequest(input: CreateWorkRequestInput): Promise<WorkRequest> {
  await delay(220)

  const next: WorkRequest = {
    id: String(Date.now()),
    docNo: getNextDocNo(),
    title: input.title,
    type: input.type,
    priority: input.priority,
    status: '접수대기',
    assignee: input.assignee?.trim() ? input.assignee : '미배정',
    deadline: input.deadline,
  }

  workRequestsStore = [next, ...workRequestsStore]
  return next
}
