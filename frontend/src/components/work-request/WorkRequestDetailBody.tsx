import ShowMoreButton from '@/components/common/ShowMoreButton'
import { useExpandableList } from '@/hooks/useExpandableList'
import type { AttachmentItem } from '@/features/attachment/service'
import type { WorkRequestDetail } from '@/types/work-request'

export interface WorkRequestRelatedRef {
  refType: string
  refId: number
  refNo: string
  title: string | null
}

interface WorkRequestDetailBodyProps {
  data: WorkRequestDetail
  relatedRefs: WorkRequestRelatedRef[]
  attachments: AttachmentItem[]
  attachmentsPending?: boolean
  relatedRefsLimit?: number
  onNavigateToRef?: (route: string) => void
  className?: string
}

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

export default function WorkRequestDetailBody({
  data,
  relatedRefs,
  attachments,
  attachmentsPending = false,
  relatedRefsLimit = 5,
  onNavigateToRef,
  className = '',
}: WorkRequestDetailBodyProps) {
  const visibleRelatedRefs = useExpandableList(relatedRefs, relatedRefsLimit)

  return (
    <div className={`space-y-4 ${className}`.trim()}>
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
                    if (!route || !onNavigateToRef) {
                      return
                    }
                    onNavigateToRef(route)
                  }}
                  disabled={!route || !onNavigateToRef}
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
