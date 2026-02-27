import type { TestScenarioType, TestStatus } from '@/types/test-scenario'
import BadgePill from '@/components/common/BadgePill'

// ── 유형 배지 ─────────────────────────────────────────
const TYPE_STYLES: Record<TestScenarioType, string> = {
  '기능':  'bg-blue-50 text-blue-600',
  '회귀':  'bg-purple-50 text-purple-600',
  '통합':  'bg-cyan-50 text-cyan-700',
  'E2E':   'bg-indigo-50 text-indigo-600',
  '성능':  'bg-amber-50 text-amber-600',
  '보안':  'bg-red-50 text-red-600',
  '기타':  'bg-gray-100 text-gray-500',
}

export function TestTypeBadge({ type }: { type: TestScenarioType }) {
  return <BadgePill label={type} tone={TYPE_STYLES[type]} />
}

// ── 상태 배지 ─────────────────────────────────────────
const STATUS_STYLES: Record<TestStatus, string> = {
  '작성중': 'bg-gray-100 text-gray-500',
  '검토중': 'bg-blue-50 text-blue-600',
  '승인됨': 'bg-indigo-50 text-indigo-600',
  '실행중': 'bg-amber-50 text-amber-600',
  '통과':   'bg-emerald-50 text-emerald-700',
  '실패':   'bg-red-50 text-red-600',
  '보류':   'bg-orange-50 text-orange-500',
}

export function TestStatusBadge({ status }: { status: TestStatus }) {
  return <BadgePill label={status} tone={STATUS_STYLES[status]} />
}
