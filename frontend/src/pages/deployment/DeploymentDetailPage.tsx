import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import ShowMoreButton from '@/components/common/ShowMoreButton'
import DeploymentDetailBody from '@/components/deployment/DeploymentDetailBody'
import { DeployTypeBadge, DeployEnvBadge, DeployStatusBadge } from '@/components/deployment/Badges'
import { useDeleteDeploymentMutation, useUpdateDeploymentStatusMutation } from '@/features/deployment/mutations'
import { useDeploymentDetailQuery, useDeploymentRelatedRefsQuery, useDeploymentStepsQuery } from '@/features/deployment/queries'
import { updateDeploymentStep, type DeploymentStep } from '@/features/deployment/service'
import { useCreateCommentMutation } from '@/features/comment/mutations'
import { useCommentsQuery } from '@/features/comment/queries'
import { useAttachmentsQuery } from '@/features/attachment/queries'
import { useActivityLogsQuery } from '@/features/activity-log/queries'
import { useExpandableList } from '@/hooks/useExpandableList'
import type { DeployStatus } from '@/types/deployment'

const STATUS_OPTIONS: DeployStatus[] = ['대기', '진행중', '완료', '실패', '롤백']

export default function DeploymentDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const numericId = Number(id)
  const hasValidId = Number.isInteger(numericId) && numericId > 0

  const detailQuery = useDeploymentDetailQuery(hasValidId ? numericId : undefined)
  const relatedRefsQuery = useDeploymentRelatedRefsQuery(hasValidId ? numericId : undefined)
  const stepsQuery = useDeploymentStepsQuery(hasValidId ? numericId : undefined)

  const commentsQuery = useCommentsQuery('DEPLOYMENT', hasValidId ? numericId : undefined)
  const attachmentsQuery = useAttachmentsQuery('DEPLOYMENT', hasValidId ? numericId : undefined)
  const activityLogsQuery = useActivityLogsQuery('DEPLOYMENT', hasValidId ? numericId : undefined)

  const updateStatus = useUpdateDeploymentStatusMutation(hasValidId ? numericId : undefined)
  const deleteDeployment = useDeleteDeploymentMutation()
  const createComment = useCreateCommentMutation('DEPLOYMENT', hasValidId ? numericId : undefined)

  const [statusOpen, setStatusOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState<DeployStatus>('대기')
  const [steps, setSteps] = useState<DeploymentStep[]>([])
  const [savingStepId, setSavingStepId] = useState<number | null>(null)

  const data = detailQuery.data
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
    setSteps(stepsQuery.data ?? [])
  }, [stepsQuery.data])

  const includedDocs = relatedRefsQuery.data ?? []
  const visibleComments = useExpandableList(comments, 3)
  const visibleActivityLogs = useExpandableList(activityLogs, 5)

  const handleStatusChange = async (next: DeployStatus) => {
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

  const handleStepToggle = async (stepId: number) => {
    if (!hasValidId) {
      return
    }

    const previous = steps
    const target = previous.find((item) => item.id === stepId)
    if (!target) {
      return
    }

    const nextDone = !target.isDone
    const next = previous.map((item) => (item.id === stepId ? { ...item, isDone: nextDone } : item))
    setSteps(next)
    setSavingStepId(stepId)

    try {
      await updateDeploymentStep(numericId, stepId, nextDone)
      await stepsQuery.refetch()
    } catch {
      setSteps(previous)
    } finally {
      setSavingStepId(null)
    }
  }

  if (!hasValidId) {
    return (
      <div className="p-6">
        <ErrorState
          title="잘못된 접근입니다"
          description="배포 ID가 올바르지 않습니다."
          actionLabel="목록으로 이동"
          onAction={() => navigate('/deployments')}
        />
      </div>
    )
  }

  if (detailQuery.isPending) {
    return (
      <div className="p-6">
        <LoadingState title="배포 상세를 불러오는 중입니다" description="잠시만 기다려주세요." />
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

  const isProd = data.env === '운영'
  const isFailed = status === '실패' || status === '롤백'

  return (
    <div className="p-6">
      {isProd && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl mb-4">
          <WarningIcon />
          <p className="text-[12px] text-red-600 font-medium">운영 환경 배포입니다. 각 단계를 신중하게 진행해주세요.</p>
        </div>
      )}
      {isFailed && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-orange-50 border border-orange-100 rounded-xl mb-4">
          <WarningIcon color="#f97316" />
          <p className="text-[12px] text-orange-600 font-medium">배포 {status} 상태입니다. 롤백 계획을 확인해주세요.</p>
        </div>
      )}

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
              <DeployTypeBadge type={data.type} />
              <DeployEnvBadge env={data.env} />
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
              <DeployStatusBadge status={status} />
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
                    <DeployStatusBadge status={option} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => navigate(`/deployments/${numericId}/edit`)}
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
          <DeploymentDetailBody
            data={data}
            includedDocs={includedDocs}
            steps={steps}
            stepsPending={stepsQuery.isPending}
            savingStepId={savingStepId}
            attachments={attachments}
            attachmentsPending={attachmentsQuery.isPending}
            onToggleStep={(stepId) => {
              void handleStepToggle(stepId)
            }}
            onNavigateToRef={(route) => navigate(route)}
          />
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
                visibleComments.visibleItems.map((item) => (
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
            <ShowMoreButton
              expanded={visibleComments.expanded}
              hiddenCount={visibleComments.hiddenCount}
              onToggle={visibleComments.toggle}
              className="mb-3"
            />
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
                  visibleActivityLogs.visibleItems.map((item, index) => (
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
            <ShowMoreButton
              expanded={visibleActivityLogs.expanded}
              hiddenCount={visibleActivityLogs.hiddenCount}
              onToggle={visibleActivityLogs.toggle}
              className="mt-3"
            />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="배포 문서를 삭제할까요?"
        description="삭제 후에는 복구할 수 없습니다."
        confirmText={deleteDeployment.isPending ? '삭제 중...' : '삭제'}
        cancelText="취소"
        destructive
        onConfirm={() => {
          void deleteDeployment.mutateAsync(numericId).then(() => {
            navigate('/deployments')
          })
        }}
      />
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

function BackIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M9 2.5L5 7L9 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function EditIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M9 2L11 4L4.5 10.5H2.5V8.5L9 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
}

function ChevronDownIcon() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"><path d="M2.5 4L5.5 7L8.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function WarningIcon({ color = '#ef4444' }: { color?: string }) {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 1.5L13 12.5H1L7 1.5Z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" /><line x1="7" y1="5.5" x2="7" y2="8.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" /><circle cx="7" cy="10.5" r="0.6" fill={color} /></svg>
}
