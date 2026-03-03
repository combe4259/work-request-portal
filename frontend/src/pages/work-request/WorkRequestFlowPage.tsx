import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { useBlocker, useLocation, useNavigate } from 'react-router-dom'
import { Client } from '@stomp/stompjs'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  addEdge,
  reconnectEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import SockJS from 'sockjs-client'

import {
  WorkRequestFlowNode,
  TechTaskFlowNode,
  TestScenarioFlowNode,
  DeploymentFlowNode,
  DefectFlowNode,
  KnowledgeBaseFlowNode,
} from '@/components/flow/FlowNodeCard'
import WorkRequestDetailBody, { type WorkRequestRelatedRef } from '@/components/work-request/WorkRequestDetailBody'
import TechTaskDetailBody from '@/components/tech-task/TechTaskDetailBody'
import TestScenarioDetailBody, { type TestScenarioRelatedDocItem } from '@/components/test-scenario/TestScenarioDetailBody'
import DefectDetailBody from '@/components/defect/DefectDetailBody'
import DeploymentDetailBody from '@/components/deployment/DeploymentDetailBody'
import KnowledgeBaseDetailBody from '@/components/knowledge-base/KnowledgeBaseDetailBody'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { TypeBadge, PriorityBadge, StatusBadge } from '@/components/work-request/Badges'
import { TechTypeBadge } from '@/components/tech-task/Badges'
import { TestTypeBadge, TestStatusBadge } from '@/components/test-scenario/Badges'
import { DefectTypeBadge, SeverityBadge, DefectStatusBadge } from '@/components/defect/Badges'
import { DeployTypeBadge, DeployEnvBadge, DeployStatusBadge } from '@/components/deployment/Badges'
import { listAttachments } from '@/features/attachment/service'
import { getFlowChain, getFlowUiState, createFlowItem, saveFlowUiState } from '@/features/flow/service'
import { getDefect } from '@/features/defect/service'
import { getKnowledgeBaseArticle } from '@/features/knowledge-base/service'
import { getWorkRequest, listWorkRequestRelatedRefs } from '@/features/work-request/service'
import { getTechTask, listTechTaskPrLinks, listTechTaskRelatedRefs } from '@/features/tech-task/service'
import { getTestScenario, listTestScenarioRelatedRefs } from '@/features/test-scenario/service'
import { getDeployment, listDeploymentRelatedRefs, listDeploymentSteps } from '@/features/deployment/service'
import { useAuthStore } from '@/stores/authStore'
import type { RequestType, Priority, Status } from '@/types/work-request'
import type { TechTaskType } from '@/types/tech-task'
import type { TestScenarioType, TestStatus } from '@/types/test-scenario'
import type { DefectType, Severity, DefectStatus } from '@/types/defect'
import type { DeployType, DeployEnv, DeployStatus } from '@/types/deployment'
import type { KBCategory } from '@/types/knowledge-base'
import type {
  FlowChainData,
  FlowNode,
  FlowNodeType,
  FlowItemType,
  FlowParentType,
  FlowUiState,
  FlowUiCustomNode,
  FlowUiStateSaveRequest,
} from '@/features/flow/types'
import { useWorkRequestsQuery } from '@/features/work-request/queries'
import type { WorkRequestListParams } from '@/features/work-request/service'

const FLOW_LIST_PARAMS: WorkRequestListParams = {
  search: '',
  filterType: '전체',
  filterPriority: '전체',
  filterStatus: '전체',
  filterAssigneeId: null,
  sortKey: 'docNo',
  sortDir: 'desc',
  page: 1,
  pageSize: 100,
}

const nodeTypes = {
  workRequestNode: WorkRequestFlowNode,
  techTaskNode: TechTaskFlowNode,
  testScenarioNode: TestScenarioFlowNode,
  deploymentNode: DeploymentFlowNode,
  defectNode: DefectFlowNode,
  knowledgeBaseNode: KnowledgeBaseFlowNode,
}

const NODE_W = 240
const NODE_H = 130
const H_GAP = 50
const V_GAP = 70
const FLOW_DRAG_TYPE = 'application/x-workflow-palette-type'
const DRAWER_MIN_WIDTH = 460
const DRAWER_MAX_WIDTH = 980
const DRAWER_DEFAULT_WIDTH = 620
const DRAWER_CLOSE_ANIMATION_MS = 320
const DRAWER_REOPEN_DELAY_MS = 120
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api'
const WS_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '')
const WS_ENDPOINT = `${WS_BASE_URL}/ws`

type FlowUiSyncMessage = {
  workRequestId?: number
  actorUserId?: number
  syncedAtEpochMs?: number
}

type PaletteNodeType = Exclude<FlowNodeType, 'WORK_REQUEST'>

type FlowNodeCardData = FlowNode & Record<string, unknown> & {
  workRequestId: number
  onOpenDocument: (node: FlowNode) => void
  selectedNodeId: string | null
  hideAddAction?: boolean
  isDraft?: boolean
  draftTitle?: string
  isSavingDraft?: boolean
  draftError?: string
  onDraftTitleChange?: (id: string, value: string) => void
  onDraftTitleCommit?: (id: string) => void
  draftParentNodeId?: string
  draftParentType?: string
  draftParentEntityId?: number
}

const PALETTE_ITEMS: Array<{
  type: PaletteNodeType
  label: string
  desc: string
  bg: string
  border: string
  iconBg: string
  textColor: string
  icon: React.ReactNode
}> = [
  {
    type: 'TECH_TASK',
    label: '기술과제',
    desc: 'TECH',
    bg: 'bg-indigo-50/50 hover:bg-indigo-50',
    border: 'border-indigo-200',
    iconBg: 'bg-indigo-100',
    textColor: 'text-indigo-700',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 4.5L6.5 2l4.5 2.5M2 4.5v5L6.5 12l4.5-2.5V4.5M2 4.5L6.5 7l4.5-2.5M6.5 7v5" stroke="#6366F1" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    type: 'TEST_SCENARIO',
    label: '테스트 시나리오',
    desc: 'TEST',
    bg: 'bg-emerald-50/50 hover:bg-emerald-50',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    textColor: 'text-emerald-700',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5" stroke="#10B981" strokeWidth="1.4" />
        <path d="M4.5 7l2 2 3-3.5" stroke="#10B981" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    type: 'DEFECT',
    label: '결함',
    desc: 'DEFECT',
    bg: 'bg-rose-50/50 hover:bg-rose-50',
    border: 'border-rose-200',
    iconBg: 'bg-rose-100',
    textColor: 'text-rose-700',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 2.2l3.7 2.1v4.2L7 10.6 3.3 8.5V4.3L7 2.2z" stroke="#E11D48" strokeWidth="1.3" />
        <path d="M7 4.8v2.1M7 8.6h.01" stroke="#E11D48" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    type: 'DEPLOYMENT',
    label: '배포 관리',
    desc: 'DEPLOY',
    bg: 'bg-orange-50/50 hover:bg-orange-50',
    border: 'border-orange-200',
    iconBg: 'bg-orange-100',
    textColor: 'text-orange-700',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1.5v7M4.5 6L7 8.5 9.5 6" stroke="#F97316" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 10.5h10" stroke="#F97316" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    type: 'KNOWLEDGE_BASE',
    label: '지식 베이스',
    desc: 'KB',
    bg: 'bg-cyan-50/50 hover:bg-cyan-50',
    border: 'border-cyan-200',
    iconBg: 'bg-cyan-100',
    textColor: 'text-cyan-700',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M3 2.5h6.5a1 1 0 011 1V11l-2-1.2L6.5 11 4.5 9.8 3 11V2.5z" stroke="#0891B2" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    ),
  },
]

function parseWorkRequestId(search: string): number | null {
  const params = new URLSearchParams(search)
  const value = Number(params.get('workRequestId'))
  if (!Number.isInteger(value) || value <= 0) {
    return null
  }
  return value
}

function getReactFlowNodeType(nodeType: FlowNodeType): string {
  switch (nodeType) {
    case 'WORK_REQUEST':
      return 'workRequestNode'
    case 'TECH_TASK':
      return 'techTaskNode'
    case 'TEST_SCENARIO':
      return 'testScenarioNode'
    case 'DEPLOYMENT':
      return 'deploymentNode'
    case 'DEFECT':
      return 'defectNode'
    case 'KNOWLEDGE_BASE':
      return 'knowledgeBaseNode'
    default:
      return 'techTaskNode'
  }
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
      return '/work-requests'
  }
}

function refRoute(refType: string, refId: number): string | null {
  switch (refType) {
    case 'WORK_REQUEST':
      return `/work-requests/${refId}`
    case 'TECH_TASK':
      return `/tech-tasks/${refId}`
    case 'TEST_SCENARIO':
      return `/test-scenarios/${refId}`
    case 'DEFECT':
      return `/defects/${refId}`
    case 'DEPLOYMENT':
      return `/deployments/${refId}`
    case 'MEETING_NOTE':
      return `/meeting-notes/${refId}`
    case 'PROJECT_IDEA':
      return `/ideas/${refId}`
    case 'KNOWLEDGE_BASE':
      return `/knowledge-base/${refId}`
    default:
      return null
  }
}

function edgeStrokeStyle(selected: boolean): { stroke: string; strokeWidth: number } {
  return {
    stroke: selected ? '#2563EB' : '#CBD5E1',
    strokeWidth: selected ? 2.8 : 1.5,
  }
}

function toFlowEdge(id: string, source: string, target: string, selected = false): Edge {
  return {
    id,
    source,
    target,
    type: 'smoothstep',
    reconnectable: true,
    selected,
    markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#94A3B8' },
    style: edgeStrokeStyle(selected),
  }
}

function canLinkNode(sourceType: FlowNodeType, targetType: FlowNodeType): boolean {
  if (sourceType === 'WORK_REQUEST') {
    return targetType !== 'WORK_REQUEST'
  }
  if (sourceType === 'TECH_TASK') {
    return (
      targetType === 'TEST_SCENARIO'
      || targetType === 'DEPLOYMENT'
      || targetType === 'DEFECT'
      || targetType === 'KNOWLEDGE_BASE'
    )
  }
  if (sourceType === 'TEST_SCENARIO') {
    return targetType === 'DEFECT' || targetType === 'KNOWLEDGE_BASE'
  }
  return false
}

const PREFERRED_PARENT: Record<PaletteNodeType, FlowNodeType[]> = {
  TECH_TASK:      ['WORK_REQUEST'],
  TEST_SCENARIO:  ['TECH_TASK', 'WORK_REQUEST'],
  DEFECT:         ['TEST_SCENARIO', 'TECH_TASK', 'WORK_REQUEST'],
  DEPLOYMENT:     ['TECH_TASK', 'WORK_REQUEST'],
  KNOWLEDGE_BASE: ['TEST_SCENARIO', 'TECH_TASK', 'WORK_REQUEST'],
}


function isPaletteNodeType(value: string): value is PaletteNodeType {
  return value === 'TECH_TASK'
    || value === 'TEST_SCENARIO'
    || value === 'DEFECT'
    || value === 'DEPLOYMENT'
    || value === 'KNOWLEDGE_BASE'
}


function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== 'object' || error == null) {
    return fallback
  }

  const withResponse = error as {
    response?: {
      data?: {
        message?: unknown
        error?: unknown
      }
    }
    message?: unknown
  }

  const message = withResponse.response?.data?.message
  if (typeof message === 'string' && message.trim()) {
    return message
  }

  const errorText = withResponse.response?.data?.error
  if (typeof errorText === 'string' && errorText.trim()) {
    return errorText
  }

  if (typeof withResponse.message === 'string' && withResponse.message.trim()) {
    return withResponse.message
  }

  return fallback
}

function isConflictError(error: unknown): boolean {
  if (typeof error !== 'object' || error == null) {
    return false
  }
  const withResponse = error as { response?: { status?: unknown } }
  return withResponse.response?.status === 409
}

function computeLayout(data: FlowChainData): Record<string, { x: number; y: number }> {
  const childrenMap: Record<string, string[]> = {}
  data.edges.forEach((edge) => {
    if (!childrenMap[edge.source]) {
      childrenMap[edge.source] = []
    }
    childrenMap[edge.source].push(edge.target)
  })

  const root = data.nodes.find((node) => node.nodeType === 'WORK_REQUEST')
  if (!root) {
    return {}
  }

  function subtreeWidth(id: string): number {
    const kids = childrenMap[id] ?? []
    if (kids.length === 0) {
      return NODE_W
    }

    const childTotal = kids.reduce((sum, kid) => sum + subtreeWidth(kid), 0)
    return Math.max(NODE_W, childTotal + (kids.length - 1) * H_GAP)
  }

  const positions: Record<string, { x: number; y: number }> = {}

  function assign(id: string, x: number, y: number): void {
    positions[id] = { x, y }

    const kids = childrenMap[id] ?? []
    if (kids.length === 0) {
      return
    }

    const totalW = kids.reduce((sum, kid) => sum + subtreeWidth(kid), 0) + (kids.length - 1) * H_GAP
    let cursorX = x + NODE_W / 2 - totalW / 2

    kids.forEach((kid) => {
      const width = subtreeWidth(kid)
      assign(kid, cursorX, y + NODE_H + V_GAP)
      cursorX += width + H_GAP
    })
  }

  assign(root.id, 0, 0)
  return positions
}

function getNodeData(node: Node | undefined): FlowNodeCardData | null {
  if (!node || typeof node.data !== 'object' || node.data == null) {
    return null
  }

  const data = node.data as Partial<FlowNodeCardData>
  if (!data.id || !data.nodeType || typeof data.entityId !== 'number') {
    return null
  }

  return data as FlowNodeCardData
}

function toNodePayload(data: FlowNodeCardData): FlowUiCustomNode {
  return {
    id: data.id,
    entityId: data.entityId,
    nodeType: data.nodeType as FlowUiCustomNode['nodeType'],
    docNo: data.docNo,
    title: data.title,
    status: data.status,
    priority: data.priority,
    assigneeName: data.assigneeName,
    version: data.version,
  }
}

type WorkRequestDrawerDetailPayload = {
  kind: 'WORK_REQUEST'
  data: Awaited<ReturnType<typeof getWorkRequest>>
  relatedRefs: WorkRequestRelatedRef[]
  attachments: Awaited<ReturnType<typeof listAttachments>>
}

type TechTaskDrawerDetailPayload = {
  kind: 'TECH_TASK'
  data: Awaited<ReturnType<typeof getTechTask>>
  relatedDocs: Awaited<ReturnType<typeof listTechTaskRelatedRefs>>
  prLinks: Awaited<ReturnType<typeof listTechTaskPrLinks>>
  attachments: Awaited<ReturnType<typeof listAttachments>>
}

type TestScenarioDrawerDetailPayload = {
  kind: 'TEST_SCENARIO'
  data: Awaited<ReturnType<typeof getTestScenario>>
  relatedDocs: TestScenarioRelatedDocItem[]
  attachments: Awaited<ReturnType<typeof listAttachments>>
}

type DefectDrawerDetailPayload = {
  kind: 'DEFECT'
  data: Awaited<ReturnType<typeof getDefect>>
  attachments: Awaited<ReturnType<typeof listAttachments>>
}

type DeploymentDrawerDetailPayload = {
  kind: 'DEPLOYMENT'
  data: Awaited<ReturnType<typeof getDeployment>>
  relatedRefs: Awaited<ReturnType<typeof listDeploymentRelatedRefs>>
  steps: Awaited<ReturnType<typeof listDeploymentSteps>>
  attachments: Awaited<ReturnType<typeof listAttachments>>
}

type KnowledgeBaseDrawerDetailPayload = {
  kind: 'KNOWLEDGE_BASE'
  data: Awaited<ReturnType<typeof getKnowledgeBaseArticle>>
}

type DrawerDetailPayload =
  | WorkRequestDrawerDetailPayload
  | TechTaskDrawerDetailPayload
  | TestScenarioDrawerDetailPayload
  | DefectDrawerDetailPayload
  | DeploymentDrawerDetailPayload
  | KnowledgeBaseDrawerDetailPayload

const KB_CATEGORY_STYLES: Record<KBCategory, string> = {
  '개발 가이드': 'bg-blue-50 text-blue-600',
  '아키텍처': 'bg-purple-50 text-purple-600',
  '트러블슈팅': 'bg-red-50 text-red-500',
  '온보딩': 'bg-emerald-50 text-emerald-700',
  '기타': 'bg-gray-100 text-gray-500',
}

function clampDrawerWidth(width: number): number {
  const viewportMax = Math.max(DRAWER_MIN_WIDTH, window.innerWidth - 280)
  return Math.max(DRAWER_MIN_WIDTH, Math.min(Math.min(DRAWER_MAX_WIDTH, viewportMax), width))
}

function renderDrawerBadges(detail: DrawerDetailPayload) {
  switch (detail.kind) {
    case 'WORK_REQUEST':
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          <TypeBadge type={detail.data.type as RequestType} />
          <PriorityBadge priority={detail.data.priority as Priority} />
          <StatusBadge status={detail.data.status as Status} />
        </div>
      )
    case 'TECH_TASK':
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          <TechTypeBadge type={detail.data.type as TechTaskType} />
          <PriorityBadge priority={detail.data.priority as Priority} />
          <StatusBadge status={detail.data.status as Status} />
        </div>
      )
    case 'TEST_SCENARIO':
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          <TestTypeBadge type={detail.data.type as TestScenarioType} />
          <PriorityBadge priority={detail.data.priority as Priority} />
          <TestStatusBadge status={detail.data.status as TestStatus} />
        </div>
      )
    case 'DEFECT':
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          <DefectTypeBadge type={detail.data.type as DefectType} />
          <SeverityBadge severity={detail.data.severity as Severity} />
          <DefectStatusBadge status={detail.data.status as DefectStatus} />
        </div>
      )
    case 'DEPLOYMENT':
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          <DeployTypeBadge type={detail.data.type as DeployType} />
          <DeployEnvBadge env={detail.data.env as DeployEnv} />
          <DeployStatusBadge status={detail.data.status as DeployStatus} />
        </div>
      )
    case 'KNOWLEDGE_BASE':
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${KB_CATEGORY_STYLES[detail.data.category]}`}>
            {detail.data.category}
          </span>
          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-cyan-50 text-cyan-700">지식 베이스</span>
        </div>
      )
    default:
      return null
  }
}

export default function WorkRequestFlowPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [selectedWorkRequestId, setSelectedWorkRequestId] = useState<number | null>(() => parseWorkRequestId(location.search))
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [isLoadingFlow, setIsLoadingFlow] = useState(false)
  const [flowError, setFlowError] = useState('')
  const [notice, setNotice] = useState('')
  const [drawerNode, setDrawerNode] = useState<FlowNodeCardData | null>(null)
  const [isDrawerVisible, setIsDrawerVisible] = useState(false)
  const [drawerWidth, setDrawerWidth] = useState(DRAWER_DEFAULT_WIDTH)
  const [isResizingDrawer, setIsResizingDrawer] = useState(false)
  const [isDrawerLoading, setIsDrawerLoading] = useState(false)
  const [drawerError, setDrawerError] = useState('')
  const [drawerDetail, setDrawerDetail] = useState<DrawerDetailPayload | null>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
  const [isFlowHydrated, setIsFlowHydrated] = useState(false)
  const [isFlowUiSavePending, setIsFlowUiSavePending] = useState(false)
  const [isFlowUiSaving, setIsFlowUiSaving] = useState(false)
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false)

  const positionsRef = useRef<Record<string, { x: number; y: number }>>({})
  const nodesRef = useRef<Node[]>([])
  const drawerCloseTimerRef = useRef<number | null>(null)
  const drawerOpenTimerRef = useRef<number | null>(null)
  const drawerOpenRafRef = useRef<number | null>(null)
  const flowUiSaveTimerRef = useRef<number | null>(null)
  const flowUiVersionRef = useRef<number>(0)
  const flowUiRemoteSyncTimerRef = useRef<number | null>(null)
  const skipNextFlowUiPersistRef = useRef(false)
  const hasUnsavedDraftRef = useRef(false)
  const leaveConfirmIntentRef = useRef<'leave' | null>(null)
  const selectedNodeIdRef = useRef<string | null>(null)
  const selectedWorkRequestIdRef = useRef<number | null>(selectedWorkRequestId)
  selectedWorkRequestIdRef.current = selectedWorkRequestId
  const stompClientRef = useRef<Client | null>(null)
  const drawerResizeStartRef = useRef<{ clientX: number; width: number } | null>(null)
  const draftCommitHandlerRef = useRef<(draftNodeId: string) => void>(() => undefined)
  const currentUser = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.token)
  const currentTeam = useAuthStore((state) => state.currentTeam)

  const workRequestListQuery = useWorkRequestsQuery(FLOW_LIST_PARAMS)
  const workRequests = useMemo(() => workRequestListQuery.data?.items ?? [], [workRequestListQuery.data])

  const handleOpenDocument = useCallback((node: FlowNode) => {
    navigate(detailPath(node.nodeType, node.entityId))
  }, [navigate])

  const scheduleDrawerOpen = useCallback(() => {
    drawerOpenRafRef.current = window.requestAnimationFrame(() => {
      drawerOpenRafRef.current = window.requestAnimationFrame(() => {
        setIsDrawerVisible(true)
        drawerOpenRafRef.current = null
      })
    })
  }, [])

  const closeDrawer = useCallback(() => {
    if (drawerOpenTimerRef.current != null) {
      window.clearTimeout(drawerOpenTimerRef.current)
      drawerOpenTimerRef.current = null
    }
    if (drawerOpenRafRef.current != null) {
      window.cancelAnimationFrame(drawerOpenRafRef.current)
      drawerOpenRafRef.current = null
    }
    setIsDrawerVisible(false)
    if (drawerCloseTimerRef.current) {
      window.clearTimeout(drawerCloseTimerRef.current)
    }
    drawerCloseTimerRef.current = window.setTimeout(() => {
      setDrawerNode(null)
      setDrawerDetail(null)
      setDrawerError('')
      setIsDrawerLoading(false)
      drawerCloseTimerRef.current = null
    }, DRAWER_CLOSE_ANIMATION_MS)
  }, [])

  const openDrawer = useCallback((node: FlowNodeCardData) => {
    if (drawerCloseTimerRef.current) {
      window.clearTimeout(drawerCloseTimerRef.current)
      drawerCloseTimerRef.current = null
    }
    if (drawerOpenTimerRef.current != null) {
      window.clearTimeout(drawerOpenTimerRef.current)
      drawerOpenTimerRef.current = null
    }
    if (drawerOpenRafRef.current != null) {
      window.cancelAnimationFrame(drawerOpenRafRef.current)
      drawerOpenRafRef.current = null
    }
    if (isDrawerVisible) {
      setIsDrawerVisible(false)
      drawerOpenTimerRef.current = window.setTimeout(() => {
        setDrawerNode(node)
        drawerOpenTimerRef.current = null
        scheduleDrawerOpen()
      }, DRAWER_REOPEN_DELAY_MS)
      return
    }
    setDrawerNode(node)
    setIsDrawerVisible(false)
    scheduleDrawerOpen()
  }, [isDrawerVisible, scheduleDrawerOpen])

  const handleDraftTitleChange = useCallback((nodeId: string, value: string) => {
    setNodes((prev) => prev.map((node) => {
      if (node.id !== nodeId) {
        return node
      }
      return {
        ...node,
        data: {
          ...node.data,
          draftTitle: value,
          draftError: '',
        },
      }
    }))
  }, [setNodes])

  const buildCardData = useCallback((flowNode: FlowNode, selectedId: string | null): FlowNodeCardData => ({
    ...flowNode,
    workRequestId: selectedWorkRequestId ?? 0,
    onOpenDocument: handleOpenDocument,
    selectedNodeId: selectedId,
    hideAddAction: true,
    onDraftTitleChange: handleDraftTitleChange,
    onDraftTitleCommit: () => undefined,
  }), [handleDraftTitleChange, handleOpenDocument, selectedWorkRequestId])

  const toReactFlowNode = useCallback((flowNode: FlowNode, position: { x: number; y: number }, selectedId: string | null): Node => ({
    id: flowNode.id,
    type: getReactFlowNodeType(flowNode.nodeType),
    position,
    data: buildCardData(flowNode, selectedId),
  }), [buildCardData])

  const setFlowFromApiData = useCallback((data: FlowChainData, selectedId: string | null, persisted: FlowUiState | null) => {
    flowUiVersionRef.current = persisted?.version ?? 0

    const layoutPositions = computeLayout(data)
    const baseNodes = data.nodes.map((node) => toReactFlowNode(node, layoutPositions[node.id] ?? { x: 0, y: 0 }, selectedId))
    const baseEdges = data.edges.map((edge) => toFlowEdge(edge.id, edge.source, edge.target))

    let mergedNodes = baseNodes
    let mergedEdges = baseEdges

    if (persisted) {
      mergedNodes = baseNodes.map((node) => ({
        ...node,
        position: persisted.positions[node.id] ?? node.position,
      }))

      const existingIds = new Set(mergedNodes.map((node) => node.id))
      persisted.customNodes.forEach((custom) => {
        if (existingIds.has(custom.id)) {
          return
        }

        const customNode: FlowNode = {
          id: custom.id,
          entityId: custom.entityId,
          nodeType: custom.nodeType,
          docNo: custom.docNo,
          title: custom.title,
          status: custom.status,
          priority: custom.priority,
          assigneeName: custom.assigneeName,
          version: custom.version,
        }

        mergedNodes.push(
          toReactFlowNode(customNode, persisted.positions[custom.id] ?? { x: 200, y: 200 }, selectedId)
        )
        existingIds.add(custom.id)
      })

      const nodeIdSet = new Set(mergedNodes.map((node) => node.id))
      mergedEdges = persisted.edges
        .filter((edge) => nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target))
        .map((edge) => toFlowEdge(edge.id, edge.source, edge.target))
    }

    positionsRef.current = mergedNodes.reduce<Record<string, { x: number; y: number }>>((acc, node) => {
      acc[node.id] = { x: node.position.x, y: node.position.y }
      return acc
    }, {})

    skipNextFlowUiPersistRef.current = true
    setNodes(mergedNodes)
    setEdges(mergedEdges)
  }, [setEdges, setNodes, toReactFlowNode])

  useEffect(() => {
    const queryId = parseWorkRequestId(location.search)
    if (queryId && queryId !== selectedWorkRequestIdRef.current) {
      setSelectedWorkRequestId(queryId)
    }
  }, [location.search])

  useEffect(() => {
    if (workRequests.length === 0) {
      return
    }

    if (selectedWorkRequestId != null) {
      return
    }

    setSelectedWorkRequestId(Number(workRequests[0].id))
  }, [workRequests, selectedWorkRequestId])

  const selectableWorkRequests = useMemo(() => {
    if (selectedWorkRequestId == null) {
      return workRequests
    }
    if (workRequests.some((item) => Number(item.id) === selectedWorkRequestId)) {
      return workRequests
    }
    return [
      {
        id: String(selectedWorkRequestId),
        docNo: `WR-${selectedWorkRequestId}`,
        title: '현재 선택된 업무요청',
        type: '기타',
        priority: '보통',
        status: '요청',
        assignee: '미배정',
        deadline: '',
      },
      ...workRequests,
    ]
  }, [selectedWorkRequestId, workRequests])

  useEffect(() => {
    setIsFlowHydrated(false)
    if (selectedWorkRequestId) {
      navigate(`/workflow?workRequestId=${selectedWorkRequestId}`, { replace: true })
      return
    }
    navigate('/workflow', { replace: true })
  }, [navigate, selectedWorkRequestId])

  useEffect(() => {
    if (!selectedWorkRequestId) {
      setNodes([])
      setEdges([])
      setSelectedNodeId(null)
      setSelectedEdgeId(null)
      flowUiVersionRef.current = 0
      setIsFlowUiSavePending(false)
      setIsFlowUiSaving(false)
      closeDrawer()
      setIsFlowHydrated(false)
      setFlowError('')
      return
    }

    setIsLoadingFlow(true)
    setNodes([])
    setEdges([])
    setFlowError('')
    let cancelled = false

    const loadFlow = async () => {
      try {
        const [flowData, flowUiData] = await Promise.all([
          getFlowChain(selectedWorkRequestId),
          getFlowUiState(selectedWorkRequestId).catch(() => null),
        ])

        if (cancelled) {
          return
        }

        setFlowFromApiData(flowData, null, flowUiData)
        const root = flowData.nodes.find((item) => item.nodeType === 'WORK_REQUEST')
        setSelectedNodeId(root?.id ?? null)
        setSelectedEdgeId(null)
        closeDrawer()
        setIsFlowHydrated(true)
      } catch {
        if (!cancelled) {
          setFlowError('플로우 데이터를 불러오지 못했습니다.')
        }
      } finally {
        if (!cancelled) {
          setIsLoadingFlow(false)
        }
      }
    }

    void loadFlow()

    return () => {
      cancelled = true
    }
  }, [closeDrawer, selectedWorkRequestId, setEdges, setFlowFromApiData, setNodes])

  useEffect(() => {
    if (!selectedWorkRequestId) {
      return
    }
    if (!accessToken || !currentTeam?.id) {
      return
    }

    let cancelled = false
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_ENDPOINT),
      connectHeaders: {
        Authorization: `Bearer ${accessToken}`,
        'X-Team-Id': String(currentTeam.id),
      },
      reconnectDelay: 3000,
      debug: () => undefined,
    })

    client.onConnect = () => {
      client.subscribe(`/topic/work-requests/${selectedWorkRequestId}/flow-ui`, (frame) => {
        if (cancelled) {
          return
        }

        let message: FlowUiSyncMessage | null = null
        if (frame.body) {
          try {
            message = JSON.parse(frame.body) as FlowUiSyncMessage
          } catch {
            message = null
          }
        }

        if (currentUser && message?.actorUserId === currentUser.id) {
          return
        }

        if (hasUnsavedDraftRef.current) {
          setNotice('다른 사용자가 플로우를 갱신했습니다. 초안 저장 후 새로고침해 주세요.')
          return
        }

        if (flowUiRemoteSyncTimerRef.current != null) {
          window.clearTimeout(flowUiRemoteSyncTimerRef.current)
          flowUiRemoteSyncTimerRef.current = null
        }

        flowUiRemoteSyncTimerRef.current = window.setTimeout(() => {
          flowUiRemoteSyncTimerRef.current = null
          void Promise.all([
            getFlowChain(selectedWorkRequestId),
            getFlowUiState(selectedWorkRequestId).catch(() => null),
          ]).then(([data, flowUiData]) => {
            if (cancelled) {
              return
            }
            setFlowFromApiData(data, selectedNodeIdRef.current, flowUiData)
            closeDrawer()
            setNotice('다른 사용자의 변경사항을 반영했습니다.')
          }).catch(() => {
            if (!cancelled) {
              setNotice('실시간 동기화에 실패했습니다. 새로고침 버튼으로 다시 시도해 주세요.')
            }
          })
        }, 180)
      })
    }

    client.activate()
    stompClientRef.current = client

    return () => {
      cancelled = true
      if (flowUiRemoteSyncTimerRef.current != null) {
        window.clearTimeout(flowUiRemoteSyncTimerRef.current)
        flowUiRemoteSyncTimerRef.current = null
      }
      void client.deactivate()
      if (stompClientRef.current === client) {
        stompClientRef.current = null
      }
    }
  }, [accessToken, closeDrawer, currentTeam?.id, currentUser, selectedWorkRequestId, setFlowFromApiData])

  useEffect(() => {
    if (!selectedEdgeId) {
      return
    }
    if (!edges.some((edge) => edge.id === selectedEdgeId)) {
      setSelectedEdgeId(null)
    }
  }, [edges, selectedEdgeId])

  useEffect(() => {
    setNodes((prev) => prev.map((node) => ({
      ...node,
      data: {
        ...node.data,
        selectedNodeId,
      },
    })))
  }, [selectedNodeId, setNodes])

  useEffect(() => {
    setEdges((prev) => prev.map((edge) => ({
      ...edge,
      selected: edge.id === selectedEdgeId,
      style: edgeStrokeStyle(edge.id === selectedEdgeId),
    })))
  }, [selectedEdgeId, setEdges])

  const hasUnsavedDraft = useMemo(
    () => nodes.some((node) => Boolean((node.data as FlowNodeCardData | undefined)?.isDraft)),
    [nodes]
  )
  const shouldBlockPageLeave = hasUnsavedDraft || isFlowUiSavePending || isFlowUiSaving
  const leaveBlocker = useBlocker(shouldBlockPageLeave)

  useEffect(() => {
    if (leaveBlocker.state === 'blocked') {
      setIsLeaveConfirmOpen(true)
      return
    }
    leaveConfirmIntentRef.current = null
    if (leaveBlocker.state === 'unblocked') {
      setIsLeaveConfirmOpen(false)
    }
  }, [leaveBlocker.state])

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!shouldBlockPageLeave) {
        return
      }
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [shouldBlockPageLeave])

  useEffect(() => {
    hasUnsavedDraftRef.current = hasUnsavedDraft
  }, [hasUnsavedDraft])

  const handleLeavePage = useCallback(() => {
    leaveConfirmIntentRef.current = 'leave'
    setIsLeaveConfirmOpen(false)
    if (leaveBlocker.state === 'blocked') {
      leaveBlocker.proceed()
    }
  }, [leaveBlocker])

  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId
  }, [selectedNodeId])

  const nodeDataById = useMemo(() => {
    const map = new Map<string, FlowNodeCardData>()
    nodes.forEach((node) => {
      const data = getNodeData(node)
      if (data) {
        map.set(node.id, data)
      }
    })
    return map
  }, [nodes])

  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  const buildFlowUiPayload = useCallback((): FlowUiStateSaveRequest => {
    const positions = nodes.reduce<Record<string, { x: number; y: number }>>((acc, node) => {
      acc[node.id] = { x: node.position.x, y: node.position.y }
      return acc
    }, {})

    const persistedEdges = edges
      .filter((edge) => !!edge.source && !!edge.target)
      .map((edge) => ({ id: edge.id, source: edge.source, target: edge.target }))

    const customNodes = nodes
      .map((node) => getNodeData(node))
      .filter((data): data is FlowNodeCardData => data !== null)
      .filter((data) => !data.isDraft && (data.nodeType === 'DEFECT' || data.nodeType === 'KNOWLEDGE_BASE'))
      .map((data) => toNodePayload(data))

    return {
      expectedVersion: flowUiVersionRef.current,
      positions,
      edges: persistedEdges,
      customNodes,
    }
  }, [edges, nodes])

  useEffect(() => {
    if (!isFlowHydrated || !selectedWorkRequestId) {
      setIsFlowUiSavePending(false)
      setIsFlowUiSaving(false)
      return
    }

    if (skipNextFlowUiPersistRef.current) {
      skipNextFlowUiPersistRef.current = false
      setIsFlowUiSavePending(false)
      return
    }

    if (flowUiSaveTimerRef.current != null) {
      window.clearTimeout(flowUiSaveTimerRef.current)
      flowUiSaveTimerRef.current = null
    }
    setIsFlowUiSavePending(true)

    flowUiSaveTimerRef.current = window.setTimeout(() => {
      flowUiSaveTimerRef.current = null
      setIsFlowUiSavePending(false)
      setIsFlowUiSaving(true)
      void saveFlowUiState(selectedWorkRequestId, buildFlowUiPayload())
        .then(() => {
          flowUiVersionRef.current += 1
        })
        .catch((error) => {
          if (!isConflictError(error)) {
            return
          }
          setNotice('다른 사용자가 먼저 저장했습니다. 최신 상태를 다시 불러옵니다.')
          void Promise.all([
            getFlowChain(selectedWorkRequestId),
            getFlowUiState(selectedWorkRequestId).catch(() => null),
          ]).then(([data, flowUiData]) => {
            setFlowFromApiData(data, selectedNodeIdRef.current, flowUiData)
          })
        })
        .finally(() => {
          setIsFlowUiSaving(false)
        })
    }, 600)

    return () => {
      if (flowUiSaveTimerRef.current != null) {
        window.clearTimeout(flowUiSaveTimerRef.current)
        flowUiSaveTimerRef.current = null
      }
    }
  }, [buildFlowUiPayload, isFlowHydrated, nodes, edges, selectedWorkRequestId, setFlowFromApiData])

  const isValidConnection = useCallback((connection: Connection | Edge) => {
    if (!connection.source || !connection.target || connection.source === connection.target) {
      return false
    }

    const sourceNode = nodeDataById.get(connection.source)
    const targetNode = nodeDataById.get(connection.target)
    if (!sourceNode || !targetNode) {
      return false
    }

    return canLinkNode(sourceNode.nodeType, targetNode.nodeType)
  }, [nodeDataById])

  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) {
      return
    }

    if (!isValidConnection(connection)) {
      setNotice('허용되지 않는 연결입니다. (업무요청/기술과제에서만 하위 연결 가능)')
      return
    }

    if (edges.some((edge) => edge.source === connection.source && edge.target === connection.target)) {
      setNotice('이미 같은 카드 연결선이 있습니다.')
      return
    }

    const id = `edge-local-${connection.source}-${connection.target}-${Date.now()}`
    setEdges((prev) => addEdge(toFlowEdge(id, connection.source as string, connection.target as string), prev))
    setSelectedEdgeId(id)
    setSelectedNodeId(null)
    closeDrawer()
    setNotice('연결선을 추가했습니다.')
  }, [closeDrawer, edges, isValidConnection, setEdges])

  const handleReconnect = useCallback((oldEdge: Edge, connection: Connection) => {
    if (!connection.source || !connection.target) {
      return
    }

    if (!isValidConnection(connection)) {
      setNotice('허용되지 않는 연결으로는 이동할 수 없습니다.')
      return
    }

    setEdges((prev) => reconnectEdge(oldEdge, connection, prev))
    setSelectedEdgeId(oldEdge.id)
    setSelectedNodeId(null)
    closeDrawer()
    setNotice('연결선을 이동했습니다.')
  }, [closeDrawer, isValidConnection, setEdges])

  const removeSelectedEdge = useCallback(() => {
    if (!selectedEdgeId) {
      return
    }

    setEdges((prev) => prev.filter((edge) => edge.id !== selectedEdgeId))
    setSelectedEdgeId(null)
    setNotice('연결선을 삭제했습니다.')
  }, [selectedEdgeId, setEdges])

  useEffect(() => {
    if (!selectedEdgeId) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') {
        return
      }

      const target = event.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
          return
        }
      }

      event.preventDefault()
      removeSelectedEdge()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [removeSelectedEdge, selectedEdgeId])

  const createDraftNode = useCallback((paletteType: PaletteNodeType, position?: { x: number; y: number }) => {
    if (!selectedWorkRequestId) {
      return
    }

    const rootId = `WR-${selectedWorkRequestId}`
    const id = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    // 선택된 노드가 이 타입의 적합한 부모면 그 아래에, 아니면 루트(업무요청) 아래에 연결
    const selectedData = selectedNodeId ? nodeDataById.get(selectedNodeId) : null
    const preferredParents = PREFERRED_PARENT[paletteType]
    const useSelectedAsParent = Boolean(
      selectedData
      && selectedNodeId !== rootId
      && preferredParents[0] !== 'WORK_REQUEST'  // WR preferred → skip selected shortcut
      && canLinkNode(selectedData.nodeType, paletteType)
    )
    const parentId = useSelectedAsParent ? selectedNodeId! : rootId
    const parentNodeType = useSelectedAsParent ? selectedData!.nodeType : 'WORK_REQUEST'
    const parentEntityId: number = useSelectedAsParent
      ? (selectedData!.entityId ?? selectedWorkRequestId)
      : selectedWorkRequestId
    const parentPos = positionsRef.current[parentId] ?? { x: 0, y: 0 }

    const nextPosition = position ?? {
      x: parentPos.x + 280 + Math.floor(Math.random() * 60),
      y: parentPos.y + 90 + Math.floor(Math.random() * 60),
    }

    const draftFlowNode: FlowNode = {
      id,
      entityId: -1,
      nodeType: paletteType,
      docNo: '임시',
      title: '',
      status: '초안',
      priority: null,
      assigneeName: null,
      version: null,
    }

    setNodes((prev) => ([
      ...prev,
      {
        id,
        type: getReactFlowNodeType(draftFlowNode.nodeType),
        position: nextPosition,
        data: {
          ...buildCardData(draftFlowNode, id),
          isDraft: true,
          draftTitle: '',
          draftError: '',
          isSavingDraft: false,
          draftParentNodeId: parentId,
          draftParentType: parentNodeType,
          draftParentEntityId: parentEntityId,
          onDraftTitleChange: handleDraftTitleChange,
          onDraftTitleCommit: (draftNodeId: string) => {
            draftCommitHandlerRef.current(draftNodeId)
          },
        },
      },
    ]))

    if (nodeDataById.has(parentId) && canLinkNode(parentNodeType, paletteType)) {
      const edgeId = `edge-draft-${parentId}-${id}`
      setEdges((prev) => [...prev, toFlowEdge(edgeId, parentId, id)])
    }

    positionsRef.current[id] = nextPosition
    setSelectedNodeId(id)
    setSelectedEdgeId(null)
    closeDrawer()

    const parentLabel = useSelectedAsParent
      ? (selectedData?.title || selectedData?.docNo || '선택된 카드')
      : '업무요청'
    setNotice(`"${parentLabel}" 아래에 카드가 추가됐습니다. 제목을 입력해 저장하세요.`)
  }, [buildCardData, closeDrawer, handleDraftTitleChange, nodeDataById, selectedNodeId, selectedWorkRequestId, setEdges, setNodes])

  const handleDraftTitleCommit = useCallback(async (draftNodeId: string) => {
    if (!selectedWorkRequestId) {
      return
    }

    const draftNode = nodesRef.current.find((node) => node.id === draftNodeId)
    const draftData = getNodeData(draftNode)
    if (!draftNode || !draftData || !draftData.isDraft) {
      return
    }
    if (draftData.isSavingDraft) {
      return
    }

    const title = (draftData.draftTitle ?? '').trim()
    if (!title) {
      setNodes((prev) => prev.map((node) => (
        node.id === draftNodeId
          ? { ...node, data: { ...node.data, draftError: '제목을 입력해야 저장할 수 있습니다.' } }
          : node
      )))
      setNotice('제목을 입력해야 저장할 수 있습니다.')
      return
    }

    setNodes((prev) => prev.map((node) => (
      node.id === draftNodeId
        ? { ...node, data: { ...node.data, isSavingDraft: true, draftError: '' } }
        : node
    )))

    try {
      const parentType = (draftData.draftParentType ?? 'WORK_REQUEST') as FlowParentType
      const parentEntityId = draftData.draftParentEntityId ?? selectedWorkRequestId

      const result = await createFlowItem(selectedWorkRequestId, {
        parentType,
        parentId: parentEntityId,
        itemType: draftData.nodeType as FlowItemType,
        title,
      })

      const createdNodeId: string = result.nodeId
      const createdFlowNode: FlowNode = {
        id: result.nodeId,
        entityId: result.entityId,
        nodeType: result.nodeType,
        docNo: result.docNo,
        title: result.title,
        status: result.status,
        priority: null,
        assigneeName: null,
        version: null,
      }

      const createdPosition = draftNode.position

      setNodes((prev) => {
        const filtered = prev.filter((node) => node.id !== draftNodeId)
        return [
          ...filtered,
          {
            id: createdNodeId,
            type: getReactFlowNodeType(createdFlowNode.nodeType),
            position: createdPosition,
            data: buildCardData(createdFlowNode, createdNodeId),
          },
        ]
      })

      setEdges((prev) => prev
        .map((edge) => ({
          ...edge,
          source: edge.source === draftNodeId ? createdNodeId : edge.source,
          target: edge.target === draftNodeId ? createdNodeId : edge.target,
        }))
        .filter((edge) => edge.source !== edge.target)
      )

      delete positionsRef.current[draftNodeId]
      positionsRef.current[createdNodeId] = createdPosition

      setSelectedNodeId(createdNodeId)
      setSelectedEdgeId(null)
      closeDrawer()
      setNotice('문서가 생성되었습니다.')
    } catch (error) {
      const message = extractApiErrorMessage(error, '문서 생성에 실패했습니다.')
      setNodes((prev) => prev.map((node) => (
        node.id === draftNodeId
          ? { ...node, data: { ...node.data, isSavingDraft: false, draftError: message } }
          : node
      )))
      setNotice(message)
    }
  }, [buildCardData, closeDrawer, selectedWorkRequestId, setEdges, setNodes])

  useEffect(() => {
    draftCommitHandlerRef.current = (draftNodeId: string) => {
      void handleDraftTitleCommit(draftNodeId)
    }
  }, [handleDraftTitleCommit])

  const handlePaletteDragStart = useCallback((event: DragEvent<HTMLButtonElement>, type: PaletteNodeType) => {
    event.dataTransfer.setData(FLOW_DRAG_TYPE, type)
    event.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleFlowDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const handleFlowDrop = useCallback((event: DragEvent) => {
    event.preventDefault()

    const droppedType = event.dataTransfer.getData(FLOW_DRAG_TYPE)
    if (!isPaletteNodeType(droppedType)) {
      return
    }

    if (!reactFlowInstance) {
      createDraftNode(droppedType)
      return
    }

    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })

    createDraftNode(droppedType, position)
  }, [createDraftNode, reactFlowInstance])

  useEffect(() => {
    if (!notice) {
      return
    }
    const timeout = window.setTimeout(() => setNotice(''), 3200)
    return () => window.clearTimeout(timeout)
  }, [notice])

  useEffect(() => {
    return () => {
      if (drawerCloseTimerRef.current) {
        window.clearTimeout(drawerCloseTimerRef.current)
      }
      if (drawerOpenTimerRef.current != null) {
        window.clearTimeout(drawerOpenTimerRef.current)
      }
      if (drawerOpenRafRef.current != null) {
        window.cancelAnimationFrame(drawerOpenRafRef.current)
      }
      if (flowUiSaveTimerRef.current != null) {
        window.clearTimeout(flowUiSaveTimerRef.current)
      }
      if (flowUiRemoteSyncTimerRef.current != null) {
        window.clearTimeout(flowUiRemoteSyncTimerRef.current)
      }
      const stompClient = stompClientRef.current
      if (stompClient) {
        void stompClient.deactivate()
        stompClientRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!isResizingDrawer) {
      return
    }

    const onMouseMove = (event: MouseEvent) => {
      const start = drawerResizeStartRef.current
      if (!start) {
        return
      }
      const next = clampDrawerWidth(start.width + (start.clientX - event.clientX))
      setDrawerWidth(next)
    }

    const onMouseUp = () => {
      setIsResizingDrawer(false)
      drawerResizeStartRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizingDrawer])

  useEffect(() => {
    const onResize = () => {
      setDrawerWidth((prev) => clampDrawerWidth(prev))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!drawerNode || drawerNode.isDraft) {
      setIsDrawerLoading(false)
      setDrawerError('')
      setDrawerDetail(null)
      return
    }

    let cancelled = false
    setIsDrawerLoading(true)
    setDrawerError('')
    setDrawerDetail(null)

    const loadDetail = async () => {
      try {
        let payload: DrawerDetailPayload
        switch (drawerNode.nodeType) {
          case 'WORK_REQUEST': {
            const [data, relatedRefs, attachments] = await Promise.all([
              getWorkRequest(drawerNode.entityId),
              listWorkRequestRelatedRefs(drawerNode.entityId),
              listAttachments('WORK_REQUEST', drawerNode.entityId),
            ])
            payload = {
              kind: 'WORK_REQUEST',
              data,
              relatedRefs,
              attachments,
            }
            break
          }
          case 'TECH_TASK': {
            const [data, relatedDocs, prLinks, attachments] = await Promise.all([
              getTechTask(drawerNode.entityId),
              listTechTaskRelatedRefs(drawerNode.entityId),
              listTechTaskPrLinks(drawerNode.entityId),
              listAttachments('TECH_TASK', drawerNode.entityId),
            ])
            payload = { kind: 'TECH_TASK', data, relatedDocs, prLinks, attachments }
            break
          }
          case 'TEST_SCENARIO': {
            const [data, relatedRefs, attachments] = await Promise.all([
              getTestScenario(drawerNode.entityId),
              listTestScenarioRelatedRefs(drawerNode.entityId),
              listAttachments('TEST_SCENARIO', drawerNode.entityId),
            ])
            payload = {
              kind: 'TEST_SCENARIO',
              data,
              relatedDocs: relatedRefs.map((item) => ({
                docNo: item.refNo,
                title: item.title ?? item.refNo,
                route: refRoute(item.refType, item.refId),
              })),
              attachments,
            }
            break
          }
          case 'DEFECT': {
            const [data, attachments] = await Promise.all([
              getDefect(drawerNode.entityId),
              listAttachments('DEFECT', drawerNode.entityId),
            ])
            payload = { kind: 'DEFECT', data, attachments }
            break
          }
          case 'DEPLOYMENT': {
            const [data, relatedRefs, steps, attachments] = await Promise.all([
              getDeployment(drawerNode.entityId),
              listDeploymentRelatedRefs(drawerNode.entityId),
              listDeploymentSteps(drawerNode.entityId),
              listAttachments('DEPLOYMENT', drawerNode.entityId),
            ])
            payload = { kind: 'DEPLOYMENT', data, relatedRefs, steps, attachments }
            break
          }
          case 'KNOWLEDGE_BASE':
            payload = { kind: 'KNOWLEDGE_BASE', data: await getKnowledgeBaseArticle(drawerNode.entityId) }
            break
          default:
            throw new Error('지원하지 않는 문서 유형입니다.')
        }

        if (cancelled) {
          return
        }
        setDrawerDetail(payload)
      } catch (error) {
        if (cancelled) {
          return
        }
        setDrawerError(extractApiErrorMessage(error, '상세 정보를 불러오지 못했습니다.'))
      } finally {
        if (!cancelled) {
          setIsDrawerLoading(false)
        }
      }
    }

    void loadDetail()
    return () => {
      cancelled = true
    }
  }, [drawerNode])

  const handleNodeClick = useCallback((_: unknown, node: Node) => {
    setSelectedNodeId(node.id)
    setSelectedEdgeId(null)

    const data = getNodeData(node)
    if (!data || data.isDraft) {
      closeDrawer()
      return
    }

    openDrawer(data)
  }, [closeDrawer, openDrawer])

  const handleDrawerResizeStart = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!drawerNode) {
      return
    }
    event.preventDefault()
    drawerResizeStartRef.current = { clientX: event.clientX, width: drawerWidth }
    setIsResizingDrawer(true)
  }, [drawerNode, drawerWidth])

  const handleRefresh = useCallback(() => {
    if (!selectedWorkRequestId) {
      return
    }

    if (hasUnsavedDraft) {
      setNotice('저장되지 않은 초안 카드가 있어 새로고침할 수 없습니다.')
      return
    }

    void Promise.all([
      getFlowChain(selectedWorkRequestId),
      getFlowUiState(selectedWorkRequestId).catch(() => null),
    ]).then(([data, flowUiData]) => {
      setFlowFromApiData(data, selectedNodeId, flowUiData)
      closeDrawer()
      setNotice('플로우를 다시 불러왔습니다.')
    })
  }, [closeDrawer, hasUnsavedDraft, selectedNodeId, selectedWorkRequestId, setFlowFromApiData])

  return (
    <div className="p-5 space-y-4">
      <div className="bg-white rounded-2xl border border-blue-100 shadow-[0_4px_24px_rgba(30,58,138,0.08)] px-4 py-3 flex items-center gap-3">
        <div className="min-w-[300px]">
          <p className="text-[11px] text-gray-500 font-semibold mb-1">기준 업무요청</p>
          <select
            value={selectedWorkRequestId ?? ''}
            onChange={(event) => setSelectedWorkRequestId(event.target.value ? Number(event.target.value) : null)}
            className="h-9 min-w-[320px] max-w-full px-3 rounded-lg border border-gray-200 text-[13px] bg-white focus:outline-none focus:border-brand"
          >
            {selectableWorkRequests.map((item) => (
              <option key={item.id} value={item.id}>{item.docNo} · {item.title}</option>
            ))}
          </select>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={removeSelectedEdge}
            disabled={!selectedEdgeId}
            className={`h-8 px-3 rounded-lg border text-[12px] font-medium transition-colors ${
              selectedEdgeId
                ? 'border-red-200 text-red-600 hover:bg-red-50'
                : 'border-gray-200 text-gray-300 cursor-not-allowed'
            }`}
            title="선을 선택한 뒤 삭제하세요. Delete/Backspace 키도 지원됩니다."
          >
            선 삭제
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            className="h-8 px-3 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            새로고침
          </button>
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-blue-100 shadow-[0_4px_24px_rgba(30,58,138,0.08)] overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-gray-800">워크플로우 다이어그램</p>
            <p className="text-[11px] text-gray-500 mt-0.5">카드를 클릭해 우측 패널에서 확인하거나, 아래 팔레트에서 드래그/클릭으로 문서를 추가하세요.</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap mr-0.5">추가</span>
            {PALETTE_ITEMS.map((item) => (
              <button
                key={item.type}
                type="button"
                draggable
                onDragStart={(event) => handlePaletteDragStart(event, item.type)}
                onClick={() => createDraftNode(item.type)}
                title={`${item.label} 추가`}
                className={`group w-[96px] flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing hover:shadow-sm active:scale-95 ${item.bg} ${item.border}`}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${item.iconBg}`}>
                  {item.icon}
                </div>
                <span className={`text-[10px] font-semibold flex-1 truncate ${item.textColor}`}>{item.label}</span>
                <div className="flex flex-col gap-[2px] opacity-25 group-hover:opacity-50 transition-opacity flex-shrink-0">
                  <div className="flex gap-[2px]">
                    <div className="w-[2.5px] h-[2.5px] rounded-full bg-gray-500" />
                    <div className="w-[2.5px] h-[2.5px] rounded-full bg-gray-500" />
                  </div>
                  <div className="flex gap-[2px]">
                    <div className="w-[2.5px] h-[2.5px] rounded-full bg-gray-500" />
                    <div className="w-[2.5px] h-[2.5px] rounded-full bg-gray-500" />
                  </div>
                  <div className="flex gap-[2px]">
                    <div className="w-[2.5px] h-[2.5px] rounded-full bg-gray-500" />
                    <div className="w-[2.5px] h-[2.5px] rounded-full bg-gray-500" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {notice ? (
          <div className="px-4 py-2 border-b border-blue-50 bg-blue-50/40 text-[11px] text-blue-700">
            {notice}
          </div>
        ) : null}

        <div className="h-[520px]">
          {isLoadingFlow ? (
            <div className="h-full flex items-center justify-center text-[13px] text-gray-400">플로우를 불러오는 중...</div>
          ) : flowError ? (
            <div className="h-full flex items-center justify-center text-[13px] text-red-500">{flowError}</div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onInit={setReactFlowInstance}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={handleConnect}
              onReconnect={handleReconnect}
              onNodeClick={handleNodeClick}
              onEdgeClick={(_, edge) => {
                setSelectedEdgeId(edge.id)
                setSelectedNodeId(null)
                closeDrawer()
              }}
              onPaneClick={() => {
                setSelectedNodeId(null)
                setSelectedEdgeId(null)
                closeDrawer()
              }}
              onDrop={handleFlowDrop}
              onDragOver={handleFlowDragOver}
              isValidConnection={isValidConnection}
              edgesReconnectable
              snapToGrid
              snapGrid={[20, 20]}
              defaultEdgeOptions={{
                type: 'smoothstep',
                reconnectable: true,
                markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#94A3B8' },
                style: { stroke: '#CBD5E1', strokeWidth: 1.5 },
              }}
              connectionLineStyle={{ stroke: '#93C5FD', strokeWidth: 2 }}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.25}
              maxZoom={1.5}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#E2E8F0" gap={20} size={1} />
              <Controls className="!shadow-sm !border !border-gray-100 !rounded-xl overflow-hidden" showInteractive={false} />
              <MiniMap
                nodeColor={(node) => {
                  const type = getNodeData(node)?.nodeType
                  if (type === 'WORK_REQUEST') return '#BFDBFE'
                  if (type === 'TECH_TASK') return '#C7D2FE'
                  if (type === 'TEST_SCENARIO') return '#A7F3D0'
                  if (type === 'DEFECT') return '#FDA4AF'
                  if (type === 'DEPLOYMENT') return '#FED7AA'
                  if (type === 'KNOWLEDGE_BASE') return '#A5F3FC'
                  return '#E2E8F0'
                }}
                className="!rounded-xl !border !border-gray-100 !shadow-sm"
              />
            </ReactFlow>
          )}
        </div>
      </section>

      {drawerNode ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className={`absolute inset-0 bg-black/25 transition-opacity ${
              isDrawerVisible ? 'duration-[450ms]' : 'duration-300'
            } ${
              isDrawerVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={closeDrawer}
          />
          <aside
            className={`relative h-full max-w-[92vw] bg-white border-l border-blue-100 shadow-[-8px_0_28px_rgba(15,23,42,0.18)] flex flex-col transition-transform ease-in-out ${
              isDrawerVisible ? 'duration-[450ms]' : 'duration-300'
            } ${
              isDrawerVisible ? 'translate-x-0' : 'translate-x-full'
            }`}
            style={{ width: `${drawerWidth}px` }}
          >
            <div
              role="separator"
              aria-orientation="vertical"
              className="absolute left-0 top-0 h-full w-2 -translate-x-1 cursor-col-resize group"
              onMouseDown={handleDrawerResizeStart}
            >
              <div className="h-full w-[2px] mx-auto bg-transparent group-hover:bg-blue-200 transition-colors" />
            </div>
            <div className="px-5 py-4 border-b border-gray-100 bg-white flex items-start gap-3">
              <button
                type="button"
                onClick={closeDrawer}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 flex-shrink-0"
                title="접기"
                aria-label="접기"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M3 3.2L6.6 7L3 10.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M7.4 3.2L11 7L7.4 10.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-mono text-gray-400">{drawerNode.docNo}</p>
                <p className="text-[16px] font-semibold text-gray-900 leading-snug break-words">{drawerNode.title}</p>
                <div className="mt-2">
                  {drawerDetail ? renderDrawerBadges(drawerDetail) : <p className="text-[11px] text-gray-500">유형: {drawerNode.nodeType}</p>}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {isDrawerLoading ? (
                <div className="h-full min-h-[220px] flex items-center justify-center text-[13px] text-gray-400">
                  상세 정보를 불러오는 중...
                </div>
              ) : drawerError ? (
                <div className="h-full min-h-[220px] flex items-center justify-center text-[13px] text-red-500">
                  {drawerError}
                </div>
              ) : (
                <>
                  {!drawerDetail ? null : drawerDetail.kind === 'WORK_REQUEST' ? (
                    <WorkRequestDetailBody
                      data={drawerDetail.data}
                      relatedRefs={drawerDetail.relatedRefs}
                      attachments={drawerDetail.attachments}
                      onNavigateToRef={(route) => {
                        navigate(route)
                        closeDrawer()
                      }}
                    />
                  ) : drawerDetail.kind === 'TECH_TASK' ? (
                    <TechTaskDetailBody
                      data={drawerDetail.data}
                      relatedDocs={drawerDetail.relatedDocs}
                      prLinks={drawerDetail.prLinks}
                      attachments={drawerDetail.attachments}
                      onNavigateToRef={(route) => {
                        navigate(route)
                        closeDrawer()
                      }}
                    />
                  ) : drawerDetail.kind === 'TEST_SCENARIO' ? (
                    <TestScenarioDetailBody
                      data={drawerDetail.data}
                      relatedDocs={drawerDetail.relatedDocs}
                      attachments={drawerDetail.attachments}
                      isExecutable={false}
                      onNavigateToRef={(route) => {
                        navigate(route)
                        closeDrawer()
                      }}
                    />
                  ) : drawerDetail.kind === 'DEFECT' ? (
                    <DefectDetailBody
                      data={drawerDetail.data}
                      attachments={drawerDetail.attachments}
                      onNavigateToRef={(route) => {
                        navigate(route)
                        closeDrawer()
                      }}
                    />
                  ) : drawerDetail.kind === 'DEPLOYMENT' ? (
                    <DeploymentDetailBody
                      data={drawerDetail.data}
                      includedDocs={drawerDetail.relatedRefs}
                      steps={drawerDetail.steps}
                      attachments={drawerDetail.attachments}
                      onNavigateToRef={(route) => {
                        navigate(route)
                        closeDrawer()
                      }}
                    />
                  ) : (
                    <KnowledgeBaseDetailBody
                      data={drawerDetail.data}
                      onNavigateToDoc={(route) => {
                        navigate(route)
                        closeDrawer()
                      }}
                    />
                  )}
                </>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDrawer}
                className="h-8 px-4 text-[12px] font-medium text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => {
                  handleOpenDocument(drawerNode)
                  closeDrawer()
                }}
                className="h-8 px-4 text-[12px] font-semibold text-white bg-brand hover:bg-brand-hover rounded-lg"
              >
                전체 페이지 열기
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <ConfirmDialog
        open={isLeaveConfirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsLeaveConfirmOpen(false)
            if (leaveConfirmIntentRef.current === 'leave') {
              leaveConfirmIntentRef.current = null
              return
            }
            if (leaveBlocker.state === 'blocked') {
              leaveBlocker.reset()
            }
            return
          }
          setIsLeaveConfirmOpen(true)
        }}
        title={hasUnsavedDraft ? '저장되지 않은 초안이 있습니다.' : '저장되지 않은 변경사항이 있습니다.'}
        description={
          hasUnsavedDraft
            ? '지금 페이지를 벗어나면 저장하지 않은 카드 초안이 사라집니다. 그래도 이동할까요?'
            : '아직 서버에 저장 중인 변경이 있습니다. 지금 이동하면 최신 변경이 반영되지 않을 수 있습니다.'
        }
        confirmText="저장 안 하고 나가기"
        cancelText="계속 편집하기"
        destructive
        onConfirm={handleLeavePage}
      />
    </div>
  )
}
