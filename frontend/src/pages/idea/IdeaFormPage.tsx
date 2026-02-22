import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// ── 스키마 ───────────────────────────────────────────
const schema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(100, '제목은 100자 이하이어야 합니다'),
  category: z.enum(['UX/UI', '기능', '인프라', '프로세스', '기타'] as const, { error: '카테고리를 선택해주세요' }),
  content: z.string().min(1, '아이디어 내용을 입력해주세요').max(3000),
})

type FormValues = z.infer<typeof schema>

const ALL_DOCS = [
  { docNo: 'WR-042', title: '계좌 개설 UI 개선 요청' },
  { docNo: 'WR-038', title: '잔고 조회 화면 UI 개선 요청' },
  { docNo: 'TK-109', title: '계좌 개설 API 연동 개발' },
  { docNo: 'TK-112', title: 'API 응답 성능 최적화' },
  { docNo: 'TS-017', title: '계좌 개설 프로세스 E2E 흐름 검증' },
  { docNo: 'DF-034', title: 'Galaxy S23에서 메인 메뉴 버튼이 화면 밖으로 이탈' },
]

export default function IdeaFormPage() {
  const navigate = useNavigate()

  // 기대 효과
  const [benefits, setBenefits] = useState<string[]>([])
  const [benefitInput, setBenefitInput] = useState('')

  // 연관 문서
  const [relatedDocs, setRelatedDocs] = useState<{ docNo: string; title: string }[]>([])
  const [docSearch, setDocSearch] = useState('')
  const [docDropOpen, setDocDropOpen] = useState(false)
  const docRef = useRef<HTMLDivElement>(null)

  // 첨부파일
  const [fileList, setFileList] = useState<File[]>([])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (docRef.current && !docRef.current.contains(e.target as Node)) setDocDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredDocs = ALL_DOCS.filter(
    (d) =>
      !relatedDocs.find((r) => r.docNo === d.docNo) &&
      (d.docNo.toLowerCase().includes(docSearch.toLowerCase()) || d.title.includes(docSearch))
  )

  const addDoc = (doc: { docNo: string; title: string }) => {
    setRelatedDocs((prev) => [...prev, doc])
    setDocSearch('')
    setDocDropOpen(false)
  }

  const addBenefit = () => {
    const t = benefitInput.trim()
    if (!t) return
    setBenefits((prev) => [...prev, t])
    setBenefitInput('')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFileList((prev) => [...prev, ...Array.from(e.target.files!)])
  }

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'UX/UI' },
  })

  const contentValue = watch('content') ?? ''

  const onSubmit = async (_data: FormValues) => {
    // TODO: API 연동
    navigate('/ideas')
  }

  return (
    <div className="min-h-full p-6 flex flex-col items-center">
      <div className="w-full max-w-[720px]">

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-white hover:text-gray-600 transition-colors border border-gray-200"
          >
            <BackIcon />
          </button>
          <div>
            <h1 className="text-[18px] font-bold text-gray-900">아이디어 제안</h1>
            <p className="text-[12px] text-gray-400 mt-0.5">팀에 새로운 아이디어를 제안합니다</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_12px_rgba(30,58,138,0.07)] p-6 space-y-5">

            {/* 제목 */}
            <FormField label="제목" required error={errors.title?.message}>
              <input
                {...register('title')}
                placeholder="아이디어 제목을 간결하게 입력해주세요"
                className={inputCls(!!errors.title)}
              />
            </FormField>

            {/* 카테고리 */}
            <FormField label="카테고리" required error={errors.category?.message}>
              <div className="flex gap-2 flex-wrap">
                {(['UX/UI', '기능', '인프라', '프로세스', '기타'] as const).map((cat) => {
                  const STYLES: Record<string, { active: string; inactive: string }> = {
                    'UX/UI':   { active: 'bg-blue-500 text-white border-blue-500', inactive: 'bg-blue-50 text-blue-600 border-blue-100 hover:border-blue-300' },
                    '기능':    { active: 'bg-emerald-500 text-white border-emerald-500', inactive: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:border-emerald-300' },
                    '인프라':  { active: 'bg-orange-500 text-white border-orange-500', inactive: 'bg-orange-50 text-orange-600 border-orange-100 hover:border-orange-300' },
                    '프로세스': { active: 'bg-purple-500 text-white border-purple-500', inactive: 'bg-purple-50 text-purple-600 border-purple-100 hover:border-purple-300' },
                    '기타':    { active: 'bg-gray-500 text-white border-gray-500', inactive: 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-400' },
                  }
                  // watch로 현재 선택값 확인을 위해 hidden radio 사용
                  return (
                    <label key={cat} className="cursor-pointer">
                      <input type="radio" {...register('category')} value={cat} className="sr-only" />
                      <span className={`inline-block px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-colors ${
                        watch('category') === cat ? STYLES[cat].active : STYLES[cat].inactive
                      }`}>
                        {cat}
                      </span>
                    </label>
                  )
                })}
              </div>
            </FormField>

            <div className="border-t border-gray-100" />

            {/* 아이디어 내용 */}
            <FormField label="아이디어 내용" required error={errors.content?.message}>
              <div className="relative">
                <textarea
                  {...register('content')}
                  placeholder={`어떤 문제를 해결하고 싶은지, 어떤 개선이 필요한지 자유롭게 작성해주세요.\n\n예) 현재 불편한 점, 개선 방향, 참고할 만한 사례 등`}
                  rows={6}
                  className={`${textareaCls(!!errors.content)} resize-none`}
                />
                <span className="absolute bottom-2.5 right-3 text-[11px] text-gray-300">{contentValue.length} / 3000</span>
              </div>
            </FormField>

            {/* 기대 효과 */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-gray-600 block">
                기대 효과
                <span className="ml-1 font-normal text-gray-400">(선택)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={benefitInput}
                  onChange={(e) => setBenefitInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBenefit() } }}
                  placeholder="기대되는 효과를 항목별로 입력 후 Enter"
                  className={`${inputCls(false)} flex-1`}
                />
                <button
                  type="button"
                  onClick={addBenefit}
                  disabled={!benefitInput.trim()}
                  className="h-9 px-3 border border-gray-200 rounded-lg text-[12px] text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-40 flex items-center gap-1"
                >
                  <PlusIcon />
                  추가
                </button>
              </div>
              {benefits.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {benefits.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg group">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-[12px] text-emerald-900 flex-1">{item}</span>
                      <button
                        type="button"
                        onClick={() => setBenefits((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-emerald-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-100" />

            {/* 연관 문서 */}
            <FormField label="연관 문서">
              <div ref={docRef} className="relative">
                <input
                  type="text"
                  value={docSearch}
                  onFocus={() => setDocDropOpen(true)}
                  onChange={(e) => { setDocSearch(e.target.value); setDocDropOpen(true) }}
                  placeholder="관련 업무요청, 기술과제 등 문서번호 검색"
                  className={inputCls(false)}
                />
                {docDropOpen && filteredDocs.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {filteredDocs.map((doc) => (
                      <button
                        key={doc.docNo}
                        type="button"
                        onMouseDown={() => addDoc(doc)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 transition-colors text-left"
                      >
                        <span className="font-mono text-[11px] text-gray-400 flex-shrink-0">{doc.docNo}</span>
                        <span className="text-[12px] text-gray-700 truncate">{doc.title}</span>
                      </button>
                    ))}
                  </div>
                )}
                {docDropOpen && filteredDocs.length === 0 && docSearch && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2.5 text-[12px] text-gray-400">
                    검색 결과가 없습니다
                  </div>
                )}
              </div>
              {relatedDocs.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {relatedDocs.map((doc) => (
                    <span key={doc.docNo} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[11px] font-mono">
                      {doc.docNo}
                      <button
                        type="button"
                        onClick={() => setRelatedDocs((prev) => prev.filter((d) => d.docNo !== doc.docNo))}
                        className="text-blue-400 hover:text-blue-600"
                      >
                        <CloseIcon />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </FormField>

            {/* 첨부파일 */}
            <div className="space-y-2">
              <label className="text-[12px] font-semibold text-gray-600 block">
                첨부파일
                <span className="ml-1 font-normal text-gray-400">(선택)</span>
              </label>
              <label className="flex items-center gap-2 w-fit cursor-pointer">
                <div className="flex items-center gap-1.5 h-8 px-3 border border-gray-200 rounded-lg text-[12px] text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors">
                  <AttachIcon />
                  파일 첨부
                </div>
                <input type="file" multiple className="hidden" onChange={handleFileChange} />
              </label>
              {fileList.length > 0 && (
                <div className="space-y-1.5">
                  {fileList.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                      <FileIcon />
                      <span className="text-[12px] text-gray-700 flex-1 truncate">{file.name}</span>
                      <span className="text-[11px] text-gray-400">{formatFileSize(file.size)}</span>
                      <button
                        type="button"
                        onClick={() => setFileList((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-gray-300 hover:text-red-400 transition-colors ml-1"
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex items-center justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="h-9 px-4 text-[13px] font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-white transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-5 text-[13px] font-semibold text-white bg-brand hover:bg-brand-hover rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {isSubmitting ? <><SpinnerIcon />제안 중...</> : '아이디어 제안'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── 폼 필드 래퍼 ─────────────────────────────────────
function FormField({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-semibold text-gray-600 block">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
}

// ── 스타일 헬퍼 ──────────────────────────────────────
const inputCls = (hasError: boolean) =>
  `w-full h-9 px-3 text-[13px] border rounded-lg focus:outline-none focus:ring-1 transition-colors ${
    hasError ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-gray-200 focus:border-brand focus:ring-brand/20'
  }`

const textareaCls = (hasError: boolean) =>
  `w-full px-3 py-2.5 text-[13px] border rounded-lg focus:outline-none focus:ring-1 transition-colors ${
    hasError ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-gray-200 focus:border-brand focus:ring-brand/20'
  }`

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

// ── SVG 아이콘 ────────────────────────────────────────
function BackIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M9 2.5L5 7L9 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function PlusIcon() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"><line x1="5.5" y1="1.5" x2="5.5" y2="9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><line x1="1.5" y1="5.5" x2="9.5" y2="5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
}
function CloseIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
}
function AttachIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M11 6.5L6.5 11C5.12 12.38 2.88 12.38 1.5 11C0.12 9.62 0.12 7.38 1.5 6L6 1.5C6.94 0.56 8.44 0.56 9.38 1.5C10.32 2.44 10.32 3.94 9.38 4.88L4.88 9.38C4.41 9.85 3.65 9.85 3.18 9.38C2.71 8.91 2.71 8.15 3.18 7.68L7.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
}
function FileIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M3 1H8L11 4V12H3V1Z" stroke="#9CA3AF" strokeWidth="1.2" strokeLinejoin="round" /><path d="M8 1V4H11" stroke="#9CA3AF" strokeWidth="1.2" strokeLinejoin="round" /></svg>
}
function SpinnerIcon() {
  return <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
}
