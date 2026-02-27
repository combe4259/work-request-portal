import { useMemo } from 'react'
import { EmptyState } from '@/components/common/AsyncState'
import ShowMoreButton from '@/components/common/ShowMoreButton'
import { useExpandableList } from '@/hooks/useExpandableList'
import type { AttachmentItem } from '@/features/attachment/service'
import type { TestScenarioDetail } from '@/features/test-scenario/service'

export interface ParsedScenarioStep {
  action: string
  expected: string
  result: StepResult
}

export type StepResult = 'pass' | 'fail' | null

export interface TestScenarioRelatedDocItem {
  docNo: string
  title: string
  route: string | null
}

interface TestScenarioDetailBodyProps {
  data: TestScenarioDetail
  relatedDocs: TestScenarioRelatedDocItem[]
  attachments: AttachmentItem[]
  attachmentsPending?: boolean
  stepResults?: StepResult[]
  executionUpdating?: boolean
  isExecutable?: boolean
  relatedDocsLimit?: number
  onStepResultChange?: (index: number, result: StepResult) => void
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

export function parseScenarioSteps(raw: string): ParsedScenarioStep[] {
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map((item) => {
        if (typeof item === 'string') {
          const text = item.trim()
          if (!text) {
            return null
          }
          return { action: text, expected: '', result: null }
        }

        if (typeof item === 'object' && item !== null) {
          const action = String((item as { action?: unknown }).action ?? '').trim()
          const expected = String((item as { expected?: unknown }).expected ?? '').trim()
          const rawResult = String((item as { result?: unknown }).result ?? '').toLowerCase()
          const result: StepResult = rawResult === 'pass' ? 'pass' : rawResult === 'fail' ? 'fail' : null
          if (!action && !expected) {
            return null
          }
          return { action, expected, result }
        }

        return null
      })
      .filter((step): step is ParsedScenarioStep => step !== null)
  } catch {
    return []
  }
}

export default function TestScenarioDetailBody({
  data,
  relatedDocs,
  attachments,
  attachmentsPending = false,
  stepResults,
  executionUpdating = false,
  isExecutable,
  relatedDocsLimit = 5,
  onStepResultChange,
  onNavigateToRef,
  className = '',
}: TestScenarioDetailBodyProps) {
  const parsedSteps = useMemo(() => parseScenarioSteps(data.steps ?? '[]'), [data.steps])
  const effectiveStepResults = useMemo(
    () => (stepResults && stepResults.length === parsedSteps.length ? stepResults : parsedSteps.map((step) => step.result)),
    [parsedSteps, stepResults]
  )

  const executedCount = effectiveStepResults.filter((result) => result !== null).length
  const passCount = effectiveStepResults.filter((result) => result === 'pass').length
  const failCount = effectiveStepResults.filter((result) => result === 'fail').length
  const progressPct = parsedSteps.length === 0 ? 0 : Math.round((executedCount / parsedSteps.length) * 100)

  const canExecute = isExecutable ?? (data.status === '실행중' || data.status === '통과' || data.status === '실패')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadline = new Date(data.deadline)
  const diff = Number.isNaN(deadline.getTime())
    ? 0
    : Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  const visibleRelatedDocs = useExpandableList(relatedDocs, relatedDocsLimit)

  return (
    <div className={`space-y-4 ${className}`.trim()}>
      <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-4">
        <div className="grid grid-cols-4 gap-4">
          <MetaItem label="담당자" value={data.assignee} />
          <MetaItem label="연관 문서">
            <div className="flex flex-wrap gap-1 mt-0.5">
              {relatedDocs.length === 0 ? (
                <span className="text-[11px] text-gray-400">-</span>
              ) : (
                relatedDocs.map((doc) => {
                  const prefix = doc.docNo.split('-')[0]
                  return (
                    <span
                      key={`${doc.docNo}-${doc.route ?? 'none'}`}
                      className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${DOC_PREFIX_STYLE[prefix] ?? 'bg-gray-100 text-gray-500'}`}
                    >
                      {doc.docNo}
                    </span>
                  )
                })
              )}
            </div>
          </MetaItem>
          <MetaItem label="마감일">
            <p className={`text-[13px] font-medium mt-0.5 ${
              diff < 0 ? 'text-red-500' : diff <= 3 ? 'text-orange-500' : 'text-gray-700'
            }`}>
              {data.deadline}
              {data.status !== '통과' && data.status !== '실패'
                ? diff >= 0 ? ` (D-${diff})` : ` (D+${Math.abs(diff)})`
                : ''}
            </p>
          </MetaItem>
          <MetaItem label="등록일" value={data.createdAt || '-'} />
        </div>
      </div>

      <Section title="사전 조건">
        <div className="bg-gray-50 rounded-lg px-4 py-3 text-[13px] text-gray-600 leading-relaxed whitespace-pre-line border border-gray-100">
          {data.precondition || '-'}
        </div>
      </Section>

      <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12px] font-semibold text-gray-700">테스트 단계</p>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span className="text-emerald-600 font-semibold">{passCount}통과</span>
            <span>·</span>
            <span className="text-red-500 font-semibold">{failCount}실패</span>
            <span>·</span>
            <span>{executedCount}/{parsedSteps.length} 실행</span>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-400">진행률</span>
            <span className="text-[10px] font-semibold text-gray-600">{progressPct}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {parsedSteps.length === 0 ? (
          <EmptyState title="테스트 단계가 없습니다" description="등록된 단계 정보가 없습니다." />
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[28px_1fr_1fr_96px] gap-3 pb-1 border-b border-gray-100">
              <div />
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">액션</p>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">기대 결과</p>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-center">결과</p>
            </div>

            {parsedSteps.map((step, idx) => {
              const result = effectiveStepResults[idx]
              const rowBg =
                result === 'pass' ? 'bg-emerald-50/60' :
                  result === 'fail' ? 'bg-red-50/60' :
                    'bg-white'

              return (
                <div
                  key={`${step.action}-${idx}`}
                  className={`grid grid-cols-[28px_1fr_1fr_96px] gap-3 items-start px-2 py-2 rounded-lg transition-colors ${rowBg}`}
                >
                  <span className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    result === 'pass' ? 'bg-emerald-100 text-emerald-700' :
                      result === 'fail' ? 'bg-red-100 text-red-500' :
                        'bg-gray-100 text-gray-400'
                  }`}>
                    {idx + 1}
                  </span>

                  <p className="text-[12px] text-gray-700 leading-snug">{step.action}</p>
                  <p className="text-[12px] text-gray-500 leading-snug">{step.expected || '-'}</p>

                  <div className="flex items-center gap-1.5 justify-center">
                    <button
                      disabled={!canExecute || executionUpdating || !onStepResultChange}
                      onClick={() => {
                        onStepResultChange?.(idx, 'pass')
                      }}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                        result === 'pass'
                          ? 'bg-emerald-500 text-white'
                          : canExecute
                            ? 'bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            : 'bg-gray-50 border border-gray-100 text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      <CheckIcon />
                      Pass
                    </button>
                    <button
                      disabled={!canExecute || executionUpdating || !onStepResultChange}
                      onClick={() => {
                        onStepResultChange?.(idx, 'fail')
                      }}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                        result === 'fail'
                          ? 'bg-red-500 text-white'
                          : canExecute
                            ? 'bg-white border border-red-200 text-red-500 hover:bg-red-50'
                            : 'bg-gray-50 border border-gray-100 text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      <XIcon />
                      Fail
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!canExecute && (
          <p className="mt-3 text-[11px] text-gray-400 text-center">
            상태가 <strong>실행중 / 통과 / 실패</strong>일 때 결과를 입력할 수 있습니다.
          </p>
        )}
      </div>

      <Section title="연관 문서">
        {relatedDocs.length === 0 ? (
          <p className="text-[12px] text-gray-400">연관 문서가 없습니다.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {visibleRelatedDocs.visibleItems.map((doc) => {
                const prefix = doc.docNo.split('-')[0]
                return (
                  <button
                    key={`${doc.docNo}-${doc.route ?? 'none'}`}
                    onClick={() => {
                      if (!doc.route || !onNavigateToRef) {
                        return
                      }
                      onNavigateToRef(doc.route)
                    }}
                    disabled={!doc.route || !onNavigateToRef}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:border-brand/40 hover:bg-blue-50/30 transition-colors group disabled:opacity-70 disabled:cursor-default"
                  >
                    <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${DOC_PREFIX_STYLE[prefix] ?? 'bg-gray-100 text-gray-500'}`}>
                      {doc.docNo}
                    </span>
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
          </>
        )}
      </Section>

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
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M2 5L4 7.5L8 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function XIcon() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M2.5 2.5L7.5 7.5M7.5 2.5L2.5 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
}

function FileIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M3 1H8L11 4V12H3V1Z" stroke="#9CA3AF" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M8 1V4H11" stroke="#9CA3AF" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}
