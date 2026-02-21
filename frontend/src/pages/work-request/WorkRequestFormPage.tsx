import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// ── 스키마 ──────────────────────────────────────────
const schema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(100, '제목은 100자 이하이어야 합니다'),
  type: z.enum(['기능개선', '신규개발', '버그수정', '인프라', '기타'] as const, { error: '유형을 선택해주세요' }),
  priority: z.enum(['긴급', '높음', '보통', '낮음'] as const, { error: '우선순위를 선택해주세요' }),
  deadline: z.string().min(1, '마감일을 선택해주세요'),
  assignee: z.string().optional(),
  background: z.string().max(500, '500자 이하이어야 합니다').optional(),
  description: z.string().min(1, '내용을 입력해주세요').max(2000, '내용은 2000자 이하이어야 합니다'),
})

type FormValues = z.infer<typeof schema>

// ── 담당자 샘플 ──────────────────────────────────────
const ASSIGNEES = ['미배정', '김개발', '이설계', '박테스터', '최인프라']

// ── 연관 문서 샘플 ────────────────────────────────────
const ALL_DOCS = [
  { docNo: 'WR-051', title: '모바일 PDA 화면 레이아웃 개선 요청' },
  { docNo: 'WR-050', title: '신규 계좌 개설 프로세스 자동화' },
  { docNo: 'WR-049', title: '잔고 조회 API 응답 지연 버그 수정' },
  { docNo: 'WR-048', title: 'AWS S3 스토리지 용량 확장' },
  { docNo: 'WR-047', title: '로그인 세션 만료 시간 정책 변경' },
  { docNo: 'WR-046', title: '주문 내역 엑셀 다운로드 기능 추가' },
  { docNo: 'WR-045', title: '고객 알림 푸시 발송 로직 개선' },
]

export default function WorkRequestFormPage() {
  const navigate = useNavigate()
  const [fileList, setFileList] = useState<File[]>([])
  const [relatedDocs, setRelatedDocs] = useState<{ docNo: string; title: string }[]>([])
  const [docSearch, setDocSearch] = useState('')
  const [docDropOpen, setDocDropOpen] = useState(false)
  const docRef = useRef<HTMLDivElement>(null)

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (docRef.current && !docRef.current.contains(e.target as Node)) {
        setDocDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredDocs = ALL_DOCS.filter(
    (d) =>
      !relatedDocs.find((r) => r.docNo === d.docNo) &&
      (d.docNo.toLowerCase().includes(docSearch.toLowerCase()) ||
        d.title.includes(docSearch))
  )

  const addDoc = (doc: { docNo: string; title: string }) => {
    setRelatedDocs((prev) => [...prev, doc])
    setDocSearch('')
    setDocDropOpen(false)
  }

  const removeDoc = (docNo: string) => {
    setRelatedDocs((prev) => prev.filter((d) => d.docNo !== docNo))
  }

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { priority: '보통', type: '기능개선' },
  })

  const descValue = watch('description') ?? ''

  const onSubmit = async (_data: FormValues) => {
    // TODO: API 연동
    navigate('/work-requests')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFileList((prev) => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const removeFile = (idx: number) => {
    setFileList((prev) => prev.filter((_, i) => i !== idx))
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
          <h1 className="text-[18px] font-bold text-gray-900">업무요청 등록</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">새로운 업무요청을 등록합니다</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_12px_rgba(30,58,138,0.07)] p-6 space-y-5">

          {/* 제목 */}
          <FormField label="제목" required error={errors.title?.message}>
            <input
              {...register('title')}
              placeholder="업무요청 제목을 입력해주세요"
              className={inputCls(!!errors.title)}
            />
          </FormField>

          {/* 유형 · 우선순위 · 마감일 */}
          <div className="grid grid-cols-3 gap-4">
            <FormField label="유형" required error={errors.type?.message}>
              <select {...register('type')} className={selectCls(!!errors.type)}>
                <option value="기능개선">기능개선</option>
                <option value="신규개발">신규개발</option>
                <option value="버그수정">버그수정</option>
                <option value="인프라">인프라</option>
                <option value="기타">기타</option>
              </select>
            </FormField>

            <FormField label="우선순위" required error={errors.priority?.message}>
              <select {...register('priority')} className={selectCls(!!errors.priority)}>
                <option value="긴급">긴급</option>
                <option value="높음">높음</option>
                <option value="보통">보통</option>
                <option value="낮음">낮음</option>
              </select>
            </FormField>

            <FormField label="마감일" required error={errors.deadline?.message}>
              <input
                type="date"
                {...register('deadline')}
                min={new Date().toISOString().split('T')[0]}
                className={inputCls(!!errors.deadline)}
              />
            </FormField>
          </div>

          {/* 담당자 · 연관 문서번호 */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="담당자" error={errors.assignee?.message}>
              <select {...register('assignee')} className={selectCls(false)}>
                {ASSIGNEES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </FormField>

            <FormField label="연관 문서번호">
              <div ref={docRef} className="relative">
                <input
                  type="text"
                  value={docSearch}
                  onFocus={() => setDocDropOpen(true)}
                  onChange={(e) => { setDocSearch(e.target.value); setDocDropOpen(true) }}
                  placeholder="문서번호 또는 제목 검색"
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
                      <button type="button" onClick={() => removeDoc(doc.docNo)} className="text-blue-400 hover:text-blue-600">
                        <CloseIcon />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </FormField>
          </div>

          {/* 요청 배경 */}
          <FormField label="요청 배경" error={errors.background?.message}>
            <input
              {...register('background')}
              placeholder="이 업무요청이 필요한 배경이나 이유를 간략히 작성해주세요 (선택)"
              className={inputCls(!!errors.background)}
            />
          </FormField>

          {/* 내용 */}
          <FormField label="내용" required error={errors.description?.message}>
            <div className="relative">
              <textarea
                {...register('description')}
                placeholder="업무요청 내용을 상세히 작성해주세요&#10;&#10;예) 현재 상황, 요청 사항, 기대 결과 등"
                rows={3}
                className={`${textareaCls(!!errors.description)} resize-none`}
              />
              <span className="absolute bottom-2.5 right-3 text-[11px] text-gray-300">
                {descValue.length} / 2000
              </span>
            </div>
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
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            {fileList.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {fileList.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                    <FileIcon />
                    <span className="text-[12px] text-gray-700 flex-1 truncate">{file.name}</span>
                    <span className="text-[11px] text-gray-400">{formatFileSize(file.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
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
            {isSubmitting ? (
              <>
                <SpinnerIcon />
                등록 중...
              </>
            ) : (
              '등록하기'
            )}
          </button>
        </div>
      </form>
      </div>
    </div>
  )
}

// ── 폼 필드 래퍼 ─────────────────────────────────────
function FormField({
  label, required, error, children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
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
    hasError
      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
      : 'border-gray-200 focus:border-brand focus:ring-brand/20'
  }`

const textareaCls = (hasError: boolean) =>
  `w-full px-3 py-2.5 text-[13px] border rounded-lg focus:outline-none focus:ring-1 transition-colors ${
    hasError
      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
      : 'border-gray-200 focus:border-brand focus:ring-brand/20'
  }`

const selectCls = (hasError: boolean) =>
  `w-full h-9 px-3 text-[13px] border rounded-lg focus:outline-none focus:ring-1 transition-colors appearance-none cursor-pointer bg-white ${
    hasError
      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
      : 'border-gray-200 focus:border-brand focus:ring-brand/20'
  }`

// ── 유틸 ────────────────────────────────────────────
function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

// ── SVG 아이콘 ────────────────────────────────────────
function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M9 2.5L5 7L9 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AttachIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M11 6.5L6.5 11C5.12 12.38 2.88 12.38 1.5 11C0.12 9.62 0.12 7.38 1.5 6L6 1.5C6.94 0.56 8.44 0.56 9.38 1.5C10.32 2.44 10.32 3.94 9.38 4.88L4.88 9.38C4.41 9.85 3.65 9.85 3.18 9.38C2.71 8.91 2.71 8.15 3.18 7.68L7.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
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

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}
