import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TestTypeBadge, TestStatusBadge } from '@/components/test-scenario/Badges'
import { PriorityBadge } from '@/components/work-request/Badges'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useDeleteTestScenarioMutation, useUpdateTestScenarioStatusMutation } from '@/features/test-scenario/mutations'
import { useTestScenarioRelatedRefsQuery } from '@/features/test-scenario/queries'
import type { TestStatus } from '@/types/test-scenario'

// ── Mock 데이터 ───────────────────────────────────────
const MOCK_DETAIL = {
  id: '17',
  docNo: 'TS-017',
  title: '계좌 개설 프로세스 E2E 흐름 검증',
  type: 'E2E' as const,
  priority: '높음' as const,
  status: '실행중' as const,
  assignee: '이테스터',
  deadline: '2026-03-05',
  createdAt: '2026-02-18',
  relatedDocs: [
    { docNo: 'WR-042', title: '계좌 개설 신규 기능 요청' },
    { docNo: 'TK-109', title: '계좌 개설 API 연동 개발' },
  ],
  preconditions: '테스트 환경 DB가 초기화되어 있어야 함.\n사용자 계정(test@example.com)이 존재해야 함.\n외부 본인인증 Mock 서버가 실행 중이어야 함.',
  steps: [
    { action: '로그인 페이지에서 test@example.com으로 로그인', expected: '대시보드 화면으로 이동하며 환영 메시지 표시' },
    { action: '상단 메뉴에서 "계좌 관리" → "새 계좌 개설" 클릭', expected: '계좌 개설 약관 동의 페이지가 표시됨' },
    { action: '전체 약관 동의 체크 후 "다음" 버튼 클릭', expected: '본인인증 단계 페이지로 이동' },
    { action: '휴대폰 본인인증 선택 후 인증번호 입력 완료', expected: '본인인증 성공 메시지와 함께 계좌 정보 입력 단계로 이동' },
    { action: '계좌 종류(자유적금), 월 납입액(100,000원), 만기(12개월) 입력 후 "개설 신청" 클릭', expected: '신청 내역 확인 모달이 표시되며 입력한 정보가 정확히 보임' },
    { action: '확인 모달에서 "최종 확인" 버튼 클릭', expected: '계좌 개설 완료 화면이 표시되고 신규 계좌번호(XXX-XXXX-XXXXXX)가 발급됨' },
  ],
  attachments: [
    { name: 'e2e_test_plan.pdf', size: '1.2MB' },
    { name: 'account_flow_diagram.png', size: '480KB' },
  ],
}

const MOCK_COMMENTS = [
  { id: 1, author: '이테스터', content: '4단계 본인인증 Mock 서버 설정이 필요합니다. DevOps팀에 환경 준비 요청했습니다.', createdAt: '2026-02-19 10:20' },
  { id: 2, author: '박PM', content: '3월 배포 전 완료해야 합니다. 우선 진행 부탁드립니다.', createdAt: '2026-02-20 15:45' },
]

const MOCK_HISTORY = [
  { action: '상태 변경', from: '승인됨', to: '실행중', actor: '이테스터', at: '2026-02-22 09:30' },
  { action: '담당자 배정', from: '미배정', to: '이테스터', actor: '박PM', at: '2026-02-19 14:00' },
  { action: '상태 변경', from: '검토중', to: '승인됨', actor: '박PM', at: '2026-02-19 11:30' },
]

const STATUS_OPTIONS: TestStatus[] = ['작성중', '검토중', '승인됨', '실행중', '통과', '실패', '보류']

const DOC_PREFIX_STYLE: Record<string, string> = {
  WR: 'bg-blue-50 text-blue-500',
  TK: 'bg-slate-100 text-slate-500',
  TS: 'bg-emerald-50 text-emerald-600',
  DF: 'bg-red-50 text-red-400',
  DP: 'bg-orange-50 text-orange-500',
}

type StepResult = 'pass' | 'fail' | null

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

export default function TestScenarioDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const numericId = Number(id)
  const hasValidId = Number.isInteger(numericId) && numericId > 0
  const docId = hasValidId ? numericId : Number(MOCK_DETAIL.id)
  const updateStatus = useUpdateTestScenarioStatusMutation(docId)
  const deleteScenario = useDeleteTestScenarioMutation()
  const relatedRefsQuery = useTestScenarioRelatedRefsQuery(hasValidId ? numericId : undefined)
  const data = MOCK_DETAIL
  const relatedDocs = relatedRefsQuery.data?.map((item) => ({
    docNo: item.refNo,
    title: item.title ?? item.refNo,
    route: getRefRoute(item.refType, item.refId),
  })) ?? data.relatedDocs.map((item) => ({ ...item, route: null }))

  const [status, setStatus] = useState<TestStatus>(data.status)
  const [statusOpen, setStatusOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState(MOCK_COMMENTS)
  const [stepResults, setStepResults] = useState<StepResult[]>(
    Array(data.steps.length).fill(null)
  )

  const handleStatusChange = async (s: TestStatus) => {
    setStatus(s)
    setStatusOpen(false)
    try {
      await updateStatus.mutateAsync(s)
    } catch {
      setStatus(data.status)
    }
  }

  const handleComment = () => {
    if (!comment.trim()) return
    setComments((prev) => [...prev, { id: Date.now(), author: '나', content: comment.trim(), createdAt: '방금 전' }])
    setComment('')
  }

  const setStepResult = (idx: number, result: StepResult) => {
    setStepResults((prev) => {
      const next = [...prev]
      next[idx] = next[idx] === result ? null : result
      return next
    })
  }

  // 진행률
  const executedCount = stepResults.filter((r) => r !== null).length
  const passCount = stepResults.filter((r) => r === 'pass').length
  const failCount = stepResults.filter((r) => r === 'fail').length
  const progressPct = Math.round((executedCount / data.steps.length) * 100)

  const isExecutable = status === '실행중' || status === '통과' || status === '실패'

  // 마감일 D-day
  const today = new Date('2026-02-22')
  today.setHours(0, 0, 0, 0)
  const deadline = new Date(data.deadline)
  const diff = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="p-6">
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
              <TestTypeBadge type={data.type} />
              <PriorityBadge priority={data.priority} />
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
              <TestStatusBadge status={status} />
              <ChevronDownIcon />
            </button>
            {statusOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden w-28">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      void handleStatusChange(s)
                    }}
                    className={`w-full px-3 py-2 text-left text-[12px] hover:bg-gray-50 transition-colors ${s === status ? 'bg-blue-50' : ''}`}
                  >
                    <TestStatusBadge status={s} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => navigate(`/test-scenarios/${id ?? data.id}/edit`)}
            className="h-8 px-3 border border-gray-200 rounded-lg text-[12px] font-medium text-gray-600 hover:bg-white transition-colors flex items-center gap-1.5"
          >
            <EditIcon />
            수정
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="h-8 px-3 border border-red-200 rounded-lg text-[12px] font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            삭제
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
              <MetaItem label="담당자" value={data.assignee} />
              <MetaItem label="연관 문서">
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {relatedDocs.map((d) => {
                    const prefix = d.docNo.split('-')[0]
                    return (
                      <span
                        key={`${d.docNo}-${d.route ?? 'none'}`}
                        className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${DOC_PREFIX_STYLE[prefix] ?? 'bg-gray-100 text-gray-500'}`}
                      >
                        {d.docNo}
                      </span>
                    )
                  })}
                </div>
              </MetaItem>
              <MetaItem label="마감일">
                <p className={`text-[13px] font-medium mt-0.5 ${
                  diff < 0 ? 'text-red-500' : diff <= 3 ? 'text-orange-500' : 'text-gray-700'
                }`}>
                  {data.deadline}
                  {status !== '통과' && status !== '실패'
                    ? diff >= 0 ? ` (D-${diff})` : ` (D+${Math.abs(diff)})`
                    : ''}
                </p>
              </MetaItem>
              <MetaItem label="등록일" value={data.createdAt} />
            </div>
          </div>

          {/* 사전 조건 */}
          <Section title="사전 조건">
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-[13px] text-gray-600 leading-relaxed whitespace-pre-line border border-gray-100">
              {data.preconditions}
            </div>
          </Section>

          {/* 테스트 단계 */}
          <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-4">
            {/* 섹션 헤더 */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-semibold text-gray-700">테스트 단계</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                  <span className="text-emerald-600 font-semibold">{passCount}통과</span>
                  <span>·</span>
                  <span className="text-red-500 font-semibold">{failCount}실패</span>
                  <span>·</span>
                  <span>{executedCount}/{data.steps.length} 실행</span>
                </div>
              </div>
            </div>

            {/* 진행률 바 */}
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

            {/* 단계 목록 */}
            <div className="space-y-2">
              {/* 컬럼 헤더 */}
              <div className="grid grid-cols-[28px_1fr_1fr_96px] gap-3 pb-1 border-b border-gray-100">
                <div />
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">액션</p>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">기대 결과</p>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-center">결과</p>
              </div>

              {data.steps.map((step, idx) => {
                const result = stepResults[idx]
                const rowBg =
                  result === 'pass' ? 'bg-emerald-50/60' :
                  result === 'fail' ? 'bg-red-50/60' :
                  'bg-white'

                return (
                  <div
                    key={idx}
                    className={`grid grid-cols-[28px_1fr_1fr_96px] gap-3 items-start px-2 py-2 rounded-lg transition-colors ${rowBg}`}
                  >
                    {/* 번호 */}
                    <span className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      result === 'pass' ? 'bg-emerald-100 text-emerald-700' :
                      result === 'fail' ? 'bg-red-100 text-red-500' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {idx + 1}
                    </span>

                    {/* 액션 */}
                    <p className="text-[12px] text-gray-700 leading-snug">{step.action}</p>

                    {/* 기대 결과 */}
                    <p className="text-[12px] text-gray-500 leading-snug">{step.expected}</p>

                    {/* Pass / Fail 버튼 */}
                    <div className="flex items-center gap-1.5 justify-center">
                      <button
                        disabled={!isExecutable}
                        onClick={() => setStepResult(idx, 'pass')}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                          result === 'pass'
                            ? 'bg-emerald-500 text-white'
                            : isExecutable
                            ? 'bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            : 'bg-gray-50 border border-gray-100 text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        <CheckIcon />
                        Pass
                      </button>
                      <button
                        disabled={!isExecutable}
                        onClick={() => setStepResult(idx, 'fail')}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                          result === 'fail'
                            ? 'bg-red-500 text-white'
                            : isExecutable
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

            {!isExecutable && (
              <p className="mt-3 text-[11px] text-gray-400 text-center">
                상태가 <strong>실행중 / 통과 / 실패</strong>일 때 결과를 입력할 수 있습니다.
              </p>
            )}
          </div>

          {/* 연관 문서 */}
          <Section title="연관 문서">
            <div className="flex flex-wrap gap-2">
              {relatedDocs.map((d) => {
                const prefix = d.docNo.split('-')[0]
                return (
                  <button
                    key={`${d.docNo}-${d.route ?? 'none'}`}
                    onClick={() => {
                      if (d.route) {
                        navigate(d.route)
                      }
                    }}
                    disabled={!d.route}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:border-brand/40 hover:bg-blue-50/30 transition-colors group disabled:opacity-70 disabled:cursor-default"
                  >
                    <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${DOC_PREFIX_STYLE[prefix] ?? 'bg-gray-100 text-gray-500'}`}>
                      {d.docNo}
                    </span>
                    <span className="text-[12px] text-gray-600 group-hover:text-brand transition-colors">
                      {d.title}
                    </span>
                  </button>
                )
              })}
            </div>
          </Section>

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

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="테스트 시나리오를 삭제할까요?"
        description="삭제 후에는 복구할 수 없습니다."
        confirmText={deleteScenario.isPending ? '삭제 중...' : '삭제'}
        cancelText="취소"
        destructive
        onConfirm={() => {
          void deleteScenario.mutateAsync(docId).then(() => {
            navigate('/test-scenarios')
          })
        }}
      />
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
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M2 5L4 7.5L8 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function XIcon() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M2.5 2.5L7.5 7.5M7.5 2.5L2.5 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
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
