interface BaseStateProps {
  title: string
  description?: string
}

interface ActionStateProps extends BaseStateProps {
  actionLabel?: string
  onAction?: () => void
}

export function LoadingState({ title, description }: BaseStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center" role="status" aria-live="polite">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-brand" />
      <p className="mt-3 text-sm font-semibold text-gray-700">{title}</p>
      {description && <p className="mt-1 text-xs text-gray-400">{description}</p>}
    </div>
  )
}

export function EmptyState({ title, description, actionLabel, onAction }: ActionStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      {description && <p className="mt-1 text-xs text-gray-400">{description}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 h-8 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export function ErrorState({ title, description, actionLabel, onAction }: ActionStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center" role="alert">
      <p className="text-sm font-semibold text-red-600">{title}</p>
      {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 h-8 rounded-lg bg-brand px-3 text-xs font-semibold text-white transition-colors hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/40"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
