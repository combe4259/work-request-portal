import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Resource, ResourceCategory } from '@/types/resource'
import { PlusIcon, SearchIcon } from '@/components/common/Icons'
import { FilterSelect } from '@/components/common/TableControls'

// ── Mock 데이터 ───────────────────────────────────────
const SAMPLE: Resource[] = [
  {
    id: '1',
    title: 'PDA 업무요청 포털 UI 디자인',
    url: 'https://www.figma.com/design/example-pda-portal',
    category: 'Figma',
    description: '전체 화면 레이아웃, 컴포넌트 라이브러리, 색상 가이드 포함. 신한투자증권 PDA 포털 공식 디자인 파일.',
    registeredBy: '박디자인',
    createdAt: '2026-01-10',
  },
  {
    id: '2',
    title: '프론트엔드 소스 코드 저장소',
    url: 'https://github.com/example/work-request-portal',
    category: 'GitHub',
    description: 'React + TypeScript + Vite 기반 포털 프론트엔드. PR 가이드라인 및 브랜치 전략 README 참고.',
    registeredBy: '김개발',
    createdAt: '2026-01-12',
  },
  {
    id: '3',
    title: '업무 프로세스 가이드',
    url: 'https://confluence.example.com/pages/work-process',
    category: 'Confluence',
    description: '업무요청 접수부터 완료까지 표준 프로세스 정의. 승인 단계별 담당자 및 SLA 기준 포함.',
    registeredBy: '이설계',
    createdAt: '2026-01-15',
  },
  {
    id: '4',
    title: '기획 및 요구사항 문서',
    url: 'https://www.notion.so/example/requirements',
    category: 'Notion',
    description: '시스템 요구사항 정의서(SRS), 화면 기획서, 사용자 스토리 정리. 팀 전체 열람 가능.',
    registeredBy: '정기획',
    createdAt: '2026-01-20',
  },
  {
    id: '5',
    title: 'API 명세서 v2.1',
    url: 'https://confluence.example.com/pages/api-spec',
    category: 'Confluence',
    description: '업무요청·결함·배포 관련 REST API 엔드포인트 목록, 요청/응답 스키마, 인증 방식 안내.',
    registeredBy: '김개발',
    createdAt: '2026-02-01',
  },
  {
    id: '6',
    title: '테스트 계획서 2026 Q1',
    url: 'https://docs.example.com/test-plan-q1',
    category: '문서',
    description: '1분기 릴리즈 대상 기능 목록, 테스트 범위, 일정, 환경 구성 포함. 박테스터 담당.',
    registeredBy: '박테스터',
    createdAt: '2026-02-05',
  },
  {
    id: '7',
    title: '인프라 아키텍처 다이어그램',
    url: 'https://www.figma.com/design/example-infra',
    category: 'Figma',
    description: 'AWS 기반 서비스 구성도, 네트워크 토폴로지, 보안 그룹 설정 다이어그램.',
    registeredBy: '최인프라',
    createdAt: '2026-02-10',
  },
  {
    id: '8',
    title: '코딩 컨벤션 가이드',
    url: 'https://www.notion.so/example/coding-convention',
    category: 'Notion',
    description: 'TypeScript 스타일 가이드, 폴더 구조 규칙, 컴포넌트 네이밍, ESLint 설정 설명.',
    registeredBy: '김개발',
    createdAt: '2026-02-14',
  },
]

const CATEGORY_OPTIONS = ['전체', 'Figma', 'GitHub', 'Confluence', 'Notion', '문서', '기타']

// ── 카테고리별 스타일 ────────────────────────────────
const CATEGORY_STYLE: Record<ResourceCategory, { bg: string; text: string; icon: React.ReactNode }> = {
  Figma:      { bg: 'bg-pink-50',   text: 'text-pink-600',   icon: <FigmaIcon /> },
  GitHub:     { bg: 'bg-gray-100',  text: 'text-gray-700',   icon: <GithubIcon /> },
  Confluence: { bg: 'bg-blue-50',   text: 'text-blue-600',   icon: <ConfluenceIcon /> },
  Notion:     { bg: 'bg-slate-100', text: 'text-slate-700',  icon: <NotionIcon /> },
  '문서':     { bg: 'bg-indigo-50', text: 'text-indigo-600', icon: <DocFileIcon /> },
  '기타':     { bg: 'bg-gray-100',  text: 'text-gray-500',   icon: <LinkIcon /> },
}

function hostname(url: string) {
  try { return new URL(url).hostname } catch { return url }
}

export default function ResourcesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('전체')
  const [resources] = useState<Resource[]>(SAMPLE)

  const filtered = resources.filter((r) => {
    const q = search.toLowerCase()
    const matchSearch = !q || r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
    const matchCategory = filterCategory === '전체' || r.category === filterCategory
    return matchSearch && matchCategory
  })

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900">공유 리소스</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">총 {filtered.length}개</p>
        </div>
        <button
          onClick={() => navigate('/resources/new')}
          className="flex items-center gap-1.5 h-9 px-4 bg-brand text-white text-[13px] font-semibold rounded-lg hover:bg-brand-hover transition-colors"
        >
          <PlusIcon />
          리소스 등록
        </button>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-2 mb-5">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <SearchIcon />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="리소스 검색"
            className="h-8 pl-8 pr-3 text-[12px] border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-brand focus:bg-white transition-colors w-52"
          />
        </div>
        <FilterSelect value={filterCategory} onChange={setFilterCategory} options={CATEGORY_OPTIONS} placeholder="카테고리" />
      </div>

      {/* 카드 그리드 */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-[13px] text-gray-400">검색 결과가 없습니다.</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((r) => {
            const style = CATEGORY_STYLE[r.category]
            return (
              <div
                key={r.id}
                className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] p-5 flex flex-col group relative"
              >
                {/* 수정 버튼 */}
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/resources/${r.id}/edit`) }}
                  className="absolute top-4 right-4 w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-white hover:text-gray-600 hover:border-gray-300 transition-colors opacity-0 group-hover:opacity-100 bg-white z-10"
                  title="수정"
                >
                  <EditIcon />
                </button>

                {/* 클릭 영역 — 새 탭으로 열기 */}
                <button
                  onClick={() => window.open(r.url, '_blank', 'noopener,noreferrer')}
                  className="flex flex-col flex-1 text-left hover:cursor-pointer"
                >
                  {/* 카테고리 배지 */}
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${style.bg} ${style.text} w-fit mb-3`}>
                    {style.icon}
                    <span className="text-[11px] font-semibold">{r.category}</span>
                  </div>

                  {/* 제목 */}
                  <h3 className="text-[14px] font-semibold text-gray-900 leading-snug line-clamp-2 mb-2 group-hover:text-brand transition-colors pr-8">
                    {r.title}
                  </h3>

                  {/* 설명 */}
                  <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-2 flex-1">
                    {r.description}
                  </p>

                  {/* 하단 */}
                  <div className="border-t border-gray-100 mt-4 pt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ExternalLinkIcon />
                      <span className="text-[11px] text-gray-400 truncate">{hostname(r.url)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="w-4 h-4 rounded-full bg-brand/10 flex items-center justify-center text-brand text-[8px] font-bold">
                        {r.registeredBy[0]}
                      </div>
                      <span className="text-[11px] text-gray-400">{r.registeredBy}</span>
                    </div>
                  </div>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── 아이콘 ────────────────────────────────────────────
function FigmaIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 38 57" fill="none" aria-hidden="true">
      <path d="M19 28.5A9.5 9.5 0 1028.5 19 9.5 9.5 0 0019 28.5z" fill="currentColor" fillOpacity={0.8} />
      <path d="M9.5 57A9.5 9.5 0 009.5 38H19v9.5A9.5 9.5 0 019.5 57z" fill="currentColor" fillOpacity={0.6} />
      <path d="M9.5 28.5H19V9.5H9.5a9.5 9.5 0 000 19z" fill="currentColor" fillOpacity={0.6} />
      <path d="M9.5 9.5H19V0H9.5a9.5 9.5 0 000 19z" fill="currentColor" fillOpacity={0.9} />
      <path d="M19 0h9.5a9.5 9.5 0 010 19H19V0z" fill="currentColor" fillOpacity={0.7} />
    </svg>
  )
}

function GithubIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

function ConfluenceIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M1.5 16.5c3.5-5 8-7.5 14-7.5M22.5 7.5c-3.5 5-8 7.5-14 7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function NotionIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4.5 3h15a1.5 1.5 0 011.5 1.5v1l-2 1.5V21a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 015 21V7L3 5.5v-1A1.5 1.5 0 014.5 3zm3 5v9h9V8h-9zm1.5 1.5h6v1.5h-6V9.5zm0 3h6v1.5h-6V12.5z" />
    </svg>
  )
}

function DocFileIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 1h6l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M9 1v3h3M4.5 7.5h5M4.5 10h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M5.5 8.5a3.5 3.5 0 005 0l2-2a3.536 3.536 0 00-5-5l-1 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M8.5 5.5a3.5 3.5 0 00-5 0l-2 2a3.536 3.536 0 005 5l1-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <path d="M4.5 2H2a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1V6.5M6.5 1H10m0 0v3.5M10 1L5 6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M8.5 1.5l2 2L3 11H1V9L8.5 1.5zM7 3l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
