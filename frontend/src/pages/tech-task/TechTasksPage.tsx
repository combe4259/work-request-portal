import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PriorityBadge, StatusBadge } from '@/components/work-request/Badges'
import { FilterSelect, SortTh, Pagination, DeadlineCell, type SortDir } from '@/components/common/TableControls'
import { PlusIcon, SearchIcon } from '@/components/common/Icons'
import type { TechTask, TechTaskType, Priority, Status } from '@/types/tech-task'

// ── 샘플 데이터 ───────────────────────────────────────
const SAMPLE_DATA: TechTask[] = [
  { id: '1',  docNo: 'TK-021', title: '계좌 조회 서비스 레이어 리팩토링',         type: '리팩토링', priority: '보통', status: '개발중',   assignee: '김개발',   deadline: '2026-03-07' },
  { id: '2',  docNo: 'TK-020', title: 'N+1 쿼리 문제 해결 — 잔고 조회 API',     type: '성능개선', priority: '높음', status: '검토중',   assignee: '이설계',   deadline: '2026-02-28' },
  { id: '3',  docNo: 'TK-019', title: 'JWT 토큰 갱신 로직 보안 취약점 패치',     type: '보안',     priority: '긴급', status: '완료',    assignee: '박테스터', deadline: '2026-02-18' },
  { id: '4',  docNo: 'TK-018', title: '레거시 XML 파서 → JSON 파서 전환',       type: '기술부채', priority: '낮음', status: '접수대기', assignee: '미배정',   deadline: '2026-04-01' },
  { id: '5',  docNo: 'TK-017', title: '결제 모듈 단위 테스트 커버리지 80% 달성', type: '테스트',   priority: '보통', status: '개발중',   assignee: '박테스터', deadline: '2026-03-14' },
  { id: '6',  docNo: 'TK-016', title: 'Redis 캐시 TTL 정책 재설계',             type: '성능개선', priority: '보통', status: '검토중',   assignee: '최인프라', deadline: '2026-03-05' },
  { id: '7',  docNo: 'TK-015', title: '공통 에러 핸들러 모듈화',               type: '리팩토링', priority: '낮음', status: '완료',    assignee: '김개발',   deadline: '2026-02-14' },
  { id: '8',  docNo: 'TK-014', title: 'SQL Injection 방어 로직 전수 점검',      type: '보안',     priority: '긴급', status: '완료',    assignee: '박테스터', deadline: '2026-02-10' },
  { id: '9',  docNo: 'TK-013', title: 'API 응답 DTO 불필요 필드 정리',          type: '기술부채', priority: '낮음', status: '접수대기', assignee: '미배정',   deadline: '2026-04-15' },
  { id: '10', docNo: 'TK-012', title: '배치 스케줄러 성능 최적화',              type: '성능개선', priority: '높음', status: '개발중',   assignee: '이설계',   deadline: '2026-02-26' },
]

const PAGE_SIZE = 10

type SortKey = 'docNo' | 'deadline'

// ── 유형 배지 (기술과제 전용) ──────────────────────────
const TECH_TYPE_STYLES: Record<TechTaskType, string> = {
  '리팩토링': 'bg-slate-100 text-slate-600',
  '기술부채': 'bg-orange-50 text-orange-600',
  '성능개선': 'bg-cyan-50 text-cyan-700',
  '보안':     'bg-red-50 text-red-600',
  '테스트':   'bg-emerald-50 text-emerald-700',
  '기타':     'bg-gray-100 text-gray-500',
}

function TechTypeBadge({ type }: { type: TechTaskType }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium ${TECH_TYPE_STYLES[type]}`}>
      {type}
    </span>
  )
}

export default function TechTasksPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<TechTaskType | '전체'>('전체')
  const [filterPriority, setFilterPriority] = useState<Priority | '전체'>('전체')
  const [filterStatus, setFilterStatus] = useState<Status | '전체'>('전체')
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

  return (
    <div className="p-6 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-gray-900">기술과제</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">총 {filtered.length}건</p>
        </div>
        <button
          onClick={() => navigate('/tech-tasks/new')}
          className="flex items-center gap-1.5 h-8 px-3 bg-brand hover:bg-brand-hover text-white text-[13px] font-semibold rounded-lg transition-colors"
        >
          <PlusIcon />
          기술과제 등록
        </button>
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
        <FilterSelect value={filterType} onChange={(v) => { setFilterType(v as TechTaskType | '전체'); setPage(1) }} options={['전체', '리팩토링', '기술부채', '성능개선', '보안', '테스트', '기타']} placeholder="유형" />
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
                  <td colSpan={7} className="px-4 py-12 text-center text-[13px] text-gray-400">검색 결과가 없습니다</td>
                </tr>
              ) : (
                paginated.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => navigate(`/tech-tasks/${task.id}`)}
                    className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-400 whitespace-nowrap">{task.docNo}</td>
                    <td className="px-4 py-3 max-w-[260px]">
                      <span className="text-[13px] text-gray-800 font-medium truncate block group-hover:text-brand transition-colors">{task.title}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap"><TechTypeBadge type={task.type} /></td>
                    <td className="px-3 py-3 whitespace-nowrap"><PriorityBadge priority={task.priority} /></td>
                    <td className="px-3 py-3 whitespace-nowrap"><StatusBadge status={task.status} /></td>
                    <td className="px-3 py-3 whitespace-nowrap"><span className="text-[12px] text-gray-600">{task.assignee}</span></td>
                    <td className="px-3 py-3 whitespace-nowrap"><DeadlineCell date={task.deadline} /></td>
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
