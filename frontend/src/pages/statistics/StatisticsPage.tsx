import { useMemo, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts'
import { useStatisticsSummaryQuery } from '@/features/statistics/queries'
import { useAuthStore } from '@/stores/authStore'

// ── 기간 옵션 ────────────────────────────────────────────
const PERIOD_OPTIONS = [
  { label: '7일',  days: 7 },
  { label: '14일', days: 14 },
  { label: '30일', days: 30 },
] as const
type PeriodLabel = typeof PERIOD_OPTIONS[number]['label']

// ── 현재 상태 도넛 색상 ──────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  접수:    '#94A3B8',
  검토중:  '#60A5FA',
  개발중:  '#818CF8',
  테스트중: '#A78BFA',
  완료:    '#34D399',
}

// ── CFD 레이어 ───────────────────────────────────────────
const CFD_LAYERS = [
  { key: '완료',    color: '#34D399' },
  { key: '테스트중', color: '#A78BFA' },
  { key: '개발중',  color: '#818CF8' },
  { key: '검토중',  color: '#60A5FA' },
  { key: '접수',    color: '#94A3B8' },
]

// ── 공통 컴포넌트 ────────────────────────────────────────
function Card({ title, subtitle, children, className = '' }: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={`bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] p-5 ${className}`}>
      <div className="mb-4">
        <p className="text-[13px] font-semibold text-gray-800">{title}</p>
        {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { color: string; name: string; value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2.5 text-[12px]">
      <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-gray-500">{p.name}</span>
          <span className="font-bold text-gray-800 ml-auto pl-4">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── 메인 ────────────────────────────────────────────────
export default function StatisticsPage() {
  const [periodLabel, setPeriodLabel] = useState<PeriodLabel>('30일')
  const currentTeamId = useAuthStore((state) => state.currentTeam?.id)

  const days = PERIOD_OPTIONS.find((p) => p.label === periodLabel)?.days ?? 30
  const statisticsQuery = useStatisticsSummaryQuery(currentTeamId, days)
  const stats = statisticsQuery.data

  const burndown = stats?.burndown ?? []
  const statusSnapshot = stats?.statusSnapshot ?? []
  const defectSeverity = stats?.defectSeverity ?? []
  const memberStats = stats?.memberStats ?? []

  // 번다운에서 구간별 X축 간격 조절 (너무 빽빽하지 않도록)
  const burndownInterval = days === 7 ? 0 : days === 14 ? 1 : 4

  // CFD: statusSnapshot 데이터를 기간별로 만들 수 없으므로 현재 스냅샷을 기간 끝점으로 표시
  // (실제 CFD는 history 테이블이 필요 — 현재는 status snapshot으로 대체)
  const cfdData = useMemo(() => {
    if (!statusSnapshot.length) return []
    // 현재 시점 한 점만 보여주는 방식 대신, burndown의 날짜 수에 맞게 점진적으로 증가하는 시뮬레이션
    // 실제 구현 시 history API 연동 필요
    return burndown.map((point) => {
      const entry: Record<string, string | number> = { date: point.date }
      statusSnapshot.forEach((s) => {
        entry[s.name] = s.value
      })
      return entry
    })
  }, [burndown, statusSnapshot])

  const memberWorkload = useMemo(
    () => [...memberStats].sort((a, b) => b.inProgress - a.inProgress),
    [memberStats]
  )
  const maxWorkload = Math.max(...memberWorkload.map((m) => m.inProgress), 1)

  const kpi = [
    {
      label: '미완료 업무',
      value: stats?.kpi.incompleteCount ?? '-',
      sub: '전체 도메인 기준',
      icon: <StackIcon />,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: '지연 업무',
      value: stats?.kpi.overdueCount ?? '-',
      sub: '마감일 초과 항목',
      icon: <AlertIcon />,
      color: 'text-red-500 bg-red-50',
    },
    {
      label: '이번달 완료',
      value: stats?.kpi.completedThisMonth ?? '-',
      sub: `완료 처리된 항목`,
      icon: <CheckIcon />,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: '평균 처리일',
      value: stats ? `${stats.kpi.averageProcessingDays}일` : '-',
      sub: '접수 → 완료 기준',
      icon: <ClockIcon />,
      color: 'text-indigo-600 bg-indigo-50',
    },
  ]

  return (
    <div className="p-6 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900">통계</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">잔여 업무 현황 및 일별 진행 추이</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.label}
              onClick={() => setPeriodLabel(p.label)}
              className={`h-7 px-3 text-[12px] rounded-md font-medium transition-colors ${
                periodLabel === p.label ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        {kpi.map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${k.color}`}>
              {k.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400 font-medium">{k.label}</p>
              <p className="text-[22px] font-bold text-gray-900 leading-none mt-0.5">{k.value}</p>
              <p className="text-[11px] mt-1 text-gray-400 truncate">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 번다운 + 현재 상태 */}
      <div className="grid grid-cols-[1fr_260px] gap-4">
        <Card title="잔여 업무 추이" subtitle={`일별 미완료 업무 수 (${periodLabel})`}>
          {burndown.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={burndown} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  interval={burndownInterval}
                />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="remaining"
                  name="잔여 업무"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </Card>

        <Card title="현재 업무 상태">
          {statusSnapshot.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie
                    data={statusSnapshot.map((s) => ({ ...s, color: STATUS_COLORS[s.name] ?? '#94A3B8' }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusSnapshot.map((s) => (
                      <Cell key={s.name} fill={STATUS_COLORS[s.name] ?? '#94A3B8'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [`${v ?? 0}건`]}
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #F1F5F9' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-1">
                {statusSnapshot.map((s) => (
                  <div key={s.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[s.name] ?? '#94A3B8' }} />
                      <span className="text-[11px] text-gray-500">{s.name}</span>
                    </div>
                    <span className="text-[12px] font-semibold text-gray-700">{s.value}건</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState />
          )}
        </Card>
      </div>

      {/* 일별 업무 흐름 */}
      <Card title="일별 업무 흐름" subtitle="상태별 업무 분포 추이">
        {cfdData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={cfdData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} interval={burndownInterval} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                {CFD_LAYERS.map(({ key, color }) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={key}
                    stackId="1"
                    stroke={color}
                    fill={color}
                    fillOpacity={0.75}
                    strokeWidth={0}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {[...CFD_LAYERS].reverse().map(({ key, color }) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-[11px] text-gray-400">{key}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyState />
        )}
      </Card>

      {/* 결함 심각도 + 팀원 잔여 업무 */}
      <div className="grid grid-cols-[1fr_1.6fr] gap-4">
        <Card title="결함 심각도">
          {defectSeverity.length > 0 ? (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={defectSeverity} margin={{ top: 0, right: 4, bottom: 0, left: -20 }} barSize={30}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(241,245,249,0.6)' }}
                  formatter={(v) => [`${v ?? 0}건`, '결함 수']}
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #F1F5F9' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {defectSeverity.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </Card>

        <Card title="팀원별 잔여 업무" subtitle="업무요청 + 기술과제 기준 · 진행중 많은 순">
          {memberWorkload.length > 0 ? (
            <div className="space-y-3.5">
              {memberWorkload.map((m) => {
                const pct = Math.round((m.inProgress / maxWorkload) * 100)
                const barColor = pct >= 70 ? '#F97316' : pct >= 40 ? '#3B82F6' : '#34D399'
                return (
                  <div key={m.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-brand/10 flex items-center justify-center text-brand text-[10px] font-bold flex-shrink-0">
                          {m.name[0]}
                        </div>
                        <span className="text-[12px] text-gray-600 font-medium">{m.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-gray-400">완료 {m.done}건</span>
                        <span className="text-[13px] font-bold text-gray-800">잔여 {m.inProgress}건</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: barColor }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState />
          )}
        </Card>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-[120px] text-[12px] text-gray-300">
      데이터가 없습니다
    </div>
  )
}

// ── 아이콘 ───────────────────────────────────────────────
function StackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2" y="11" width="14" height="4" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <rect x="2" y="6" width="14" height="4" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <rect x="2" y="1" width="14" height="4" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M9 2L16.5 15H1.5L9 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <line x1="9" y1="7" x2="9" y2="11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="9" cy="13.5" r="0.7" fill="currentColor" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 9l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9 5.5V9l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
