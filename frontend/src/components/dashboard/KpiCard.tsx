const COLOR_MAP = {
  brand:   { bg: 'bg-brand/8',    icon: 'bg-brand/12 text-brand',         num: 'text-brand' },
  blue:    { bg: 'bg-blue-50',    icon: 'bg-blue-100 text-blue-600',       num: 'text-blue-600' },
  emerald: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', num: 'text-emerald-600' },
  red:     { bg: 'bg-red-50',     icon: 'bg-red-100 text-red-500',         num: 'text-red-500' },
}

interface KpiCardProps {
  label: string
  value: number
  sub: string
  color: keyof typeof COLOR_MAP
  icon: React.ReactNode
}

export default function KpiCard({ label, value, sub, color, icon }: KpiCardProps) {
  const c = COLOR_MAP[color]
  return (
    <div className={`${c.bg} rounded-xl px-4 py-3 border border-white shadow-[0_2px_8px_rgba(30,58,138,0.06)]`}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-[12px] font-semibold text-gray-500">{label}</p>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${c.icon}`}>
          {icon}
        </div>
      </div>
      <p className={`text-2xl font-bold leading-none mb-1 ${c.num}`}>{value}</p>
      <p className="text-[11px] text-gray-400">{sub}</p>
    </div>
  )
}
