import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DeployTypeBadge, DeployEnvBadge, DeployStatusBadge } from '@/components/deployment/Badges'
import { FilterSelect, SortTh, Pagination, type SortDir } from '@/components/common/TableControls'
import { PlusIcon, SearchIcon } from '@/components/common/Icons'
import type { Deployment, DeployType, DeployEnv, DeployStatus } from '@/types/deployment'

// ── 샘플 데이터 ───────────────────────────────────────
const SAMPLE_DATA: Deployment[] = [
  { id: '1',  docNo: 'DP-018', title: 'v2.3.0 2월 정기 배포',                  version: 'v2.3.0', type: '정기배포', env: '운영',    status: '대기',   manager: '최인프라', deployDate: '2026-02-28' },
  { id: '2',  docNo: 'DP-017', title: 'v2.3.0 스테이징 검증 배포',              version: 'v2.3.0', type: '정기배포', env: '스테이징', status: '진행중', manager: '최인프라', deployDate: '2026-02-24' },
  { id: '3',  docNo: 'DP-016', title: 'v2.2.5 긴급패치 — 권한 누락 수정',       version: 'v2.2.5', type: '긴급패치', env: '운영',    status: '완료',   manager: '최인프라', deployDate: '2026-02-21' },
  { id: '4',  docNo: 'DP-015', title: 'v2.2.4 핫픽스 — JWT 보안 취약점 패치',   version: 'v2.2.4', type: '핫픽스',   env: '운영',    status: '완료',   manager: '김개발',   deployDate: '2026-02-17' },
  { id: '5',  docNo: 'DP-014', title: 'v2.2.3 스테이징 배포',                   version: 'v2.2.3', type: '정기배포', env: '스테이징', status: '완료',   manager: '최인프라', deployDate: '2026-02-14' },
  { id: '6',  docNo: 'DP-013', title: 'v2.2.3 개발 서버 배포',                  version: 'v2.2.3', type: '정기배포', env: '개발',    status: '완료',   manager: '이설계',   deployDate: '2026-02-10' },
  { id: '7',  docNo: 'DP-012', title: 'v2.2.2 운영 배포 실패 후 롤백',           version: 'v2.2.2', type: '롤백',     env: '운영',    status: '롤백',   manager: '최인프라', deployDate: '2026-02-05' },
  { id: '8',  docNo: 'DP-011', title: 'v2.2.2 운영 정기 배포',                  version: 'v2.2.2', type: '정기배포', env: '운영',    status: '실패',   manager: '최인프라', deployDate: '2026-02-05' },
  { id: '9',  docNo: 'DP-010', title: 'v2.2.2 스테이징 검증',                   version: 'v2.2.2', type: '정기배포', env: '스테이징', status: '완료',   manager: '최인프라', deployDate: '2026-02-03' },
  { id: '10', docNo: 'DP-009', title: 'v2.4.0 3월 정기 배포 (예정)',             version: 'v2.4.0', type: '정기배포', env: '운영',    status: '대기',   manager: '최인프라', deployDate: '2026-03-28' },
  { id: '11', docNo: 'DP-008', title: 'v2.4.0 스테이징 사전 검증',              version: 'v2.4.0', type: '정기배포', env: '스테이징', status: '대기',   manager: '최인프라', deployDate: '2026-03-24' },
  { id: '12', docNo: 'DP-007', title: 'v2.3.1 개발 빌드 배포',                  version: 'v2.3.1', type: '기타',     env: '개발',    status: '대기',   manager: '김개발',   deployDate: '2026-03-05' },
]

const PAGE_SIZE = 10
type SortKey = 'docNo' | 'deployDate'

const today = new Date('2026-02-22')
const nextWeek = new Date('2026-02-22')
nextWeek.setDate(nextWeek.getDate() + 7)

export default function DeploymentsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<DeployType | '전체'>('전체')
  const [filterEnv, setFilterEnv] = useState<DeployEnv | '전체'>('전체')
  const [filterStatus, setFilterStatus] = useState<DeployStatus | '전체'>('전체')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'deployDate', dir: 'asc' })
  const [page, setPage] = useState(1)

  const filtered = SAMPLE_DATA.filter((r) => {
    const matchSearch = search === '' || r.title.includes(search) || r.docNo.includes(search) || r.version.includes(search)
    const matchType = filterType === '전체' || r.type === filterType
    const matchEnv = filterEnv === '전체' || r.env === filterEnv
    const matchStatus = filterStatus === '전체' || r.status === filterStatus
    return matchSearch && matchType && matchEnv && matchStatus
  })

  const sorted = [...filtered].sort((a, b) => {
    const v = sort.dir === 'asc' ? 1 : -1
    if (sort.key === 'docNo') return a.docNo > b.docNo ? v : -v
    return a.deployDate > b.deployDate ? v : -v
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSort = (key: string) => {
    const k = key as SortKey
    setSort((prev) => prev.key === k ? { key: k, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'asc' })
  }

  const resetFilters = () => {
    setSearch(''); setFilterType('전체'); setFilterEnv('전체'); setFilterStatus('전체'); setPage(1)
  }

  const isFiltered = search || filterType !== '전체' || filterEnv !== '전체' || filterStatus !== '전체'

  // 요약
  const upcomingCount = SAMPLE_DATA.filter((r) => {
    const d = new Date(r.deployDate)
    return d >= today && d <= nextWeek && r.status === '대기'
  }).length
  const inProgressCount = SAMPLE_DATA.filter((r) => r.status === '진행중').length
  const prodCount = SAMPLE_DATA.filter((r) => r.env === '운영' && r.status === '완료').length
  const failCount = SAMPLE_DATA.filter((r) => r.status === '실패' || r.status === '롤백').length

  return (
    <div className="p-6 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-gray-900">배포 관리</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">총 {filtered.length}건</p>
        </div>
        <button
          onClick={() => navigate('/deployments/new')}
          className="flex items-center gap-1.5 h-8 px-3 bg-brand hover:bg-brand-hover text-white text-[13px] font-semibold rounded-lg transition-colors"
        >
          <PlusIcon />
          배포 등록
        </button>
      </div>

      {/* 요약 바 */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '이번주 예정', value: upcomingCount,  cls: 'text-brand',       dot: 'bg-brand' },
          { label: '진행중',     value: inProgressCount, cls: 'text-blue-500',    dot: 'bg-blue-400' },
          { label: '운영 완료',  value: prodCount,       cls: 'text-emerald-600', dot: 'bg-emerald-400' },
          { label: '실패/롤백',  value: failCount,       cls: 'text-red-500',     dot: 'bg-red-400' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-4 py-3 flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot}`} />
            <span className="text-[12px] text-gray-400 flex-1">{s.label}</span>
            <span className={`text-[20px] font-bold tabular-nums ${s.cls}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* 필터 바 */}
      <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"><SearchIcon /></span>
          <input
            type="text"
            placeholder="제목, 버전, 문서번호 검색"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
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

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_12px_rgba(30,58,138,0.07)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <SortTh label="문서번호" sortKey="docNo" current={sort} onSort={handleSort} />
                <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">버전</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 tracking-wide">제목</th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">유형</th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">환경</th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">상태</th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">담당자</th>
                <SortTh label="배포 예정일" sortKey="deployDate" current={sort} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[13px] text-gray-400">검색 결과가 없습니다</td>
                </tr>
              ) : (
                paginated.map((dp) => {
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
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  )
}

// ── 배포일 셀 ─────────────────────────────────────────
function DeployDateCell({ date, status }: { date: string; status: DeployStatus }) {
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

