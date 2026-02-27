import { useMemo } from 'react'
import { EmptyState } from '@/components/common/AsyncState'
import ShowMoreButton from '@/components/common/ShowMoreButton'
import { useExpandableList } from '@/hooks/useExpandableList'
import type { AttachmentItem } from '@/features/attachment/service'
import type { TechTaskDetail, TechTaskPrLink, TechTaskRelatedRef } from '@/features/tech-task/service'

export type TechTaskDodItem = {
  id: number
  text: string
  done: boolean
}

interface TechTaskDetailBodyProps {
  data: TechTaskDetail
  relatedDocs: TechTaskRelatedRef[]
  prLinks: TechTaskPrLink[]
  attachments: AttachmentItem[]
  attachmentsPending?: boolean
  dodItems?: TechTaskDodItem[]
  dodSaving?: boolean
  relatedDocsLimit?: number
  onToggleDod?: (itemId: number) => void
  onNavigateToRef?: (route: string) => void
  className?: string
}

export function parseDefinitionOfDone(raw: string | undefined): TechTaskDodItem[] {
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map((item, index) => {
        if (typeof item === 'string') {
          return { id: index + 1, text: item, done: false }
        }

        if (typeof item === 'object' && item !== null && 'text' in item) {
          const text = String((item as { text: unknown }).text ?? '').trim()
          const done = Boolean((item as { done?: unknown }).done)
          if (text.length === 0) {
            return null
          }
          return { id: index + 1, text, done }
        }

        return null
      })
      .filter((item): item is TechTaskDodItem => item !== null)
  } catch {
    return []
  }
}

function getRefRoute(refType: string, refId: number): string | null {
  switch (refType) {
    case 'WORK_REQUEST':
      return `/work-requests/${refId}`
    case 'TECH_TASK':
      return `/tech-tasks/${refId}`
    default:
      return null
  }
}

export default function TechTaskDetailBody({
  data,
  relatedDocs,
  prLinks,
  attachments,
  attachmentsPending = false,
  dodItems,
  dodSaving = false,
  relatedDocsLimit = 5,
  onToggleDod,
  onNavigateToRef,
  className = '',
}: TechTaskDetailBodyProps) {
  const dod = useMemo(() => dodItems ?? parseDefinitionOfDone(data.definitionOfDone), [data.definitionOfDone, dodItems])
  const doneCnt = dod.filter((item) => item.done).length

  const visibleRelatedDocs = useExpandableList(relatedDocs, relatedDocsLimit)

  return (
    <div className={`space-y-4 ${className}`.trim()}>
      <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-4">
        <div className="grid grid-cols-4 gap-4">
          <MetaItem label="등록자" value={data.registrant} />
          <MetaItem label="담당자" value={data.assignee} />
          <MetaItem label="마감일">
            <DeadlineText date={data.deadline} />
          </MetaItem>
          <MetaItem label="등록일" value={data.createdAt} />
        </div>
      </div>

      <Section title="문제 현황">
        <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{data.currentIssue}</p>
      </Section>

      <Section title="개선 방안">
        <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{data.solution}</p>
      </Section>

      <Section title={`완료 기준 (${doneCnt}/${dod.length})`}>
        <div className="mb-3">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-300"
              style={{ width: `${dod.length ? (doneCnt / dod.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {dod.length === 0 ? (
          <EmptyState title="완료 기준이 없습니다" description="등록 시 입력된 완료 기준이 없어요." />
        ) : (
          <div className="space-y-2">
            {dod.map((item) => (
              <label key={item.id} className="flex items-start gap-2.5 group">
                <div className="relative mt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => {
                      onToggleDod?.(item.id)
                    }}
                    className="sr-only"
                    disabled={dodSaving || !onToggleDod}
                  />
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                      item.done ? 'bg-brand border-brand' : 'border-gray-300 group-hover:border-brand/50'
                    }`}
                  >
                    {item.done && <CheckIcon />}
                  </div>
                </div>
                <span
                  className={`text-[13px] leading-snug transition-colors ${
                    item.done ? 'text-gray-400 line-through' : 'text-gray-700'
                  }`}
                >
                  {item.text}
                </span>
              </label>
            ))}
          </div>
        )}
      </Section>

      <Section title="PR / 브랜치">
        {prLinks.length === 0 ? (
          <p className="text-[12px] text-gray-400">연결된 PR이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {prLinks.map((pr) => (
              <a
                key={pr.id}
                href={pr.prUrl ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100 hover:border-brand/30 hover:bg-blue-50/30 transition-colors group"
              >
                <GitBranchIcon />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-mono text-gray-600 truncate group-hover:text-brand transition-colors">
                    {pr.branchName}
                  </p>
                </div>
                <span className="text-[11px] text-brand font-semibold flex-shrink-0">
                  {pr.prNo ? `#${pr.prNo}` : '-'}
                </span>
                <ExternalLinkIcon />
              </a>
            ))}
          </div>
        )}
      </Section>

      {relatedDocs.length > 0 && (
        <Section title="연관 문서">
          <div className="flex flex-wrap gap-2">
            {visibleRelatedDocs.visibleItems.map((item) => {
              const route = getRefRoute(item.refType, item.refId)
              return (
                <button
                  key={`${item.refType}-${item.refId}`}
                  onClick={() => {
                    if (!route || !onNavigateToRef) {
                      return
                    }
                    onNavigateToRef(route)
                  }}
                  disabled={!route || !onNavigateToRef}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:border-brand/40 hover:bg-blue-50/30 transition-colors group disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="font-mono text-[11px] text-gray-400">{item.refNo}</span>
                  <span className="text-[12px] text-gray-600 group-hover:text-brand transition-colors">{item.title ?? '제목 없음'}</span>
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
        </Section>
      )}

      <Section title="첨부파일">
        {attachmentsPending ? (
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
    return <p className="text-[13px] font-medium text-gray-400">-</p>
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.ceil((new Date(date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  let cls = 'text-gray-700'
  if (diff < 0) cls = 'text-red-500'
  else if (diff <= 3) cls = 'text-orange-500'

  return <p className={`text-[13px] font-medium ${cls}`}>{date} {diff >= 0 ? `(D-${diff})` : `(D+${Math.abs(diff)})`}</p>
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

function CheckIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
      <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function GitBranchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="4" cy="3" r="1.5" stroke="#9CA3AF" strokeWidth="1.2" />
      <circle cx="4" cy="11" r="1.5" stroke="#9CA3AF" strokeWidth="1.2" />
      <circle cx="10" cy="5" r="1.5" stroke="#9CA3AF" strokeWidth="1.2" />
      <path d="M4 4.5V9.5" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M4 4.5C4 4.5 4 6.5 10 6.5V6.5" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <path d="M4.5 2H2v7.5h7.5V7M6.5 1.5H10m0 0V5M10 1.5L5.5 6" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
