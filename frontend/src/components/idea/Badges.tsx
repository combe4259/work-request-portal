import type { IdeaCategory, IdeaStatus } from '@/types/idea'

const CATEGORY_STYLES: Record<IdeaCategory, string> = {
  'UX/UI':   'bg-blue-50 text-blue-600',
  '기능':    'bg-emerald-50 text-emerald-700',
  '인프라':  'bg-orange-50 text-orange-600',
  '프로세스': 'bg-purple-50 text-purple-600',
  '기타':    'bg-gray-100 text-gray-500',
}

export function CategoryBadge({ category }: { category: IdeaCategory }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium ${CATEGORY_STYLES[category]}`}>
      {category}
    </span>
  )
}

const STATUS_STYLES: Record<IdeaStatus, string> = {
  '제안됨': 'bg-gray-100 text-gray-500',
  '검토중': 'bg-blue-50 text-blue-600',
  '채택':   'bg-emerald-50 text-emerald-700',
  '보류':   'bg-orange-50 text-orange-500',
  '기각':   'bg-red-50 text-red-500',
}

export function IdeaStatusBadge({ status }: { status: IdeaStatus }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  )
}
