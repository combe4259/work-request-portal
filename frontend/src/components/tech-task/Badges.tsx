import type { TechTaskType } from '@/types/tech-task'
import BadgePill from '@/components/common/BadgePill'

const TECH_TYPE_STYLES: Record<TechTaskType, string> = {
  '리팩토링': 'bg-slate-100 text-slate-600',
  '기술부채': 'bg-orange-50 text-orange-600',
  '성능개선': 'bg-cyan-50 text-cyan-700',
  '보안':     'bg-red-50 text-red-600',
  '테스트':   'bg-emerald-50 text-emerald-700',
  '기타':     'bg-gray-100 text-gray-500',
}

export function TechTypeBadge({ type }: { type: TechTaskType }) {
  return <BadgePill label={type} tone={TECH_TYPE_STYLES[type]} />
}
