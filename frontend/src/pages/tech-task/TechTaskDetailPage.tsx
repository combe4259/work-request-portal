import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState'
import { PriorityBadge, StatusBadge } from '@/components/work-request/Badges'
import { TechTypeBadge } from '@/components/tech-task/Badges'
import { useUpdateTechTaskStatusMutation } from '@/features/tech-task/mutations'
import { useTechTaskDetailQuery, useTechTaskPrLinksQuery, useTechTaskRelatedRefsQuery } from '@/features/tech-task/queries'
import type { Status } from '@/types/tech-task'

const MOCK_COMMENTS = [
  { id: 1, author: '이설계', content: 'Service 인터페이스 먼저 정의하고 구현체 분리하는 방향으로 가면 테스트 붙이기도 편할 것 같습니다.', createdAt: '2026-02-08 10:14' },
  { id: 2, author: '김개발', content: '네, AccountService 인터페이스 → AccountServiceImpl 구조로 가겠습니다. PR 올리면 리뷰 부탁드립니다.', createdAt: '2026-02-10 14:32' },
]

const MOCK_HISTORY = [
  { action: '상태 변경', from: '검토중', to: '개발중', actor: '김개발', at: '2026-02-10 14:30' },
  { action: '담당자 배정', from: '미배정', to: '김개발', actor: '이설계', at: '2026-02-07 11:20' },
  { action: '상태 변경', from: '접수대기', to: '검토중', actor: '이설계', at: '2026-02-06 09:45' },
  { action: '등록', from: '', to: '', actor: '김개발', at: '2026-02-05 17:22' },
]

const STATUS_OPTIONS: Status[] = ['접수대기', '검토중', '개발중', '테스트중', '완료', '반려']

type DodItem = {
  id: number
  text: string
  done: boolean
}

function parseDefinitionOfDone(raw: string | undefined): DodItem[] {
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map((item, index) => {
        if (typeof item === 'string') {
          return { id: index + 1, text: item, done: false }
        }

        if (typeof item === 'object' && item !== null && 'text' in item) {
          const text = String((item as { text: unknown }).text ?? '').trim()
          const done = Boolean((item as { done?: unknown }).done)
          if (text.length === 0) {
            return null
          }
          return { id: index + 1, text, done }
        }

        return null
      })
      .filter((item): item is DodItem => item !== null)
  } catch {
    return []
  }
}

function getRefRoute(refType: string, refId: number): string | null {
  switch (refType) {
    case 'WORK_REQUEST':
      return `/work-requests/${refId}`
    case 'TECH_TASK':
      return `/tech-tasks/${refId}`
    default:
      return null
  }
}

export default function TechTaskDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()

  const detailQuery = useTechTaskDetailQuery(id)
  const relatedRefsQuery = useTechTaskRelatedRefsQuery(id)
  const prLinksQuery = useTechTaskPrLinksQuery(id)
  const updateStatusMutation = useUpdateTechTaskStatusMutation(id ?? '')

  const [status, setStatus] = useState<Status>('접수대기')
  const [statusOpen, setStatusOpen] = useState(false)
  const [dod, setDod] = useState<DodItem[]>([])
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState(MOCK_COMMENTS)

  useEffect(() => {
    if (!detailQuery.data) {
      return
    }

    setStatus(detailQuery.data.status)
    setDod(parseDefinitionOfDone(detailQuery.data.definitionOfDone))
  }, [detailQuery.data])

  const handleStatusChange = async (nextStatus: Status) => {
    if (!detailQuery.data) {
      return
    }

    if (nextStatus === status) {
      setStatusOpen(false)
      return
    }

    const previous = status
    setStatus(nextStatus)
    setStatusOpen(false)

    try {
      await updateStatusMutation.mutateAsync(nextStatus)
    } catch {
      setStatus(previous)
    }
  }

  const handleComment = () => {
    if (!comment.trim()) return
    setComments((prev) => [...prev, { id: Date.now(), author: '나', content: comment.trim(), createdAt: '방금 전' }])
    setComment('')
  }

  if (detailQuery.isPending) {
    return (
      <div className="p-6">
        <LoadingState title="기술과제 상세를 불러오는 중입니다" description="잠시만 기다려주세요." />
      </div>
    )
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="p-6">
        <ErrorState
          title="상세 정보를 불러오지 못했습니다"
          description="잠시 후 다시 시도해주세요."
          actionLabel="다시 시도"
          onAction={() => {
            void detailQuery.refetch()
          }}
        />
      </div>
    )
  }

  const data = detailQuery.data
  const prLinks = prLinksQuery.data ?? []
  const relatedDocs = relatedRefsQuery.data ?? []

  const doneCnt = dod.filter((d) => d.done).length

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 mt-0.5 rounded-lg flex items-center justify-center text-gray-400 hover:bg-white hover:text-gray-600 transition-colors border border-gray-200 flex-shrink-0"
          >
            <BackIcon />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[12px] text-gray-400">{data.docNo}</span>
              <TechTypeBadge type={data.type} />
              <PriorityBadge priority={data.priority} />
            </div>
            <h1 className="text-[20px] font-bold text-gray-900 leading-snug">{data.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative">
            <button
              onClick={() => setStatusOpen((v) => !v)}
              className="flex items-center gap-1.5 h-8 px-3 border border-gray-200 rounded-lg text-[12px] font-medium text-gray-600 hover:bg-white transition-colors"
              disabled={updateStatusMutation.isPending}
            >
              <StatusBadge status={status} />
              <ChevronDownIcon />
            </button>
            {statusOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden w-32">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      void handleStatusChange(s)
                    }}
                    className={`w-full px-3 py-2 text-left text-[12px] hover:bg-gray-50 transition-colors flex items-center gap-2 ${s === status ? 'bg-blue-50' : ''}`}
                  >
                    <StatusBadge status={s} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => navigate(`/tech-tasks/${id}/edit`)}
            className="h-8 px-3 border border-gray-200 rounded-lg text-[12px] font-medium text-gray-600 hover:bg-white transition-colors flex items-center gap-1.5"
          >
            <EditIcon />
            수정
          </button>
        </div>
      </div>

      <div className="flex gap-5 items-start">
        <div className="flex-1 min-w-0 space-y-4">
          <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-4">
            <div className="grid grid-cols-4 gap-4">
              <MetaItem label="등록자" value={data.registrant} />
              <MetaItem label="담당자" value={data.assignee} />
              <MetaItem label="마감일">
                <DeadlineText date={data.deadline} />
              </MetaItem>
              <MetaItem label="등록일" value={data.createdAt} />
            </div>
          </div>

          <Section title="문제 현황">
            <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{data.currentIssue}</p>
          </Section>

          <Section title="개선 방안">
            <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{data.solution}</p>
          </Section>

          <Section title={`완료 기준 (${doneCnt}/${dod.length})`}>
            <div className="mb-3">
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full transition-all duration-300"
                  style={{ width: `${dod.length ? (doneCnt / dod.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            {dod.length === 0 ? (
              <EmptyState
                title="완료 기준이 없습니다"
                description="등록 시 입력된 완료 기준이 없어요."
              />
            ) : (
              <div className="space-y-2">
                {dod.map((item) => (
                  <label key={item.id} className="flex items-start gap-2.5 cursor-pointer group">
                    <div className="relative mt-0.5 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() =>
                          setDod((prev) =>
                            prev.map((d) => (d.id === item.id ? { ...d, done: !d.done } : d))
                          )
                        }
                        className="sr-only"
                      />
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          item.done ? 'bg-brand border-brand' : 'border-gray-300 group-hover:border-brand/50'
                        }`}
                      >
                        {item.done && <CheckIcon />}
                      </div>
                    </div>
                    <span
                      className={`text-[13px] leading-snug transition-colors ${
                        item.done ? 'text-gray-400 line-through' : 'text-gray-700'
                      }`}
                    >
                      {item.text}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </Section>

          <Section title="PR / 브랜치">
            {prLinksQuery.isPending ? (
              <p className="text-[12px] text-gray-400">불러오는 중...</p>
            ) : prLinks.length === 0 ? (
              <p className="text-[12px] text-gray-400">연결된 PR이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {prLinks.map((pr) => (
                  <a
                    key={pr.id}
                    href={pr.prUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100 hover:border-brand/30 hover:bg-blue-50/30 transition-colors group"
                  >
                    <GitBranchIcon />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-mono text-gray-600 truncate group-hover:text-brand transition-colors">
                        {pr.branchName}
                      </p>
                    </div>
                    <span className="text-[11px] text-brand font-semibold flex-shrink-0">
                      {pr.prNo ? `#${pr.prNo}` : '-'}
                    </span>
                    <ExternalLinkIcon />
                  </a>
                ))}
              </div>
            )}
          </Section>

          {relatedDocs.length > 0 && (
            <Section title="연관 문서">
              <div className="flex flex-wrap gap-2">
                {relatedDocs.map((d) => {
                  const route = getRefRoute(d.refType, d.refId)
                  return (
                    <button
                      key={`${d.refType}-${d.refId}`}
                      onClick={() => {
                        if (route) {
                          navigate(route)
                        }
                      }}
                      disabled={!route}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:border-brand/40 hover:bg-blue-50/30 transition-colors group disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <span className="font-mono text-[11px] text-gray-400">{d.refNo}</span>
                      <span className="text-[12px] text-gray-600 group-hover:text-brand transition-colors">{d.title ?? '제목 없음'}</span>
                    </button>
                  )
                })}
              </div>
            </Section>
          )}
        </div>

        <div className="w-[300px] flex-shrink-0 space-y-4">
          <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-4 py-4">
            <p className="text-[12px] font-semibold text-gray-700 mb-3">댓글 {comments.length}</p>
            <div className="space-y-3 mb-3 max-h-[260px] overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-brand/10 flex items-center justify-center text-brand text-[10px] font-bold flex-shrink-0">
                    {c.author[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-semibold text-gray-800">{c.author}</span>
                      <span className="text-[10px] text-gray-400">{c.createdAt}</span>
                    </div>
                    <p className="text-[12px] text-gray-600 leading-relaxed">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) handleComment() }}
                placeholder="댓글 입력 (⌘+Enter 전송)"
                rows={2}
                className="flex-1 px-2.5 py-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 resize-none"
              />
              <button
                onClick={handleComment}
                disabled={!comment.trim()}
                className="h-fit px-2.5 py-2 bg-brand text-white text-[11px] font-semibold rounded-lg hover:bg-brand-hover transition-colors disabled:opacity-40 self-end"
              >
                전송
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] p-4">
            <p className="text-[12px] font-semibold text-gray-700 mb-4">처리 이력</p>
            <div className="relative">
              <div className="absolute left-2.5 top-0 bottom-0 w-px bg-gray-100" />
              <div className="space-y-4">
                {MOCK_HISTORY.map((h, i) => (
                  <div key={i} className="flex gap-3 relative">
                    <div className="w-5 h-5 rounded-full bg-white border-2 border-gray-200 flex-shrink-0 z-10 flex items-center justify-center">
                      <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-brand' : 'bg-gray-300'}`} />
                    </div>
                    <div className="flex-1 min-w-0 pb-1">
                      <p className="text-[11px] font-semibold text-gray-700">{h.action}</p>
                      {h.from && (
                        <p className="text-[10px] text-gray-400 mt-0.5">{h.from} → {h.to}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-0.5">{h.actor} · {h.at.slice(5)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-4">
      <p className="text-[12px] font-semibold text-gray-700 mb-3">{title}</p>
      {children}
    </div>
  )
}

function MetaItem({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      {children ?? <p className="text-[13px] text-gray-700 font-medium">{value}</p>}
    </div>
  )
}

function DeadlineText({ date }: { date: string }) {
  if (!date) {
    return <p className="text-[13px] font-medium text-gray-400">-</p>
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.ceil((new Date(date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  let cls = 'text-gray-700'
  if (diff < 0) cls = 'text-red-500'
  else if (diff <= 3) cls = 'text-orange-500'
  return <p className={`text-[13px] font-medium ${cls}`}>{date} {diff >= 0 ? `(D-${diff})` : `(D+${Math.abs(diff)})`}</p>
}

function BackIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M9 2.5L5 7L9 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function ChevronDownIcon() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"><path d="M2.5 4L5.5 7L8.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function EditIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M9 2L11 4L4.5 10.5H2.5V8.5L9 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
}

function CheckIcon() {
  return <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true"><path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function GitBranchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="4" cy="3" r="1.5" stroke="#9CA3AF" strokeWidth="1.2" />
      <circle cx="4" cy="11" r="1.5" stroke="#9CA3AF" strokeWidth="1.2" />
      <circle cx="10" cy="5" r="1.5" stroke="#9CA3AF" strokeWidth="1.2" />
      <path d="M4 4.5V9.5" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M4 4.5C4 4.5 4 6.5 10 6.5V6.5" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"><path d="M4.5 2H2v7.5h7.5V7M6.5 1.5H10m0 0V5M10 1.5L5.5 6" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
