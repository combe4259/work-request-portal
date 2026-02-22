const ICON_STYLES: Record<string, string> = {
  brand:   'bg-brand/10 text-brand',
  blue:    'bg-blue-100 text-blue-500',
  emerald: 'bg-emerald-100 text-emerald-500',
  red:     'bg-red-100 text-red-400',
}

interface KpiCardProps {
  label: string
  value: number
  sub: string
  color: 'brand' | 'blue' | 'emerald' | 'red'
  icon: React.ReactNode
}

export default function KpiCard({ label, value, sub, color, icon }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl px-4 py-3 border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.06)]">
      <div className="flex items-start justify-between mb-2">
        <p className="text-[12px] font-semibold text-gray-500">{label}</p>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${ICON_STYLES[color]}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold leading-none mb-1 text-brand">{value}</p>
      <p className="text-[11px] text-gray-400">{sub}</p>
    </div>
  )
}
