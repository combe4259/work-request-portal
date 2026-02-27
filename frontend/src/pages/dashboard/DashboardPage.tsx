import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import KpiCard from '@/components/dashboard/KpiCard'
import { PriorityBadge, TypeBadge, StatusBadge } from '@/components/work-request/Badges'
import { SortTh, type SortDir } from '@/components/common/TableControls'
import { EmptyState } from '@/components/common/AsyncState'
import ShowMoreButton from '@/components/common/ShowMoreButton'
import { TechTypeBadge } from '@/components/tech-task/Badges'
import { TestTypeBadge, TestStatusBadge } from '@/components/test-scenario/Badges'
import { DefectTypeBadge, DefectStatusBadge } from '@/components/defect/Badges'
import { DeployTypeBadge, DeployStatusBadge } from '@/components/deployment/Badges'
import { useDashboardSummaryQuery } from '@/features/dashboard/queries'
import type { DashboardDomain, DashboardDomainFilter, DashboardScope } from '@/features/dashboard/service'
import { useDashboardNotificationsQuery } from '@/features/notification/queries'
import { getNotificationRoute } from '@/features/notification/routes'
import { useExpandableList } from '@/hooks/useExpandableList'
import { useAuthStore } from '@/stores/authStore'
import type { Priority, RequestType, Status as WorkRequestStatus } from '@/types/work-request'
import type { TechTaskType, Status as TechTaskStatus } from '@/types/tech-task'
import type { TestScenarioType, TestStatus } from '@/types/test-scenario'
import type { DefectType, DefectStatus } from '@/types/defect'
import type { DeployType, DeployStatus } from '@/types/deployment'

type CalEvent = {
  date: string
  docNo: string
  title: string
  priority: Priority | '-'
  domainLabel: string
}

type ActionScope = DashboardScope
type KpiKey = 'todo' | 'inProgress' | 'done' | 'urgent'
type DashSortKey = 'domain' | 'priority' | 'deadline' | 'status'
type DomainKey = DashboardDomain
type DomainFilter = DashboardDomainFilter

interface UnifiedBoardItem {
  id: number
  docNo: string
  title: string
  domainKey: DomainKey
  domainLabel: string
  type: string
  priority: Priority | '-'
  status: string
  assignee: string
  deadline: string
  route: string
}

const PRIORITY_ORDER_DASH: Record<string, number> = { '긴급': 0, '높음': 1, '보통': 2, '낮음': 3, '-': 9 }
const DOMAIN_ORDER_DASH: Record<DomainKey, number> = {
  WORK_REQUEST: 0,
  TECH_TASK: 1,
  TEST_SCENARIO: 2,
  DEFECT: 3,
  DEPLOYMENT: 4,
}

const DOMAIN_FILTER_OPTIONS: Array<{ key: DomainFilter; label: string }> = [
  { key: 'ALL', label: '전체' },
  { key: 'WORK_REQUEST', label: '업무요청' },
  { key: 'TECH_TASK', label: '기술과제' },
  { key: 'TEST_SCENARIO', label: '테스트 시나리오' },
  { key: 'DEFECT', label: '결함' },
  { key: 'DEPLOYMENT', label: '배포' },
]

const IN_PROGRESS_STATUSES = new Set([
  '검토중',
  '승인됨',
  '개발중',
  '테스트중',
  '실행중',
  '수정중',
  '검증중',
  '분석중',
  '진행중',
  '대기',
])

function parseDateOnly(value: string): Date | null {
  if (!value) {
    return null
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  parsed.setHours(0, 0, 0, 0)
  return parsed
}

function getDaysDiffFromToday(value: string): number | null {
  const target = parseDateOnly(value)
  if (!target) {
    return null
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

function isClosed(item: UnifiedBoardItem): boolean {
  if (item.domainKey === 'WORK_REQUEST' || item.domainKey === 'TECH_TASK') {
    return item.status === '완료' || item.status === '반려'
  }
  if (item.domainKey === 'TEST_SCENARIO') {
    return item.status === '통과' || item.status === '실패' || item.status === '보류'
  }
  if (item.domainKey === 'DEFECT') {
    return item.status === '완료' || item.status === '재현불가' || item.status === '보류'
  }
  return item.status === '완료' || item.status === '실패' || item.status === '롤백'
}

function isUrgent(item: UnifiedBoardItem): boolean {
  const diff = getDaysDiffFromToday(item.deadline)
  return diff != null && diff >= 0 && diff <= 3 && !isClosed(item)
}

function toDomainLabel(domain: DomainKey): string {
  if (domain === 'WORK_REQUEST') {
    return '업무요청'
  }
  if (domain === 'TECH_TASK') {
    return '기술과제'
  }
  if (domain === 'TEST_SCENARIO') {
    return '테스트 시나리오'
  }
  if (domain === 'DEFECT') {
    return '결함'
  }
  return '배포'
}

function toDetailRoute(domain: DomainKey, id: number): string {
  if (domain === 'WORK_REQUEST') {
    return `/work-requests/${id}`
  }
  if (domain === 'TECH_TASK') {
    return `/tech-tasks/${id}`
  }
  if (domain === 'TEST_SCENARIO') {
    return `/test-scenarios/${id}`
  }
  if (domain === 'DEFECT') {
    return `/defects/${id}`
  }
  return `/deployments/${id}`
}

function mapDashboardItems(items: Array<{
  id: number
  domain: DomainKey
  docNo: string
  title: string
  type: string
  priority: Priority | '-'
  status: string
  assignee: string
  deadline: string
}>): UnifiedBoardItem[] {
  return items.map((item) => ({
    id: item.id,
    docNo: item.docNo,
    title: item.title,
    domainKey: item.domain,
    domainLabel: toDomainLabel(item.domain),
    type: item.type,
    priority: item.priority,
    status: item.status,
    assignee: item.assignee,
    deadline: item.deadline,
    route: toDetailRoute(item.domain, item.id),
  }))
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const currentUserId = useAuthStore((state) => state.user?.id)
  const currentTeamId = useAuthStore((state) => state.currentTeam?.id)
  const [actionScope, setActionScope] = useState<ActionScope>('mine')
  const [domainFilter, setDomainFilter] = useState<DomainFilter>('ALL')
  const [activeKpi, setActiveKpi] = useState<KpiKey | null>(null)
  const [sort, setSort] = useState<{ key: DashSortKey; dir: SortDir }>({ key: 'deadline', dir: 'asc' })

  const dashboardSummaryQuery = useDashboardSummaryQuery(currentTeamId, actionScope, domainFilter)
  const notificationsQuery = useDashboardNotificationsQuery(currentUserId)
  const notifications = notificationsQuery.data ?? []
  const visibleNotifications = useExpandableList(notifications, 10)

  const boardItems = useMemo<UnifiedBoardItem[]>(() => {
    return mapDashboardItems(dashboardSummaryQuery.data?.workRequests ?? [])
  }, [dashboardSummaryQuery.data?.workRequests])

  const handleNotificationNavigate = (refType: string | null, refId: number | null) => {
    const route = getNotificationRoute(refType, refId)
    if (route) {
      navigate(route)
    }
  }

  const kpiItems: Record<KpiKey, UnifiedBoardItem[]> = useMemo(() => ({
    todo: boardItems.filter((item) => !isClosed(item) && item.assignee !== '미배정'),
    inProgress: boardItems.filter((item) => IN_PROGRESS_STATUSES.has(item.status)),
    done: boardItems.filter((item) => isClosed(item)),
    urgent: boardItems.filter((item) => isUrgent(item)),
  }), [boardItems])

  const sortedItems = useMemo(() => {
    return [...boardItems].sort((a, b) => {
      const v = sort.dir === 'asc' ? 1 : -1
      if (sort.key === 'priority') {
        return ((PRIORITY_ORDER_DASH[a.priority] ?? 9) - (PRIORITY_ORDER_DASH[b.priority] ?? 9)) * v
      }
      if (sort.key === 'domain') {
        return (DOMAIN_ORDER_DASH[a.domainKey] - DOMAIN_ORDER_DASH[b.domainKey]) * v
      }
      if (sort.key === 'status') {
        return a.status.localeCompare(b.status, 'ko-KR') * v
      }
      const aDeadline = parseDateOnly(a.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER
      const bDeadline = parseDateOnly(b.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER
      return (aDeadline - bDeadline) * v
    })
  }, [boardItems, sort])

  const calendarEvents = useMemo<CalEvent[]>(() => {
    return (dashboardSummaryQuery.data?.calendarEvents ?? []).map((item) => ({
      date: item.date,
      docNo: item.docNo,
      title: item.title,
      priority: item.priority,
      domainLabel: toDomainLabel(item.domain),
    }))
  }, [dashboardSummaryQuery.data?.calendarEvents])

  const isBoardPending = dashboardSummaryQuery.isPending
  const isBoardError = dashboardSummaryQuery.isError

  const handleRefetchBoard = () => {
    void dashboardSummaryQuery.refetch()
  }

  const handleDashSort = (key: string) => {
    const k = key as DashSortKey
    setSort((prev) => prev.key === k ? { key: k, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'asc' })
  }

  const kpiSummary = dashboardSummaryQuery.data?.kpi ?? {
    todoCount: kpiItems.todo.length,
    inProgressCount: kpiItems.inProgress.length,
    doneCount: kpiItems.done.length,
    urgentCount: kpiItems.urgent.length,
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {activeKpi && <div className="fixed inset-0 z-40" onClick={() => setActiveKpi(null)} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {([
          { key: 'todo' as KpiKey, label: actionScope === 'mine' ? '내 액션' : '팀 액션', value: kpiSummary.todoCount, sub: '진행 필요 항목', color: 'brand' as const, icon: <TodoIcon /> },
          { key: 'inProgress' as KpiKey, label: '진행중', value: kpiSummary.inProgressCount, sub: '처리 중 항목', color: 'blue' as const, icon: <ProgressIcon /> },
          { key: 'done' as KpiKey, label: '완료/종결', value: kpiSummary.doneCount, sub: '종결된 항목', color: 'emerald' as const, icon: <CheckIcon /> },
          { key: 'urgent' as KpiKey, label: '마감임박', value: kpiSummary.urgentCount, sub: '3일 이내 마감', color: 'red' as const, icon: <DeadlineIcon /> },
        ]).map((kpi, idx) => (
          <div key={kpi.key} className="relative">
            <div onClick={() => setActiveKpi((prev) => prev === kpi.key ? null : kpi.key)} className="cursor-pointer">
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
                    kpiItems[kpi.key].map((item) => (
                      <button
                        key={`${item.domainKey}-${item.id}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveKpi(null)
                          navigate(item.route)
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-blue-50/40 transition-colors text-left border-b border-gray-50 last:border-0"
                      >
                        <span className="font-mono text-[10px] text-gray-400 flex-shrink-0">{item.docNo}</span>
                        <span className="text-[12px] text-gray-700 flex-1 truncate">{item.title}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_12px_rgba(30,58,138,0.07)] px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-gray-500 mr-1">도메인 필터</span>
          {DOMAIN_FILTER_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setDomainFilter(option.key)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                domainFilter === option.key
                  ? 'bg-brand text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-4 items-start">
        <div className="w-full flex-1 min-w-0 bg-white rounded-xl shadow-[0_2px_12px_rgba(30,58,138,0.07)] border border-blue-50 overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-50">
              <button
                type="button"
                onClick={() => setActionScope('mine')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  actionScope === 'mine' ? 'bg-white text-brand shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                내 액션
              </button>
              <button
                type="button"
                onClick={() => setActionScope('team')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  actionScope === 'team' ? 'bg-white text-brand shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                팀 전체
              </button>
            </div>
            <span className="text-xs text-gray-400">총 {sortedItems.length}건</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/70">
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">문서번호</th>
                  <SortTh label="도메인" sortKey="domain" current={sort} onSort={handleDashSort} />
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 tracking-wide">제목</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">유형</th>
                  <SortTh label="우선순위" sortKey="priority" current={sort} onSort={handleDashSort} />
                  <SortTh label="상태" sortKey="status" current={sort} onSort={handleDashSort} />
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">담당자</th>
                  <SortTh label="마감일" sortKey="deadline" current={sort} onSort={handleDashSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isBoardPending && sortedItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                      대시보드 데이터를 불러오는 중입니다.
                    </td>
                  </tr>
                ) : isBoardError && sortedItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center">
                      <button type="button" onClick={handleRefetchBoard} className="text-sm text-brand hover:underline">
                        대시보드 데이터를 불러오지 못했습니다. 다시 시도
                      </button>
                    </td>
                  </tr>
                ) : sortedItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-2">
                      <EmptyState
                        title={actionScope === 'mine' ? '내 액션 항목이 없습니다' : '표시할 항목이 없습니다'}
                        description={actionScope === 'mine' ? '현재 사용자에게 배정된 열린 항목이 없습니다.' : '문서를 등록하거나 필터를 변경해보세요.'}
                      />
                    </td>
                  </tr>
                ) : sortedItems.map((item) => (
                  <tr
                    key={`${item.domainKey}-${item.id}`}
                    className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                    onClick={() => navigate(item.route)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        navigate(item.route)
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`${item.docNo} 상세 보기`}
                  >
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-400 whitespace-nowrap">
                      <span className="inline-flex rounded group-focus-visible:outline-none group-focus-visible:ring-2 group-focus-visible:ring-brand/30">
                        {item.docNo}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <DomainBadge domain={item.domainLabel} />
                    </td>
                    <td className="px-4 py-3 max-w-[280px]">
                      <span className="text-gray-800 text-[13px] font-medium truncate block group-hover:text-brand transition-colors">
                        {item.title}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <TypePill item={item} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {item.priority === '-' ? (
                        <span className="text-[12px] text-gray-400">-</span>
                      ) : (
                        <PriorityBadge priority={item.priority} />
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <StatusPill item={item} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-[12px] text-gray-600">{item.assignee}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <DeadlineBadge date={item.deadline} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="w-full xl:w-[268px] flex-shrink-0 space-y-4">
          <MiniCalendar events={calendarEvents} />

          <div className="bg-white rounded-xl shadow-[0_2px_12px_rgba(30,58,138,0.07)] border border-blue-50 p-4">
            <p className="text-[12px] font-semibold text-gray-700 mb-3">최근 알림</p>
            {notificationsQuery.isPending ? (
              <p className="text-[11px] text-gray-400">알림을 불러오는 중입니다.</p>
            ) : notificationsQuery.isError ? (
              <button
                onClick={() => {
                  void notificationsQuery.refetch()
                }}
                className="text-[11px] text-brand hover:underline"
              >
                알림을 불러오지 못했습니다. 다시 시도
              </button>
            ) : notifications.length === 0 ? (
              <EmptyState title="새 알림이 없습니다" description="변경사항이 생기면 여기서 바로 확인할 수 있습니다." />
            ) : (
              <div className="space-y-2.5">
                {visibleNotifications.visibleItems.map((n) => {
                  const route = getNotificationRoute(n.refType, n.refId)
                  return (
                  <div key={n.id} className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-brand/8 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <NotifIcon type={n.type} />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleNotificationNavigate(n.refType, n.refId)
                      }}
                      disabled={!route}
                      className={`flex-1 min-w-0 text-left ${route ? 'cursor-pointer' : 'cursor-default'} disabled:opacity-100`}
                    >
                      <p className={`text-[11px] leading-relaxed ${route ? 'text-gray-700 hover:text-brand transition-colors' : 'text-gray-600'}`}>{n.text}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{n.time}</p>
                    </button>
                  </div>
                  )
                })}
                <ShowMoreButton
                  expanded={visibleNotifications.expanded}
                  hiddenCount={visibleNotifications.hiddenCount}
                  onToggle={visibleNotifications.toggle}
                  className="mt-1"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const PRIORITY_DOT: Record<Priority | '-', string> = {
  '긴급': 'bg-red-500',
  '높음': 'bg-orange-400',
  '보통': 'bg-blue-400',
  '낮음': 'bg-gray-300',
  '-': 'bg-gray-300',
}

function MiniCalendar({ events }: { events: CalEvent[] }) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const year = today.getFullYear()
  const month = today.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const monthEvents = events.filter((event) => {
    const date = parseDateOnly(event.date)
    return date && date.getFullYear() === year && date.getMonth() === month
  })

  const byDay: Record<number, CalEvent[]> = {}
  monthEvents.forEach((event) => {
    const date = parseDateOnly(event.date)
    if (!date) {
      return
    }
    const day = date.getDate()
    if (!byDay[day]) {
      byDay[day] = []
    }
    byDay[day].push(event)
  })

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]

  const selectedEvents = selectedDay ? (byDay[selectedDay] ?? []) : []

  const upcoming = events
    .map((event) => ({ event, parsed: parseDateOnly(event.date) }))
    .filter((item) => item.parsed != null && item.parsed >= today)
    .sort((a, b) => (a.parsed!.getTime() - b.parsed!.getTime()))
    .slice(0, 6)

  return (
    <div className="bg-white rounded-xl shadow-[0_2px_12px_rgba(30,58,138,0.07)] border border-blue-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-semibold text-gray-700">{year}년 {month + 1}월</p>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {['일', '월', '화', '수', '목', '금', '토'].map((dayLabel, index) => (
          <div key={dayLabel} className={`text-center text-[10px] font-semibold py-1 ${index === 0 ? 'text-red-400' : index === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
            {dayLabel}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} />
          }
          const isToday = day === today.getDate()
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
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((event, index) => (
                    <span key={`${event.docNo}-${index}`} className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-white/70' : PRIORITY_DOT[event.priority]}`} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 min-h-[88px]">
        {selectedDay && selectedEvents.length > 0 ? (
          <>
            <p className="text-[10px] font-semibold text-gray-400 mb-2">{month + 1}/{selectedDay} 마감</p>
            <div className="space-y-1.5">
              {selectedEvents.map((event) => (
                <div key={`${event.docNo}-${event.domainLabel}`} className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[event.priority]}`} />
                  <span className="font-mono text-[10px] text-gray-400 flex-shrink-0">{event.docNo}</span>
                  <span className="text-[11px] text-gray-600 truncate">{event.title}</span>
                </div>
              ))}
            </div>
          </>
        ) : selectedDay && selectedEvents.length === 0 ? (
          <p className="text-[11px] text-gray-400 text-center py-1">{month + 1}/{selectedDay}에 마감 일정이 없습니다</p>
        ) : (
          <>
            <p className="text-[10px] font-semibold text-gray-400 mb-2">다가오는 마감</p>
            <div className="space-y-1.5">
              {upcoming.length === 0 ? (
                <p className="text-[11px] text-gray-400">예정된 마감이 없습니다.</p>
              ) : (
                upcoming.map(({ event, parsed }) => (
                  <div key={`${event.docNo}-${event.domainLabel}`} className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[event.priority]}`} />
                    <span className="text-[10px] text-gray-400 flex-shrink-0 font-medium">
                      {parsed!.getMonth() + 1}/{parsed!.getDate()}
                    </span>
                    <span className="text-[11px] text-gray-600 truncate">{event.title}</span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function DomainBadge({ domain }: { domain: string }) {
  const className =
    domain === '업무요청'
      ? 'bg-blue-50 text-blue-700'
      : domain === '기술과제'
      ? 'bg-indigo-50 text-indigo-700'
      : domain === '테스트 시나리오'
      ? 'bg-violet-50 text-violet-700'
      : domain === '결함'
      ? 'bg-rose-50 text-rose-700'
      : 'bg-amber-50 text-amber-700'

  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}>{domain}</span>
}

function TypePill({ item }: { item: UnifiedBoardItem }) {
  switch (item.domainKey) {
    case 'WORK_REQUEST':
      return <TypeBadge type={item.type as RequestType} />
    case 'TECH_TASK':
      return <TechTypeBadge type={item.type as TechTaskType} />
    case 'TEST_SCENARIO':
      return <TestTypeBadge type={item.type as TestScenarioType} />
    case 'DEFECT':
      return <DefectTypeBadge type={item.type as DefectType} />
    case 'DEPLOYMENT':
      return <DeployTypeBadge type={item.type as DeployType} />
    default:
      return <span className="text-[12px] text-gray-600">{item.type}</span>
  }
}

function StatusPill({ item }: { item: UnifiedBoardItem }) {
  switch (item.domainKey) {
    case 'WORK_REQUEST':
      return <StatusBadge status={item.status as WorkRequestStatus} />
    case 'TECH_TASK':
      return <StatusBadge status={item.status as TechTaskStatus} />
    case 'TEST_SCENARIO':
      return <TestStatusBadge status={item.status as TestStatus} />
    case 'DEFECT':
      return <DefectStatusBadge status={item.status as DefectStatus} />
    case 'DEPLOYMENT':
      return <DeployStatusBadge status={item.status as DeployStatus} />
    default:
      return <span className="text-[12px] text-gray-600">{item.status}</span>
  }
}

function DeadlineBadge({ date }: { date: string }) {
  if (!date) {
    return <span className="text-[12px] text-gray-400">-</span>
  }

  const diff = getDaysDiffFromToday(date)
  if (diff == null) {
    return <span className="text-[12px] text-gray-400">-</span>
  }

  let cls = 'text-gray-500'
  if (diff < 0) {
    cls = 'text-red-500 font-semibold'
  } else if (diff <= 3) {
    cls = 'text-orange-500 font-semibold'
  }

  return <span className={`text-[12px] ${cls}`}>{date.slice(5)}</span>
}

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
  if (type === 'status') return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <circle cx="5.5" cy="5.5" r="4" stroke="#0ea5e9" strokeWidth="1.1" />
      <path d="M5.5 3.4V5.6" stroke="#0ea5e9" strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="5.5" cy="7.4" r="0.55" fill="#0ea5e9" />
    </svg>
  )
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <path d="M5.5 1L10 9H1L5.5 1Z" stroke="#10b981" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  )
}

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
