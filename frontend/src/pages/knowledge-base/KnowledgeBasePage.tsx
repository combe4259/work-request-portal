import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { KBArticle, KBCategory } from '@/types/knowledge-base'
import { PlusIcon, SearchIcon } from '@/components/common/Icons'

// ── 샘플 데이터 ───────────────────────────────────────
const SAMPLE_DATA: KBArticle[] = [
  {
    id: '1', docNo: 'KB-018',
    title: 'JWT 액세스/리프레시 토큰 설계 가이드',
    category: '개발 가이드',
    tags: ['Spring Boot', 'JWT', 'Security'],
    summary: 'JWT 토큰 발급·갱신·무효화 전략과 Refresh Token Rotation 패턴 적용 방법을 정리합니다. TK-019 보안 패치 과정에서 정립된 내용입니다.',
    author: '박테스터',
    relatedDocs: ['TK-019', 'DF-031'],
    createdAt: '2026-02-18', updatedAt: '2026-02-19', views: 87,
  },
  {
    id: '2', docNo: 'KB-017',
    title: 'Service Layer 분리 패턴 — 계층형 아키텍처',
    category: '아키텍처',
    tags: ['Spring Boot', 'Clean Architecture', 'DIP'],
    summary: 'Controller → Service → Repository 레이어 분리 원칙과 의존성 방향 설계. AccountService 리팩토링(TK-021) 과정에서 수립한 팀 표준입니다.',
    author: '김개발',
    relatedDocs: ['TK-021', 'TK-015'],
    createdAt: '2026-02-12', updatedAt: '2026-02-20', views: 64,
  },
  {
    id: '3', docNo: 'KB-016',
    title: 'N+1 쿼리 탐지 및 해결 방법',
    category: '트러블슈팅',
    tags: ['JPA', 'Hibernate', 'QueryDSL', 'MySQL'],
    summary: '잔고 조회 API에서 발생한 N+1 문제 원인 분석과 Fetch Join, BatchSize, EntityGraph를 활용한 해결 방법을 단계별로 설명합니다.',
    author: '이설계',
    relatedDocs: ['TK-020', 'TS-011'],
    createdAt: '2026-02-10', updatedAt: '2026-02-10', views: 112,
  },
  {
    id: '4', docNo: 'KB-015',
    title: '로컬 개발 환경 세팅 가이드 (Mac/Windows)',
    category: '온보딩',
    tags: ['Java 17', 'Docker', 'MySQL', 'Redis'],
    summary: '신규 팀원을 위한 개발 환경 구성 가이드. JDK 17, Docker Compose, IntelliJ 설정, 로컬 DB 마이그레이션까지 전 과정을 다룹니다.',
    author: '최인프라',
    relatedDocs: [],
    createdAt: '2026-01-15', updatedAt: '2026-02-05', views: 203,
  },
  {
    id: '5', docNo: 'KB-014',
    title: 'Redis 캐시 전략 — TTL 설계와 Cache-Aside 패턴',
    category: '아키텍처',
    tags: ['Redis', 'Cache', 'Spring Cache'],
    summary: '조회 성능 개선을 위한 Redis 캐시 도입 시 TTL 정책, 캐시 무효화 전략, 분산 환경에서의 고려사항을 정리합니다.',
    author: '이설계',
    relatedDocs: ['TK-016'],
    createdAt: '2026-02-08', updatedAt: '2026-02-08', views: 55,
  },
  {
    id: '6', docNo: 'KB-013',
    title: 'Git 브랜치 전략 및 PR 규칙',
    category: '개발 가이드',
    tags: ['Git', 'GitHub', 'CI/CD'],
    summary: 'main/develop/feature/hotfix 브랜치 전략, 커밋 메시지 컨벤션, PR 템플릿, 코드 리뷰 기준을 정의합니다.',
    author: '김개발',
    relatedDocs: [],
    createdAt: '2026-01-10', updatedAt: '2026-01-20', views: 178,
  },
  {
    id: '7', docNo: 'KB-012',
    title: 'SQL Injection 방어 체크리스트',
    category: '개발 가이드',
    tags: ['Security', 'MySQL', 'JPA'],
    summary: 'PreparedStatement 사용, JPA JPQL/Criteria 안전 작성법, 동적 쿼리 시 주의사항. TK-014 전수 점검 결과를 기반으로 작성합니다.',
    author: '박테스터',
    relatedDocs: ['TK-014', 'TS-008'],
    createdAt: '2026-02-11', updatedAt: '2026-02-11', views: 91,
  },
  {
    id: '8', docNo: 'KB-011',
    title: 'AWS S3 파일 업로드 처리 패턴',
    category: '아키텍처',
    tags: ['AWS', 'S3', 'Spring Boot'],
    summary: 'Pre-signed URL 방식 vs 서버 직접 업로드 방식 비교, 한글 파일명 인코딩 처리, 파일 크기 제한 설정 방법을 다룹니다.',
    author: '최인프라',
    relatedDocs: ['WR-048', 'DF-024'],
    createdAt: '2026-02-16', updatedAt: '2026-02-16', views: 43,
  },
  {
    id: '9', docNo: 'KB-010',
    title: '운영 배포 체크리스트 및 절차',
    category: '온보딩',
    tags: ['CI/CD', 'GitHub Actions', 'Docker'],
    summary: '운영 배포 전 확인 사항, 배포 순서, 헬스체크 방법, 롤백 절차를 단계별로 정리합니다. 신규 인프라 담당자 필독.',
    author: '최인프라',
    relatedDocs: ['DP-016'],
    createdAt: '2026-01-20', updatedAt: '2026-02-21', views: 156,
  },
  {
    id: '10', docNo: 'KB-009',
    title: 'React Query 서버 상태 관리 패턴',
    category: '개발 가이드',
    tags: ['React', 'TanStack Query', 'TypeScript'],
    summary: 'useQuery, useMutation 사용 패턴, 캐시 무효화 전략, Optimistic Update 구현 방법, 에러 처리 패턴을 예시 코드와 함께 설명합니다.',
    author: '김개발',
    relatedDocs: [],
    createdAt: '2026-02-01', updatedAt: '2026-02-01', views: 67,
  },
  {
    id: '11', docNo: 'KB-008',
    title: '공통 에러 핸들러 및 예외 처리 표준',
    category: '아키텍처',
    tags: ['Spring Boot', 'Exception', '@ControllerAdvice'],
    summary: '글로벌 예외 처리 구조, 커스텀 에러 코드 체계, 클라이언트 응답 포맷 표준화. TK-015 공통 에러 핸들러 모듈화 결과물입니다.',
    author: '김개발',
    relatedDocs: ['TK-015'],
    createdAt: '2026-02-15', updatedAt: '2026-02-15', views: 78,
  },
  {
    id: '12', docNo: 'KB-007',
    title: '외부 PG사 결제 연동 가이드',
    category: '기타',
    tags: ['결제', 'API 연동', 'Webhook'],
    summary: '결제 모듈 연동 흐름, 웹훅 수신 처리, 결제 실패 재처리 로직, 테스트 환경 세팅 방법을 정리합니다.',
    author: '이설계',
    relatedDocs: ['WR-043', 'DF-028'],
    createdAt: '2026-01-25', updatedAt: '2026-01-25', views: 89,
  },
]

const CATEGORIES: KBCategory[] = ['개발 가이드', '아키텍처', '트러블슈팅', '온보딩', '기타']

const CATEGORY_STYLES: Record<KBCategory, string> = {
  '개발 가이드': 'bg-blue-50 text-blue-600',
  '아키텍처':   'bg-purple-50 text-purple-600',
  '트러블슈팅': 'bg-red-50 text-red-500',
  '온보딩':     'bg-emerald-50 text-emerald-700',
  '기타':       'bg-gray-100 text-gray-500',
}

// 전체 태그 목록 (빈도순)
const ALL_TAGS = ['Spring Boot', 'JWT', 'Security', 'MySQL', 'JPA', 'Redis', 'React', 'Docker', 'AWS', 'Git', 'CI/CD', 'TypeScript']

export default function KnowledgeBasePage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<KBCategory | '전체'>('전체')
  const [activeTags, setActiveTags] = useState<string[]>([])

  const filtered = SAMPLE_DATA.filter((a) => {
    const matchSearch = search === '' ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.summary.includes(search) ||
      a.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())) ||
      a.docNo.includes(search)
    const matchCategory = activeCategory === '전체' || a.category === activeCategory
    const matchTags = activeTags.length === 0 || activeTags.every((t) => a.tags.includes(t))
    return matchSearch && matchCategory && matchTags
  })

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  }

  return (
    <div className="p-6 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-gray-900">지식 베이스</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">업무와 연결된 기술 문서 {filtered.length}건</p>
        </div>
        <button
          onClick={() => navigate('/knowledge-base/new')}
          className="flex items-center gap-1.5 h-8 px-3 bg-brand hover:bg-brand-hover text-white text-[13px] font-semibold rounded-lg transition-colors"
        >
          <PlusIcon />
          문서 등록
        </button>
      </div>

      {/* 검색 + 카테고리 탭 */}
      <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-4 py-3 space-y-3">
        {/* 검색 */}
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"><SearchIcon /></span>
          <input
            type="text"
            placeholder="제목, 내용, 태그, 문서번호 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 bg-gray-50"
          />
        </div>

        {/* 카테고리 탭 */}
        <div className="flex items-center gap-1 flex-wrap">
          {(['전체', ...CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`h-7 px-3 rounded-lg text-[12px] font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-brand text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {cat}
              {cat !== '전체' && (
                <span className="ml-1 text-[10px] opacity-70">
                  {SAMPLE_DATA.filter((a) => a.category === cat).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 기술 태그 필터 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-gray-400 font-medium mr-1">태그</span>
          {ALL_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`h-6 px-2 rounded-md text-[11px] font-medium transition-colors ${
                activeTags.includes(tag)
                  ? 'bg-brand/10 text-brand border border-brand/20'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {tag}
            </button>
          ))}
          {activeTags.length > 0 && (
            <button
              onClick={() => setActiveTags([])}
              className="h-6 px-2 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {/* 카드 그리드 */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-blue-50 py-16 text-center text-[13px] text-gray-400">
          검색 결과가 없습니다
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((article) => (
            <KBCard
              key={article.id}
              article={article}
              onClick={() => navigate(`/knowledge-base/${article.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── KB 카드 ───────────────────────────────────────────
function KBCard({ article, onClick }: { article: KBArticle; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] p-4 cursor-pointer hover:shadow-[0_4px_16px_rgba(30,58,138,0.1)] hover:border-brand/20 transition-all group flex flex-col gap-3"
    >
      {/* 상단: 카테고리 + 문서번호 */}
      <div className="flex items-center justify-between">
        <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold ${CATEGORY_STYLES[article.category]}`}>
          {article.category}
        </span>
        <span className="font-mono text-[10px] text-gray-300">{article.docNo}</span>
      </div>

      {/* 제목 */}
      <h3 className="text-[14px] font-bold text-gray-800 leading-snug group-hover:text-brand transition-colors line-clamp-2">
        {article.title}
      </h3>

      {/* 요약 */}
      <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-2 flex-1">
        {article.summary}
      </p>

      {/* 기술 태그 */}
      <div className="flex flex-wrap gap-1">
        {article.tags.map((tag) => (
          <span key={tag} className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-medium">
            {tag}
          </span>
        ))}
      </div>

      {/* 연관 작업 */}
      {article.relatedDocs.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <LinkIcon />
          {article.relatedDocs.map((doc) => (
            <span key={doc} className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
              doc.startsWith('TK') ? 'bg-slate-100 text-slate-500' :
              doc.startsWith('DF') ? 'bg-red-50 text-red-400' :
              doc.startsWith('DP') ? 'bg-blue-50 text-blue-500' :
              'bg-blue-50 text-blue-500'
            }`}>
              {doc}
            </span>
          ))}
        </div>
      )}

      {/* 하단: 작성자 + 날짜 + 조회수 */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-50">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-brand/10 text-brand text-[9px] font-bold flex items-center justify-center">
            {article.author[0]}
          </div>
          <span className="text-[11px] text-gray-500">{article.author}</span>
          <span className="text-[10px] text-gray-300">·</span>
          <span className="text-[11px] text-gray-400">{article.updatedAt.slice(5)}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-300">
          <EyeIcon />
          <span className="text-[11px]">{article.views}</span>
        </div>
      </div>
    </div>
  )
}

// ── SVG 아이콘 ────────────────────────────────────────
function LinkIcon() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"><path d="M4.5 6.5C4.83 6.83 5.28 7 5.75 7C6.22 7 6.67 6.83 7 6.5L8.5 5C9.17 4.33 9.17 3.27 8.5 2.6C7.83 1.93 6.77 1.93 6.1 2.6L5.5 3.2" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" /></svg>
}

function EyeIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M1 6C1 6 2.5 3 6 3C9.5 3 11 6 11 6C11 6 9.5 9 6 9C2.5 9 1 6 1 6Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" /><circle cx="6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.1" /></svg>
}
