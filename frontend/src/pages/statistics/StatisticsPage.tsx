import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  type PieLabelRenderProps,
} from 'recharts'
import { useStatisticsSummaryQuery } from '@/features/statistics/queries'
import { useAuthStore } from '@/stores/authStore'

// ── 데이터 ────────────────────────────────────────────
const WEEKLY_TREND = [
  { week: '1/5주', wr: 9, defect: 2, deploy: 1 },
  { week: '1/12주', wr: 12, defect: 3, deploy: 2 },
  { week: '1/19주', wr: 8, defect: 1, deploy: 1 },
  { week: '1/26주', wr: 14, defect: 4, deploy: 2 },
  { week: '2/2주', wr: 11, defect: 2, deploy: 1 },
  { week: '2/9주', wr: 16, defect: 3, deploy: 2 },
  { week: '2/16주', wr: 10, defect: 2, deploy: 1 },
  { week: '2/22주', wr: 7, defect: 1, deploy: 1 },
]

const DOMAIN_DATA = [
  { name: '신규개발', value: 28, color: '#3B82F6' },
  { name: '기능개선', value: 35, color: '#6366F1' },
  { name: '버그수정', value: 20, color: '#EF4444' },
  { name: '인프라', value: 12, color: '#F59E0B' },
  { name: '기타', value: 5, color: '#94A3B8' },
]

const DEFECT_SEVERITY = [
  { name: '치명', count: 4, color: '#EF4444' },
  { name: '높음', count: 12, color: '#F97316' },
  { name: '보통', count: 23, color: '#EAB308' },
  { name: '낮음', count: 18, color: '#22C55E' },
]

const MEMBER_STATS = [
  { name: '김개발', done: 18, inProgress: 3 },
  { name: '이설계', done: 14, inProgress: 5 },
  { name: '박테스터', done: 21, inProgress: 2 },
  { name: '최인프라', done: 9, inProgress: 4 },
  { name: '정기획', done: 11, inProgress: 6 },
]

const STATUS_FLOW = [
  { name: '접수', value: 72 },
  { name: '검토중', value: 58 },
  { name: '개발중', value: 34 },
  { name: '테스트중', value: 21 },
  { name: '완료', value: 45 },
  { name: '보류', value: 8 },
]

const PERIOD_OPTIONS = ['최근 8주', '최근 4주', '이번달'] as const
type Period = typeof PERIOD_OPTIONS[number]

// ── KPI ───────────────────────────────────────────────
const KPI = [
  { label: '총 업무요청', value: 87, sub: '전주 대비 +5', delta: true, icon: <DocIcon />, color: 'text-blue-600 bg-blue-50' },
  { label: '평균 처리 기간', value: '4.2일', sub: '전주 5.1일', delta: true, icon: <ClockIcon />, color: 'text-indigo-600 bg-indigo-50' },
  { label: '완료율', value: '78%', sub: '목표 80%', delta: false, icon: <CheckIcon />, color: 'text-emerald-600 bg-emerald-50' },
  { label: '미해결 결함', value: 16, sub: '긴급 4건 포함', delta: false, icon: <BugIcon />, color: 'text-red-500 bg-red-50' },
]

// ── Custom Tooltip ─────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string }) {
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

// ── PieCustomLabel ─────────────────────────────────────
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: PieLabelRenderProps) {
  if ((percent ?? 0) < 0.06) return null
  const RADIAN = Math.PI / 180
  const ir = typeof innerRadius === 'number' ? innerRadius : 0
  const or = typeof outerRadius === 'number' ? outerRadius : 0
  const ma = typeof midAngle === 'number' ? midAngle : 0
  const cxN = typeof cx === 'number' ? cx : 0
  const cyN = typeof cy === 'number' ? cy : 0
  const r = ir + (or - ir) * 0.55
  const x = cxN + r * Math.cos(-ma * RADIAN)
  const y = cyN + r * Math.sin(-ma * RADIAN)
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={10} fontWeight={600}>
      {name}
    </text>
  )
}

// ── 섹션 카드 ──────────────────────────────────────────
function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] p-5 ${className}`}>
      <p className="text-[12px] font-semibold text-gray-700 mb-4">{title}</p>
      {children}
    </div>
  )
}

// ── 메인 ──────────────────────────────────────────────
export default function StatisticsPage() {
  const [period, setPeriod] = useState<Period>('최근 8주')
  const currentTeamId = useAuthStore((state) => state.currentTeam?.id)
  const statisticsQuery = useStatisticsSummaryQuery(currentTeamId)
  const stats = statisticsQuery.data

  const weeklyTrend = stats?.weeklyTrend ?? WEEKLY_TREND
  const domainData = stats?.domainData ?? DOMAIN_DATA
  const defectSeverity = stats?.defectSeverity ?? DEFECT_SEVERITY
  const memberStats = stats?.memberStats ?? MEMBER_STATS
  const statusFlow = stats?.statusFlow ?? STATUS_FLOW

  const kpi = [
    { label: '총 업무요청', value: stats?.kpi.totalRequests ?? KPI[0].value, sub: '전체 업무요청 수', delta: true, icon: <DocIcon />, color: 'text-blue-600 bg-blue-50' },
    { label: '평균 처리 기간', value: `${stats?.kpi.averageProcessingDays ?? 0}일`, sub: '완료 기준 평균', delta: true, icon: <ClockIcon />, color: 'text-indigo-600 bg-indigo-50' },
    { label: '완료율', value: `${stats?.kpi.completionRate ?? 0}%`, sub: '전체 대비 완료 비율', delta: false, icon: <CheckIcon />, color: 'text-emerald-600 bg-emerald-50' },
    { label: '미해결 결함', value: stats?.kpi.unresolvedDefects ?? KPI[3].value, sub: '완료/재현불가 제외', delta: false, icon: <BugIcon />, color: 'text-red-500 bg-red-50' },
  ]

  return (
    <div className="p-6 space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900">통계</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">업무 처리 현황 및 지표 분석</p>
        </div>
        {/* 기간 선택 */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`h-7 px-3 text-[12px] rounded-md font-medium transition-colors ${
                period === p ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-4 gap-4">
        {kpi.map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${k.color}`}>
              {k.icon}
            </div>
            <div>
              <p className="text-[11px] text-gray-400 font-medium">{k.label}</p>
              <p className="text-[22px] font-bold text-gray-900 leading-none mt-0.5">{k.value}</p>
              <p className={`text-[11px] mt-1 ${k.delta ? 'text-emerald-500' : 'text-gray-400'}`}>{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 주별 추이 + 상태 흐름 */}
      <div className="grid grid-cols-[1fr_300px] gap-4">
        <Card title="주별 업무 추이">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklyTrend} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="colorWr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDefect" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDeploy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22C55E" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => <span style={{ fontSize: 11, color: '#64748B' }}>{value}</span>}
                iconSize={8}
                iconType="circle"
              />
              <Area type="monotone" dataKey="wr" name="업무요청" stroke="#3B82F6" strokeWidth={2} fill="url(#colorWr)" dot={{ r: 3, fill: '#3B82F6', strokeWidth: 0 }} />
              <Area type="monotone" dataKey="defect" name="결함" stroke="#EF4444" strokeWidth={2} fill="url(#colorDefect)" dot={{ r: 3, fill: '#EF4444', strokeWidth: 0 }} />
              <Area type="monotone" dataKey="deploy" name="배포" stroke="#22C55E" strokeWidth={2} fill="url(#colorDeploy)" dot={{ r: 3, fill: '#22C55E', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="업무 상태 현황">
          <div className="space-y-2.5">
            {statusFlow.map((s) => {
              const max = Math.max(...statusFlow.map((x) => x.value), 1)
              const pct = Math.round((s.value / max) * 100)
              return (
                <div key={s.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-gray-500 font-medium">{s.name}</span>
                    <span className="text-[12px] font-bold text-gray-700">{s.value}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* 유형별 분포 + 결함 심각도 + 팀원 처리 */}
      <div className="grid grid-cols-3 gap-4">
        {/* 도넛 차트 */}
        <Card title="요청 유형별 분포">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={domainData}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={82}
                paddingAngle={2}
                dataKey="value"
                labelLine={false}
                label={PieLabel}
              >
                {domainData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number | undefined, name: string | undefined) => [(value ?? 0) + '건', name ?? '']}
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #F1F5F9' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
            {domainData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-[11px] text-gray-500">{d.name}</span>
                <span className="text-[11px] font-bold text-gray-700">{d.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* 결함 심각도 */}
        <Card title="결함 심각도 분포">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={defectSeverity} margin={{ top: 0, right: 4, bottom: 0, left: -20 }} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(241,245,249,0.6)' }}
                formatter={(value: number | undefined) => [(value ?? 0) + '건', '결함 수']}
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #F1F5F9' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {defectSeverity.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* 팀원별 처리 건수 */}
        <Card title="팀원별 완료 현황">
          <div className="space-y-3">
            {memberStats.map((m) => {
              const total = m.done + m.inProgress
              const donePct = Math.round((m.done / total) * 100)
              return (
                <div key={m.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-brand/10 flex items-center justify-center text-brand text-[9px] font-bold">
                        {m.name[0]}
                      </div>
                      <span className="text-[12px] text-gray-600 font-medium">{m.name}</span>
                    </div>
                    <span className="text-[11px] text-gray-400">{m.done}/{total}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${donePct}%` }} />
                    <div className="h-full bg-blue-200 flex-1" />
                  </div>
                </div>
              )
            })}
            <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand" />
                <span className="text-[10px] text-gray-400">완료</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-200" />
                <span className="text-[10px] text-gray-400">진행중</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

// ── 아이콘 ────────────────────────────────────────────
function DocIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4 2h7l4 4v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M11 2v4h4M6 10h6M6 13h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
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

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 9l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BugIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <ellipse cx="9" cy="10" rx="4" ry="5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9 5V3M6 6.5L4 5M12 6.5l2-1.5M5 10H2M13 10h3M5 13l-2 2M13 13l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M6.5 5.5a2.5 2.5 0 015 0" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}
