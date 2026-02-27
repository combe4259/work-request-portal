import { Handle, Position } from '@xyflow/react'
import type { FlowNode, FlowNodeType } from '@/features/flow/types'

const STATUS_COLORS: Record<string, string> = {
  접수대기: 'bg-gray-100 text-gray-500',
  접수완료: 'bg-blue-50 text-blue-600',
  개발중: 'bg-indigo-50 text-indigo-600',
  완료: 'bg-emerald-50 text-emerald-600',
  반려: 'bg-red-50 text-red-500',
  작성중: 'bg-gray-100 text-gray-500',
  승인됨: 'bg-emerald-50 text-emerald-600',
  실행중: 'bg-blue-50 text-blue-600',
  통과: 'bg-emerald-50 text-emerald-600',
  실패: 'bg-red-50 text-red-500',
  대기: 'bg-gray-100 text-gray-500',
  진행중: 'bg-blue-50 text-blue-600',
  롤백: 'bg-orange-50 text-orange-600',
  접수: 'bg-gray-100 text-gray-600',
  분석중: 'bg-yellow-50 text-yellow-700',
  수정중: 'bg-indigo-50 text-indigo-600',
  검증중: 'bg-sky-50 text-sky-700',
  초안: 'bg-amber-50 text-amber-700',
}

function statusCls(status: string): string {
  return STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-500'
}

const NODE_META: Record<FlowNodeType, { label: string; border: string; headerBg: string; icon: React.ReactNode }> = {
  WORK_REQUEST: {
    label: '업무요청',
    border: 'border-blue-300',
    headerBg: 'bg-blue-50',
    icon: (
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <rect x="2" y="1.5" width="10" height="11" rx="1.5" stroke="#3B82F6" strokeWidth="1.3" />
        <path d="M4.5 5h5M4.5 7.5h5M4.5 10h3" stroke="#3B82F6" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  TECH_TASK: {
    label: '기술과제',
    border: 'border-indigo-300',
    headerBg: 'bg-indigo-50',
    icon: (
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <path d="M2 4.5L6.5 2l4.5 2.5M2 4.5v5L6.5 12l4.5-2.5V4.5M2 4.5L6.5 7l4.5-2.5M6.5 7v5" stroke="#6366F1" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    ),
  },
  TEST_SCENARIO: {
    label: '테스트',
    border: 'border-emerald-300',
    headerBg: 'bg-emerald-50',
    icon: (
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5" stroke="#10B981" strokeWidth="1.3" />
        <path d="M4.5 7l2 2 3-3.5" stroke="#10B981" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  DEPLOYMENT: {
    label: '배포',
    border: 'border-orange-300',
    headerBg: 'bg-orange-50',
    icon: (
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <path d="M7 1.5v7M4.5 6L7 8.5 9.5 6" stroke="#F97316" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 10.5h10" stroke="#F97316" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  DEFECT: {
    label: '결함',
    border: 'border-rose-300',
    headerBg: 'bg-rose-50',
    icon: (
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <path d="M7 2.2l3.7 2.1v4.2L7 10.6 3.3 8.5V4.3L7 2.2z" stroke="#E11D48" strokeWidth="1.2" />
        <path d="M7 4.8v2.1M7 8.6h.01" stroke="#E11D48" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  KNOWLEDGE_BASE: {
    label: '지식',
    border: 'border-cyan-300',
    headerBg: 'bg-cyan-50',
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
  return nodeType === 'WORK_REQUEST' || nodeType === 'TECH_TASK'
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
    <div
      className={`relative bg-white rounded-xl border-2 shadow-sm w-[240px] transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-brand/30' : ''
      } ${meta.border}`}
    >
      {!isRoot && <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-gray-300 !border-white" />}

      <div className={`flex items-center justify-between px-3 py-2 rounded-t-xl ${meta.headerBg}`}>
        <div className="flex items-center gap-1.5">
          {meta.icon}
          <span className="text-[10px] font-semibold text-gray-500 tracking-wide uppercase">{meta.label}</span>
        </div>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusCls(data.status)}`}>
          {data.isSavingDraft ? '저장중' : data.status}
        </span>
      </div>

      <div className="px-3 py-2.5 space-y-1">
        <p className="text-[10px] text-gray-400 font-mono">{data.docNo}</p>

        {isDraft ? (
          <div className="space-y-1">
            <input
              value={data.draftTitle ?? ''}
              onChange={(event) => {
                event.stopPropagation()
                data.onDraftTitleChange?.(data.id, event.target.value)
              }}
              onBlur={() => data.onDraftTitleCommit?.(data.id)}
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
          <p className="text-[10px] text-orange-500 font-medium">{data.version}</p>
        ) : null}
        {data.assigneeName ? (
          <p className="text-[10px] text-gray-400">담당 · {data.assigneeName}</p>
        ) : null}
      </div>

      <div className="px-3 pb-2.5 flex items-center justify-end gap-2">
        <button
          type="button"
          disabled={isDraft}
          onClick={(event) => {
            event.stopPropagation()
            if (isDraft) {
              return
            }
            if (data.onOpenDocument) {
              data.onOpenDocument(data)
              return
            }
            window.location.href = detailPath(data.nodeType, data.entityId)
          }}
          className={`flex items-center gap-1 text-[10px] font-semibold transition-colors border rounded-lg px-2 py-1 nodrag nopan ${
            isDraft
              ? 'text-gray-300 border-gray-200 cursor-not-allowed'
              : 'text-gray-500 hover:text-brand border-gray-200 hover:border-brand/40'
          }`}
        >
          문서 열기
        </button>
      </div>

      {showSourceHandle ? (
        <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-gray-300 !border-white" />
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
