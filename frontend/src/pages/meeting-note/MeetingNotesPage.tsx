import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState'
import { SortTh, Pagination } from '@/components/common/TableControls'
import type { SortDir } from '@/components/common/TableControls'
import { PlusIcon, SearchIcon } from '@/components/common/Icons'
import { useMeetingNotesQuery } from '@/features/meeting-note/queries'

const PAGE_SIZE = 10

type SortKey = 'docNo' | 'date'

export default function MeetingNotesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'date', dir: 'desc' })
  const [page, setPage] = useState(1)

  const params = useMemo(
    () => ({
      search,
      sortKey: sort.key,
      sortDir: sort.dir,
      page,
      pageSize: PAGE_SIZE,
    }),
    [page, search, sort.dir, sort.key],
  )

  const { data, isPending, isError, refetch } = useMeetingNotesQuery(params)

  const handleSort = (key: string) => {
    const nextKey = key as SortKey
    setSort((prev) => prev.key === nextKey
      ? { key: nextKey, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key: nextKey, dir: 'desc' })
    setPage(1)
  }

  const resetSearch = () => {
    setSearch('')
    setPage(1)
  }

  const isEmpty = !isPending && !isError && (data?.items.length ?? 0) === 0

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900">회의록</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">총 {data?.total ?? 0}건</p>
        </div>
        <button
          onClick={() => navigate('/meeting-notes/new')}
          className="flex items-center gap-1.5 h-9 px-4 bg-brand text-white text-[13px] font-semibold rounded-lg hover:bg-brand-hover transition-colors"
        >
          <PlusIcon />
          회의록 등록
        </button>
      </div>

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
            onClick={resetSearch}
            className="h-8 px-3 text-[12px] text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            초기화
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] overflow-hidden">
        {isPending ? (
          <LoadingState title="회의록 목록을 불러오는 중입니다" description="최신 데이터를 가져오고 있습니다." />
        ) : isError ? (
          <ErrorState
            title="회의록 목록을 불러오지 못했습니다"
            description="잠시 후 다시 시도해주세요."
            actionLabel="다시 시도"
            onAction={() => { void refetch() }}
          />
        ) : isEmpty ? (
          <EmptyState
            title="조건에 맞는 회의록이 없습니다"
            description="검색어를 조정하거나 새 회의록을 등록해보세요."
            actionLabel={search ? '검색 초기화' : '회의록 등록'}
            onAction={search ? resetSearch : () => navigate('/meeting-notes/new')}
          />
        ) : (
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
                {(data?.items ?? []).map((m) => {
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
        )}
        {!isPending && !isError && !isEmpty && (
          <Pagination page={data?.page ?? page} totalPages={data?.totalPages ?? 1} onPageChange={setPage} />
        )}
      </div>
    </div>
  )
}
