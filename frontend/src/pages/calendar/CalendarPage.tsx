import { useRef, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import type { EventContentArg, DatesSetArg } from '@fullcalendar/core'
import { useDashboardSummaryQuery } from '@/features/dashboard/queries'
import type { DashboardDomain, DashboardDomainFilter, DashboardScope } from '@/features/dashboard/service'
import { useAuthStore } from '@/stores/authStore'
import type { Priority } from '@/types/work-request'
import './CalendarPage.css'

type DomainKey = DashboardDomain
type DomainFilter = DashboardDomainFilter

type CalEvent = {
  id: number
  startDate: string
  endDate: string
  domainKey: DomainKey
  domainLabel: string
  docNo: string
  title: string
  priority: Priority | '-'
}

const DOMAIN_STYLE: Record<string, { pill: string }> = {
  '업무요청':       { pill: 'bg-blue-500' },
  '기술과제':       { pill: 'bg-indigo-500' },
  '테스트 시나리오': { pill: 'bg-violet-500' },
  '결함':           { pill: 'bg-rose-500' },
  '배포':           { pill: 'bg-amber-500' },
}

const DOMAIN_FILTER_OPTIONS: Array<{ key: DomainFilter; label: string }> = [
  { key: 'ALL',           label: '전체' },
  { key: 'WORK_REQUEST',  label: '업무요청' },
  { key: 'TECH_TASK',     label: '기술과제' },
  { key: 'TEST_SCENARIO', label: '테스트 시나리오' },
  { key: 'DEFECT',        label: '결함' },
  { key: 'DEPLOYMENT',    label: '배포' },
]

function toDomainLabel(domain: DomainKey): string {
  if (domain === 'WORK_REQUEST')  return '업무요청'
  if (domain === 'TECH_TASK')     return '기술과제'
  if (domain === 'TEST_SCENARIO') return '테스트 시나리오'
  if (domain === 'DEFECT')        return '결함'
  return '배포'
}

function toDetailRoute(domain: DomainKey, id: number): string {
  if (domain === 'WORK_REQUEST')  return `/work-requests/${id}`
  if (domain === 'TECH_TASK')     return `/tech-tasks/${id}`
  if (domain === 'TEST_SCENARIO') return `/test-scenarios/${id}`
  if (domain === 'DEFECT')        return `/defects/${id}`
  return `/deployments/${id}`
}

// FullCalendar end date is exclusive — add 1 day
function toFCEndDate(dateStr: string | null | undefined): string | undefined {
  if (!dateStr) return undefined
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return undefined
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export default function CalendarPage() {
  const navigate = useNavigate()
  const calRef = useRef<FullCalendar>(null)
  const currentTeamId = useAuthStore((state) => state.currentTeam?.id)

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const [viewTitle, setViewTitle] = useState('')
  const [isCurrentMonth, setIsCurrentMonth] = useState(true)
  const [scope, setScope] = useState<DashboardScope>('team')
  const [domainFilter, setDomainFilter] = useState<DomainFilter>('ALL')

  const summaryQuery = useDashboardSummaryQuery(currentTeamId, scope, domainFilter, 0, 20)

  const events = useMemo<CalEvent[]>(() => {
    return (summaryQuery.data?.calendarEvents ?? []).map((item) => ({
      id: item.id,
      startDate: item.startDate,
      endDate: item.endDate,
      domainKey: item.domain,
      domainLabel: toDomainLabel(item.domain),
      docNo: item.docNo,
      title: item.title,
      priority: item.priority,
    }))
  }, [summaryQuery.data?.calendarEvents])

  const fcEvents = useMemo(() => {
    return events
      .filter((e) => !!e.startDate)
      .map((e) => ({
        id: String(e.id),
        title: e.title,
        start: e.startDate,
        end: toFCEndDate(e.endDate) ?? toFCEndDate(e.startDate),
        extendedProps: {
          domainKey: e.domainKey,
          domainLabel: e.domainLabel,
          docNo: e.docNo,
          eventId: e.id,
        },
      }))
  }, [events])

  const handleDatesSet = (arg: DatesSetArg) => {
    const d = arg.view.currentStart
    const y = d.getFullYear()
    const m = d.getMonth()
    setViewTitle(`${y}년 ${m + 1}월`)
    setIsCurrentMonth(y === today.getFullYear() && m === today.getMonth())
  }

  const goToPrev  = () => calRef.current?.getApi().prev()
  const goToNext  = () => calRef.current?.getApi().next()
  const goToToday = () => calRef.current?.getApi().today()

  function renderEventContent(arg: EventContentArg) {
    const { domainLabel, domainKey, docNo, eventId } = arg.event.extendedProps as {
      domainLabel: string; domainKey: DomainKey; docNo: string; eventId: number
    }
    const ds = DOMAIN_STYLE[domainLabel]
    return (
      <button
        type="button"
        onClick={() => navigate(toDetailRoute(domainKey, eventId))}
        title={`${docNo} · ${arg.event.title}`}
        className={`w-full text-left px-1.5 py-[2px] rounded-[3px] text-[10px] font-semibold text-white truncate transition-all hover:brightness-110 ${ds?.pill ?? 'bg-gray-400'}`}
      >
        {arg.event.title}
      </button>
    )
  }

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-4">
      {/* 컨트롤 바 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goToToday}
            disabled={isCurrentMonth}
            className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all mr-2 ${
              isCurrentMonth
                ? 'bg-gray-100 text-gray-400 cursor-default'
                : 'bg-brand text-white shadow-[0_2px_8px_rgba(0,70,255,0.25)] hover:brightness-110'
            }`}
          >
            오늘
          </button>
          <button
            type="button"
            onClick={goToPrev}
            aria-label="이전 달"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white hover:text-gray-700 hover:shadow-sm border border-transparent hover:border-gray-200 transition-all"
          >
            <ChevLeftIcon />
          </button>
          <h1 className="text-[17px] font-bold text-gray-800 min-w-[120px] text-center tracking-tight">
            {viewTitle}
          </h1>
          <button
            type="button"
            onClick={goToNext}
            aria-label="다음 달"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white hover:text-gray-700 hover:shadow-sm border border-transparent hover:border-gray-200 transition-all"
          >
            <ChevRightIcon />
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* 범위 토글 */}
          <div className="flex items-center gap-0.5 p-1 rounded-lg bg-gray-100">
            <button
              type="button"
              onClick={() => setScope('mine')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                scope === 'mine' ? 'bg-white text-brand shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              내 담당
            </button>
            <button
              type="button"
              onClick={() => setScope('team')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                scope === 'team' ? 'bg-white text-brand shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              팀 전체
            </button>
          </div>

          {/* 도메인 필터 */}
          {DOMAIN_FILTER_OPTIONS.map((opt) => {
            const ds = DOMAIN_STYLE[opt.label]
            const isActive = domainFilter === opt.key
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setDomainFilter(opt.key)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  isActive
                    ? opt.key === 'ALL'
                      ? 'bg-gray-800 text-white shadow-sm'
                      : `${ds?.pill ?? 'bg-gray-600'} text-white shadow-sm`
                    : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* FullCalendar */}

      <div className="fc-wrapper bg-white rounded-2xl border border-gray-200 shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          locale="ko"
          events={fcEvents}
          eventContent={renderEventContent}
          datesSet={handleDatesSet}
          headerToolbar={false}
          height="auto"
          dayMaxEvents={3}
          moreLinkText={(n) => `+${n}개 더보기`}
          moreLinkClassNames="fc-more-link-custom"
          dayCellClassNames={(arg) => {
            const d = arg.date
            const isToday = d.toDateString() === today.toDateString()
            const col = d.getDay()
            if (isToday) return ['fc-day-today-custom']
            if (col === 0) return ['fc-day-sun']
            if (col === 6) return ['fc-day-sat']
            return []
          }}
        />
      </div>
    </div>
  )
}

function ChevLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
