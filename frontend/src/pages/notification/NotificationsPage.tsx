import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState'
import { Pagination } from '@/components/common/TableControls'
import { useNotificationsQuery, notificationQueryKeys } from '@/features/notification/queries'
import { getNotificationRoute } from '@/features/notification/routes'
import {
  updateAllNotificationsReadState,
  updateNotificationReadState,
  type DashboardNotification,
} from '@/features/notification/service'
import { useAuthStore } from '@/stores/authStore'

const PAGE_SIZE = 20

type ReadFilter = 'ALL' | 'UNREAD' | 'READ'

const FILTER_OPTIONS: Array<{ key: ReadFilter; label: string }> = [
  { key: 'ALL', label: '전체' },
  { key: 'UNREAD', label: '미읽음' },
  { key: 'READ', label: '읽음' },
]

function toFilterParam(value: ReadFilter): boolean | undefined {
  if (value === 'UNREAD') {
    return false
  }
  if (value === 'READ') {
    return true
  }
  return undefined
}

function getTypeBadgeClass(type: DashboardNotification['type']): string {
  switch (type) {
    case 'assign':
      return 'bg-blue-50 text-blue-600 border-blue-100'
    case 'comment':
      return 'bg-violet-50 text-violet-600 border-violet-100'
    case 'deadline':
      return 'bg-amber-50 text-amber-600 border-amber-100'
    case 'status':
      return 'bg-sky-50 text-sky-600 border-sky-100'
    default:
      return 'bg-emerald-50 text-emerald-600 border-emerald-100'
  }
}

function getTypeLabel(type: DashboardNotification['type']): string {
  switch (type) {
    case 'assign':
      return '배정'
    case 'comment':
      return '댓글'
    case 'deadline':
      return '마감'
    case 'status':
      return '상태'
    default:
      return '완료'
  }
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const currentUserId = useAuthStore((state) => state.user?.id)
  const [filter, setFilter] = useState<ReadFilter>('ALL')
  const [page, setPage] = useState(1)
  const [loadingAllRead, setLoadingAllRead] = useState(false)
  const [loadingMap, setLoadingMap] = useState<Record<number, boolean>>({})

  const read = useMemo(() => toFilterParam(filter), [filter])
  const notificationsQuery = useNotificationsQuery(currentUserId, {
    read,
    page: page - 1,
    size: PAGE_SIZE,
  })
  const data = notificationsQuery.data
  const items = data?.items ?? []
  const unreadCount = items.filter((item) => !item.isRead).length
  const isEmpty = !notificationsQuery.isPending && !notificationsQuery.isError && items.length === 0

  const refreshNotifications = async () => {
    await queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all })
  }

  const handleMarkAllRead = async () => {
    if (!currentUserId || unreadCount === 0 || loadingAllRead) {
      return
    }
    setLoadingAllRead(true)
    try {
      await updateAllNotificationsReadState(true, currentUserId)
      await refreshNotifications()
    } finally {
      setLoadingAllRead(false)
    }
  }

  const handleReadToggle = async (item: DashboardNotification) => {
    if (loadingMap[item.id]) {
      return
    }

    setLoadingMap((prev) => ({ ...prev, [item.id]: true }))
    try {
      await updateNotificationReadState(item.id, !item.isRead)
      await refreshNotifications()
    } finally {
      setLoadingMap((prev) => ({ ...prev, [item.id]: false }))
    }
  }

  const handleOpen = async (item: DashboardNotification) => {
    const route = getNotificationRoute(item.refType, item.refId)
    if (!route) {
      return
    }

    if (!item.isRead && !loadingMap[item.id]) {
      setLoadingMap((prev) => ({ ...prev, [item.id]: true }))
      try {
        await updateNotificationReadState(item.id, true)
        await refreshNotifications()
      } finally {
        setLoadingMap((prev) => ({ ...prev, [item.id]: false }))
      }
    }

    navigate(route)
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-gray-900">전체 알림</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">총 {data?.total ?? 0}건</p>
        </div>
        <button
          type="button"
          onClick={() => {
            void handleMarkAllRead()
          }}
          disabled={unreadCount === 0 || loadingAllRead}
          className="h-8 px-3 border border-gray-200 rounded-lg text-[12px] font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loadingAllRead ? '처리 중...' : '현재 목록 모두 읽음'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-3 sm:px-4 py-3 flex items-center gap-2">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => {
              setFilter(option.key)
              setPage(1)
            }}
            className={`h-7 px-3 rounded-full text-[12px] font-semibold transition-colors ${
              filter === option.key
                ? 'bg-brand text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_12px_rgba(30,58,138,0.07)] overflow-hidden">
        {notificationsQuery.isPending ? (
          <LoadingState title="알림 목록을 불러오는 중입니다" description="최신 알림을 조회하고 있습니다." />
        ) : notificationsQuery.isError ? (
          <ErrorState
            title="알림을 불러오지 못했습니다"
            description="잠시 후 다시 시도해주세요."
            actionLabel="다시 시도"
            onAction={() => {
              void notificationsQuery.refetch()
            }}
          />
        ) : isEmpty ? (
          <EmptyState
            title="표시할 알림이 없습니다"
            description="새 알림이 발생하면 여기에 표시됩니다."
          />
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {items.map((item) => {
                const route = getNotificationRoute(item.refType, item.refId)
                const isLoading = loadingMap[item.id] === true

                return (
                  <div
                    key={item.id}
                    className={`px-4 py-3 sm:px-5 sm:py-3.5 ${
                      item.isRead ? 'bg-white' : 'bg-blue-50/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 inline-flex h-6 items-center rounded-md border px-2 text-[11px] font-semibold ${getTypeBadgeClass(item.type)}`}>
                        {getTypeLabel(item.type)}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          void handleOpen(item)
                        }}
                        disabled={!route}
                        className={`flex-1 text-left ${route ? 'cursor-pointer' : 'cursor-default'} disabled:opacity-100`}
                      >
                        <p className={`text-[13px] leading-relaxed ${item.isRead ? 'text-gray-700' : 'text-gray-900 font-semibold'}`}>
                          {item.text}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">{item.time}</p>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {!item.isRead ? (
                          <button
                            type="button"
                            onClick={() => {
                              void handleReadToggle(item)
                            }}
                            disabled={isLoading}
                            className="h-7 px-2.5 rounded-md border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
                          >
                            {isLoading ? '처리 중...' : '읽음'}
                          </button>
                        ) : null}
                        {route ? (
                          <button
                            type="button"
                            onClick={() => {
                              void handleOpen(item)
                            }}
                            className="h-7 px-2.5 rounded-md border border-brand/20 text-[11px] font-semibold text-brand hover:bg-blue-50 transition-colors"
                          >
                            열기
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <Pagination page={data?.page ?? page} totalPages={data?.totalPages ?? 1} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
