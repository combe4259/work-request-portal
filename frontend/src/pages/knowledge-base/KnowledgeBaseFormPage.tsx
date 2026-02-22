import { useState, useRef, useEffect } from 'react'
import type { KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { KBCategory } from '@/types/knowledge-base'
import { ChevronLeftIcon } from '@/components/common/Icons'

// ── 스키마 ──────────────────────────────────────────
const schema = z.object({
  title:    z.string().min(1, '제목을 입력해주세요').max(100),
  category: z.enum(['개발 가이드', '아키텍처', '트러블슈팅', '온보딩', '기타'] as const, { error: '카테고리를 선택해주세요' }),
  author:   z.string().min(1, '작성자를 선택해주세요'),
  summary:  z.string().min(1, '요약을 입력해주세요').max(300),
  content:  z.string().min(1, '본문을 입력해주세요'),
})

type FormValues = z.infer<typeof schema>

// ── 상수 ────────────────────────────────────────────
const CATEGORIES: KBCategory[] = ['개발 가이드', '아키텍처', '트러블슈팅', '온보딩', '기타']
const AUTHORS = ['김개발', '이설계', '박테스터', '최인프라']

const PRESET_TAGS = [
  'Spring Boot', 'JWT', 'Security', 'MySQL', 'JPA', 'Hibernate', 'QueryDSL',
  'Redis', 'React', 'TypeScript', 'Docker', 'AWS', 'Git', 'CI/CD',
  'Kafka', 'Kubernetes', 'Python', 'React Query',
]

const ALL_DOCS = [
  { docNo: 'WR-051', title: '모바일 PDA 화면 레이아웃 개선 요청' },
  { docNo: 'WR-049', title: '잔고 조회 API 응답 지연 버그 수정' },
  { docNo: 'WR-043', title: '외부 PG사 결제 모듈 연동' },
  { docNo: 'TK-021', title: 'AccountService 계층 분리 리팩토링' },
  { docNo: 'TK-020', title: '잔고 조회 N+1 성능 개선' },
  { docNo: 'TK-019', title: 'JWT 보안 취약점 패치' },
  { docNo: 'TK-016', title: '잔고 조회 Redis 캐시 적용' },
  { docNo: 'TK-015', title: '공통 에러 핸들러 모듈화' },
  { docNo: 'TK-014', title: 'SQL Injection 취약점 전수 점검' },
  { docNo: 'TS-018', title: '모바일 PDA 레이아웃 반응형 검증' },
  { docNo: 'TS-011', title: '잔고 조회 성능 회귀 테스트' },
  { docNo: 'TS-008', title: 'SQL Injection 침투 테스트' },
  { docNo: 'DF-031', title: 'JWT 토큰 재발급 중 세션 무효화 오류' },
  { docNo: 'DF-028', title: '결제 실패 시 재처리 누락 결함' },
  { docNo: 'DF-024', title: 'S3 한글 파일명 업로드 실패' },
  { docNo: 'DP-016', title: 'v2.2.5 긴급패치 권한 누락 수정' },
]

const DOC_PREFIX_STYLE: Record<string, string> = {
  WR: 'bg-blue-50 text-blue-500',
  TK: 'bg-slate-100 text-slate-500',
  TS: 'bg-emerald-50 text-emerald-600',
  DF: 'bg-red-50 text-red-400',
  DP: 'bg-orange-50 text-orange-500',
}

const CATEGORY_STYLES: Record<KBCategory, string> = {
  '개발 가이드': 'bg-blue-50 text-blue-600 border-blue-100',
  '아키텍처':   'bg-purple-50 text-purple-600 border-purple-100',
  '트러블슈팅': 'bg-red-50 text-red-500 border-red-100',
  '온보딩':     'bg-emerald-50 text-emerald-700 border-emerald-100',
  '기타':       'bg-gray-100 text-gray-500 border-gray-200',
}

// ── 스타일 헬퍼 ─────────────────────────────────────
const labelCls = 'block text-[12px] font-semibold text-gray-600 mb-1.5'
const inputCls = 'w-full h-9 px-3 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 bg-white'
const selectCls = 'w-full h-9 px-3 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 bg-white appearance-none cursor-pointer'
const textareaCls = 'w-full px-3 py-2.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 bg-white resize-none'
const errCls = 'mt-1 text-[11px] text-red-500'
const sectionCls = 'bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] p-5'

export default function KnowledgeBaseFormPage() {
  const navigate = useNavigate()

  // 기술 태그
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [customTagInput, setCustomTagInput] = useState('')

  // 연관 문서 (멀티셀렉트)
  const [relatedDocs, setRelatedDocs] = useState<{ docNo: string; title: string }[]>([])
  const [docSearch, setDocSearch] = useState('')
  const [docDropOpen, setDocDropOpen] = useState(false)
  const docRef = useRef<HTMLDivElement>(null)

  // 첨부파일
  const [fileList, setFileList] = useState<File[]>([])

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { author: '', category: undefined },
  })

  const summaryVal = watch('summary') ?? ''
  const contentVal = watch('content') ?? ''
  const selectedCategory = watch('category')

  // 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (docRef.current && !docRef.current.contains(e.target as Node)) setDocDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // 태그 토글
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  }

  // 커스텀 태그 추가
  const addCustomTag = () => {
    const v = customTagInput.trim()
    if (v && !selectedTags.includes(v)) {
      setSelectedTags((prev) => [...prev, v])
    }
    setCustomTagInput('')
  }

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); addCustomTag() }
  }

  // 연관 문서
  const filteredDocs = ALL_DOCS.filter(
    (d) => !relatedDocs.some((r) => r.docNo === d.docNo) &&
      (docSearch === '' || d.docNo.toLowerCase().includes(docSearch.toLowerCase()) || d.title.includes(docSearch))
  )

  const addDoc = (doc: { docNo: string; title: string }) => {
    setRelatedDocs((prev) => [...prev, doc])
    setDocSearch('')
    setDocDropOpen(false)
  }

  const removeDoc = (docNo: string) => setRelatedDocs((prev) => prev.filter((d) => d.docNo !== docNo))

  // 파일
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFileList((prev) => [...prev, ...Array.from(e.target.files!)])
  }

  const onSubmit = (data: FormValues) => {
    console.log({ ...data, tags: selectedTags, relatedDocs: relatedDocs.map((d) => d.docNo) })
    navigate('/knowledge-base')
  }

  return (
    <div className="min-h-full p-6 flex flex-col items-center">
      <div className="w-full max-w-[720px] space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/knowledge-base')}
          className="flex items-center gap-1 text-[13px] text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronLeftIcon />
          목록
        </button>
        <div className="w-px h-4 bg-gray-200" />
        <h1 className="text-[18px] font-bold text-gray-900">문서 등록</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* ── 기본 정보 ─────────────────────────────── */}
        <div className={sectionCls}>
          <h2 className="text-[13px] font-bold text-gray-700 mb-4">기본 정보</h2>

          {/* 제목 */}
          <div className="mb-4">
            <label className={labelCls}>제목 <span className="text-red-400">*</span></label>
            <input
              {...register('title')}
              placeholder="문서 제목을 입력해주세요"
              className={inputCls}
            />
            {errors.title && <p className={errCls}>{errors.title.message}</p>}
          </div>

          {/* 카테고리 + 작성자 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>카테고리 <span className="text-red-400">*</span></label>
              <div className="relative">
                <select {...register('category')} className={selectCls}>
                  <option value="">선택</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </div>
              {/* 선택된 카테고리 미리보기 */}
              {selectedCategory && (
                <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${CATEGORY_STYLES[selectedCategory as KBCategory]}`}>
                  {selectedCategory}
                </span>
              )}
              {errors.category && <p className={errCls}>{errors.category.message}</p>}
            </div>

            <div>
              <label className={labelCls}>작성자 <span className="text-red-400">*</span></label>
              <div className="relative">
                <select {...register('author')} className={selectCls}>
                  <option value="">선택</option>
                  {AUTHORS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </div>
              {errors.author && <p className={errCls}>{errors.author.message}</p>}
            </div>
          </div>
        </div>

        {/* ── 기술 태그 ─────────────────────────────── */}
        <div className={sectionCls}>
          <h2 className="text-[13px] font-bold text-gray-700 mb-3">기술 태그</h2>

          {/* 프리셋 태그 */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {PRESET_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`h-6 px-2 rounded-md text-[11px] font-medium transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-brand/10 text-brand border border-brand/20'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* 커스텀 태그 입력 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={customTagInput}
              onChange={(e) => setCustomTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="직접 입력 후 Enter 또는 추가 클릭"
              className={`${inputCls} flex-1`}
            />
            <button
              type="button"
              onClick={addCustomTag}
              disabled={!customTagInput.trim()}
              className="h-9 px-3 text-[12px] text-brand border border-brand/30 rounded-lg hover:bg-brand/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
            >
              추가
            </button>
          </div>

          {/* 선택된 태그 */}
          {selectedTags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
              <span className="text-[11px] text-gray-400 mr-1">선택됨</span>
              {selectedTags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 h-6 pl-2 pr-1 bg-brand/10 text-brand rounded-md text-[11px] font-medium border border-brand/20">
                  {tag}
                  <button
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className="text-brand/50 hover:text-brand transition-colors"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── 내용 ──────────────────────────────────── */}
        <div className={sectionCls}>
          <h2 className="text-[13px] font-bold text-gray-700 mb-4">내용</h2>

          {/* 요약 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className={`${labelCls} mb-0`}>요약 <span className="text-red-400">*</span></label>
              <span className={`text-[11px] ${summaryVal.length > 280 ? 'text-amber-500' : 'text-gray-400'}`}>
                {summaryVal.length} / 300
              </span>
            </div>
            <textarea
              {...register('summary')}
              rows={3}
              placeholder="문서 내용을 한두 문장으로 요약해주세요. 목록 화면에 표시됩니다."
              className={textareaCls}
            />
            {errors.summary && <p className={errCls}>{errors.summary.message}</p>}
          </div>

          {/* 본문 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={`${labelCls} mb-0`}>본문 <span className="text-red-400">*</span></label>
              <span className="text-[11px] text-gray-300">{contentVal.length}자</span>
            </div>
            <textarea
              {...register('content')}
              rows={14}
              placeholder={`마크다운 형식으로 작성하세요.\n\n## 개요\n...\n\n## 상세 내용\n...\n\n## 참고 링크\n- https://...`}
              className={`${textareaCls} font-mono text-[12px] leading-relaxed`}
            />
            {errors.content && <p className={errCls}>{errors.content.message}</p>}
          </div>
        </div>

        {/* ── 연관 문서 ─────────────────────────────── */}
        <div className={sectionCls}>
          <h2 className="text-[13px] font-bold text-gray-700 mb-3">연관 문서</h2>
          <p className="text-[11px] text-gray-400 mb-3">이 문서가 참고하거나 해결한 업무요청/기술과제/결함 등을 연결하면 상호 추적이 쉬워집니다.</p>

          {/* 연관 문서 선택된 칩 */}
          {relatedDocs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {relatedDocs.map((doc) => {
                const prefix = doc.docNo.split('-')[0]
                const style = DOC_PREFIX_STYLE[prefix] ?? 'bg-gray-100 text-gray-500'
                return (
                  <span key={doc.docNo} className={`flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-lg text-[12px] font-medium border border-current/10 ${style}`}>
                    <span className="font-mono text-[11px]">{doc.docNo}</span>
                    <span className="text-current/60 max-w-[120px] truncate">{doc.title}</span>
                    <button
                      type="button"
                      onClick={() => removeDoc(doc.docNo)}
                      className="opacity-50 hover:opacity-100 transition-opacity ml-0.5"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                    </button>
                  </span>
                )
              })}
            </div>
          )}

          {/* 연관 문서 검색 드롭다운 */}
          <div className="relative" ref={docRef}>
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.3" />
                <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={docSearch}
                onChange={(e) => { setDocSearch(e.target.value); setDocDropOpen(true) }}
                onFocus={() => setDocDropOpen(true)}
                placeholder="문서번호 또는 제목으로 검색 (WR, TK, TS, DF, DP)"
                className={`${inputCls} pl-8`}
              />
            </div>
            {docDropOpen && filteredDocs.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden max-h-48 overflow-y-auto">
                {filteredDocs.map((doc) => {
                  const prefix = doc.docNo.split('-')[0]
                  const style = DOC_PREFIX_STYLE[prefix] ?? 'bg-gray-100 text-gray-500'
                  return (
                    <button
                      key={doc.docNo}
                      type="button"
                      onClick={() => addDoc(doc)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-blue-50/50 transition-colors"
                    >
                      <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${style}`}>{doc.docNo}</span>
                      <span className="text-[12px] text-gray-700 truncate">{doc.title}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── 첨부파일 ──────────────────────────────── */}
        <div className={sectionCls}>
          <h2 className="text-[13px] font-bold text-gray-700 mb-3">첨부파일</h2>
          <label className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-brand/40 hover:bg-brand/5 transition-colors group">
            <input type="file" multiple className="hidden" onChange={handleFile} />
            <svg className="text-gray-300 group-hover:text-brand/40 transition-colors mb-1" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 3v10M6 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 14v1a2 2 0 002 2h10a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-[12px] text-gray-400 group-hover:text-brand/60 transition-colors">
              클릭하여 파일 첨부
            </span>
          </label>
          {fileList.length > 0 && (
            <ul className="mt-2 space-y-1">
              {fileList.map((f, i) => (
                <li key={i} className="flex items-center justify-between px-3 py-1.5 bg-gray-50 rounded-lg text-[12px] text-gray-600">
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setFileList((prev) => prev.filter((_, j) => j !== i))}
                    className="text-gray-400 hover:text-red-400 transition-colors ml-2 flex-shrink-0"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── 액션 버튼 ─────────────────────────────── */}
        <div className="flex justify-end gap-2 pb-6">
          <button
            type="button"
            onClick={() => navigate('/knowledge-base')}
            className="h-9 px-4 text-[13px] text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            className="h-9 px-5 bg-brand hover:bg-brand-hover text-white text-[13px] font-semibold rounded-lg transition-colors"
          >
            등록
          </button>
        </div>
      </form>
      </div>
    </div>
  )
}
