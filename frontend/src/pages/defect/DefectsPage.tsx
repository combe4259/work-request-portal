import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DefectTypeBadge, SeverityBadge, DefectStatusBadge } from '@/components/defect/Badges'
import { FilterSelect, SortTh, Pagination, DeadlineCell, type SortDir } from '@/components/common/TableControls'
import { PlusIcon, SearchIcon } from '@/components/common/Icons'
import type { Defect, DefectType, Severity, DefectStatus } from '@/types/defect'

// ── 샘플 데이터 ───────────────────────────────────────
const SAMPLE_DATA: Defect[] = [
  { id: '1',  docNo: 'DF-034', title: 'Galaxy S23에서 메인 메뉴 버튼 화면 밖 이탈',        type: 'UI',   severity: '높음',   status: '수정중',  reporter: '박테스터', assignee: '김개발',   relatedDoc: 'TS-018', deadline: '2026-02-25' },
  { id: '2',  docNo: 'DF-033', title: '계좌 개설 4단계 이후 세션 강제 만료 현상',           type: '기능', severity: '치명적', status: '분석중',  reporter: '박테스터', assignee: '이설계',   relatedDoc: 'TS-017', deadline: '2026-02-23' },
  { id: '3',  docNo: 'DF-032', title: '잔고 조회 API P99 응답시간 기준 초과 (3.2s)',        type: '성능', severity: '높음',   status: '수정중',  reporter: '이설계',   assignee: '이설계',   relatedDoc: 'TS-011', deadline: '2026-02-26' },
  { id: '4',  docNo: 'DF-031', title: 'JWT refresh token 탈취 가능 취약점',               type: '보안', severity: '치명적', status: '완료',    reporter: '박테스터', assignee: '박테스터', relatedDoc: 'TS-012', deadline: '2026-02-17' },
  { id: '5',  docNo: 'DF-030', title: '로그인 세션 만료 후 이전 페이지 캐시 노출',          type: '보안', severity: '보통',   status: '검증중',  reporter: '박테스터', assignee: '김개발',   relatedDoc: 'TS-014', deadline: '2026-03-01' },
  { id: '6',  docNo: 'DF-029', title: '엑셀 다운로드 시 일부 특수문자 깨짐 현상',           type: '데이터', severity: '보통', status: '수정중',  reporter: '박테스터', assignee: '김개발',   relatedDoc: 'TS-013', deadline: '2026-02-27' },
  { id: '7',  docNo: 'DF-028', title: '결제 완료 후 잔고 즉시 반영 안 됨 (2~5초 지연)',    type: '기능', severity: '높음',   status: '완료',    reporter: '박테스터', assignee: '이설계',   relatedDoc: 'TS-010', deadline: '2026-02-11' },
  { id: '8',  docNo: 'DF-027', title: '관리자 메뉴 일반 사용자 접근 가능 (권한 누락)',      type: '보안', severity: '치명적', status: '접수',    reporter: '박테스터', assignee: '미배정',   relatedDoc: 'TS-009', deadline: '2026-03-05' },
  { id: '9',  docNo: 'DF-026', title: '거래 내역 1만 건 이상 조회 시 타임아웃',            type: '성능', severity: '높음',   status: '보류',    reporter: '이설계',   assignee: '미배정',   relatedDoc: 'TS-007', deadline: '2026-03-10' },
  { id: '10', docNo: 'DF-025', title: 'iOS Safari에서 날짜 선택 UI 렌더링 오류',           type: 'UI',   severity: '낮음',   status: '재현불가', reporter: '박테스터', assignee: '김개발',   relatedDoc: 'TS-018', deadline: '2026-02-28' },
  { id: '11', docNo: 'DF-024', title: 'S3 업로드 파일명 한글 포함 시 인코딩 오류',          type: '데이터', severity: '보통', status: '완료',    reporter: '최인프라', assignee: '최인프라', relatedDoc: 'TS-015', deadline: '2026-02-16' },
  { id: '12', docNo: 'DF-023', title: '푸시 알림 수신 후 앱 재시작 시 중복 표시',           type: '기능', severity: '낮음',   status: '접수',    reporter: '박테스터', assignee: '미배정',   relatedDoc: 'WR-045', deadline: '2026-03-07' },
]

const PAGE_SIZE = 10
type SortKey = 'docNo' | 'deadline' | 'severity'

// 심각도 정렬 순서
const SEVERITY_ORDER: Record<Severity, number> = { '치명적': 0, '높음': 1, '보통': 2, '낮음': 3 }

export default function DefectsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<DefectType | '전체'>('전체')
  const [filterSeverity, setFilterSeverity] = useState<Severity | '전체'>('전체')
  const [filterStatus, setFilterStatus] = useState<DefectStatus | '전체'>('전체')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'severity', dir: 'asc' })
  const [page, setPage] = useState(1)

  const filtered = SAMPLE_DATA.filter((r) => {
    const matchSearch = search === '' || r.title.includes(search) || r.docNo.includes(search)
    const matchType = filterType === '전체' || r.type === filterType
    const matchSeverity = filterSeverity === '전체' || r.severity === filterSeverity
    const matchStatus = filterStatus === '전체' || r.status === filterStatus
    return matchSearch && matchType && matchSeverity && matchStatus
  })

  const sorted = [...filtered].sort((a, b) => {
    const v = sort.dir === 'asc' ? 1 : -1
    if (sort.key === 'severity') return (SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]) * v
    if (sort.key === 'docNo') return a.docNo > b.docNo ? v : -v
    return a.deadline > b.deadline ? v : -v
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSort = (key: string) => {
    const k = key as SortKey
    setSort((prev) => prev.key === k ? { key: k, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'asc' })
  }

  const resetFilters = () => {
    setSearch(''); setFilterType('전체'); setFilterSeverity('전체'); setFilterStatus('전체'); setPage(1)
  }

  const isFiltered = search || filterType !== '전체' || filterSeverity !== '전체' || filterStatus !== '전체'

  // 심각도 요약
  const criticalCount = SAMPLE_DATA.filter((r) => r.severity === '치명적' && r.status !== '완료' && r.status !== '재현불가').length
  const openCount = SAMPLE_DATA.filter((r) => !['완료', '재현불가'].includes(r.status)).length
  const fixingCount = SAMPLE_DATA.filter((r) => r.status === '수정중').length
  const doneCount = SAMPLE_DATA.filter((r) => r.status === '완료').length

  return (
    <div className="p-6 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-gray-900">결함 목록</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">총 {filtered.length}건</p>
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
          { label: '미해결',  value: openCount,     cls: 'text-gray-700',    dot: 'bg-gray-400' },
          { label: '치명적',  value: criticalCount,  cls: 'text-red-600',     dot: 'bg-red-500' },
          { label: '수정중',  value: fixingCount,    cls: 'text-amber-600',   dot: 'bg-amber-400' },
          { label: '완료',    value: doneCount,      cls: 'text-emerald-600', dot: 'bg-emerald-400' },
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <SortTh label="문서번호" sortKey="docNo" current={sort} onSort={handleSort} />
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 tracking-wide">제목</th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">유형</th>
                <SortTh label="심각도" sortKey="severity" current={sort} onSort={handleSort} />
                <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">상태</th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">발견자</th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">담당자</th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">연관문서</th>
                <SortTh label="마감일" sortKey="deadline" current={sort} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-[13px] text-gray-400">검색 결과가 없습니다</td>
                </tr>
              ) : (
                paginated.map((df) => (
                  <tr
                    key={df.id}
                    onClick={() => navigate(`/defects/${df.id}`)}
                    className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-400 whitespace-nowrap">{df.docNo}</td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <span className="text-[13px] text-gray-800 font-medium truncate block group-hover:text-brand transition-colors">{df.title}</span>
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
