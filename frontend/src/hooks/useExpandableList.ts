import { useMemo, useState } from 'react'

export interface ExpandableListState<T> {
  expanded: boolean
  visibleItems: T[]
  hiddenCount: number
  toggle: () => void
}

export function useExpandableList<T>(items: T[], initialVisibleCount: number): ExpandableListState<T> {
  const safeInitialCount = Math.max(initialVisibleCount, 1)
  const [expanded, setExpanded] = useState(false)

  const visibleItems = useMemo(() => {
    if (expanded) {
      return items
    }
    return items.slice(0, safeInitialCount)
  }, [expanded, items, safeInitialCount])

  const hiddenCount = Math.max(items.length - safeInitialCount, 0)

  return {
    expanded,
    visibleItems,
    hiddenCount,
    toggle: () => setExpanded((prev) => !prev),
  }
}

