import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { KBCategory } from '@/types/knowledge-base'

// ── 샘플 상세 데이터 ──────────────────────────────────
const MOCK_DETAIL = {
  id: '1',
  docNo: 'KB-018',
  title: 'JWT 액세스/리프레시 토큰 설계 가이드',
  category: '개발 가이드' as KBCategory,
  tags: ['Spring Boot', 'JWT', 'Security'],
  summary: 'JWT 토큰 발급·갱신·무효화 전략과 Refresh Token Rotation 패턴 적용 방법을 정리합니다. TK-019 보안 패치 과정에서 정립된 내용입니다.',
  author: '박테스터',
  createdAt: '2026-02-18',
  updatedAt: '2026-02-19',
  views: 87,
  relatedDocs: [
    { docNo: 'TK-019', title: 'JWT 보안 취약점 패치' },
    { docNo: 'DF-031', title: 'JWT 토큰 재발급 중 세션 무효화 오류' },
  ],
  attachments: [
    { name: 'jwt_token_flow.png', size: '182KB' },
    { name: 'refresh_rotation_sequence.pdf', size: '340KB' },
  ],
  content: `## 개요

JWT(JSON Web Token)는 액세스 토큰과 리프레시 토큰 두 가지로 운영합니다.
TK-019 보안 패치 과정에서 기존 단일 토큰 구조의 취약점을 확인하고 이중 토큰 체계로 전환하면서 정립된 팀 표준입니다.

## 토큰 구조

**액세스 토큰**
- 만료 시간: 30분
- 저장 위치: 메모리 (sessionStorage 지양)
- Payload: userId, role, iat, exp

**리프레시 토큰**
- 만료 시간: 14일
- 저장 위치: HttpOnly Cookie (SameSite=Strict)
- DB에 해시값 저장 → 단일 사용 보장

## Refresh Token Rotation 패턴

리프레시 토큰 사용 시 항상 새 리프레시 토큰을 발급하고 기존 토큰을 즉시 무효화합니다.

1. 클라이언트가 /auth/refresh 호출 (리프레시 토큰 쿠키 포함)
2. 서버: DB에서 해시 일치 여부 확인
3. 일치하면 새 액세스 토큰 + 새 리프레시 토큰 발급
4. 기존 리프레시 토큰 DB에서 즉시 삭제
5. 불일치(탈취 의심) 시 해당 userId의 모든 리프레시 토큰 무효화

## 무효화 전략

- 로그아웃: DB에서 리프레시 토큰 삭제
- 강제 로그아웃(보안 사고): userId 기준 전체 토큰 삭제
- 액세스 토큰 조기 무효화: Redis 블랙리스트 활용 (TTL = 남은 만료 시간)

## 주의사항

- 액세스 토큰은 서버 상태를 가지지 않으므로 탈취 시 만료 전까지 사용 가능
- 민감 API는 추가 검증 레이어 고려
- 리프레시 토큰 Cookie 설정: Secure, HttpOnly, SameSite=Strict 필수

## 참고 링크

- RFC 7519 (JWT 표준): https://tools.ietf.org/html/rfc7519
- OWASP JWT Cheatsheet: https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html`,
}

const MOCK_COMMENTS = [
  { id: 1, author: '김개발', content: 'Redis 블랙리스트 TTL 설정할 때 토큰의 남은 만료 시간 계산을 Claims에서 꺼내면 편합니다. Jwts.parser().parseClaimsJws() 이후 getExpiration() 활용하세요.', createdAt: '2026-02-19 10:22' },
  { id: 2, author: '이설계', content: 'Rotation 패턴 적용 후 동시 요청(탭 여러 개) 시 race condition 주의가 필요합니다. DB 업데이트를 트랜잭션으로 묶고 낙관적 락 걸어두시면 좋아요.', createdAt: '2026-02-20 14:05' },
]

const MOCK_HISTORY = [
  { action: '내용 업데이트', detail: 'Redis 블랙리스트 섹션 추가', actor: '박테스터', at: '2026-02-19 09:30' },
  { action: '문서 등록', detail: '', actor: '박테스터', at: '2026-02-18 16:44' },
]

// ── 연관 역참조 (이 KB를 참고한 업무들) ─────────────────
const BACK_REFERENCES = [
  { docNo: 'TK-019', title: 'JWT 보안 취약점 패치', type: 'TK' },
  { docNo: 'DF-031', title: 'JWT 토큰 재발급 중 세션 무효화 오류', type: 'DF' },
]

const CATEGORY_STYLES: Record<KBCategory, string> = {
  '개발 가이드': 'bg-blue-50 text-blue-600',
  '아키텍처':   'bg-purple-50 text-purple-600',
  '트러블슈팅': 'bg-red-50 text-red-500',
  '온보딩':     'bg-emerald-50 text-emerald-700',
  '기타':       'bg-gray-100 text-gray-500',
}

const DOC_PREFIX_STYLE: Record<string, string> = {
  WR: 'bg-blue-50 text-blue-500',
  TK: 'bg-slate-100 text-slate-500',
  TS: 'bg-emerald-50 text-emerald-600',
  DF: 'bg-red-50 text-red-400',
  DP: 'bg-orange-50 text-orange-500',
}

export default function KnowledgeBaseDetailPage() {
  const navigate = useNavigate()
  const data = MOCK_DETAIL

  const [comment, setComment] = useState('')
  const [comments, setComments] = useState(MOCK_COMMENTS)

  const handleComment = () => {
    if (!comment.trim()) return
    setComments((prev) => [...prev, { id: Date.now(), author: '나', content: comment.trim(), createdAt: '방금 전' }])
    setComment('')
  }

  // 본문을 섹션별로 파싱해서 렌더링
  const renderContent = (text: string) => {
    const lines = text.split('\n')
    const elements: React.ReactNode[] = []
    let key = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={key++} className="text-[15px] font-bold text-gray-800 mt-6 mb-2 pb-1.5 border-b border-gray-100 first:mt-0">
            {line.slice(3)}
          </h2>
        )
      } else if (line.startsWith('**') && line.endsWith('**')) {
        elements.push(
          <p key={key++} className="text-[13px] font-semibold text-gray-700 mt-3 mb-1">
            {line.slice(2, -2)}
          </p>
        )
      } else if (line.startsWith('- ')) {
        elements.push(
          <div key={key++} className="flex items-start gap-2 text-[13px] text-gray-600 leading-relaxed">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
            <span>{line.slice(2)}</span>
          </div>
        )
      } else if (/^\d+\./.test(line)) {
        const num = line.match(/^(\d+)\./)?.[1]
        elements.push(
          <div key={key++} className="flex items-start gap-2 text-[13px] text-gray-600 leading-relaxed">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand/10 text-brand text-[10px] font-bold flex items-center justify-center mt-0.5">{num}</span>
            <span>{line.replace(/^\d+\.\s*/, '')}</span>
          </div>
        )
      } else if (line.trim() === '') {
        elements.push(<div key={key++} className="h-1" />)
      } else {
        elements.push(
          <p key={key++} className="text-[13px] text-gray-600 leading-relaxed">
            {line}
          </p>
        )
      }
    }
    return elements
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
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${CATEGORY_STYLES[data.category]}`}>
                {data.category}
              </span>
            </div>
            <h1 className="text-[20px] font-bold text-gray-900 leading-snug">{data.title}</h1>
          </div>
        </div>

        {/* 액션 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => navigate(`/knowledge-base/${data.id}/edit`)}
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
              <MetaItem label="작성자">
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-5 h-5 rounded-full bg-brand/10 text-brand text-[9px] font-bold flex items-center justify-center">
                    {data.author[0]}
                  </div>
                  <span className="text-[13px] text-gray-700 font-medium">{data.author}</span>
                </div>
              </MetaItem>
              <MetaItem label="등록일" value={data.createdAt} />
              <MetaItem label="최종 수정" value={data.updatedAt} />
              <MetaItem label="조회수">
                <div className="flex items-center gap-1 mt-0.5">
                  <EyeIcon />
                  <span className="text-[13px] text-gray-700 font-medium">{data.views + 1}</span>
                </div>
              </MetaItem>
            </div>
          </div>

          {/* 요약 */}
          <div className="bg-blue-50/50 rounded-xl border border-blue-100 px-5 py-4">
            <div className="flex items-center gap-1.5 mb-2">
              <SummaryIcon />
              <p className="text-[11px] font-semibold text-blue-500 uppercase tracking-wide">요약</p>
            </div>
            <p className="text-[13px] text-gray-700 leading-relaxed">{data.summary}</p>
          </div>

          {/* 기술 태그 */}
          <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-4">
            <p className="text-[12px] font-semibold text-gray-700 mb-3">기술 태그</p>
            <div className="flex flex-wrap gap-1.5">
              {data.tags.map((tag) => (
                <span key={tag} className="h-6 px-2.5 bg-brand/8 text-brand rounded-md text-[12px] font-medium border border-brand/15 flex items-center">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* 본문 */}
          <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-5 py-5">
            <p className="text-[12px] font-semibold text-gray-700 mb-4">본문</p>
            <div className="space-y-1.5">
              {renderContent(data.content)}
            </div>
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

          {/* 연관 문서 */}
          {data.relatedDocs.length > 0 && (
            <Section title="연관 문서">
              <div className="flex flex-wrap gap-2">
                {data.relatedDocs.map((d) => {
                  const prefix = d.docNo.split('-')[0]
                  const style = DOC_PREFIX_STYLE[prefix] ?? 'bg-gray-100 text-gray-500'
                  return (
                    <button
                      key={d.docNo}
                      onClick={() => navigate(-1)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:border-brand/40 hover:bg-blue-50/30 transition-colors group"
                    >
                      <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${style}`}>{d.docNo}</span>
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
        <div className="w-[240px] flex-shrink-0 space-y-4">

          {/* 이 문서를 참고한 업무 */}
          <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] p-4">
            <p className="text-[12px] font-semibold text-gray-700 mb-3">참고한 업무</p>
            {BACK_REFERENCES.length === 0 ? (
              <p className="text-[11px] text-gray-400">연결된 업무가 없습니다</p>
            ) : (
              <div className="space-y-2">
                {BACK_REFERENCES.map((ref) => {
                  const style = DOC_PREFIX_STYLE[ref.type] ?? 'bg-gray-100 text-gray-500'
                  return (
                    <button
                      key={ref.docNo}
                      onClick={() => navigate(-1)}
                      className="w-full flex items-start gap-2 text-left hover:bg-gray-50 rounded-lg p-1.5 -mx-1.5 transition-colors group"
                    >
                      <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${style}`}>{ref.docNo}</span>
                      <span className="text-[11px] text-gray-600 leading-snug group-hover:text-brand transition-colors line-clamp-2">{ref.title}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 수정 이력 */}
          <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] p-4">
            <p className="text-[12px] font-semibold text-gray-700 mb-4">수정 이력</p>
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
                      {h.detail && <p className="text-[10px] text-gray-400 mt-0.5">{h.detail}</p>}
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

function EyeIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M1.5 6.5C1.5 6.5 3.5 3 6.5 3C9.5 3 11.5 6.5 11.5 6.5C11.5 6.5 9.5 10 6.5 10C3.5 10 1.5 6.5 1.5 6.5Z" stroke="#9CA3AF" strokeWidth="1.2" /><circle cx="6.5" cy="6.5" r="1.5" stroke="#9CA3AF" strokeWidth="1.2" /></svg>
}

function SummaryIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M2 3.5H11M2 6.5H8M2 9.5H9.5" stroke="#3B82F6" strokeWidth="1.3" strokeLinecap="round" /></svg>
}

function FileIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M3 1H8L11 4V12H3V1Z" stroke="#9CA3AF" strokeWidth="1.2" strokeLinejoin="round" /><path d="M8 1V4H11" stroke="#9CA3AF" strokeWidth="1.2" strokeLinejoin="round" /></svg>
}

function DownloadIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M6.5 2V9M6.5 9L4 6.5M6.5 9L9 6.5" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /><path d="M2 11H11" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" /></svg>
}
