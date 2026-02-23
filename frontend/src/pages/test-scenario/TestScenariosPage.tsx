import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PriorityBadge } from '@/components/work-request/Badges'
import { TestTypeBadge, TestStatusBadge } from '@/components/test-scenario/Badges'
import { FilterSelect, SortTh, Pagination, DeadlineCell, type SortDir } from '@/components/common/TableControls'
import { PlusIcon, SearchIcon } from '@/components/common/Icons'
import type { TestScenario, TestScenarioType, Priority, TestStatus } from '@/types/test-scenario'

// ── 샘플 데이터 ───────────────────────────────────────
const SAMPLE_DATA: TestScenario[] = [
  { id: '1',  docNo: 'TS-018', title: '모바일 PDA 레이아웃 반응형 검증',          type: '기능',  priority: '높음', status: '실행중', assignee: '박테스터', relatedDoc: 'WR-051', deadline: '2026-02-26' },
  { id: '2',  docNo: 'TS-017', title: '계좌 개설 프로세스 E2E 흐름 검증',         type: 'E2E',   priority: '긴급', status: '승인됨', assignee: '박테스터', relatedDoc: 'WR-050', deadline: '2026-02-24' },
  { id: '3',  docNo: 'TS-016', title: '잔고 조회 API 응답시간 회귀 테스트',        type: '회귀',  priority: '긴급', status: '통과',  assignee: '박테스터', relatedDoc: 'WR-049', deadline: '2026-02-20' },
  { id: '4',  docNo: 'TS-015', title: 'S3 파일 업로드/다운로드 통합 테스트',      type: '통합',  priority: '보통', status: '통과',  assignee: '최인프라', relatedDoc: 'WR-048', deadline: '2026-02-17' },
  { id: '5',  docNo: 'TS-014', title: '로그인 세션 만료 기능 검증',               type: '기능',  priority: '낮음', status: '작성중', assignee: '미배정',  relatedDoc: 'WR-047', deadline: '2026-03-03' },
  { id: '6',  docNo: 'TS-013', title: '엑셀 다운로드 데이터 정합성 검증',         type: '기능',  priority: '보통', status: '검토중', assignee: '박테스터', relatedDoc: 'WR-046', deadline: '2026-02-27' },
  { id: '7',  docNo: 'TS-012', title: 'JWT 토큰 보안 취약점 침투 테스트',         type: '보안',  priority: '긴급', status: '통과',  assignee: '박테스터', relatedDoc: 'TK-019', deadline: '2026-02-17' },
  { id: '8',  docNo: 'TS-011', title: '잔고 조회 N+1 쿼리 성능 검증',            type: '성능',  priority: '높음', status: '실행중', assignee: '이설계',  relatedDoc: 'TK-020', deadline: '2026-02-27' },
  { id: '9',  docNo: 'TS-010', title: '결제 모듈 PG 연동 오류 회귀 테스트',       type: '회귀',  priority: '긴급', status: '실패',  assignee: '박테스터', relatedDoc: 'WR-043', deadline: '2026-02-21' },
  { id: '10', docNo: 'TS-009', title: '관리자 권한 분리 E2E 시나리오',            type: 'E2E',   priority: '보통', status: '작성중', assignee: '미배정',  relatedDoc: 'WR-042', deadline: '2026-03-08' },
  { id: '11', docNo: 'TS-008', title: 'SQL Injection 방어 보안 점검',             type: '보안',  priority: '긴급', status: '통과',  assignee: '박테스터', relatedDoc: 'TK-014', deadline: '2026-02-09' },
  { id: '12', docNo: 'TS-007', title: '거래 내역 조회 대용량 성능 테스트',         type: '성능',  priority: '높음', status: '보류',  assignee: '이설계',  relatedDoc: 'WR-041', deadline: '2026-03-06' },
]

const PAGE_SIZE = 10
type SortKey = 'docNo' | 'deadline' | 'priority' | 'status'

const PRIORITY_ORDER: Record<string, number> = { '긴급': 0, '높음': 1, '보통': 2, '낮음': 3 }
const STATUS_ORDER_TS: Record<string, number> = { '실행중': 0, '검토중': 1, '승인됨': 2, '실패': 3, '작성중': 4, '통과': 5, '보류': 6 }

export default function TestScenariosPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<TestScenarioType | '전체'>('전체')
  const [filterPriority, setFilterPriority] = useState<Priority | '전체'>('전체')
  const [filterStatus, setFilterStatus] = useState<TestStatus | '전체'>('전체')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'docNo', dir: 'desc' })
  const [page, setPage] = useState(1)

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
    if (sort.key === 'priority') return ((PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)) * v
    if (sort.key === 'status') return ((STATUS_ORDER_TS[a.status] ?? 9) - (STATUS_ORDER_TS[b.status] ?? 9)) * v
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

  // 상태 요약 (상단 미니 KPI)
  const passCount = SAMPLE_DATA.filter((r) => r.status === '통과').length
  const failCount = SAMPLE_DATA.filter((r) => r.status === '실패').length
  const runCount  = SAMPLE_DATA.filter((r) => r.status === '실행중').length
  const totalCount = SAMPLE_DATA.length

  return (
    <div className="p-6 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-gray-900">테스트 시나리오</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">총 {filtered.length}건</p>
        </div>
        <button
          onClick={() => navigate('/test-scenarios/new')}
          className="flex items-center gap-1.5 h-8 px-3 bg-brand hover:bg-brand-hover text-white text-[13px] font-semibold rounded-lg transition-colors"
        >
          <PlusIcon />
          시나리오 등록
        </button>
      </div>

      {/* 상태 요약 바 */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '전체',  value: totalCount, cls: 'text-gray-700',    bar: 'bg-gray-200',    status: '전체'  },
          { label: '실행중', value: runCount,  cls: 'text-amber-600',   bar: 'bg-amber-400',   status: '실행중' },
          { label: '통과',  value: passCount,  cls: 'text-emerald-600', bar: 'bg-emerald-400', status: '통과'  },
          { label: '실패',  value: failCount,  cls: 'text-red-500',     bar: 'bg-red-400',     status: '실패'  },
        ].map((s) => (
          <button
            key={s.label}
            onClick={() => { setFilterStatus(s.status as TestStatus | '전체'); setPage(1) }}
            className={`bg-white rounded-xl border shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-4 py-3 text-left w-full transition-all ${
              filterStatus === s.status ? 'border-brand ring-1 ring-brand/20' : 'border-blue-50 hover:border-brand/30 hover:shadow-[0_4px_16px_rgba(30,58,138,0.1)]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-gray-400">{s.label}</span>
              <span className={`text-[18px] font-bold ${s.cls}`}>{s.value}</span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full ${s.bar} rounded-full`} style={{ width: `${totalCount ? (s.value / totalCount) * 100 : 0}%` }} />
            </div>
          </button>
        ))}
      </div>

      {/* 필터 바 */}
      <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-4 py-3 flex items-center gap-3 flex-wrap">
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
        <FilterSelect value={filterType} onChange={(v) => { setFilterType(v as TestScenarioType | '전체'); setPage(1) }} options={['전체', '기능', '회귀', '통합', 'E2E', '성능', '보안', '기타']} placeholder="유형" />
        <FilterSelect value={filterPriority} onChange={(v) => { setFilterPriority(v as Priority | '전체'); setPage(1) }} options={['전체', '긴급', '높음', '보통', '낮음']} placeholder="우선순위" />
        <FilterSelect value={filterStatus} onChange={(v) => { setFilterStatus(v as TestStatus | '전체'); setPage(1) }} options={['전체', '작성중', '검토중', '승인됨', '실행중', '통과', '실패', '보류']} placeholder="상태" />
        {isFiltered && (
          <button onClick={resetFilters} className="h-8 px-3 text-[12px] text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
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
                <SortTh label="우선순위" sortKey="priority" current={sort} onSort={handleSort} />
                <SortTh label="상태" sortKey="status" current={sort} onSort={handleSort} />
                <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">연관문서</th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">담당자</th>
                <SortTh label="마감일" sortKey="deadline" current={sort} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[13px] text-gray-400">검색 결과가 없습니다</td>
                </tr>
              ) : (
                paginated.map((ts) => (
                  <tr
                    key={ts.id}
                    onClick={() => navigate(`/test-scenarios/${ts.id}`)}
                    className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-400 whitespace-nowrap">{ts.docNo}</td>
                    <td className="px-4 py-3 max-w-[240px]">
                      <span className="text-[13px] text-gray-800 font-medium truncate block group-hover:text-brand transition-colors">{ts.title}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap"><TestTypeBadge type={ts.type} /></td>
                    <td className="px-3 py-3 whitespace-nowrap"><PriorityBadge priority={ts.priority} /></td>
                    <td className="px-3 py-3 whitespace-nowrap"><TestStatusBadge status={ts.status} /></td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="font-mono text-[11px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{ts.relatedDoc}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap"><span className="text-[12px] text-gray-600">{ts.assignee}</span></td>
                    <td className="px-3 py-3 whitespace-nowrap"><DeadlineCell date={ts.deadline} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  )
}
