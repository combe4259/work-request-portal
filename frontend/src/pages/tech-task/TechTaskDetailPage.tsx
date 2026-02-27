import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import ShowMoreButton from '@/components/common/ShowMoreButton'
import TechTaskDetailBody, { parseDefinitionOfDone, type TechTaskDodItem } from '@/components/tech-task/TechTaskDetailBody'
import { PriorityBadge, StatusBadge } from '@/components/work-request/Badges'
import { TechTypeBadge } from '@/components/tech-task/Badges'
import api from '@/lib/api'
import { useCreateCommentMutation } from '@/features/comment/mutations'
import { useCommentsQuery } from '@/features/comment/queries'
import { useAttachmentsQuery } from '@/features/attachment/queries'
import { useActivityLogsQuery } from '@/features/activity-log/queries'
import { useDeleteTechTaskMutation, useUpdateTechTaskStatusMutation } from '@/features/tech-task/mutations'
import { useTechTaskDetailQuery, useTechTaskPrLinksQuery, useTechTaskRelatedRefsQuery } from '@/features/tech-task/queries'
import { useExpandableList } from '@/hooks/useExpandableList'
import type { Status } from '@/types/tech-task'

const STATUS_OPTIONS: Status[] = ['접수대기', '검토중', '개발중', '테스트중', '완료', '반려']

export default function TechTaskDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()

  const detailQuery = useTechTaskDetailQuery(id)
  const relatedRefsQuery = useTechTaskRelatedRefsQuery(id)
  const prLinksQuery = useTechTaskPrLinksQuery(id)
  const commentsQuery = useCommentsQuery('TECH_TASK', id)
  const attachmentsQuery = useAttachmentsQuery('TECH_TASK', id)
  const activityLogsQuery = useActivityLogsQuery('TECH_TASK', id)
  const updateStatusMutation = useUpdateTechTaskStatusMutation(id ?? '')
  const createCommentMutation = useCreateCommentMutation('TECH_TASK', id)
  const deleteMutation = useDeleteTechTaskMutation()

  const [status, setStatus] = useState<Status>('접수대기')
  const [statusOpen, setStatusOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [dod, setDod] = useState<TechTaskDodItem[]>([])
  const [isSavingDod, setIsSavingDod] = useState(false)
  const [comment, setComment] = useState('')

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

  const comments = commentsQuery.data?.items ?? []
  const attachments = attachmentsQuery.data ?? []
  const activityLogs = activityLogsQuery.data?.items ?? []
  const relatedDocs = relatedRefsQuery.data ?? []
  const visibleComments = useExpandableList(comments, 3)
  const visibleActivityLogs = useExpandableList(activityLogs, 5)

  const handleComment = async () => {
    const trimmed = comment.trim()
    if (!trimmed) {
      return
    }
    await createCommentMutation.mutateAsync({ content: trimmed })
    setComment('')
  }

  const handleDodToggle = async (itemId: number) => {
    if (!id || !detailQuery.data) {
      return
    }

    const previous = dod
    const next = dod.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item))
    setDod(next)
    setIsSavingDod(true)

    try {
      const payload = {
        title: detailQuery.data.title,
        currentIssue: detailQuery.data.currentIssue,
        solution: detailQuery.data.solution,
        definitionOfDone: JSON.stringify(next.map((item) => ({ text: item.text, done: item.done }))),
        type: detailQuery.data.type,
        priority: detailQuery.data.priority,
        status: detailQuery.data.status,
        deadline: detailQuery.data.deadline,
      }
      await api.put(`/tech-tasks/${id}`, payload)
      await detailQuery.refetch()
    } catch {
      setDod(previous)
    } finally {
      setIsSavingDod(false)
    }
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
          <TechTaskDetailBody
            data={data}
            relatedDocs={relatedDocs}
            prLinks={prLinks}
            attachments={attachments}
            attachmentsPending={attachmentsQuery.isPending}
            dodItems={dod}
            dodSaving={isSavingDod}
            onToggleDod={(itemId) => {
              void handleDodToggle(itemId)
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
                visibleComments.visibleItems.map((c) => (
                  <div key={c.id} className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-brand/10 flex items-center justify-center text-brand text-[10px] font-bold flex-shrink-0">
                      {c.authorName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-semibold text-gray-800">{c.authorName}</span>
                        <span className="text-[10px] text-gray-400">{c.createdAt}</span>
                      </div>
                      <p className="text-[12px] text-gray-600 leading-relaxed">{c.content}</p>
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
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) void handleComment() }}
                placeholder="댓글 입력 (⌘+Enter 전송)"
                rows={2}
                className="flex-1 px-2.5 py-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 resize-none"
              />
              <button
                onClick={() => {
                  void handleComment()
                }}
                disabled={!comment.trim() || createCommentMutation.isPending}
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
                  visibleActivityLogs.visibleItems.map((h, i) => (
                    <div key={h.id} className="flex gap-3 relative">
                      <div className="w-5 h-5 rounded-full bg-white border-2 border-gray-200 flex-shrink-0 z-10 flex items-center justify-center">
                        <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-brand' : 'bg-gray-300'}`} />
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <p className="text-[11px] font-semibold text-gray-700">{toActionLabel(h.actionType)}</p>
                        {h.beforeValue || h.afterValue ? (
                          <p className="text-[10px] text-gray-400 mt-0.5">{h.beforeValue ?? '-'} → {h.afterValue ?? '-'}</p>
                        ) : null}
                        <p className="text-[10px] text-gray-400 mt-0.5">{h.actorName} · {h.createdAt.slice(5)}</p>
                        {h.message ? (
                          <p className="text-[10px] text-gray-400 mt-0.5">{h.message}</p>
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
        title="기술과제를 삭제할까요?"
        description="삭제 후에는 복구할 수 없습니다."
        confirmText={deleteMutation.isPending ? '삭제 중...' : '삭제'}
        cancelText="취소"
        destructive
        onConfirm={() => {
          if (!id) return
          void deleteMutation.mutateAsync(id).then(() => {
            navigate('/tech-tasks')
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

function ChevronDownIcon() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"><path d="M2.5 4L5.5 7L8.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function EditIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M9 2L11 4L4.5 10.5H2.5V8.5L9 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
}
