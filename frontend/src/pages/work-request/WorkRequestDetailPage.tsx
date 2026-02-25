import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { TypeBadge, PriorityBadge, StatusBadge } from '@/components/work-request/Badges'
import { useCreateCommentMutation } from '@/features/comment/mutations'
import { useCommentsQuery } from '@/features/comment/queries'
import { useAttachmentsQuery } from '@/features/attachment/queries'
import { useActivityLogsQuery } from '@/features/activity-log/queries'
import { useDeleteWorkRequestMutation, useUpdateWorkRequestStatusMutation } from '@/features/work-request/mutations'
import { useWorkRequestDetailQuery, useWorkRequestRelatedRefsQuery } from '@/features/work-request/queries'
import type { Status } from '@/types/work-request'

const STATUS_OPTIONS: Status[] = ['접수대기', '검토중', '개발중', '테스트중', '완료', '반려']

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

export default function WorkRequestDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const numericId = Number(id)
  const hasValidId = Number.isInteger(numericId) && numericId > 0

  const { data, isPending, isError, refetch } = useWorkRequestDetailQuery(hasValidId ? numericId : undefined)
  const relatedRefsQuery = useWorkRequestRelatedRefsQuery(hasValidId ? numericId : undefined)
  const commentsQuery = useCommentsQuery('WORK_REQUEST', hasValidId ? numericId : undefined)
  const attachmentsQuery = useAttachmentsQuery('WORK_REQUEST', hasValidId ? numericId : undefined)
  const activityLogsQuery = useActivityLogsQuery('WORK_REQUEST', hasValidId ? numericId : undefined)
  const updateStatusMutation = useUpdateWorkRequestStatusMutation(hasValidId ? numericId : undefined)
  const createCommentMutation = useCreateCommentMutation('WORK_REQUEST', hasValidId ? numericId : undefined)
  const deleteMutation = useDeleteWorkRequestMutation()

  const [statusOpen, setStatusOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [comment, setComment] = useState('')

  const handleStatusChange = async (next: Status) => {
    if (!hasValidId || !data || next === data.status) {
      setStatusOpen(false)
      return
    }

    setStatusOpen(false)

    try {
      await updateStatusMutation.mutateAsync(next)
    } catch {
      // no-op: query invalidate 후 서버 상태를 기준으로 다시 렌더링
    }
  }

  const comments = commentsQuery.data?.items ?? []
  const attachments = attachmentsQuery.data ?? []
  const activityLogs = activityLogsQuery.data?.items ?? []

  const handleComment = async () => {
    const trimmed = comment.trim()
    if (!trimmed) {
      return
    }

    await createCommentMutation.mutateAsync({ content: trimmed })
    setComment('')
  }

  if (!hasValidId) {
    return (
      <div className="p-6">
        <ErrorState
          title="잘못된 접근입니다"
          description="업무요청 ID가 올바르지 않습니다."
          actionLabel="목록으로 이동"
          onAction={() => navigate('/work-requests')}
        />
      </div>
    )
  }

  if (isPending) {
    return (
      <div className="p-6">
        <LoadingState title="업무요청 상세를 불러오는 중입니다" description="잠시만 기다려주세요." />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="p-6">
        <ErrorState
          title="상세 정보를 불러오지 못했습니다"
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
              <TypeBadge type={data.type} />
              <PriorityBadge priority={data.priority} />
            </div>
            <h1 className="text-[20px] font-bold text-gray-900 leading-snug">{data.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative">
            <button
              onClick={() => setStatusOpen((v) => !v)}
              disabled={updateStatusMutation.isPending}
              className="flex items-center gap-1.5 h-8 px-3 border border-gray-200 rounded-lg text-[12px] font-medium text-gray-600 hover:bg-white transition-colors disabled:opacity-60"
            >
              <StatusBadge status={data.status} />
              <ChevronDownIcon />
            </button>
            {statusOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden w-32">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      void handleStatusChange(option)
                    }}
                    className={`w-full px-3 py-2 text-left text-[12px] hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                      option === data.status ? 'bg-blue-50' : ''
                    }`}
                  >
                    <StatusBadge status={option} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => navigate(`/work-requests/${numericId}/edit`)}
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
              <MetaItem label="요청자" value={data.requester} />
              <MetaItem label="담당자" value={data.assignee} />
              <MetaItem label="마감일">
                <DeadlineText date={data.deadline} />
              </MetaItem>
              <MetaItem label="등록일" value={data.createdAt || '-'} />
            </div>
          </div>

          {data.background ? (
            <Section title="요청 배경">
              <p className="text-[13px] text-gray-600 leading-relaxed">{data.background}</p>
            </Section>
          ) : null}

          <Section title="내용">
            <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{data.description}</p>
          </Section>

          {relatedRefsQuery.data && relatedRefsQuery.data.length > 0 ? (
            <Section title="연관 문서">
              <div className="flex flex-wrap gap-2">
                {relatedRefsQuery.data.map((item) => {
                  const route = getRefRoute(item.refType, item.refId)
                  return (
                    <button
                      key={`${item.refType}-${item.refId}`}
                      type="button"
                      onClick={() => {
                        if (route) navigate(route)
                      }}
                      disabled={!route}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:border-brand/40 hover:bg-blue-50/30 transition-colors group disabled:opacity-70 disabled:cursor-default"
                    >
                      <span className="font-mono text-[11px] text-gray-600">{item.refNo}</span>
                      <span className="text-[12px] text-gray-600 group-hover:text-brand transition-colors">{item.title ?? item.refNo}</span>
                    </button>
                  )
                })}
              </div>
            </Section>
          ) : null}

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
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.metaKey) {
                    void handleComment()
                  }
                }}
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
                  activityLogs.map((item, index) => (
                    <div key={item.id} className="flex gap-3 relative">
                      <div className="w-5 h-5 rounded-full bg-white border-2 border-gray-200 flex-shrink-0 z-10 flex items-center justify-center">
                        <div className={`w-1.5 h-1.5 rounded-full ${index === 0 ? 'bg-brand' : 'bg-gray-300'}`} />
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <p className="text-[11px] font-semibold text-gray-700">{toActionLabel(item.actionType)}</p>
                        {item.beforeValue || item.afterValue ? (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {item.beforeValue ?? '-'} → {item.afterValue ?? '-'}
                          </p>
                        ) : null}
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {item.actorName} · {item.createdAt.slice(5)}
                        </p>
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
        title="업무요청을 삭제할까요?"
        description="삭제 후에는 복구할 수 없습니다."
        confirmText={deleteMutation.isPending ? '삭제 중...' : '삭제'}
        cancelText="취소"
        destructive
        onConfirm={() => {
          if (!hasValidId) return
          void deleteMutation.mutateAsync(numericId).then(() => {
            navigate('/work-requests')
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

function DeadlineText({ date }: { date: string }) {
  if (!date) {
    return <p className="text-[13px] font-medium text-gray-500">미정</p>
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadline = new Date(date)
  const diff = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  let cls = 'text-gray-700'
  if (diff < 0) cls = 'text-red-500'
  else if (diff <= 3) cls = 'text-orange-500'
  return (
    <p className={`text-[13px] font-medium ${cls}`}>
      {date} {diff >= 0 ? `(D-${diff})` : `(D+${Math.abs(diff)})`}
    </p>
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

function FileIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M3 1H8L11 4V12H3V1Z" stroke="#9CA3AF" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M8 1V4H11" stroke="#9CA3AF" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M9 2.5L5 7L9 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <path d="M2.5 4L5.5 7L8.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M2 11h2l6-6-2-2-6 6v2z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M7.6 3.4l2 2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}
