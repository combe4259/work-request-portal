import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SortTh, Pagination } from '@/components/common/TableControls'
import type { SortDir } from '@/components/common/TableControls'
import { PlusIcon, SearchIcon } from '@/components/common/Icons'

// ── Mock 데이터 ───────────────────────────────────────
const SAMPLE_DATA = [
  { id: '1', docNo: 'MN-001', title: '1월 스프린트 회고 및 2월 계획 수립', date: '2026-01-31', facilitator: '박PM', actionTotal: 6, actionDone: 6, createdAt: '2026-01-31' },
  { id: '2', docNo: 'MN-002', title: '계좌 개설 기능 요구사항 정의 회의', date: '2026-02-03', facilitator: '이설계', actionTotal: 4, actionDone: 4, createdAt: '2026-02-03' },
  { id: '3', docNo: 'MN-003', title: 'UI/UX 개선 방향 논의', date: '2026-02-06', facilitator: '최설계', actionTotal: 3, actionDone: 2, createdAt: '2026-02-06' },
  { id: '4', docNo: 'MN-004', title: '보안 취약점 대응 긴급 회의', date: '2026-02-10', facilitator: '박PM', actionTotal: 5, actionDone: 3, createdAt: '2026-02-10' },
  { id: '5', docNo: 'MN-005', title: '2월 배포 계획 확정 회의', date: '2026-02-14', facilitator: '이설계', actionTotal: 4, actionDone: 2, createdAt: '2026-02-14' },
  { id: '6', docNo: 'MN-006', title: '3월 스프린트 킥오프 회의', date: '2026-02-21', facilitator: '박PM', actionTotal: 5, actionDone: 1, createdAt: '2026-02-21' },
  { id: '7', docNo: 'MN-007', title: '성능 개선 방안 기술 리뷰', date: '2026-02-22', facilitator: '김개발', actionTotal: 3, actionDone: 0, createdAt: '2026-02-22' },
  { id: '8', docNo: 'MN-008', title: '신규 입사자 온보딩 프로세스 정비', date: '2026-02-22', facilitator: '최HR', actionTotal: 6, actionDone: 0, createdAt: '2026-02-22' },
]

const PAGE_SIZE = 10

export default function MeetingNotesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({ key: 'date', dir: 'desc' })
  const [page, setPage] = useState(1)

  const handleSort = (key: string) => {
    setSort((prev) => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' })
    setPage(1)
  }

  const filtered = SAMPLE_DATA.filter((m) => {
    const q = search.toLowerCase()
    return !q || m.title.toLowerCase().includes(q) || m.docNo.toLowerCase().includes(q)
  })

  const sorted = [...filtered].sort((a, b) => {
    const dir = sort.dir === 'asc' ? 1 : -1
    if (sort.key === 'date') return a.date.localeCompare(b.date) * dir
    if (sort.key === 'docNo') return a.docNo.localeCompare(b.docNo) * dir
    return 0
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900">회의록</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">총 {filtered.length}건</p>
        </div>
        <button
          onClick={() => navigate('/meeting-notes/new')}
          className="flex items-center gap-1.5 h-9 px-4 bg-brand text-white text-[13px] font-semibold rounded-lg hover:bg-brand-hover transition-colors"
        >
          <PlusIcon />
          회의록 등록
        </button>
      </div>

      {/* 검색 바 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-[280px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <SearchIcon />
          </span>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="제목 또는 문서번호 검색"
            className="w-full h-8 pl-8 pr-3 text-[12px] border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-brand focus:bg-white transition-colors"
          />
        </div>
        {search && (
          <button
            onClick={() => { setSearch(''); setPage(1) }}
            className="h-8 px-3 text-[12px] text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            초기화
          </button>
        )}
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/70 border-b border-gray-100">
              <tr>
                <SortTh label="문서번호" sortKey="docNo" current={sort} onSort={handleSort} />
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 tracking-wide">제목</th>
                <SortTh label="회의 일자" sortKey="date" current={sort} onSort={handleSort} />
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 tracking-wide">진행자</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 tracking-wide">액션 진행률</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 tracking-wide">등록일</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[13px] text-gray-400">
                    검색 결과가 없습니다.
                  </td>
                </tr>
              ) : paged.map((m) => {
                const pct = m.actionTotal > 0 ? Math.round((m.actionDone / m.actionTotal) * 100) : 0
                return (
                  <tr
                    key={m.id}
                    onClick={() => navigate(`/meeting-notes/${m.id}`)}
                    className="border-b border-gray-50 hover:bg-blue-50/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-[12px] text-gray-400">{m.docNo}</span>
                    </td>
                    <td className="px-4 py-3 max-w-[280px]">
                      <span className="text-[13px] text-gray-800 font-medium line-clamp-1">{m.title}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-gray-600">{m.date}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-gray-600">{m.facilitator}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                          <div
                            className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-400' : 'bg-brand/60'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-[11px] font-medium ${pct === 100 ? 'text-emerald-600' : 'text-gray-500'}`}>
                          {m.actionDone}/{m.actionTotal}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-gray-400">{m.createdAt}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  )
}

