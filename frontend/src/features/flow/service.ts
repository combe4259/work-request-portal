import api from '@/lib/api'
import type {
  FlowChainData,
  FlowItemCreateRequest,
  FlowItemCreateResponse,
  FlowUiState,
  FlowUiStateSaveRequest,
} from './types'

export async function getFlowChain(workRequestId: number): Promise<FlowChainData> {
  const { data } = await api.get<FlowChainData>(`/work-requests/${workRequestId}/flow-chain`)
  return data
}

export async function createFlowItem(
  workRequestId: number,
  payload: FlowItemCreateRequest,
): Promise<FlowItemCreateResponse> {
  const { data } = await api.post<FlowItemCreateResponse>(
    `/work-requests/${workRequestId}/flow-items`,
    payload,
  )
  return data
}

export async function getFlowUiState(workRequestId: number): Promise<FlowUiState> {
  const { data } = await api.get<FlowUiState>(`/work-requests/${workRequestId}/flow-ui`)
  return data
}

export async function saveFlowUiState(workRequestId: number, payload: FlowUiStateSaveRequest): Promise<void> {
  await api.put(`/work-requests/${workRequestId}/flow-ui`, payload)
}
