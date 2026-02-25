import api from '@/lib/api'

export type DocumentRefType =
  | 'WORK_REQUEST'
  | 'TECH_TASK'
  | 'TEST_SCENARIO'
  | 'DEFECT'
  | 'DEPLOYMENT'
  | 'MEETING_NOTE'
  | 'PROJECT_IDEA'
  | 'KNOWLEDGE_BASE'

export interface DocumentIndexSearchItem {
  refType: DocumentRefType
  refId: number
  docNo: string
  title: string
  status: string | null
}

export interface DocumentIndexSearchParams {
  q?: string
  types?: DocumentRefType[]
  teamId?: number
  size?: number
}

interface ApiPageResponse<T> {
  content: T[]
}

interface ApiDocumentIndexSearchItem {
  refType: DocumentRefType
  refId: number
  docNo: string
  title: string
  status: string | null
}

export async function searchDocumentIndex(params: DocumentIndexSearchParams): Promise<DocumentIndexSearchItem[]> {
  const normalizedQuery = params.q?.trim()
  const normalizedTypes = params.types?.join(',')
  const normalizedTeamId = params.teamId
  const size = params.size ?? 40

  const { data } = await api.get<ApiPageResponse<ApiDocumentIndexSearchItem>>('/document-index/search', {
    params: {
      q: normalizedQuery || undefined,
      types: normalizedTypes || undefined,
      teamId: normalizedTeamId ?? undefined,
      page: 0,
      size,
    },
  })

  return data.content.map((item) => ({
    refType: item.refType,
    refId: item.refId,
    docNo: item.docNo,
    title: item.title,
    status: item.status,
  }))
}
