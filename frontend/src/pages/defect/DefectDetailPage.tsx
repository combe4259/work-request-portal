import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DefectTypeBadge, SeverityBadge, DefectStatusBadge } from '@/components/defect/Badges'
import type { DefectStatus, Severity } from '@/types/defect'

// ── 샘플 상세 데이터 ──────────────────────────────────
const MOCK_DETAIL = {
  id: '1',
  docNo: 'DF-034',
  title: 'Galaxy S23에서 메인 메뉴 버튼이 화면 밖으로 이탈',
  type: 'UI' as const,
  severity: '높음' as Severity,
  status: '수정중' as const,
  reporter: '박테스터',
  assignee: '김개발',
  deadline: '2026-02-28',
  createdAt: '2026-02-20',
  environment: 'Galaxy S23 / Android 14 / Chrome 122',
  relatedDoc: { docNo: 'TS-018', title: '모바일 PDA 레이아웃 반응형 검증' },
  steps: [
    '앱을 Galaxy S23 기기에서 실행',
    '로그인 후 대시보드 화면으로 이동',
    '하단 메인 메뉴 탭 바 확인',
  ],
  expected: '하단 메인 메뉴 버튼 4개가 화면 너비에 맞게 균등 배치되어 모두 표시되어야 함',
  actual: '마지막 메뉴 버튼("더보기")이 화면 오른쪽 밖으로 약 20px 이탈하여 클릭 불가 상태',
  attachments: [
    { name: 'screenshot_galaxy_s23.png', size: '312KB' },
    { name: 'screen_recording.mp4', size: '4.2MB' },
  ],
}

const MOCK_COMMENTS = [
  { id: 1, author: '김개발', content: 'CSS flex 레이아웃에서 min-width 설정이 누락된 것으로 추정됩니다. 확인 후 수정하겠습니다.', createdAt: '2026-02-20 14:30' },
  { id: 2, author: '박테스터', content: 'Galaxy S23 외 Galaxy S21에서도 동일 현상 확인됩니다. 추가 기기 정보 공유드립니다.', createdAt: '2026-02-21 09:15' },
  { id: 3, author: '김개발', content: 'flex-shrink: 0 설정 제거 및 flex: 1 균등 분배로 수정했습니다. 검증 요청드립니다.', createdAt: '2026-02-22 11:40' },
]

const MOCK_HISTORY = [
  { action: '상태 변경', from: '분석중', to: '수정중', actor: '김개발', at: '2026-02-21 17:00' },
  { action: '담당자 배정', from: '미배정', to: '김개발', actor: '이설계', at: '2026-02-20 10:30' },
  { action: '상태 변경', from: '접수', to: '분석중', actor: '이설계', at: '2026-02-20 10:15' },
  { action: '등록', from: '', to: '', actor: '박테스터', at: '2026-02-20 09:48' },
]

const STATUS_OPTIONS: DefectStatus[] = ['접수', '분석중', '수정중', '검증중', '완료', '재현불가', '보류']

const DOC_PREFIX_STYLE: Record<string, string> = {
  WR: 'bg-blue-50 text-blue-500',
  TK: 'bg-slate-100 text-slate-500',
  TS: 'bg-emerald-50 text-emerald-600',
  DF: 'bg-red-50 text-red-400',
  DP: 'bg-orange-50 text-orange-500',
}

export default function DefectDetailPage() {
  const navigate = useNavigate()
  const data = MOCK_DETAIL

  const [status, setStatus] = useState<DefectStatus>(data.status)
  const [statusOpen, setStatusOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState(MOCK_COMMENTS)

  const handleStatusChange = (s: DefectStatus) => { setStatus(s); setStatusOpen(false) }

  const handleComment = () => {
    if (!comment.trim()) return
    setComments((prev) => [...prev, { id: Date.now(), author: '나', content: comment.trim(), createdAt: '방금 전' }])
    setComment('')
  }

  // 마감일 D-day
  const today = new Date('2026-02-22')
  today.setHours(0, 0, 0, 0)
  const deadline = new Date(data.deadline)
  const diff = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  const isCritical = data.severity === '치명적'

  return (
    <div className="p-6">
      {/* 치명적 경고 배너 */}
      {isCritical && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl mb-4">
          <CriticalIcon />
          <p className="text-[12px] text-red-700 font-semibold">치명적 심각도 결함입니다. 즉시 처리가 필요합니다.</p>
        </div>
      )}

      {/* 헤더 */}
      <div className="flex items-start justify-between mb-5">
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
              <DefectTypeBadge type={data.type} />
              <SeverityBadge severity={data.severity} />
            </div>
            <h1 className="text-[20px] font-bold text-gray-900 leading-snug">{data.title}</h1>
          </div>
        </div>

        {/* 상태 드롭다운 + 수정 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative">
            <button
              onClick={() => setStatusOpen((v) => !v)}
              className="flex items-center gap-1.5 h-8 px-3 border border-gray-200 rounded-lg text-[12px] font-medium text-gray-600 hover:bg-white transition-colors bg-white"
            >
              <DefectStatusBadge status={status} />
              <ChevronDownIcon />
            </button>
            {statusOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden w-28">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`w-full px-3 py-2 text-left text-[12px] hover:bg-gray-50 transition-colors ${s === status ? 'bg-blue-50' : ''}`}
                  >
                    <DefectStatusBadge status={s} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => navigate(`/defects/${data.id}/edit`)}
            className="h-8 px-3 border border-gray-200 rounded-lg text-[12px] font-medium text-gray-600 hover:bg-white transition-colors flex items-center gap-1.5"
          >
            <EditIcon />
            수정
          </button>
        </div>
      </div>

      {/* 2열 레이아웃 */}
      <div className="flex gap-5 items-start">
        {/* ── 왼쪽 메인 ─────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* 메타 */}
          <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-4">
            <div className="grid grid-cols-4 gap-4">
              <MetaItem label="발견자" value={data.reporter} />
              <MetaItem label="담당자" value={data.assignee} />
              <MetaItem label="수정 마감일">
                <p className={`text-[13px] font-medium mt-0.5 ${
                  diff < 0 ? 'text-red-500' : diff <= 3 ? 'text-orange-500' : 'text-gray-700'
                }`}>
                  {data.deadline}
                  {status !== '완료' && status !== '재현불가'
                    ? diff >= 0 ? ` (D-${diff})` : ` (D+${Math.abs(diff)})`
                    : ''}
                </p>
              </MetaItem>
              <MetaItem label="등록일" value={data.createdAt} />
            </div>
          </div>

          {/* 발생 환경 */}
          <Section title="발생 환경">
            <div className="flex items-center gap-2">
              <DeviceIcon />
              <span className="text-[13px] text-gray-700 font-mono">{data.environment}</span>
            </div>
          </Section>

          {/* 재현 경로 */}
          <Section title="재현 경로">
            <div className="space-y-2">
              {data.steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-red-50 text-red-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="text-[13px] text-gray-600 leading-snug">{step}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* 기대 동작 / 실제 동작 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-4">
              <div className="flex items-center gap-1.5 mb-3">
                <ExpectedIcon />
                <p className="text-[12px] font-semibold text-emerald-700">기대 동작</p>
              </div>
              <p className="text-[13px] text-gray-600 leading-relaxed">{data.expected}</p>
            </div>
            <div className="bg-white rounded-xl border border-red-100 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-4">
              <div className="flex items-center gap-1.5 mb-3">
                <ActualIcon />
                <p className="text-[12px] font-semibold text-red-500">실제 동작</p>
              </div>
              <p className="text-[13px] text-gray-600 leading-relaxed">{data.actual}</p>
            </div>
          </div>

          {/* 연관 문서 */}
          {data.relatedDoc.docNo && (
            <Section title="연관 문서">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:border-brand/40 hover:bg-blue-50/30 transition-colors group"
              >
                <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${DOC_PREFIX_STYLE[data.relatedDoc.docNo.split('-')[0]] ?? 'bg-gray-100 text-gray-500'}`}>
                  {data.relatedDoc.docNo}
                </span>
                <span className="text-[12px] text-gray-600 group-hover:text-brand transition-colors">
                  {data.relatedDoc.title}
                </span>
              </button>
            </Section>
          )}

          {/* 첨부파일 */}
          {data.attachments.length > 0 && (
            <Section title="첨부파일">
              <div className="space-y-2">
                {data.attachments.map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 hover:border-brand/30 hover:bg-blue-50/30 transition-colors cursor-pointer group">
                    <FileIcon ext={f.name.split('.').pop() ?? ''} />
                    <span className="text-[12px] text-gray-700 flex-1 group-hover:text-brand transition-colors">{f.name}</span>
                    <span className="text-[11px] text-gray-400">{f.size}</span>
                    <DownloadIcon />
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* 댓글 */}
          <Section title={`댓글 ${comments.length}`}>
            <div className="space-y-4 mb-4">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-brand/10 flex items-center justify-center text-brand text-[11px] font-bold flex-shrink-0">
                    {c.author[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[12px] font-semibold text-gray-800">{c.author}</span>
                      <span className="text-[11px] text-gray-400">{c.createdAt}</span>
                    </div>
                    <p className="text-[13px] text-gray-600 leading-relaxed">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) handleComment() }}
                placeholder="댓글을 입력하세요 (⌘+Enter로 전송)"
                rows={2}
                className="flex-1 px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 resize-none"
              />
              <button
                onClick={handleComment}
                disabled={!comment.trim()}
                className="h-fit px-3 py-2 bg-brand text-white text-[12px] font-semibold rounded-lg hover:bg-brand-hover transition-colors disabled:opacity-40 self-end"
              >
                전송
              </button>
            </div>
          </Section>
        </div>

        {/* ── 오른쪽 사이드바 ────────────────────────── */}
        <div className="w-[240px] flex-shrink-0">
          <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] p-4">
            <p className="text-[12px] font-semibold text-gray-700 mb-4">처리 이력</p>
            <div className="relative">
              <div className="absolute left-2.5 top-0 bottom-0 w-px bg-gray-100" />
              <div className="space-y-4">
                {MOCK_HISTORY.map((h, i) => (
                  <div key={i} className="flex gap-3 relative">
                    <div className="w-5 h-5 rounded-full bg-white border-2 border-gray-200 flex-shrink-0 z-10 flex items-center justify-center">
                      <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-brand' : 'bg-gray-300'}`} />
                    </div>
                    <div className="flex-1 min-w-0 pb-1">
                      <p className="text-[11px] font-semibold text-gray-700">{h.action}</p>
                      {h.from && (
                        <p className="text-[10px] text-gray-400 mt-0.5">{h.from} → {h.to}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-0.5">{h.actor} · {h.at.slice(5)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 서브 컴포넌트 ─────────────────────────────────────
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

// ── SVG 아이콘 ────────────────────────────────────────
function BackIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M9 2.5L5 7L9 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function EditIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M9 2L11 4L4.5 10.5H2.5V8.5L9 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
}

function ChevronDownIcon() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"><path d="M2.5 4L5.5 7L8.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function CriticalIcon() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true"><path d="M7.5 1L14 13.5H1L7.5 1Z" fill="#fee2e2" stroke="#ef4444" strokeWidth="1.3" strokeLinejoin="round" /><line x1="7.5" y1="5.5" x2="7.5" y2="9" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round" /><circle cx="7.5" cy="11" r="0.7" fill="#ef4444" /></svg>
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

function FileIcon({ ext }: { ext: string }) {
  const isMedia = ['mp4', 'mov', 'gif'].includes(ext.toLowerCase())
  const isImage = ['png', 'jpg', 'jpeg', 'webp'].includes(ext.toLowerCase())
  const color = isMedia ? '#8B5CF6' : isImage ? '#3B82F6' : '#9CA3AF'
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M3 1H8L11 4V12H3V1Z" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M8 1V4H11" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

function DownloadIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M6.5 2V9M6.5 9L4 6.5M6.5 9L9 6.5" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /><path d="M2 11H11" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" /></svg>
}
