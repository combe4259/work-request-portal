import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { resolveTeamMemberIdByName } from '@/features/auth/memberResolver'
import { getTeamMembers } from '@/features/auth/service'
import type { ActionItem, MeetingNote, MeetingNoteDetail, RelatedDoc } from '@/types/meeting-note'

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

export interface UpdateMeetingNoteInput {
  title: string
  date: string
  location: string
  facilitatorId: number
  attendeeIds: number[]
  agenda: string[]
  content: string
  decisions: string[]
  actionItems: ActionItem[]
  relatedDocs: RelatedDoc[]
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
  attendeeIds: number[]
  actionItems: ApiMeetingNoteActionItemPayload[]
  relatedRefs: ApiMeetingNoteRelatedRefPayload[]
}

interface ApiMeetingNoteCreateResponse {
  id: number
}

interface ApiMeetingNoteDetailResponse {
  id: number
  noteNo: string
  teamId: number
  title: string
  meetingDate: string
  location: string | null
  facilitatorId: number
  attendeeIds: number[] | null
  agenda: string[] | null
  content: string | null
  decisions: string[] | null
  createdBy: number
  createdAt: string | null
  updatedAt: string | null
}

interface ApiMeetingActionItemResponse {
  id: number
  content: string
  assigneeId: number
  dueDate: string
  status: string
  linkedRefType: string | null
  linkedRefId: number | null
}

interface ApiMeetingNoteActionItemPayload {
  content: string
  assigneeId: number
  dueDate: string
  status: string
  linkedRefType: string | null
  linkedRefId: number | null
}

interface ApiMeetingNoteRelatedRefResponse {
  refType: string
  refId: number
  refNo: string
  title: string | null
}

interface ApiMeetingNoteRelatedRefPayload {
  refType: string
  refId: number
  sortOrder: number
}

interface ApiMeetingNoteUpdateRequest {
  title: string
  meetingDate: string
  location: string | null
  facilitatorId: number
  attendeeIds: number[]
  agenda: string[]
  content: string
  decisions: string[]
  actionItems: ApiMeetingNoteActionItemPayload[]
  relatedRefs: ApiMeetingNoteRelatedRefPayload[]
}

const LIST_FETCH_SIZE = 500

function mapUserLabel(
  userId: number | null | undefined,
  fallbackText: string,
  teamMemberNameById?: Map<number, string>,
): string {
  if (userId == null) {
    return fallbackText
  }

  const memberName = teamMemberNameById?.get(userId)
  if (memberName) {
    return memberName
  }

  const auth = useAuthStore.getState()
  if (auth.user && auth.user.id === userId) {
    return auth.user.name
  }

  return `사용자#${userId}`
}

async function buildTeamMemberNameMap(teamId: number | null | undefined): Promise<Map<number, string>> {
  if (!teamId || teamId <= 0) {
    return new Map()
  }

  try {
    const members = await getTeamMembers(teamId)
    return new Map(members.map((member) => [member.userId, member.name]))
  } catch {
    return new Map()
  }
}

function toDateOnly(value: string | null | undefined): string {
  return value?.slice(0, 10) ?? ''
}

function mapListItem(item: ApiMeetingNoteListItem, teamMemberNameById: Map<number, string>): MeetingNote {
  return {
    id: String(item.id),
    docNo: item.noteNo,
    title: item.title,
    date: toDateOnly(item.meetingDate),
    facilitator: mapUserLabel(item.facilitatorId, '미지정', teamMemberNameById),
    actionTotal: item.actionTotal,
    actionDone: item.actionDone,
    createdAt: toDateOnly(item.createdAt),
  }
}

function mapActionItem(item: ApiMeetingActionItemResponse, teamMemberNameById: Map<number, string>): ActionItem {
  return {
    id: item.id,
    content: item.content,
    assigneeId: item.assigneeId,
    assignee: mapUserLabel(item.assigneeId, '미지정', teamMemberNameById),
    deadline: toDateOnly(item.dueDate),
    done: item.status === '완료',
  }
}

function mapDetailItem(
  detail: ApiMeetingNoteDetailResponse,
  actionItems: ApiMeetingActionItemResponse[],
  relatedRefs: ApiMeetingNoteRelatedRefResponse[],
  teamMemberNameById: Map<number, string>,
): MeetingNoteDetail {
  return {
    id: String(detail.id),
    docNo: detail.noteNo,
    teamId: detail.teamId,
    title: detail.title,
    date: toDateOnly(detail.meetingDate),
    location: detail.location ?? '',
    facilitatorId: detail.facilitatorId,
    facilitator: mapUserLabel(detail.facilitatorId, '미지정', teamMemberNameById),
    attendeeIds: detail.attendeeIds ?? [],
    agenda: detail.agenda ?? [],
    content: detail.content ?? '',
    decisions: detail.decisions ?? [],
    actionItems: actionItems.map((item) => mapActionItem(item, teamMemberNameById)),
    relatedDocs: relatedRefs.map(mapRelatedRef),
  }
}

function toActionStatus(done: boolean): string {
  return done ? '완료' : '대기'
}

function toActionItemPayload(item: ActionItem): ApiMeetingNoteActionItemPayload {
  return {
    content: item.content.trim(),
    assigneeId: item.assigneeId,
    dueDate: item.deadline,
    status: toActionStatus(item.done),
    linkedRefType: null,
    linkedRefId: null,
  }
}

function toFallbackDocNo(refType: string, refId: number): string {
  const prefix = refType === 'WORK_REQUEST'
    ? 'WR'
    : refType === 'TECH_TASK'
      ? 'TK'
      : refType === 'TEST_SCENARIO'
        ? 'TS'
        : refType === 'DEFECT'
          ? 'DF'
          : refType === 'DEPLOYMENT'
            ? 'DP'
            : refType === 'MEETING_NOTE'
              ? 'MN'
              : refType === 'KNOWLEDGE_BASE'
                ? 'KB'
                : 'REF'
  return `${prefix}-${refId}`
}

function mapRelatedRef(item: ApiMeetingNoteRelatedRefResponse): RelatedDoc {
  const docNo = item.refNo?.trim() || toFallbackDocNo(item.refType, item.refId)
  return {
    docNo,
    title: item.title?.trim() || docNo,
  }
}

function toRelatedRefType(docNo: string): string | null {
  const [prefix] = docNo.toUpperCase().split('-')
  if (!prefix) {
    return null
  }

  if (prefix === 'WR') return 'WORK_REQUEST'
  if (prefix === 'TK') return 'TECH_TASK'
  if (prefix === 'TS') return 'TEST_SCENARIO'
  if (prefix === 'DF') return 'DEFECT'
  if (prefix === 'DP') return 'DEPLOYMENT'
  if (prefix === 'MN') return 'MEETING_NOTE'
  if (prefix === 'KB') return 'KNOWLEDGE_BASE'
  return null
}

function toRelatedRefPayload(relatedDocs: RelatedDoc[]): ApiMeetingNoteRelatedRefPayload[] {
  return relatedDocs
    .map((doc, index) => {
      const match = doc.docNo.toUpperCase().trim().match(/^([A-Z]+)-(\d+)$/)
      const idText = match?.[2]
      const refType = toRelatedRefType(doc.docNo)
      const refId = Number(idText)

      if (!refType || !Number.isFinite(refId)) {
        return null
      }

      return {
        refType,
        refId,
        sortOrder: index + 1,
      }
    })
    .filter((item): item is ApiMeetingNoteRelatedRefPayload => item !== null)
}

export async function listMeetingNotes(params: MeetingNoteListParams): Promise<MeetingNoteListResult> {
  const auth = useAuthStore.getState()
  const teamId = auth.currentTeam?.id ?? auth.teams[0]?.id

  const teamMemberNameByIdPromise = buildTeamMemberNameMap(teamId)
  const { data } = await api.get<ApiPageResponse<ApiMeetingNoteListItem>>('/meeting-notes', {
    params: { page: 0, size: LIST_FETCH_SIZE },
  })
  const teamMemberNameById = await teamMemberNameByIdPromise

  const filtered = data.content
    .map((item) => mapListItem(item, teamMemberNameById))
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

  const facilitatorId = await resolveTeamMemberIdByName(currentTeam.id, input.facilitator)

  const payload: ApiMeetingNoteCreateRequest = {
    title: input.title,
    meetingDate: input.date,
    facilitatorId: facilitatorId ?? user.id,
    agenda: [],
    content: '',
    decisions: [],
    teamId: currentTeam.id,
    createdBy: user.id,
    attendeeIds: [],
    actionItems: [],
    relatedRefs: [],
  }

  const { data } = await api.post<ApiMeetingNoteCreateResponse>('/meeting-notes', payload)
  return { id: String(data.id) }
}

export async function getMeetingNote(id: string | number): Promise<MeetingNoteDetail> {
  const [detailResponse, actionItemsResponse, relatedRefsResponse] = await Promise.all([
    api.get<ApiMeetingNoteDetailResponse>(`/meeting-notes/${id}`),
    api.get<ApiMeetingActionItemResponse[]>(`/meeting-notes/${id}/action-items`),
    api.get<ApiMeetingNoteRelatedRefResponse[]>(`/meeting-notes/${id}/related-refs`),
  ])
  const teamMemberNameById = await buildTeamMemberNameMap(detailResponse.data.teamId)

  return mapDetailItem(detailResponse.data, actionItemsResponse.data, relatedRefsResponse.data, teamMemberNameById)
}

export async function updateMeetingNote(id: string | number, input: UpdateMeetingNoteInput): Promise<void> {
  const actionItems = input.actionItems
    .filter((item) => item.content.trim().length > 0 && item.assigneeId > 0 && item.deadline.trim().length > 0)
    .map(toActionItemPayload)

  const payload: ApiMeetingNoteUpdateRequest = {
    title: input.title,
    meetingDate: input.date,
    location: input.location.trim() ? input.location.trim() : null,
    facilitatorId: input.facilitatorId,
    attendeeIds: input.attendeeIds,
    agenda: input.agenda,
    content: input.content,
    decisions: input.decisions,
    actionItems,
    relatedRefs: toRelatedRefPayload(input.relatedDocs),
  }

  await api.put(`/meeting-notes/${id}`, payload)
}

export async function deleteMeetingNote(id: string | number): Promise<void> {
  await api.delete(`/meeting-notes/${id}`)
}
