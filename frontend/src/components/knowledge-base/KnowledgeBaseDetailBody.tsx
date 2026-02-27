import ShowMoreButton from '@/components/common/ShowMoreButton'
import MarkdownRenderer from '@/components/common/MarkdownRenderer'
import { useExpandableList } from '@/hooks/useExpandableList'
import type { KBArticleDetail, KBCategory } from '@/types/knowledge-base'

interface KnowledgeBaseDetailBodyProps {
  data: KBArticleDetail
  onNavigateToDoc?: (route: string) => void
  relatedDocsLimit?: number
  className?: string
}

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

export default function KnowledgeBaseDetailBody({
  data,
  onNavigateToDoc,
  relatedDocsLimit = 5,
  className = '',
}: KnowledgeBaseDetailBodyProps) {
  const relatedDocs = data.relatedDocs ?? []
  const visibleRelatedDocs = useExpandableList(relatedDocs, relatedDocsLimit)

  return (
    <div className={`space-y-4 ${className}`.trim()}>
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
        <div className="flex items-center gap-2 mb-3">
          <p className="text-[12px] font-semibold text-gray-700">카테고리</p>
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${CATEGORY_STYLES[data.category]}`}>
            {data.category}
          </span>
        </div>
        <p className="text-[12px] text-gray-500">문서 분류: {data.category}</p>
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
        <MarkdownRenderer content={data.content} className="text-[13px]" />
      </div>

      {relatedDocs.length > 0 ? (
        <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-4">
          <p className="text-[12px] font-semibold text-gray-700 mb-3">연관 문서</p>
          <div className="flex flex-wrap gap-2">
            {visibleRelatedDocs.visibleItems.map((doc) => {
              const route = getDocRoute(doc.docNo)
              return (
                <button
                  key={doc.docNo}
                  type="button"
                  onClick={() => {
                    if (!route || !onNavigateToDoc) {
                      return
                    }
                    onNavigateToDoc(route)
                  }}
                  disabled={!route || !onNavigateToDoc}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:border-brand/40 hover:bg-blue-50/30 transition-colors group disabled:opacity-70 disabled:cursor-default"
                >
                  <span className="font-mono text-[11px] text-gray-600">{doc.docNo}</span>
                  <span className="text-[12px] text-gray-600 group-hover:text-brand transition-colors">{doc.title}</span>
                </button>
              )
            })}
          </div>
          <ShowMoreButton
            expanded={visibleRelatedDocs.expanded}
            hiddenCount={visibleRelatedDocs.hiddenCount}
            onToggle={visibleRelatedDocs.toggle}
            className="mt-3"
          />
        </div>
      ) : null}
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
