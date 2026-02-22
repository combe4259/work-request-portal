import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CategoryBadge, IdeaStatusBadge } from '@/components/idea/Badges'
import type { IdeaStatus } from '@/types/idea'

// ── Mock 데이터 ───────────────────────────────────────
const MOCK_DETAIL = {
  id: '7',
  docNo: 'ID-007',
  title: '잔고 조회 화면 즐겨찾기 계좌 핀 기능',
  category: 'UX/UI' as const,
  status: '검토중' as IdeaStatus,
  proposer: '박요청',
  createdAt: '2026-02-15',
  likes: 18,
  content: `잔고 조회 화면에서 자주 확인하는 계좌를 상단에 고정(핀)할 수 있는 기능을 추가합니다.

현재는 계좌 목록이 개설 순서대로 고정되어 있어, 주로 사용하는 계좌를 확인하려면 스크롤이 필요한 경우가 있습니다. 즐겨찾기 핀 기능을 통해 사용 빈도가 높은 계좌를 최상단에 노출시킬 수 있습니다.

추가로 핀된 계좌의 순서를 드래그로 변경할 수 있는 기능도 함께 검토해주시면 좋겠습니다.`,
  benefits: [
    '주 사용 계좌 접근성 향상으로 평균 클릭 수 2회 절감 예상',
    '계좌 수가 많은 사용자(5개 이상)의 UX 만족도 개선',
    '드래그 순서 변경으로 개인화 경험 제공',
  ],
  relatedDocs: [
    { docNo: 'WR-038', title: '잔고 조회 화면 UI 개선 요청' },
    { docNo: 'TS-012', title: '계좌 목록 정렬 기능 테스트 시나리오' },
  ],
}

const MOCK_COMMENTS = [
  { id: 1, author: '이설계', content: '좋은 아이디어입니다. 핀 아이콘 위치와 개수 제한(최대 3개?)에 대한 기준도 함께 정하면 좋을 것 같습니다.', createdAt: '2026-02-16 10:20' },
  { id: 2, author: '김개발', content: '드래그 기능은 모바일 터치 환경에서도 동작해야 하는데, React DnD 또는 dnd-kit 라이브러리 도입을 검토해볼게요.', createdAt: '2026-02-17 14:05' },
]

const MOCK_HISTORY = [
  { action: '상태 변경', from: '제안됨', to: '검토중', actor: '이설계', at: '2026-02-16 09:00' },
  { action: '아이디어 등록', from: '', to: '', actor: '박요청', at: '2026-02-15 17:30' },
]

const STATUS_OPTIONS: IdeaStatus[] = ['제안됨', '검토중', '채택', '보류', '기각']

const DOC_PREFIX_STYLE: Record<string, string> = {
  WR: 'bg-blue-50 text-blue-500',
  TK: 'bg-slate-100 text-slate-500',
  TS: 'bg-emerald-50 text-emerald-600',
  DF: 'bg-red-50 text-red-400',
  DP: 'bg-orange-50 text-orange-500',
  ID: 'bg-purple-50 text-purple-500',
}

export default function IdeaDetailPage() {
  const navigate = useNavigate()
  const data = MOCK_DETAIL

  const [status, setStatus] = useState<IdeaStatus>(data.status)
  const [statusOpen, setStatusOpen] = useState(false)
  const [liked, setLiked] = useState(false)
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState(MOCK_COMMENTS)

  const likeCount = data.likes + (liked ? 1 : 0)

  const handleStatusChange = (s: IdeaStatus) => { setStatus(s); setStatusOpen(false) }

  const handleComment = () => {
    if (!comment.trim()) return
    setComments((prev) => [...prev, { id: Date.now(), author: '나', content: comment.trim(), createdAt: '방금 전' }])
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
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-[12px] text-gray-400">{data.docNo}</span>
              <CategoryBadge category={data.category} />
            </div>
            <h1 className="text-[20px] font-bold text-gray-900 leading-snug">{data.title}</h1>
          </div>
        </div>

        {/* 우측 액션 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* 좋아요 버튼 */}
          <button
            onClick={() => setLiked((v) => !v)}
            className={`flex items-center gap-1.5 h-8 px-3 border rounded-lg text-[12px] font-medium transition-colors ${
              liked
                ? 'bg-red-50 border-red-200 text-red-500'
                : 'bg-white border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-400'
            }`}
          >
            <HeartIcon filled={liked} />
            {likeCount}
          </button>

          {/* 상태 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => setStatusOpen((v) => !v)}
              className="flex items-center gap-1.5 h-8 px-3 border border-gray-200 rounded-lg text-[12px] font-medium text-gray-600 hover:bg-white transition-colors bg-white"
            >
              <IdeaStatusBadge status={status} />
              <ChevronDownIcon />
            </button>
            {statusOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden w-24">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`w-full px-3 py-2 text-left text-[12px] hover:bg-gray-50 transition-colors ${s === status ? 'bg-blue-50' : ''}`}
                  >
                    <IdeaStatusBadge status={s} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2열 레이아웃 */}
      <div className="flex gap-5 items-start">
        {/* ── 왼쪽 메인 ─────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* 메타 */}
          <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-4">
            <div className="grid grid-cols-3 gap-4">
              <MetaItem label="카테고리">
                <div className="mt-0.5"><CategoryBadge category={data.category} /></div>
              </MetaItem>
              <MetaItem label="제안자" value={data.proposer} />
              <MetaItem label="등록일" value={data.createdAt} />
            </div>
          </div>

          {/* 아이디어 내용 */}
          <Section title="아이디어 내용">
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-[13px] text-gray-600 leading-relaxed whitespace-pre-line border border-gray-100">
              {data.content}
            </div>
          </Section>

          {/* 기대 효과 */}
          <Section title="기대 효과">
            <div className="space-y-2">
              {data.benefits.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="text-[13px] text-gray-600 leading-snug">{item}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* 연관 문서 */}
          {data.relatedDocs.length > 0 && (
            <Section title="연관 문서">
              <div className="flex flex-wrap gap-2">
                {data.relatedDocs.map((d) => {
                  const prefix = d.docNo.split('-')[0]
                  return (
                    <button
                      key={d.docNo}
                      onClick={() => navigate(-1)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:border-brand/40 hover:bg-blue-50/30 transition-colors group"
                    >
                      <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${DOC_PREFIX_STYLE[prefix] ?? 'bg-gray-100 text-gray-500'}`}>
                        {d.docNo}
                      </span>
                      <span className="text-[12px] text-gray-600 group-hover:text-brand transition-colors">{d.title}</span>
                    </button>
                  )
                })}
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
                placeholder="의견을 남겨주세요 (⌘+Enter로 전송)"
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

// ── 아이콘 ────────────────────────────────────────────
function BackIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M9 2.5L5 7L9 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function ChevronDownIcon() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"><path d="M2.5 4L5.5 7L8.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path
        d="M6.5 11S1 7.5 1 4a2.5 2.5 0 015 0 2.5 2.5 0 015 0c0 3.5-5.5 7-5.5 7z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        fill={filled ? 'currentColor' : 'none'}
      />
    </svg>
  )
}
