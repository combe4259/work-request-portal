interface ShowMoreButtonProps {
  expanded: boolean
  hiddenCount: number
  onToggle: () => void
  className?: string
}

export default function ShowMoreButton({
  expanded,
  hiddenCount,
  onToggle,
  className,
}: ShowMoreButtonProps) {
  if (!expanded && hiddenCount <= 0) {
    return null
  }

  const label = expanded ? '접기' : `더보기 (${hiddenCount}개)`

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex h-7 items-center rounded-md border border-gray-200 px-2.5 text-[11px] font-semibold text-gray-600 transition-colors hover:bg-gray-50 ${className ?? ''}`}
    >
      {label}
    </button>
  )
}

