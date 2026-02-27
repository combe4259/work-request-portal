import { type ReactNode } from 'react'

interface PageHeaderAction {
  label: string
  onClick: () => void
  icon?: ReactNode
}

interface PageHeaderProps {
  title: string
  count?: number
  unit?: string
  subtitle?: string
  action?: PageHeaderAction
  className?: string
}

export default function PageHeader({
  title,
  count,
  unit = '건',
  subtitle,
  action,
  className = '',
}: PageHeaderProps) {
  const caption = subtitle ?? (count == null ? undefined : `총 ${count}${unit}`)

  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h1 className="text-[18px] font-bold text-gray-900">{title}</h1>
        {caption && <p className="text-[12px] text-gray-400 mt-0.5">{caption}</p>}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-1.5 h-8 px-3 bg-brand hover:bg-brand-hover text-white text-[13px] font-semibold rounded-lg transition-colors whitespace-nowrap"
        >
          {action.icon}
          {action.label}
        </button>
      )}
    </div>
  )
}
