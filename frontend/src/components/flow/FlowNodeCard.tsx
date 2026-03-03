import { Handle, Position } from '@xyflow/react'
import type { FlowNode, FlowNodeType } from '@/features/flow/types'

const STATUS_COLORS: Record<string, string> = {
  접수대기: 'bg-slate-100 text-slate-500',
  접수완료: 'bg-blue-100 text-blue-600',
  개발중: 'bg-indigo-100 text-indigo-600',
  완료: 'bg-emerald-100 text-emerald-700',
  반려: 'bg-red-100 text-red-600',
  작성중: 'bg-amber-100 text-amber-700',
  승인됨: 'bg-emerald-100 text-emerald-700',
  실행중: 'bg-blue-100 text-blue-600',
  통과: 'bg-emerald-100 text-emerald-700',
  실패: 'bg-red-100 text-red-600',
  대기: 'bg-slate-100 text-slate-500',
  진행중: 'bg-blue-100 text-blue-600',
  롤백: 'bg-orange-100 text-orange-600',
  접수: 'bg-slate-100 text-slate-600',
  분석중: 'bg-yellow-100 text-yellow-700',
  수정중: 'bg-violet-100 text-violet-600',
  검증중: 'bg-sky-100 text-sky-700',
  초안: 'bg-amber-100 text-amber-600',
}

function statusCls(status: string): string {
  return STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-500'
}

const NODE_META: Record<FlowNodeType, {
  label: string
  accent: string
  iconBg: string
  icon: React.ReactNode
}> = {
  WORK_REQUEST: {
    label: '업무요청',
    accent: 'bg-blue-400',
    iconBg: 'bg-blue-100',
    icon: (
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <rect x="2" y="1.5" width="10" height="11" rx="1.5" stroke="#3B82F6" strokeWidth="1.3" />
        <path d="M4.5 5h5M4.5 7.5h5M4.5 10h3" stroke="#3B82F6" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  TECH_TASK: {
    label: '기술과제',
    accent: 'bg-indigo-400',
    iconBg: 'bg-indigo-100',
    icon: (
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <path d="M2 4.5L6.5 2l4.5 2.5M2 4.5v5L6.5 12l4.5-2.5V4.5M2 4.5L6.5 7l4.5-2.5M6.5 7v5" stroke="#6366F1" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    ),
  },
  TEST_SCENARIO: {
    label: '테스트',
    accent: 'bg-emerald-400',
    iconBg: 'bg-emerald-100',
    icon: (
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5" stroke="#10B981" strokeWidth="1.3" />
        <path d="M4.5 7l2 2 3-3.5" stroke="#10B981" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  DEPLOYMENT: {
    label: '배포',
    accent: 'bg-orange-400',
    iconBg: 'bg-orange-100',
    icon: (
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <path d="M7 1.5v7M4.5 6L7 8.5 9.5 6" stroke="#F97316" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 10.5h10" stroke="#F97316" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  DEFECT: {
    label: '결함',
    accent: 'bg-rose-400',
    iconBg: 'bg-rose-100',
    icon: (
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <path d="M7 2.2l3.7 2.1v4.2L7 10.6 3.3 8.5V4.3L7 2.2z" stroke="#E11D48" strokeWidth="1.2" />
        <path d="M7 4.8v2.1M7 8.6h.01" stroke="#E11D48" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  KNOWLEDGE_BASE: {
    label: '지식',
    accent: 'bg-cyan-400',
    iconBg: 'bg-cyan-100',
    icon: (
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <path d="M3 2.5h6.5a1 1 0 011 1V11l-2-1.2L6.5 11 4.5 9.8 3 11V2.5z" stroke="#0891B2" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    ),
  },
}

function detailPath(nodeType: FlowNodeType, entityId: number): string {
  switch (nodeType) {
    case 'WORK_REQUEST':
      return `/work-requests/${entityId}`
    case 'TECH_TASK':
      return `/tech-tasks/${entityId}`
    case 'TEST_SCENARIO':
      return `/test-scenarios/${entityId}`
    case 'DEPLOYMENT':
      return `/deployments/${entityId}`
    case 'DEFECT':
      return `/defects/${entityId}`
    case 'KNOWLEDGE_BASE':
      return `/knowledge-base/${entityId}`
    default:
      return '/'
  }
}

function canHaveChildren(nodeType: FlowNodeType): boolean {
  return nodeType !== 'KNOWLEDGE_BASE'
}

type DraftNodeHandlers = {
  onDraftTitleChange?: (id: string, value: string) => void
  onDraftTitleCommit?: (id: string) => void
}

interface FlowNodeCardProps {
  data: FlowNode & {
    workRequestId: number
    selectedNodeId?: string | null
    onOpenDocument?: (node: FlowNode) => void
    hideAddAction?: boolean
    isDraft?: boolean
    draftTitle?: string
    isSavingDraft?: boolean
    draftError?: string
  } & DraftNodeHandlers
  isRoot?: boolean
}

export function FlowNodeCard({ data, isRoot }: FlowNodeCardProps) {
  const meta = NODE_META[data.nodeType]
  const isSelected = data.selectedNodeId === data.id
  const isDraft = Boolean(data.isDraft)
  const showSourceHandle = canHaveChildren(data.nodeType)

  return (
    <div className="relative w-[240px]">
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-2.5 !h-2.5 !bg-white !border-2 !border-gray-300 !rounded-full"
        />
      )}

      <div
        className={`bg-white rounded-xl border overflow-hidden transition-shadow ${
          isSelected
            ? 'border-blue-300 shadow-[0_0_0_3px_rgba(59,130,246,0.15),0_4px_16px_rgba(0,0,0,0.10)]'
            : 'border-gray-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.07)] hover:shadow-[0_6px_18px_rgba(0,0,0,0.11)]'
        }`}
      >

      {/* Top accent stripe — overflow-hidden clips it cleanly */}
      <div className={`h-[3px] ${meta.accent}`} />

      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.iconBg}`}>
            {meta.icon}
          </div>
          <span className="text-[10px] font-bold text-gray-400 tracking-[0.07em] uppercase">
            {meta.label}
          </span>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusCls(data.status)}`}>
          {data.isSavingDraft ? '저장중' : data.status}
        </span>
      </div>

      {/* Divider */}
      <div className="mx-3 h-px bg-gray-100" />

      {/* Body */}
      <div className="px-3 py-2.5 space-y-1.5">
        <p className="text-[10px] text-gray-300 font-mono tracking-wider">{data.docNo}</p>

        {isDraft ? (
          <div className="space-y-1">
            <input
              value={data.draftTitle ?? ''}
              onChange={(event) => {
                event.stopPropagation()
                data.onDraftTitleChange?.(data.id, event.target.value)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  data.onDraftTitleCommit?.(data.id)
                }
              }}
              placeholder="제목 입력 후 Enter"
              className="w-full h-8 px-2.5 rounded-md border border-amber-200 text-[12px] font-semibold text-gray-800 focus:outline-none focus:border-amber-400 bg-amber-50/40 nodrag nopan"
              autoFocus
            />
            {data.draftError ? <p className="text-[10px] text-red-500">{data.draftError}</p> : null}
          </div>
        ) : (
          <p className="text-[12px] font-semibold text-gray-800 leading-snug line-clamp-2">{data.title}</p>
        )}

        {data.version ? (
          <span className="inline-block text-[10px] font-mono text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-md">
            {data.version}
          </span>
        ) : null}

        {data.assigneeName ? (
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <circle cx="4" cy="2.5" r="1.5" fill="#CBD5E1" />
                <path d="M1.5 7.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5" stroke="#CBD5E1" strokeWidth="1" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-[10px] text-gray-400">{data.assigneeName}</p>
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="px-3 pb-3 flex items-center justify-end border-t border-gray-50 pt-2">
        <button
          type="button"
          disabled={isDraft}
          onClick={(event) => {
            event.stopPropagation()
            if (isDraft) return
            if (data.onOpenDocument) {
              data.onOpenDocument(data)
              return
            }
            window.location.href = detailPath(data.nodeType, data.entityId)
          }}
          className={`flex items-center gap-1 text-[10px] font-semibold transition-colors nodrag nopan ${
            isDraft
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-400 hover:text-brand'
          }`}
        >
          문서 열기
          {!isDraft && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2.5 5h5M5.5 2.5 8 5l-2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>

      </div>

      {showSourceHandle ? (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-2.5 !h-2.5 !bg-white !border-2 !border-gray-300 !rounded-full"
        />
      ) : null}
    </div>
  )
}

export function WorkRequestFlowNode(props: { data: FlowNodeCardProps['data'] }) {
  return <FlowNodeCard data={props.data} isRoot />
}

export function TechTaskFlowNode(props: { data: FlowNodeCardProps['data'] }) {
  return <FlowNodeCard data={props.data} />
}

export function TestScenarioFlowNode(props: { data: FlowNodeCardProps['data'] }) {
  return <FlowNodeCard data={props.data} />
}

export function DeploymentFlowNode(props: { data: FlowNodeCardProps['data'] }) {
  return <FlowNodeCard data={props.data} />
}

export function DefectFlowNode(props: { data: FlowNodeCardProps['data'] }) {
  return <FlowNodeCard data={props.data} />
}

export function KnowledgeBaseFlowNode(props: { data: FlowNodeCardProps['data'] }) {
  return <FlowNodeCard data={props.data} />
}
