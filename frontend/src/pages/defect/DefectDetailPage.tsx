import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import ShowMoreButton from '@/components/common/ShowMoreButton'
import { DefectTypeBadge, SeverityBadge, DefectStatusBadge } from '@/components/defect/Badges'
import { useDeleteDefectMutation, useUpdateDefectStatusMutation } from '@/features/defect/mutations'
import { useDefectDetailQuery } from '@/features/defect/queries'
import { useCreateCommentMutation } from '@/features/comment/mutations'
import { useCommentsQuery } from '@/features/comment/queries'
import { useAttachmentsQuery } from '@/features/attachment/queries'
import { useActivityLogsQuery } from '@/features/activity-log/queries'
import { useExpandableList } from '@/hooks/useExpandableList'
import type { DefectStatus } from '@/types/defect'

const STATUS_OPTIONS: DefectStatus[] = ['접수', '분석중', '수정중', '검증중', '완료', '재현불가', '보류']

const DOC_PREFIX_STYLE: Record<string, string> = {
  WR: 'bg-blue-50 text-blue-500',
  TK: 'bg-slate-100 text-slate-500',
  TS: 'bg-emerald-50 text-emerald-600',
  DF: 'bg-red-50 text-red-400',
  DP: 'bg-orange-50 text-orange-500',
}

function getRefRoute(docNo: string): string | null {
  const [prefix, idText] = docNo.split('-')
  const refId = Number(idText)
  if (!prefix || !Number.isInteger(refId) || refId <= 0) {
    return null
  }

  switch (prefix) {
    case 'WR':
      return `/work-requests/${refId}`
    case 'TK':
      return `/tech-tasks/${refId}`
    case 'TS':
      return `/test-scenarios/${refId}`
    case 'DF':
      return `/defects/${refId}`
    case 'DP':
      return `/deployments/${refId}`
    default:
      return null
  }
}

export default function DefectDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const numericId = Number(id)
  const hasValidId = Number.isInteger(numericId) && numericId > 0

  const detailQuery = useDefectDetailQuery(hasValidId ? numericId : undefined)
  const commentsQuery = useCommentsQuery('DEFECT', hasValidId ? numericId : undefined)
  const attachmentsQuery = useAttachmentsQuery('DEFECT', hasValidId ? numericId : undefined)
  const activityLogsQuery = useActivityLogsQuery('DEFECT', hasValidId ? numericId : undefined)

  const updateStatus = useUpdateDefectStatusMutation(hasValidId ? numericId : undefined)
  const deleteDefect = useDeleteDefectMutation()
  const createComment = useCreateCommentMutation('DEFECT', hasValidId ? numericId : undefined)

  const [statusOpen, setStatusOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState<DefectStatus>('접수')

  const data = detailQuery.data
  const comments = commentsQuery.data?.items ?? []
  const attachments = attachmentsQuery.data ?? []
  const activityLogs = activityLogsQuery.data?.items ?? []
  const visibleComments = useExpandableList(comments, 3)
  const visibleActivityLogs = useExpandableList(activityLogs, 5)

  useEffect(() => {
    if (!data) {
      return
    }
    setStatus(data.status)
  }, [data])

  const relatedDoc = useMemo(() => {
    if (!data?.relatedDoc || data.relatedDoc === '-') {
      return null
    }

    return {
      docNo: data.relatedDoc,
      title: data.relatedDoc,
      route: getRefRoute(data.relatedDoc),
    }
  }, [data?.relatedDoc])

  const handleStatusChange = async (next: DefectStatus) => {
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

  if (!hasValidId) {
    return (
      <div className="p-6">
        <ErrorState
          title="잘못된 접근입니다"
          description="결함 ID가 올바르지 않습니다."
          actionLabel="목록으로 이동"
          onAction={() => navigate('/defects')}
        />
      </div>
    )
  }

  if (detailQuery.isPending) {
    return (
      <div className="p-6">
        <LoadingState title="결함 상세를 불러오는 중입니다" description="잠시만 기다려주세요." />
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

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadline = new Date(data.deadline)
  const diff = Number.isNaN(deadline.getTime())
    ? 0
    : Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  const isCritical = data.severity === '치명적'

  return (
    <div className="p-6">
      {isCritical && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl mb-4">
          <CriticalIcon />
          <p className="text-[12px] text-red-700 font-semibold">치명적 심각도 결함입니다. 즉시 처리가 필요합니다.</p>
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
              <DefectTypeBadge type={data.type} />
              <SeverityBadge severity={data.severity} />
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
              <DefectStatusBadge status={status} />
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
                    <DefectStatusBadge status={option} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => navigate(`/defects/${numericId}/edit`)}
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
              <MetaItem label="발견자" value={data.reporter} />
              <MetaItem label="담당자" value={data.assignee} />
              <MetaItem label="수정 마감일">
                <p className={`text-[13px] font-medium mt-0.5 ${
                  diff < 0 ? 'text-red-500' : diff <= 3 ? 'text-orange-500' : 'text-gray-700'
                }`}>
                  {data.deadline}
                  {status !== '완료' && status !== '재현불가'
                    ? diff >= 0 ? ` (D-${diff})` : ` (D+${Math.abs(diff)})`
                    : ''}
                </p>
              </MetaItem>
              <MetaItem label="등록일" value={data.createdAt || '-'} />
            </div>
          </div>

          <Section title="발생 환경">
            <div className="flex items-center gap-2">
              <DeviceIcon />
              <span className="text-[13px] text-gray-700 font-mono">{data.environment || '-'}</span>
            </div>
          </Section>

          <Section title="재현 경로">
            {data.reproductionSteps.length === 0 ? (
              <p className="text-[12px] text-gray-400">등록된 재현 경로가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {data.reproductionSteps.map((step, idx) => (
                  <div key={`${step}-${idx}`} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-red-50 text-red-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-[13px] text-gray-600 leading-snug">{step}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-4">
              <div className="flex items-center gap-1.5 mb-3">
                <ExpectedIcon />
                <p className="text-[12px] font-semibold text-emerald-700">기대 동작</p>
              </div>
              <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap">{data.expectedBehavior || '-'}</p>
            </div>
            <div className="bg-white rounded-xl border border-red-100 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-4">
              <div className="flex items-center gap-1.5 mb-3">
                <ActualIcon />
                <p className="text-[12px] font-semibold text-red-500">실제 동작</p>
              </div>
              <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap">{data.actualBehavior || '-'}</p>
            </div>
          </div>

          {relatedDoc && (
            <Section title="연관 문서">
              <button
                onClick={() => {
                  if (relatedDoc.route) {
                    navigate(relatedDoc.route)
                  }
                }}
                disabled={!relatedDoc.route}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:border-brand/40 hover:bg-blue-50/30 transition-colors group disabled:opacity-70 disabled:cursor-default"
              >
                <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${DOC_PREFIX_STYLE[relatedDoc.docNo.split('-')[0]] ?? 'bg-gray-100 text-gray-500'}`}>
                  {relatedDoc.docNo}
                </span>
                <span className="text-[12px] text-gray-600 group-hover:text-brand transition-colors">{relatedDoc.title}</span>
              </button>
            </Section>
          )}

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
        title="결함을 삭제할까요?"
        description="삭제 후에는 복구할 수 없습니다."
        confirmText={deleteDefect.isPending ? '삭제 중...' : '삭제'}
        cancelText="취소"
        destructive
        onConfirm={() => {
          void deleteDefect.mutateAsync(numericId).then(() => {
            navigate('/defects')
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

function CriticalIcon() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true"><path d="M7.5 1L14 13.5H1L7.5 1Z" fill="#fee2e2" stroke="#ef4444" strokeWidth="1.3" strokeLinejoin="round" /><line x1="7.5" y1="5.5" x2="7.5" y2="9" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round" /><circle cx="7.5" cy="11" r="0.7" fill="#ef4444" /></svg>
}

function DeviceIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><rect x="4" y="1" width="6" height="12" rx="1.5" stroke="#9CA3AF" strokeWidth="1.2" /><circle cx="7" cy="11" r="0.7" fill="#9CA3AF" /></svg>
}

function ExpectedIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><circle cx="6.5" cy="6.5" r="5" stroke="#059669" strokeWidth="1.2" /><path d="M4 6.5L6 8.5L9.5 4.5" stroke="#059669" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function ActualIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><circle cx="6.5" cy="6.5" r="5" stroke="#ef4444" strokeWidth="1.2" /><path d="M4 4L9 9M9 4L4 9" stroke="#ef4444" strokeWidth="1.3" strokeLinecap="round" /></svg>
}

function FileIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M3 1H8L11 4V12H3V1Z" stroke="#9CA3AF" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M8 1V4H11" stroke="#9CA3AF" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}
