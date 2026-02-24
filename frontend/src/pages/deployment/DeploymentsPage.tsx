import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DeployTypeBadge, DeployEnvBadge, DeployStatusBadge } from '@/components/deployment/Badges'
import { FilterSelect, SortTh, Pagination, type SortDir } from '@/components/common/TableControls'
import { PlusIcon, SearchIcon } from '@/components/common/Icons'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState'
import { useDeploymentsQuery } from '@/features/deployment/queries'
import type { DeployType, DeployEnv, DeployStatus } from '@/types/deployment'

const PAGE_SIZE = 10
type SortKey = 'docNo' | 'deployDate' | 'status'

export default function DeploymentsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<DeployType | '전체'>('전체')
  const [filterEnv, setFilterEnv] = useState<DeployEnv | '전체'>('전체')
  const [filterStatus, setFilterStatus] = useState<DeployStatus | '전체'>('전체')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'deployDate', dir: 'asc' })
  const [page, setPage] = useState(1)

  const params = useMemo(
    () => ({
      search,
      filterType,
      filterEnv,
      filterStatus,
      sortKey: sort.key,
      sortDir: sort.dir,
      page,
      pageSize: PAGE_SIZE,
    }),
    [filterEnv, filterStatus, filterType, page, search, sort.dir, sort.key],
  )

  const { data, isPending, isError, refetch } = useDeploymentsQuery(params)

  const handleSort = (key: string) => {
    const k = key as SortKey
    setSort((prev) => (prev.key === k ? { key: k, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'asc' }))
  }

  const resetFilters = () => {
    setSearch('')
    setFilterType('전체')
    setFilterEnv('전체')
    setFilterStatus('전체')
    setPage(1)
  }

  const isFiltered = search || filterType !== '전체' || filterEnv !== '전체' || filterStatus !== '전체'
  const isEmpty = !isPending && !isError && (data?.items.length ?? 0) === 0

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-gray-900">배포 관리</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">총 {data?.total ?? 0}건</p>
        </div>
        <button
          onClick={() => navigate('/deployments/new')}
          className="flex items-center gap-1.5 h-8 px-3 bg-brand hover:bg-brand-hover text-white text-[13px] font-semibold rounded-lg transition-colors"
        >
          <PlusIcon />
          배포 등록
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: '이번주 예정',
            value: data?.summary.upcomingCount ?? 0,
            cls: 'text-brand',
            dot: 'bg-brand',
            onClick: () => {
              setFilterStatus('대기' as DeployStatus)
              setPage(1)
            },
          },
          {
            label: '진행중',
            value: data?.summary.inProgressCount ?? 0,
            cls: 'text-blue-500',
            dot: 'bg-blue-400',
            onClick: () => {
              setFilterStatus('진행중' as DeployStatus)
              setPage(1)
            },
          },
          {
            label: '운영 완료',
            value: data?.summary.prodCount ?? 0,
            cls: 'text-emerald-600',
            dot: 'bg-emerald-400',
            onClick: () => {
              setFilterStatus('완료' as DeployStatus)
              setFilterEnv('운영' as DeployEnv)
              setPage(1)
            },
          },
          {
            label: '실패/롤백',
            value: data?.summary.failCount ?? 0,
            cls: 'text-red-500',
            dot: 'bg-red-400',
            onClick: () => {
              setFilterStatus('실패' as DeployStatus)
              setPage(1)
            },
          },
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

      <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
            <SearchIcon />
          </span>
          <input
            type="text"
            placeholder="제목, 버전, 문서번호 검색"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full h-8 pl-8 pr-3 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 bg-gray-50"
          />
        </div>
        <FilterSelect value={filterEnv} onChange={(v) => { setFilterEnv(v as DeployEnv | '전체'); setPage(1) }} options={['전체', '개발', '스테이징', '운영']} placeholder="환경" />
        <FilterSelect value={filterType} onChange={(v) => { setFilterType(v as DeployType | '전체'); setPage(1) }} options={['전체', '정기배포', '긴급패치', '핫픽스', '롤백', '기타']} placeholder="유형" />
        <FilterSelect value={filterStatus} onChange={(v) => { setFilterStatus(v as DeployStatus | '전체'); setPage(1) }} options={['전체', '대기', '진행중', '완료', '실패', '롤백']} placeholder="상태" />
        {isFiltered && (
          <button onClick={resetFilters} className="h-8 px-3 text-[12px] text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            초기화
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_12px_rgba(30,58,138,0.07)] overflow-hidden">
        {isPending ? (
          <LoadingState title="배포 목록을 불러오는 중입니다" description="필터와 정렬 정보를 준비하고 있습니다." />
        ) : isError ? (
          <ErrorState title="목록을 불러오지 못했습니다" description="잠시 후 다시 시도해주세요." actionLabel="다시 시도" onAction={() => { void refetch() }} />
        ) : isEmpty ? (
          <EmptyState title="조건에 맞는 배포가 없습니다" description="검색어 또는 필터 조건을 조정해보세요." actionLabel="필터 초기화" onAction={resetFilters} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <SortTh label="문서번호" sortKey="docNo" current={sort} onSort={handleSort} />
                    <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">버전</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 tracking-wide">제목</th>
                    <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">유형</th>
                    <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">환경</th>
                    <SortTh label="상태" sortKey="status" current={sort} onSort={handleSort} />
                    <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">담당자</th>
                    <SortTh label="배포 예정일" sortKey="deployDate" current={sort} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(data?.items ?? []).map((dp) => {
                    const isProd = dp.env === '운영'
                    const isFailed = dp.status === '실패' || dp.status === '롤백'
                    return (
                      <tr
                        key={dp.id}
                        onClick={() => navigate(`/deployments/${dp.id}`)}
                        className={`transition-colors cursor-pointer group ${
                          isFailed
                            ? 'bg-red-50/30 hover:bg-red-50/50'
                            : isProd
                            ? 'hover:bg-orange-50/20'
                            : 'hover:bg-blue-50/30'
                        }`}
                      >
                        <td className="px-4 py-3 font-mono text-[11px] text-gray-400 whitespace-nowrap">{dp.docNo}</td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="font-mono text-[12px] text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded">{dp.version}</span>
                        </td>
                        <td className="px-4 py-3 max-w-[240px]">
                          <span className="text-[13px] text-gray-800 font-medium truncate block group-hover:text-brand transition-colors">{dp.title}</span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap"><DeployTypeBadge type={dp.type} /></td>
                        <td className="px-3 py-3 whitespace-nowrap"><DeployEnvBadge env={dp.env} /></td>
                        <td className="px-3 py-3 whitespace-nowrap"><DeployStatusBadge status={dp.status} /></td>
                        <td className="px-3 py-3 whitespace-nowrap"><span className="text-[12px] text-gray-600">{dp.manager}</span></td>
                        <td className="px-3 py-3 whitespace-nowrap"><DeployDateCell date={dp.deployDate} status={dp.status} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={data?.page ?? page} totalPages={data?.totalPages ?? 1} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}

function DeployDateCell({ date, status }: { date: string; status: DeployStatus }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const d = new Date(date)
  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (status === '완료') {
    return <span className="text-[12px] text-gray-400">{date.slice(5)}</span>
  }
  if (status === '실패' || status === '롤백') {
    return <span className="text-[12px] text-red-400">{date.slice(5)}</span>
  }
  if (diff < 0) {
    return <span className="text-[12px] text-red-500 font-semibold">{date.slice(5)}</span>
  }
  if (diff <= 7) {
    return (
      <span className="text-[12px] text-amber-600 font-semibold">
        {date.slice(5)} <span className="text-[10px]">(D-{diff})</span>
      </span>
    )
  }
  return <span className="text-[12px] text-gray-500">{date.slice(5)}</span>
}
