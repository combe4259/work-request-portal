import { NavLink, useNavigate } from 'react-router-dom'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/stores/authStore'
import { logoutFromServer } from '@/features/auth/service'
import { useNotificationUnreadCountsQuery } from '@/features/notification/queries'
import shinhanLogo from '@/assets/shinhan-ci.png'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

interface NavSection {
  title: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: '메인',
    items: [
      { label: '대시보드', path: '/dashboard', icon: <DashboardIcon /> },
      { label: '달력', path: '/calendar', icon: <CalendarNavIcon /> },
      { label: '워크플로우', path: '/workflow', icon: <WorkflowIcon /> },
    ],
  },
  {
    title: '개발 사이클',
    items: [
      { label: '업무요청', path: '/work-requests', icon: <RequestIcon /> },
      { label: '기술과제', path: '/tech-tasks', icon: <DevRequestIcon /> },
      { label: '테스트 시나리오', path: '/test-scenarios', icon: <TestIcon /> },
      { label: '결함 목록', path: '/defects', icon: <DefectIcon /> },
      { label: '배포 관리', path: '/deployments', icon: <DeployIcon /> },
    ],
  },
  {
    title: '팀 협업',
    items: [
      { label: '지식 베이스', path: '/knowledge-base', icon: <KnowledgeIcon /> },
      { label: '회의록', path: '/meeting-notes', icon: <MeetingIcon /> },
      { label: '아이디어 보드', path: '/ideas', icon: <IdeaIcon /> },
      { label: '공유 리소스', path: '/resources', icon: <ResourceIcon /> },
    ],
  },
  {
    title: '분석',
    items: [
      { label: '통계', path: '/statistics', icon: <StatsIcon /> },
    ],
  },
]

interface SidebarProps {
  className?: string
  onNavigate?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

function resolveBadgeCount(path: string, unreadCounts: { workRequest: number; techTask: number; testScenario: number; defect: number; deployment: number; idea: number } | undefined): number {
  if (!unreadCounts) return 0
  if (path === '/work-requests') return unreadCounts.workRequest
  if (path === '/tech-tasks') return unreadCounts.techTask
  if (path === '/test-scenarios') return unreadCounts.testScenario
  if (path === '/defects') return unreadCounts.defect
  if (path === '/deployments') return unreadCounts.deployment
  if (path === '/ideas') return unreadCounts.idea
  return 0
}

export default function Sidebar({ className = '', onNavigate, collapsed = false, onToggleCollapse }: SidebarProps) {
  const { user, currentTeam, logout } = useAuthStore()
  const unreadCountsQuery = useNotificationUnreadCountsQuery(!!user && !!currentTeam)
  const unreadCounts = unreadCountsQuery.data
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logoutFromServer()
    } catch {
      // 서버 상태와 무관하게 로컬 세션은 반드시 종료한다.
    }
    logout()
    onNavigate?.()
    navigate('/login')
  }

  return (
    <aside
      className={`${collapsed ? 'w-[60px] min-w-[60px]' : 'w-[240px] min-w-[240px]'} h-screen bg-brand-sidebar flex flex-col overflow-hidden relative transition-all duration-200 ${className}`}
    >
      {/* 배경 장식 */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/[0.03] pointer-events-none" />
      <div className="absolute bottom-20 -left-12 w-40 h-40 rounded-full bg-white/[0.03] pointer-events-none" />

      {/* 로고 + 접기 버튼 */}
      {!collapsed && (
        <div className="pt-5 pb-4 relative z-10 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img src={shinhanLogo} alt="신한투자증권" className="w-9 h-9 rounded-lg flex-shrink-0" />
            <div>
              <p className="text-[11px] font-semibold text-white/60 leading-none mb-1">신한투자증권 PDA</p>
              <p className="text-[13px] font-bold text-white leading-none">IT 업무요청 포털</p>
            </div>
          </div>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="사이드바 접기"
              className="w-7 h-7 flex items-center justify-center rounded-md text-white/30 hover:bg-white/[0.1] hover:text-white/70 transition-all flex-shrink-0"
            >
              <CollapseIcon />
            </button>
          )}
        </div>
      )}

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-1 py-1 relative z-10 scrollbar-hide">
        {/* collapsed 상태: 펼치기 버튼을 nav 상단에 배치 */}
        {collapsed && onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="사이드바 펼치기"
            title="펼치기"
            className="w-full flex justify-center items-center py-2.5 mb-1 rounded-lg text-white/30 hover:bg-white/[0.07] hover:text-white/70 transition-all"
          >
            <ExpandIcon />
          </button>
        )}
        {NAV_SECTIONS.map((section, idx) => (
          <div key={section.title}>
            {idx > 0 && <Separator className="my-2 bg-white/[0.08]" />}
            {!collapsed && (
              <p className="text-[10px] font-semibold text-white/30 tracking-widest uppercase px-2 py-1.5">
                {section.title}
              </p>
            )}
            {collapsed && idx > 0 && <div className="h-1" />}
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `relative flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all mb-0.5 ${
                    collapsed ? 'justify-center px-0 py-2.5' : 'px-2.5 py-2'
                  } ${
                    isActive
                      ? 'bg-white/[0.12] text-white'
                      : 'text-white/55 hover:bg-white/[0.07] hover:text-white/90'
                  }`
                }
              >
                {({ isActive }) => {
                  const badgeCount = resolveBadgeCount(item.path, unreadCounts)
                  return (
                    <>
                      <span className={`flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-white/40'}`}>
                        {item.icon}
                      </span>
                      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                      {!collapsed && badgeCount > 0 && (
                        <span className="ml-auto text-[10px] font-bold bg-brand/80 text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight">
                          {badgeCount}
                        </span>
                      )}
                      {collapsed && badgeCount > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-brand rounded-full" />
                      )}
                      {isActive && !collapsed && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-brand rounded-r-full" />
                      )}
                    </>
                  )
                }}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* 하단 */}
      <div className={`pb-4 pt-2 border-t border-white/[0.08] relative z-10 space-y-0.5 ${collapsed ? 'px-3' : 'px-3'}`}>
        <NavLink
          to="/settings"
          onClick={onNavigate}
          title={collapsed ? '설정' : undefined}
          className={({ isActive }) =>
            `flex items-center rounded-lg text-[13px] transition-all ${
              collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-2.5 py-2'
            } ${
              isActive ? 'bg-white/[0.12] text-white' : 'text-white/40 hover:bg-white/[0.07] hover:text-white/70'
            }`
          }
        >
          <SettingsIcon />
          {!collapsed && <span>설정</span>}
        </NavLink>
        <button
          type="button"
          onClick={() => { void handleLogout() }}
          aria-label="로그아웃"
          title={collapsed ? '로그아웃' : undefined}
          className={`w-full flex items-center rounded-lg text-[13px] text-white/40 hover:bg-white/[0.07] hover:text-white/70 transition-all ${
            collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-2.5 py-2'
          }`}
        >
          <LogoutIcon />
          {!collapsed && <span>로그아웃</span>}
        </button>
      </div>
    </aside>
  )
}

// ── SVG 아이콘 ────────────────────────────────────────
function CollapseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M9 3L5 7.5L9 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 3L9 7.5L13 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ExpandIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M6 3L10 7.5L6 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 3L6 7.5L2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CalendarNavIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 6.5H14.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M5 1.5V3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M11 1.5V3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="5" cy="10" r="0.8" fill="currentColor" />
      <circle cx="8" cy="10" r="0.8" fill="currentColor" />
      <circle cx="11" cy="10" r="0.8" fill="currentColor" />
    </svg>
  )
}

function DashboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

function RequestIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <line x1="5" y1="5.5" x2="11" y2="5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="5" y1="10.5" x2="8.5" y2="10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function DevRequestIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <polyline points="5,4 2,8 5,12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="11,4 14,8 11,12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="9.5" y1="3" x2="6.5" y2="13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function TestIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
      <polyline points="5,8 7,10.5 11,5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DefectIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.5L14.5 13H1.5L8 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <line x1="8" y1="6" x2="8" y2="9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="11.5" r="0.6" fill="currentColor" />
    </svg>
  )
}

function DeployIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 11V4M8 4L5 7M8 4L11 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 13H14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function WorkflowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="2" width="4" height="3" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
      <rect x="10.5" y="2" width="4" height="3" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
      <rect x="6" y="11" width="4" height="3" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 3.5H10.5M8 3.5V9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function KnowledgeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 13V3C2 3 4 2 8 2C12 2 14 3 14 3V13C14 13 12 12 8 12C4 12 2 13 2 13Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <line x1="8" y1="2" x2="8" y2="12" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

function MeetingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 2H10C10.55 2 11 2.45 11 3V9C11 9.55 10.55 10 10 10H6L3 13V10H2C1.45 10 1 9.55 1 9V3C1 2.45 1.45 2 2 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M13 5H14C14.55 5 15 5.45 15 6V11C15 11.55 14.55 12 14 12H13V14L10.5 12H9" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}

function IdeaIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2C5.79 2 4 3.79 4 6C4 7.49 4.82 8.78 6 9.46V11H10V9.46C11.18 8.78 12 7.49 12 6C12 3.79 10.21 2 8 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <line x1="6" y1="13" x2="10" y2="13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function ResourceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6.5 9.5C7 10.17 7.97 10.5 9 10.5C10.66 10.5 12 9.16 12 7.5C12 5.84 10.66 4.5 9 4.5C7.97 4.5 7.07 5 6.5 5.77" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M9.5 6.5C9 5.83 8.03 5.5 7 5.5C5.34 5.5 4 6.84 4 8.5C4 10.16 5.34 11.5 7 11.5C8.03 11.5 8.93 11 9.5 10.23" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function StatsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="9" width="3" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="6" y="6" width="3" height="8" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="11" y="2" width="3" height="12" rx="1" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 1.5V3M8 13V14.5M1.5 8H3M13 8H14.5M3.4 3.4L4.4 4.4M11.6 11.6L12.6 12.6M3.4 12.6L4.4 11.6M11.6 4.4L12.6 3.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 2H3C2.45 2 2 2.45 2 3V13C2 13.55 2.45 14 3 14H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M10 5L14 8L10 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="14" y1="8" x2="6" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}
