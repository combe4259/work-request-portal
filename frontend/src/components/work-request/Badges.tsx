import type { RequestType, Priority, Status } from '@/types/work-request'

// ── 유형 배지 ─────────────────────────────────────────
const TYPE_STYLES: Record<RequestType, string> = {
  '기능개선': 'bg-sky-50 text-sky-700',
  '신규개발': 'bg-indigo-50 text-indigo-700',
  '버그수정': 'bg-rose-50 text-rose-700',
  '인프라':   'bg-amber-50 text-amber-700',
  '기타':     'bg-gray-100 text-gray-500',
}

export function TypeBadge({ type }: { type: RequestType }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium ${TYPE_STYLES[type]}`}>
      {type}
    </span>
  )
}

// ── 우선순위 배지 ──────────────────────────────────────
const PRIORITY_STYLES: Record<Priority, string> = {
  '긴급': 'bg-red-50 text-red-600',
  '높음': 'bg-orange-50 text-orange-600',
  '보통': 'bg-blue-50 text-blue-600',
  '낮음': 'bg-gray-100 text-gray-400',
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium ${PRIORITY_STYLES[priority]}`}>
      {priority}
    </span>
  )
}

// ── 상태 배지 ─────────────────────────────────────────
const STATUS_STYLES: Record<Status, string> = {
  '접수대기': 'bg-gray-100 text-gray-500',
  '검토중':   'bg-yellow-50 text-yellow-700',
  '개발중':   'bg-blue-50 text-blue-700',
  '테스트중': 'bg-violet-50 text-violet-700',
  '완료':     'bg-emerald-50 text-emerald-700',
  '반려':     'bg-rose-50 text-rose-700',
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  )
}
