import { useMemo } from 'react'
import type { AttachmentItem } from '@/features/attachment/service'
import type { DefectDetail } from '@/features/defect/service'

interface DefectDetailBodyProps {
  data: DefectDetail
  attachments: AttachmentItem[]
  attachmentsPending?: boolean
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

function getRefRoute(docNo: string): string | null {
  const [prefix, idText] = docNo.split('-')
  const refId = Number(idText)
  if (!prefix || !Number.isInteger(refId) || refId <= 0) {
    return null
  }

  switch (prefix) {
    case 'WR':
      return `/work-requests/${refId}`
    case 'TK':
      return `/tech-tasks/${refId}`
    case 'TS':
      return `/test-scenarios/${refId}`
    case 'DF':
      return `/defects/${refId}`
    case 'DP':
      return `/deployments/${refId}`
    default:
      return null
  }
}

export default function DefectDetailBody({ data, attachments, attachmentsPending = false, onNavigateToRef, className = '' }: DefectDetailBodyProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadline = new Date(data.deadline)
  const diff = Number.isNaN(deadline.getTime())
    ? 0
    : Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  const relatedDoc = useMemo(() => {
    if (!data.relatedDoc || data.relatedDoc === '-') {
      return null
    }

    return {
      docNo: data.relatedDoc,
      title: data.relatedDoc,
      route: getRefRoute(data.relatedDoc),
    }
  }, [data.relatedDoc])

  return (
    <div className={`space-y-4 ${className}`.trim()}>
      <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-4">
        <div className="grid grid-cols-4 gap-4">
          <MetaItem label="발견자" value={data.reporter} />
          <MetaItem label="담당자" value={data.assignee} />
          <MetaItem label="수정 마감일">
            <p className={`text-[13px] font-medium mt-0.5 ${
              diff < 0 ? 'text-red-500' : diff <= 3 ? 'text-orange-500' : 'text-gray-700'
            }`}>
              {data.deadline}
              {data.status !== '완료' && data.status !== '재현불가'
                ? diff >= 0 ? ` (D-${diff})` : ` (D+${Math.abs(diff)})`
                : ''}
            </p>
          </MetaItem>
          <MetaItem label="등록일" value={data.createdAt || '-'} />
        </div>
      </div>

      <Section title="발생 환경">
        <div className="flex items-center gap-2">
          <DeviceIcon />
          <span className="text-[13px] text-gray-700 font-mono">{data.environment || '-'}</span>
        </div>
      </Section>

      <Section title="재현 경로">
        {data.reproductionSteps.length === 0 ? (
          <p className="text-[12px] text-gray-400">등록된 재현 경로가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {data.reproductionSteps.map((step, idx) => (
              <div key={`${step}-${idx}`} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-red-50 text-red-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="text-[13px] text-gray-600 leading-snug">{step}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-4">
          <div className="flex items-center gap-1.5 mb-3">
            <ExpectedIcon />
            <p className="text-[12px] font-semibold text-emerald-700">기대 동작</p>
          </div>
          <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap">{data.expectedBehavior || '-'}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-100 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-4">
          <div className="flex items-center gap-1.5 mb-3">
            <ActualIcon />
            <p className="text-[12px] font-semibold text-red-500">실제 동작</p>
          </div>
          <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap">{data.actualBehavior || '-'}</p>
        </div>
      </div>

      {relatedDoc && (
        <Section title="연관 문서">
          <button
            onClick={() => {
              if (!relatedDoc.route || !onNavigateToRef) {
                return
              }
              onNavigateToRef(relatedDoc.route)
            }}
            disabled={!relatedDoc.route || !onNavigateToRef}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:border-brand/40 hover:bg-blue-50/30 transition-colors group disabled:opacity-70 disabled:cursor-default"
          >
            <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${DOC_PREFIX_STYLE[relatedDoc.docNo.split('-')[0]] ?? 'bg-gray-100 text-gray-500'}`}>
              {relatedDoc.docNo}
            </span>
            <span className="text-[12px] text-gray-600 group-hover:text-brand transition-colors">{relatedDoc.title}</span>
          </button>
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

function formatFileSize(bytes: number | null): string {
  if (bytes == null || bytes < 0) return '-'
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function DeviceIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><rect x="4" y="1" width="6" height="12" rx="1.5" stroke="#9CA3AF" strokeWidth="1.2" /><circle cx="7" cy="11" r="0.7" fill="#9CA3AF" /></svg>
}

function ExpectedIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><circle cx="6.5" cy="6.5" r="5" stroke="#059669" strokeWidth="1.2" /><path d="M4 6.5L6 8.5L9.5 4.5" stroke="#059669" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function ActualIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><circle cx="6.5" cy="6.5" r="5" stroke="#ef4444" strokeWidth="1.2" /><path d="M4 4L9 9M9 4L4 9" stroke="#ef4444" strokeWidth="1.3" strokeLinecap="round" /></svg>
}

function FileIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M3 1H8L11 4V12H3V1Z" stroke="#9CA3AF" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M8 1V4H11" stroke="#9CA3AF" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}
