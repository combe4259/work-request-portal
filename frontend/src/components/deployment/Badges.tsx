import type { DeployType, DeployEnv, DeployStatus } from '@/types/deployment'
import BadgePill from '@/components/common/BadgePill'

// ── 유형 배지 ─────────────────────────────────────────
const TYPE_STYLES: Record<DeployType, string> = {
  '정기배포': 'bg-blue-50 text-blue-600',
  '긴급패치': 'bg-red-50 text-red-600',
  '핫픽스':   'bg-orange-50 text-orange-600',
  '롤백':     'bg-slate-100 text-slate-600',
  '기타':     'bg-gray-100 text-gray-500',
}

export function DeployTypeBadge({ type }: { type: DeployType }) {
  return <BadgePill label={type} tone={TYPE_STYLES[type]} />
}

// ── 환경 배지 ─────────────────────────────────────────
const ENV_STYLES: Record<DeployEnv, string> = {
  '개발':    'bg-gray-100 text-gray-500',
  '스테이징': 'bg-amber-50 text-amber-600',
  '운영':    'bg-red-500 text-white',
}

export function DeployEnvBadge({ env }: { env: DeployEnv }) {
  return <BadgePill label={env} tone={ENV_STYLES[env]} strong />
}

// ── 상태 배지 ─────────────────────────────────────────
const STATUS_STYLES: Record<DeployStatus, string> = {
  '대기':   'bg-gray-100 text-gray-500',
  '진행중': 'bg-blue-50 text-blue-600',
  '완료':   'bg-emerald-50 text-emerald-700',
  '실패':   'bg-red-50 text-red-600',
  '롤백':   'bg-orange-50 text-orange-600',
}

export function DeployStatusBadge({ status }: { status: DeployStatus }) {
  return <BadgePill label={status} tone={STATUS_STYLES[status]} />
}
