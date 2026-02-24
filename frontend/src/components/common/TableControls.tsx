import { ChevronLeftIcon, ChevronRightIcon, SortAscIcon, SortDescIcon } from './Icons'

export type SortDir = 'asc' | 'desc'

// ── FilterSelect ──────────────────────────────────────
export function FilterSelect({
  value, onChange, options, placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 px-2.5 pr-7 text-[12px] border border-gray-200 rounded-lg bg-gray-50 text-gray-600 focus:outline-none focus:border-brand appearance-none cursor-pointer"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%239CA3AF' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
      }}
    >
      {options.map((o) => (
        <option key={o} value={o}>{o === '전체' ? `${placeholder} 전체` : o}</option>
      ))}
    </select>
  )
}

// ── SortTh ────────────────────────────────────────────
export function SortTh({
  label, sortKey, current, onSort,
}: {
  label: string
  sortKey: string
  current: { key: string; dir: SortDir }
  onSort: (k: string) => void
}) {
  const active = current.key === sortKey
  return (
    <th
      className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-gray-600 transition-colors"
      onClick={() => onSort(sortKey)}
    >
      <span className="flex items-center gap-1">
        {label}
        <span className={active ? 'text-brand' : 'text-gray-300'}>
          {active && current.dir === 'asc' ? <SortAscIcon /> : <SortDescIcon />}
        </span>
      </span>
    </th>
  )
}

// ── PageBtn ───────────────────────────────────────────
export function PageBtn({
  children, disabled, onClick,
}: {
  children: React.ReactNode
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  )
}

// ── Pagination ────────────────────────────────────────
export function Pagination({
  page, totalPages, onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (p: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-1 px-4 py-3 border-t border-gray-100">
      <PageBtn disabled={page === 1} onClick={() => onPageChange(page - 1)}>
        <ChevronLeftIcon />
      </PageBtn>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`w-7 h-7 rounded-md text-[12px] font-medium transition-colors ${
            p === page ? 'bg-brand text-white' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          {p}
        </button>
      ))}
      <PageBtn disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
        <ChevronRightIcon />
      </PageBtn>
    </div>
  )
}

// ── DeadlineCell ──────────────────────────────────────
export function DeadlineCell({ date }: { date: string }) {
  if (!date) {
    return <span className="text-[12px] text-gray-400">-</span>
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadline = new Date(date)
  if (Number.isNaN(deadline.getTime())) {
    return <span className="text-[12px] text-gray-400">-</span>
  }

  const diff = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  let cls = 'text-gray-500'
  if (diff < 0) cls = 'text-red-500 font-semibold'
  else if (diff <= 3) cls = 'text-orange-500 font-semibold'
  return <span className={`text-[12px] ${cls}`}>{date.slice(5) || date}</span>
}
