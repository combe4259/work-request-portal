import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormField } from '@/components/common/FormField'
import { inputCls, textareaCls, selectCls } from '@/lib/formStyles'
import { ASSIGNEES } from '@/lib/constants'
import { useCreateDefectMutation } from '@/features/defect/mutations'
import { defectFormSchema, type DefectFormValues } from '@/features/defect/schemas'

const ALL_DOCS = [
  { docNo: 'TS-018', title: '모바일 PDA 레이아웃 반응형 검증' },
  { docNo: 'TS-017', title: '계좌 개설 프로세스 E2E 흐름 검증' },
  { docNo: 'TS-016', title: '잔고 조회 API 응답시간 회귀 테스트' },
  { docNo: 'TS-012', title: 'JWT 토큰 보안 취약점 침투 테스트' },
  { docNo: 'WR-051', title: '모바일 PDA 화면 레이아웃 개선 요청' },
  { docNo: 'WR-049', title: '잔고 조회 API 응답 지연 버그 수정' },
]

let stepIdCounter = 3

export default function DefectFormPage() {
  const navigate = useNavigate()
  const createDefect = useCreateDefectMutation()

  // 재현 경로
  const [steps, setSteps] = useState<{ id: number; text: string }[]>([
    { id: 1, text: '' },
    { id: 2, text: '' },
  ])

  // 연관 문서
  const [relatedDoc, setRelatedDoc] = useState<{ docNo: string; title: string } | null>(null)
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
      d.docNo !== relatedDoc?.docNo &&
      (d.docNo.toLowerCase().includes(docSearch.toLowerCase()) || d.title.includes(docSearch))
  )

  const selectDoc = (doc: { docNo: string; title: string }) => {
    setRelatedDoc(doc); setDocSearch(''); setDocDropOpen(false)
  }

  const addStep = () => {
    stepIdCounter++
    setSteps((prev) => [...prev, { id: stepIdCounter, text: '' }])
  }

  const removeStep = (id: number) => {
    if (steps.length <= 1) return
    setSteps((prev) => prev.filter((s) => s.id !== id))
  }

  const updateStep = (id: number, text: string) => {
    setSteps((prev) => prev.map((s) => s.id === id ? { ...s, text } : s))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFileList((prev) => [...prev, ...Array.from(e.target.files!)])
  }

  const removeFile = (idx: number) => setFileList((prev) => prev.filter((_, i) => i !== idx))

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<DefectFormValues>({
    resolver: zodResolver(defectFormSchema),
    defaultValues: { severity: '보통', type: '기능' },
  })

  const expectedValue = useWatch({ control, name: 'expected' }) ?? ''
  const actualValue = useWatch({ control, name: 'actual' }) ?? ''

  const onSubmit = async (data: DefectFormValues) => {
    await createDefect.mutateAsync({
      title: data.title,
      type: data.type,
      severity: data.severity,
      deadline: data.deadline,
      assignee: data.assignee,
      relatedDoc: relatedDoc?.docNo,
      environment: data.environment,
      reproductionSteps: steps.map((s) => s.text.trim()).filter((s) => s.length > 0),
      expectedBehavior: data.expected,
      actualBehavior: data.actual,
    })
    navigate('/defects')
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
            <h1 className="text-[18px] font-bold text-gray-900">결함 등록</h1>
            <p className="text-[12px] text-gray-400 mt-0.5">발견된 결함을 등록합니다</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_12px_rgba(30,58,138,0.07)] p-6 space-y-5">

            {/* 제목 */}
            <FormField label="제목" required error={errors.title?.message}>
              <input
                {...register('title')}
                placeholder="결함 제목을 입력해주세요"
                className={inputCls(!!errors.title)}
              />
            </FormField>

            {/* 유형 · 심각도 · 마감일 */}
            <div className="grid grid-cols-3 gap-4">
              <FormField label="유형" required error={errors.type?.message}>
                <select {...register('type')} className={selectCls(!!errors.type)}>
                  <option value="UI">UI</option>
                  <option value="기능">기능</option>
                  <option value="성능">성능</option>
                  <option value="보안">보안</option>
                  <option value="데이터">데이터</option>
                  <option value="기타">기타</option>
                </select>
              </FormField>

              <FormField label="심각도" required error={errors.severity?.message}>
                <select {...register('severity')} className={selectCls(!!errors.severity)}>
                  <option value="치명적">치명적</option>
                  <option value="높음">높음</option>
                  <option value="보통">보통</option>
                  <option value="낮음">낮음</option>
                </select>
              </FormField>

              <FormField label="수정 마감일" required error={errors.deadline?.message}>
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
                  {relatedDoc ? (
                    <div className="flex items-center gap-2 h-9 px-3 border border-gray-200 rounded-lg bg-gray-50">
                      <span className="font-mono text-[11px] text-gray-400">{relatedDoc.docNo}</span>
                      <span className="text-[12px] text-gray-700 flex-1 truncate">{relatedDoc.title}</span>
                      <button type="button" onClick={() => setRelatedDoc(null)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                        <CloseIcon />
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={docSearch}
                      onFocus={() => setDocDropOpen(true)}
                      onChange={(e) => { setDocSearch(e.target.value); setDocDropOpen(true) }}
                      placeholder="TS / WR 문서번호 또는 제목 검색"
                      className={inputCls(false)}
                    />
                  )}
                  {!relatedDoc && docDropOpen && filteredDocs.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                      {filteredDocs.map((doc) => (
                        <button
                          key={doc.docNo}
                          type="button"
                          onMouseDown={() => selectDoc(doc)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 transition-colors text-left"
                        >
                          <span className="font-mono text-[11px] text-gray-400 flex-shrink-0">{doc.docNo}</span>
                          <span className="text-[12px] text-gray-700 truncate">{doc.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {!relatedDoc && docDropOpen && filteredDocs.length === 0 && docSearch && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2.5 text-[12px] text-gray-400">
                      검색 결과가 없습니다
                    </div>
                  )}
                </div>
              </FormField>
            </div>

            {/* 환경 정보 */}
            <FormField label="환경 정보" error={errors.environment?.message}>
              <input
                {...register('environment')}
                placeholder="예) Galaxy S23 / Android 14 / Chrome 121  또는  iOS 17 / Safari (선택)"
                className={inputCls(!!errors.environment)}
              />
            </FormField>

            {/* 구분선 */}
            <div className="border-t border-gray-100" />

            {/* 재현 경로 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-semibold text-gray-600">재현 경로</label>
                <span className="text-[11px] text-gray-400">{steps.length}단계</span>
              </div>
              <div className="space-y-2">
                {steps.map((step, idx) => (
                  <div key={step.id} className="flex items-center gap-2 group">
                    <span className="w-5 h-5 rounded-full bg-red-50 text-red-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={step.text}
                      onChange={(e) => updateStep(step.id, e.target.value)}
                      placeholder={`${idx + 1}단계: 수행한 동작을 입력해주세요`}
                      className={`${inputCls(false)} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => removeStep(step.id)}
                      disabled={steps.length <= 1}
                      className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors disabled:opacity-0 opacity-0 group-hover:opacity-100"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addStep}
                className="flex items-center gap-1.5 text-[12px] text-red-400/70 hover:text-red-500 font-medium transition-colors mt-1 px-1"
              >
                <PlusIcon />
                단계 추가
              </button>
            </div>

            {/* 기대 동작 / 실제 동작 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label="기대 동작" required error={errors.expected?.message}>
                <div className="relative">
                  <textarea
                    {...register('expected')}
                    placeholder="정상적으로 동작해야 하는 내용을 작성해주세요"
                    rows={3}
                    className={`${textareaCls(!!errors.expected)} resize-none`}
                  />
                  <span className="absolute bottom-2 right-2.5 text-[10px] text-gray-300">{expectedValue.length}/1000</span>
                </div>
              </FormField>

              <FormField label="실제 동작" required error={errors.actual?.message}>
                <div className="relative">
                  <textarea
                    {...register('actual')}
                    placeholder="실제로 발생한 동작을 작성해주세요"
                    rows={3}
                    className={`${textareaCls(!!errors.actual)} resize-none`}
                  />
                  <span className="absolute bottom-2 right-2.5 text-[10px] text-gray-300">{actualValue.length}/1000</span>
                </div>
              </FormField>
            </div>

            {/* 첨부파일 */}
            <div className="border-t border-gray-100 pt-5 space-y-2">
              <label className="text-[12px] font-semibold text-gray-600 block">
                첨부파일 <span className="font-normal text-gray-400">(스크린샷, 로그 등)</span>
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
              disabled={isSubmitting || createDefect.isPending}
              className="h-9 px-5 text-[13px] font-semibold text-white bg-brand hover:bg-brand-hover rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {isSubmitting || createDefect.isPending ? <><SpinnerIcon />등록 중...</> : '등록하기'}
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
