import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore, AVATAR_COLOR_HEX } from '@/stores/profileStore'
import { ROLE_LABELS } from '@/lib/constants'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import ConfirmDialog from '@/components/common/ConfirmDialog'

interface TopbarProps {
  onOpenSidebar?: () => void
}

// 경로 → 페이지 타이틀 매핑
const PAGE_TITLES: Record<string, string> = {
  '/dashboard': '대시보드',
  '/work-requests': '업무요청',
  '/tech-tasks': '기술과제',
  '/test-scenarios': '테스트 시나리오',
  '/defects': '결함 목록',
  '/deployments': '배포 관리',
  '/knowledge-base': '지식 베이스',
  '/meeting-notes': '회의록',
  '/ideas': '아이디어 보드',
  '/resources': '공유 리소스',
  '/statistics': '통계',
  '/settings': '설정',
}

// 알림 샘플 데이터
const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    type: 'assigned',
    message: 'WR-2026-0042 업무가 나에게 배정되었습니다',
    time: '5분 전',
  },
  {
    id: 2,
    type: 'comment',
    message: '팀원이 WR-2026-0038에 댓글을 남겼습니다',
    time: '23분 전',
  },
  {
    id: 3,
    type: 'deadline',
    message: 'WR-2026-0031 마감일이 내일입니다',
    time: '1시간 전',
  },
  {
    id: 4,
    type: 'deploy',
    message: 'v2.1.3 배포가 완료되었습니다',
    time: '3시간 전',
  },
]

export default function Topbar({ onOpenSidebar }: TopbarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, currentTeam, logout, setCurrentTeam } = useAuthStore()
  const { displayName, role, avatarColor, photoUrl } = useProfileStore()
  const [notifOpen, setNotifOpen] = useState(false)
  const [teamSwitchOpen, setTeamSwitchOpen] = useState(false)

  const pageTitle = PAGE_TITLES[location.pathname] ?? '페이지'
  const unreadCount = MOCK_NOTIFICATIONS.length
  const initials = (displayName || user?.name)?.slice(0, 1) ?? '?'
  const colorHex = AVATAR_COLOR_HEX[avatarColor] ?? AVATAR_COLOR_HEX['brand']

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleTeamSwitch = () => {
    setTeamSwitchOpen(true)
  }

  const confirmTeamSwitch = () => {
    setTeamSwitchOpen(false)
    setCurrentTeam(null)
    navigate('/team-select')
  }

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center px-3 sm:px-6 gap-3 sm:gap-4 flex-shrink-0">
      <button
        type="button"
        aria-label="사이드바 열기"
        onClick={onOpenSidebar}
        className="lg:hidden h-8 w-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-brand/30"
      >
        <MenuIcon />
      </button>

      {/* 페이지 타이틀 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>{currentTeam?.name ?? '팀'}</span>
          <ChevronIcon />
          <span className="text-gray-700 font-semibold">{pageTitle}</span>
        </div>
      </div>

      {/* 우측 액션 영역 */}
      <div className="flex items-center gap-2">
        {/* 업무요청 등록 버튼 */}
        <Button
          size="sm"
          type="button"
          className="h-8 bg-brand hover:bg-brand-hover text-white text-xs font-semibold px-3 gap-1.5"
          onClick={() => navigate('/work-requests/new')}
        >
          <PlusIcon />
          업무요청 등록
        </Button>

        {/* 알림 벨 */}
        <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="알림 열기"
              className="relative w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              <BellIcon />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-800">알림</span>
              <button type="button" className="text-xs text-brand hover:underline">
                모두 읽음
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {MOCK_NOTIFICATIONS.map((notif) => (
                <button
                  type="button"
                  key={notif.id}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-brand/10">
                    <NotifTypeIcon type={notif.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">{notif.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{notif.time}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="px-4 py-2.5 border-t border-gray-100">
              <button type="button" className="w-full text-xs text-center text-brand hover:underline">
                전체 알림 보기
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 프로필 드롭다운 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden">
                {photoUrl ? (
                  <img src={photoUrl} alt="프로필" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: colorHex }}>
                    {initials}
                  </div>
                )}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-gray-800 leading-none mb-0.5">{displayName || user?.name || '사용자'}</p>
                <p className="text-[10px] text-gray-400 leading-none">{role || ROLE_LABELS[user?.role ?? 'DEVELOPER']}</p>
              </div>
              <ChevronDownIcon />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs font-normal text-gray-500 pb-1">
              <p className="font-semibold text-gray-800 text-sm">{user?.name ?? '사용자'}</p>
              <p className="text-gray-400 text-[11px]">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <SettingsIcon />
              프로필 설정
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings/team')}>
              <TeamIcon />
              팀 관리
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleTeamSwitch}>
              <TeamIcon />
              팀 전환
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={handleLogout}
            >
              <LogoutIcon />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ConfirmDialog
        open={teamSwitchOpen}
        onOpenChange={setTeamSwitchOpen}
        title="팀 전환 화면으로 이동할까요?"
        description="현재 선택된 팀이 해제되고 팀 선택 화면으로 이동합니다."
        cancelText="취소"
        confirmText="이동"
        onConfirm={confirmTeamSwitch}
      />
    </header>
  )
}

// ── SVG 아이콘 ────────────────────────────────────────
function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 3.5H12M2 7H12M2 10.5H12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="text-gray-400">
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <line x1="6" y1="2" x2="6" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2C5.79 2 4 3.79 4 6V9.5L2.5 11H13.5L12 9.5V6C12 3.79 10.21 2 8 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M6.5 11.5C6.5 12.33 7.17 13 8 13C8.83 13 9.5 12.33 9.5 11.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 1.5V2.5M7 11.5V12.5M1.5 7H2.5M11.5 7H12.5M3 3L3.7 3.7M10.3 10.3L11 11M3 11L3.7 10.3M10.3 3.7L11 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function TeamIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="5" cy="5" r="2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="10" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1 11.5C1 9.57 2.79 8 5 8C7.21 8 9 9.57 9 11.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M10 8C11.66 8 13 9.12 13 10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M5.5 2H3C2.45 2 2 2.45 2 3V11C2 11.55 2.45 12 3 12H5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M9 4.5L12 7L9 9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="7" x2="5.5" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function NotifTypeIcon({ type }: { type: string }) {
  if (type === 'assigned') {
    return (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
        <circle cx="6.5" cy="4.5" r="2" stroke="#0046ff" strokeWidth="1.2" />
        <path d="M2 11C2 9.07 4.02 7.5 6.5 7.5C8.98 7.5 11 9.07 11 11" stroke="#0046ff" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    )
  }
  if (type === 'comment') {
    return (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
        <path d="M2 2H9C9.55 2 10 2.45 10 3V7C10 7.55 9.55 8 9 8H5.5L3 10.5V8H2C1.45 8 1 7.55 1 7V3C1 2.45 1.45 2 2 2Z" stroke="#0046ff" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    )
  }
  if (type === 'deadline') {
    return (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
        <circle cx="6.5" cy="6.5" r="5" stroke="#f59e0b" strokeWidth="1.2" />
        <path d="M6.5 3.5V6.5L8.5 8.5" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M6.5 1.5L11.5 10.5H1.5L6.5 1.5Z" stroke="#10b981" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}
