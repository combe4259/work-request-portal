import type { Defect, DefectStatus, DefectType, Severity } from '@/types/defect'

export type DefectSortKey = 'docNo' | 'deadline' | 'severity' | 'status'
export type DefectSortDir = 'asc' | 'desc'

export interface DefectListParams {
  search: string
  filterType: DefectType | '전체'
  filterSeverity: Severity | '전체'
  filterStatus: DefectStatus | '전체'
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
}

const SEVERITY_ORDER: Record<Severity, number> = { '치명적': 0, '높음': 1, '보통': 2, '낮음': 3 }
const STATUS_ORDER: Record<string, number> = { '분석중': 0, '수정중': 1, '검증중': 2, '접수': 3, '재현불가': 4, '보류': 5, '완료': 6 }

let defectsStore: Defect[] = [
  { id: '1', docNo: 'DF-034', title: 'Galaxy S23에서 메인 메뉴 버튼 화면 밖 이탈', type: 'UI', severity: '높음', status: '수정중', reporter: '박테스터', assignee: '김개발', relatedDoc: 'TS-018', deadline: '2026-02-25' },
  { id: '2', docNo: 'DF-033', title: '계좌 개설 4단계 이후 세션 강제 만료 현상', type: '기능', severity: '치명적', status: '분석중', reporter: '박테스터', assignee: '이설계', relatedDoc: 'TS-017', deadline: '2026-02-23' },
  { id: '3', docNo: 'DF-032', title: '잔고 조회 API P99 응답시간 기준 초과 (3.2s)', type: '성능', severity: '높음', status: '수정중', reporter: '이설계', assignee: '이설계', relatedDoc: 'TS-011', deadline: '2026-02-26' },
  { id: '4', docNo: 'DF-031', title: 'JWT refresh token 탈취 가능 취약점', type: '보안', severity: '치명적', status: '완료', reporter: '박테스터', assignee: '박테스터', relatedDoc: 'TS-012', deadline: '2026-02-17' },
  { id: '5', docNo: 'DF-030', title: '로그인 세션 만료 후 이전 페이지 캐시 노출', type: '보안', severity: '보통', status: '검증중', reporter: '박테스터', assignee: '김개발', relatedDoc: 'TS-014', deadline: '2026-03-01' },
  { id: '6', docNo: 'DF-029', title: '엑셀 다운로드 시 일부 특수문자 깨짐 현상', type: '데이터', severity: '보통', status: '수정중', reporter: '박테스터', assignee: '김개발', relatedDoc: 'TS-013', deadline: '2026-02-27' },
  { id: '7', docNo: 'DF-028', title: '결제 완료 후 잔고 즉시 반영 안 됨 (2~5초 지연)', type: '기능', severity: '높음', status: '완료', reporter: '박테스터', assignee: '이설계', relatedDoc: 'TS-010', deadline: '2026-02-11' },
  { id: '8', docNo: 'DF-027', title: '관리자 메뉴 일반 사용자 접근 가능 (권한 누락)', type: '보안', severity: '치명적', status: '접수', reporter: '박테스터', assignee: '미배정', relatedDoc: 'TS-009', deadline: '2026-03-05' },
  { id: '9', docNo: 'DF-026', title: '거래 내역 1만 건 이상 조회 시 타임아웃', type: '성능', severity: '높음', status: '보류', reporter: '이설계', assignee: '미배정', relatedDoc: 'TS-007', deadline: '2026-03-10' },
  { id: '10', docNo: 'DF-025', title: 'iOS Safari에서 날짜 선택 UI 렌더링 오류', type: 'UI', severity: '낮음', status: '재현불가', reporter: '박테스터', assignee: '김개발', relatedDoc: 'TS-018', deadline: '2026-02-28' },
  { id: '11', docNo: 'DF-024', title: 'S3 업로드 파일명 한글 포함 시 인코딩 오류', type: '데이터', severity: '보통', status: '완료', reporter: '최인프라', assignee: '최인프라', relatedDoc: 'TS-015', deadline: '2026-02-16' },
  { id: '12', docNo: 'DF-023', title: '푸시 알림 수신 후 앱 재시작 시 중복 표시', type: '기능', severity: '낮음', status: '접수', reporter: '박테스터', assignee: '미배정', relatedDoc: 'WR-045', deadline: '2026-03-07' },
]

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
  await delay(180)

  const filtered = defectsStore.filter((r) => {
    const matchSearch = params.search === '' || r.title.includes(params.search) || r.docNo.includes(params.search)
    const matchType = params.filterType === '전체' || r.type === params.filterType
    const matchSeverity = params.filterSeverity === '전체' || r.severity === params.filterSeverity
    const matchStatus = params.filterStatus === '전체' || r.status === params.filterStatus
    return matchSearch && matchType && matchSeverity && matchStatus
  })

  const sorted = [...filtered].sort((a, b) => {
    const v = params.sortDir === 'asc' ? 1 : -1
    if (params.sortKey === 'severity') return (SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]) * v
    if (params.sortKey === 'status') return ((STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)) * v
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
    summary: getSummary(defectsStore),
  }
}

function getNextDocNo() {
  const maxNo = defectsStore.reduce((max, item) => {
    const n = Number(item.docNo.replace('DF-', ''))
    return Number.isFinite(n) ? Math.max(max, n) : max
  }, 0)
  return `DF-${String(maxNo + 1).padStart(3, '0')}`
}

export async function createDefect(input: CreateDefectInput): Promise<Defect> {
  await delay(220)

  const next: Defect = {
    id: String(Date.now()),
    docNo: getNextDocNo(),
    title: input.title,
    type: input.type,
    severity: input.severity,
    status: '접수',
    reporter: '나',
    assignee: input.assignee?.trim() ? input.assignee : '미배정',
    relatedDoc: '-',
    deadline: input.deadline,
  }

  defectsStore = [next, ...defectsStore]
  return next
}
