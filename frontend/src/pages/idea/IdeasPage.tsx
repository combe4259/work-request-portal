import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CategoryBadge, IdeaStatusBadge } from '@/components/idea/Badges'
import { FilterSelect } from '@/components/common/TableControls'
import { PlusIcon, SearchIcon } from '@/components/common/Icons'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState'
import { useIdeasQuery } from '@/features/idea/queries'
import { useLikeIdeaMutation, useUnlikeIdeaMutation } from '@/features/idea/mutations'
import type { IdeaCategory, IdeaStatus } from '@/types/idea'

const CATEGORY_OPTIONS: string[] = ['전체', 'UX/UI', '기능', '인프라', '프로세스', '기타']
const STATUS_OPTIONS: string[] = ['전체', '제안됨', '검토중', '채택', '보류', '기각']
const SORT_OPTIONS: string[] = ['최신순', '좋아요순']
const PAGE_SIZE = 120

export default function IdeasPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('전체')
  const [filterStatus, setFilterStatus] = useState('전체')
  const [sort, setSort] = useState('최신순')
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const likeIdea = useLikeIdeaMutation()
  const unlikeIdea = useUnlikeIdeaMutation()

  const params = useMemo(
    () => ({
      search,
      filterCategory: filterCategory as IdeaCategory | '전체',
      filterStatus: filterStatus as IdeaStatus | '전체',
      sortKey: sort === '좋아요순' ? 'likes' : 'createdAt',
      sortDir: 'desc' as const,
      page: 1,
      pageSize: PAGE_SIZE,
    }),
    [filterCategory, filterStatus, search, sort],
  )

  const { data, isPending, isError, refetch } = useIdeasQuery(params)

  const toggleLike = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const liked = likedIds.has(id)

    if (liked) {
      await unlikeIdea.mutateAsync(id)
      setLikedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      return
    }

    await likeIdea.mutateAsync(id)
    setLikedIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  const isEmpty = !isPending && !isError && (data?.items.length ?? 0) === 0

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900">아이디어 보드</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">총 {data?.total ?? 0}건</p>
        </div>
        <button
          onClick={() => navigate('/ideas/new')}
          className="flex items-center gap-1.5 h-9 px-4 bg-brand text-white text-[13px] font-semibold rounded-lg hover:bg-brand-hover transition-colors"
        >
          <PlusIcon />
          아이디어 제안
        </button>
      </div>

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <SearchIcon />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="아이디어 검색"
            className="h-8 pl-8 pr-3 text-[12px] border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-brand focus:bg-white transition-colors w-52"
          />
        </div>
        <FilterSelect value={filterCategory} onChange={setFilterCategory} options={CATEGORY_OPTIONS} placeholder="카테고리" />
        <FilterSelect value={filterStatus} onChange={setFilterStatus} options={STATUS_OPTIONS} placeholder="상태" />
        <div className="flex items-center gap-1 ml-auto bg-gray-100 rounded-lg p-0.5">
          {SORT_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`h-7 px-3 text-[12px] rounded-md font-medium transition-colors ${
                sort === s ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isPending ? (
        <LoadingState title="아이디어 목록을 불러오는 중입니다" description="최신 제안과 좋아요 데이터를 가져오고 있습니다." />
      ) : isError ? (
        <ErrorState
          title="아이디어 목록을 불러오지 못했습니다"
          description="잠시 후 다시 시도해주세요."
          actionLabel="다시 시도"
          onAction={() => { void refetch() }}
        />
      ) : isEmpty ? (
        <EmptyState
          title="조건에 맞는 아이디어가 없습니다"
          description="검색어 또는 필터를 조정해보세요."
          actionLabel="아이디어 제안"
          onAction={() => navigate('/ideas/new')}
        />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {(data?.items ?? []).map((idea) => {
            const liked = likedIds.has(idea.id)
            const likeCount = idea.likes + (liked ? 1 : 0)
            return (
              <div
                key={idea.id}
                onClick={() => navigate(`/ideas/${idea.id}`)}
                className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] p-5 cursor-pointer hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(30,58,138,0.12)] transition-all duration-200 flex flex-col"
              >
                <div className="flex items-center gap-2 mb-3">
                  <CategoryBadge category={idea.category} />
                  <IdeaStatusBadge status={idea.status} />
                </div>

                <h3 className="text-[14px] font-semibold text-gray-900 leading-snug line-clamp-2 mb-2">
                  {idea.title}
                </h3>

                <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-3 flex-1">
                  {idea.content}
                </p>

                <div className="border-t border-gray-100 mt-4 pt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-brand/10 flex items-center justify-center text-brand text-[9px] font-bold">
                      {idea.proposer[0]}
                    </div>
                    <span className="text-[11px] text-gray-400">{idea.proposer}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => { void toggleLike(e, idea.id) }}
                      className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${
                        liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
                      }`}
                    >
                      <HeartIcon filled={liked} />
                      {likeCount}
                    </button>
                    <span className="flex items-center gap-1 text-[11px] text-gray-400">
                      <CommentIcon />
                      {idea.commentCount}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
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

function CommentIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M1.5 2h10a.5.5 0 01.5.5v7a.5.5 0 01-.5.5H3.5L1 12.5V2.5a.5.5 0 01.5-.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}
