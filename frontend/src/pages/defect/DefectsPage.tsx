import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DefectTypeBadge, SeverityBadge, DefectStatusBadge } from '@/components/defect/Badges'
import { FilterSelect, SortTh, Pagination, DeadlineCell, type SortDir } from '@/components/common/TableControls'
import { PlusIcon, SearchIcon } from '@/components/common/Icons'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState'
import { useDefectsQuery } from '@/features/defect/queries'
import type { DefectType, Severity, DefectStatus } from '@/types/defect'

const PAGE_SIZE = 10
type SortKey = 'docNo' | 'deadline' | 'severity' | 'status'

export default function DefectsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<DefectType | '전체'>('전체')
  const [filterSeverity, setFilterSeverity] = useState<Severity | '전체'>('전체')
  const [filterStatus, setFilterStatus] = useState<DefectStatus | '전체'>('전체')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'severity', dir: 'asc' })
  const [page, setPage] = useState(1)

  const params = useMemo(
    () => ({
      search,
      filterType,
      filterSeverity,
      filterStatus,
      sortKey: sort.key,
      sortDir: sort.dir,
      page,
      pageSize: PAGE_SIZE,
    }),
    [filterSeverity, filterStatus, filterType, page, search, sort.dir, sort.key],
  )
  const { data, isPending, isError, refetch } = useDefectsQuery(params)

  const handleSort = (key: string) => {
    const k = key as SortKey
    setSort((prev) => prev.key === k ? { key: k, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'asc' })
  }

  const resetFilters = () => {
    setSearch(''); setFilterType('전체'); setFilterSeverity('전체'); setFilterStatus('전체'); setPage(1)
  }

  const isFiltered = search || filterType !== '전체' || filterSeverity !== '전체' || filterStatus !== '전체'
  const isEmpty = !isPending && !isError && (data?.items.length ?? 0) === 0

  return (
    <div className="p-6 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-gray-900">결함 목록</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">총 {data?.total ?? 0}건</p>
        </div>
        <button
          onClick={() => navigate('/defects/new')}
          className="flex items-center gap-1.5 h-8 px-3 bg-brand hover:bg-brand-hover text-white text-[13px] font-semibold rounded-lg transition-colors"
        >
          <PlusIcon />
          결함 등록
        </button>
      </div>

      {/* 심각도 요약 바 */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '미해결', value: data?.summary.openCount ?? 0, cls: 'text-gray-700', dot: 'bg-gray-400', onClick: () => { setFilterStatus('전체'); setFilterSeverity('전체'); setPage(1) } },
          { label: '치명적', value: data?.summary.criticalCount ?? 0, cls: 'text-red-600', dot: 'bg-red-500', onClick: () => { setFilterSeverity('치명적' as Severity); setPage(1) } },
          { label: '수정중', value: data?.summary.fixingCount ?? 0, cls: 'text-amber-600', dot: 'bg-amber-400', onClick: () => { setFilterStatus('수정중' as DefectStatus); setPage(1) } },
          { label: '완료', value: data?.summary.doneCount ?? 0, cls: 'text-emerald-600', dot: 'bg-emerald-400', onClick: () => { setFilterStatus('완료' as DefectStatus); setPage(1) } },
        ].map((s) => (
          <button
            key={s.label}
            onClick={s.onClick}
            className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-4 py-3 flex items-center gap-3 w-full text-left hover:border-brand/30 hover:shadow-[0_4px_16px_rgba(30,58,138,0.1)] transition-all"
          >
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot}`} />
            <span className="text-[12px] text-gray-400 flex-1">{s.label}</span>
            <span className={`text-[20px] font-bold tabular-nums ${s.cls}`}>{s.value}</span>
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
        <FilterSelect value={filterType} onChange={(v) => { setFilterType(v as DefectType | '전체'); setPage(1) }} options={['전체', 'UI', '기능', '성능', '보안', '데이터', '기타']} placeholder="유형" />
        <FilterSelect value={filterSeverity} onChange={(v) => { setFilterSeverity(v as Severity | '전체'); setPage(1) }} options={['전체', '치명적', '높음', '보통', '낮음']} placeholder="심각도" />
        <FilterSelect value={filterStatus} onChange={(v) => { setFilterStatus(v as DefectStatus | '전체'); setPage(1) }} options={['전체', '접수', '분석중', '수정중', '검증중', '완료', '재현불가', '보류']} placeholder="상태" />
        {isFiltered && (
          <button onClick={resetFilters} className="h-8 px-3 text-[12px] text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            초기화
          </button>
        )}
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_12px_rgba(30,58,138,0.07)] overflow-hidden">
        {isPending ? (
          <LoadingState title="결함 목록을 불러오는 중입니다" description="필터와 정렬 정보를 준비하고 있습니다." />
        ) : isError ? (
          <ErrorState
            title="목록을 불러오지 못했습니다"
            description="잠시 후 다시 시도해주세요."
            actionLabel="다시 시도"
            onAction={() => { void refetch() }}
          />
        ) : isEmpty ? (
          <EmptyState
            title="조건에 맞는 결함이 없습니다"
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
                <SortTh label="심각도" sortKey="severity" current={sort} onSort={handleSort} />
                <SortTh label="상태" sortKey="status" current={sort} onSort={handleSort} />
                <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">발견자</th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">담당자</th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">연관문서</th>
                <SortTh label="마감일" sortKey="deadline" current={sort} onSort={handleSort} />
              </tr>
            </thead>
              <tbody className="divide-y divide-gray-50">
                {(data?.items ?? []).map((df) => (
                  <tr
                    key={df.id}
                    onClick={() => navigate(`/defects/${df.id}`)}
                    className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-400 whitespace-nowrap">
                      {df.docNo}
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <span className="text-[13px] text-gray-800 font-medium truncate block group-hover:text-brand transition-colors">
                        {df.title}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap"><DefectTypeBadge type={df.type} /></td>
                    <td className="px-3 py-3 whitespace-nowrap"><SeverityBadge severity={df.severity} /></td>
                    <td className="px-3 py-3 whitespace-nowrap"><DefectStatusBadge status={df.status} /></td>
                    <td className="px-3 py-3 whitespace-nowrap"><span className="text-[12px] text-gray-500">{df.reporter}</span></td>
                    <td className="px-3 py-3 whitespace-nowrap"><span className="text-[12px] text-gray-600">{df.assignee}</span></td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="font-mono text-[11px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{df.relatedDoc}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap"><DeadlineCell date={df.deadline} /></td>
                  </tr>
                ))}
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
