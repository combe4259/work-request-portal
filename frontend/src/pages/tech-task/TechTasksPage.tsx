import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PriorityBadge, StatusBadge } from '@/components/work-request/Badges'
import { FilterSelect, SortTh, Pagination, DeadlineCell, type SortDir } from '@/components/common/TableControls'
import { PlusIcon, SearchIcon } from '@/components/common/Icons'
import { TechTypeBadge } from '@/components/tech-task/Badges'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState'
import PageHeader from '@/components/common/PageHeader'
import { useTeamMembersQuery } from '@/features/auth/queries'
import { useTechTasksQuery } from '@/features/tech-task/queries'
import { useAuthStore } from '@/stores/authStore'
import type { TechTaskType, Priority, Status } from '@/types/tech-task'

const PAGE_SIZE = 10

type SortKey = 'docNo' | 'deadline'

export default function TechTasksPage() {
  const navigate = useNavigate()
  const currentTeamId = useAuthStore((state) => state.currentTeam?.id)
  const teamMembersQuery = useTeamMembersQuery(currentTeamId)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<TechTaskType | '전체'>('전체')
  const [filterPriority, setFilterPriority] = useState<Priority | '전체'>('전체')
  const [filterStatus, setFilterStatus] = useState<Status | '전체'>('전체')
  const [filterAssigneeId, setFilterAssigneeId] = useState<string>('전체')
  const [deadlineFrom, setDeadlineFrom] = useState('')
  const [deadlineTo, setDeadlineTo] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'docNo', dir: 'desc' })
  const [page, setPage] = useState(1)

  const assigneeOptions = useMemo(
    () => (teamMembersQuery.data ?? []).map((member) => ({ value: String(member.userId), label: member.name })),
    [teamMembersQuery.data],
  )

  const params = useMemo(
    () => ({
      search,
      filterType,
      filterPriority,
      filterStatus,
      filterAssigneeId: filterAssigneeId === '전체' ? null : Number(filterAssigneeId),
      deadlineFrom: deadlineFrom || undefined,
      deadlineTo: deadlineTo || undefined,
      sortKey: sort.key,
      sortDir: sort.dir,
      page,
      pageSize: PAGE_SIZE,
    }),
    [deadlineFrom, deadlineTo, filterAssigneeId, filterPriority, filterStatus, filterType, page, search, sort.dir, sort.key],
  )
  const { data, isPending, isError, refetch } = useTechTasksQuery(params)

  const handleSort = (key: string) => {
    const k = key as SortKey
    setSort((prev) => prev.key === k ? { key: k, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'desc' })
  }

  const resetFilters = () => {
    setSearch('')
    setFilterType('전체')
    setFilterPriority('전체')
    setFilterStatus('전체')
    setFilterAssigneeId('전체')
    setDeadlineFrom('')
    setDeadlineTo('')
    setPage(1)
  }

  const isFiltered = search || filterType !== '전체' || filterPriority !== '전체' || filterStatus !== '전체'
    || filterAssigneeId !== '전체' || deadlineFrom || deadlineTo

  const isEmpty = !isPending && !isError && (data?.items.length ?? 0) === 0

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader
        title="기술과제"
        count={data?.total ?? 0}
        action={{ label: '기술과제 등록', onClick: () => navigate('/tech-tasks/new'), icon: <PlusIcon /> }}
      />

      {/* 필터 바 */}
      <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-3 sm:px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"><SearchIcon /></span>
          <input
            type="text"
            placeholder="제목 또는 문서번호 검색"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full h-8 pl-8 pr-3 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 bg-gray-50"
          />
        </div>
        <FilterSelect value={filterType} onChange={(v) => { setFilterType(v as TechTaskType | '전체'); setPage(1) }} options={['전체', '리팩토링', '기술부채', '성능개선', '보안', '테스트', '기타']} placeholder="유형" className="w-[120px]" />
        <FilterSelect value={filterPriority} onChange={(v) => { setFilterPriority(v as Priority | '전체'); setPage(1) }} options={['전체', '긴급', '높음', '보통', '낮음']} placeholder="우선순위" className="w-[112px]" />
        <FilterSelect value={filterStatus} onChange={(v) => { setFilterStatus(v as Status | '전체'); setPage(1) }} options={['전체', '접수대기', '검토중', '개발중', '테스트중', '완료', '반려']} placeholder="상태" className="w-[128px]" />
        <select
          value={filterAssigneeId}
          onChange={(e) => { setFilterAssigneeId(e.target.value); setPage(1) }}
          className="h-8 px-2.5 pr-7 text-[12px] border border-gray-200 rounded-lg bg-gray-50 text-gray-600 focus:outline-none focus:border-brand appearance-none cursor-pointer w-[124px]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%239CA3AF' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
          }}
        >
          <option value="전체">담당자 전체</option>
          {assigneeOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={deadlineFrom}
            max={deadlineTo || undefined}
            onChange={(e) => { setDeadlineFrom(e.target.value); setPage(1) }}
            className="h-8 px-2.5 text-[12px] border border-gray-200 rounded-lg bg-gray-50 text-gray-600 focus:outline-none focus:border-brand w-[132px]"
          />
          <span className="text-[12px] text-gray-400">~</span>
          <input
            type="date"
            value={deadlineTo}
            min={deadlineFrom || undefined}
            onChange={(e) => { setDeadlineTo(e.target.value); setPage(1) }}
            className="h-8 px-2.5 text-[12px] border border-gray-200 rounded-lg bg-gray-50 text-gray-600 focus:outline-none focus:border-brand w-[132px]"
          />
        </div>
        <button
          onClick={resetFilters}
          disabled={!isFiltered}
          className="h-8 px-3 text-[12px] text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          초기화
        </button>
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
            <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[120px]" />
              <col />
              <col className="w-[120px]" />
              <col className="w-[110px]" />
              <col className="w-[110px]" />
              <col className="w-[120px]" />
              <col className="w-[110px]" />
            </colgroup>
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
                  <tr
                    key={task.id}
                    onClick={() => navigate(`/tech-tasks/${task.id}`)}
                    className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-400 whitespace-nowrap">
                      {task.docNo}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-gray-800 font-medium truncate block group-hover:text-brand transition-colors">
                        {task.title}
                      </span>
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
