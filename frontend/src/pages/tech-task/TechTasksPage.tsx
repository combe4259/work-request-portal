import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PriorityBadge, StatusBadge } from '@/components/work-request/Badges'
import { FilterSelect, SortTh, Pagination, DeadlineCell, type SortDir } from '@/components/common/TableControls'
import { PlusIcon, SearchIcon } from '@/components/common/Icons'
import { TechTypeBadge } from '@/components/tech-task/Badges'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState'
import { useTechTasksQuery } from '@/features/tech-task/queries'
import type { TechTaskType, Priority, Status } from '@/types/tech-task'

const PAGE_SIZE = 10

type SortKey = 'docNo' | 'deadline'

export default function TechTasksPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<TechTaskType | '전체'>('전체')
  const [filterPriority, setFilterPriority] = useState<Priority | '전체'>('전체')
  const [filterStatus, setFilterStatus] = useState<Status | '전체'>('전체')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'docNo', dir: 'desc' })
  const [page, setPage] = useState(1)

  const params = useMemo(
    () => ({
      search,
      filterType,
      filterPriority,
      filterStatus,
      sortKey: sort.key,
      sortDir: sort.dir,
      page,
      pageSize: PAGE_SIZE,
    }),
    [filterPriority, filterStatus, filterType, page, search, sort.dir, sort.key],
  )
  const { data, isPending, isError, refetch } = useTechTasksQuery(params)

  const handleSort = (key: string) => {
    const k = key as SortKey
    setSort((prev) => prev.key === k ? { key: k, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'desc' })
  }

  const resetFilters = () => {
    setSearch(''); setFilterType('전체'); setFilterPriority('전체'); setFilterStatus('전체'); setPage(1)
  }

  const isFiltered = search || filterType !== '전체' || filterPriority !== '전체' || filterStatus !== '전체'

  const isEmpty = !isPending && !isError && (data?.items.length ?? 0) === 0

  return (
    <div className="p-6 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-gray-900">기술과제</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">총 {data?.total ?? 0}건</p>
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
        {isPending ? (
          <LoadingState title="기술과제 목록을 불러오는 중입니다" description="필터와 정렬 정보를 준비하고 있습니다." />
        ) : isError ? (
          <ErrorState
            title="목록을 불러오지 못했습니다"
            description="잠시 후 다시 시도해주세요."
            actionLabel="다시 시도"
            onAction={() => { void refetch() }}
          />
        ) : isEmpty ? (
          <EmptyState
            title="조건에 맞는 기술과제가 없습니다"
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
              {(data?.items ?? []).map((task) => (
                  <tr key={task.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-400 whitespace-nowrap">
                      <Link
                        to={`/tech-tasks/${task.id}`}
                        className="inline-flex rounded focus:outline-none focus:ring-2 focus:ring-brand/30"
                        aria-label={`${task.docNo} 상세 보기`}
                      >
                        {task.docNo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 max-w-[260px]">
                      <Link
                        to={`/tech-tasks/${task.id}`}
                        className="text-[13px] text-gray-800 font-medium truncate block group-hover:text-brand transition-colors rounded focus:outline-none focus:ring-2 focus:ring-brand/30"
                      >
                        {task.title}
                      </Link>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap"><TechTypeBadge type={task.type} /></td>
                    <td className="px-3 py-3 whitespace-nowrap"><PriorityBadge priority={task.priority} /></td>
                    <td className="px-3 py-3 whitespace-nowrap"><StatusBadge status={task.status} /></td>
                    <td className="px-3 py-3 whitespace-nowrap"><span className="text-[12px] text-gray-600">{task.assignee}</span></td>
                    <td className="px-3 py-3 whitespace-nowrap"><DeadlineCell date={task.deadline} /></td>
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
