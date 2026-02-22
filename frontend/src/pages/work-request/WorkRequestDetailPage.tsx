import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TypeBadge, PriorityBadge, StatusBadge } from '@/components/work-request/Badges'
import type { Status } from '@/types/work-request'

// ── 샘플 상세 데이터 ──────────────────────────────────
const MOCK_DETAIL = {
  id: '1',
  docNo: 'WR-051',
  title: '모바일 PDA 화면 레이아웃 개선 요청',
  type: '기능개선' as const,
  priority: '높음' as const,
  status: '개발중' as const,
  requester: '홍길동',
  assignee: '김개발',
  deadline: '2026-02-25',
  createdAt: '2026-02-10',
  relatedDocs: [
    { docNo: 'WR-048', title: 'AWS S3 스토리지 용량 확장' },
  ],
  background: '현재 PDA 화면에서 일부 메뉴가 작은 화면에서 잘려 보이는 문제가 보고되고 있어 사용자 경험 개선이 필요합니다.',
  description: `현재 모바일 PDA 기기에서 사용 시 다음과 같은 레이아웃 문제가 발생하고 있습니다.

1. 메인 메뉴 하단 버튼이 일부 기기(Galaxy S 시리즈)에서 화면 밖으로 벗어남
2. 목록 화면에서 가로 스크롤 발생으로 UX 불편
3. 폰트 크기가 작아 가독성 저하

개선 요청 사항:
- 반응형 레이아웃 적용으로 다양한 화면 크기 대응
- 버튼 및 터치 타겟 크기 최소 44px 이상으로 조정
- 폰트 크기 최소 14px 이상 보장`,
  attachments: [
    { name: '화면캡처_레이아웃오류.png', size: '1.2MB' },
    { name: 'PDA_UX_개선안.pdf', size: '834KB' },
  ],
}

const MOCK_COMMENTS = [
  { id: 1, author: '이설계', content: '레이아웃 분석 완료했습니다. 반응형 적용 시 약 3일 소요 예상합니다.', createdAt: '2026-02-12 14:23' },
  { id: 2, author: '김개발', content: '개발 시작하겠습니다. Galaxy S23, S24 기준으로 우선 테스트 예정입니다.', createdAt: '2026-02-14 09:11' },
  { id: 3, author: '홍길동', content: '감사합니다. S22도 포함해서 테스트 부탁드립니다.', createdAt: '2026-02-14 10:05' },
]

const MOCK_HISTORY = [
  { action: '상태 변경', from: '검토중', to: '개발중', actor: '김개발', at: '2026-02-14 09:11' },
  { action: '담당자 배정', from: '미배정', to: '김개발', actor: '이설계', at: '2026-02-12 14:20' },
  { action: '상태 변경', from: '접수대기', to: '검토중', actor: '이설계', at: '2026-02-11 11:00' },
  { action: '등록', from: '', to: '', actor: '홍길동', at: '2026-02-10 16:32' },
]

const STATUS_OPTIONS: Status[] = ['접수대기', '검토중', '개발중', '테스트중', '완료', '반려']

export default function WorkRequestDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const data = MOCK_DETAIL // TODO: id로 API 호출

  const [status, setStatus] = useState<Status>(data.status)
  const [statusOpen, setStatusOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState(MOCK_COMMENTS)

  const handleStatusChange = (s: Status) => {
    setStatus(s)
    setStatusOpen(false)
  }

  const handleComment = () => {
    if (!comment.trim()) return
    setComments((prev) => [
      ...prev,
      { id: Date.now(), author: '나', content: comment.trim(), createdAt: '방금 전' },
    ])
    setComment('')
  }

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
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[12px] text-gray-400">{data.docNo}</span>
              <TypeBadge type={data.type} />
              <PriorityBadge priority={data.priority} />
            </div>
            <h1 className="text-[20px] font-bold text-gray-900 leading-snug">{data.title}</h1>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* 상태 변경 */}
          <div className="relative">
            <button
              onClick={() => setStatusOpen((v) => !v)}
              className="flex items-center gap-1.5 h-8 px-3 border border-gray-200 rounded-lg text-[12px] font-medium text-gray-600 hover:bg-white transition-colors"
            >
              <StatusBadge status={status} />
              <ChevronDownIcon />
            </button>
            {statusOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden w-32">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`w-full px-3 py-2 text-left text-[12px] hover:bg-gray-50 transition-colors flex items-center gap-2 ${s === status ? 'bg-blue-50' : ''}`}
                  >
                    <StatusBadge status={s} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => navigate(`/work-requests/${id}/edit`)}
            className="h-8 px-3 border border-gray-200 rounded-lg text-[12px] font-medium text-gray-600 hover:bg-white transition-colors flex items-center gap-1.5"
          >
            <EditIcon />
            수정
          </button>
        </div>
      </div>

      {/* 본문 2열 */}
      <div className="flex gap-5 items-start">
        {/* 왼쪽: 메인 콘텐츠 */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* 메타 정보 */}
          <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-4">
            <div className="grid grid-cols-4 gap-4">
              <MetaItem label="요청자" value={data.requester} />
              <MetaItem label="담당자" value={data.assignee} />
              <MetaItem label="마감일">
                <DeadlineText date={data.deadline} />
              </MetaItem>
              <MetaItem label="등록일" value={data.createdAt} />
            </div>
          </div>

          {/* 요청 배경 */}
          {data.background && (
            <Section title="요청 배경">
              <p className="text-[13px] text-gray-600 leading-relaxed">{data.background}</p>
            </Section>
          )}

          {/* 내용 */}
          <Section title="내용">
            <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{data.description}</p>
          </Section>

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

          {/* 연관 문서 */}
          {data.relatedDocs.length > 0 && (
            <Section title="연관 문서">
              <div className="flex flex-wrap gap-2">
                {data.relatedDocs.map((d) => (
                  <button
                    key={d.docNo}
                    onClick={() => navigate(`/work-requests/${d.docNo}`)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:border-brand/40 hover:bg-blue-50/30 transition-colors group"
                  >
                    <span className="font-mono text-[11px] text-gray-400">{d.docNo}</span>
                    <span className="text-[12px] text-gray-600 group-hover:text-brand transition-colors">{d.title}</span>
                  </button>
                ))}
              </div>
            </Section>
          )}

          {/* 댓글 */}
          <Section title={`댓글 ${comments.length}`}>
            <div className="space-y-3 mb-4">
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
            {/* 댓글 입력 */}
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

        {/* 오른쪽: 히스토리 */}
        <div className="w-[240px] flex-shrink-0">
          <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] p-4">
            <p className="text-[12px] font-semibold text-gray-700 mb-4">처리 이력</p>
            <div className="relative">
              {/* 수직선 */}
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
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {h.from} → {h.to}
                        </p>
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

function DeadlineText({ date }: { date: string }) {
  const today = new Date('2026-02-22')
  const d = new Date(date)
  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  let cls = 'text-gray-700'
  if (diff < 0) cls = 'text-red-500'
  else if (diff <= 3) cls = 'text-orange-500'
  return <p className={`text-[13px] font-medium ${cls}`}>{date} {diff >= 0 ? `(D-${diff})` : `(D+${Math.abs(diff)})`}</p>
}

// ── SVG 아이콘 ────────────────────────────────────────
function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M9 2.5L5 7L9 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <path d="M2.5 4L5.5 7L8.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M9 2L11 4L4.5 10.5H2.5V8.5L9 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M3 1H8L11 4V12H3V1Z" stroke="#9CA3AF" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M8 1V4H11" stroke="#9CA3AF" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M6.5 2V9M6.5 9L4 6.5M6.5 9L9 6.5" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 11H11" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
