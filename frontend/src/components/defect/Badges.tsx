import type { DefectType, Severity, DefectStatus } from '@/types/defect'
import BadgePill from '@/components/common/BadgePill'

// ── 유형 배지 ─────────────────────────────────────────
const TYPE_STYLES: Record<DefectType, string> = {
  'UI':   'bg-blue-50 text-blue-600',
  '기능': 'bg-indigo-50 text-indigo-600',
  '성능': 'bg-amber-50 text-amber-600',
  '보안': 'bg-red-50 text-red-600',
  '데이터': 'bg-cyan-50 text-cyan-700',
  '기타': 'bg-gray-100 text-gray-500',
}

export function DefectTypeBadge({ type }: { type: DefectType }) {
  return <BadgePill label={type} tone={TYPE_STYLES[type]} />
}

// ── 심각도 배지 ───────────────────────────────────────
const SEVERITY_STYLES: Record<Severity, string> = {
  '치명적': 'bg-red-500 text-white',
  '높음':   'bg-orange-100 text-orange-700',
  '보통':   'bg-yellow-50 text-yellow-700',
  '낮음':   'bg-gray-100 text-gray-500',
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <BadgePill label={severity} tone={SEVERITY_STYLES[severity]} strong />
}

// ── 상태 배지 ─────────────────────────────────────────
const STATUS_STYLES: Record<DefectStatus, string> = {
  '접수':    'bg-gray-100 text-gray-500',
  '분석중':  'bg-blue-50 text-blue-600',
  '수정중':  'bg-amber-50 text-amber-600',
  '검증중':  'bg-purple-50 text-purple-600',
  '완료':    'bg-emerald-50 text-emerald-700',
  '재현불가': 'bg-slate-100 text-slate-500',
  '보류':    'bg-orange-50 text-orange-500',
}

export function DefectStatusBadge({ status }: { status: DefectStatus }) {
  return <BadgePill label={status} tone={STATUS_STYLES[status]} />
}
