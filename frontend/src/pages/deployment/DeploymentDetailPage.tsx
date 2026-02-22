import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DeployTypeBadge, DeployEnvBadge, DeployStatusBadge } from '@/components/deployment/Badges'
import type { DeployStatus } from '@/types/deployment'

// ── 샘플 상세 데이터 ──────────────────────────────────
const MOCK_DETAIL = {
  id: '1',
  docNo: 'DP-018',
  title: 'v2.3.0 2월 정기 배포',
  version: 'v2.3.0',
  type: '정기배포' as const,
  env: '운영' as const,
  status: '진행중' as const,
  manager: '최인프라',
  deployDate: '2026-02-28',
  createdAt: '2026-02-18',
  overview: `이번 배포에는 계좌 조회 서비스 레이어 리팩토링(TK-021), N+1 쿼리 성능 개선(TK-020), 모바일 PDA 레이아웃 개선(WR-051) 등 총 5개 항목이 포함됩니다. 2월 정기 배포 일정에 따라 운영 서버에 배포합니다.`,
  includedDocs: [
    { docNo: 'WR-051', title: '모바일 PDA 화면 레이아웃 개선 요청' },
    { docNo: 'WR-050', title: '신규 계좌 개설 프로세스 자동화' },
    { docNo: 'TK-021', title: '계좌 조회 서비스 레이어 리팩토링' },
    { docNo: 'TK-020', title: 'N+1 쿼리 문제 해결 — 잔고 조회 API' },
    { docNo: 'DF-030', title: '로그인 세션 만료 후 이전 페이지 캐시 노출' },
  ],
  steps: [
    { id: 1, text: 'Jenkins 빌드 및 Docker 이미지 생성', done: true },
    { id: 2, text: '스테이징 서버 최종 검증 (smoke test)', done: true },
    { id: 3, text: 'DB 마이그레이션 스크립트 실행', done: true },
    { id: 4, text: '운영 서버 배포 (Blue-Green 전환)', done: false },
    { id: 5, text: '헬스체크 확인 (/actuator/health)', done: false },
    { id: 6, text: '모니터링 이상 여부 확인 (15분)', done: false },
  ],
  rollback: `1. Blue-Green 스위치를 Blue(이전 버전)로 복원\n2. DB 마이그레이션 롤백 스크립트 실행 (rollback_v2.3.0.sql)\n3. Jenkins 이전 빌드(v2.2.3) 재배포\n4. 담당자 최인프라 즉시 연락 (010-XXXX-XXXX)`,
  attachments: [
    { name: 'v2.3.0_배포계획서.pdf', size: '420KB' },
    { name: 'db_migration_v2.3.0.sql', size: '8KB' },
  ],
}

const MOCK_COMMENTS = [
  { id: 1, author: '최인프라', content: 'DB 마이그레이션 스크립트 검증 완료. 스테이징에서 약 2분 소요됐습니다. 운영 환경에서도 동일 예상.', createdAt: '2026-02-25 14:20' },
  { id: 2, author: '이설계', content: 'TK-020 N+1 수정 건 스테이징 smoke test 통과했습니다. 잔고 조회 응답시간 250ms → 40ms로 개선 확인.', createdAt: '2026-02-26 10:05' },
]

const MOCK_HISTORY = [
  { action: '상태 변경', from: '대기', to: '진행중', actor: '최인프라', at: '2026-02-28 09:00' },
  { action: '담당자 배정', from: '미배정', to: '최인프라', actor: '이설계', at: '2026-02-20 11:00' },
  { action: '등록', from: '', to: '', actor: '이설계', at: '2026-02-18 16:30' },
]

const STATUS_OPTIONS: DeployStatus[] = ['대기', '진행중', '완료', '실패', '롤백']

const DOC_PREFIX_STYLE: Record<string, string> = {
  WR: 'bg-blue-50 text-blue-500',
  TK: 'bg-slate-100 text-slate-500',
  TS: 'bg-emerald-50 text-emerald-600',
  DF: 'bg-red-50 text-red-400',
  DP: 'bg-orange-50 text-orange-500',
}

export default function DeploymentDetailPage() {
  const navigate = useNavigate()
  const data = MOCK_DETAIL

  const [status, setStatus] = useState<DeployStatus>(data.status)
  const [statusOpen, setStatusOpen] = useState(false)
  const [steps, setSteps] = useState(data.steps)
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState(MOCK_COMMENTS)

  const doneCnt = steps.filter((s) => s.done).length
  const progress = Math.round((doneCnt / steps.length) * 100)

  const isProd = data.env === '운영'
  const isFailed = status === '실패' || status === '롤백'

  const handleStatusChange = (s: DeployStatus) => { setStatus(s); setStatusOpen(false) }

  const handleComment = () => {
    if (!comment.trim()) return
    setComments((prev) => [...prev, { id: Date.now(), author: '나', content: comment.trim(), createdAt: '방금 전' }])
    setComment('')
  }

  // 배포 예정일 D-day
  const today = new Date('2026-02-22')
  const deployD = new Date(data.deployDate)
  const diff = Math.ceil((deployD.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="p-6">
      {/* 운영 환경 경고 배너 */}
      {isProd && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl mb-4">
          <WarningIcon />
          <p className="text-[12px] text-red-600 font-medium">운영 환경 배포입니다. 각 단계를 신중하게 진행해주세요.</p>
        </div>
      )}
      {isFailed && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-orange-50 border border-orange-100 rounded-xl mb-4">
          <WarningIcon color="#f97316" />
          <p className="text-[12px] text-orange-600 font-medium">배포 {status} 상태입니다. 롤백 계획을 확인해주세요.</p>
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
              <DeployTypeBadge type={data.type} />
              <DeployEnvBadge env={data.env} />
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
              <DeployStatusBadge status={status} />
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
                    <DeployStatusBadge status={s} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => navigate(`/deployments/${data.id}/edit`)}
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
              <MetaItem label="버전">
                <span className="font-mono text-[13px] text-gray-700 font-semibold bg-gray-50 px-2 py-0.5 rounded inline-block mt-0.5">
                  {data.version}
                </span>
              </MetaItem>
              <MetaItem label="배포 담당자" value={data.manager} />
              <MetaItem label="배포 예정일">
                <p className={`text-[13px] font-medium mt-0.5 ${diff < 0 ? 'text-red-500' : diff <= 3 ? 'text-amber-500' : 'text-gray-700'}`}>
                  {data.deployDate}
                  {status === '대기' || status === '진행중'
                    ? diff >= 0 ? ` (D-${diff})` : ` (D+${Math.abs(diff)})`
                    : ''}
                </p>
              </MetaItem>
              <MetaItem label="등록일" value={data.createdAt} />
            </div>
          </div>

          {/* 배포 개요 */}
          {data.overview && (
            <Section title="배포 개요">
              <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap">{data.overview}</p>
            </Section>
          )}

          {/* 포함 항목 */}
          <Section title={`포함 항목 (${data.includedDocs.length}건)`}>
            <div className="flex flex-wrap gap-2">
              {data.includedDocs.map((doc) => {
                const prefix = doc.docNo.split('-')[0]
                const style = DOC_PREFIX_STYLE[prefix] ?? 'bg-gray-100 text-gray-500'
                return (
                  <button
                    key={doc.docNo}
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg hover:border-brand/30 hover:bg-blue-50/30 transition-colors group"
                  >
                    <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${style}`}>{doc.docNo}</span>
                    <span className="text-[12px] text-gray-600 group-hover:text-brand transition-colors">{doc.title}</span>
                  </button>
                )
              })}
            </div>
          </Section>

          {/* 배포 절차 */}
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

            {/* 진행률 바 */}
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isFailed ? 'bg-red-400' : progress === 100 ? 'bg-emerald-400' : 'bg-brand'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* 절차 리스트 */}
            <div className="space-y-2">
              {steps.map((step, idx) => {
                const isNext = !step.done && steps.slice(0, idx).every((s) => s.done)
                return (
                  <label
                    key={step.id}
                    className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors group ${
                      step.done
                        ? 'bg-emerald-50/50'
                        : isNext
                        ? 'bg-brand/5 border border-brand/10'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* 체크박스 */}
                    <div className="relative mt-0.5 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={step.done}
                        onChange={() =>
                          setSteps((prev) =>
                            prev.map((s) => s.id === step.id ? { ...s, done: !s.done } : s)
                          )
                        }
                        className="sr-only"
                      />
                      <div className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-colors ${
                        step.done ? 'bg-emerald-500 border-emerald-500' : isNext ? 'border-brand/40 group-hover:border-brand' : 'border-gray-300 group-hover:border-gray-400'
                      }`}
                        style={{ width: '18px', height: '18px' }}
                      >
                        {step.done && <CheckIcon />}
                      </div>
                    </div>

                    {/* 번호 + 텍스트 */}
                    <div className="flex items-center gap-2 flex-1">
                      <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${
                        step.done ? 'bg-emerald-100 text-emerald-600' : isNext ? 'bg-brand/10 text-brand' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className={`text-[13px] leading-snug transition-colors ${
                        step.done ? 'text-gray-400 line-through' : isNext ? 'text-gray-800 font-medium' : 'text-gray-600'
                      }`}>
                        {step.text}
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
          </div>

          {/* 롤백 계획 */}
          <div className={`bg-white rounded-xl border shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-4 ${isProd ? 'border-red-100' : 'border-blue-50'}`}>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[12px] font-semibold text-gray-700">롤백 계획</p>
              {isProd && (
                <span className="text-[10px] text-red-500 font-semibold bg-red-50 px-1.5 py-0.5 rounded">운영 필수</span>
              )}
            </div>
            <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap font-mono text-[12px]">
              {data.rollback}
            </p>
          </div>

          {/* 첨부파일 */}
          {data.attachments.length > 0 && (
            <Section title="첨부파일">
              <div className="space-y-2">
                {data.attachments.map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 hover:border-brand/30 hover:bg-blue-50/30 transition-colors cursor-pointer group">
                    <FileIcon />
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

function CheckIcon() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M2 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function WarningIcon({ color = '#ef4444' }: { color?: string }) {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 1.5L13 12.5H1L7 1.5Z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" /><line x1="7" y1="5.5" x2="7" y2="8.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" /><circle cx="7" cy="10.5" r="0.6" fill={color} /></svg>
}

function FileIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M3 1H8L11 4V12H3V1Z" stroke="#9CA3AF" strokeWidth="1.2" strokeLinejoin="round" /><path d="M8 1V4H11" stroke="#9CA3AF" strokeWidth="1.2" strokeLinejoin="round" /></svg>
}

function DownloadIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M6.5 2V9M6.5 9L4 6.5M6.5 9L9 6.5" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /><path d="M2 11H11" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" /></svg>
}
