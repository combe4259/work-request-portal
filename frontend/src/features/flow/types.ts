export type FlowNodeType =
  | 'WORK_REQUEST'
  | 'TECH_TASK'
  | 'TEST_SCENARIO'
  | 'DEPLOYMENT'
  | 'DEFECT'
  | 'KNOWLEDGE_BASE'
export type FlowParentType = 'WORK_REQUEST' | 'TECH_TASK'
export type FlowItemType = 'TECH_TASK' | 'TEST_SCENARIO' | 'DEPLOYMENT'
export type FlowUiCustomNodeType = 'DEFECT' | 'KNOWLEDGE_BASE'

export interface FlowNode {
  id: string
  entityId: number
  nodeType: FlowNodeType
  docNo: string
  title: string
  status: string
  priority: string | null
  assigneeName: string | null
  version: string | null
}

export interface FlowEdge {
  id: string
  source: string
  target: string
}

export interface FlowChainData {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

export interface FlowItemCreateRequest {
  parentType: FlowParentType
  parentId: number
  itemType: FlowItemType
  title: string
}

export interface FlowItemCreateResponse {
  nodeId: string
  entityId: number
  nodeType: FlowNodeType
  docNo: string
  title: string
  status: string
  edgeId: string
  edgeSource: string
  edgeTarget: string
}

export interface FlowUiPosition {
  x: number
  y: number
}

export interface FlowUiEdge {
  id: string
  source: string
  target: string
}

export interface FlowUiCustomNode {
  id: string
  entityId: number
  nodeType: FlowUiCustomNodeType
  docNo: string
  title: string
  status: string
  priority: string | null
  assigneeName: string | null
  version: string | null
}

export interface FlowUiState {
  version: number
  positions: Record<string, FlowUiPosition>
  edges: FlowUiEdge[]
  customNodes: FlowUiCustomNode[]
}

export interface FlowUiStateSaveRequest {
  expectedVersion: number
  positions: Record<string, FlowUiPosition>
  edges: FlowUiEdge[]
  customNodes: FlowUiCustomNode[]
}

export interface AddItemModalConfig {
  parentType: FlowParentType
  parentId: number
  workRequestId: number
  allowedTypes: FlowItemType[]
}
