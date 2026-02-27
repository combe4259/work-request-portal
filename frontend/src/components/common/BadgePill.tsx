import { cn } from '@/lib/utils'

interface BadgePillProps {
  label: string
  tone: string
  strong?: boolean
  className?: string
}

export default function BadgePill({ label, tone, strong = false, className }: BadgePillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center h-5 px-2 rounded-md text-[11px] leading-none whitespace-nowrap',
        strong ? 'font-semibold' : 'font-medium',
        tone,
        className,
      )}
    >
      {label}
    </span>
  )
}
