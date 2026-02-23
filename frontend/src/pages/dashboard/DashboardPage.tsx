import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import KpiCard from '@/components/dashboard/KpiCard'
import { TypeBadge, PriorityBadge, StatusBadge } from '@/components/work-request/Badges'
import { SortTh, type SortDir } from '@/components/common/TableControls'
import type { WorkRequest } from '@/types/work-request'

// ── 달력 이벤트 타입 ──────────────────────────────────
type CalEvent = { day: number; docNo: string; title: string; priority: WorkRequest['priority'] }

// ── 타입 ─────────────────────────────────────────────
type TabKey = 'all' | 'mine' | 'team'
type KpiKey = 'todo' | 'inProgress' | 'done' | 'urgent'
type DashSortKey = 'priority' | 'deadline'

const PRIORITY_ORDER_DASH: Record<string, number> = { '긴급': 0, '높음': 1, '보통': 2, '낮음': 3 }

// ── 샘플 데이터 ───────────────────────────────────────
const SAMPLE_REQUESTS: WorkRequest[] = [
  {
    id: '1',
    docNo: 'WR-051',
    title: '모바일 PDA 화면 레이아웃 개선 요청',
    type: '기능개선',
    priority: '높음',
    status: '개발중',
    assignee: '김개발',
    deadline: '2026-02-25',
  },
  {
    id: '2',
    docNo: 'WR-050',
    title: '신규 계좌 개설 프로세스 자동화',
    type: '신규개발',
    priority: '긴급',
    status: '검토중',
    assignee: '이설계',
    deadline: '2026-02-22',
  },
  {
    id: '3',
    docNo: 'WR-049',
    title: '잔고 조회 API 응답 지연 버그 수정',
    type: '버그수정',
    priority: '긴급',
    status: '테스트중',
    assignee: '박테스터',
    deadline: '2026-02-21',
  },
  {
    id: '4',
    docNo: 'WR-048',
    title: 'AWS S3 스토리지 용량 확장',
    type: '인프라',
    priority: '보통',
    status: '완료',
    assignee: '최인프라',
    deadline: '2026-02-18',
  },
  {
    id: '5',
    docNo: 'WR-047',
    title: '로그인 세션 만료 시간 정책 변경',
    type: '기능개선',
    priority: '낮음',
    status: '접수대기',
    assignee: '미배정',
    deadline: '2026-03-05',
  },
  {
    id: '6',
    docNo: 'WR-046',
    title: '주문 내역 엑셀 다운로드 기능 추가',
    type: '신규개발',
    priority: '보통',
    status: '개발중',
    assignee: '김개발',
    deadline: '2026-02-28',
  },
]

const NOTIFICATIONS = [
  { id: 1, type: 'assign', text: 'WR-051이 나에게 배정되었습니다', time: '5분 전' },
  { id: 2, type: 'comment', text: '이설계님이 WR-048에 댓글을 남겼습니다', time: '32분 전' },
  { id: 3, type: 'deadline', text: 'WR-049 마감일이 오늘입니다', time: '1시간 전' },
  { id: 4, type: 'complete', text: 'WR-044 배포가 완료되었습니다', time: '3시간 전' },
]

// 2026년 2월 마감 일정 (SAMPLE_REQUESTS에서 파생)
const CAL_EVENTS: CalEvent[] = [
  { day: 18, docNo: 'WR-048', title: 'AWS S3 스토리지 용량 확장',          priority: '보통' },
  { day: 21, docNo: 'WR-049', title: '잔고 조회 API 응답 지연 버그 수정',   priority: '긴급' },
  { day: 22, docNo: 'WR-050', title: '신규 계좌 개설 프로세스 자동화',      priority: '긴급' },
  { day: 25, docNo: 'WR-051', title: '모바일 PDA 화면 레이아웃 개선 요청', priority: '높음' },
  { day: 28, docNo: 'WR-046', title: '주문 내역 엑셀 다운로드 기능 추가',   priority: '보통' },
]

// ── 메인 컴포넌트 ────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [activeKpi, setActiveKpi] = useState<KpiKey | null>(null)
  const [sort, setSort] = useState<{ key: DashSortKey; dir: SortDir }>({ key: 'deadline', dir: 'asc' })

  const kpiItems: Record<KpiKey, WorkRequest[]> = {
    todo: SAMPLE_REQUESTS.filter(r => r.assignee !== '미배정'),
    inProgress: SAMPLE_REQUESTS.filter(r => r.status === '개발중' || r.status === '테스트중' || r.status === '검토중'),
    done: SAMPLE_REQUESTS.filter(r => r.status === '완료'),
    urgent: SAMPLE_REQUESTS.filter(r => {
      const diff = Math.ceil((new Date(r.deadline).getTime() - new Date('2026-02-21').getTime()) / 86400000)
      return diff >= 0 && diff <= 3
    }),
  }

  const sortedRequests = [...SAMPLE_REQUESTS].sort((a, b) => {
    const v = sort.dir === 'asc' ? 1 : -1
    if (sort.key === 'priority') return ((PRIORITY_ORDER_DASH[a.priority] ?? 9) - (PRIORITY_ORDER_DASH[b.priority] ?? 9)) * v
    return (a.deadline > b.deadline ? 1 : -1) * v
  })

  const handleDashSort = (key: string) => {
    const k = key as DashSortKey
    setSort(prev => prev.key === k ? { key: k, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'asc' })
  }

  return (
    <div className="p-6 space-y-5">
      {/* KPI 카드 */}
      {activeKpi && <div className="fixed inset-0 z-40" onClick={() => setActiveKpi(null)} />}
      <div className="grid grid-cols-4 gap-4">
        {([
          { key: 'todo' as KpiKey,       label: '나의 할일',   value: 12, sub: '미처리 업무',        color: 'brand'   as const, icon: <TodoIcon /> },
          { key: 'inProgress' as KpiKey, label: '진행중',      value: 8,  sub: '현재 작업 중인 항목', color: 'blue'    as const, icon: <ProgressIcon /> },
          { key: 'done' as KpiKey,       label: '이번주 완료', value: 5,  sub: '2/17 — 2/21 완료',   color: 'emerald' as const, icon: <CheckIcon /> },
          { key: 'urgent' as KpiKey,     label: '마감임박',    value: 3,  sub: '3일 이내 마감',       color: 'red'     as const, icon: <DeadlineIcon /> },
        ]).map((kpi, idx) => (
          <div key={kpi.key} className="relative">
            <div onClick={() => setActiveKpi(prev => prev === kpi.key ? null : kpi.key)} className="cursor-pointer">
              <KpiCard label={kpi.label} value={kpi.value} sub={kpi.sub} color={kpi.color} icon={kpi.icon} />
            </div>
            {activeKpi === kpi.key && (
              <div className={`absolute top-full mt-1.5 z-50 w-72 bg-white rounded-xl border border-blue-100 shadow-[0_8px_32px_rgba(30,58,138,0.14)] overflow-hidden ${idx >= 2 ? 'right-0' : 'left-0'}`}>
                <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-gray-700">{kpi.label}</p>
                  <span className="text-[11px] text-brand font-bold">{kpiItems[kpi.key].length}건</span>
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {kpiItems[kpi.key].length === 0 ? (
                    <p className="px-4 py-5 text-center text-[12px] text-gray-400">해당 항목이 없습니다</p>
                  ) : (
                    kpiItems[kpi.key].map(r => (
                      <button
                        key={r.id}
                        onClick={(e) => { e.stopPropagation(); setActiveKpi(null); navigate(`/work-requests/${r.id}`) }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-blue-50/40 transition-colors text-left border-b border-gray-50 last:border-0"
                      >
                        <span className="font-mono text-[10px] text-gray-400 flex-shrink-0">{r.docNo}</span>
                        <span className="text-[12px] text-gray-700 flex-1 truncate">{r.title}</span>
                      </button>
                    ))
                  )}
                </div>
                <div className="px-4 py-2 border-t border-gray-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveKpi(null); navigate('/work-requests') }}
                    className="text-[11px] text-brand hover:underline"
                  >
                    전체 업무요청 보기 →
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 본문 2열 */}
      <div className="flex gap-4 items-start">
        {/* 업무요청 테이블 */}
        <div className="flex-1 min-w-0 bg-white rounded-xl shadow-[0_2px_12px_rgba(30,58,138,0.07)] border border-blue-50 overflow-hidden">
          {/* 탭 헤더 */}
          <div className="flex items-center justify-between px-5 pt-4 pb-0 border-b border-gray-100">
            <div className="flex gap-1">
              {([
                { key: 'all', label: '전체' },
                { key: 'mine', label: '내 할일' },
                { key: 'team', label: '팀별' },
              ] as { key: TabKey; label: string }[]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                    activeTab === tab.key
                      ? 'border-brand text-brand'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-400 pb-2">총 {SAMPLE_REQUESTS.length}건</span>
          </div>

          {/* 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/70">
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">문서번호</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 tracking-wide">제목</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">유형</th>
                  <SortTh label="우선순위" sortKey="priority" current={sort} onSort={handleDashSort} />
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">상태</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">담당자</th>
                  <SortTh label="마감일" sortKey="deadline" current={sort} onSort={handleDashSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedRequests.map((req) => (
                  <tr key={req.id} onClick={() => navigate(`/work-requests/${req.id}`)} className="hover:bg-blue-50/30 transition-colors cursor-pointer group">
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-400 whitespace-nowrap">
                      {req.docNo}
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <span className="text-gray-800 text-[13px] font-medium truncate block group-hover:text-brand transition-colors">
                        {req.title}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <TypeBadge type={req.type} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <PriorityBadge priority={req.priority} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-[12px] text-gray-600">{req.assignee}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <DeadlineBadge date={req.deadline} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 우측 패널 */}
        <div className="w-[268px] flex-shrink-0 space-y-4">
          {/* 미니 캘린더 */}
          <MiniCalendar events={CAL_EVENTS} />

          {/* 알림 피드 */}
          <div className="bg-white rounded-xl shadow-[0_2px_12px_rgba(30,58,138,0.07)] border border-blue-50 p-4">
            <p className="text-[12px] font-semibold text-gray-700 mb-3">최근 알림</p>
            <div className="space-y-2.5">
              {NOTIFICATIONS.map((n) => (
                <div key={n.id} className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-brand/8 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <NotifIcon type={n.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-600 leading-relaxed">{n.text}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 미니 캘린더 ────────────────────────────────────────
const PRIORITY_DOT: Record<WorkRequest['priority'], string> = {
  '긴급': 'bg-red-500',
  '높음': 'bg-orange-400',
  '보통': 'bg-blue-400',
  '낮음': 'bg-gray-300',
}

function MiniCalendar({ events }: { events: CalEvent[] }) {
  const today = 21
  const year = 2026
  const month = 2
  const firstDay = 0
  const daysInMonth = 28
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const byDay: Record<number, CalEvent[]> = {}
  events.forEach((e) => {
    if (!byDay[e.day]) byDay[e.day] = []
    byDay[e.day].push(e)
  })

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const selectedEvents = selectedDay ? (byDay[selectedDay] ?? []) : []
  const upcoming = events.filter((e) => e.day >= today)

  return (
    <div className="bg-white rounded-xl shadow-[0_2px_12px_rgba(30,58,138,0.07)] border border-blue-50 p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-semibold text-gray-700">{year}년 {month}월</p>
        <div className="flex gap-1">
          <button className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M6.5 2L3.5 5L6.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3.5 2L6.5 5L3.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
          <div key={d} className={`text-center text-[10px] font-semibold py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />
          const isToday = day === today
          const isSelected = day === selectedDay
          const dayEvents = byDay[day] ?? []
          const col = idx % 7
          const isSun = col === 0
          const isSat = col === 6

          return (
            <div key={day} className="flex flex-col items-center py-0.5">
              <button
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`w-6 h-6 rounded-full text-[11px] font-medium flex items-center justify-center transition-colors ${
                  isToday
                    ? 'bg-brand text-white font-bold'
                    : isSelected
                    ? 'bg-brand/10 text-brand font-semibold ring-1 ring-brand/30'
                    : 'hover:bg-gray-100 ' + (isSun ? 'text-red-400' : isSat ? 'text-blue-500' : 'text-gray-700')
                }`}
              >
                {day}
              </button>
              {/* 우선순위별 컬러 점 */}
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <span key={i} className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-white/70' : PRIORITY_DOT[e.priority]}`} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 선택된 날짜 이벤트 OR 다가오는 마감 */}
      <div className="mt-3 pt-3 border-t border-gray-100 min-h-[88px]">
        {selectedDay && selectedEvents.length > 0 ? (
          <>
            <p className="text-[10px] font-semibold text-gray-400 mb-2">{month}/{selectedDay} 마감</p>
            <div className="space-y-1.5">
              {selectedEvents.map((e) => (
                <div key={e.docNo} className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[e.priority]}`} />
                  <span className="font-mono text-[10px] text-gray-400 flex-shrink-0">{e.docNo}</span>
                  <span className="text-[11px] text-gray-600 truncate">{e.title}</span>
                </div>
              ))}
            </div>
          </>
        ) : selectedDay && selectedEvents.length === 0 ? (
          <p className="text-[11px] text-gray-400 text-center py-1">{month}/{selectedDay}에 마감 일정이 없습니다</p>
        ) : (
          <>
            <p className="text-[10px] font-semibold text-gray-400 mb-2">다가오는 마감</p>
            <div className="space-y-1.5">
              {upcoming.map((e) => (
                <div key={e.docNo} className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[e.priority]}`} />
                  <span className="text-[10px] text-gray-400 flex-shrink-0 font-medium">{month}/{e.day}</span>
                  <span className="text-[11px] text-gray-600 truncate">{e.title}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}


// ── 마감일 뱃지 ──────────────────────────────────────
function DeadlineBadge({ date }: { date: string }) {
  const today = new Date('2026-02-21')
  const d = new Date(date)
  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  let cls = 'text-gray-500'
  if (diff < 0) cls = 'text-red-500 font-semibold'
  else if (diff <= 3) cls = 'text-orange-500 font-semibold'

  return <span className={`text-[12px] ${cls}`}>{date.slice(5)}</span>
}

// ── 알림 아이콘 ───────────────────────────────────────
function NotifIcon({ type }: { type: string }) {
  if (type === 'assign') return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <circle cx="5.5" cy="3.5" r="1.8" stroke="#0046ff" strokeWidth="1.1" />
      <path d="M1.5 9.5C1.5 7.84 3.32 6.5 5.5 6.5C7.68 6.5 9.5 7.84 9.5 9.5" stroke="#0046ff" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
  if (type === 'comment') return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <path d="M1.5 1.5H8.5C8.78 1.5 9 1.72 9 2V6C9 6.28 8.78 6.5 8.5 6.5H5L2.5 9V6.5H1.5C1.22 6.5 1 6.28 1 6V2C1 1.72 1.22 1.5 1.5 1.5Z" stroke="#0046ff" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  )
  if (type === 'deadline') return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <circle cx="5.5" cy="5.5" r="4" stroke="#f59e0b" strokeWidth="1.1" />
      <path d="M5.5 3V5.5L7 7" stroke="#f59e0b" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <path d="M5.5 1L10 9H1L5.5 1Z" stroke="#10b981" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  )
}

// ── KPI 아이콘 ────────────────────────────────────────
function TodoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 8L7 10L11 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ProgressIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" strokeDasharray="3 2" />
      <path d="M8 4V8L11 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 8L7 10.5L11 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DeadlineIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.5L14.5 13H1.5L8 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <line x1="8" y1="6" x2="8" y2="9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="11.5" r="0.6" fill="currentColor" />
    </svg>
  )
}
