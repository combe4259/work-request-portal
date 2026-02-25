import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import KpiCard from '@/components/dashboard/KpiCard'
import { PriorityBadge } from '@/components/work-request/Badges'
import { SortTh, type SortDir } from '@/components/common/TableControls'
import { EmptyState } from '@/components/common/AsyncState'
import { useDashboardNotificationsQuery } from '@/features/notification/queries'
import { useWorkRequestsQuery } from '@/features/work-request/queries'
import type { WorkRequestListParams } from '@/features/work-request/service'
import { useTechTasksQuery } from '@/features/tech-task/queries'
import type { TechTaskListParams } from '@/features/tech-task/service'
import { useTestScenariosQuery } from '@/features/test-scenario/queries'
import type { TestScenarioListParams } from '@/features/test-scenario/service'
import { useDefectsQuery } from '@/features/defect/queries'
import type { DefectListParams } from '@/features/defect/service'
import { useDeploymentsQuery } from '@/features/deployment/queries'
import type { DeploymentListParams } from '@/features/deployment/service'
import { useAuthStore } from '@/stores/authStore'
import type { Priority, WorkRequest } from '@/types/work-request'
import type { TechTask } from '@/types/tech-task'
import type { TestScenario } from '@/types/test-scenario'
import type { Defect } from '@/types/defect'
import type { Deployment } from '@/types/deployment'

type CalEvent = {
  date: string
  docNo: string
  title: string
  priority: Priority | '-'
  domainLabel: string
}

type ActionScope = 'mine' | 'team'
type KpiKey = 'todo' | 'inProgress' | 'done' | 'urgent'
type DashSortKey = 'domain' | 'priority' | 'deadline' | 'status'
type DomainKey = 'WORK_REQUEST' | 'TECH_TASK' | 'TEST_SCENARIO' | 'DEFECT' | 'DEPLOYMENT'
type DomainFilter = 'ALL' | DomainKey

interface UnifiedBoardItem {
  id: string
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

const WORK_REQUEST_DASH_PARAMS: WorkRequestListParams = {
  search: '',
  filterType: '전체',
  filterPriority: '전체',
  filterStatus: '전체',
  sortKey: 'deadline',
  sortDir: 'asc',
  page: 1,
  pageSize: 500,
}

const TECH_TASK_DASH_PARAMS: TechTaskListParams = {
  search: '',
  filterType: '전체',
  filterPriority: '전체',
  filterStatus: '전체',
  sortKey: 'deadline',
  sortDir: 'asc',
  page: 1,
  pageSize: 500,
}

const TEST_SCENARIO_DASH_PARAMS: TestScenarioListParams = {
  search: '',
  filterType: '전체',
  filterPriority: '전체',
  filterStatus: '전체',
  sortKey: 'deadline',
  sortDir: 'asc',
  page: 1,
  pageSize: 500,
}

const DEFECT_DASH_PARAMS: DefectListParams = {
  search: '',
  filterType: '전체',
  filterSeverity: '전체',
  filterStatus: '전체',
  sortKey: 'deadline',
  sortDir: 'asc',
  page: 1,
  pageSize: 500,
}

const DEPLOYMENT_DASH_PARAMS: DeploymentListParams = {
  search: '',
  filterType: '전체',
  filterEnv: '전체',
  filterStatus: '전체',
  sortKey: 'deployDate',
  sortDir: 'asc',
  page: 1,
  pageSize: 500,
}

const IN_PROGRESS_STATUSES = new Set([
  '검토중',
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

function mapWorkRequestItems(items: WorkRequest[]): UnifiedBoardItem[] {
  return items.map((item) => ({
    id: item.id,
    docNo: item.docNo,
    title: item.title,
    domainKey: 'WORK_REQUEST',
    domainLabel: '업무요청',
    type: item.type,
    priority: item.priority,
    status: item.status,
    assignee: item.assignee,
    deadline: item.deadline,
    route: `/work-requests/${item.id}`,
  }))
}

function mapTechTaskItems(items: TechTask[]): UnifiedBoardItem[] {
  return items.map((item) => ({
    id: item.id,
    docNo: item.docNo,
    title: item.title,
    domainKey: 'TECH_TASK',
    domainLabel: '기술과제',
    type: item.type,
    priority: item.priority,
    status: item.status,
    assignee: item.assignee,
    deadline: item.deadline,
    route: `/tech-tasks/${item.id}`,
  }))
}

function mapTestScenarioItems(items: TestScenario[]): UnifiedBoardItem[] {
  return items.map((item) => ({
    id: item.id,
    docNo: item.docNo,
    title: item.title,
    domainKey: 'TEST_SCENARIO',
    domainLabel: '테스트 시나리오',
    type: item.type,
    priority: item.priority,
    status: item.status,
    assignee: item.assignee,
    deadline: item.deadline,
    route: `/test-scenarios/${item.id}`,
  }))
}

function mapDefectItems(items: Defect[]): UnifiedBoardItem[] {
  return items.map((item) => ({
    id: item.id,
    docNo: item.docNo,
    title: item.title,
    domainKey: 'DEFECT',
    domainLabel: '결함',
    type: item.type,
    priority: item.severity === '치명적' ? '긴급' : item.severity,
    status: item.status,
    assignee: item.assignee,
    deadline: item.deadline,
    route: `/defects/${item.id}`,
  }))
}

function mapDeploymentItems(items: Deployment[]): UnifiedBoardItem[] {
  return items.map((item) => ({
    id: item.id,
    docNo: item.docNo,
    title: item.title,
    domainKey: 'DEPLOYMENT',
    domainLabel: '배포',
    type: item.type,
    priority: '-',
    status: item.status,
    assignee: item.manager,
    deadline: item.deployDate,
    route: `/deployments/${item.id}`,
  }))
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const currentUserId = useAuthStore((state) => state.user?.id)
  const currentUserName = useAuthStore((state) => state.user?.name ?? '')

  const workRequestsQuery = useWorkRequestsQuery(WORK_REQUEST_DASH_PARAMS)
  const techTasksQuery = useTechTasksQuery(TECH_TASK_DASH_PARAMS)
  const testScenariosQuery = useTestScenariosQuery(TEST_SCENARIO_DASH_PARAMS)
  const defectsQuery = useDefectsQuery(DEFECT_DASH_PARAMS)
  const deploymentsQuery = useDeploymentsQuery(DEPLOYMENT_DASH_PARAMS)
  const notificationsQuery = useDashboardNotificationsQuery(currentUserId)
  const notifications = notificationsQuery.data ?? []

  const boardItems = useMemo<UnifiedBoardItem[]>(() => {
    const workItems = mapWorkRequestItems(workRequestsQuery.data?.items ?? [])
    const techItems = mapTechTaskItems(techTasksQuery.data?.items ?? [])
    const scenarioItems = mapTestScenarioItems(testScenariosQuery.data?.items ?? [])
    const defectItems = mapDefectItems(defectsQuery.data?.items ?? [])
    const deploymentItems = mapDeploymentItems(deploymentsQuery.data?.items ?? [])
    return [...workItems, ...techItems, ...scenarioItems, ...defectItems, ...deploymentItems]
  }, [
    workRequestsQuery.data?.items,
    techTasksQuery.data?.items,
    testScenariosQuery.data?.items,
    defectsQuery.data?.items,
    deploymentsQuery.data?.items,
  ])

  const [actionScope, setActionScope] = useState<ActionScope>('mine')
  const [domainFilter, setDomainFilter] = useState<DomainFilter>('ALL')
  const [activeKpi, setActiveKpi] = useState<KpiKey | null>(null)
  const [sort, setSort] = useState<{ key: DashSortKey; dir: SortDir }>({ key: 'deadline', dir: 'asc' })

  const scopedItems = useMemo(() => {
    if (actionScope === 'mine' && currentUserName) {
      return boardItems.filter((item) => item.assignee === currentUserName && !isClosed(item))
    }
    return boardItems
  }, [actionScope, boardItems, currentUserName])

  const filteredItems = useMemo(() => {
    if (domainFilter === 'ALL') {
      return scopedItems
    }
    return scopedItems.filter((item) => item.domainKey === domainFilter)
  }, [domainFilter, scopedItems])

  const kpiItems: Record<KpiKey, UnifiedBoardItem[]> = useMemo(() => ({
    todo: filteredItems.filter((item) => !isClosed(item) && item.assignee !== '미배정'),
    inProgress: filteredItems.filter((item) => IN_PROGRESS_STATUSES.has(item.status)),
    done: filteredItems.filter((item) => isClosed(item)),
    urgent: filteredItems.filter((item) => isUrgent(item)),
  }), [filteredItems])

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
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
  }, [filteredItems, sort])

  const calendarEvents = useMemo<CalEvent[]>(() => {
    return filteredItems
      .filter((item) => item.deadline)
      .map((item) => ({
        date: item.deadline,
        docNo: item.docNo,
        title: item.title,
        priority: item.priority,
        domainLabel: item.domainLabel,
      }))
  }, [filteredItems])

  const isBoardPending =
    workRequestsQuery.isPending
    || techTasksQuery.isPending
    || testScenariosQuery.isPending
    || defectsQuery.isPending
    || deploymentsQuery.isPending

  const isBoardError =
    workRequestsQuery.isError
    || techTasksQuery.isError
    || testScenariosQuery.isError
    || defectsQuery.isError
    || deploymentsQuery.isError

  const handleRefetchBoard = () => {
    void Promise.all([
      workRequestsQuery.refetch(),
      techTasksQuery.refetch(),
      testScenariosQuery.refetch(),
      defectsQuery.refetch(),
      deploymentsQuery.refetch(),
    ])
  }

  const handleDashSort = (key: string) => {
    const k = key as DashSortKey
    setSort((prev) => prev.key === k ? { key: k, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'asc' })
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {activeKpi && <div className="fixed inset-0 z-40" onClick={() => setActiveKpi(null)} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {([
          { key: 'todo' as KpiKey, label: actionScope === 'mine' ? '내 액션' : '팀 액션', value: kpiItems.todo.length, sub: '진행 필요 항목', color: 'brand' as const, icon: <TodoIcon /> },
          { key: 'inProgress' as KpiKey, label: '진행중', value: kpiItems.inProgress.length, sub: '처리 중 항목', color: 'blue' as const, icon: <ProgressIcon /> },
          { key: 'done' as KpiKey, label: '완료/종결', value: kpiItems.done.length, sub: '종결된 항목', color: 'emerald' as const, icon: <CheckIcon /> },
          { key: 'urgent' as KpiKey, label: '마감임박', value: kpiItems.urgent.length, sub: '3일 이내 마감', color: 'red' as const, icon: <DeadlineIcon /> },
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
                    <td className="px-3 py-3 whitespace-nowrap text-[12px] text-gray-600">{item.type}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {item.priority === '-' ? (
                        <span className="text-[12px] text-gray-400">-</span>
                      ) : (
                        <PriorityBadge priority={item.priority} />
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <StatusPill status={item.status} />
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
                {notifications.map((n) => (
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

function StatusPill({ status }: { status: string }) {
  const className =
    status === '완료' || status === '통과'
      ? 'bg-emerald-50 text-emerald-700'
      : status === '실패' || status === '반려' || status === '롤백'
      ? 'bg-red-50 text-red-700'
      : 'bg-gray-100 text-gray-700'

  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}>{status}</span>
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
