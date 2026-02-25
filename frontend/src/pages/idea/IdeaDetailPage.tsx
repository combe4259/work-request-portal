import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CategoryBadge, IdeaStatusBadge } from '@/components/idea/Badges'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import ShowMoreButton from '@/components/common/ShowMoreButton'
import { useIdeaQuery, useIdeaRelatedRefsQuery } from '@/features/idea/queries'
import { useDeleteIdeaMutation, useLikeIdeaMutation, useUnlikeIdeaMutation, useUpdateIdeaStatusMutation } from '@/features/idea/mutations'
import { useExpandableList } from '@/hooks/useExpandableList'
import type { IdeaStatus } from '@/types/idea'

const MOCK_COMMENTS = [
  { id: 1, author: '이설계', content: '좋은 아이디어입니다. 구현 범위를 조금 더 구체화하면 좋겠습니다.', createdAt: '2026-02-16 10:20' },
  { id: 2, author: '김개발', content: '기술 검토 후 다음 스프린트 후보로 올려보겠습니다.', createdAt: '2026-02-17 14:05' },
]

const STATUS_OPTIONS: IdeaStatus[] = ['제안됨', '검토중', '채택', '보류', '기각']

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
    case 'KNOWLEDGE_BASE':
      return `/knowledge-base/${refId}`
    default:
      return null
  }
}

export default function IdeaDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { data, isPending, isError, refetch } = useIdeaQuery(id)
  const relatedRefsQuery = useIdeaRelatedRefsQuery(id)
  const updateStatus = useUpdateIdeaStatusMutation()
  const likeIdea = useLikeIdeaMutation()
  const unlikeIdea = useUnlikeIdeaMutation()
  const deleteIdea = useDeleteIdeaMutation()

  const [statusOpen, setStatusOpen] = useState(false)
  const [statusDraft, setStatusDraft] = useState<IdeaStatus | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [liked, setLiked] = useState(false)
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState(MOCK_COMMENTS)
  const relatedRefs = relatedRefsQuery.data ?? []
  const visibleRelatedRefs = useExpandableList(relatedRefs, 5)
  const visibleComments = useExpandableList(comments, 3)

  if (isPending) {
    return (
      <div className="p-6">
        <LoadingState title="아이디어를 불러오는 중입니다" description="상세 데이터를 조회하고 있습니다." />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6">
        <ErrorState
          title="아이디어를 불러오지 못했습니다"
          description="잠시 후 다시 시도해주세요."
          actionLabel="다시 시도"
          onAction={() => { void refetch() }}
        />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6">
        <EmptyState title="아이디어를 찾을 수 없습니다" description="목록으로 돌아가 다시 선택해주세요." actionLabel="목록으로" onAction={() => navigate('/ideas')} />
      </div>
    )
  }

  const status = statusDraft ?? data.status
  const likeCount = data.likes + (liked ? 1 : 0)

  const handleStatusChange = async (nextStatus: IdeaStatus) => {
    setStatusDraft(nextStatus)
    setStatusOpen(false)
    await updateStatus.mutateAsync({ id: data.id, status: nextStatus })
  }

  const handleLike = async () => {
    if (liked) {
      await unlikeIdea.mutateAsync(data.id)
      setLiked(false)
      return
    }
    await likeIdea.mutateAsync(data.id)
    setLiked(true)
  }

  const handleComment = () => {
    if (!comment.trim()) return
    setComments((prev) => [...prev, { id: Date.now(), author: '나', content: comment.trim(), createdAt: '방금 전' }])
    setComment('')
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
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-[12px] text-gray-400">{data.docNo}</span>
              <CategoryBadge category={data.category} />
            </div>
            <h1 className="text-[20px] font-bold text-gray-900 leading-snug">{data.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => { void handleLike() }}
            className={`flex items-center gap-1.5 h-8 px-3 border rounded-lg text-[12px] font-medium transition-colors ${
              liked
                ? 'bg-red-50 border-red-200 text-red-500'
                : 'bg-white border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-400'
            }`}
          >
            <HeartIcon filled={liked} />
            {likeCount}
          </button>

          <div className="relative">
            <button
              onClick={() => setStatusOpen((v) => !v)}
              className="flex items-center gap-1.5 h-8 px-3 border border-gray-200 rounded-lg text-[12px] font-medium text-gray-600 hover:bg-white transition-colors bg-white"
            >
              <IdeaStatusBadge status={status} />
              <ChevronDownIcon />
            </button>
            {statusOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden w-24">
                {STATUS_OPTIONS.map((item) => (
                  <button
                    key={item}
                    onClick={() => { void handleStatusChange(item) }}
                    className={`w-full px-3 py-2 text-left text-[12px] hover:bg-gray-50 transition-colors ${item === status ? 'bg-blue-50' : ''}`}
                  >
                    <IdeaStatusBadge status={item} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate(`/ideas/${data.id}/edit`)}
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
            <div className="grid grid-cols-3 gap-4">
              <MetaItem label="카테고리">
                <div className="mt-0.5"><CategoryBadge category={data.category} /></div>
              </MetaItem>
              <MetaItem label="제안자" value={data.proposer} />
              <MetaItem label="등록일" value={data.createdAt} />
            </div>
          </div>

          <Section title="아이디어 내용">
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-[13px] text-gray-600 leading-relaxed whitespace-pre-line border border-gray-100">
              {data.content}
            </div>
          </Section>

          <Section title="기대 효과">
            {data.benefits.length === 0 ? (
              <p className="text-[12px] text-gray-400">등록된 기대 효과가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {data.benefits.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-[13px] text-gray-600 leading-snug">{item}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {relatedRefs.length > 0 ? (
            <Section title="연관 문서">
              <div className="flex flex-wrap gap-2">
                {visibleRelatedRefs.visibleItems.map((item) => {
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
              <ShowMoreButton
                expanded={visibleRelatedRefs.expanded}
                hiddenCount={visibleRelatedRefs.hiddenCount}
                onToggle={visibleRelatedRefs.toggle}
                className="mt-3"
              />
            </Section>
          ) : null}
        </div>

        <div className="w-[300px] flex-shrink-0 space-y-4">
          <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-4 py-4">
            <p className="text-[12px] font-semibold text-gray-700 mb-3">댓글 {comments.length}</p>
            <div className="space-y-3 mb-3 max-h-[260px] overflow-y-auto">
              {visibleComments.visibleItems.map((c) => (
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
                onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) handleComment() }}
                placeholder="의견을 남겨주세요 (⌘+Enter로 전송)"
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
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="아이디어를 삭제할까요?"
        description="삭제 후에는 복구할 수 없습니다."
        confirmText={deleteIdea.isPending ? '삭제 중...' : '삭제'}
        cancelText="취소"
        destructive
        onConfirm={() => {
          void deleteIdea.mutateAsync(data.id).then(() => {
            navigate('/ideas')
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

function BackIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M9 2.5L5 7L9 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function ChevronDownIcon() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"><path d="M2.5 4L5.5 7L8.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path
        d="M6.5 11S1 7.5 1 4a2.5 2.5 0 015 0 2.5 2.5 0 015 0c0 3.5-5.5 7-5.5 7z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        fill={filled ? 'currentColor' : 'none'}
      />
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
