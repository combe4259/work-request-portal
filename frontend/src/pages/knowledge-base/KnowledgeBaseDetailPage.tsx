import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState'
import { useKnowledgeBaseArticleQuery } from '@/features/knowledge-base/queries'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useDeleteKnowledgeBaseArticleMutation, useIncreaseKnowledgeBaseViewMutation } from '@/features/knowledge-base/mutations'
import type { KBCategory } from '@/types/knowledge-base'

const CATEGORY_STYLES: Record<KBCategory, string> = {
  '개발 가이드': 'bg-blue-50 text-blue-600',
  '아키텍처': 'bg-purple-50 text-purple-600',
  '트러블슈팅': 'bg-red-50 text-red-500',
  '온보딩': 'bg-emerald-50 text-emerald-700',
  '기타': 'bg-gray-100 text-gray-500',
}

function getDocRoute(docNo: string): string | null {
  const [prefix, idText] = docNo.split('-')
  const id = Number(idText)
  if (!prefix || !Number.isFinite(id)) {
    return null
  }

  if (prefix === 'WR') return `/work-requests/${id}`
  if (prefix === 'TK') return `/tech-tasks/${id}`
  if (prefix === 'TS') return `/test-scenarios/${id}`
  if (prefix === 'DF') return `/defects/${id}`
  if (prefix === 'DP') return `/deployments/${id}`
  if (prefix === 'MN') return `/meeting-notes/${id}`
  if (prefix === 'ID') return `/ideas/${id}`
  return null
}

export default function KnowledgeBaseDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const numericId = Number(id)
  const validId = Number.isInteger(numericId) && numericId > 0

  const { data, isPending, isError, refetch } = useKnowledgeBaseArticleQuery(validId ? numericId : undefined)
  const increaseView = useIncreaseKnowledgeBaseViewMutation(validId ? numericId : undefined)
  const deleteArticle = useDeleteKnowledgeBaseArticleMutation()
  const viewedRef = useRef(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    if (!validId || !data || viewedRef.current) {
      return
    }

    viewedRef.current = true
    void increaseView.mutateAsync()
  }, [data, increaseView, validId])

  if (!validId) {
    return (
      <div className="p-6">
        <EmptyState title="잘못된 접근입니다" description="문서 ID가 올바르지 않습니다." actionLabel="목록으로" onAction={() => navigate('/knowledge-base')} />
      </div>
    )
  }

  if (isPending) {
    return (
      <div className="p-6">
        <LoadingState title="문서를 불러오는 중입니다" description="지식 베이스 상세 데이터를 조회하고 있습니다." />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="p-6">
        <ErrorState
          title="문서를 불러오지 못했습니다"
          description="잠시 후 다시 시도해주세요."
          actionLabel="다시 시도"
          onAction={() => { void refetch() }}
        />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
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
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${CATEGORY_STYLES[data.category]}`}>
              {data.category}
            </span>
          </div>
          <h1 className="text-[20px] font-bold text-gray-900 leading-snug">{data.title}</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/knowledge-base/${data.id}/edit`)}
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

      <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-4">
        <div className="grid grid-cols-4 gap-4">
          <MetaItem label="작성자" value={data.author} />
          <MetaItem label="등록일" value={data.createdAt} />
          <MetaItem label="최종 수정" value={data.updatedAt} />
          <MetaItem label="조회수" value={String(data.views)} />
        </div>
      </div>

      <div className="bg-blue-50/50 rounded-xl border border-blue-100 px-5 py-4">
        <div className="text-[11px] font-semibold text-blue-500 uppercase tracking-wide mb-2">요약</div>
        <p className="text-[13px] text-gray-700 leading-relaxed">{data.summary}</p>
      </div>

      <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-4">
        <p className="text-[12px] font-semibold text-gray-700 mb-3">기술 태그</p>
        <div className="flex flex-wrap gap-1.5">
          {data.tags.length === 0 ? (
            <span className="text-[12px] text-gray-400">등록된 태그가 없습니다.</span>
          ) : (
            data.tags.map((tag) => (
              <span key={tag} className="h-6 px-2.5 bg-brand/8 text-brand rounded-md text-[12px] font-medium border border-brand/15 flex items-center">
                {tag}
              </span>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-5">
        <p className="text-[12px] font-semibold text-gray-700 mb-3">본문</p>
        <div className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{data.content}</div>
      </div>

      {data.relatedDocs.length > 0 ? (
        <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-4">
          <p className="text-[12px] font-semibold text-gray-700 mb-3">연관 문서</p>
          <div className="flex flex-wrap gap-2">
            {data.relatedDocs.map((doc) => {
              const route = getDocRoute(doc.docNo)
              return (
                <button
                  key={doc.docNo}
                  type="button"
                  onClick={() => {
                    if (route) navigate(route)
                  }}
                  disabled={!route}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:border-brand/40 hover:bg-blue-50/30 transition-colors group disabled:opacity-70 disabled:cursor-default"
                >
                  <span className="font-mono text-[11px] text-gray-600">{doc.docNo}</span>
                  <span className="text-[12px] text-gray-600 group-hover:text-brand transition-colors">{doc.title}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="문서를 삭제할까요?"
        description="삭제 후에는 복구할 수 없습니다."
        confirmText={deleteArticle.isPending ? '삭제 중...' : '삭제'}
        cancelText="취소"
        destructive
        onConfirm={() => {
          void deleteArticle.mutateAsync(data.id).then(() => {
            navigate('/knowledge-base')
          })
        }}
      />
    </div>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-[13px] text-gray-700 font-medium">{value}</p>
    </div>
  )
}

function BackIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M9 2.5L5 7L9 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function EditIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M2 11h2l6-6-2-2-6 6v2z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M7.6 3.4l2 2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}
