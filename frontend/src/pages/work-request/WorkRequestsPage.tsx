import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TypeBadge, PriorityBadge, StatusBadge } from '@/components/work-request/Badges'
import { FilterSelect, SortTh, Pagination, DeadlineCell, type SortDir } from '@/components/common/TableControls'
import { PlusIcon, SearchIcon } from '@/components/common/Icons'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState'
import type { WorkRequest, RequestType, Priority, Status } from '@/types/work-request'

// ── 샘플 데이터 ───────────────────────────────────────
const SAMPLE_DATA: WorkRequest[] = [
  { id: '1',  docNo: 'WR-051', title: '모바일 PDA 화면 레이아웃 개선 요청',        type: '기능개선', priority: '높음', status: '개발중',   assignee: '김개발',   deadline: '2026-02-25' },
  { id: '2',  docNo: 'WR-050', title: '신규 계좌 개설 프로세스 자동화',            type: '신규개발', priority: '긴급', status: '검토중',   assignee: '이설계',   deadline: '2026-02-22' },
  { id: '3',  docNo: 'WR-049', title: '잔고 조회 API 응답 지연 버그 수정',         type: '버그수정', priority: '긴급', status: '테스트중', assignee: '박테스터', deadline: '2026-02-21' },
  { id: '4',  docNo: 'WR-048', title: 'AWS S3 스토리지 용량 확장',               type: '인프라',   priority: '보통', status: '완료',    assignee: '최인프라', deadline: '2026-02-18' },
  { id: '5',  docNo: 'WR-047', title: '로그인 세션 만료 시간 정책 변경',           type: '기능개선', priority: '낮음', status: '접수대기', assignee: '미배정',   deadline: '2026-03-05' },
  { id: '6',  docNo: 'WR-046', title: '주문 내역 엑셀 다운로드 기능 추가',         type: '신규개발', priority: '보통', status: '개발중',   assignee: '김개발',   deadline: '2026-02-28' },
  { id: '7',  docNo: 'WR-045', title: '고객 알림 푸시 발송 로직 개선',             type: '기능개선', priority: '높음', status: '검토중',   assignee: '이설계',   deadline: '2026-03-03' },
  { id: '8',  docNo: 'WR-044', title: '배포 파이프라인 CI/CD 구성',               type: '인프라',   priority: '보통', status: '완료',    assignee: '최인프라', deadline: '2026-02-14' },
  { id: '9',  docNo: 'WR-043', title: '결제 모듈 PG사 연동 오류 수정',            type: '버그수정', priority: '긴급', status: '완료',    assignee: '박테스터', deadline: '2026-02-12' },
  { id: '10', docNo: 'WR-042', title: '관리자 대시보드 권한 분리',                type: '신규개발', priority: '보통', status: '개발중',   assignee: '김개발',   deadline: '2026-03-10' },
  { id: '11', docNo: 'WR-041', title: '거래 내역 조회 페이지 성능 개선',           type: '기능개선', priority: '높음', status: '접수대기', assignee: '미배정',   deadline: '2026-03-07' },
  { id: '12', docNo: 'WR-040', title: '사용자 비밀번호 재설정 이메일 발송 오류',    type: '버그수정', priority: '보통', status: '반려',    assignee: '박테스터', deadline: '2026-02-10' },
]

const PAGE_SIZE = 10

type SortKey = 'docNo' | 'deadline'

export default function WorkRequestsPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<RequestType | '전체'>('전체')
  const [filterPriority, setFilterPriority] = useState<Priority | '전체'>('전체')
  const [filterStatus, setFilterStatus] = useState<Status | '전체'>('전체')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'docNo', dir: 'desc' })
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
      setIsError(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [])

  const filtered = SAMPLE_DATA.filter((r) => {
    const matchSearch = search === '' || r.title.includes(search) || r.docNo.includes(search)
    const matchType = filterType === '전체' || r.type === filterType
    const matchPriority = filterPriority === '전체' || r.priority === filterPriority
    const matchStatus = filterStatus === '전체' || r.status === filterStatus
    return matchSearch && matchType && matchPriority && matchStatus
  })

  const sorted = [...filtered].sort((a, b) => {
    const v = sort.dir === 'asc' ? 1 : -1
    if (sort.key === 'docNo') return a.docNo > b.docNo ? v : -v
    return a.deadline > b.deadline ? v : -v
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSort = (key: string) => {
    const k = key as SortKey
    setSort((prev) => prev.key === k ? { key: k, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'desc' })
  }

  const resetFilters = () => {
    setSearch(''); setFilterType('전체'); setFilterPriority('전체'); setFilterStatus('전체'); setPage(1)
  }

  const isFiltered = search || filterType !== '전체' || filterPriority !== '전체' || filterStatus !== '전체'
  const isEmpty = !isLoading && !isError && paginated.length === 0

  const handleRetry = () => {
    setIsError(false)
    setIsLoading(true)
    window.setTimeout(() => setIsLoading(false), 250)
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
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
      <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-3 sm:px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"><SearchIcon /></span>
          <input
            type="text"
            placeholder="제목 또는 문서번호 검색"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full h-8 pl-8 pr-3 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 bg-gray-50"
          />
        </div>
        <FilterSelect value={filterType} onChange={(v) => { setFilterType(v as RequestType | '전체'); setPage(1) }} options={['전체', '기능개선', '신규개발', '버그수정', '인프라', '기타']} placeholder="유형" />
        <FilterSelect value={filterPriority} onChange={(v) => { setFilterPriority(v as Priority | '전체'); setPage(1) }} options={['전체', '긴급', '높음', '보통', '낮음']} placeholder="우선순위" />
        <FilterSelect value={filterStatus} onChange={(v) => { setFilterStatus(v as Status | '전체'); setPage(1) }} options={['전체', '접수대기', '검토중', '개발중', '테스트중', '완료', '반려']} placeholder="상태" />
        {isFiltered && (
          <button onClick={resetFilters} className="h-8 px-3 text-[12px] text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            초기화
          </button>
        )}
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_12px_rgba(30,58,138,0.07)] overflow-hidden">
        {isLoading ? (
          <LoadingState title="업무요청 목록을 불러오는 중입니다" description="필터와 정렬 정보를 준비하고 있습니다." />
        ) : isError ? (
          <ErrorState
            title="목록을 불러오지 못했습니다"
            description="잠시 후 다시 시도해주세요."
            actionLabel="다시 시도"
            onAction={handleRetry}
          />
        ) : isEmpty ? (
          <EmptyState
            title="조건에 맞는 업무요청이 없습니다"
            description="검색어 또는 필터 조건을 조정해보세요."
            actionLabel="필터 초기화"
            onAction={resetFilters}
          />
        ) : (
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
                {paginated.map((req) => (
                  <tr key={req.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-400 whitespace-nowrap">
                      <Link
                        to={`/work-requests/${req.id}`}
                        className="inline-flex rounded focus:outline-none focus:ring-2 focus:ring-brand/30"
                        aria-label={`${req.docNo} 상세 보기`}
                      >
                        {req.docNo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 max-w-[260px]">
                      <Link
                        to={`/work-requests/${req.id}`}
                        className="text-[13px] text-gray-800 font-medium truncate block group-hover:text-brand transition-colors rounded focus:outline-none focus:ring-2 focus:ring-brand/30"
                      >
                        {req.title}
                      </Link>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap"><TypeBadge type={req.type} /></td>
                    <td className="px-3 py-3 whitespace-nowrap"><PriorityBadge priority={req.priority} /></td>
                    <td className="px-3 py-3 whitespace-nowrap"><StatusBadge status={req.status} /></td>
                    <td className="px-3 py-3 whitespace-nowrap"><span className="text-[12px] text-gray-600">{req.assignee}</span></td>
                    <td className="px-3 py-3 whitespace-nowrap"><DeadlineCell date={req.deadline} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && !isError && !isEmpty && (
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </div>
    </div>
  )
}
