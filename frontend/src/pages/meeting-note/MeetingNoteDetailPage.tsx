import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { ActionItem } from '@/types/meeting-note'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 문서 타입
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface MeetingDoc {
  docNo: string
  title: string
  date: string
  location: string
  facilitator: string
  agenda: string[]
  content: string
  decisions: string[]
  actionItems: ActionItem[]
  relatedDocs: { docNo: string; title: string }[]
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Mock 데이터
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const MOCK_DOC: MeetingDoc = {
  docNo: 'MN-006',
  title: '3월 스프린트 킥오프 회의',
  date: '2026-02-21',
  location: '온라인 (Zoom)',
  facilitator: '박PM',
  agenda: [
    '2월 스프린트 결과 공유 및 미완료 항목 검토',
    '3월 개발 목표 및 우선순위 설정',
    '팀 역할 분담 및 일정 확정',
  ],
  content: `2월 스프린트 회고를 진행하였으며 전체 12개 스토리 포인트 중 10개를 완료(83% 달성)하였다. 미완료된 계좌 개설 UI 개선 건(WR-042)은 3월로 이월하기로 결정하였다.

3월 스프린트 목표로는 계좌 개설 프로세스 완료, 모바일 반응형 레이아웃 개선, 성능 최적화(API 응답 20% 개선)를 핵심 목표로 설정하였다.

팀 역할 분담에 대해 논의하였으며, 신규 개발자 박신입의 온보딩 기간을 고려하여 초반 2주는 간단한 버그 수정 위주로 배정하기로 합의하였다.`,
  decisions: [
    'WR-042 계좌 개설 UI 개선 건을 3월 첫째 주 최우선 과제로 처리한다.',
    '3월 21일(금) 스프린트 중간 점검 회의를 고정 일정으로 등록한다.',
    '성능 최적화는 API 응답시간 기준 20% 개선을 목표로 하며, TK-112로 별도 기술과제를 등록한다.',
  ],
  actionItems: [
    { id: 1, content: 'WR-042 계좌 개설 UI 개선 작업 착수 및 3/7(금)까지 1차 개발 완료', assignee: '김개발', deadline: '2026-03-07', done: true },
    { id: 2, content: 'TK-112 기술과제 등록 및 초기 분석 문서 작성', assignee: '이테스터', deadline: '2026-02-28', done: false },
    { id: 3, content: '3월 21일 중간 점검 회의 캘린더 공유 일정 등록', assignee: '박PM', deadline: '2026-02-24', done: false },
    { id: 4, content: '박신입 온보딩 가이드 문서 업데이트 (KB-019 수정)', assignee: '최설계', deadline: '2026-02-28', done: false },
    { id: 5, content: '모바일 반응형 레이아웃 현황 분석 보고서 작성', assignee: '박디자인', deadline: '2026-03-05', done: false },
  ],
  relatedDocs: [
    { docNo: 'WR-042', title: '계좌 개설 UI 개선 요청' },
    { docNo: 'TK-112', title: 'API 응답 성능 최적화' },
  ],
}

const BLANK_DOC: MeetingDoc = {
  docNo: 'MN-NEW',
  title: '',
  date: new Date().toISOString().split('T')[0],
  location: '',
  facilitator: '',
  agenda: [],
  content: '',
  decisions: [],
  actionItems: [],
  relatedDocs: [],
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 가상 참여자 (TODO: WebSocket presence로 교체)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const FAKE_COLLABORATORS = [
  { name: '이테스터', color: '#3B82F6' },
  { name: '최설계', color: '#8B5CF6' },
]

const ASSIGNEES = ['박PM', '김개발', '이테스터', '최설계', '박디자인', '이개발']
const FACILITATORS = ['박PM', '이설계', '김개발', '최설계', '최HR']

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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 페이지
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function MeetingNoteDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'new'

  // ── 문서 상태 ─────────────────────────────────
  const [doc, setDoc] = useState<MeetingDoc>(isNew ? BLANK_DOC : MOCK_DOC)

  // ── 자동 저장 ─────────────────────────────────
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>(isNew ? 'unsaved' : 'saved')
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const scheduleSave = useCallback((_patch: Partial<MeetingDoc>) => {
    setSaveStatus('unsaved')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving')

      // ━━ TODO: 백엔드 연동 시 아래 주석 해제 ━━━━━━━━━━━━
      // if (isNew) {
      //   const res = await fetch('/api/meeting-notes', { method: 'POST', body: JSON.stringify(patch) })
      //   const { id: newId } = await res.json()
      //   navigate(`/meeting-notes/${newId}`, { replace: true })
      // } else {
      //   await fetch(`/api/meeting-notes/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
      // }
      // socket.emit('doc:patch', { id, ...patch })
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      await new Promise((r) => setTimeout(r, 500)) // mock delay
      setSaveStatus('saved')
    }, 800)
  }, [])

  // ━━ TODO: WebSocket 연결 ━━━━━━━━━━━━━━━━━━━━━━
  // useEffect(() => {
  //   const socket = io(`/meeting-notes/${id}`)
  //   socket.on('doc:patch', (patch) => setDoc((prev) => ({ ...prev, ...patch })))
  //   socket.on('presence', (users) => setCollaborators(users))
  //   return () => socket.disconnect()
  // }, [id])
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const updateDoc = useCallback(<K extends keyof MeetingDoc>(key: K, value: MeetingDoc[K]) => {
    setDoc((prev) => {
      const next = { ...prev, [key]: value }
      scheduleSave({ [key]: value })
      return next
    })
  }, [scheduleSave])

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
  const [actionInput, setActionInput] = useState({ content: '', assignee: ASSIGNEES[0], deadline: '' })
  const addAction = () => {
    if (!actionInput.content.trim() || !actionInput.deadline) return
    const newItem: ActionItem = {
      id: Date.now(),
      content: actionInput.content.trim(),
      assignee: actionInput.assignee,
      deadline: actionInput.deadline,
      done: false,
    }
    updateDoc('actionItems', [...doc.actionItems, newItem])
    setActionInput({ content: '', assignee: ASSIGNEES[0], deadline: '' })
  }
  const toggleAction = (id: number) => {
    updateDoc('actionItems', doc.actionItems.map((a) => (a.id === id ? { ...a, done: !a.done } : a)))
  }
  const removeAction = (id: number) => updateDoc('actionItems', doc.actionItems.filter((a) => a.id !== id))

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
  const filteredDocs = ALL_DOCS.filter(
    (d) => !doc.relatedDocs.find((r) => r.docNo === d.docNo) &&
      (d.docNo.toLowerCase().includes(docSearch.toLowerCase()) || d.title.includes(docSearch))
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
  const today = new Date('2026-02-22')
  today.setHours(0, 0, 0, 0)
  const diffDays = (dateStr: string) =>
    Math.ceil((new Date(dateStr).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

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
              {saveStatus === 'saving' && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-[11px] text-gray-400">저장 중...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[11px] text-gray-400">자동 저장됨</span>
                </>
              )}
              {saveStatus === 'unsaved' && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                  <span className="text-[11px] text-gray-400">저장 대기 중</span>
                </>
              )}
            </div>

            {/* 참여자 (TODO: WebSocket presence) */}
            {!isNew && (
              <div className="flex items-center gap-2">
                <div className="flex items-center -space-x-1.5">
                  {FAKE_COLLABORATORS.map((c, i) => (
                    <div
                      key={i}
                      title={`${c.name} 편집 중`}
                      className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ backgroundColor: c.color }}
                    >
                      {c.name[0]}
                    </div>
                  ))}
                </div>
                <span className="text-[11px] text-gray-400">{FAKE_COLLABORATORS.length}명 편집 중</span>
              </div>
            )}
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
                value={doc.facilitator}
                onChange={(e) => updateDoc('facilitator', e.target.value)}
                className="bg-transparent outline-none border-b border-transparent hover:border-gray-200 focus:border-brand transition-colors text-gray-600 cursor-pointer appearance-none"
              >
                <option value="">선택</option>
                {FACILITATORS.map((f) => <option key={f} value={f}>{f}</option>)}
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
                  value={actionInput.assignee}
                  onChange={(e) => setActionInput((prev) => ({ ...prev, assignee: e.target.value }))}
                  className="text-[11px] text-gray-400 bg-transparent outline-none border border-gray-100 rounded-full px-2 py-0.5 cursor-pointer hover:border-gray-200 transition-colors appearance-none"
                >
                  {ASSIGNEES.map((a) => <option key={a} value={a}>{a}</option>)}
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
function ActionIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" /><path d="M4 4.5L4.5 5L5.5 3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" /><path d="M8.5 4.5h3M8.5 7h3M2 9h10M2 11h7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" /></svg>
}
function LinkIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5.5 8.5L8.5 5.5M6 4l1-1a3 3 0 014.24 4.24l-1 1M8 10l-1 1a3 3 0 01-4.24-4.24l1-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
}
