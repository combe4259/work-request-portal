import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { KBArticle, KBCategory } from '@/types/knowledge-base'
import { PlusIcon, SearchIcon } from '@/components/common/Icons'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState'
import PageHeader from '@/components/common/PageHeader'
import { useKnowledgeBaseArticlesQuery } from '@/features/knowledge-base/queries'

const CATEGORIES: KBCategory[] = ['개발 가이드', '아키텍처', '트러블슈팅', '온보딩', '기타']

const CATEGORY_STYLES: Record<KBCategory, string> = {
  '개발 가이드': 'bg-blue-50 text-blue-600',
  '아키텍처': 'bg-purple-50 text-purple-600',
  '트러블슈팅': 'bg-red-50 text-red-500',
  '온보딩': 'bg-emerald-50 text-emerald-700',
  '기타': 'bg-gray-100 text-gray-500',
}

export default function KnowledgeBasePage() {
  const navigate = useNavigate()
  const { data, isPending, isError, refetch } = useKnowledgeBaseArticlesQuery()

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<KBCategory | '전체'>('전체')
  const [activeTags, setActiveTags] = useState<string[]>([])

  const articles = data ?? []

  const allTags = useMemo(
    () => Array.from(new Set(articles.flatMap((article) => article.tags))).sort((a, b) => a.localeCompare(b, 'ko-KR')),
    [articles]
  )

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return articles.filter((article) => {
      const matchSearch = keyword.length === 0
        || article.title.toLowerCase().includes(keyword)
        || article.summary.toLowerCase().includes(keyword)
        || article.tags.some((tag) => tag.toLowerCase().includes(keyword))
        || article.docNo.toLowerCase().includes(keyword)

      const matchCategory = activeCategory === '전체' || article.category === activeCategory
      const matchTags = activeTags.length === 0 || activeTags.every((tag) => article.tags.includes(tag))
      return matchSearch && matchCategory && matchTags
    })
  }, [activeCategory, activeTags, articles, search])

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag])
  }

  const categoryCount = (category: KBCategory) => articles.filter((article) => article.category === category).length

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader
        title="지식 베이스"
        subtitle={`업무와 연결된 기술 문서 ${filtered.length}건`}
        action={{ label: '문서 등록', onClick: () => navigate('/knowledge-base/new'), icon: <PlusIcon /> }}
      />

      <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-3 sm:px-4 py-3 space-y-3">
        <div className="relative min-w-[220px]">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"><SearchIcon /></span>
          <input
            type="text"
            placeholder="제목, 요약, 태그, 문서번호 검색"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full h-8 pl-8 pr-3 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 bg-gray-50"
          />
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {(['전체', ...CATEGORIES] as const).map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`h-7 px-3 rounded-lg text-[12px] font-medium transition-colors ${
                activeCategory === category
                  ? 'bg-brand text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {category}
              {category !== '전체' && (
                <span className="ml-1 text-[10px] opacity-70">{categoryCount(category)}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-gray-400 font-medium mr-1">태그</span>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`h-6 px-2 rounded-md text-[11px] font-medium transition-colors ${
                activeTags.includes(tag)
                  ? 'bg-brand/10 text-brand border border-brand/20'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {tag}
            </button>
          ))}
          {activeTags.length > 0 && (
            <button
              onClick={() => setActiveTags([])}
              className="h-6 px-2 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {isPending ? (
        <LoadingState title="지식 베이스를 불러오는 중입니다" description="문서 목록과 태그 정보를 조회하고 있습니다." />
      ) : isError ? (
        <ErrorState
          title="지식 베이스를 불러오지 못했습니다"
          description="잠시 후 다시 시도해주세요."
          actionLabel="다시 시도"
          onAction={() => { void refetch() }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="검색 결과가 없습니다"
          description="검색어나 필터 조건을 조정해보세요."
          actionLabel="필터 초기화"
          onAction={() => {
            setSearch('')
            setActiveCategory('전체')
            setActiveTags([])
          }}
        />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((article) => (
            <KBCard
              key={article.id}
              article={article}
              onClick={() => navigate(`/knowledge-base/${article.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function KBCard({ article, onClick }: { article: KBArticle; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] p-4 cursor-pointer hover:shadow-[0_4px_16px_rgba(30,58,138,0.1)] hover:border-brand/20 transition-all group flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold ${CATEGORY_STYLES[article.category]}`}>
          {article.category}
        </span>
        <span className="font-mono text-[10px] text-gray-300">{article.docNo}</span>
      </div>

      <h3 className="text-[14px] font-bold text-gray-800 leading-snug group-hover:text-brand transition-colors line-clamp-2">
        {article.title}
      </h3>

      <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-2 flex-1">
        {article.summary}
      </p>

      <div className="flex flex-wrap gap-1">
        {article.tags.map((tag) => (
          <span key={tag} className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-medium">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-gray-50">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-brand/10 text-brand text-[9px] font-bold flex items-center justify-center">
            {article.author[0] ?? 'U'}
          </div>
          <span className="text-[11px] text-gray-400">{article.author}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-300">
          <span>{article.updatedAt}</span>
          <span>조회 {article.views}</span>
        </div>
      </div>
    </div>
  )
}
