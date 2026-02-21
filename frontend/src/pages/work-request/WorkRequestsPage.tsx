import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TypeBadge, PriorityBadge, StatusBadge } from '@/components/work-request/Badges'
import type { WorkRequest, RequestType, Priority, Status } from '@/types/work-request'

// ── 샘플 데이터 ───────────────────────────────────────
const SAMPLE_DATA: WorkRequest[] = [
  { id: '1',  docNo: 'WR-051', title: '모바일 PDA 화면 레이아웃 개선 요청',        type: '기능개선', priority: '높음', status: '개발중',   assignee: '김개발', deadline: '2026-02-25' },
  { id: '2',  docNo: 'WR-050', title: '신규 계좌 개설 프로세스 자동화',            type: '신규개발', priority: '긴급', status: '검토중',   assignee: '이설계', deadline: '2026-02-22' },
  { id: '3',  docNo: 'WR-049', title: '잔고 조회 API 응답 지연 버그 수정',         type: '버그수정', priority: '긴급', status: '테스트중', assignee: '박테스터', deadline: '2026-02-21' },
  { id: '4',  docNo: 'WR-048', title: 'AWS S3 스토리지 용량 확장',               type: '인프라',   priority: '보통', status: '완료',    assignee: '최인프라', deadline: '2026-02-18' },
  { id: '5',  docNo: 'WR-047', title: '로그인 세션 만료 시간 정책 변경',           type: '기능개선', priority: '낮음', status: '접수대기', assignee: '미배정',  deadline: '2026-03-05' },
  { id: '6',  docNo: 'WR-046', title: '주문 내역 엑셀 다운로드 기능 추가',         type: '신규개발', priority: '보통', status: '개발중',   assignee: '김개발', deadline: '2026-02-28' },
  { id: '7',  docNo: 'WR-045', title: '고객 알림 푸시 발송 로직 개선',             type: '기능개선', priority: '높음', status: '검토중',   assignee: '이설계', deadline: '2026-03-03' },
  { id: '8',  docNo: 'WR-044', title: '배포 파이프라인 CI/CD 구성',               type: '인프라',   priority: '보통', status: '완료',    assignee: '최인프라', deadline: '2026-02-14' },
  { id: '9',  docNo: 'WR-043', title: '결제 모듈 PG사 연동 오류 수정',            type: '버그수정', priority: '긴급', status: '완료',    assignee: '박테스터', deadline: '2026-02-12' },
  { id: '10', docNo: 'WR-042', title: '관리자 대시보드 권한 분리',                type: '신규개발', priority: '보통', status: '개발중',   assignee: '김개발', deadline: '2026-03-10' },
  { id: '11', docNo: 'WR-041', title: '거래 내역 조회 페이지 성능 개선',           type: '기능개선', priority: '높음', status: '접수대기', assignee: '미배정',  deadline: '2026-03-07' },
  { id: '12', docNo: 'WR-040', title: '사용자 비밀번호 재설정 이메일 발송 오류',    type: '버그수정', priority: '보통', status: '반려',    assignee: '박테스터', deadline: '2026-02-10' },
]

const PAGE_SIZE = 10

type SortKey = 'docNo' | 'deadline'
type SortDir = 'asc' | 'desc'

export default function WorkRequestsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<RequestType | '전체'>('전체')
  const [filterPriority, setFilterPriority] = useState<Priority | '전체'>('전체')
  const [filterStatus, setFilterStatus] = useState<Status | '전체'>('전체')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'docNo', dir: 'desc' })
  const [page, setPage] = useState(1)

  // 필터링
  const filtered = SAMPLE_DATA.filter((r) => {
    const matchSearch = search === '' || r.title.includes(search) || r.docNo.includes(search)
    const matchType = filterType === '전체' || r.type === filterType
    const matchPriority = filterPriority === '전체' || r.priority === filterPriority
    const matchStatus = filterStatus === '전체' || r.status === filterStatus
    return matchSearch && matchType && matchPriority && matchStatus
  })

  // 정렬
  const sorted = [...filtered].sort((a, b) => {
    const v = sort.dir === 'asc' ? 1 : -1
    if (sort.key === 'docNo') return a.docNo > b.docNo ? v : -v
    return a.deadline > b.deadline ? v : -v
  })

  // 페이지네이션
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSort = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }
    )
  }

  const resetFilters = () => {
    setSearch('')
    setFilterType('전체')
    setFilterPriority('전체')
    setFilterStatus('전체')
    setPage(1)
  }

  const isFiltered = search || filterType !== '전체' || filterPriority !== '전체' || filterStatus !== '전체'

  return (
    <div className="p-6 space-y-4">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-gray-900">업무요청</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">총 {filtered.length}건</p>
        </div>
        <button
          onClick={() => navigate('/work-requests/new')}
          className="flex items-center gap-1.5 h-8 px-3 bg-brand hover:bg-brand-hover text-white text-[13px] font-semibold rounded-lg transition-colors"
        >
          <PlusIcon />
          업무요청 등록
        </button>
      </div>

      {/* 필터 바 */}
      <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-4 py-3 flex items-center gap-3 flex-wrap">
        {/* 검색 */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
            <SearchIcon />
          </span>
          <input
            type="text"
            placeholder="제목 또는 문서번호 검색"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full h-8 pl-8 pr-3 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 bg-gray-50"
          />
        </div>

        {/* 유형 */}
        <FilterSelect
          value={filterType}
          onChange={(v) => { setFilterType(v as RequestType | '전체'); setPage(1) }}
          options={['전체', '기능개선', '신규개발', '버그수정', '인프라', '기타']}
          placeholder="유형"
        />

        {/* 우선순위 */}
        <FilterSelect
          value={filterPriority}
          onChange={(v) => { setFilterPriority(v as Priority | '전체'); setPage(1) }}
          options={['전체', '긴급', '높음', '보통', '낮음']}
          placeholder="우선순위"
        />

        {/* 상태 */}
        <FilterSelect
          value={filterStatus}
          onChange={(v) => { setFilterStatus(v as Status | '전체'); setPage(1) }}
          options={['전체', '접수대기', '검토중', '개발중', '테스트중', '완료', '반려']}
          placeholder="상태"
        />

        {/* 초기화 */}
        {isFiltered && (
          <button
            onClick={resetFilters}
            className="h-8 px-3 text-[12px] text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            초기화
          </button>
        )}
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_12px_rgba(30,58,138,0.07)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <SortTh label="문서번호" sortKey="docNo" current={sort} onSort={handleSort} />
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 tracking-wide">제목</th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">유형</th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">우선순위</th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">상태</th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">담당자</th>
                <SortTh label="마감일" sortKey="deadline" current={sort} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[13px] text-gray-400">
                    검색 결과가 없습니다
                  </td>
                </tr>
              ) : (
                paginated.map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => navigate(`/work-requests/${req.id}`)}
                    className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-400 whitespace-nowrap">
                      {req.docNo}
                    </td>
                    <td className="px-4 py-3 max-w-[260px]">
                      <span className="text-[13px] text-gray-800 font-medium truncate block group-hover:text-brand transition-colors">
                        {req.title}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap"><TypeBadge type={req.type} /></td>
                    <td className="px-3 py-3 whitespace-nowrap"><PriorityBadge priority={req.priority} /></td>
                    <td className="px-3 py-3 whitespace-nowrap"><StatusBadge status={req.status} /></td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-[12px] text-gray-600">{req.assignee}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <DeadlineCell date={req.deadline} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 px-4 py-3 border-t border-gray-100">
            <PageBtn disabled={page === 1} onClick={() => setPage(page - 1)}>
              <ChevronLeftIcon />
            </PageBtn>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-7 h-7 rounded-md text-[12px] font-medium transition-colors ${
                  p === page
                    ? 'bg-brand text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {p}
              </button>
            ))}
            <PageBtn disabled={page === totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRightIcon />
            </PageBtn>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 서브 컴포넌트 ─────────────────────────────────────

function FilterSelect({
  value, onChange, options, placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 px-2.5 pr-7 text-[12px] border border-gray-200 rounded-lg bg-gray-50 text-gray-600 focus:outline-none focus:border-brand appearance-none cursor-pointer"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%239CA3AF' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
    >
      {options.map((o) => (
        <option key={o} value={o}>{o === '전체' ? `${placeholder} 전체` : o}</option>
      ))}
    </select>
  )
}

function SortTh({
  label, sortKey, current, onSort,
}: {
  label: string
  sortKey: SortKey
  current: { key: SortKey; dir: SortDir }
  onSort: (k: SortKey) => void
}) {
  const active = current.key === sortKey
  return (
    <th
      className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-gray-600 transition-colors"
      onClick={() => onSort(sortKey)}
    >
      <span className="flex items-center gap-1">
        {label}
        <span className={active ? 'text-brand' : 'text-gray-300'}>
          {active && current.dir === 'asc' ? <SortAscIcon /> : <SortDescIcon />}
        </span>
      </span>
    </th>
  )
}

function PageBtn({ children, disabled, onClick }: { children: React.ReactNode; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  )
}

function DeadlineCell({ date }: { date: string }) {
  const today = new Date('2026-02-21')
  const d = new Date(date)
  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  let cls = 'text-gray-500'
  if (diff < 0) cls = 'text-red-500 font-semibold'
  else if (diff <= 3) cls = 'text-orange-500 font-semibold'
  return <span className={`text-[12px] ${cls}`}>{date.slice(5)}</span>
}

// ── SVG 아이콘 ────────────────────────────────────────
function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <line x1="6" y1="2" x2="6" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8.5 8.5L11.5 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M7.5 2.5L4.5 6L7.5 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M4.5 2.5L7.5 6L4.5 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SortAscIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M5 2L5 8M5 2L3 4M5 2L7 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SortDescIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M5 8L5 2M5 8L3 6M5 8L7 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
