import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState'
import { TestTypeBadge, TestStatusBadge } from '@/components/test-scenario/Badges'
import { PriorityBadge } from '@/components/work-request/Badges'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import api from '@/lib/api'
import { useDeleteTestScenarioMutation, useUpdateTestScenarioStatusMutation } from '@/features/test-scenario/mutations'
import { useTestScenarioDetailQuery, useTestScenarioRelatedRefsQuery } from '@/features/test-scenario/queries'
import { useCreateCommentMutation } from '@/features/comment/mutations'
import { useCommentsQuery } from '@/features/comment/queries'
import { useAttachmentsQuery } from '@/features/attachment/queries'
import { useActivityLogsQuery } from '@/features/activity-log/queries'
import type { TestStatus } from '@/types/test-scenario'

interface ParsedStep {
  action: string
  expected: string
  result: StepResult
}

type StepResult = 'pass' | 'fail' | null

const STATUS_OPTIONS: TestStatus[] = ['작성중', '검토중', '승인됨', '실행중', '통과', '실패', '보류']

const DOC_PREFIX_STYLE: Record<string, string> = {
  WR: 'bg-blue-50 text-blue-500',
  TK: 'bg-slate-100 text-slate-500',
  TS: 'bg-emerald-50 text-emerald-600',
  DF: 'bg-red-50 text-red-400',
  DP: 'bg-orange-50 text-orange-500',
}

function parseScenarioSteps(raw: string): ParsedStep[] {
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map((item) => {
        if (typeof item === 'string') {
          const text = item.trim()
          if (!text) {
            return null
          }
          return { action: text, expected: '', result: null }
        }

        if (typeof item === 'object' && item !== null) {
          const action = String((item as { action?: unknown }).action ?? '').trim()
          const expected = String((item as { expected?: unknown }).expected ?? '').trim()
          const rawResult = String((item as { result?: unknown }).result ?? '').toLowerCase()
          const result: StepResult = rawResult === 'pass' ? 'pass' : rawResult === 'fail' ? 'fail' : null
          if (!action && !expected) {
            return null
          }
          return { action, expected, result }
        }

        return null
      })
      .filter((step): step is ParsedStep => step !== null)
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

export default function TestScenarioDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const numericId = Number(id)
  const hasValidId = Number.isInteger(numericId) && numericId > 0

  const detailQuery = useTestScenarioDetailQuery(hasValidId ? numericId : undefined)
  const relatedRefsQuery = useTestScenarioRelatedRefsQuery(hasValidId ? numericId : undefined)
  const commentsQuery = useCommentsQuery('TEST_SCENARIO', hasValidId ? numericId : undefined)
  const attachmentsQuery = useAttachmentsQuery('TEST_SCENARIO', hasValidId ? numericId : undefined)
  const activityLogsQuery = useActivityLogsQuery('TEST_SCENARIO', hasValidId ? numericId : undefined)

  const updateStatus = useUpdateTestScenarioStatusMutation(hasValidId ? numericId : undefined)
  const deleteScenario = useDeleteTestScenarioMutation()
  const createComment = useCreateCommentMutation('TEST_SCENARIO', hasValidId ? numericId : undefined)

  const [statusOpen, setStatusOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState<TestStatus>('작성중')
  const [stepResults, setStepResults] = useState<StepResult[]>([])

  const data = detailQuery.data
  const parsedSteps = useMemo(() => parseScenarioSteps(data?.steps ?? '[]'), [data?.steps])
  const comments = commentsQuery.data?.items ?? []
  const attachments = attachmentsQuery.data ?? []
  const activityLogs = activityLogsQuery.data?.items ?? []

  useEffect(() => {
    if (!data) {
      return
    }
    setStatus(data.status)
  }, [data])

  useEffect(() => {
    setStepResults(parsedSteps.map((step) => step.result))
  }, [parsedSteps])

  const relatedDocs = relatedRefsQuery.data?.map((item) => ({
    docNo: item.refNo,
    title: item.title ?? item.refNo,
    route: getRefRoute(item.refType, item.refId),
  })) ?? []

  const handleStatusChange = async (next: TestStatus) => {
    if (!data) {
      return
    }
    if (next === status) {
      setStatusOpen(false)
      return
    }

    const prev = status
    setStatus(next)
    setStatusOpen(false)

    try {
      await updateStatus.mutateAsync(next)
    } catch {
      setStatus(prev)
    }
  }

  const handleComment = async () => {
    const trimmed = comment.trim()
    if (!trimmed) {
      return
    }

    await createComment.mutateAsync({ content: trimmed })
    setComment('')
  }

  const setStepResult = async (idx: number, result: StepResult) => {
    if (!data) {
      return
    }

    const previous = [...stepResults]
    const next = [...stepResults]
    next[idx] = next[idx] === result ? null : result
    setStepResults(next)

    try {
      const nextSteps = parsedSteps.map((step, index) => ({
        action: step.action,
        expected: step.expected,
        result: next[index] ?? null,
      }))

      await api.put(`/test-scenarios/${numericId}`, {
        title: data.title,
        type: data.type,
        priority: data.priority,
        status: data.status,
        precondition: data.precondition,
        steps: JSON.stringify(nextSteps),
        expectedResult: data.expectedResult,
        actualResult: data.actualResult,
        statusNote: data.statusNote ?? null,
        deadline: data.deadline,
      })
      await detailQuery.refetch()
    } catch {
      setStepResults(previous)
    }
  }

  if (!hasValidId) {
    return (
      <div className="p-6">
        <ErrorState
          title="잘못된 접근입니다"
          description="테스트 시나리오 ID가 올바르지 않습니다."
          actionLabel="목록으로 이동"
          onAction={() => navigate('/test-scenarios')}
        />
      </div>
    )
  }

  if (detailQuery.isPending) {
    return (
      <div className="p-6">
        <LoadingState title="테스트 시나리오 상세를 불러오는 중입니다" description="잠시만 기다려주세요." />
      </div>
    )
  }

  if (detailQuery.isError || !data) {
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

  const executedCount = stepResults.filter((result) => result !== null).length
  const passCount = stepResults.filter((result) => result === 'pass').length
  const failCount = stepResults.filter((result) => result === 'fail').length
  const progressPct = parsedSteps.length === 0 ? 0 : Math.round((executedCount / parsedSteps.length) * 100)

  const isExecutable = status === '실행중' || status === '통과' || status === '실패'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadline = new Date(data.deadline)
  const diff = Number.isNaN(deadline.getTime())
    ? 0
    : Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

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
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-[12px] text-gray-400">{data.docNo}</span>
              <TestTypeBadge type={data.type} />
              <PriorityBadge priority={data.priority} />
            </div>
            <h1 className="text-[20px] font-bold text-gray-900 leading-snug">{data.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative">
            <button
              onClick={() => setStatusOpen((value) => !value)}
              className="flex items-center gap-1.5 h-8 px-3 border border-gray-200 rounded-lg text-[12px] font-medium text-gray-600 hover:bg-white transition-colors bg-white"
            >
              <TestStatusBadge status={status} />
              <ChevronDownIcon />
            </button>
            {statusOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden w-28">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      void handleStatusChange(option)
                    }}
                    className={`w-full px-3 py-2 text-left text-[12px] hover:bg-gray-50 transition-colors ${option === status ? 'bg-blue-50' : ''}`}
                  >
                    <TestStatusBadge status={option} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => navigate(`/test-scenarios/${numericId}/edit`)}
            className="h-8 px-3 border border-gray-200 rounded-lg text-[12px] font-medium text-gray-600 hover:bg-white transition-colors flex items-center gap-1.5"
          >
            <EditIcon />
            수정
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="h-8 px-3 border border-red-200 rounded-lg text-[12px] font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            삭제
          </button>
        </div>
      </div>

      <div className="flex gap-5 items-start">
        <div className="flex-1 min-w-0 space-y-4">
          <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-4">
            <div className="grid grid-cols-4 gap-4">
              <MetaItem label="담당자" value={data.assignee} />
              <MetaItem label="연관 문서">
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {relatedDocs.length === 0 ? (
                    <span className="text-[11px] text-gray-400">-</span>
                  ) : (
                    relatedDocs.map((doc) => {
                      const prefix = doc.docNo.split('-')[0]
                      return (
                        <span
                          key={`${doc.docNo}-${doc.route ?? 'none'}`}
                          className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${DOC_PREFIX_STYLE[prefix] ?? 'bg-gray-100 text-gray-500'}`}
                        >
                          {doc.docNo}
                        </span>
                      )
                    })
                  )}
                </div>
              </MetaItem>
              <MetaItem label="마감일">
                <p className={`text-[13px] font-medium mt-0.5 ${
                  diff < 0 ? 'text-red-500' : diff <= 3 ? 'text-orange-500' : 'text-gray-700'
                }`}>
                  {data.deadline}
                  {status !== '통과' && status !== '실패'
                    ? diff >= 0 ? ` (D-${diff})` : ` (D+${Math.abs(diff)})`
                    : ''}
                </p>
              </MetaItem>
              <MetaItem label="등록일" value={data.createdAt || '-'} />
            </div>
          </div>

          <Section title="사전 조건">
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-[13px] text-gray-600 leading-relaxed whitespace-pre-line border border-gray-100">
              {data.precondition || '-'}
            </div>
          </Section>

          <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-semibold text-gray-700">테스트 단계</p>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="text-emerald-600 font-semibold">{passCount}통과</span>
                <span>·</span>
                <span className="text-red-500 font-semibold">{failCount}실패</span>
                <span>·</span>
                <span>{executedCount}/{parsedSteps.length} 실행</span>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-gray-400">진행률</span>
                <span className="text-[10px] font-semibold text-gray-600">{progressPct}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {parsedSteps.length === 0 ? (
              <EmptyState title="테스트 단계가 없습니다" description="등록된 단계 정보가 없습니다." />
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[28px_1fr_1fr_96px] gap-3 pb-1 border-b border-gray-100">
                  <div />
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">액션</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">기대 결과</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-center">결과</p>
                </div>

                {parsedSteps.map((step, idx) => {
                  const result = stepResults[idx]
                  const rowBg =
                    result === 'pass' ? 'bg-emerald-50/60' :
                      result === 'fail' ? 'bg-red-50/60' :
                        'bg-white'

                  return (
                    <div
                      key={`${step.action}-${idx}`}
                      className={`grid grid-cols-[28px_1fr_1fr_96px] gap-3 items-start px-2 py-2 rounded-lg transition-colors ${rowBg}`}
                    >
                      <span className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        result === 'pass' ? 'bg-emerald-100 text-emerald-700' :
                          result === 'fail' ? 'bg-red-100 text-red-500' :
                            'bg-gray-100 text-gray-400'
                      }`}>
                        {idx + 1}
                      </span>

                      <p className="text-[12px] text-gray-700 leading-snug">{step.action}</p>
                      <p className="text-[12px] text-gray-500 leading-snug">{step.expected || '-'}</p>

                      <div className="flex items-center gap-1.5 justify-center">
                        <button
                          disabled={!isExecutable}
                          onClick={() => {
                            void setStepResult(idx, 'pass')
                          }}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                            result === 'pass'
                              ? 'bg-emerald-500 text-white'
                              : isExecutable
                                ? 'bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                : 'bg-gray-50 border border-gray-100 text-gray-300 cursor-not-allowed'
                          }`}
                        >
                          <CheckIcon />
                          Pass
                        </button>
                        <button
                          disabled={!isExecutable}
                          onClick={() => {
                            void setStepResult(idx, 'fail')
                          }}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                            result === 'fail'
                              ? 'bg-red-500 text-white'
                              : isExecutable
                                ? 'bg-white border border-red-200 text-red-500 hover:bg-red-50'
                                : 'bg-gray-50 border border-gray-100 text-gray-300 cursor-not-allowed'
                          }`}
                        >
                          <XIcon />
                          Fail
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {!isExecutable && (
              <p className="mt-3 text-[11px] text-gray-400 text-center">
                상태가 <strong>실행중 / 통과 / 실패</strong>일 때 결과를 입력할 수 있습니다.
              </p>
            )}
          </div>

          <Section title="연관 문서">
            {relatedDocs.length === 0 ? (
              <p className="text-[12px] text-gray-400">연관 문서가 없습니다.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {relatedDocs.map((doc) => {
                  const prefix = doc.docNo.split('-')[0]
                  return (
                    <button
                      key={`${doc.docNo}-${doc.route ?? 'none'}`}
                      onClick={() => {
                        if (doc.route) {
                          navigate(doc.route)
                        }
                      }}
                      disabled={!doc.route}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:border-brand/40 hover:bg-blue-50/30 transition-colors group disabled:opacity-70 disabled:cursor-default"
                    >
                      <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${DOC_PREFIX_STYLE[prefix] ?? 'bg-gray-100 text-gray-500'}`}>
                        {doc.docNo}
                      </span>
                      <span className="text-[12px] text-gray-600 group-hover:text-brand transition-colors">
                        {doc.title}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </Section>

          <Section title="첨부파일">
            {attachmentsQuery.isPending ? (
              <p className="text-[12px] text-gray-400">불러오는 중...</p>
            ) : attachments.length === 0 ? (
              <p className="text-[12px] text-gray-400">등록된 첨부파일이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {attachments.map((file) => (
                  <div key={file.id} className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                    <FileIcon />
                    <span className="text-[12px] text-gray-700 flex-1 truncate">{file.originalName}</span>
                    <span className="text-[11px] text-gray-400">{formatFileSize(file.fileSize)}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

        </div>

        <div className="w-[300px] flex-shrink-0 space-y-4">
          <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-4 py-4">
            <p className="text-[12px] font-semibold text-gray-700 mb-3">댓글 {comments.length}</p>
            <div className="space-y-3 mb-3 max-h-[260px] overflow-y-auto">
              {commentsQuery.isPending ? (
                <p className="text-[12px] text-gray-400">불러오는 중...</p>
              ) : comments.length === 0 ? (
                <EmptyState title="댓글이 없습니다" description="첫 댓글을 남겨보세요." />
              ) : (
                comments.map((item) => (
                  <div key={item.id} className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-brand/10 flex items-center justify-center text-brand text-[10px] font-bold flex-shrink-0">
                      {item.authorName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-semibold text-gray-800">{item.authorName}</span>
                        <span className="text-[10px] text-gray-400">{item.createdAt}</span>
                      </div>
                      <p className="text-[12px] text-gray-600 leading-relaxed">{item.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && event.metaKey) {
                    void handleComment()
                  }
                }}
                placeholder="댓글을 입력하세요 (⌘+Enter로 전송)"
                rows={2}
                className="flex-1 px-2.5 py-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 resize-none"
              />
              <button
                onClick={() => {
                  void handleComment()
                }}
                disabled={!comment.trim() || createComment.isPending}
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
                {activityLogsQuery.isPending ? (
                  <p className="text-[12px] text-gray-400">불러오는 중...</p>
                ) : activityLogs.length === 0 ? (
                  <p className="text-[12px] text-gray-400">처리 이력이 없습니다.</p>
                ) : (
                  activityLogs.map((item, index) => (
                    <div key={item.id} className="flex gap-3 relative">
                      <div className="w-5 h-5 rounded-full bg-white border-2 border-gray-200 flex-shrink-0 z-10 flex items-center justify-center">
                        <div className={`w-1.5 h-1.5 rounded-full ${index === 0 ? 'bg-brand' : 'bg-gray-300'}`} />
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <p className="text-[11px] font-semibold text-gray-700">{toActionLabel(item.actionType)}</p>
                        {item.beforeValue || item.afterValue ? (
                          <p className="text-[10px] text-gray-400 mt-0.5">{item.beforeValue ?? '-'} → {item.afterValue ?? '-'}</p>
                        ) : null}
                        <p className="text-[10px] text-gray-400 mt-0.5">{item.actorName} · {item.createdAt.slice(5)}</p>
                        {item.message ? (
                          <p className="text-[10px] text-gray-400 mt-0.5">{item.message}</p>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="테스트 시나리오를 삭제할까요?"
        description="삭제 후에는 복구할 수 없습니다."
        confirmText={deleteScenario.isPending ? '삭제 중...' : '삭제'}
        cancelText="취소"
        destructive
        onConfirm={() => {
          void deleteScenario.mutateAsync(numericId).then(() => {
            navigate('/test-scenarios')
          })
        }}
      />
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

function toActionLabel(actionType: string): string {
  if (actionType === 'CREATED') return '등록'
  if (actionType === 'UPDATED') return '수정'
  if (actionType === 'STATUS_CHANGED') return '상태 변경'
  if (actionType === 'ASSIGNEE_CHANGED') return '담당자 변경'
  if (actionType === 'DELETED') return '삭제'
  return actionType
}

function formatFileSize(bytes: number | null): string {
  if (bytes == null || bytes < 0) return '-'
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function BackIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M9 2.5L5 7L9 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function EditIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M9 2L11 4L4.5 10.5H2.5V8.5L9 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
}

function ChevronDownIcon() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"><path d="M2.5 4L5.5 7L8.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function CheckIcon() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M2 5L4 7.5L8 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function XIcon() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M2.5 2.5L7.5 7.5M7.5 2.5L2.5 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
}

function FileIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M3 1H8L11 4V12H3V1Z" stroke="#9CA3AF" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M8 1V4H11" stroke="#9CA3AF" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}
