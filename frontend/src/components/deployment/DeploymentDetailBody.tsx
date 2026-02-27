import ShowMoreButton from '@/components/common/ShowMoreButton'
import { useExpandableList } from '@/hooks/useExpandableList'
import type { AttachmentItem } from '@/features/attachment/service'
import type { DeploymentDetail, DeploymentRelatedRef, DeploymentStep } from '@/features/deployment/service'

interface DeploymentDetailBodyProps {
  data: DeploymentDetail
  includedDocs: DeploymentRelatedRef[]
  steps: DeploymentStep[]
  stepsPending?: boolean
  savingStepId?: number | null
  attachments: AttachmentItem[]
  attachmentsPending?: boolean
  relatedDocsLimit?: number
  onToggleStep?: (stepId: number) => void
  onNavigateToRef?: (route: string) => void
  className?: string
}

const DOC_PREFIX_STYLE: Record<string, string> = {
  WR: 'bg-blue-50 text-blue-500',
  TK: 'bg-slate-100 text-slate-500',
  TS: 'bg-emerald-50 text-emerald-600',
  DF: 'bg-red-50 text-red-400',
  DP: 'bg-orange-50 text-orange-500',
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

export default function DeploymentDetailBody({
  data,
  includedDocs,
  steps,
  stepsPending = false,
  savingStepId = null,
  attachments,
  attachmentsPending = false,
  relatedDocsLimit = 5,
  onToggleStep,
  onNavigateToRef,
  className = '',
}: DeploymentDetailBodyProps) {
  const visibleIncludedDocs = useExpandableList(includedDocs, relatedDocsLimit)

  const doneCnt = steps.filter((step) => step.isDone).length
  const progress = steps.length === 0 ? 0 : Math.round((doneCnt / steps.length) * 100)

  const isProd = data.env === '운영'
  const isFailed = data.status === '실패' || data.status === '롤백'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deployDate = new Date(data.deployDate)
  const diff = Number.isNaN(deployDate.getTime())
    ? 0
    : Math.ceil((deployDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className={`space-y-4 ${className}`.trim()}>
      <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-4">
        <div className="grid grid-cols-4 gap-4">
          <MetaItem label="버전">
            <span className="font-mono text-[13px] text-gray-700 font-semibold bg-gray-50 px-2 py-0.5 rounded inline-block mt-0.5">
              {data.version}
            </span>
          </MetaItem>
          <MetaItem label="배포 담당자" value={data.manager} />
          <MetaItem label="배포 예정일">
            <p className={`text-[13px] font-medium mt-0.5 ${
              diff < 0 ? 'text-red-500' : diff <= 3 ? 'text-amber-500' : 'text-gray-700'
            }`}>
              {data.deployDate}
              {data.status === '대기' || data.status === '진행중'
                ? diff >= 0 ? ` (D-${diff})` : ` (D+${Math.abs(diff)})`
                : ''}
            </p>
          </MetaItem>
          <MetaItem label="등록일" value={data.createdAt || '-'} />
        </div>
      </div>

      {data.overview ? (
        <Section title="배포 개요">
          <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap">{data.overview}</p>
        </Section>
      ) : null}

      <Section title={`포함 항목 (${includedDocs.length}건)`}>
        {includedDocs.length === 0 ? (
          <p className="text-[12px] text-gray-400">포함 항목이 없습니다.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {visibleIncludedDocs.visibleItems.map((doc) => {
                const prefix = doc.refNo.split('-')[0]
                const route = getRefRoute(doc.refType, doc.refId)
                return (
                  <button
                    key={`${doc.refNo}-${doc.refType}-${doc.refId}`}
                    onClick={() => {
                      if (!route || !onNavigateToRef) {
                        return
                      }
                      onNavigateToRef(route)
                    }}
                    disabled={!route || !onNavigateToRef}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg hover:border-brand/30 hover:bg-blue-50/30 transition-colors group disabled:opacity-70 disabled:cursor-default"
                  >
                    <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${DOC_PREFIX_STYLE[prefix] ?? 'bg-gray-100 text-gray-500'}`}>{doc.refNo}</span>
                    <span className="text-[12px] text-gray-600 group-hover:text-brand transition-colors">{doc.title ?? doc.refNo}</span>
                  </button>
                )
              })}
            </div>
            <ShowMoreButton
              expanded={visibleIncludedDocs.expanded}
              hiddenCount={visibleIncludedDocs.hiddenCount}
              onToggle={visibleIncludedDocs.toggle}
              className="mt-3"
            />
          </>
        )}
      </Section>

      <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12px] font-semibold text-gray-700">
            배포 절차
            <span className="ml-2 font-normal text-gray-400">{doneCnt}/{steps.length} 완료</span>
          </p>
          <span className={`text-[12px] font-semibold ${progress === 100 ? 'text-emerald-600' : 'text-brand'}`}>
            {progress}%
          </span>
        </div>

        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isFailed ? 'bg-red-400' : progress === 100 ? 'bg-emerald-400' : 'bg-brand'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {stepsPending ? (
          <p className="text-[12px] text-gray-400">불러오는 중...</p>
        ) : steps.length === 0 ? (
          <p className="text-[12px] text-gray-400">등록된 절차가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {steps.map((step, idx) => {
              const isNext = !step.isDone && steps.slice(0, idx).every((item) => item.isDone)
              return (
                <label
                  key={step.id}
                  className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors group ${
                    step.isDone
                      ? 'bg-emerald-50/50'
                      : isNext
                        ? 'bg-brand/5 border border-brand/10'
                        : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="relative mt-0.5 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={step.isDone}
                      onChange={() => {
                        onToggleStep?.(step.id)
                      }}
                      className="sr-only"
                      disabled={savingStepId === step.id || !onToggleStep}
                    />
                    <div
                      className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-colors ${
                        step.isDone
                          ? 'bg-emerald-500 border-emerald-500'
                          : isNext
                            ? 'border-brand/40 group-hover:border-brand'
                            : 'border-gray-300 group-hover:border-gray-400'
                      }`}
                      style={{ width: '18px', height: '18px' }}
                    >
                      {step.isDone && <CheckIcon />}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-1">
                    <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${
                      step.isDone
                        ? 'bg-emerald-100 text-emerald-600'
                        : isNext
                          ? 'bg-brand/10 text-brand'
                          : 'bg-gray-100 text-gray-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className={`text-[13px] leading-snug transition-colors ${
                      step.isDone
                        ? 'text-gray-400 line-through'
                        : isNext
                          ? 'text-gray-800 font-medium'
                          : 'text-gray-600'
                    }`}>
                      {step.content}
                    </span>
                    {isNext && (
                      <span className="ml-1 text-[10px] text-brand font-semibold bg-brand/10 px-1.5 py-0.5 rounded flex-shrink-0">
                        진행중
                      </span>
                    )}
                  </div>
                </label>
              )
            })}
          </div>
        )}
      </div>

      <div className={`bg-white rounded-xl border shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-4 ${isProd ? 'border-red-100' : 'border-blue-50'}`}>
        <div className="flex items-center gap-2 mb-3">
          <p className="text-[12px] font-semibold text-gray-700">롤백 계획</p>
          {isProd && (
            <span className="text-[10px] text-red-500 font-semibold bg-red-50 px-1.5 py-0.5 rounded">운영 필수</span>
          )}
        </div>
        <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap font-mono text-[12px]">
          {data.rollbackPlan || '-'}
        </p>
      </div>

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

function formatFileSize(bytes: number | null): string {
  if (bytes == null || bytes < 0) return '-'
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function CheckIcon() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M2 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function FileIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M3 1H8L11 4V12H3V1Z" stroke="#9CA3AF" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M8 1V4H11" stroke="#9CA3AF" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}
