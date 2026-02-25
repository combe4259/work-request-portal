import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ResourceCategory } from '@/types/resource'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { PlusIcon, SearchIcon } from '@/components/common/Icons'
import { FilterSelect } from '@/components/common/TableControls'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState'
import { useDeleteResourceMutation } from '@/features/resource/mutations'
import { useResourcesQuery } from '@/features/resource/queries'

const CATEGORY_OPTIONS = ['전체', 'Figma', 'GitHub', 'Confluence', 'Notion', '문서', '기타']

const CATEGORY_STYLE: Record<ResourceCategory, { bg: string; text: string; icon: React.ReactNode }> = {
  Figma: { bg: 'bg-pink-50', text: 'text-pink-600', icon: <FigmaIcon /> },
  GitHub: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <GithubIcon /> },
  Confluence: { bg: 'bg-blue-50', text: 'text-blue-600', icon: <ConfluenceIcon /> },
  Notion: { bg: 'bg-slate-100', text: 'text-slate-700', icon: <NotionIcon /> },
  문서: { bg: 'bg-indigo-50', text: 'text-indigo-600', icon: <DocFileIcon /> },
  기타: { bg: 'bg-gray-100', text: 'text-gray-500', icon: <LinkIcon /> },
}

function hostname(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

export default function ResourcesPage() {
  const navigate = useNavigate()
  const { data, isPending, isError, refetch } = useResourcesQuery()
  const deleteResource = useDeleteResourceMutation()

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('전체')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)

  const resources = data ?? []

  const filtered = useMemo(() => {
    return resources.filter((resource) => {
      const keyword = search.trim().toLowerCase()
      const matchSearch = keyword.length === 0
        || resource.title.toLowerCase().includes(keyword)
        || resource.description.toLowerCase().includes(keyword)
      const matchCategory = filterCategory === '전체' || resource.category === filterCategory
      return matchSearch && matchCategory
    })
  }, [filterCategory, resources, search])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900">공유 리소스</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">총 {filtered.length}개</p>
        </div>
        <button
          onClick={() => navigate('/resources/new')}
          className="flex items-center gap-1.5 h-9 px-4 bg-brand text-white text-[13px] font-semibold rounded-lg hover:bg-brand-hover transition-colors"
        >
          <PlusIcon />
          리소스 등록
        </button>
      </div>

      <div className="flex items-center gap-2 mb-5">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <SearchIcon />
          </span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="리소스 검색"
            className="h-8 pl-8 pr-3 text-[12px] border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-brand focus:bg-white transition-colors w-52"
          />
        </div>
        <FilterSelect value={filterCategory} onChange={setFilterCategory} options={CATEGORY_OPTIONS} placeholder="카테고리" />
      </div>

      {isPending ? (
        <LoadingState title="공유 리소스를 불러오는 중입니다" description="최신 등록 목록을 조회하고 있습니다." />
      ) : isError ? (
        <ErrorState
          title="공유 리소스를 불러오지 못했습니다"
          description="잠시 후 다시 시도해주세요."
          actionLabel="다시 시도"
          onAction={() => {
            void refetch()
          }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="검색 결과가 없습니다" description="검색어나 필터 조건을 변경해보세요." />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((resource) => {
            const style = CATEGORY_STYLE[resource.category]
            return (
              <div
                key={resource.id}
                className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] p-5 flex flex-col group relative"
              >
                <button
                  onClick={(event) => {
                    event.stopPropagation()
                    navigate(`/resources/${resource.id}/edit`)
                  }}
                  className="absolute top-4 right-4 w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-white hover:text-gray-600 hover:border-gray-300 transition-colors opacity-0 group-hover:opacity-100 bg-white z-10"
                  title="수정"
                >
                  <EditIcon />
                </button>
                <button
                  onClick={(event) => {
                    event.stopPropagation()
                    setDeleteTarget({ id: resource.id, title: resource.title })
                  }}
                  className="absolute top-4 right-12 w-7 h-7 rounded-lg border border-red-200 flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 bg-white z-10"
                  title="삭제"
                >
                  <TrashIcon />
                </button>

                <button
                  onClick={() => window.open(resource.url, '_blank', 'noopener,noreferrer')}
                  className="flex flex-col flex-1 text-left hover:cursor-pointer"
                >
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${style.bg} ${style.text} w-fit mb-3`}>
                    {style.icon}
                    <span className="text-[11px] font-semibold">{resource.category}</span>
                  </div>

                  <h3 className="text-[14px] font-semibold text-gray-900 leading-snug line-clamp-2 mb-2 group-hover:text-brand transition-colors pr-8">
                    {resource.title}
                  </h3>

                  <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-2 flex-1">
                    {resource.description}
                  </p>

                  <div className="border-t border-gray-100 mt-4 pt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ExternalLinkIcon />
                      <span className="text-[11px] text-gray-400 truncate">{hostname(resource.url)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="w-4 h-4 rounded-full bg-brand/10 flex items-center justify-center text-brand text-[8px] font-bold">
                        {resource.registeredBy[0] ?? 'U'}
                      </div>
                      <span className="text-[11px] text-gray-400">{resource.registeredBy}</span>
                    </div>
                  </div>
                </button>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
          }
        }}
        title="리소스를 삭제할까요?"
        description={deleteTarget ? `'${deleteTarget.title}' 리소스를 삭제합니다.` : undefined}
        confirmText={deleteResource.isPending ? '삭제 중...' : '삭제'}
        cancelText="취소"
        destructive
        onConfirm={() => {
          if (!deleteTarget) return
          void deleteResource.mutateAsync(deleteTarget.id).then(() => {
            setDeleteTarget(null)
          })
        }}
      />
    </div>
  )
}

function FigmaIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 38 57" fill="none" aria-hidden="true">
      <path d="M19 28.5A9.5 9.5 0 1028.5 19 9.5 9.5 0 0019 28.5z" fill="currentColor" fillOpacity={0.8} />
      <path d="M9.5 57A9.5 9.5 0 009.5 38H19v9.5A9.5 9.5 0 019.5 57z" fill="currentColor" fillOpacity={0.6} />
      <path d="M9.5 28.5H19V9.5H9.5a9.5 9.5 0 000 19z" fill="currentColor" fillOpacity={0.6} />
      <path d="M9.5 9.5H19V0H9.5a9.5 9.5 0 000 19z" fill="currentColor" fillOpacity={0.9} />
      <path d="M19 0h9.5a9.5 9.5 0 010 19H19V0z" fill="currentColor" fillOpacity={0.7} />
    </svg>
  )
}

function GithubIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.2a6.8 6.8 0 00-2.15 13.25c.34.06.46-.15.46-.33v-1.27c-1.88.41-2.28-.8-2.28-.8-.3-.78-.74-.98-.74-.98-.6-.41.05-.4.05-.4.66.05 1 .67 1 .67.6 1 .1 1.02 1.5.78.05-.43.24-.72.43-.89-1.5-.17-3.08-.74-3.08-3.32 0-.74.27-1.34.7-1.82-.07-.17-.3-.85.07-1.78 0 0 .57-.18 1.87.7a6.6 6.6 0 013.4 0c1.3-.88 1.86-.7 1.86-.7.38.93.14 1.61.07 1.78.43.48.7 1.08.7 1.82 0 2.58-1.57 3.15-3.08 3.32.25.22.47.64.47 1.3v1.93c0 .18.12.39.47.33A6.8 6.8 0 008 1.2Z" fill="currentColor" />
    </svg>
  )
}

function ConfluenceIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.5 5.4c1.3 1.2 2.6 1.8 4 1.8 1.4 0 2.6-.6 3.8-1.8l1.2 1.4c-1.4 1.5-3 2.3-5 2.3-1.8 0-3.5-.7-5-2.2l1-1.5z" fill="currentColor" />
      <path d="M13.5 10.6c-1.3-1.2-2.6-1.8-4-1.8-1.4 0-2.6.6-3.8 1.8l-1.2-1.4c1.4-1.5 3-2.3 5-2.3 1.8 0 3.5.7 5 2.2l-1 1.5z" fill="currentColor" fillOpacity={0.7} />
    </svg>
  )
}

function NotionIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
      <path d="M5 5.2h1.7l2.6 4V5.2H11V11H9.4L6.8 7v4H5V5.2z" fill="currentColor" />
    </svg>
  )
}

function DocFileIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M4 1.8h4.2L11 4.6V12a.8.8 0 01-.8.8H4.8A.8.8 0 014 12V1.8z" stroke="currentColor" strokeWidth="1.1" />
      <path d="M8.2 1.8V4.6H11" stroke="currentColor" strokeWidth="1.1" />
      <line x1="5.4" y1="7" x2="9.6" y2="7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="5.4" y1="9" x2="9.6" y2="9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M5.5 8.5a3.5 3.5 0 005 0l2-2a3.536 3.536 0 00-5-5l-1 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M8.5 5.5a3.5 3.5 0 00-5 0l-2 2a3.536 3.536 0 005 5l1-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <path d="M4.5 2H2a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1V6.5M6.5 1H10m0 0v3.5M10 1L5 6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
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

function TrashIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M2.5 3.5h8M5 3.5V2.2a.7.7 0 01.7-.7h1.6a.7.7 0 01.7.7v1.3m-4.2 0l.4 6.2a.8.8 0 00.8.8h2.8a.8.8 0 00.8-.8l.4-6.2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
