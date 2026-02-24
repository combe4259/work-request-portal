import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type { MeetingNote } from '@/types/meeting-note'

export type MeetingNoteSortKey = 'docNo' | 'date'
export type MeetingNoteSortDir = 'asc' | 'desc'

export interface MeetingNoteListParams {
  search: string
  sortKey: MeetingNoteSortKey
  sortDir: MeetingNoteSortDir
  page: number
  pageSize: number
}

export interface MeetingNoteListResult {
  items: MeetingNote[]
  total: number
  totalPages: number
  page: number
}

export interface CreateMeetingNoteInput {
  title: string
  date: string
  facilitator: string
}

export interface CreateMeetingNoteResult {
  id: string
}

interface ApiPageResponse<T> {
  content: T[]
}

interface ApiMeetingNoteListItem {
  id: number
  noteNo: string
  title: string
  meetingDate: string
  facilitatorId: number
  actionTotal: number
  actionDone: number
  createdAt: string | null
}

interface ApiMeetingNoteCreateRequest {
  title: string
  meetingDate: string
  location?: string
  facilitatorId: number
  agenda: string[]
  content: string
  decisions: string[]
  teamId: number
  createdBy: number
  actionItems: Array<{
    content: string
    assigneeId: number
    dueDate: string
    status: string
    linkedRefType: string | null
    linkedRefId: number | null
  }>
}

interface ApiMeetingNoteCreateResponse {
  id: number
}

const LIST_FETCH_SIZE = 500

function mapUserLabel(userId: number | null | undefined, fallbackText: string): string {
  if (userId == null) {
    return fallbackText
  }

  const auth = useAuthStore.getState()
  if (auth.user && auth.user.id === userId) {
    return auth.user.name
  }

  return `사용자#${userId}`
}

function toDateOnly(value: string | null | undefined): string {
  return value?.slice(0, 10) ?? ''
}

function mapListItem(item: ApiMeetingNoteListItem): MeetingNote {
  return {
    id: String(item.id),
    docNo: item.noteNo,
    title: item.title,
    date: toDateOnly(item.meetingDate),
    facilitator: mapUserLabel(item.facilitatorId, '미지정'),
    actionTotal: item.actionTotal,
    actionDone: item.actionDone,
    createdAt: toDateOnly(item.createdAt),
  }
}

export async function listMeetingNotes(params: MeetingNoteListParams): Promise<MeetingNoteListResult> {
  const { data } = await api.get<ApiPageResponse<ApiMeetingNoteListItem>>('/meeting-notes', {
    params: { page: 0, size: LIST_FETCH_SIZE },
  })

  const filtered = data.content
    .map(mapListItem)
    .filter((item) => {
      const keyword = params.search.trim()
      return keyword.length === 0
        || item.title.includes(keyword)
        || item.docNo.includes(keyword)
    })

  const sorted = [...filtered].sort((a, b) => {
    const sortFactor = params.sortDir === 'asc' ? 1 : -1
    if (params.sortKey === 'docNo') {
      return a.docNo.localeCompare(b.docNo, 'ko-KR', { numeric: true }) * sortFactor
    }
    return a.date.localeCompare(b.date) * sortFactor
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / params.pageSize))
  const safePage = Math.min(Math.max(1, params.page), totalPages)
  const start = (safePage - 1) * params.pageSize
  const items = sorted.slice(start, start + params.pageSize)

  return {
    items,
    total: sorted.length,
    totalPages,
    page: safePage,
  }
}

export async function createMeetingNote(input: CreateMeetingNoteInput): Promise<CreateMeetingNoteResult> {
  const auth = useAuthStore.getState()
  const user = auth.user
  const currentTeam = auth.currentTeam ?? auth.teams[0]

  if (!user || !currentTeam) {
    throw new Error('현재 로그인 사용자 또는 팀 정보가 없습니다.')
  }

  const payload: ApiMeetingNoteCreateRequest = {
    title: input.title,
    meetingDate: input.date,
    facilitatorId: user.id,
    agenda: [],
    content: '',
    decisions: [],
    teamId: currentTeam.id,
    createdBy: user.id,
    actionItems: [],
  }

  const { data } = await api.post<ApiMeetingNoteCreateResponse>('/meeting-notes', payload)
  return { id: String(data.id) }
}
