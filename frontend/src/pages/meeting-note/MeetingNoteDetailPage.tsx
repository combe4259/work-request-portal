import { useState, useRef, useCallback, useEffect, useId, useMemo } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '@/components/common/AsyncState'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useTeamMembersQuery } from '@/features/auth/queries'
import { useDeleteMeetingNoteMutation } from '@/features/meeting-note/mutations'
import { useMeetingNoteDetailQuery } from '@/features/meeting-note/queries'
import { updateMeetingNote } from '@/features/meeting-note/service'
import { useAuthStore } from '@/stores/authStore'
import type { ActionItem, MeetingNoteDetail, RelatedDoc } from '@/types/meeting-note'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 문서 타입
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface MeetingDoc {
  id: string
  docNo: string
  title: string
  date: string
  location: string
  facilitatorId: number
  facilitator: string
  attendeeIds: number[]
  agenda: string[]
  content: string
  decisions: string[]
  actionItems: ActionItem[]
  relatedDocs: RelatedDoc[]
}

interface MeetingNoteRealtimeMessage {
  clientId: string
  patch: Partial<MeetingDoc>
}

interface MeetingNotePresenceMessage {
  clientId: string
  userName: string
}

interface MeetingNotePresenceSnapshotMessage {
  type: 'snapshot'
  editors: MeetingNotePresenceMessage[]
}

const EMPTY_DOC: MeetingDoc = {
  id: '',
  docNo: '',
  title: '',
  date: '',
  location: '',
  facilitatorId: 0,
  facilitator: '',
  attendeeIds: [],
  agenda: [],
  content: '',
  decisions: [],
  actionItems: [],
  relatedDocs: [],
}

const AVATAR_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#F43F5E', '#6366F1', '#64748B']

const DOC_PREFIX_STYLE: Record<string, string> = {
  WR: 'bg-blue-50 text-blue-500',
  TK: 'bg-slate-100 text-slate-500',
  TS: 'bg-emerald-50 text-emerald-600',
  DF: 'bg-red-50 text-red-400',
  MN: 'bg-violet-50 text-violet-500',
}

const ALL_DOCS = [
  { docNo: 'WR-042', title: '계좌 개설 UI 개선 요청' },
  { docNo: 'WR-051', title: '모바일 PDA 화면 레이아웃 개선 요청' },
  { docNo: 'TK-109', title: '계좌 개설 API 연동 개발' },
  { docNo: 'TK-112', title: 'API 응답 성능 최적화' },
  { docNo: 'TS-017', title: '계좌 개설 프로세스 E2E 흐름 검증' },
]

const RELATED_DOC_PATTERN = /^(WR|TK|TS|DF|DP|MN|KB)-\d+$/i

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api'
const WS_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '')
const WS_ENDPOINT = `${WS_BASE_URL}/ws`

function mapUserLabel(userId: number | null | undefined, fallbackText: string): string {
  if (userId == null || userId <= 0) {
    return fallbackText
  }

  const auth = useAuthStore.getState()
  if (auth.user && auth.user.id === userId) {
    return auth.user.name
  }

  return `사용자#${userId}`
}

function stringToColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function toMeetingDoc(detail: MeetingNoteDetail): MeetingDoc {
  return detail
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 페이지
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function MeetingNoteDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const numericId = Number(id)
  const hasValidId = Number.isInteger(numericId) && numericId > 0
  const clientId = useId()
  const stompClientRef = useRef<Client | null>(null)
  const saveSeqRef = useRef(0)
  const currentUser = useAuthStore((state) => state.user)
  const currentTeam = useAuthStore((state) => state.currentTeam)
  const deleteMeetingNote = useDeleteMeetingNoteMutation()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { data: fetchedDoc, isPending, isError, refetch } = useMeetingNoteDetailQuery(hasValidId ? numericId : undefined)
  const teamMembersQuery = useTeamMembersQuery(currentTeam?.id)
  const isDocLoaded = fetchedDoc != null

  // ── 문서 상태 ─────────────────────────────────
  const [docById, setDocById] = useState<Record<number, MeetingDoc>>({})
  const loadedDoc = useMemo(() => (fetchedDoc ? toMeetingDoc(fetchedDoc) : EMPTY_DOC), [fetchedDoc])
  const doc = hasValidId ? (docById[numericId] ?? loadedDoc) : EMPTY_DOC
  const hasDraft = hasValidId && docById[numericId] != null
  const [collaborators, setCollaborators] = useState<MeetingNotePresenceMessage[]>([])

  // ── 자동 저장 ─────────────────────────────────
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const effectiveSaveStatus: 'saved' | 'saving' | 'unsaved' = hasDraft ? saveStatus : 'saved'
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const userOptions = useMemo(() => {
    const options = new Map<number, string>()

    if (currentUser) {
      options.set(currentUser.id, currentUser.name)
    }

    ;(teamMembersQuery.data ?? []).forEach((member) => {
      options.set(member.userId, member.name)
    })

    if (doc.facilitatorId > 0) {
      options.set(doc.facilitatorId, doc.facilitator || mapUserLabel(doc.facilitatorId, '미지정'))
    }

    doc.actionItems.forEach((item) => {
      if (item.assigneeId > 0) {
        options.set(item.assigneeId, item.assignee || mapUserLabel(item.assigneeId, '미지정'))
      }
    })

    return Array.from(options.entries()).map(([value, label]) => ({ value, label }))
  }, [currentUser, doc.actionItems, doc.facilitator, doc.facilitatorId, teamMembersQuery.data])

  const attendeeLabels = useMemo(() => {
    const labelMap = new Map(userOptions.map((option) => [option.value, option.label]))
    return doc.attendeeIds.map((userId) => ({
      userId,
      label: labelMap.get(userId) ?? mapUserLabel(userId, '미지정'),
    }))
  }, [doc.attendeeIds, userOptions])

  const scheduleSave = useCallback((nextDoc: MeetingDoc, patch: Partial<MeetingDoc>) => {
    if (!hasValidId || !isDocLoaded) {
      return
    }

    setSaveStatus('unsaved')
    clearTimeout(saveTimer.current)

    saveTimer.current = setTimeout(() => {
      const currentSeq = ++saveSeqRef.current
      setSaveStatus('saving')

      void updateMeetingNote(numericId, {
        title: nextDoc.title,
        date: nextDoc.date,
        location: nextDoc.location,
        facilitatorId: nextDoc.facilitatorId,
        attendeeIds: nextDoc.attendeeIds,
        agenda: nextDoc.agenda,
        content: nextDoc.content,
        decisions: nextDoc.decisions,
        actionItems: nextDoc.actionItems,
        relatedDocs: nextDoc.relatedDocs,
      })
        .then(() => {
          const client = stompClientRef.current
          if (client?.connected) {
            const message: MeetingNoteRealtimeMessage = {
              clientId,
              patch,
            }
            client.publish({
              destination: `/app/meeting-notes/${numericId}/patch`,
              body: JSON.stringify(message),
            })
          }

          if (saveSeqRef.current === currentSeq) {
            setSaveStatus('saved')
          }
        })
        .catch(() => {
          if (saveSeqRef.current === currentSeq) {
            setSaveStatus('unsaved')
          }
        })
    }, 800)
  }, [clientId, hasValidId, isDocLoaded, numericId])

  useEffect(() => {
    if (!hasValidId) {
      return
    }

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_ENDPOINT),
      reconnectDelay: 1500,
      debug: () => {},
      onConnect: () => {
        client.subscribe(`/topic/meeting-notes/${numericId}`, (frame) => {
          let message: MeetingNoteRealtimeMessage | null = null
          try {
            message = JSON.parse(frame.body) as MeetingNoteRealtimeMessage
          } catch {
            return
          }

          if (!message?.patch || message.clientId === clientId) {
            return
          }

          setDocById((prev) => {
            const baseDoc = prev[numericId] ?? loadedDoc
            return {
              ...prev,
              [numericId]: { ...baseDoc, ...message.patch },
            }
          })
        })

        client.subscribe(`/topic/meeting-notes/${numericId}/presence`, (frame) => {
          let message: MeetingNotePresenceSnapshotMessage | null = null
          try {
            message = JSON.parse(frame.body) as MeetingNotePresenceSnapshotMessage
          } catch {
            return
          }

          if (!message || !Array.isArray(message.editors)) {
            return
          }

          setCollaborators(message.editors)
        })

        client.publish({
          destination: `/app/meeting-notes/${numericId}/presence/join`,
          body: JSON.stringify({
            clientId,
            userName: currentUser?.name ?? '익명',
          } satisfies MeetingNotePresenceMessage),
        })
      },
    })

    client.activate()
    stompClientRef.current = client

    return () => {
      if (client.connected) {
        client.publish({
          destination: `/app/meeting-notes/${numericId}/presence/leave`,
          body: JSON.stringify({
            clientId,
            userName: currentUser?.name ?? '익명',
          } satisfies MeetingNotePresenceMessage),
        })
      }

      setCollaborators([])
      stompClientRef.current = null
      void client.deactivate()
    }
  }, [clientId, currentUser?.name, hasValidId, loadedDoc, numericId])

  useEffect(() => () => {
    clearTimeout(saveTimer.current)
  }, [])

  const updateDoc = useCallback(<K extends keyof MeetingDoc>(key: K, value: MeetingDoc[K]) => {
    if (!hasValidId) {
      return
    }

    setDocById((prev) => {
      const baseDoc = prev[numericId] ?? loadedDoc
      const next = { ...baseDoc, [key]: value }
      scheduleSave(next, { [key]: value } as Partial<MeetingDoc>)
      return {
        ...prev,
        [numericId]: next,
      }
    })
  }, [hasValidId, loadedDoc, numericId, scheduleSave])

  const updateFacilitator = (nextFacilitatorId: number) => {
    const facilitatorLabel = userOptions.find((option) => option.value === nextFacilitatorId)?.label
      ?? mapUserLabel(nextFacilitatorId, '미지정')

    if (!hasValidId) {
      return
    }

    setDocById((prev) => {
      const baseDoc = prev[numericId] ?? loadedDoc
      const next = {
        ...baseDoc,
        facilitatorId: nextFacilitatorId,
        facilitator: facilitatorLabel,
      }
      scheduleSave(next, {
        facilitatorId: nextFacilitatorId,
        facilitator: facilitatorLabel,
      })
      return {
        ...prev,
        [numericId]: next,
      }
    })
  }

  // ── 안건 ──────────────────────────────────────
  const [agendaInput, setAgendaInput] = useState('')
  const addAgenda = () => {
    const t = agendaInput.trim()
    if (!t) return
    const next = [...doc.agenda, t]
    updateDoc('agenda', next)
    setAgendaInput('')
  }
  const updateAgenda = (idx: number, val: string) => {
    const next = doc.agenda.map((a, i) => (i === idx ? val : a))
    updateDoc('agenda', next)
  }
  const removeAgenda = (idx: number) => updateDoc('agenda', doc.agenda.filter((_, i) => i !== idx))

  // ── 결정 사항 ─────────────────────────────────
  const [decisionInput, setDecisionInput] = useState('')
  const addDecision = () => {
    const t = decisionInput.trim()
    if (!t) return
    updateDoc('decisions', [...doc.decisions, t])
    setDecisionInput('')
  }
  const updateDecision = (idx: number, val: string) => {
    updateDoc('decisions', doc.decisions.map((d, i) => (i === idx ? val : d)))
  }
  const removeDecision = (idx: number) => updateDoc('decisions', doc.decisions.filter((_, i) => i !== idx))

  // ── 액션 아이템 ───────────────────────────────
  const [actionInput, setActionInput] = useState({
    content: '',
    assigneeId: currentUser?.id ?? 0,
    deadline: '',
  })
  const selectedAssigneeId = actionInput.assigneeId > 0
    ? actionInput.assigneeId
    : (userOptions[0]?.value ?? 0)

  const addAction = () => {
    if (!actionInput.content.trim() || !actionInput.deadline || selectedAssigneeId <= 0) return

    const assigneeLabel = userOptions.find((option) => option.value === selectedAssigneeId)?.label
      ?? mapUserLabel(selectedAssigneeId, '미지정')

    const newItem: ActionItem = {
      id: Date.now(),
      content: actionInput.content.trim(),
      assigneeId: selectedAssigneeId,
      assignee: assigneeLabel,
      deadline: actionInput.deadline,
      done: false,
    }
    updateDoc('actionItems', [...doc.actionItems, newItem])
    setActionInput((prev) => ({ ...prev, content: '', deadline: '' }))
  }
  const toggleAction = (id: number) => {
    updateDoc('actionItems', doc.actionItems.map((a) => (a.id === id ? { ...a, done: !a.done } : a)))
  }
  const removeAction = (id: number) => updateDoc('actionItems', doc.actionItems.filter((a) => a.id !== id))

  const toggleAttendee = (userId: number) => {
    if (userId <= 0) {
      return
    }

    if (doc.attendeeIds.includes(userId)) {
      updateDoc('attendeeIds', doc.attendeeIds.filter((id) => id !== userId))
      return
    }

    updateDoc('attendeeIds', [...doc.attendeeIds, userId])
  }

  // ── 연관 문서 ─────────────────────────────────
  const [docSearch, setDocSearch] = useState('')
  const [docDropOpen, setDocDropOpen] = useState(false)
  const docRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (docRef.current && !docRef.current.contains(e.target as Node)) setDocDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  const searchKeyword = docSearch.trim()
  const normalizedSearchDocNo = searchKeyword.toUpperCase()
  const customSearchDoc = RELATED_DOC_PATTERN.test(normalizedSearchDocNo)
    ? { docNo: normalizedSearchDocNo, title: normalizedSearchDocNo }
    : null

  const filteredDocs = [...ALL_DOCS, ...(customSearchDoc ? [customSearchDoc] : [])].filter(
    (candidate, index, source) =>
      source.findIndex((item) => item.docNo === candidate.docNo) === index
      && !doc.relatedDocs.find((linked) => linked.docNo === candidate.docNo)
      && (
        searchKeyword.length === 0
        || candidate.docNo.toLowerCase().includes(searchKeyword.toLowerCase())
        || candidate.title.includes(searchKeyword)
      )
  )
  const addRelatedDoc = (d: { docNo: string; title: string }) => {
    updateDoc('relatedDocs', [...doc.relatedDocs, d])
    setDocSearch('')
    setDocDropOpen(false)
  }
  const removeRelatedDoc = (docNo: string) => {
    updateDoc('relatedDocs', doc.relatedDocs.filter((d) => d.docNo !== docNo))
  }

  // ── 액션 아이템 진행률 ─────────────────────────
  const doneCount = doc.actionItems.filter((a) => a.done).length
  const progressPct = doc.actionItems.length > 0
    ? Math.round((doneCount / doc.actionItems.length) * 100)
    : 0

  // ── D-day 계산 ────────────────────────────────
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = (dateStr: string) =>
    Math.ceil((new Date(dateStr).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (!hasValidId) {
    return (
      <div className="p-6">
        <ErrorState
          title="잘못된 접근입니다"
          description="회의록 ID가 올바르지 않습니다."
          actionLabel="목록으로 이동"
          onAction={() => navigate('/meeting-notes')}
        />
      </div>
    )
  }

  if (isPending && !isDocLoaded) {
    return (
      <div className="p-6">
        <LoadingState title="회의록을 불러오는 중입니다" description="잠시만 기다려주세요." />
      </div>
    )
  }

  if ((isError || !isDocLoaded) && !isPending) {
    return (
      <div className="p-6">
        <ErrorState
          title="회의록을 불러오지 못했습니다"
          description="잠시 후 다시 시도해주세요."
          actionLabel="다시 시도"
          onAction={() => {
            void refetch()
          }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-full p-6 flex flex-col items-center">
      <div className="w-full max-w-[800px]">

        {/* ── 상단 툴바 ───────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-white hover:text-gray-600 transition-colors border border-gray-200"
            >
              <BackIcon />
            </button>
            <span className="font-mono text-[12px] text-gray-400">{doc.docNo}</span>
          </div>

          <div className="flex items-center gap-4">
            {/* 자동 저장 상태 */}
            <div className="flex items-center gap-1.5">
              {effectiveSaveStatus === 'saving' && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-[11px] text-gray-400">저장 중...</span>
                </>
              )}
              {effectiveSaveStatus === 'saved' && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[11px] text-gray-400">자동 저장됨</span>
                </>
              )}
              {effectiveSaveStatus === 'unsaved' && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                  <span className="text-[11px] text-gray-400">저장 대기 중</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center -space-x-1.5">
                {collaborators.map((editor) => (
                  <div
                    key={editor.clientId}
                    title={`${editor.userName} 편집 중`}
                    className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ backgroundColor: stringToColor(editor.userName) }}
                  >
                    {editor.userName[0] ?? '?'}
                  </div>
                ))}
              </div>
              <span className="text-[11px] text-gray-400">{collaborators.length}명 편집 중</span>
            </div>

            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="h-8 px-3 rounded-lg border border-rose-200 text-[12px] font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
              disabled={deleteMeetingNote.isPending}
            >
              삭제
            </button>
          </div>
        </div>

        {/* ── 문서 본문 ───────────────────────────── */}
        <div className="bg-white rounded-2xl border border-blue-50 shadow-[0_4px_24px_rgba(30,58,138,0.07)] px-10 py-8 space-y-8">

          {/* 메타 한 줄 */}
          <div className="flex items-center gap-4 text-[13px] text-gray-400 border-b border-gray-100 pb-5">
            <input
              type="date"
              value={doc.date}
              onChange={(e) => updateDoc('date', e.target.value)}
              className="bg-transparent outline-none border-b border-transparent hover:border-gray-200 focus:border-brand transition-colors text-[13px] text-gray-600 cursor-pointer"
            />
            <span className="text-gray-200">|</span>
            <input
              value={doc.location}
              onChange={(e) => updateDoc('location', e.target.value)}
              placeholder="장소 입력"
              className="bg-transparent outline-none border-b border-transparent hover:border-gray-200 focus:border-brand transition-colors text-gray-600 placeholder-gray-300 min-w-[120px]"
            />
            <span className="text-gray-200">|</span>
            <div className="flex items-center gap-1.5 text-gray-500">
              <span className="text-gray-300 text-[11px]">진행자</span>
              <select
                value={doc.facilitatorId}
                onChange={(e) => updateFacilitator(Number(e.target.value))}
                className="bg-transparent outline-none border-b border-transparent hover:border-gray-200 focus:border-brand transition-colors text-gray-600 cursor-pointer appearance-none"
              >
                {userOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 제목 */}
          <input
            value={doc.title}
            onChange={(e) => updateDoc('title', e.target.value)}
            placeholder="회의 제목을 입력하세요"
            className="w-full text-[28px] font-bold text-gray-900 bg-transparent outline-none placeholder-gray-200 leading-tight"
          />

          {/* ── 안건 ──────────────────────────────── */}
          <DocSection icon={<AgendaIcon />} title="안건">
            <div className="space-y-1.5">
              {doc.agenda.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2.5 group">
                  <span className="w-5 h-5 rounded-full bg-violet-50 text-violet-500 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    value={item}
                    onChange={(e) => updateAgenda(idx, e.target.value)}
                    className="flex-1 text-[14px] text-gray-700 bg-transparent outline-none border-b border-transparent focus:border-gray-200 transition-colors py-0.5"
                  />
                  <button
                    onClick={() => removeAgenda(idx)}
                    className="text-gray-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                  >
                    <CloseIcon />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2 mt-2">
                <span className="w-5 h-5 flex-shrink-0" />
                <input
                  value={agendaInput}
                  onChange={(e) => setAgendaInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAgenda() } }}
                  placeholder="+ 안건 추가 (Enter)"
                  className="flex-1 text-[13px] text-gray-400 bg-transparent outline-none placeholder-gray-300 py-0.5"
                />
              </div>
            </div>
          </DocSection>

          {/* ── 논의 내용 ──────────────────────────── */}
          <DocSection icon={<ContentIcon />} title="논의 내용">
            <AutoResizeTextarea
              value={doc.content}
              onChange={(v) => updateDoc('content', v)}
              placeholder="회의에서 논의된 내용을 자유롭게 작성하세요..."
            />
          </DocSection>

          {/* ── 결정 사항 ──────────────────────────── */}
          <DocSection icon={<DecisionIcon />} title="결정 사항">
            <div className="space-y-2">
              {doc.decisions.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 group">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <input
                    value={item}
                    onChange={(e) => updateDecision(idx, e.target.value)}
                    className="flex-1 text-[14px] text-amber-900 bg-transparent outline-none"
                  />
                  <button
                    onClick={() => removeDecision(idx)}
                    className="text-amber-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5"
                  >
                    <CloseIcon />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2 px-3">
                <span className="w-5 h-5 flex-shrink-0" />
                <input
                  value={decisionInput}
                  onChange={(e) => setDecisionInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDecision() } }}
                  placeholder="+ 결정 사항 추가 (Enter)"
                  className="flex-1 text-[13px] text-gray-400 bg-transparent outline-none placeholder-gray-300 py-0.5"
                />
              </div>
            </div>
          </DocSection>

          {/* ── 참석자 ─────────────────────────────── */}
          <DocSection icon={<UserIcon />} title="참석자">
            <div className="flex flex-wrap gap-2 mb-3">
              {attendeeLabels.map((attendee) => (
                <button
                  key={attendee.userId}
                  type="button"
                  onClick={() => toggleAttendee(attendee.userId)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] bg-blue-50 border border-blue-100 text-blue-600 hover:bg-red-50 hover:border-red-100 hover:text-red-500 transition-colors"
                  title="클릭하면 참석자에서 제거됩니다."
                >
                  {attendee.label}
                  <CloseIcon />
                </button>
              ))}
              {attendeeLabels.length === 0 && (
                <span className="text-[12px] text-gray-400">선택된 참석자가 없습니다.</span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {userOptions.map((option) => {
                const selected = doc.attendeeIds.includes(option.value)
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleAttendee(option.value)}
                    className={`px-2.5 py-1 rounded-lg text-[12px] border transition-colors ${
                      selected
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-blue-200 hover:text-blue-600'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </DocSection>

          {/* ── 액션 아이템 ────────────────────────── */}
          <DocSection icon={<ActionIcon />} title="액션 아이템">
            {/* 진행률 */}
            {doc.actionItems.length > 0 && (
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${doneCount === doc.actionItems.length ? 'bg-emerald-400' : 'bg-brand/50'}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className={`text-[11px] font-medium flex-shrink-0 ${doneCount === doc.actionItems.length ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {doneCount}/{doc.actionItems.length} 완료
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              {doc.actionItems.map((item) => {
                const diff = diffDays(item.deadline)
                const deadlineColor = item.done ? 'text-gray-300'
                  : diff < 0 ? 'text-red-500 font-semibold'
                  : diff <= 3 ? 'text-orange-500 font-semibold'
                  : 'text-gray-400'

                return (
                  <div key={item.id} className={`flex items-center gap-2.5 px-2 py-2 rounded-lg group transition-colors ${item.done ? 'opacity-60' : ''}`}>
                    <button
                      onClick={() => toggleAction(item.id)}
                      style={{ width: 18, height: 18 }}
                      className={`rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                        item.done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 hover:border-emerald-400'
                      }`}
                    >
                      {item.done && <CheckIcon />}
                    </button>
                    <span className={`flex-1 text-[14px] leading-snug ${item.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {item.content}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium flex-shrink-0">
                      {item.assignee}
                    </span>
                    <span className={`text-[11px] flex-shrink-0 ${deadlineColor}`}>
                      {item.deadline.slice(5)}
                      {!item.done && (diff >= 0 ? ` (D-${diff})` : ` (D+${Math.abs(diff)})`)}
                    </span>
                    <button
                      onClick={() => removeAction(item.id)}
                      className="text-gray-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                )
              })}

              {/* 액션 아이템 추가 */}
              <div className="flex items-center gap-2 px-2 pt-1">
                <div style={{ width: 18, height: 18 }} className="border-2 border-dashed border-gray-200 rounded flex-shrink-0" />
                <input
                  value={actionInput.content}
                  onChange={(e) => setActionInput((prev) => ({ ...prev, content: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAction() } }}
                  placeholder="+ 할 일 추가"
                  className="flex-1 text-[13px] text-gray-400 bg-transparent outline-none placeholder-gray-300"
                />
                <select
                  value={selectedAssigneeId}
                  onChange={(e) => setActionInput((prev) => ({ ...prev, assigneeId: Number(e.target.value) }))}
                  className="text-[11px] text-gray-400 bg-transparent outline-none border border-gray-100 rounded-full px-2 py-0.5 cursor-pointer hover:border-gray-200 transition-colors appearance-none"
                >
                  {userOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={actionInput.deadline}
                  onChange={(e) => setActionInput((prev) => ({ ...prev, deadline: e.target.value }))}
                  className="text-[11px] text-gray-400 bg-transparent outline-none border border-gray-100 rounded-full px-2 py-0.5 cursor-pointer hover:border-gray-200 transition-colors"
                />
              </div>
            </div>
          </DocSection>

          {/* ── 연관 문서 ──────────────────────────── */}
          <DocSection icon={<LinkIcon />} title="연관 문서">
            <div className="flex flex-wrap gap-2 mb-2">
              {doc.relatedDocs.map((d) => {
                const prefix = d.docNo.split('-')[0]
                return (
                  <div key={d.docNo} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-[12px] group">
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${DOC_PREFIX_STYLE[prefix] ?? 'bg-gray-100 text-gray-500'}`}>
                      {d.docNo}
                    </span>
                    <span className="text-gray-600">{d.title}</span>
                    <button
                      onClick={() => removeRelatedDoc(d.docNo)}
                      className="text-gray-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                )
              })}
            </div>
            <div ref={docRef} className="relative">
              <input
                value={docSearch}
                onFocus={() => setDocDropOpen(true)}
                onChange={(e) => { setDocSearch(e.target.value); setDocDropOpen(true) }}
                placeholder="+ 문서 연결"
                className="text-[13px] text-gray-400 bg-transparent outline-none placeholder-gray-300 border-b border-transparent focus:border-gray-200 transition-colors w-40"
              />
              {docDropOpen && filteredDocs.length > 0 && (
                <div className="absolute z-20 top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden w-80">
                  {filteredDocs.map((d) => (
                    <button
                      key={d.docNo}
                      type="button"
                      onMouseDown={() => addRelatedDoc(d)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 text-left"
                    >
                      <span className="font-mono text-[11px] text-gray-400">{d.docNo}</span>
                      <span className="text-[12px] text-gray-700 truncate">{d.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </DocSection>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="회의록을 삭제할까요?"
        description="삭제 후에는 복구할 수 없습니다."
        confirmText={deleteMeetingNote.isPending ? '삭제 중...' : '삭제'}
        cancelText="취소"
        onConfirm={() => {
          if (!hasValidId) return
          void deleteMeetingNote.mutateAsync(numericId).then(() => {
            navigate('/meeting-notes')
          })
        }}
      />
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 서브 컴포넌트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function DocSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-gray-300">{icon}</span>
        <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide">{title}</p>
      </div>
      {children}
    </div>
  )
}

function AutoResizeTextarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = `${ref.current.scrollHeight}px`
    }
  }, [value])
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={4}
      className="w-full text-[14px] text-gray-700 bg-transparent outline-none resize-none leading-relaxed placeholder-gray-300"
    />
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 아이콘
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function BackIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2.5L5 7L9 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function CloseIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
}
function CheckIcon() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7.5L8 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function AgendaIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M4.5 5h5M4.5 7h5M4.5 9h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" /></svg>
}
function ContentIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 4h10M2 7h10M2 10h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
}
function DecisionIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5L13 12.5H1L7 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><path d="M7 5.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><circle cx="7" cy="10" r="0.6" fill="currentColor" /></svg>
}
function UserIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="4.5" r="2.2" stroke="currentColor" strokeWidth="1.2" /><path d="M2.5 11.5C2.8 9.5 4.7 8 7 8C9.3 8 11.2 9.5 11.5 11.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
}
function ActionIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" /><path d="M4 4.5L4.5 5L5.5 3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" /><path d="M8.5 4.5h3M8.5 7h3M2 9h10M2 11h7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" /></svg>
}
function LinkIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5.5 8.5L8.5 5.5M6 4l1-1a3 3 0 014.24 4.24l-1 1M8 10l-1 1a3 3 0 01-4.24-4.24l1-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
}
