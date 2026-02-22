import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CategoryBadge, IdeaStatusBadge } from '@/components/idea/Badges'
import { FilterSelect } from '@/components/common/TableControls'
import { PlusIcon, SearchIcon } from '@/components/common/Icons'
import type { IdeaCategory, IdeaStatus } from '@/types/idea'

// ── Mock 데이터 ───────────────────────────────────────
const SAMPLE_DATA = [
  {
    id: '1', docNo: 'ID-001',
    title: '마이페이지 계좌 잔고 실시간 자동 갱신',
    category: 'UX/UI' as IdeaCategory, status: '채택' as IdeaStatus,
    content: '일정 주기로 잔고를 자동 갱신하여 새로고침 없이도 최신 잔액을 확인할 수 있도록 개선합니다. 특히 당일 거래가 많은 시간대에 유용합니다.',
    proposer: '박요청', likes: 24, commentCount: 5, createdAt: '2026-01-15',
  },
  {
    id: '2', docNo: 'ID-002',
    title: '거래내역 엑셀/PDF 내보내기 기능 추가',
    category: '기능' as IdeaCategory, status: '검토중' as IdeaStatus,
    content: '월별 거래내역을 엑셀 또는 PDF 형식으로 내보낼 수 있는 기능을 추가합니다. 세금 신고 시즌에 특히 수요가 높습니다.',
    proposer: '최요청', likes: 19, commentCount: 3, createdAt: '2026-01-22',
  },
  {
    id: '3', docNo: 'ID-003',
    title: 'CI/CD 파이프라인 빌드 시간 단축',
    category: '인프라' as IdeaCategory, status: '검토중' as IdeaStatus,
    content: '현재 평균 12분 소요되는 빌드 시간을 캐싱 전략 개선 및 병렬 빌드 적용으로 5분 이내로 줄입니다. 개발 생산성 향상이 기대됩니다.',
    proposer: '김개발', likes: 15, commentCount: 2, createdAt: '2026-01-28',
  },
  {
    id: '4', docNo: 'ID-004',
    title: '업무요청 승인 프로세스 단계 축소',
    category: '프로세스' as IdeaCategory, status: '보류' as IdeaStatus,
    content: '현재 3단계 승인 프로세스를 2단계로 줄여 처리 속도를 높입니다. 긴급 업무의 경우 패스트트랙 단일 승인 경로도 검토합니다.',
    proposer: '이설계', likes: 11, commentCount: 4, createdAt: '2026-02-03',
  },
  {
    id: '5', docNo: 'ID-005',
    title: '다크모드 UI 지원',
    category: 'UX/UI' as IdeaCategory, status: '제안됨' as IdeaStatus,
    content: '야간 작업이 많은 개발자/운영팀을 위해 다크모드를 지원합니다. Tailwind의 dark: 유틸리티를 활용하면 구현 비용이 크지 않습니다.',
    proposer: '박디자인', likes: 31, commentCount: 7, createdAt: '2026-02-08',
  },
  {
    id: '6', docNo: 'ID-006',
    title: '공통 에러 핸들링 모듈 표준화',
    category: '인프라' as IdeaCategory, status: '채택' as IdeaStatus,
    content: '각 서비스마다 중복 구현된 에러 처리 로직을 공통 모듈로 표준화합니다. 에러 로깅, 사용자 메시지, 재시도 정책을 일원화합니다.',
    proposer: '김개발', likes: 13, commentCount: 1, createdAt: '2026-02-11',
  },
  {
    id: '7', docNo: 'ID-007',
    title: '잔고 조회 화면 즐겨찾기 계좌 핀 기능',
    category: 'UX/UI' as IdeaCategory, status: '검토중' as IdeaStatus,
    content: '자주 확인하는 계좌를 상단에 고정(핀)할 수 있는 기능을 추가합니다. 드래그로 순서 변경도 가능하게 합니다.',
    proposer: '박요청', likes: 18, commentCount: 2, createdAt: '2026-02-15',
  },
  {
    id: '8', docNo: 'ID-008',
    title: '테스트 자동화 커버리지 80% 목표 수립',
    category: '프로세스' as IdeaCategory, status: '제안됨' as IdeaStatus,
    content: '현재 약 35%인 단위 테스트 커버리지를 분기별 목표를 세워 80%까지 끌어올립니다. 스프린트마다 테스트 작성을 의무화합니다.',
    proposer: '이테스터', likes: 9, commentCount: 3, createdAt: '2026-02-18',
  },
  {
    id: '9', docNo: 'ID-009',
    title: '모바일 앱 생체인증(FaceID/지문) 로그인',
    category: '기능' as IdeaCategory, status: '기각' as IdeaStatus,
    content: '모바일 환경에서 생체인증을 통한 간편 로그인을 지원합니다. 보안성을 유지하면서도 로그인 마찰을 최소화합니다.',
    proposer: '최설계', likes: 6, commentCount: 1, createdAt: '2026-02-20',
  },
]

const CATEGORY_OPTIONS: string[] = ['전체', 'UX/UI', '기능', '인프라', '프로세스', '기타']
const STATUS_OPTIONS: string[] = ['전체', '제안됨', '검토중', '채택', '보류', '기각']
const SORT_OPTIONS: string[] = ['최신순', '좋아요순']

export default function IdeasPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('전체')
  const [filterStatus, setFilterStatus] = useState('전체')
  const [sort, setSort] = useState('최신순')
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())

  const toggleLike = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setLikedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filtered = SAMPLE_DATA
    .filter((idea) => {
      const q = search.toLowerCase()
      const matchSearch = !q || idea.title.toLowerCase().includes(q) || idea.content.toLowerCase().includes(q)
      const matchCategory = filterCategory === '전체' || idea.category === filterCategory
      const matchStatus = filterStatus === '전체' || idea.status === filterStatus
      return matchSearch && matchCategory && matchStatus
    })
    .sort((a, b) => {
      if (sort === '좋아요순') return b.likes - a.likes
      return b.createdAt.localeCompare(a.createdAt)
    })

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900">아이디어 보드</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">총 {filtered.length}건</p>
        </div>
        <button
          onClick={() => navigate('/ideas/new')}
          className="flex items-center gap-1.5 h-9 px-4 bg-brand text-white text-[13px] font-semibold rounded-lg hover:bg-brand-hover transition-colors"
        >
          <PlusIcon />
          아이디어 제안
        </button>
      </div>

      {/* 필터 바 */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <SearchIcon />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="아이디어 검색"
            className="h-8 pl-8 pr-3 text-[12px] border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-brand focus:bg-white transition-colors w-52"
          />
        </div>
        <FilterSelect value={filterCategory} onChange={setFilterCategory} options={CATEGORY_OPTIONS} placeholder="카테고리" />
        <FilterSelect value={filterStatus} onChange={setFilterStatus} options={STATUS_OPTIONS} placeholder="상태" />
        <div className="flex items-center gap-1 ml-auto bg-gray-100 rounded-lg p-0.5">
          {SORT_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`h-7 px-3 text-[12px] rounded-md font-medium transition-colors ${
                sort === s ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {s === '최신순' ? '🕐 최신순' : '❤️ 좋아요순'}
            </button>
          ))}
        </div>
      </div>

      {/* 카드 그리드 */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-[13px] text-gray-400">검색 결과가 없습니다.</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((idea) => {
            const liked = likedIds.has(idea.id)
            const likeCount = idea.likes + (liked ? 1 : 0)
            return (
              <div
                key={idea.id}
                onClick={() => navigate(`/ideas/${idea.id}`)}
                className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] p-5 cursor-pointer hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(30,58,138,0.12)] transition-all duration-200 flex flex-col"
              >
                {/* 배지 */}
                <div className="flex items-center gap-2 mb-3">
                  <CategoryBadge category={idea.category} />
                  <IdeaStatusBadge status={idea.status} />
                </div>

                {/* 제목 */}
                <h3 className="text-[14px] font-semibold text-gray-900 leading-snug line-clamp-2 mb-2">
                  {idea.title}
                </h3>

                {/* 내용 미리보기 */}
                <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-3 flex-1">
                  {idea.content}
                </p>

                {/* 구분선 + 하단 */}
                <div className="border-t border-gray-100 mt-4 pt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-brand/10 flex items-center justify-center text-brand text-[9px] font-bold">
                      {idea.proposer[0]}
                    </div>
                    <span className="text-[11px] text-gray-400">{idea.proposer}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => toggleLike(e, idea.id)}
                      className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${
                        liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
                      }`}
                    >
                      <HeartIcon filled={liked} />
                      {likeCount}
                    </button>
                    <span className="flex items-center gap-1 text-[11px] text-gray-400">
                      <CommentIcon />
                      {idea.commentCount}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── 아이콘 ────────────────────────────────────────────
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

function CommentIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M1.5 2h10a.5.5 0 01.5.5v7a.5.5 0 01-.5.5H3.5L1 12.5V2.5a.5.5 0 01.5-.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}
