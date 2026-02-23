import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormField } from '@/components/common/FormField'
import { inputCls, textareaCls, selectCls } from '@/lib/formStyles'
import { ASSIGNEES } from '@/lib/constants'
import { useCreateTechTaskMutation } from '@/features/tech-task/mutations'
import { techTaskFormSchema, type TechTaskFormValues } from '@/features/tech-task/schemas'

const ALL_DOCS = [
  { docNo: 'WR-051', title: '모바일 PDA 화면 레이아웃 개선 요청' },
  { docNo: 'WR-049', title: '잔고 조회 API 응답 지연 버그 수정' },
  { docNo: 'TK-020', title: 'N+1 쿼리 문제 해결 — 잔고 조회 API' },
  { docNo: 'TK-015', title: '공통 에러 핸들러 모듈화' },
  { docNo: 'TK-014', title: 'SQL Injection 방어 로직 전수 점검' },
]

export default function TechTaskFormPage() {
  const navigate = useNavigate()
  const createTechTask = useCreateTechTaskMutation()

  // 완료 기준
  const [dodItems, setDodItems] = useState<string[]>([])
  const [dodInput, setDodInput] = useState('')

  // 연관 문서
  const [relatedDocs, setRelatedDocs] = useState<{ docNo: string; title: string }[]>([])
  const [docSearch, setDocSearch] = useState('')
  const [docDropOpen, setDocDropOpen] = useState(false)
  const docRef = useRef<HTMLDivElement>(null)

  // 첨부파일
  const [fileList, setFileList] = useState<File[]>([])

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
      (d.docNo.toLowerCase().includes(docSearch.toLowerCase()) || d.title.includes(docSearch))
  )

  const addDoc = (doc: { docNo: string; title: string }) => {
    setRelatedDocs((prev) => [...prev, doc])
    setDocSearch('')
    setDocDropOpen(false)
  }

  const removeDoc = (docNo: string) => setRelatedDocs((prev) => prev.filter((d) => d.docNo !== docNo))

  const addDodItem = () => {
    const trimmed = dodInput.trim()
    if (!trimmed) return
    setDodItems((prev) => [...prev, trimmed])
    setDodInput('')
  }

  const removeDodItem = (idx: number) => setDodItems((prev) => prev.filter((_, i) => i !== idx))

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFileList((prev) => [...prev, ...Array.from(e.target.files!)])
  }

  const removeFile = (idx: number) => setFileList((prev) => prev.filter((_, i) => i !== idx))

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TechTaskFormValues>({
    resolver: zodResolver(techTaskFormSchema),
    defaultValues: { priority: '보통', type: '리팩토링' },
  })

  const issueValue = useWatch({ control, name: 'currentIssue' }) ?? ''
  const solutionValue = useWatch({ control, name: 'solution' }) ?? ''

  const onSubmit = async (data: TechTaskFormValues) => {
    await createTechTask.mutateAsync({
      title: data.title,
      type: data.type,
      priority: data.priority,
      deadline: data.deadline,
      assignee: data.assignee,
    })
    navigate('/tech-tasks')
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
            <h1 className="text-[18px] font-bold text-gray-900">기술과제 등록</h1>
            <p className="text-[12px] text-gray-400 mt-0.5">새로운 기술과제를 등록합니다</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_12px_rgba(30,58,138,0.07)] p-6 space-y-5">

            {/* 제목 */}
            <FormField label="제목" required error={errors.title?.message}>
              <input
                {...register('title')}
                placeholder="기술과제 제목을 입력해주세요"
                className={inputCls(!!errors.title)}
              />
            </FormField>

            {/* 유형 · 우선순위 · 마감일 */}
            <div className="grid grid-cols-3 gap-4">
              <FormField label="유형" required error={errors.type?.message}>
                <select {...register('type')} className={selectCls(!!errors.type)}>
                  <option value="리팩토링">리팩토링</option>
                  <option value="기술부채">기술부채</option>
                  <option value="성능개선">성능개선</option>
                  <option value="보안">보안</option>
                  <option value="테스트">테스트</option>
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
              <FormField label="담당자">
                <select {...register('assignee')} className={selectCls(false)}>
                  {ASSIGNEES.map((a) => <option key={a} value={a}>{a}</option>)}
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

            {/* 구분선 */}
            <div className="border-t border-gray-100" />

            {/* 문제 현황 */}
            <FormField label="문제 현황" required error={errors.currentIssue?.message}>
              <div className="relative">
                <textarea
                  {...register('currentIssue')}
                  placeholder="현재 어떤 문제가 있는지 구체적으로 작성해주세요&#10;&#10;예) 어떤 코드/구조가 문제인지, 어떤 부작용이 발생하는지 등"
                  rows={3}
                  className={`${textareaCls(!!errors.currentIssue)} resize-none`}
                />
                <span className="absolute bottom-2.5 right-3 text-[11px] text-gray-300">{issueValue.length} / 2000</span>
              </div>
            </FormField>

            {/* 개선 방안 */}
            <FormField label="개선 방안" required error={errors.solution?.message}>
              <div className="relative">
                <textarea
                  {...register('solution')}
                  placeholder="어떻게 해결할 것인지 접근 방법을 작성해주세요&#10;&#10;예) 적용할 패턴, 변경할 구조, 사용할 기술 등"
                  rows={3}
                  className={`${textareaCls(!!errors.solution)} resize-none`}
                />
                <span className="absolute bottom-2.5 right-3 text-[11px] text-gray-300">{solutionValue.length} / 2000</span>
              </div>
            </FormField>

            {/* 완료 기준 */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-gray-600 block">
                완료 기준
                <span className="ml-1 font-normal text-gray-400">(선택)</span>
              </label>
              {/* 입력 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={dodInput}
                  onChange={(e) => setDodInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDodItem() } }}
                  placeholder="완료 조건 항목 입력 후 Enter"
                  className={`${inputCls(false)} flex-1`}
                />
                <button
                  type="button"
                  onClick={addDodItem}
                  disabled={!dodInput.trim()}
                  className="h-9 px-3 border border-gray-200 rounded-lg text-[12px] text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-40 flex items-center gap-1"
                >
                  <PlusIcon />
                  추가
                </button>
              </div>
              {/* 항목 목록 */}
              {dodItems.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {dodItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 group">
                      <div className="w-3.5 h-3.5 rounded border-2 border-gray-300 flex-shrink-0" />
                      <span className="text-[12px] text-gray-700 flex-1">{item}</span>
                      <button
                        type="button"
                        onClick={() => removeDodItem(idx)}
                        className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
                <div className="space-y-1.5 mt-2">
                  {fileList.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                      <FileIcon />
                      <span className="text-[12px] text-gray-700 flex-1 truncate">{file.name}</span>
                      <span className="text-[11px] text-gray-400">{formatFileSize(file.size)}</span>
                      <button type="button" onClick={() => removeFile(idx)} className="text-gray-300 hover:text-red-400 transition-colors ml-1">
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
              disabled={isSubmitting || createTechTask.isPending}
              className="h-9 px-5 text-[13px] font-semibold text-white bg-brand hover:bg-brand-hover rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {isSubmitting || createTechTask.isPending ? <><SpinnerIcon />등록 중...</> : '등록하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

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
